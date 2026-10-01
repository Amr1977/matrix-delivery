-- Migration 024: Add store branding columns (logo, cover image)
-- Run after migration 023

-- Add logo and cover image columns to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS logo_public_id TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS cover_public_id TEXT;

-- Add comments for documentation
COMMENT ON COLUMN stores.logo_url IS 'Cloudinary URL for store logo';
COMMENT ON COLUMN stores.logo_public_id IS 'Cloudinary public_id for store logo (used for deletion/replacement)';
COMMENT ON COLUMN stores.cover_image_url IS 'Cloudinary URL for store cover/banner image';
COMMENT ON COLUMN stores.cover_public_id IS 'Cloudinary public_id for store cover image (used for deletion/replacement)';