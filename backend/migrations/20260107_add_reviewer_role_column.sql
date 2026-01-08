-- Migration: Add reviewer_role column to reviews table
-- This column tracks whether the reviewer is a 'customer' or 'driver'

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'reviewer_role'
    ) THEN
        ALTER TABLE reviews ADD COLUMN reviewer_role VARCHAR(50);
    END IF;
END $$;
