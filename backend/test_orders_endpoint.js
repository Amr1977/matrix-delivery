const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testOrdersEndpoint() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'matrix_delivery',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        // 1. Login with provided credentials
        console.log('🔑 Logging in as user@driver.com...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'user@driver.com', password: 'besmillah' })
        });

        if (!loginRes.ok) {
            console.error('❌ Login failed:', await loginRes.text());
            process.exit(1);
        }
        const { token } = await loginRes.json();
        console.log('✅ Login successful');

        const orders = await ordersRes.json();
        console.log(`📦 Received ${orders.length} orders`);

        if (orders.length > 0) {
            console.log('⚠️ Orders returned despite being far away:');
            orders.forEach(o => console.log(`  - ${o.title} (Pickup: ${o.from?.lat}, ${o.from?.lng})`));
        } else {
            console.log('✅ No orders returned (Correctly filtered)');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testOrdersEndpoint();
