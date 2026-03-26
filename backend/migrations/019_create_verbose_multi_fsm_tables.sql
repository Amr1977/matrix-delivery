-- Migration: 019_create_verbose_multi_fsm_tables.sql
-- Creates separate FSM state tables for Vendor, Payment, and Delivery FSMs
-- Includes audit logging table for all FSM transitions

-- Vendor FSM state table
CREATE TABLE IF NOT EXISTS marketplace_order_vendor_fsm (
  order_id INTEGER PRIMARY KEY REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  current_state TEXT NOT NULL DEFAULT 'awaiting_order_availability_vendor_confirmation'
    CHECK (current_state IN (
      'awaiting_order_availability_vendor_confirmation',
      'order_rejected_by_vendor',
      'awaiting_vendor_start_preparation',
      'vendor_is_actively_preparing_order',
      'order_is_fully_prepared_and_ready_for_delivery'
    )),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Payment FSM state table
CREATE TABLE IF NOT EXISTS marketplace_order_payment_fsm (
  order_id INTEGER PRIMARY KEY REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  current_state TEXT DEFAULT NULL
    CHECK (current_state IS NULL OR current_state IN (
      'payment_pending_for_customer',
      'payment_attempt_failed_for_order',
      'payment_successfully_received_and_verified_for_order',
      'payment_has_been_refunded_to_customer'
    )),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Delivery FSM state table
CREATE TABLE IF NOT EXISTS marketplace_order_delivery_fsm (
  order_id INTEGER PRIMARY KEY REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  current_state TEXT DEFAULT NULL
    CHECK (current_state IS NULL OR current_state IN (
      'delivery_request_created_waiting_for_courier_acceptance',
      'courier_has_been_assigned_to_deliver_the_order',
      'courier_has_arrived_at_vendor_pickup_location',
      'courier_confirms_receipt_of_order_from_vendor',
      'courier_is_actively_transporting_order_to_customer',
      'courier_has_arrived_at_customer_drop_off_location',
      'courier_marks_order_as_delivered_to_customer',
      'awaiting_customer_confirmation_of_order_delivery',
      'order_delivery_successfully_completed_and_confirmed_by_customer',
      'delivery_disputed_by_customer_and_requires_resolution'
    )),
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- FSM Action Audit Log table
CREATE TABLE IF NOT EXISTS fsm_action_log (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  fsm_type TEXT NOT NULL CHECK (fsm_type IN ('vendor', 'payment', 'delivery')),
  from_state TEXT,
  to_state TEXT NOT NULL,
  event TEXT NOT NULL,
  actor TEXT NOT NULL,  -- user_id or 'system'
  actor_role TEXT CHECK (actor_role IN ('customer', 'vendor', 'driver', 'admin', 'system')),
  metadata JSONB DEFAULT '{}', -- Additional context (reasons, amounts, etc.)
  timestamp TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vendor_fsm_state ON marketplace_order_vendor_fsm(current_state);
CREATE INDEX IF NOT EXISTS idx_payment_fsm_state ON marketplace_order_payment_fsm(current_state);
CREATE INDEX IF NOT EXISTS idx_delivery_fsm_state ON marketplace_order_delivery_fsm(current_state);
CREATE INDEX IF NOT EXISTS idx_action_log_order_id ON fsm_action_log(order_id);
CREATE INDEX IF NOT EXISTS idx_action_log_fsm_type ON fsm_action_log(fsm_type);
CREATE INDEX IF NOT EXISTS idx_action_log_timestamp ON fsm_action_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_action_log_actor ON fsm_action_log(actor);

-- Triggers to update last_updated timestamps
CREATE OR REPLACE FUNCTION update_fsm_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendor_fsm_updated ON marketplace_order_vendor_fsm;
CREATE TRIGGER vendor_fsm_updated
  BEFORE UPDATE ON marketplace_order_vendor_fsm
  FOR EACH ROW EXECUTE FUNCTION update_fsm_last_updated();

DROP TRIGGER IF EXISTS payment_fsm_updated ON marketplace_order_payment_fsm;
CREATE TRIGGER payment_fsm_updated
  BEFORE UPDATE ON marketplace_order_payment_fsm
  FOR EACH ROW EXECUTE FUNCTION update_fsm_last_updated();

DROP TRIGGER IF EXISTS delivery_fsm_updated ON marketplace_order_delivery_fsm;
CREATE TRIGGER delivery_fsm_updated
  BEFORE UPDATE ON marketplace_order_delivery_fsm
  FOR EACH ROW EXECUTE FUNCTION update_fsm_last_updated();

-- Migration logic for existing orders
-- All existing marketplace orders start with vendor FSM in initial state
INSERT INTO marketplace_order_vendor_fsm (order_id, current_state)
SELECT id, 'awaiting_order_availability_vendor_confirmation'
FROM marketplace_orders
WHERE order_type = 'marketplace'
ON CONFLICT (order_id) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE marketplace_order_vendor_fsm IS 'Tracks vendor preparation lifecycle states for marketplace orders';
COMMENT ON TABLE marketplace_order_payment_fsm IS 'Tracks customer payment flow states for marketplace orders';
COMMENT ON TABLE marketplace_order_delivery_fsm IS 'Tracks courier delivery logistics states for marketplace orders';
COMMENT ON TABLE fsm_action_log IS 'Audit log for all FSM state transitions with full context';
