CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by parent category
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Index for faster lookups by name
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- Add a self-referencing constraint for hierarchy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_parent_id'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT chk_parent_id CHECK (parent_id IS NULL OR parent_id != id);
  END IF;
END $$;
