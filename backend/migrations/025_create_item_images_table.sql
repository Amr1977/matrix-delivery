-- Migration 025: Create item_images table for item photo gallery
-- Run after migration 024

CREATE TABLE IF NOT EXISTS item_images (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying images by item
CREATE INDEX IF NOT EXISTS idx_item_images_item_id ON item_images(item_id);

-- Partial unique index: only one primary image per item
CREATE UNIQUE INDEX IF NOT EXISTS idx_item_images_one_primary_per_item
    ON item_images(item_id)
    WHERE is_primary = true;

-- Add comments for documentation
COMMENT ON TABLE item_images IS 'Item photo gallery with ordering and primary image flag';
COMMENT ON COLUMN item_images.image_url IS 'Cloudinary URL for the image';
COMMENT ON COLUMN item_images.cloudinary_public_id IS 'Cloudinary public_id (used for deletion/replacement)';
COMMENT ON COLUMN item_images.display_order IS 'Display order in gallery (lower = first)';
COMMENT ON COLUMN item_images.is_primary IS 'Whether this is the primary/cover image for the item';