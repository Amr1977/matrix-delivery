-- Migration: Fix reviews table to use VARCHAR id instead of UUID
-- This matches the ID pattern used by users, orders, and other tables

-- First, drop dependent tables' foreign keys
ALTER TABLE review_flags DROP CONSTRAINT IF EXISTS review_flags_review_id_fkey;
ALTER TABLE review_votes DROP CONSTRAINT IF EXISTS review_votes_review_id_fkey;

-- Change the id column type from UUID to VARCHAR(255)
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_pkey;
ALTER TABLE reviews ALTER COLUMN id DROP DEFAULT;
ALTER TABLE reviews ALTER COLUMN id TYPE VARCHAR(255) USING id::VARCHAR;
ALTER TABLE reviews ADD PRIMARY KEY (id);

-- Recreate foreign keys with new type
ALTER TABLE review_flags ALTER COLUMN review_id TYPE VARCHAR(255) USING review_id::VARCHAR;
ALTER TABLE review_votes ALTER COLUMN review_id TYPE VARCHAR(255) USING review_id::VARCHAR;

-- Re-add foreign key constraints
ALTER TABLE review_flags ADD CONSTRAINT review_flags_review_id_fkey 
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
ALTER TABLE review_votes ADD CONSTRAINT review_votes_review_id_fkey 
    FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE;
