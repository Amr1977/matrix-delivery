const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = { connectionString: process.env.DATABASE_URL };
const pool = new Pool(poolConfig);

async function verify() {
    try {
        console.log('🔍 Verifying driver_locations schema...');

        // Check for duplicates
        const duplicates = await pool.query(`
      SELECT driver_id, COUNT(*) 
      FROM driver_locations 
      GROUP BY driver_id 
      HAVING COUNT(*) > 1
    `);

        if (duplicates.rows.length > 0) {
            console.error('❌ Found duplicates in driver_locations:', duplicates.rows);
        } else {
            console.log('✅ No duplicates found in driver_locations');
        }

        // Check for unique constraint
        const constraint = await pool.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conrelid = 'driver_locations'::regclass 
      AND contype = 'u'
    `);

        const hasConstraint = constraint.rows.some(r => r.conname === 'driver_locations_driver_id_key');

        if (hasConstraint) {
            console.log('✅ Unique constraint driver_locations_driver_id_key exists');
        } else {
            console.error('❌ Unique constraint driver_locations_driver_id_key MISSING');
            console.log('Existing constraints:', constraint.rows.map(r => r.conname));
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verify();
