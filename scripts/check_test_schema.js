require('dotenv').config({ path: '.env.testing' });
const pool = require('../backend/config/db');

pool.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'orders' 
  AND column_name IN ('from_coordinates', 'to_coordinates', 'pickup_coordinates', 'delivery_coordinates')
  ORDER BY column_name
`).then(result => {
    console.log('\n📊 TEST DB - coordinate columns present:\n');

    if (result.rows.length === 0) {
        console.log('❌ NO coordinate columns found!');
    } else {
        result.rows.forEach(row => {
            console.log(`✓ ${row.column_name}`);
        });
    }

    const expectedColumns = ['delivery_coordinates', 'from_coordinates', 'pickup_coordinates', 'to_coordinates'];
    const foundColumns = result.rows.map(r => r.column_name);
    const missingColumns = expectedColumns.filter(col => !foundColumns.includes(col));

    if (missingColumns.length > 0) {
        console.log('\n❌ MISSING columns in test DB:');
        missingColumns.forEach(col => console.log(`   - ${col}`));
        console.log('\n💡 These need to be added to test_schema.sql and test DB!');
    } else {
        console.log('\n✅ All coordinate columns present!');
    }

    console.log('\n');
    pool.end();
}).catch(error => {
    console.error('❌ Error:', error.message);
    pool.end();
    process.exit(1);
});
