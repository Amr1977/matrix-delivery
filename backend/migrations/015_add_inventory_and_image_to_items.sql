ALTER TABLE items
  ADD COLUMN IF NOT EXISTS inventory_quantity INTEGER NOT NULL DEFAULT 0;

ALTER TABLE items
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_items_inventory_quantity ON items(inventory_quantity);

