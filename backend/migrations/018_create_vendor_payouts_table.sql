-- Create vendor payouts table for marketplace order payouts
-- Migration: 018_create_vendor_payouts_table.sql

CREATE TABLE IF NOT EXISTS vendor_payouts (
  id SERIAL PRIMARY KEY,
  payout_number VARCHAR(50) UNIQUE,
  vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,

  -- Payout amounts
  order_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  commission_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payout_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'EGP',

  -- Payout method and details
  payout_method VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'bank_transfer', 'digital_wallet', 'cash_pickup', 'pending'
  payout_details JSONB, -- Store method-specific details (account numbers, wallet addresses, etc.)

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

  -- Processing information
  processed_by VARCHAR(255) REFERENCES users(id), -- Admin/system user who processed
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  failed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  failure_reason TEXT,
  cancellation_reason TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Audit and metadata
  reference_number VARCHAR(255), -- External payment reference
  notes TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Backfill/normalize in case vendor_payouts existed from older schema
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS payout_number VARCHAR(50);
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS order_total DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS payout_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'EGP';
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS payout_method VARCHAR(50) DEFAULT 'pending';
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS payout_details JSONB;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS processed_by VARCHAR(255);
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS reference_number VARCHAR(255);
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE vendor_payouts ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- Keep legacy rows usable if table existed with old field names
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vendor_payouts'
      AND column_name = 'amount'
  ) THEN
    EXECUTE '
      UPDATE vendor_payouts
      SET order_total = COALESCE(order_total, amount),
          payout_amount = COALESCE(payout_amount, amount)
      WHERE order_total IS NULL OR payout_amount IS NULL
    ';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'vendor_payouts'
      AND column_name = 'net_amount'
  ) THEN
    EXECUTE '
      UPDATE vendor_payouts
      SET payout_amount = COALESCE(payout_amount, net_amount)
      WHERE payout_amount IS NULL
    ';
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_order ON vendor_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON vendor_payouts(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_created ON vendor_payouts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_payout_number ON vendor_payouts(payout_number);

-- Unique constraint to prevent duplicate payouts per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_payouts_unique_order ON vendor_payouts(order_id);

-- Function to generate payout numbers
CREATE OR REPLACE FUNCTION generate_payout_number()
RETURNS TEXT AS $$
DECLARE
  payout_num TEXT;
  counter INTEGER := 0;
BEGIN
  LOOP
    payout_num := 'PAYOUT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM vendor_payouts WHERE payout_number = payout_num);
    counter := counter + 1;
    IF counter > 9999 THEN
      RAISE EXCEPTION 'Too many payouts today';
    END IF;
  END LOOP;
  RETURN payout_num;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate payout numbers
CREATE OR REPLACE FUNCTION set_payout_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payout_number IS NULL THEN
    NEW.payout_number := generate_payout_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_payout_number ON vendor_payouts;
CREATE TRIGGER trigger_set_payout_number
  BEFORE INSERT ON vendor_payouts
  FOR EACH ROW
  EXECUTE FUNCTION set_payout_number();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vendor_payout_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_payout_updated_at ON vendor_payouts;
CREATE TRIGGER trigger_update_vendor_payout_updated_at
  BEFORE UPDATE ON vendor_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_payout_updated_at();

-- Ensure all existing rows have payout numbers
UPDATE vendor_payouts
SET payout_number = generate_payout_number()
WHERE payout_number IS NULL;
