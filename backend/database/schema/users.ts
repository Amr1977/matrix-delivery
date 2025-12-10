import { TableSchema } from '../types';

/**
 * Users table schema
 * Stores all user accounts (customers, drivers, admins, vendors)
 */
export const usersSchema: TableSchema = {
  name: 'users',

  createStatement: `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      primary_role VARCHAR(50) NOT NULL CHECK (primary_role IN ('customer', 'driver', 'admin', 'vendor')),
      granted_roles TEXT[],
      vehicle_type VARCHAR(100),
      rating DECIMAL(3,2) DEFAULT 5.00,
      completed_deliveries INTEGER DEFAULT 0,
      is_available BOOLEAN DEFAULT true,
      is_verified BOOLEAN DEFAULT false,
      verified_at TIMESTAMP,
      country VARCHAR(100),
      city VARCHAR(100),
      area VARCHAR(100),
      profile_picture_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

  indexes: [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_primary_role ON users(primary_role)',
    'CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified)',
    'CREATE INDEX IF NOT EXISTS idx_users_is_available ON users(is_available)',
    'CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC)'
  ],

  alterStatements: [
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS granted_roles TEXT[]',
    'UPDATE users SET granted_roles = ARRAY[primary_role] WHERE granted_roles IS NULL',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS service_area_zone VARCHAR(255)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_methods JSONB',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(20)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS document_verification_status VARCHAR(50)',
    'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP',
    'CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC)'
  ]
};
