-- Add courier_delivered and customer_delivered to order status CHECK constraint
-- These statuses are required by the FSM for driver-delivered orders:
--   - courier_delivered: Driver marks order as delivered
--   - customer_delivered: Customer confirms receipt
-- Previously missing, causing constraint violations when drivers complete orders.

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pending',
    'pending_bids',
    'accepted',
    'paid',
    'assigned',
    'picked_up',
    'in_transit',
    'courier_delivered',   -- Driver marked as delivered
    'customer_delivered',   -- Customer confirmed delivery
    'delivered',
    'delivered_pending',
    'completed',
    'cancelled',
    'disputed',
    'refunded',
    'rejected',
    'failed'
  )
);
