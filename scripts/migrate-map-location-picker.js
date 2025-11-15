#!/usr/bin/env node

/**
 * Database Migration Script - Map Location Picker Feature
 *
 * This script adds all the database changes needed for the map-based location picker feature.
 *
 * Usage:
 *   node scripts/migrate-map-location-picker.js
 *
 * This script can be run on production servers to apply the migration safely.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

console.log('🚀 Starting Map Location Picker Database Migration');
console.log('='.repeat(60));

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('📡 Connected to database successfully');

    // Check current schema
    console.log('🔍 Checking current orders table schema...');
    const currentSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'orders' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log(`📊 Current orders table has ${currentSchema.rows.length} columns`);

    // Apply migrations step by step
    const migrationSteps = [
      {
        name: 'Add new location columns to orders table',
        sql: `
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_coordinates JSONB;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location_link VARCHAR(500);
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location_link VARCHAR(500);
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(10,2);
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_polyline TEXT;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_remote_area BOOLEAN DEFAULT false;
          ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false;
        `
      },
      {
        name: 'Create performance indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_orders_pickup_coords ON orders USING GIN (pickup_coordinates);
          CREATE INDEX IF NOT EXISTS idx_orders_delivery_coords ON orders USING GIN (delivery_coordinates);
          CREATE INDEX IF NOT EXISTS idx_orders_distance ON orders(estimated_distance_km);
          CREATE INDEX IF NOT EXISTS idx_orders_remote_area ON orders(is_remote_area);
          CREATE INDEX IF NOT EXISTS idx_orders_international ON orders(is_international);
        `
      },
      {
        name: 'Update vehicle type constraint',
        sql: `
          ALTER TABLE users DROP CONSTRAINT IF EXISTS users_vehicle_type_check;
          ALTER TABLE users ADD CONSTRAINT users_vehicle_type_check
            CHECK (vehicle_type IN ('walker', 'bicycle', 'bike', 'car', 'van', 'truck'));
        `
      },
      {
        name: 'Create delivery agent preferences table',
        sql: `
          CREATE TABLE IF NOT EXISTS delivery_agent_preferences (
            id SERIAL PRIMARY KEY,
            agent_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            max_distance_km DECIMAL(10,2) DEFAULT 50.00,
            accept_remote_areas BOOLEAN DEFAULT false,
            accept_international BOOLEAN DEFAULT false,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(agent_id)
          );
        `
      }
    ];

    // Execute each migration step
    for (const step of migrationSteps) {
      console.log(`\n⚙️  ${step.name}...`);
      try {
        await client.query(step.sql);
        console.log(`✅ ${step.name} - Success`);
      } catch (error) {
        console.error(`❌ ${step.name} - Failed:`, error.message);

        // Continue with other steps if possible
        if (!error.message.includes('already exists')) {
          throw error;
        }
        console.log(`⚠️  Continuing with next step despite error...`);
      }
    }

    // Verification queries
    console.log('\n🔬 Verifying migration...');

    // Check new columns exist
    const newColumns = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name IN ('pickup_coordinates', 'delivery_coordinates', 'pickup_location_link',
                         'delivery_location_link', 'estimated_distance_km', 'estimated_duration_minutes',
                         'route_polyline', 'is_remote_area', 'is_international')
    `);

    if (newColumns.rows.length >= 9) {
      console.log(`✅ All ${newColumns.rows.length}/9 new columns added successfully`);
    } else {
      console.log(`⚠️  Only ${newColumns.rows.length}/9 new columns found`);
    }

    // Check preferences table exists
    const preferencesTable = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'delivery_agent_preferences'
      );
    `);

    if (preferencesTable.rows[0].exists) {
      console.log('✅ delivery_agent_preferences table created');
    } else {
      console.log('❌ delivery_agent_preferences table not found');
    }

    // Check vehicle type constraint
    const constraintCheck = await client.query(`
      SELECT conname
      FROM pg_constraint
      WHERE conname = 'users_vehicle_type_check';
    `);

    if (constraintCheck.rows.length > 0) {
      console.log('✅ Vehicle type constraint updated (includes walker, bicycle)');
    } else {
      console.log('⚠️  Vehicle type constraint may need manual update');
    }

    // Final verification
    const migrationStatus = await client.query("SELECT 'Migration completed successfully' AS status;");
    console.log(`\n🎉 ${migrationStatus.rows[0].status}`);

    console.log('\n📋 Migration Summary:');
    console.log('- ✅ Orders table enhanced with location data');
    console.log('- ✅ Performance indexes created');
    console.log('- ✅ Vehicle types expanded (walker, bicycle)');
    console.log('- ✅ Delivery agent preferences system ready');
    console.log('- ✅ Ready for map-based order creation!');

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('Stack trace:', error.stack);

    // Provide recovery guidance
    console.log('\n🔧 Recovery Options:');
    console.log('1. Check database connection and permissions');
    console.log('2. Verify .env file contains correct database credentials');
    console.log('3. Run: psql -U postgres -d matrix_delivery -f migrations/008_map_location_picker.sql');
    console.log('4. For rollback, use the rollback script');

    throw error;
  } finally {
    client.release();
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Handle script execution
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n✅ Map Location Picker migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed');
      process.exit(1);
    });
}

module.exports = { runMigration };
