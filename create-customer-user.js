const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '***REDACTED***'
});

async function createCustomerUser() {
  try {
    console.log('Creating user user@delivery.com with password ***REDACTED***');

    const hashedPassword = await bcrypt.hash('***REDACTED***', 10);
    const userId = Date.now().toString();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password, phone, role, vehicle_type, country, city, area, rating, completed_deliveries, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        userId,
        'Test Customer',
        'user@delivery.com',
        hashedPassword,
        '+20123456789',
        'customer',
        null,
        'Egypt',
        'Cairo',
        'Zamalek',
        5.0,
        0,
        true // verified
      ]
    );

    console.log('User created successfully:', userId);
  } catch (err) {
    console.error('Error creating user:', err);
  } finally {
    await pool.end();
  }
}

createCustomerUser();
