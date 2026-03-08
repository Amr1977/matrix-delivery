-- Create marketplace orders tables
-- Migration: 017_create_marketplace_orders_tables.sql

-- Marketplace orders table
CREATE TABLE marketplace_orders (
  id SERIAL PRIMARY KEY,
  order_type VARCHAR(50) NOT NULL DEFAULT 'marketplace', -- 'delivery' or 'marketplace'
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cart_id INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  -- Order details
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  delivery_fee DECIMAL(10,2) DEFAULT 0,

  -- Delivery information
  delivery_address TEXT,
  delivery_lat DECIMAL(10,8),
  delivery_lng DECIMAL(11,8),
  delivery_instructions TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP,
  prepared_at TIMESTAMP,
  picked_up_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,

  -- Vendor commission (10% default)
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  commission_amount DECIMAL(10,2),

  -- Notes
  customer_notes TEXT,
  vendor_notes TEXT,
  cancellation_reason TEXT
);

-- Index for faster lookups
CREATE INDEX idx_marketplace_orders_user_id ON marketplace_orders(user_id);
CREATE INDEX idx_marketplace_orders_store_id ON marketplace_orders(store_id);
CREATE INDEX idx_marketplace_orders_vendor_id ON marketplace_orders(vendor_id);
CREATE INDEX idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX idx_marketplace_orders_order_number ON marketplace_orders(order_number);
CREATE INDEX idx_marketplace_orders_created_at ON marketplace_orders(created_at);

-- Marketplace order items table
CREATE TABLE marketplace_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,

  -- Item details at time of order
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_marketplace_order_items_order_id ON marketplace_order_items(order_id);
CREATE INDEX idx_marketplace_order_items_item_id ON marketplace_order_items(item_id);

-- Vendor payouts table
CREATE TABLE vendor_payouts (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  order_id INTEGER REFERENCES marketplace_orders(id) ON DELETE SET NULL,

  -- Payout details
  amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,

  -- Payment status
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  paid_at TIMESTAMP,
  failed_at TIMESTAMP,

  -- Failure details
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Index for faster lookups
CREATE INDEX idx_vendor_payouts_vendor_id ON vendor_payouts(vendor_id);
CREATE INDEX idx_vendor_payouts_order_id ON vendor_payouts(order_id);
CREATE INDEX idx_vendor_payouts_status ON vendor_payouts(status);

-- Marketplace audit logs table
CREATE TABLE marketplace_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL,
  order_id INTEGER REFERENCES marketplace_orders(id) ON DELETE SET NULL,

  -- Audit details
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_marketplace_audit_logs_user_id ON marketplace_audit_logs(user_id);
CREATE INDEX idx_marketplace_audit_logs_vendor_id ON marketplace_audit_logs(vendor_id);
CREATE INDEX idx_marketplace_audit_logs_order_id ON marketplace_audit_logs(order_id);
CREATE INDEX idx_marketplace_audit_logs_action ON marketplace_audit_logs(action);
CREATE INDEX idx_marketplace_audit_logs_created_at ON marketplace_audit_logs(created_at);

-- Function to update order updated_at when items change
CREATE OR REPLACE FUNCTION update_marketplace_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_orders
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = (
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.order_id
      ELSE NEW.order_id
    END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update order timestamp when items are added
CREATE TRIGGER trigger_update_marketplace_order_updated_at
  AFTER INSERT OR UPDATE OR DELETE ON marketplace_order_items
  FOR EACH ROW EXECUTE FUNCTION update_marketplace_order_updated_at();
