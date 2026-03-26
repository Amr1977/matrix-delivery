CREATE TABLE IF NOT EXISTS shopping_carts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days')
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_shopping_carts_user_id ON shopping_carts(user_id);

-- Index for faster lookups by store
CREATE INDEX IF NOT EXISTS idx_shopping_carts_store_id ON shopping_carts(store_id);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_shopping_carts_expires_at ON shopping_carts(expires_at);

CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL, -- Price at time of adding to cart
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by cart
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);

-- Index for faster lookups by item
CREATE INDEX IF NOT EXISTS idx_cart_items_item_id ON cart_items(item_id);

-- Ensure one item per cart (prevent duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_cart_items_cart_item ON cart_items(cart_id, item_id);

-- Function to update cart updated_at when items change
CREATE OR REPLACE FUNCTION update_cart_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shopping_carts
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.cart_id
      ELSE NEW.cart_id
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update cart timestamp when items are added/updated/deleted
DROP TRIGGER IF EXISTS trigger_update_cart_updated_at ON cart_items;
CREATE TRIGGER trigger_update_cart_updated_at
  AFTER INSERT OR UPDATE OR DELETE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_cart_updated_at();
