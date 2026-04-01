-- FIX: Add missing in_transit_at column to orders table
-- The orderService.js updateOrderStatus sets in_transit_at = NOW() when driver
-- marks order as in_transit, but this column was never added to the table.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP;
