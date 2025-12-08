import { TableSchema } from '../types';

/**
 * Messages table schema
 * Stores in-app messages between users for orders
 */
export const messagesSchema: TableSchema = {
    name: 'messages',

    createStatement: `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      sender_id VARCHAR(255) NOT NULL REFERENCES users(id),
      receiver_id VARCHAR(255) NOT NULL REFERENCES users(id),
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read)',
        'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC)'
    ]
};

/**
 * Location updates table schema
 * Stores real-time location updates during delivery
 */
export const locationUpdatesSchema: TableSchema = {
    name: 'location_updates',

    createStatement: `
    CREATE TABLE IF NOT EXISTS location_updates (
      id SERIAL PRIMARY KEY,
      order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      driver_id VARCHAR(255) NOT NULL REFERENCES users(id),
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      status VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_location_updates_order_id ON location_updates(order_id)',
        'CREATE INDEX IF NOT EXISTS idx_location_updates_driver_id ON location_updates(driver_id)',
        'CREATE INDEX IF NOT EXISTS idx_location_updates_created_at ON location_updates(created_at DESC)'
    ]
};

/**
 * Driver locations table schema
 * Stores current location of drivers for real-time tracking
 */
export const driverLocationsSchema: TableSchema = {
    name: 'driver_locations',

    createStatement: `
    CREATE TABLE IF NOT EXISTS driver_locations (
      id SERIAL PRIMARY KEY,
      driver_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(driver_id)
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id)',
        'CREATE INDEX IF NOT EXISTS idx_driver_locations_last_updated ON driver_locations(last_updated DESC)'
    ],

    alterStatements: [
        'ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey',
        'ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE',
        'ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS heading DECIMAL(5,2)',
        'ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS speed_kmh DECIMAL(5,2)',
        'ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS accuracy_meters DECIMAL(8,2)',
        'ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS context VARCHAR(50) DEFAULT \'idle\'',
        'CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON driver_locations(order_id)'
    ]
};
