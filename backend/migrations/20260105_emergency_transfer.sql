-- Emergency Transfer System
-- Handles order transfers when driver cannot complete after pickup

-- ============================================
-- Emergency Transfers Table
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_transfers (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  
  -- Original Driver
  original_driver_id TEXT NOT NULL,
  original_driver_location JSONB,  -- {lat, lng} at time of emergency
  distance_traveled_km DECIMAL(10,3),
  emergency_reason TEXT,  -- 'vehicle_breakdown', 'health_issue', 'accident', 'other'
  
  -- New Driver (assigned after acceptance)
  new_driver_id TEXT,
  new_driver_location JSONB,
  
  -- Financial Details
  original_delivery_fee DECIMAL(10,2),
  emergency_bonus_rate DECIMAL(5,4) DEFAULT 0.20,  -- 20%
  emergency_bonus DECIMAL(10,2),
  original_driver_compensation DECIMAL(10,2),
  
  -- Upfront Payment Handling
  upfront_amount DECIMAL(10,2) DEFAULT 0,
  upfront_transferred BOOLEAN DEFAULT FALSE,
  
  -- Status & Timing
  status TEXT DEFAULT 'pending',
    -- 'pending', 'accepted', 'handoff_pending', 'completed', 'escalated', 'cancelled'
  timeout_at TIMESTAMPTZ,  -- 30 minutes from creation
  
  -- Handoff Confirmation
  original_driver_confirmed BOOLEAN DEFAULT FALSE,
  new_driver_confirmed BOOLEAN DEFAULT FALSE,
  handoff_location JSONB,
  handoff_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_emergency_transfers_order ON emergency_transfers(order_id);
CREATE INDEX IF NOT EXISTS idx_emergency_transfers_status ON emergency_transfers(status);
CREATE INDEX IF NOT EXISTS idx_emergency_transfers_timeout ON emergency_transfers(timeout_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_emergency_transfers_new_driver ON emergency_transfers(new_driver_id);

-- ============================================
-- Add emergency-related columns to orders
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_emergency_transfer BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS emergency_transfer_id INTEGER REFERENCES emergency_transfers(id);

-- ============================================
-- Add available_cash to users for filtering
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS available_cash DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS cash_currency TEXT DEFAULT 'EGP';

-- ============================================
-- Emergency transfer notification tracking
-- ============================================
CREATE TABLE IF NOT EXISTS emergency_transfer_notifications (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER REFERENCES emergency_transfers(id),
  driver_id TEXT NOT NULL,
  notified_at TIMESTAMPTZ DEFAULT NOW(),
  distance_to_transfer_km DECIMAL(10,3),
  has_sufficient_cash BOOLEAN DEFAULT TRUE,
  response TEXT  -- 'pending', 'accepted', 'rejected', 'expired'
);

CREATE INDEX IF NOT EXISTS idx_emergency_notif_transfer ON emergency_transfer_notifications(transfer_id);
CREATE INDEX IF NOT EXISTS idx_emergency_notif_driver ON emergency_transfer_notifications(driver_id);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE emergency_transfers IS 'Tracks order transfers when drivers cannot complete after pickup';
COMMENT ON COLUMN emergency_transfers.timeout_at IS '30 minutes from creation - after which escalates to admin';
COMMENT ON COLUMN emergency_transfers.emergency_bonus IS '20% of original fee, paid from Takaful fund';
COMMENT ON COLUMN users.available_cash IS 'Cash the driver has available for upfront payments';
