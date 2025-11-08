-- Add is_verified column to users table
-- Run this SQL script to add the verification column to your existing database

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- Optional: Update existing users to be verified (uncomment if needed)
-- UPDATE users SET is_verified = true WHERE created_at < CURRENT_TIMESTAMP;

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_verified';
