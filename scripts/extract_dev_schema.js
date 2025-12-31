require('dotenv').config();
const pool = require('../backend/config/db');

pool.query(`
  SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns 
  WHERE table_name = 'orders' 
  ORDER BY ordinal_position
`).then(result => {
    console.log('\n📊 DEVELOPMENT DB - orders table columns:\n');
    console.log('Column Name'.padEnd(35), 'Data Type'.padEnd(25), 'Nullable'.padEnd(10), 'Default');
    console.log('='.repeat(100));

    result.rows.forEach(row => {
        console.log(
            row.column_name.padEnd(35),
            row.data_type.padEnd(25),
            row.is_nullable.padEnd(10),
            (row.column_default || '').substring(0, 30)
        );
    });

    console.log('\n\n🔍 Looking for coordinate columns specifically:\n');
    const coordColumns = result.rows.filter(r =>
        r.column_name.includes('coord') ||
        r.column_name.includes('lat') ||
        r.column_name.includes('lng')
    );

    coordColumns.forEach(row => {
        console.log(`✓ ${row.column_name} (${row.data_type})`);
    });

    console.log('\n');
    pool.end();
}).catch(error => {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
});
