const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: '***REDACTED***',
  database: 'matrix_delivery'
});

async function migrate() {
  try {
    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      )
    `);
    console.log('✅ notifications table created');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`);
    console.log('✅ notifications indexes created');

    // Create fcm_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'driver', 'admin')),
        token VARCHAR(512) NOT NULL UNIQUE,
        device_info VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ fcm_tokens table created');

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token)`);
    console.log('✅ fcm_tokens indexes created');

    console.log('✅ All migration complete!');
  } catch (e) {
    console.log('Error:', e.message);
  } finally {
    await pool.end();
  }
}

migrate();
