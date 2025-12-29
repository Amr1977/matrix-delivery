const { Pool } = require('pg');
require('dotenv').config({ path: '.env.testing' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_TEST
});

async function checkSchema() {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);

        console.log('\n📋 Users table schema:');
        console.log('=====================');
        result.rows.forEach(row => {
            console.log(`  ${row.column_name}: ${row.data_type}`);
        });
        console.log('=====================\n');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
