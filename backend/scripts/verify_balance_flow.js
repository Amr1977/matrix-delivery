const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../config/db');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const API_URL = 'http://localhost:5000/api/v1';

async function main() {
    try {
        console.log('🚀 Starting Verification Flow...');

        // 1. Create Test Users
        const driverEmail = `driver_${Date.now()}@test.com`;
        const customerEmail = `customer_${Date.now()}@test.com`;
        const password = 'password123';
        const hashedPassword = await bcrypt.hash(password, 10);

        console.log(`Creating Driver: ${driverEmail}`);
        const driverRes = await pool.query(`
            INSERT INTO users (id, email, password_hash, name, phone, primary_role, is_verified, country, city)
            VALUES ($1, $2, $3, 'Test Driver', $4, 'driver', true, 'Egypt', 'Cairo')
            RETURNING id
        `, [crypto.randomUUID(), driverEmail, hashedPassword, `+201${Date.now().toString().slice(-9)}`]);
        const driverId = driverRes.rows[0].id;

        console.log(`Creating Customer: ${customerEmail}`);
        const customerRes = await pool.query(`
            INSERT INTO users (id, email, password_hash, name, phone, primary_role, is_verified, country, city)
            VALUES ($1, $2, $3, 'Test Customer', $4, 'customer', true, 'Egypt', 'Cairo')
            RETURNING id
        `, [crypto.randomUUID(), customerEmail, hashedPassword, `+201${(Date.now() + 1).toString().slice(-9)}`]);
        const customerId = customerRes.rows[0].id;

        // 2. Login to get Tokens/Cookies
        // Note: Backend uses httpOnly cookies. Axios needs to manage cookie jar if running in node.
        // Or we can manually extract 'set-cookie' header.

        // Login Driver
        console.log('Logging in Driver...');
        const driverLogin = await axios.post(`${API_URL}/auth/login`, {
            email: driverEmail,
            password: password
        });
        const driverCookie = driverLogin.headers['set-cookie'];
        console.log('Driver logged in.');

        // Login Customer
        console.log('Logging in Customer...');
        const customerLogin = await axios.post(`${API_URL}/auth/login`, {
            email: customerEmail,
            password: password
        });
        const customerCookie = customerLogin.headers['set-cookie'];
        console.log('Customer logged in.');

        // 3. Customer Creates Order
        console.log('Creating Order...');
        const orderData = {
            title: 'Test Order for Balance',
            price: 100,
            pickupAddress: { country: 'Egypt', city: 'Cairo', personName: 'Ali' },
            dropoffAddress: { country: 'Egypt', city: 'Giza', personName: 'Omar' }
        };
        const orderRes = await axios.post(`${API_URL}/orders`, orderData, {
            headers: { Cookie: customerCookie }
        });
        const orderId = orderRes.data.order.id;
        console.log(`Order Created: ${orderId}`);

        // 4. Driver Places Bid
        console.log('Driver Placing Bid...');
        await axios.post(`${API_URL}/orders/${orderId}/bid`, {
            bidPrice: 100,
            estimatedPickupTime: new Date(),
            estimatedDeliveryTime: new Date()
        }, {
            headers: { Cookie: driverCookie }
        });

        // 5. Customer Accepts Bid
        console.log('Customer Accepting Bid...');
        // Note: Frontend calls acceptBid on order, referencing driverId.
        // API endpoint likely: POST /orders/:id/accept { userId: driverId }
        await axios.post(`${API_URL}/orders/${orderId}/accept`, {
            userId: driverId
        }, {
            headers: { Cookie: customerCookie }
        });
        console.log('Bid Accepted. Order Status: accepted');

        // 6. Driver Flow
        console.log('Driver Picking Up...');
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'picked_up' }, { headers: { Cookie: driverCookie } });

        console.log('Driver In Transit...');
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'in_transit' }, { headers: { Cookie: driverCookie } });

        console.log('Driver Completing (Delivered)...');
        // This should set status to 'delivered_pending' per our new logic? 
        // Or 'delivered' if we haven't changed status flow yet?
        // In orderService.js:
        // complete: { from: ..., to: 'delivered_pending' }
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'complete' }, { headers: { Cookie: driverCookie } });

        // Verify Status
        const orderCheck1 = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
        console.log(`Order Status after Driver Complete: ${orderCheck1.rows[0].status}`);
        if (orderCheck1.rows[0].status !== 'delivered_pending') {
            console.error('❌ Status mismatched! Expected delivered_pending');
        } else {
            console.log('✅ Status is delivered_pending');
        }

        // 7. Customer Confirm
        console.log('Customer Confirming Delivery...');
        await axios.patch(`${API_URL}/orders/${orderId}/status`, { status: 'confirm_delivery' }, { headers: { Cookie: customerCookie } });

        const orderCheck2 = await pool.query('SELECT status FROM orders WHERE id = $1', [orderId]);
        console.log(`Order Status after Confirm: ${orderCheck2.rows[0].status}`);
        if (orderCheck2.rows[0].status !== 'delivered') {
            console.error('❌ Status mismatched! Expected delivered');
        } else {
            console.log('✅ Status is delivered');
        }

        // 8. Check Balance
        // Commission is 15% of 100 = 15.
        // Driver start balance 0.
        // Balance should be -15.
        const balanceRes = await pool.query('SELECT available_balance FROM user_balances WHERE user_id = $1', [driverId]);
        const balance = parseFloat(balanceRes.rows[0]?.available_balance || 0);
        console.log(`Driver Balance: ${balance}`);

        if (balance === -15) {
            console.log('✅ Commission deducted correctly.');
        } else {
            console.error(`❌ Unexpected balance: ${balance}. Expected -15.`);
        }

        // 9. Check Blocking Logic
        console.log('Testing Blocking Logic...');
        // Set balance to -201 (Threshold is -200)
        await pool.query('UPDATE user_balances SET available_balance = -201 WHERE user_id = $1', [driverId]);

        // Create another order
        const order2Data = {
            title: 'Test Order 2',
            price: 50,
            pickupAddress: { country: 'Egypt', city: 'Cairo', personName: 'Ali' },
            dropoffAddress: { country: 'Egypt', city: 'Giza', personName: 'Omar' }
        };
        const order2Res = await axios.post(`${API_URL}/orders`, order2Data, {
            headers: { Cookie: customerCookie }
        });
        const order2Id = order2Res.data.order.id;

        // Try to place/accept bid
        console.log('Driver attempting to place bid with -201 balance...');
        // Note: Does placeBid check debt? 
        // canAcceptOrders is called in acceptBid (when customer accepts).
        // Let's place bid (allowed?) -> Accept (should fail).
        await axios.post(`${API_URL}/orders/${order2Id}/bid`, {
            bidPrice: 50,
            estimatedPickupTime: new Date(),
            estimatedDeliveryTime: new Date()
        }, {
            headers: { Cookie: driverCookie }
        });

        console.log('Customer attempting to accept bid...');
        try {
            await axios.post(`${API_URL}/orders/${order2Id}/accept`, {
                userId: driverId
            }, {
                headers: { Cookie: customerCookie }
            });
            console.error('❌ Expected failure but succeeded!');
        } catch (error) {
            console.log(`✅ Accept Bid failed as expected: ${error.response?.data?.error || error.message}`);
            if (error.response?.data?.error?.includes('below minimum threshold')) {
                console.log('✅ Error message confirms debt check.');
            }
        }

        console.log('🎉 Verification Complete!');

    } catch (error) {
        console.error('Test Failed:', error.response?.data || error.message);
    } finally {
        await pool.end();
    }
}

main();
