-- Add location coordinates and route data to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_coordinates JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location_link VARCHAR(500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location_link VARCHAR(500);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_remote_area BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;

-- Add indexes for coordinate-based queries
CREATE INDEX IF NOT EXISTS idx_orders_pickup_coords ON orders USING GIN (pickup_coordinates);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_coords ON orders USING GIN (delivery_coordinates);
CREATE INDEX IF NOT EXISTS idx_orders_distance ON orders(estimated_distance_km);
CREATE INDEX IF NOT EXISTS idx_orders_remote_area ON orders(is_remote_area);
CREATE INDEX IF NOT EXISTS idx_orders_international ON orders(is_international);

-- Update vehicle type constraint to include walker and bicycle
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vehicle_type_check;
ALTER TABLE users ADD CONSTRAINT users_vehicle_type_check
  CHECK (vehicle_type IN ('walker', 'bicycle', 'bike', 'car', 'van', 'truck'));

-- Add delivery agent preferences
CREATE TABLE IF NOT EXISTS delivery_agent_preferences (
  id SERIAL PRIMARY KEY,
  agent_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  max_distance_km DECIMAL(10,2) DEFAULT 50.00,
  accept_remote_areas BOOLEAN DEFAULT false,
  accept_international BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agent_id)
);

-- Verify migration
SELECT 'Migration completed successfully' AS status;
