-- Migration 028: Add courier profile fields to users and seed tier rules
-- Adds current_tier, is_profile_public, tier_updated_at to users
-- Seeds courier_tier_rules with placeholder thresholds (to be tuned by business)

-- Add profile visibility and tier fields to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_tier VARCHAR(30),
ADD COLUMN IF NOT EXISTS is_profile_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMP;

-- Create index for public profile queries
CREATE INDEX IF NOT EXISTS idx_users_current_tier ON users(current_tier);
CREATE INDEX IF NOT EXISTS idx_users_is_profile_public ON users(is_profile_public);

-- Seed courier tier rules with placeholder thresholds
-- NOTE: These are placeholder numbers. The business should tune them based on actual courier distribution.
-- Check courier stats distribution before applying to avoid mass promotion/demotion.
INSERT INTO courier_tier_rules (tier_name, display_order, min_completed_deliveries, min_tenure_days, min_rating, min_team_size)
VALUES 
    ('junior', 1, 0, 0, 0.00, 0),
    ('mid', 2, 200, 60, 4.30, 0),
    ('senior', 3, 800, 180, 4.60, 0),
    ('team_leader', 4, 800, 180, 4.60, 1)
ON CONFLICT (tier_name) DO NOTHING;