-- ============================================================================
-- Phase 1: Core Balance System - Database Migration
-- ============================================================================
-- Version: 1.0
-- Created: 2025-12-14
-- Description: Creates core tables for user balance management system
--              supporting both customers and drivers
-- ============================================================================

-- ============================================================================
-- 1. USER BALANCES TABLE
-- ============================================================================
-- Stores the current balance state for each user (customer or driver)
-- Supports available, pending, and held balance categories
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_balances (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- ========================================================================
    -- Balance Categories
    -- ========================================================================
    -- available_balance: Funds available for immediate use
    -- pending_balance: Funds awaiting confirmation (e.g., pending deposits)
    -- held_balance: Funds temporarily held (e.g., for order escrow)
    -- total_balance: Computed sum of all balance categories
    -- ========================================================================
    available_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    held_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_balance DECIMAL(12, 2) GENERATED ALWAYS AS 
        (available_balance + pending_balance + held_balance) STORED,
    
    -- ========================================================================
    -- Currency
    -- ========================================================================
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    
    -- ========================================================================
    -- Limits and Thresholds
    -- ========================================================================
    daily_withdrawal_limit DECIMAL(12, 2) DEFAULT 5000.00,
    monthly_withdrawal_limit DECIMAL(12, 2) DEFAULT 50000.00,
    minimum_balance DECIMAL(12, 2) DEFAULT 0.00,
    
    -- Auto-reload settings (future feature)
    auto_reload_threshold DECIMAL(12, 2),
    auto_reload_amount DECIMAL(12, 2),
    
    -- ========================================================================
    -- Lifetime Statistics
    -- ========================================================================
    lifetime_deposits DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    lifetime_withdrawals DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    lifetime_earnings DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_transactions INTEGER DEFAULT 0 NOT NULL,
    
    -- ========================================================================
    -- Status Flags
    -- ========================================================================
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_frozen BOOLEAN DEFAULT FALSE NOT NULL,
    freeze_reason TEXT,
    frozen_at TIMESTAMP,
    frozen_by INTEGER REFERENCES users(id),
    
    -- ========================================================================
    -- Metadata
    -- ========================================================================
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP,
    
    -- ========================================================================
    -- Constraints
    -- ========================================================================
    CONSTRAINT positive_available_balance CHECK (available_balance >= 0),
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0),
    CONSTRAINT positive_held_balance CHECK (held_balance >= 0),
    CONSTRAINT valid_currency CHECK (currency IN ('EGP', 'USD', 'EUR', 'SAR', 'AED')),
    CONSTRAINT valid_limits CHECK (
        daily_withdrawal_limit >= 0 AND 
        monthly_withdrawal_limit >= daily_withdrawal_limit
    )
);

-- ========================================================================
-- Indexes for Performance
-- ========================================================================
CREATE INDEX idx_user_balances_active ON user_balances(is_active) 
    WHERE is_active = TRUE;
    
CREATE INDEX idx_user_balances_frozen ON user_balances(is_frozen) 
    WHERE is_frozen = TRUE;
    
CREATE INDEX idx_user_balances_currency ON user_balances(currency);

CREATE INDEX idx_user_balances_last_transaction ON user_balances(last_transaction_at DESC);

-- ========================================================================
-- Comments for Documentation
-- ========================================================================
COMMENT ON TABLE user_balances IS 
    'Stores user balance information for customers and drivers';
    
COMMENT ON COLUMN user_balances.available_balance IS 
    'Funds available for immediate use (withdrawals, payments)';
    
COMMENT ON COLUMN user_balances.pending_balance IS 
    'Funds awaiting confirmation (e.g., pending deposits, pending earnings)';
    
COMMENT ON COLUMN user_balances.held_balance IS 
    'Funds temporarily held in escrow (e.g., for active orders)';
    
COMMENT ON COLUMN user_balances.is_frozen IS 
    'If true, all balance operations are blocked (fraud prevention)';

-- ============================================================================
-- 2. BALANCE TRANSACTIONS TABLE
-- ============================================================================
-- Complete audit trail of all balance changes
-- Supports double-entry bookkeeping for reconciliation
-- ============================================================================

CREATE TABLE IF NOT EXISTS balance_transactions (
    id BIGSERIAL PRIMARY KEY,
    
    -- ========================================================================
    -- Transaction Identification
    -- ========================================================================
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ========================================================================
    -- Transaction Details
    -- ========================================================================
    -- Transaction Types:
    -- - deposit: User deposits funds
    -- - withdrawal: User withdraws funds
    -- - order_payment: Customer pays for order
    -- - order_refund: Refund to customer
    -- - earnings: Driver receives earnings
    -- - commission_deduction: Platform commission deducted
    -- - bonus: Promotional bonus credited
    -- - cashback: Cashback reward
    -- - penalty: Penalty deduction
    -- - adjustment: Manual admin adjustment
    -- - hold: Funds moved to held balance
    -- - release: Funds released from held balance
    -- - fee: Platform fee deduction
    -- - reversal: Transaction reversal
    -- ========================================================================
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    
    -- ========================================================================
    -- Balance Snapshots (for audit trail)
    -- ========================================================================
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    
    -- ========================================================================
    -- Transaction Status
    -- ========================================================================
    -- Status values:
    -- - pending: Transaction initiated but not completed
    -- - completed: Transaction successfully completed
    -- - failed: Transaction failed
    -- - reversed: Transaction was reversed
    -- - cancelled: Transaction was cancelled
    -- ========================================================================
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    
    -- ========================================================================
    -- Related Entities (Foreign Keys)
    -- ========================================================================
    order_id INTEGER REFERENCES orders(id),
    wallet_payment_id INTEGER REFERENCES wallet_payments(id),
    withdrawal_request_id INTEGER,  -- Will reference withdrawal_requests (Phase 2)
    related_transaction_id BIGINT REFERENCES balance_transactions(id),
    
    -- ========================================================================
    -- Processing Information
    -- ========================================================================
    processed_at TIMESTAMP,
    processed_by INTEGER REFERENCES users(id),
    processing_method VARCHAR(50),
    
    -- ========================================================================
    -- Metadata
    -- ========================================================================
    description TEXT NOT NULL,
    metadata JSONB,
    notes TEXT,
    
    -- ========================================================================
    -- Audit Trail
    -- ========================================================================
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- ========================================================================
    -- Constraints
    -- ========================================================================
    CONSTRAINT valid_transaction_type CHECK (type IN (
        'deposit', 'withdrawal', 'order_payment', 'order_refund',
        'earnings', 'commission_deduction', 'bonus', 'cashback',
        'penalty', 'adjustment', 'hold', 'release', 'fee', 'reversal'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'pending', 'completed', 'failed', 'reversed', 'cancelled'
    )),
    CONSTRAINT non_zero_amount CHECK (amount != 0)
);

-- ========================================================================
-- Indexes for Performance
-- ========================================================================
CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_type ON balance_transactions(type);
CREATE INDEX idx_balance_transactions_status ON balance_transactions(status);
CREATE INDEX idx_balance_transactions_created_at ON balance_transactions(created_at DESC);
CREATE INDEX idx_balance_transactions_order_id ON balance_transactions(order_id) 
    WHERE order_id IS NOT NULL;
CREATE INDEX idx_balance_transactions_transaction_id ON balance_transactions(transaction_id);

-- Composite indexes for common queries
CREATE INDEX idx_balance_transactions_user_type_status 
    ON balance_transactions(user_id, type, status);
CREATE INDEX idx_balance_transactions_user_created 
    ON balance_transactions(user_id, created_at DESC);
CREATE INDEX idx_balance_transactions_user_type_created 
    ON balance_transactions(user_id, type, created_at DESC);

-- ========================================================================
-- Comments for Documentation
-- ========================================================================
COMMENT ON TABLE balance_transactions IS 
    'Complete audit trail of all balance changes with double-entry bookkeeping';
    
COMMENT ON COLUMN balance_transactions.transaction_id IS 
    'Unique identifier for idempotency and external reference';
    
COMMENT ON COLUMN balance_transactions.balance_before IS 
    'Balance snapshot before transaction (for audit and reconciliation)';
    
COMMENT ON COLUMN balance_transactions.balance_after IS 
    'Balance snapshot after transaction (for audit and reconciliation)';

-- ============================================================================
-- 3. BALANCE HOLDS TABLE
-- ============================================================================
-- Manages temporary holds on user balance (escrow functionality)
-- Used for order payments, disputes, and other temporary locks
-- ============================================================================

CREATE TABLE IF NOT EXISTS balance_holds (
    id SERIAL PRIMARY KEY,
    
    -- ========================================================================
    -- Hold Identification
    -- ========================================================================
    hold_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- ========================================================================
    -- Hold Details
    -- ========================================================================
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    reason VARCHAR(100) NOT NULL,
    
    -- ========================================================================
    -- Related Entities
    -- ========================================================================
    order_id INTEGER REFERENCES orders(id),
    dispute_id INTEGER,  -- Future: Will reference disputes table
    transaction_id BIGINT REFERENCES balance_transactions(id),
    
    -- ========================================================================
    -- Hold Status
    -- ========================================================================
    -- Status values:
    -- - active: Hold is currently active
    -- - released: Funds released back to available balance
    -- - captured: Funds captured (deducted from balance)
    -- - expired: Hold expired without action
    -- - cancelled: Hold was cancelled
    -- ========================================================================
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    
    -- ========================================================================
    -- Timing
    -- ========================================================================
    held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    released_at TIMESTAMP,
    released_by INTEGER REFERENCES users(id),
    
    -- ========================================================================
    -- Metadata
    -- ========================================================================
    description TEXT,
    notes TEXT,
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- ========================================================================
    -- Constraints
    -- ========================================================================
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (status IN (
        'active', 'released', 'captured', 'expired', 'cancelled'
    ))
);

-- ========================================================================
-- Indexes for Performance
-- ========================================================================
CREATE INDEX idx_balance_holds_user_id ON balance_holds(user_id);
CREATE INDEX idx_balance_holds_status ON balance_holds(status);
CREATE INDEX idx_balance_holds_order_id ON balance_holds(order_id) 
    WHERE order_id IS NOT NULL;
CREATE INDEX idx_balance_holds_expires_at ON balance_holds(expires_at) 
    WHERE status = 'active';
CREATE INDEX idx_balance_holds_hold_id ON balance_holds(hold_id);

-- ========================================================================
-- Comments for Documentation
-- ========================================================================
COMMENT ON TABLE balance_holds IS 
    'Manages temporary holds on user balance for escrow and dispute resolution';
    
COMMENT ON COLUMN balance_holds.expires_at IS 
    'Optional expiration time - hold auto-releases if not captured before expiry';

-- ============================================================================
-- 4. TRIGGERS FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_balance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_balances
CREATE TRIGGER user_balances_updated_at
    BEFORE UPDATE ON user_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_timestamp();

-- Trigger for balance_transactions
CREATE TRIGGER balance_transactions_updated_at
    BEFORE UPDATE ON balance_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_timestamp();

-- Trigger for balance_holds
CREATE TRIGGER balance_holds_updated_at
    BEFORE UPDATE ON balance_holds
    FOR EACH ROW
    EXECUTE FUNCTION update_balance_timestamp();

-- ============================================================================
-- 5. INITIAL DATA SETUP
-- ============================================================================

-- Function to create balance for existing users
CREATE OR REPLACE FUNCTION create_balances_for_existing_users()
RETURNS void AS $$
BEGIN
    INSERT INTO user_balances (user_id, currency)
    SELECT id, 'EGP'
    FROM users
    WHERE id NOT IN (SELECT user_id FROM user_balances)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create balances for existing users
SELECT create_balances_for_existing_users();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's available balance
CREATE OR REPLACE FUNCTION get_available_balance(p_user_id INTEGER)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_balance DECIMAL(12, 2);
BEGIN
    SELECT available_balance INTO v_balance
    FROM user_balances
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_balance, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has sufficient balance
CREATE OR REPLACE FUNCTION has_sufficient_balance(
    p_user_id INTEGER,
    p_amount DECIMAL(12, 2)
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN get_available_balance(p_user_id) >= p_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for user balance summary
CREATE OR REPLACE VIEW user_balance_summary AS
SELECT 
    ub.user_id,
    u.name as user_name,
    u.email,
    u.primary_role as user_role,
    ub.available_balance,
    ub.pending_balance,
    ub.held_balance,
    ub.total_balance,
    ub.currency,
    ub.lifetime_deposits,
    ub.lifetime_withdrawals,
    ub.lifetime_earnings,
    ub.total_transactions,
    ub.is_active,
    ub.is_frozen,
    ub.last_transaction_at,
    ub.created_at
FROM user_balances ub
JOIN users u ON ub.user_id = u.id;

COMMENT ON VIEW user_balance_summary IS 
    'Convenient view combining user and balance information';

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Tables created: user_balances, balance_transactions, balance_holds
-- Indexes created: 15+ indexes for optimal query performance
-- Triggers created: Automatic timestamp updates
-- Functions created: Helper functions for balance operations
-- Views created: user_balance_summary
-- ============================================================================
