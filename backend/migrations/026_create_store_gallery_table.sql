-- Migration 026: Create store_gallery table for store photo gallery
-- Run after migration 025

CREATE TABLE IF NOT EXISTS store_gallery (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying gallery by store
CREATE INDEX IF NOT EXISTS idx_store_gallery_store_id ON store_gallery(store_id);

-- Partial unique index: only one primary gallery image per store
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_gallery_one_primary_per_store
    ON store_gallery(store_id)
    WHERE is_primary = true;

-- Add comments for documentation
COMMENT ON TABLE store_gallery IS 'Store photo gallery (distinct from logo/cover which are single-value columns on stores)';
COMMENT ON COLUMN store_gallery.image_url IS 'Cloudinary URL for the gallery image';
COMMENT ON COLUMN store_gallery.cloudinary_public_id IS 'Cloudinary public_id (used for deletion/replacement)';
COMMENT ON COLUMN store_gallery.display_order IS 'Display order in gallery (lower = first)';
COMMENT ON COLUMN store_gallery.is_primary IS 'Whether this is the primary/featured gallery image';