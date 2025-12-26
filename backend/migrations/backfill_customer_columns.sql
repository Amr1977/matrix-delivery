-- Add customer_name and estimated_delivery_date to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_delivery_date TIMESTAMP;

-- Backfill customer_name from users table for existing orders (optional but good for consistency)
UPDATE orders o
SET customer_name = u.name
FROM users u
WHERE o.customer_id = u.id
AND o.customer_name IS NULL;
