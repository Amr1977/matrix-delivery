-- ============================================
-- Primary Role System Migration
-- ============================================
-- This migration renames role columns for clarity:
--   role  -> primary_role (active role)
--   roles -> granted_roles (all roles user can switch to)
-- ============================================

BEGIN;

-- Step 1: Create backup table
CREATE TABLE IF NOT EXISTS users_backup_role_migration AS 
SELECT * FROM users;

-- Step 2: Rename columns (only if they haven't been renamed yet)
DO $$ 
BEGIN
    -- Rename role to primary_role if role column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users RENAME COLUMN role TO primary_role;
    END IF;
    
    -- Rename roles to granted_roles if roles column exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'roles'
    ) THEN
        ALTER TABLE users RENAME COLUMN roles TO granted_roles;
    END IF;
END $$;

-- Step 3: Ensure granted_roles includes primary_role
-- This ensures every user has their primary role in their granted roles
UPDATE users 
SET granted_roles = CASE
    WHEN granted_roles IS NULL THEN ARRAY[primary_role]
    WHEN NOT (primary_role = ANY(granted_roles)) THEN array_append(granted_roles, primary_role)
    ELSE granted_roles
END;

-- Step 4: Add index for performance on granted_roles lookups
CREATE INDEX IF NOT EXISTS idx_users_granted_roles ON users USING GIN(granted_roles);

-- Step 5: Add comment to columns for documentation
COMMENT ON COLUMN users.primary_role IS 'Currently active role for the user';
COMMENT ON COLUMN users.granted_roles IS 'Array of all roles the user is granted and can switch to';

COMMIT;

-- Verification queries (run these after migration)
-- SELECT primary_role, granted_roles FROM users LIMIT 10;
-- SELECT COUNT(*) FROM users WHERE NOT (primary_role = ANY(granted_roles));
