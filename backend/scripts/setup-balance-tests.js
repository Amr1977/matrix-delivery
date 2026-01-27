/**
 * Simple test setup - applies complete standalone schema
 */

const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

async function setup() {
    const poolConfig = { connectionString: process.env.DATABASE_URL };

    const pool = new Pool(poolConfig);

    try {
        console.log('🚀 Setting up test environment...\n');

        // Apply complete test schema
        console.log('1️⃣  Creating complete test schema...');
        const schema = fs.readFileSync('./migrations/test_schema.sql', 'utf8');
        await pool.query(schema);
        console.log('✅ Test schema created\n');

        // Verify
        console.log('2️⃣  Verifying setup...');
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

        console.log(`   Found ${result.rows.length} tables:`);
        result.rows.forEach(row => console.log(`   ✅ ${row.table_name}`));

        await pool.end();
        console.log('\n🎉 Setup complete! Ready to run tests.\n');
        return true;
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        await pool.end();
        return false;
    }
}

setup().then(success => process.exit(success ? 0 : 1));
