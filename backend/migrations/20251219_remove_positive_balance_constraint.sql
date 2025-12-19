-- Migration: Remove positive balance constraint to allow debt
-- Date: 2025-12-19
-- Purpose: Allow driver balances to go negative (debt) for COD commission system

-- Remove the constraint that prevents negative balances
ALTER TABLE user_balances DROP CONSTRAINT IF EXISTS positive_available_balance;

-- Add comment explaining the change
COMMENT ON COLUMN user_balances.available_balance IS 'Driver available balance - can be negative (debt) when COD commission exceeds balance';
