import { TableSchema } from '../types';

/**
 * User balances table schema
 */
export const userBalancesSchema: TableSchema = {
    name: 'user_balances',
    createStatement: `
    CREATE TABLE IF NOT EXISTS user_balances (
        user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id),
        currency VARCHAR(10) DEFAULT 'EGP',
        available_balance DECIMAL(20, 2) DEFAULT 0,
        pending_balance DECIMAL(20, 2) DEFAULT 0,
        held_balance DECIMAL(20, 2) DEFAULT 0,
        total_balance DECIMAL(20, 2) DEFAULT 0,
        daily_withdrawal_limit DECIMAL(20, 2) DEFAULT 10000,
        monthly_withdrawal_limit DECIMAL(20, 2) DEFAULT 50000,
        minimum_balance DECIMAL(20, 2) DEFAULT 0,
        auto_reload_threshold DECIMAL(20, 2),
        auto_reload_amount DECIMAL(20, 2),
        lifetime_deposits DECIMAL(20, 2) DEFAULT 0,
        lifetime_withdrawals DECIMAL(20, 2) DEFAULT 0,
        lifetime_earnings DECIMAL(20, 2) DEFAULT 0,
        total_transactions INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        is_frozen BOOLEAN DEFAULT FALSE,
        freeze_reason TEXT,
        frozen_at TIMESTAMP,
        frozen_by VARCHAR(255),
        last_transaction_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    )
    `,
    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_user_balances_user_id ON user_balances(user_id)'
    ]
};

/**
 * Balance transactions table schema
 */
export const balanceTransactionsSchema: TableSchema = {
    name: 'balance_transactions',
    createStatement: `
    CREATE TABLE IF NOT EXISTS balance_transactions (
        id SERIAL PRIMARY KEY,
        transaction_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) REFERENCES users(id),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(20, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'EGP',
        balance_before DECIMAL(20, 2) NOT NULL,
        balance_after DECIMAL(20, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        description TEXT,
        metadata JSONB,
        order_id VARCHAR(255),
        wallet_payment_id INTEGER,
        withdrawal_request_id INTEGER,
        related_transaction_id INTEGER,
        processed_by VARCHAR(255),
        processing_method VARCHAR(255),
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    )
    `,
    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_balance_transactions_user_id ON balance_transactions(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_balance_transactions_transaction_id ON balance_transactions(transaction_id)',
        'CREATE INDEX IF NOT EXISTS idx_balance_transactions_type ON balance_transactions(type)',
        'CREATE INDEX IF NOT EXISTS idx_balance_transactions_created_at ON balance_transactions(created_at)'
    ]
};

/**
 * Withdrawal requests table schema
 */
export const withdrawalRequestsSchema: TableSchema = {
    name: 'withdrawal_requests',
    createStatement: `
    CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id SERIAL PRIMARY KEY,
        request_number VARCHAR(50) UNIQUE NOT NULL,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(20, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'EGP' NOT NULL,
        withdrawal_method VARCHAR(30) NOT NULL,
        destination_type VARCHAR(30) NOT NULL,
        destination_details JSONB NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' NOT NULL,
        requires_verification BOOLEAN DEFAULT TRUE,
        verification_code VARCHAR(10),
        verification_sent_at TIMESTAMP,
        verified_at TIMESTAMP,
        processed_at TIMESTAMP,
        processed_by VARCHAR(255),
        transaction_reference VARCHAR(255),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    )
    `,
    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status)',
        'CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_request_number ON withdrawal_requests(request_number)'
    ]
};

/**
 * Balance holds table schema
 */
export const balanceHoldsSchema: TableSchema = {
    name: 'balance_holds',
    createStatement: `
    CREATE TABLE IF NOT EXISTS balance_holds (
        id SERIAL PRIMARY KEY,
        hold_id VARCHAR(255) UNIQUE NOT NULL,
        user_id VARCHAR(255) REFERENCES users(id),
        amount DECIMAL(20, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'EGP',
        reason TEXT,
        order_id VARCHAR(255),
        expires_at TIMESTAMP,
        description TEXT,
        metadata JSONB,
        transaction_id INTEGER REFERENCES balance_transactions(id),
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP
    )
    `,
    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_balance_holds_user_id ON balance_holds(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_balance_holds_hold_id ON balance_holds(hold_id)',
        'CREATE INDEX IF NOT EXISTS idx_balance_holds_status ON balance_holds(status)'
    ]
};
