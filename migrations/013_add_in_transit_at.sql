-- Add in_transit_at column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS in_transit_at TIMESTAMP;
