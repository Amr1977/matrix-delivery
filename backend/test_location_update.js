const fetch = require('node-fetch');
const { Pool } = require('pg');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testLocationUpdate() {
    const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'matrix_delivery',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    });

    try {
        // 1. Get a driver user
        const driverRes = await pool.query("SELECT id, email FROM users WHERE primary_role = 'driver' LIMIT 1");
        if (driverRes.rows.length === 0) {
            console.error('❌ No driver found in database');
            process.exit(1);
        }
        const driver = driverRes.rows[0];
        console.log(`👤 Found driver: ${driver.email} (${driver.id})`);

        // 2. Login to get token
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: driver.email, password: 'password123' }) // Assuming default password
        });

        if (!loginRes.ok) {
            // Try to create a token manually if login fails (password might be different)
            console.log('⚠️ Login failed, trying to generate token manually (skipping for now, assuming login works or we need to fix login)');
            // For now, let's assume we can't easily generate a token without a secret key sharing.
            // Let's try to update the password to a known one temporarily? No, that's risky.
            // Let's just hope the password is 'password123' or similar.
            // If not, we can't easily test via API without a valid token.
            // Actually, we can use the verifyToken bypass if in test mode, but we are in dev/prod.

            // Alternative: Use the database to insert a token? No.
            console.error('❌ Login failed:', await loginRes.text());
            process.exit(1);
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('🔑 Got auth token');

        // 3. Update location
        const locationData = { latitude: 30.0444, longitude: 31.2357 }; // Cairo coordinates
        console.log('📍 Sending location update:', locationData);

        const updateRes = await fetch(`${API_URL}/drivers/location`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(locationData)
        });

        if (updateRes.ok) {
            const data = await updateRes.json();
            console.log('✅ Location update successful:', data);
        } else {
            const errorText = await updateRes.text();
            console.error('❌ Location update failed:', updateRes.status, errorText);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await pool.end();
    }
}

testLocationUpdate();
