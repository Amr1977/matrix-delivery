-- Complete Test Schema for BDD Tests
-- Matches production database schema

-- Drop existing tables
DROP TABLE IF EXISTS balance_holds CASCADE;
DROP TABLE IF EXISTS balance_transactions CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;
DROP TABLE IF EXISTS wallet_payments CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table with ALL production columns
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    phone VARCHAR(20),
    primary_role VARCHAR(20) NOT NULL,
    granted_roles VARCHAR(20)[] DEFAULT ARRAY[]::VARCHAR[],
    is_verified BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    country VARCHAR(100),
    city VARCHAR(100),
    area VARCHAR(100),
    vehicle_type VARCHAR(50),
    gender VARCHAR(10) DEFAULT 'male',
    rating DECIMAL(3, 2) DEFAULT 0.00,
    completed_deliveries INTEGER DEFAULT 0,
    total_ratings INTEGER DEFAULT 0,
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(20) DEFAULT 'light',
    license_number VARCHAR(50),
    service_area_zone VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255) REFERENCES users(id),
    driver_id VARCHAR(255) REFERENCES users(id),
    total_amount DECIMAL(10, 2),
    status VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    pickup_address TEXT,
    delivery_address TEXT,
    from_lat DECIMAL(10, 8),
    from_lng DECIMAL(10, 8),
    to_lat DECIMAL(10, 8),
    to_lng DECIMAL(10, 8),
    from_coordinates VARCHAR(100),
    to_coordinates VARCHAR(100),
    pickup_coordinates JSONB,
    delivery_coordinates JSONB,
    package_description TEXT,
    package_weight DECIMAL(10, 2),
    estimated_value DECIMAL(10, 2),
    special_instructions TEXT,
    price DECIMAL(10, 2),
    order_number VARCHAR(50),
    assigned_driver_user_id VARCHAR(255) REFERENCES users(id),
    assigned_driver_name VARCHAR(255),
    assigned_driver_bid_price DECIMAL(10, 2),
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create bids table
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    driver_name VARCHAR(255),
    bid_price DECIMAL(10, 2),
    estimated_pickup_time TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    message TEXT,
    driver_location_lat DECIMAL(10, 8),
    driver_location_lng DECIMAL(10, 8),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id VARCHAR(255) REFERENCES users(id),
    reviewee_id VARCHAR(255) REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create notifications table
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create wallet_payments table
CREATE TABLE wallet_payments (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id),
    amount DECIMAL(10, 2),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_balances table
CREATE TABLE user_balances (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    available_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    pending_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    held_balance DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_balance DECIMAL(12, 2) GENERATED ALWAYS AS 
        (available_balance + pending_balance + held_balance) STORED,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    daily_withdrawal_limit DECIMAL(12, 2) DEFAULT 5000.00,
    monthly_withdrawal_limit DECIMAL(12, 2) DEFAULT 50000.00,
    minimum_balance DECIMAL(12, 2) DEFAULT 0.00,
    auto_reload_threshold DECIMAL(12, 2),
    auto_reload_amount DECIMAL(12, 2),
    lifetime_deposits DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    lifetime_withdrawals DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    lifetime_earnings DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
    total_transactions INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    is_frozen BOOLEAN DEFAULT FALSE NOT NULL,
    freeze_reason TEXT,
    frozen_at TIMESTAMP,
    frozen_by VARCHAR(255) REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_transaction_at TIMESTAMP,
    CONSTRAINT positive_pending_balance CHECK (pending_balance >= 0),
    CONSTRAINT positive_held_balance CHECK (held_balance >= 0),
    CONSTRAINT valid_currency CHECK (currency IN ('EGP', 'USD', 'EUR', 'SAR', 'AED')),
    CONSTRAINT valid_limits CHECK (
        daily_withdrawal_limit >= 0 AND 
        monthly_withdrawal_limit >= daily_withdrawal_limit
    )
);

-- Create balance_transactions table
CREATE TABLE balance_transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    order_id VARCHAR(255) REFERENCES orders(id),
    wallet_payment_id INTEGER REFERENCES wallet_payments(id),
    withdrawal_request_id INTEGER,
    related_transaction_id BIGINT REFERENCES balance_transactions(id),
    processed_at TIMESTAMP,
    processed_by VARCHAR(255) REFERENCES users(id),
    processing_method VARCHAR(50),
    description TEXT NOT NULL,
    metadata JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
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

-- Create balance_holds table
CREATE TABLE balance_holds (
    id SERIAL PRIMARY KEY,
    hold_id VARCHAR(50) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP' NOT NULL,
    reason VARCHAR(100) NOT NULL,
    order_id VARCHAR(255) REFERENCES orders(id),
    dispute_id INTEGER,
    transaction_id BIGINT REFERENCES balance_transactions(id),
    status VARCHAR(20) DEFAULT 'active' NOT NULL,
    held_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    released_at TIMESTAMP,
    released_by VARCHAR(255) REFERENCES users(id),
    description TEXT,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT positive_amount CHECK (amount > 0),
    CONSTRAINT valid_status CHECK (status IN (
        'active', 'released', 'captured', 'expired', 'cancelled'
    ))
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_primary_role ON users(primary_role);
CREATE INDEX idx_users_granted_roles ON users USING GIN(granted_roles);
CREATE INDEX idx_user_balances_active ON user_balances(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_balances_frozen ON user_balances(is_frozen) WHERE is_frozen = TRUE;
CREATE INDEX idx_user_balances_currency ON user_balances(currency);
CREATE INDEX idx_user_balances_last_transaction ON user_balances(last_transaction_at DESC);
CREATE INDEX idx_balance_transactions_user_id ON balance_transactions(user_id);
CREATE INDEX idx_balance_transactions_type ON balance_transactions(type);
CREATE INDEX idx_balance_transactions_status ON balance_transactions(status);
CREATE INDEX idx_balance_transactions_created_at ON balance_transactions(created_at DESC);
CREATE INDEX idx_balance_transactions_order_id ON balance_transactions(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_balance_transactions_transaction_id ON balance_transactions(transaction_id);
CREATE INDEX idx_balance_transactions_user_type_status ON balance_transactions(user_id, type, status);
CREATE INDEX idx_balance_transactions_user_created ON balance_transactions(user_id, created_at DESC);
CREATE INDEX idx_balance_transactions_user_type_created ON balance_transactions(user_id, type, created_at DESC);
CREATE INDEX idx_balance_holds_user_id ON balance_holds(user_id);
CREATE INDEX idx_balance_holds_status ON balance_holds(status);
CREATE INDEX idx_balance_holds_order_id ON balance_holds(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_balance_holds_expires_at ON balance_holds(expires_at) WHERE status = 'active';
CREATE INDEX idx_balance_holds_hold_id ON balance_holds(hold_id);

-- Create triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER user_balances_updated_at
    BEFORE UPDATE ON user_balances
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER balance_transactions_updated_at
    BEFORE UPDATE ON balance_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER balance_holds_updated_at
    BEFORE UPDATE ON balance_holds
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();
