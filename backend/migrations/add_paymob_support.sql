-- Paymob Payment Integration Migration
-- Adds support for Paymob payments (cards + mobile wallets)

-- Add Paymob-specific columns to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS paymob_transaction_id BIGINT,
ADD COLUMN IF NOT EXISTS paymob_order_id BIGINT;

-- Create index for faster Paymob transaction lookups
CREATE INDEX IF NOT EXISTS idx_payments_paymob_transaction 
ON payments(paymob_transaction_id);

CREATE INDEX IF NOT EXISTS idx_payments_paymob_order 
ON payments(paymob_order_id);

-- Create platform_revenue table if it doesn't exist
CREATE TABLE IF NOT EXISTS platform_revenue (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(255) UNIQUE REFERENCES orders(id),
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.15,
  payment_method VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for revenue reporting
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created 
ON platform_revenue(created_at);

CREATE INDEX IF NOT EXISTS idx_platform_revenue_payment_method 
ON platform_revenue(payment_method);

-- Add platform_commission and driver_payout to orders if not exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS driver_payout DECIMAL(10,2);

-- Update existing orders to calculate commission (for historical data)
UPDATE orders 
SET 
  platform_commission = COALESCE(accepted_bid_amount, total_price) * 0.15,
  driver_payout = COALESCE(accepted_bid_amount, total_price) * 0.85
WHERE platform_commission IS NULL 
  AND payment_status = 'paid'
  AND COALESCE(accepted_bid_amount, total_price) > 0;

-- Add comment for documentation
COMMENT ON COLUMN payments.paymob_transaction_id IS 'Paymob transaction ID for tracking';
COMMENT ON COLUMN payments.paymob_order_id IS 'Paymob order ID for reference';
COMMENT ON TABLE platform_revenue IS 'Tracks platform commission revenue from all payment methods';
COMMENT ON COLUMN orders.platform_commission IS 'Platform commission amount (15% of order value)';
COMMENT ON COLUMN orders.driver_payout IS 'Driver payout amount (85% of order value)';
