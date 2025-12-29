import { TableSchema } from '../types';

/**
 * Orders table schema
 * Stores delivery orders with pickup/delivery locations and status tracking
 */
export const ordersSchema: TableSchema = {
  name: 'orders',

  createStatement: `
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(255) PRIMARY KEY,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      pickup_address TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      from_lat DECIMAL(10,8) NOT NULL,
      from_lng DECIMAL(11,8) NOT NULL,
      from_name VARCHAR(255) NOT NULL,
      to_lat DECIMAL(10,8) NOT NULL,
      to_lng DECIMAL(11,8) NOT NULL,
      to_name VARCHAR(255) NOT NULL,
      package_description TEXT,
      package_weight DECIMAL(10,2),
      estimated_value DECIMAL(10,2),
      special_instructions TEXT,
      price DECIMAL(10,2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending_bids' CHECK (status IN ('pending_bids', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
      customer_id VARCHAR(255) NOT NULL REFERENCES users(id),
      customer_name VARCHAR(255) NOT NULL,
      assigned_driver_user_id VARCHAR(255),
      assigned_driver_name VARCHAR(255),
      assigned_driver_bid_price DECIMAL(10,2),
      estimated_delivery_date TIMESTAMP,
      pickup_time TIMESTAMP,
      delivery_time TIMESTAMP,
      current_location_lat DECIMAL(10,8),
      current_location_lng DECIMAL(11,8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP,
      picked_up_at TIMESTAMP,
      delivered_at TIMESTAMP,
      completed_at TIMESTAMP,
      cancelled_at TIMESTAMP 
    )
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_assigned_driver_user_id ON orders(assigned_driver_user_id)',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_orders_completed_at ON orders(completed_at DESC)',
    'CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number)'
  ],

  alterStatements: [
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_coordinates JSONB',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location_link TEXT',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location_link TEXT',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(10,2)',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_polyline TEXT',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_remote_area BOOLEAN DEFAULT false',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP',
    'ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP'
  ]
};
