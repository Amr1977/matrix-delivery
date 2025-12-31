-- Add missing coordinate columns to test database
-- These columns exist in production and are actively used by orderService

ALTER TABLE orders ADD COLUMN IF NOT EXISTS from_coordinates VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS to_coordinates VARCHAR(255);

-- Migrate existing data from lat/lng to coordinate strings
UPDATE orders 
SET from_coordinates = from_lat || ',' || from_lng 
WHERE from_lat IS NOT NULL AND from_lng IS NOT NULL AND from_coordinates IS NULL;

UPDATE orders 
SET to_coordinates = to_lat || ',' || to_lng 
WHERE to_lat IS NOT NULL AND to_lng IS NOT NULL AND to_coordinates IS NULL;
