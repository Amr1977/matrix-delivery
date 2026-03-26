-- Fix driver_locations unique constraint to support multiple orders per driver
-- Run this on your database

-- Drop the old unique constraint on driver_id only
ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_driver_id_key;

-- Add composite unique constraint for driver_id + order_id
ALTER TABLE driver_locations ADD CONSTRAINT driver_locations_driver_order_unique UNIQUE (driver_id, order_id);

-- Verify the constraint was added
-- \d driver_locations