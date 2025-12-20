-- Fixed Balance System Migration - Phase 1
-- Corrected to use VARCHAR for user_id to match users.id type

-- 1. USER BALANCES TABLE
CREATE TABLE IF NOT EXISTS user_balances (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- Balance Categories
    available_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    held_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_balance DECIMAL(12, 2) GENERATED ALWAYS AS 
        (available_balance + pending_balance + held_balance) STORED,
    
    -- Currency
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    
    -- Limits and Thresholds
    daily_withdrawal_limit DECIMAL(12, 2) DEFAULT 5000.00,
    monthly_withdrawal_limit DECIMAL(12, 2) DEFAULT 50000.00,
    minimum_balance DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Lifetime Statistics
    lifetime_deposits DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    lifetime_withdrawals DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    lifetime_earnings DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_transactions INTEGER DEFAULT 0 NOT NULL,
    
    -- Status Flags
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_frozen BOOLEAN DEFAULT FALSE NOT NULL,
    freeze_reason TEXT,
    frozen_at TIMESTAMP,
    frozen_by VARCHAR(50) REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP,
    
    -- Constraints - REMOVED positive_available_balance to allow negative (debt)
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0),
    CONSTRAINT positive_held_balance CHECK (held_balance >= 0),
    CONSTRAINT valid_currency CHECK (currency IN ('EGP', 'USD', 'EUR', 'SAR', 'AED')),
    CONSTRAINT valid_limits CHECK (
        daily_withdrawal_limit >= 0 AND 
        monthly_withdrawal_limit >= daily_withdrawal_limit
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_balances_active ON user_balances(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_balances_frozen ON user_balances(is_frozen) WHERE is_frozen = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_balances_currency ON user_balances(currency);

-- Create balances for existing users
INSERT INTO user_balances (user_id, currency)
SELECT id, 'EGP'
FROM users
WHERE id NOT IN (SELECT user_id FROM user_balances)
ON CONFLICT (user_id) DO NOTHING;
