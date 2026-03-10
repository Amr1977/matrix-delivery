-- P0 FIX: Expand order status CHECK constraint to include ALL FSM states
-- The original constraint (from schema + 20260131 migration) only allowed 6-7 statuses,
-- but the FSM (OrderFSMRegistry.js) and constants.js define 15 distinct order states.
-- Missing states would cause INSERT/UPDATE failures when orders transition to:
--   completed, in_transit, delivered_pending, disputed, refunded, failed, paid, assigned, rejected, pending
--
-- This migration drops the old constraint and adds a new one covering all ORDER_STATUS values
-- from backend/config/constants.js.

-- Drop existing constraints (both the original CREATE TABLE one and the 20260131 migration one)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check1;

-- Add the comprehensive constraint with ALL FSM states
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending',              -- Generic pending (marketplace initial state)
    'pending_bids',         -- Delivery: waiting for driver bids
    'accepted',             -- Bid accepted (delivery) / vendor accepted (marketplace)
    'paid',                 -- Marketplace: payment confirmed
    'assigned',             -- Marketplace: courier assigned
    'picked_up',            -- Item picked up from origin
    'in_transit',           -- Delivery: en route to destination
    'delivered',            -- Marked as delivered (awaiting confirmation)
    'delivered_pending',    -- Delivery: delivered, pending customer confirmation
    'completed',            -- Order fully completed and confirmed
    'cancelled',            -- Order cancelled (unified British spelling across codebase)
    'disputed',             -- Order under dispute
    'refunded',             -- Payment refunded
    'rejected',             -- Marketplace: vendor rejected order
    'failed'                -- Payment or processing failure
  )
);
