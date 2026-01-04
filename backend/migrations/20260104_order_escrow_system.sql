-- Order Escrow System Migration
-- Adds escrow tracking columns to orders table for balance hold management

-- Add upfront_payment column (amount driver needs to pay for purchases, default 0)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upfront_payment DECIMAL(10,2) DEFAULT 0;

-- Add escrow tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS escrow_status TEXT DEFAULT 'none';
-- escrow_status values: 'none', 'held', 'released', 'forfeited'

-- Add driver distance tracking for compensation calculation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS driver_distance_traveled_km DECIMAL(10,3);

-- Add cancellation tracking columns
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
-- cancelled_by values: 'customer', 'driver', 'admin', 'system'

-- Add upfront payment tracking (for COD/purchase orders)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upfront_paid_by_driver BOOLEAN DEFAULT FALSE;

-- Create index for escrow queries
CREATE INDEX IF NOT EXISTS idx_orders_escrow_status ON orders(escrow_status) WHERE escrow_status IS NOT NULL;

COMMENT ON COLUMN orders.upfront_payment IS 'Amount customer pays upfront for driver to purchase items (default 0)';
COMMENT ON COLUMN orders.escrow_amount IS 'Total amount held in escrow (upfront + delivery fee)';
COMMENT ON COLUMN orders.escrow_status IS 'Status of escrow: none, held, released, forfeited';
COMMENT ON COLUMN orders.driver_distance_traveled_km IS 'Distance driver traveled (used for compensation on cancellation)';
