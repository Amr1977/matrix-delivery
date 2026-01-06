-- Migration: Add columns needed for order reviews
-- The reviews table was originally designed for landing page reviews.
-- Order reviews need additional columns for reviewer_role, review_type, comment, and condition_rating.

-- Add reviewer_role column (customer/driver)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(50);

-- Add review_type column (customer_to_driver, driver_to_customer, customer_to_platform, driver_to_platform)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(50);

-- Add comment column (order reviews use 'comment', landing page uses 'content')
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add condition_rating column (order reviews use this naming)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5);

-- Create index on review_type for filtering
CREATE INDEX IF NOT EXISTS idx_reviews_review_type ON reviews(review_type);

-- Create index on order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id);
