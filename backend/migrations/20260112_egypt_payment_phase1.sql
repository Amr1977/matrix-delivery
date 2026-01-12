-- Egypt Payment Production - Phase 1: Balance Top-Up & Admin Verification
-- Migration: 20260112_egypt_payment_phase1.sql
-- Requirements: 5.1, 5.2, 5.5, 1.5, 1.6, 1.7, 3.4, 4.7, 4.1, 4.6

-- ============================================================================
-- PART 1: Extend existing platform_wallets table
-- The table already exists from 007_wallet_payments.sql with wallet_type column
-- We need to add new columns for Phase 1 requirements
-- ============================================================================

-- Add instapay_alias column for InstaPay wallets
ALTER TABLE platform_wallets ADD COLUMN IF NOT EXISTS instapay_alias VARCHAR(100);

-- Add holder_name column (wallet_name exists but we need holder_name for consistency)
ALTER TABLE platform_wallets ADD COLUMN IF NOT EXISTS holder_name VARCHAR(100);

-- Add usage tracking columns
ALTER TABLE platform_wallets ADD COLUMN IF NOT EXISTS daily_used DECIMAL(20,2) DEFAULT 0;
ALTER TABLE platform_wallets ADD COLUMN IF NOT EXISTS monthly_used DECIMAL(20,2) DEFAULT 0;
ALTER TABLE platform_wallets ADD COLUMN IF NOT EXISTS last_reset_daily TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE platform_wallets ADD COLUMN IF NOT EXISTS last_reset_monthly TIMESTAMPTZ DEFAULT NOW();

-- Update daily_limit and monthly_limit to use DECIMAL(20,2) for larger amounts
-- Note: These columns already exist, we just ensure they have proper defaults
ALTER TABLE platform_wallets ALTER COLUMN daily_limit SET DEFAULT 50000;
ALTER TABLE platform_wallets ALTER COLUMN monthly_limit SET DEFAULT 500000;

-- Backfill holder_name from wallet_name for existing records
UPDATE platform_wallets SET holder_name = wallet_name WHERE holder_name IS NULL;

-- ============================================================================
-- PART 2: Create topups table for top-up requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS topups (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  amount DECIMAL(20,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  transaction_reference VARCHAR(100) NOT NULL,
  platform_wallet_id INTEGER REFERENCES platform_wallets(id),
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  verified_by VARCHAR(255) REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: Valid status values
  CONSTRAINT topups_valid_status CHECK (status IN ('pending', 'verified', 'rejected')),
  -- Constraint: Amount validation (10-10000 EGP)
  CONSTRAINT topups_valid_amount CHECK (amount >= 10 AND amount <= 10000),
  -- Constraint: Unique transaction reference per payment method
  CONSTRAINT topups_unique_reference_per_method UNIQUE (transaction_reference, payment_method)
);

-- ============================================================================
-- PART 3: Create topup_audit_logs table for admin action tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS topup_audit_logs (
  id SERIAL PRIMARY KEY,
  topup_id INTEGER NOT NULL REFERENCES topups(id),
  admin_id VARCHAR(255) NOT NULL REFERENCES users(id),
  action VARCHAR(20) NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 4: Performance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_topups_user_id ON topups(user_id);
CREATE INDEX IF NOT EXISTS idx_topups_status ON topups(status);
CREATE INDEX IF NOT EXISTS idx_topups_created_at ON topups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_topups_reference ON topups(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_topups_payment_method ON topups(payment_method);
CREATE INDEX IF NOT EXISTS idx_platform_wallets_active ON platform_wallets(wallet_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_topup_audit_logs_topup_id ON topup_audit_logs(topup_id);
CREATE INDEX IF NOT EXISTS idx_topup_audit_logs_admin_id ON topup_audit_logs(admin_id);

-- ============================================================================
-- PART 5: Trigger for updated_at on topups table
-- ============================================================================

CREATE OR REPLACE FUNCTION update_topups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS topups_updated_at ON topups;
CREATE TRIGGER topups_updated_at
    BEFORE UPDATE ON topups
    FOR EACH ROW
    EXECUTE FUNCTION update_topups_timestamp();

-- ============================================================================
-- PART 6: Comments for documentation
-- ============================================================================

COMMENT ON TABLE topups IS 'User top-up requests requiring admin verification for Egypt payment methods';
COMMENT ON COLUMN topups.payment_method IS 'Payment method: vodafone_cash, orange_money, etisalat_cash, we_pay, instapay';
COMMENT ON COLUMN topups.transaction_reference IS 'Unique reference from the payment provider';
COMMENT ON COLUMN topups.status IS 'Request status: pending, verified, rejected';

COMMENT ON TABLE topup_audit_logs IS 'Audit trail for admin actions on top-up requests';
COMMENT ON COLUMN topup_audit_logs.action IS 'Admin action: verify, reject';
COMMENT ON COLUMN topup_audit_logs.details IS 'Additional details about the action (JSON)';
