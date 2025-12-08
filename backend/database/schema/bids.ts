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

/**
 * Reviews table schema
 * Stores mutual ratings between customers and drivers
 */
export const reviewsSchema: TableSchema = {
    name: 'reviews',

    createStatement: `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      reviewer_id VARCHAR(255) NOT NULL REFERENCES users(id),
      reviewee_id VARCHAR(255) REFERENCES users(id),
      reviewer_role VARCHAR(50) NOT NULL,
      review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('customer_to_driver', 'driver_to_customer', 'customer_to_platform', 'driver_to_platform')),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
      communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
      timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
      condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(order_id, reviewer_id, review_type)
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON reviews(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id)',
        'CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC)'
    ]
};
