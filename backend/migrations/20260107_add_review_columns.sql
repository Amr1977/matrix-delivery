-- Migration: Add ALL missing columns to reviews table
-- Backend INSERT expects: order_id, reviewer_id, reviewee_id, reviewer_role, review_type, rating, comment, 
--                        professionalism_rating, communication_rating, timeliness_rating, condition_rating

DO $$
BEGIN
    -- Add reviewer_role column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'reviewer_role'
    ) THEN
        ALTER TABLE reviews ADD COLUMN reviewer_role VARCHAR(50);
    END IF;
    
    -- Add review_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'review_type'
    ) THEN
        ALTER TABLE reviews ADD COLUMN review_type VARCHAR(50) DEFAULT 'customer_to_driver';
    END IF;
    
    -- Add comment column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'comment'
    ) THEN
        ALTER TABLE reviews ADD COLUMN comment TEXT;
    END IF;
    
    -- Add condition_rating column if not exists (backend uses this, table has package_condition_rating)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' AND column_name = 'condition_rating'
    ) THEN
        ALTER TABLE reviews ADD COLUMN condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5);
    END IF;
END $$;
