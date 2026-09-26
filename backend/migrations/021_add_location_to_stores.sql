-- Migration: 021_add_location_to_stores.sql
-- Description: Add geospatial coordinates and geography support to stores
-- Date: 2026-09-26

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE stores ADD COLUMN latitude DECIMAL(10,8);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE stores ADD COLUMN longitude DECIMAL(11,8);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'postgis'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'stores' AND column_name = 'location'
    ) THEN
      ALTER TABLE stores ADD COLUMN location GEOGRAPHY(POINT,4326);
    END IF;

    UPDATE stores
    SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
    WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND location IS NULL;

    CREATE INDEX IF NOT EXISTS idx_stores_location
      ON stores USING GIST (location);
  END IF;
END $$;
