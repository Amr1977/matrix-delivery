const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:***REDACTED***@ep-shy-tooth-ab6w37t9-pooler.eu-west-2.aws.neon.tech/matrix_delivery_production?sslmode=verify-full&channel_binding=require'
});

async function check() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Check for order state change notifications
    const result = await client.query(
      "SELECT id, user_id, type, title, message, created_at FROM notifications WHERE type LIKE 'order_%' OR type LIKE 'bid_%' ORDER BY created_at DESC LIMIT 20"
    );
    console.log('Order/Bid notifications:', JSON.stringify(result.rows, null, 2));
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

check();
