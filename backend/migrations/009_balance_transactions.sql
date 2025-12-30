-- Balance Transactions Table Migration
-- Adds transaction history tracking for user balances

-- 1. BALANCE TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS balance_transactions (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction Details
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    
    -- Balance Snapshots
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    
    -- Status and Description
    status VARCHAR(50) NOT NULL DEFAULT 'completed',
    description TEXT,
    metadata JSONB,
    
    -- Related Entities
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE SET NULL,
    wallet_payment_id INTEGER,
    withdrawal_request_id INTEGER,
    related_transaction_id INTEGER REFERENCES balance_transactions(id),
    
    -- Processing Info
    processed_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    processing_method VARCHAR(255),
    processed_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT valid_transaction_type CHECK (type IN (
        'deposit', 'withdrawal', 'earnings', 'commission_deduction', 
        'refund', 'adjustment', 'hold', 'release', 'transfer'
    )),
    CONSTRAINT valid_transaction_status CHECK (status IN (
        'pending', 'completed', 'failed', 'cancelled', 'reversed'
    )),
    CONSTRAINT valid_currency CHECK (currency IN ('EGP', 'USD', 'EUR', 'SAR', 'AED'))
);

-- 2. BALANCE HOLDS TABLE (for escrow/pending amounts)
CREATE TABLE IF NOT EXISTS balance_holds (
    id SERIAL PRIMARY KEY,
    hold_id VARCHAR(255) UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Hold Details
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    reason TEXT,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE SET NULL,
    expires_at TIMESTAMP,
    
    -- Additional Info
    description TEXT,
    metadata JSONB,
    transaction_id INTEGER REFERENCES balance_transactions(id),
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    CONSTRAINT positive_hold_amount CHECK (amount > 0),
    CONSTRAINT valid_hold_status CHECK (status IN ('active', 'released', 'expired', 'cancelled')),
    CONSTRAINT valid_currency CHECK (currency IN ('EGP', 'USD', 'EUR', 'SAR', 'AED'))
);

-- 3. PERFORMANCE INDEXES

-- Balance Transactions Indexes
CREATE INDEX IF NOT EXISTS idx_balance_tx_user ON balance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_tx_user_created ON balance_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_tx_type ON balance_transactions(type);
CREATE INDEX IF NOT EXISTS idx_balance_tx_status ON balance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_balance_tx_order ON balance_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_tx_created ON balance_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_tx_transaction_id ON balance_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_balance_tx_user_type_status ON balance_transactions(user_id, type, status);
CREATE INDEX IF NOT EXISTS idx_balance_tx_user_type_created ON balance_transactions(user_id, type, created_at DESC);

-- Balance Holds Indexes
CREATE INDEX IF NOT EXISTS idx_balance_holds_user ON balance_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_balance_holds_status ON balance_holds(status);
CREATE INDEX IF NOT EXISTS idx_balance_holds_order ON balance_holds(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_balance_holds_expires ON balance_holds(expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_balance_holds_hold_id ON balance_holds(hold_id);

-- 4. AUTO-UPDATE TRIGGER for updated_at
CREATE OR REPLACE FUNCTION update_balance_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist to ensure idempotency
DROP TRIGGER IF EXISTS balance_transactions_updated_at ON balance_transactions;
DROP TRIGGER IF EXISTS balance_holds_updated_at ON balance_holds;

CREATE TRIGGER balance_transactions_updated_at
    BEFORE UPDATE ON balance_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_transaction_timestamp();

CREATE TRIGGER balance_holds_updated_at
    BEFORE UPDATE ON balance_holds
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_transaction_timestamp();

-- 5. COMMENTS for documentation
COMMENT ON TABLE balance_transactions IS 'Records all balance-related transactions for audit trail and history';
COMMENT ON TABLE balance_holds IS 'Tracks temporary holds on user balances for pending transactions';
COMMENT ON COLUMN balance_transactions.transaction_id IS 'Unique UUID for each transaction';
COMMENT ON COLUMN balance_transactions.balance_before IS 'Snapshot of balance before transaction';
COMMENT ON COLUMN balance_transactions.balance_after IS 'Snapshot of balance after transaction';
