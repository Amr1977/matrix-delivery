-- Create driver locations table for live tracking
CREATE TABLE IF NOT EXISTS driver_locations (
  id SERIAL PRIMARY KEY,
  driver_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  heading DECIMAL(5,2), -- Direction in degrees (0-360)
  speed_kmh DECIMAL(5,2), -- Speed in km/h
  accuracy_meters DECIMAL(6,2), -- GPS accuracy in meters
  status VARCHAR(50) DEFAULT 'active' -- active, paused, ended
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON driver_locations(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_timestamp ON driver_locations(timestamp);
CREATE INDEX IF NOT EXISTS idx_driver_locations_coords ON driver_locations(latitude, longitude);

-- Update orders table to track current status for tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS current_tracking_status VARCHAR(50) DEFAULT 'not_started';

-- Create index on tracking status
CREATE INDEX IF NOT EXISTS idx_orders_tracking_status ON orders(current_tracking_status);

-- Verify migration
SELECT 'Driver live tracking migration completed successfully' AS status;
