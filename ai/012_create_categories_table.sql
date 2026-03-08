CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by parent category
CREATE INDEX idx_categories_parent_id ON categories(parent_id);

-- Index for faster lookups by name
CREATE INDEX idx_categories_name ON categories(name);

-- Add a self-referencing constraint for hierarchy
ALTER TABLE categories ADD CONSTRAINT chk_parent_id CHECK (
  parent_id IS NOT NULL AND parent_id != id OR parent_id IS NULL
);