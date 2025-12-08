import { TableSchema } from '../types';

/**
 * Vendors table schema
 * Stores vendor/merchant information
 */
export const vendorsSchema: TableSchema = {
    name: 'vendors',

    createStatement: `
    CREATE TABLE IF NOT EXISTS vendors (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      phone VARCHAR(50),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      latitude DECIMAL(10,8),
      longitude DECIMAL(11,8),
      rating DECIMAL(3,2) DEFAULT 0.00,
      opening_hours JSONB,
      logo_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city)',
        'CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating)',
        'CREATE INDEX IF NOT EXISTS idx_vendors_coords ON vendors(latitude, longitude)'
    ],

    alterStatements: [
        'ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL',
        'CREATE INDEX IF NOT EXISTS idx_vendors_owner ON vendors(owner_user_id)'
    ]
};

/**
 * Vendor categories table schema
 * Stores categories for vendors
 */
export const vendorCategoriesSchema: TableSchema = {
    name: 'vendor_categories',

    createStatement: `
    CREATE TABLE IF NOT EXISTS vendor_categories (
      id SERIAL PRIMARY KEY,
      vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL
    )
  `,

    indexes: []
};

/**
 * Vendor items table schema
 * Stores items/products offered by vendors
 */
export const vendorItemsSchema: TableSchema = {
    name: 'vendor_items',

    createStatement: `
    CREATE TABLE IF NOT EXISTS vendor_items (
      id VARCHAR(255) PRIMARY KEY,
      vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
      item_name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      image_url TEXT,
      category VARCHAR(100),
      stock_qty INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON vendor_items(vendor_id)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_items_category ON vendor_items(category)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_items_price ON vendor_items(price)',
        'CREATE INDEX IF NOT EXISTS idx_vendor_items_created ON vendor_items(created_at)'
    ]
};
