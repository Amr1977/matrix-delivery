-- Force add contact info columns to orders table (Retry)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_contact_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_contact_phone VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dropoff_contact_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dropoff_contact_phone VARCHAR(50);
