-- Add review_type column to reviews table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reviews' AND column_name = 'review_type') THEN
        ALTER TABLE reviews ADD COLUMN review_type VARCHAR(50) DEFAULT 'customer_to_driver';
    END IF;
END $$;
