require('dotenv').config({ path: '.env.development' });
const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL 
  });
  
  try {
    const result = await pool.query(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY table_name',
      ['public']
    );
    
    console.log('Tables in public schema:');
    result.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check for marketplace tables
    const marketplaceTables = ['vendors', 'stores', 'categories', 'items', 'offers'];
    console.log('\nMarketplace tables status:');
    
    for (const table of marketplaceTables) {
      const exists = result.rows.some(row => row.table_name === table);
      console.log(`${table}: ${exists ? 'EXISTS' : 'MISSING'}`);
    }
    
  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    await pool.end();
  }
}

checkTables();