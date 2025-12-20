-- Manual Wallet Payment Confirmations
-- Supports Vodafone Cash, InstaPay, and other mobile wallet transfers
-- Allows manual admin confirmation with future SMS automation capability

CREATE TABLE IF NOT EXISTS wallet_payments (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    
    -- Payment Details
    wallet_type VARCHAR(50) NOT NULL, -- 'vodafone_cash', 'instapay', 'orange_cash', 'etisalat_cash'
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EGP',
    
    -- Transfer Information
    sender_phone VARCHAR(20), -- Customer's phone number
    sender_name VARCHAR(255), -- Name from transfer
    transaction_reference VARCHAR(100), -- Reference number from SMS/receipt
    transfer_timestamp TIMESTAMP, -- When customer made the transfer
    
    -- Platform Wallet Details
    recipient_phone VARCHAR(20) NOT NULL, -- Platform's wallet number
    recipient_name VARCHAR(255), -- Platform wallet name
    
    -- Confirmation Details
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'disputed'
    confirmed_by VARCHAR(50) REFERENCES users(id), -- Admin who confirmed
    confirmed_at TIMESTAMP,
    rejection_reason TEXT,
    
    -- SMS Automation (Future)
    sms_forwarded BOOLEAN DEFAULT FALSE,
    sms_content TEXT, -- Forwarded SMS for auto-verification
    auto_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    notes TEXT,
    screenshot_url VARCHAR(500), -- Customer upload of transfer screenshot
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_wallet_type CHECK (wallet_type IN ('vodafone_cash', 'instapay', 'orange_cash', 'etisalat_cash', 'we_pay')),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'rejected', 'disputed')),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- Indexes for performance
CREATE INDEX idx_wallet_payments_order_id ON wallet_payments(order_id);
CREATE INDEX idx_wallet_payments_status ON wallet_payments(status);
CREATE INDEX idx_wallet_payments_wallet_type ON wallet_payments(wallet_type);
CREATE INDEX idx_wallet_payments_created_at ON wallet_payments(created_at);
CREATE INDEX idx_wallet_payments_transaction_ref ON wallet_payments(transaction_reference);

-- Platform Wallet Configuration
CREATE TABLE IF NOT EXISTS platform_wallets (
    id SERIAL PRIMARY KEY,
    wallet_type VARCHAR(50) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL,
    wallet_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    daily_limit DECIMAL(10, 2),
    monthly_limit DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default platform wallets (update with actual numbers)
INSERT INTO platform_wallets (wallet_type, phone_number, wallet_name, is_active) VALUES
('vodafone_cash', '01000000000', 'Matrix Delivery', TRUE),
('instapay', 'matrix.delivery', 'Matrix Delivery', TRUE),
('orange_cash', '01000000000', 'Matrix Delivery', FALSE),
('etisalat_cash', '01000000000', 'Matrix Delivery', FALSE),
('we_pay', '01000000000', 'Matrix Delivery', FALSE)
ON CONFLICT (wallet_type) DO NOTHING;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_wallet_payment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallet_payments_updated_at
    BEFORE UPDATE ON wallet_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_payment_timestamp();

-- Comments
COMMENT ON TABLE wallet_payments IS 'Manual wallet payment confirmations with SMS automation capability';
COMMENT ON COLUMN wallet_payments.sms_forwarded IS 'TRUE if payment SMS was forwarded to backend for auto-verification';
COMMENT ON COLUMN wallet_payments.auto_verified IS 'TRUE if payment was automatically verified from SMS content';
COMMENT ON COLUMN wallet_payments.screenshot_url IS 'Customer-uploaded screenshot of transfer confirmation';
