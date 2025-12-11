-- Migration: Add gender column to users table
-- Date: 2025-12-11
-- Description: Add gender field with default value 'male' for avatar selection

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10) DEFAULT 'male';

-- Add comment to column
COMMENT ON COLUMN users.gender IS 'User gender for avatar selection (male/female/other)';
