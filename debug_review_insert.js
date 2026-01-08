
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.testing' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'matrix_delivery_test',
});

async function testInsert() {
    const client = await pool.connect();
    try {
        console.log('Connected to DB');

        // 1. Create a dummy user and order to satisfy FKs
        const userId = 'debug_user_' + Date.now();
        const orderId = 'debug_order_' + Date.now();

        // Corrected users insert
        await client.query(`INSERT INTO users (id, name, email, password_hash, primary_role, country, city, area) 
      VALUES ($1, 'Debug User', $2, 'pass_hash', 'customer', 'Egypt', 'Cairo', 'Downtown')`,
            [userId, `debug_${Date.now()}@test.com`]
        );
        console.log('Created dummy user:', userId);

        // Corrected orders insert
        await client.query(`INSERT INTO orders (
      id, customer_id, title, description, pickup_address, delivery_address, 
      from_lat, from_lng, to_lat, to_lng, price, status, order_number
    ) VALUES ($1, $2, 'Debug Order', 'Desc', 'Cairo', 'Alex', 30.0, 31.0, 31.0, 30.0, 100, 'delivered', 'ORD-DEBUG-${Date.now()}')`,
            [orderId, userId]
        );
        console.log('Created dummy order:', orderId);

        // 2. Attempt the exact review Insert
        const reviewId = 'review_' + Date.now();
        const reviewParams = [
            reviewId,      // $1: id
            userId,        // $2: user_id
            orderId,       // $3: order_id
            userId,        // $4: reviewer_id
            null,          // $5: reviewee_id
            'customer',    // $6: reviewer_role
            'customer_to_platform', // $7: review_type
            5,             // $8: rating
            'Debug comment', // $9: comment
            5,             // $10: professionalism_rating
            5,             // $11: communication_rating
            5,             // $12: timeliness_rating
            5              // $13: condition_rating
        ];

        console.log('Attempting INSERT with params:', JSON.stringify(reviewParams));

        const res = await client.query(
            `INSERT INTO reviews (id, user_id, order_id, reviewer_id, reviewee_id, reviewer_role, review_type, rating, comment, professionalism_rating, communication_rating, timeliness_rating, condition_rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
            reviewParams
        );

        console.log('INSERT SUCCESS:', res.rows[0]);

    } catch (err) {
        console.error('INSERT FAILED:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

testInsert();
