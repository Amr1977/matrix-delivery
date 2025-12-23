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
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        content TEXT,
        professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
        communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
        timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
        package_condition_rating INTEGER CHECK (package_condition_rating >= 1 AND package_condition_rating <= 5),
        upvotes INTEGER DEFAULT 0,
        flag_count INTEGER DEFAULT 0,
        is_approved BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        github_issue_link VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_reviews_upvotes ON reviews(upvotes DESC)',
    'CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved)',
    'CREATE INDEX IF NOT EXISTS idx_reviews_flag_count ON reviews(flag_count)'
  ],

  alterStatements: [
    // Ensure columns exist if table already exists (redundant for fresh init but good for safety)
    'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0',
    'ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0'
  ]
};

export const reviewVotesSchema: TableSchema = {
  name: 'review_votes',
  createStatement: `
    CREATE TABLE IF NOT EXISTS review_votes (
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (review_id, user_id)
    )
    `,
  indexes: []
};

export const reviewFlagsSchema: TableSchema = {
  name: 'review_flags',
  createStatement: `
    CREATE TABLE IF NOT EXISTS review_flags (
        review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (review_id, user_id)
    )
    `,
  indexes: []
};
