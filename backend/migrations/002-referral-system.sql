-- Referral System Tables
-- Purpose: Track courier referrals and commissions

-- Referral Links table
CREATE TABLE IF NOT EXISTS referral_links (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL, -- Courier who refers
    code VARCHAR(50) UNIQUE NOT NULL, -- Referral code (e.g., REF_user123)
    commission_rate DECIMAL(5,2) DEFAULT 10.00, -- 10% default
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Referral Conversions table
CREATE TABLE IF NOT EXISTS referral_conversions (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL, -- Who referred
    referee_id VARCHAR(255) NOT NULL, -- New courier
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, active, inactive
    activation_date TIMESTAMP, -- When referee completed first delivery
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id),
    FOREIGN KEY (referral_code) REFERENCES referral_links(code)
);

-- Referral Earnings table (real-time commission tracking)
CREATE TABLE IF NOT EXISTS referral_earnings (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL, -- Who gets commission
    referee_id VARCHAR(255) NOT NULL, -- Referee earning money
    transaction_id VARCHAR(255), -- Order/delivery ID
    transaction_amount DECIMAL(10,2), -- What referee earned
    commission_amount DECIMAL(10,2), -- 10% of transaction_amount
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (referrer_id) REFERENCES users(id)
);

-- Referral Payouts table (aggregate payments)
CREATE TABLE IF NOT EXISTS referral_payouts (
    id SERIAL PRIMARY KEY,
    referrer_id VARCHAR(255) NOT NULL,
    total_earned DECIMAL(10,2),
    total_paid DECIMAL(10,2) DEFAULT 0,
    pending_amount DECIMAL(10,2),
    payout_method VARCHAR(50), -- bank_transfer, vodafone_cash, etc
    payout_frequency VARCHAR(50) DEFAULT 'weekly', -- weekly, monthly
    last_payout_date TIMESTAMP,
    next_payout_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (referrer_id) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_referral_links_referrer ON referral_links(referrer_id);
CREATE INDEX idx_referral_links_code ON referral_links(code);
CREATE INDEX idx_referral_conversions_referrer ON referral_conversions(referrer_id);
CREATE INDEX idx_referral_conversions_referee ON referral_conversions(referee_id);
CREATE INDEX idx_referral_earnings_referrer ON referral_earnings(referrer_id);
CREATE INDEX idx_referral_earnings_status ON referral_earnings(status);
CREATE INDEX idx_referral_payouts_referrer ON referral_payouts(referrer_id);

-- Comments for clarity
COMMENT ON TABLE referral_links IS 'Unique referral codes for each courier';
COMMENT ON TABLE referral_conversions IS 'Track when someone uses a referral code';
COMMENT ON TABLE referral_earnings IS 'Real-time commission earnings from each delivery';
COMMENT ON TABLE referral_payouts IS 'Aggregate payout tracking for couriers';
