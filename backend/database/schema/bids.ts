import { TableSchema } from '../types';

/**
 * Bids table schema
 * Stores driver bids on delivery orders
 */
export const bidsSchema: TableSchema = {
  name: 'bids',

  createStatement: `
    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id),
      driver_name VARCHAR(255) NOT NULL,
      bid_price DECIMAL(10,2) NOT NULL,
      estimated_pickup_time TIMESTAMP,
      estimated_delivery_time TIMESTAMP,
      message TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      driver_location_lat DECIMAL(10,8),
      driver_location_lng DECIMAL(11,8),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(order_id, user_id)
    )
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_bids_order_id ON bids(order_id)',
    'CREATE INDEX IF NOT EXISTS idx_bids_user_id ON bids(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status)',
    'CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at DESC)'
  ]
};



