-- Add missing granted_roles column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS granted_roles TEXT[];

-- Update existing users to have granted_roles based on primary_role
UPDATE users 
SET granted_roles = ARRAY[primary_role]::TEXT[]
WHERE granted_roles IS NULL;
