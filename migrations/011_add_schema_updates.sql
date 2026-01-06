-- Add locations tables
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  area VARCHAR(100) NOT NULL,
  street VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(country, city, area, street)
);

CREATE TABLE IF NOT EXISTS location_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  payload JSONB NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS coordinate_mappings (
  id SERIAL PRIMARY KEY,
  location_key VARCHAR(100) NOT NULL UNIQUE,
  country VARCHAR(100) NOT NULL,
  city VARCHAR(100) NOT NULL,
  lat_min DECIMAL(10,8) NOT NULL,
  lat_max DECIMAL(10,8) NOT NULL,
  lng_min DECIMAL(11,8) NOT NULL,
  lng_max DECIMAL(11,8) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to orders table for upfront payments and tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_coordinates JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS require_upfront_payment BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS upfront_payment DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location_link TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location_link TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_polyline TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_remote_area BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add cpu_load to system_health_logs
ALTER TABLE system_health_logs ADD COLUMN IF NOT EXISTS cpu_load REAL DEFAULT 0;
