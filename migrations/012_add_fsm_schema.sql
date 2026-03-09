-- FSM Database Schema Migration
-- Creates tables for the verbose multi-FSM order lifecycle system

-- Domain Events Table - for EventBus persistence and audit trails
CREATE TABLE IF NOT EXISTS domain_events (
  event_id VARCHAR(255) PRIMARY KEY,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  delivery_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  delivery_attempts INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  delivered_at TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Dead Letter Queue - for failed event deliveries
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL,
  metadata JSONB NOT NULL,
  error_message TEXT NOT NULL,
  failed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3
);

-- FSM Timeouts Table - for TimeoutScheduler persistence
CREATE TABLE IF NOT EXISTS fsm_timeouts (
  timeout_id VARCHAR(255) PRIMARY KEY,
  order_id INTEGER NOT NULL,
  fsm_type VARCHAR(50) NOT NULL, -- 'vendor', 'payment', 'delivery'
  state VARCHAR(255) NOT NULL,
  event VARCHAR(255) NOT NULL,
  context JSONB,
  duration_ms INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'processing', 'completed', 'cancelled', 'failed'
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  failed_at TIMESTAMP,
  error_message TEXT
);

-- FSM Action Log - comprehensive audit trail for all FSM transitions
CREATE TABLE IF NOT EXISTS fsm_action_log (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  fsm_type VARCHAR(50) NOT NULL, -- 'vendor', 'payment', 'delivery', 'system'
  from_state VARCHAR(255),
  to_state VARCHAR(255) NOT NULL,
  event VARCHAR(255) NOT NULL,
  actor INTEGER, -- user_id who triggered the event
  actor_role VARCHAR(50), -- 'customer', 'vendor', 'driver', 'admin', 'system'
  metadata JSONB, -- additional context data
  transition_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  correlation_id VARCHAR(255), -- for tracking related transitions
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT
);

-- FSM State Snapshots - for debugging and state recovery (optional)
CREATE TABLE IF NOT EXISTS fsm_state_snapshots (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL,
  snapshot_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  vendor_state VARCHAR(255),
  payment_state VARCHAR(255),
  delivery_state VARCHAR(255),
  overall_progress INTEGER, -- percentage 0-100
  estimated_completion TIMESTAMP,
  metadata JSONB -- additional snapshot data
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
CREATE INDEX IF NOT EXISTS idx_domain_events_status ON domain_events(delivery_status);
CREATE INDEX IF NOT EXISTS idx_domain_events_created_at ON domain_events(created_at);
CREATE INDEX IF NOT EXISTS idx_domain_events_correlation_id_gin ON domain_events USING GIN ((metadata->'correlationId'));

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_event_id ON dead_letter_queue(event_id);
CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_failed_at ON dead_letter_queue(failed_at);

CREATE INDEX IF NOT EXISTS idx_fsm_timeouts_order_id ON fsm_timeouts(order_id);
CREATE INDEX IF NOT EXISTS idx_fsm_timeouts_fsm_type ON fsm_timeouts(fsm_type);
CREATE INDEX IF NOT EXISTS idx_fsm_timeouts_status ON fsm_timeouts(status);
CREATE INDEX IF NOT EXISTS idx_fsm_timeouts_expires_at ON fsm_timeouts(expires_at);

CREATE INDEX IF NOT EXISTS idx_fsm_action_log_order_id ON fsm_action_log(order_id);
CREATE INDEX IF NOT EXISTS idx_fsm_action_log_fsm_type ON fsm_action_log(fsm_type);
CREATE INDEX IF NOT EXISTS idx_fsm_action_log_event ON fsm_action_log(event);
CREATE INDEX IF NOT EXISTS idx_fsm_action_log_actor ON fsm_action_log(actor);
CREATE INDEX IF NOT EXISTS idx_fsm_action_log_timestamp ON fsm_action_log(transition_timestamp);
CREATE INDEX IF NOT EXISTS idx_fsm_action_log_correlation_id ON fsm_action_log(correlation_id);
CREATE INDEX IF NOT EXISTS idx_fsm_action_log_metadata_gin ON fsm_action_log USING GIN (metadata);

CREATE INDEX IF NOT EXISTS idx_fsm_state_snapshots_order_id ON fsm_state_snapshots(order_id);
CREATE INDEX IF NOT EXISTS idx_fsm_state_snapshots_timestamp ON fsm_state_snapshots(snapshot_timestamp);

-- Add foreign key constraints
ALTER TABLE dead_letter_queue ADD CONSTRAINT fk_dead_letter_event_id
  FOREIGN KEY (event_id) REFERENCES domain_events(event_id) ON DELETE CASCADE;

-- Add constraints and triggers for data integrity

-- Ensure FSM types are valid
ALTER TABLE fsm_timeouts ADD CONSTRAINT check_fsm_type
  CHECK (fsm_type IN ('vendor', 'payment', 'delivery'));

ALTER TABLE fsm_action_log ADD CONSTRAINT check_fsm_type
  CHECK (fsm_type IN ('vendor', 'payment', 'delivery', 'system'));

-- Ensure timeout status is valid
ALTER TABLE fsm_timeouts ADD CONSTRAINT check_timeout_status
  CHECK (status IN ('scheduled', 'processing', 'completed', 'cancelled', 'failed'));

-- Ensure delivery status is valid
ALTER TABLE domain_events ADD CONSTRAINT check_delivery_status
  CHECK (delivery_status IN ('pending', 'delivered', 'dead_letter'));

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_domain_events_updated_at
    BEFORE UPDATE ON domain_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fsm_timeouts_updated_at
    BEFORE UPDATE ON fsm_timeouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE domain_events IS 'Centralized storage for all domain events in the FSM system';
COMMENT ON TABLE dead_letter_queue IS 'Failed event deliveries for manual inspection and retry';
COMMENT ON TABLE fsm_timeouts IS 'Scheduled timeouts for FSM state transitions';
COMMENT ON TABLE fsm_action_log IS 'Complete audit trail of all FSM transitions and events';
COMMENT ON TABLE fsm_state_snapshots IS 'Periodic snapshots of FSM states for debugging and recovery';
