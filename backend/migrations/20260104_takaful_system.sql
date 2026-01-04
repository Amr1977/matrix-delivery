-- Takaful Cooperative Insurance System
-- Creates fund tracking and contribution tables

-- ============================================
-- Commission Configuration
-- ============================================
CREATE TABLE IF NOT EXISTS commission_config (
  id SERIAL PRIMARY KEY,
  platform_rate DECIMAL(5,4) DEFAULT 0.10,  -- 10%
  takaful_rate DECIMAL(5,4) DEFAULT 0.05,   -- 5%
  effective_from DATE DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration
INSERT INTO commission_config (platform_rate, takaful_rate, created_by)
VALUES (0.10, 0.05, 'system')
ON CONFLICT DO NOTHING;

-- ============================================
-- Takaful Fund Balance
-- ============================================
CREATE TABLE IF NOT EXISTS takaful_fund (
  id SERIAL PRIMARY KEY,
  balance DECIMAL(12,2) DEFAULT 0,
  total_contributions DECIMAL(12,2) DEFAULT 0,
  total_payouts DECIMAL(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'EGP',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize fund with zero balance
INSERT INTO takaful_fund (balance, total_contributions, total_payouts)
SELECT 0, 0, 0
WHERE NOT EXISTS (SELECT 1 FROM takaful_fund);

-- ============================================
-- Takaful Contributions (per order)
-- ============================================
CREATE TABLE IF NOT EXISTS takaful_contributions (
  id SERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2),
  contribution_rate DECIMAL(5,4) DEFAULT 0.05,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_contrib_order FOREIGN KEY (order_id) 
    REFERENCES orders(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_takaful_contributions_courier ON takaful_contributions(courier_id);
CREATE INDEX IF NOT EXISTS idx_takaful_contributions_date ON takaful_contributions(created_at);
CREATE INDEX IF NOT EXISTS idx_takaful_contributions_order ON takaful_contributions(order_id);

-- ============================================
-- Takaful Claims (benefit requests)
-- ============================================
CREATE TABLE IF NOT EXISTS takaful_claims (
  id SERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL,
  
  -- Claim Type (expanded for all benefits)
  claim_type TEXT NOT NULL,
  -- Types: 'health', 'gym', 'self_defense', 'driving_course', 
  -- 'maintenance_training', 'marriage_bonus', 'newborn_bonus', 
  -- 'death_compensation', 'educational_grant', 'mechanic', 
  -- 'mobile_mechanic', 'tricycle', 'equipment', 'emergency_transfer'
  
  -- Details
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  evidence_urls TEXT[],
  
  -- For life events
  event_date DATE,
  beneficiary_name TEXT,
  
  -- Processing
  status TEXT DEFAULT 'pending',
  -- 'pending', 'approved', 'paid', 'rejected'
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_takaful_claims_courier ON takaful_claims(courier_id);
CREATE INDEX IF NOT EXISTS idx_takaful_claims_status ON takaful_claims(status);
CREATE INDEX IF NOT EXISTS idx_takaful_claims_type ON takaful_claims(claim_type);

-- ============================================
-- Gold Price Tracking (for gold-indexed loans)
-- ============================================
CREATE TABLE IF NOT EXISTS gold_prices (
  id SERIAL PRIMARY KEY,
  price_per_gram DECIMAL(10,2) NOT NULL,  -- 24k gold in EGP
  recorded_at DATE UNIQUE DEFAULT CURRENT_DATE,
  source TEXT  -- 'central_bank', 'market', 'manual', 'api'
);

-- ============================================
-- Takaful Loans (interest-free, gold-indexed)
-- ============================================
CREATE TABLE IF NOT EXISTS takaful_loans (
  id SERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL,
  
  -- Loan Details (Gold-Indexed)
  principal_egp DECIMAL(10,2) NOT NULL,
  principal_gold_grams DECIMAL(10,4) NOT NULL,
  gold_price_at_loan DECIMAL(10,2) NOT NULL,
  
  remaining_gold_grams DECIMAL(10,4),
  monthly_deduction_gold DECIMAL(10,4),
  
  purpose TEXT,
  loan_type TEXT, -- 'emergency', 'vehicle', 'educational', 'personal'
  
  -- Limits
  max_loan_amount DECIMAL(10,2) DEFAULT 5000, -- Fixed 5000 EGP limit
  
  -- Status
  status TEXT DEFAULT 'pending',
  -- 'pending', 'active', 'paid', 'defaulted'
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_takaful_loans_courier ON takaful_loans(courier_id);
CREATE INDEX IF NOT EXISTS idx_takaful_loans_status ON takaful_loans(status);

-- ============================================
-- Loan Repayments
-- ============================================
CREATE TABLE IF NOT EXISTS takaful_loan_payments (
  id SERIAL PRIMARY KEY,
  loan_id INTEGER REFERENCES takaful_loans(id),
  order_id TEXT,
  
  -- Payment in gold equivalent
  gold_grams_paid DECIMAL(10,4),
  gold_price_at_payment DECIMAL(10,2),
  egp_amount DECIMAL(10,2),
  
  remaining_gold_grams DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_payments_loan ON takaful_loan_payments(loan_id);

-- ============================================
-- Function: Update Takaful Fund Balance
-- ============================================
CREATE OR REPLACE FUNCTION update_takaful_fund_on_contribution()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE takaful_fund SET 
    balance = balance + NEW.amount,
    total_contributions = total_contributions + NEW.amount,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update fund on new contribution
DROP TRIGGER IF EXISTS trg_takaful_contribution ON takaful_contributions;
CREATE TRIGGER trg_takaful_contribution
  AFTER INSERT ON takaful_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_takaful_fund_on_contribution();

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE takaful_fund IS 'Central Takaful cooperative insurance fund balance';
COMMENT ON TABLE takaful_contributions IS 'Per-order 5% contributions from courier deliveries';
COMMENT ON TABLE takaful_claims IS 'Benefit claims submitted by couriers';
COMMENT ON TABLE takaful_loans IS 'Interest-free gold-indexed loans to couriers';
COMMENT ON COLUMN takaful_loans.principal_gold_grams IS 'Loan amount in 24k gold grams for inflation protection';
