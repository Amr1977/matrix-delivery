-- Complete Test Schema - Synced with Production (setup-test-db.js)
-- This schema matches the production database exactly
-- Generated: 2025-12-31

-- Drop all existing tables
DROP TABLE IF EXISTS logs CASCADE;
DROP TABLE IF EXISTS user_payment_methods CASCADE;
DROP TABLE IF EXISTS balance_holds CASCADE;
DROP TABLE IF EXISTS balance_transactions CASCADE;
DROP TABLE IF EXISTS user_balances CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bids CASCADE;
DROP TABLE IF EXISTS email_verification_tokens CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS crypto_transactions CASCADE;
DROP TABLE IF EXISTS user_wallets CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    primary_role VARCHAR(50) NOT NULL,
    granted_roles TEXT[],
    vehicle_type VARCHAR(50),
    country VARCHAR(100),
    city VARCHAR(100),
    area VARCHAR(100),
    rating DECIMAL(3, 2) DEFAULT 5.00,
    completed_deliveries INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User wallets table
CREATE TABLE user_wallets (
    user_id VARCHAR(255) PRIMARY KEY REFERENCES users(id),
    wallet_address VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crypto transactions table
CREATE TABLE crypto_transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    order_id VARCHAR(255),
    transaction_type VARCHAR(50) NOT NULL,
    token_address VARCHAR(255),
    token_symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(20, 6) NOT NULL,
    tx_hash VARCHAR(255),
    block_number INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id VARCHAR(255) PRIMARY KEY,
    order_number VARCHAR(50),
    title VARCHAR(255),
    description TEXT,
    pickup_address TEXT,
    delivery_address TEXT,
    from_lat DECIMAL(10, 8),
    from_lng DECIMAL(11, 8),
    from_name VARCHAR(255),
    to_lat DECIMAL(10, 8),
    to_lng DECIMAL(11, 8),
    to_name VARCHAR(255),
    pickup_coordinates JSONB,
    delivery_coordinates JSONB,
    pickup_location_link TEXT,
    delivery_location_link TEXT,
    estimated_distance_km DECIMAL(10, 2),
    estimated_duration_minutes INTEGER,
    route_polyline TEXT,
    is_remote_area BOOLEAN DEFAULT FALSE,
    is_international BOOLEAN DEFAULT FALSE,
    package_description TEXT,
    package_weight DECIMAL(10, 2),
    estimated_value DECIMAL(10, 2),
    special_instructions TEXT,
    price DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL,
    customer_id VARCHAR(255) REFERENCES users(id),
    customer_name VARCHAR(255),
    assigned_driver_user_id VARCHAR(255) REFERENCES users(id),
    assigned_driver_name VARCHAR(255),
    assigned_driver_bid_price DECIMAL(10, 2),
    payment_status VARCHAR(50),
    crypto_payment BOOLEAN DEFAULT FALSE,
    crypto_token VARCHAR(255),
    crypto_amount DECIMAL(20, 6),
    total_price DECIMAL(10, 2),
    estimated_delivery_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    accepted_at TIMESTAMP,
    picked_up_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE password_reset_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens table
CREATE TABLE email_verification_tokens (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    token VARCHAR(255) NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bids table
CREATE TABLE bids (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id),
    driver_name VARCHAR(255),
    bid_price DECIMAL(10, 2) NOT NULL,
    estimated_pickup_time TIMESTAMP,
    estimated_delivery_time TIMESTAMP,
    message TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    driver_location_lat DECIMAL(10, 8),
    driver_location_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id),
    reviewer_id VARCHAR(255) REFERENCES users(id),
    reviewee_id VARCHAR(255) REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE payments (
    id VARCHAR(255) PRIMARY KEY,
    order_id VARCHAR(255) REFERENCES orders(id),
    payer_id VARCHAR(255) REFERENCES users(id),
    payee_id VARCHAR(255) REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    stripe_payment_intent_id VARCHAR(255),
    stripe_charge_id VARCHAR(255),
    paypal_order_id VARCHAR(255),
    paypal_capture_id VARCHAR(255),
    platform_fee DECIMAL(10, 2),
    driver_earnings DECIMAL(10, 2),
    updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User balances table
CREATE TABLE user_balances (
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
);

-- Balance transactions table
CREATE TABLE balance_transactions (
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
);

-- Balance holds table
CREATE TABLE balance_holds (
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
);

-- User payment methods table
CREATE TABLE user_payment_methods (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    payment_method_type VARCHAR(50),
    provider VARCHAR(50),
    provider_token VARCHAR(255),
    last_four VARCHAR(4),
    expiry_month INTEGER,
    expiry_year INTEGER,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs table for comprehensive logging system
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug', 'http')),
    source VARCHAR(20) NOT NULL CHECK (source IN ('frontend', 'backend')),
    category VARCHAR(50),
    message TEXT NOT NULL,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    url TEXT,
    method VARCHAR(10),
    status_code INTEGER,
    duration_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    stack_trace TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_crypto_tx_user ON crypto_transactions(user_id);
CREATE INDEX idx_crypto_tx_order ON crypto_transactions(order_id);
CREATE INDEX idx_user_wallets_address ON user_wallets(wallet_address);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_level ON logs(level);
CREATE INDEX idx_logs_source ON logs(source);
CREATE INDEX idx_logs_category ON logs(category);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_logs_session_id ON logs(session_id);
CREATE INDEX idx_balance_tx_user ON balance_transactions(user_id);
CREATE INDEX idx_balance_tx_user_created ON balance_transactions(user_id, created_at DESC);
CREATE INDEX idx_balance_tx_type ON balance_transactions(type);
CREATE INDEX idx_balance_tx_status ON balance_transactions(status);
CREATE INDEX idx_balance_tx_order ON balance_transactions(order_id);
CREATE INDEX idx_balance_tx_created ON balance_transactions(created_at DESC);
