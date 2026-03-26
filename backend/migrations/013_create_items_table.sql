CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by store
CREATE INDEX IF NOT EXISTS idx_items_store_id ON items(store_id);

-- Index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status);
