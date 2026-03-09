-- Create vendor payouts table for marketplace order payouts
-- Migration: 018_create_vendor_payouts_table.sql

CREATE TABLE IF NOT EXISTS vendor_payouts (
    id SERIAL PRIMARY KEY,
    payout_number VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,

    -- Payout amounts
    order_total DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    payout_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'EGP',

    -- Payout method and details
    payout_method VARCHAR(50) NOT NULL, -- 'bank_transfer', 'digital_wallet', 'cash_pickup'
    payout_details JSONB, -- Store method-specific details (account numbers, wallet addresses, etc.)

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),

    -- Processing information
    processed_by INTEGER REFERENCES users(id), -- Admin/system user who processed
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,

    -- Audit and metadata
    reference_number VARCHAR(255), -- External payment reference
    notes TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TRIGGER trigger_update_vendor_payout_updated_at
    BEFORE UPDATE ON vendor_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_vendor_payout_updated_at();
