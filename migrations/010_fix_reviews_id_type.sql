-- Fix reviews.id column type from integer to varchar to match other ID columns
-- This fixes the "value is out of range for type integer" error when submitting reviews

-- First, we need to drop any constraints that might reference this column
-- (There shouldn't be any foreign keys referencing reviews.id, but let's be safe)

-- Change the column type from integer to varchar(255)
ALTER TABLE reviews ALTER COLUMN id TYPE character varying(255);

-- Update the column to use the new format for any future inserts
-- (Existing integer IDs will be converted to strings automatically by PostgreSQL)
