CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by item
CREATE INDEX IF NOT EXISTS idx_offers_item_id ON offers(item_id);

-- Index for faster lookups by status
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Index for faster lookups by date range
CREATE INDEX IF NOT EXISTS idx_offers_date_range ON offers(start_date, end_date);

-- Add constraint to ensure end_date is after start_date
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_date_range'
  ) THEN
    ALTER TABLE offers
      ADD CONSTRAINT chk_date_range CHECK (end_date > start_date);
  END IF;
END $$;
