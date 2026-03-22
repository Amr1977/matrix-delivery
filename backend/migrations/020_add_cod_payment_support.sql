-- Migration: 020_add_cod_payment_support.sql
-- Description: Add payment_method column for COD support and platform fee tracking
-- Date: 2026-03-22

-- Add payment_method column to orders table
-- Values: 'COD' (default), 'PREPAID'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'COD';

-- Add platform_fee_amount column to track fee deducted per order
ALTER TABLE orders ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0;

-- Add index for querying by payment method
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Add index for driver active orders check (used in bidding eligibility)
CREATE INDEX IF NOT EXISTS idx_orders_driver_status ON orders(assigned_driver_user_id, status)
WHERE assigned_driver_user_id IS NOT NULL;

-- Add platform_fee transaction type to balance_transactions if needed
-- (Usually already exists in schema, this is just a safety check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'balance_transactions' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE balance_transactions ADD COLUMN type VARCHAR(50);
    END IF;
END $$;
