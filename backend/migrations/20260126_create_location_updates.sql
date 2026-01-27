-- Add current location columns to orders if not exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'current_location_lat') THEN
        ALTER TABLE orders ADD COLUMN current_location_lat DECIMAL(10, 8);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'current_location_lng') THEN
        ALTER TABLE orders ADD COLUMN current_location_lng DECIMAL(11, 8);
    END IF;
END $$;

-- Create location_updates table if not exists
CREATE TABLE IF NOT EXISTS location_updates (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    driver_id VARCHAR(255) NOT NULL REFERENCES users(id),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
