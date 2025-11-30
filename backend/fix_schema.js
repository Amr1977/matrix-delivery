const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'matrix_delivery',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function fix() {
    try {
        console.log('🔧 Fixing driver_locations schema...');

        // 1. Delete duplicates
        console.log('  - Removing duplicates...');
        await pool.query(`
      DELETE FROM driver_locations a USING driver_locations b
      WHERE a.id < b.id AND a.driver_id = b.driver_id
    `);
        console.log('  ✅ Duplicates removed');

        // 2. Add unique constraint
        console.log('  - Adding unique constraint...');
        await pool.query(`
      ALTER TABLE driver_locations 
      ADD CONSTRAINT driver_locations_driver_id_key UNIQUE (driver_id)
    `).catch(err => {
            if (err.code === '42710') { // duplicate_object (already exists)
                console.log('  ⚠️ Constraint already exists');
            } else {
                throw err;
            }
        });
        console.log('  ✅ Unique constraint added');

        process.exit(0);
    } catch (error) {
        console.error('❌ Fix failed:', error);
        process.exit(1);
    }
}

fix();
