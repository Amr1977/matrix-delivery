const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const app = require('../backend/server');

// Mock environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME_TEST = 'matrix_delivery_test';
process.env.DB_CONNECTION_TIMEOUT = '10000'; // Increase timeout for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME_TEST,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const testUser = {
    id: 'history-test-user-id',
    email: 'history-test@example.com',
    name: 'History Test User',
    role: 'customer'
};

const testUserToken = jwt.sign({ userId: testUser.id, role: testUser.role, name: testUser.name }, process.env.JWT_SECRET);

describe('Customer Order History API Tests', () => {
    let createdOrderIds = [];

    beforeAll(async () => {
        // Create tables manually since we disabled auto-init in server.js for tests
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            phone VARCHAR(50),
            role VARCHAR(50) NOT NULL,
            rating DECIMAL(3,2) DEFAULT 5.00,
            completed_deliveries INTEGER DEFAULT 0,
            is_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
    
          CREATE TABLE IF NOT EXISTS orders (
            id VARCHAR(255) PRIMARY KEY,
            order_number VARCHAR(50) UNIQUE NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            pickup_address TEXT NOT NULL,
            delivery_address TEXT NOT NULL,
            from_lat DECIMAL(10,8) NOT NULL,
            from_lng DECIMAL(11,8) NOT NULL,
            from_name VARCHAR(255) NOT NULL,
            to_lat DECIMAL(10,8) NOT NULL,
            to_lng DECIMAL(11,8) NOT NULL,
            to_name VARCHAR(255) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) NOT NULL,
            customer_id VARCHAR(255) NOT NULL REFERENCES users(id),
            customer_name VARCHAR(255) NOT NULL,
            assigned_driver_user_id VARCHAR(255),
            assigned_driver_name VARCHAR(255),
            assigned_driver_bid_price DECIMAL(10,2),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            delivered_at TIMESTAMP,
            cancelled_at TIMESTAMP,
            pickup_coordinates JSONB,
            delivery_coordinates JSONB,
            pickup_location_link TEXT,
            delivery_location_link TEXT,
            estimated_distance_km DECIMAL(10,2),
            estimated_duration_minutes INTEGER,
            route_polyline TEXT,
            is_remote_area BOOLEAN DEFAULT false,
            is_international BOOLEAN DEFAULT false
          );
    
          CREATE TABLE IF NOT EXISTS bids (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            user_id VARCHAR(255) NOT NULL REFERENCES users(id),
            driver_name VARCHAR(255) NOT NULL,
            bid_price DECIMAL(10,2) NOT NULL,
            estimated_pickup_time TIMESTAMP,
            estimated_delivery_time TIMESTAMP,
            message TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(order_id, user_id)
          );
        `);

        // Clean up any existing test data
        // Use try-catch for cleanup in case tables didn't exist before
        try {
            await pool.query('DELETE FROM bids');
            await pool.query('DELETE FROM orders WHERE customer_id = $1', [testUser.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        } catch (e) {
            console.log('Cleanup warning:', e.message);
        }

        // Create test user
        await pool.query(`
          INSERT INTO users (id, email, name, role, password, phone)
          VALUES ($1, $2, $3, $4, 'hash', '1234567890')
          ON CONFLICT (id) DO NOTHING
        `, [testUser.id, testUser.email, testUser.name, testUser.role]);
    });

    afterAll(async () => {
        // Cleanup
        try {
            await pool.query('DELETE FROM orders WHERE customer_id = $1', [testUser.id]);
            await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
        } catch (e) {
            console.log('AfterAll cleanup warning:', e.message);
        }
        await pool.end();
    });

    test('should create orders with different statuses', async () => {
        const statuses = ['pending_bids', 'delivered', 'delivered', 'cancelled', 'active'];

        for (let i = 0; i < statuses.length; i++) {
            const status = statuses[i];
            const orderNumber = `ORD-HIST-${Date.now()}-${i}`;

            const result = await pool.query(`
        INSERT INTO orders (
          id, order_number, title, description, 
          pickup_address, delivery_address,
          from_lat, from_lng, from_name, 
          to_lat, to_lng, to_name,
          price, status, customer_id, customer_name,
          created_at, delivered_at, cancelled_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
          NOW() - INTERVAL '${i} days', 
          ${status === 'delivered' ? "NOW() - INTERVAL '" + i + " days'" : 'NULL'},
          ${status === 'cancelled' ? "NOW() - INTERVAL '" + i + " days'" : 'NULL'}
        ) RETURNING id
      `, [
                `order-${i}`, orderNumber, `Order ${i} - ${status}`, 'Test description',
                'Pickup Addr', 'Delivery Addr',
                30.0, 31.0, 'Pickup',
                30.1, 31.1, 'Delivery',
                100.00, status === 'active' ? 'accepted' : status, testUser.id, testUser.name
            ]);

            createdOrderIds.push(result.rows[0].id);
        }
    });

    test('GET /api/orders/history should return only delivered and cancelled orders', async () => {
        const response = await request(app)
            .get('/api/orders/history')
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(response.body.orders).toBeDefined();
        expect(response.body.orders.length).toBe(3); // 2 delivered + 1 cancelled

        response.body.orders.forEach(order => {
            expect(['delivered', 'cancelled']).toContain(order.status);
        });

        expect(response.body.pagination).toBeDefined();
        expect(response.body.pagination.total).toBe(3);
    });

    test('GET /api/orders/history should support pagination', async () => {
        // Fetch page 1 with limit 2
        const response1 = await request(app)
            .get('/api/orders/history?page=1&limit=2')
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(response1.body.orders.length).toBe(2);
        expect(response1.body.pagination.hasMore).toBe(true);

        // Fetch page 2 with limit 2
        const response2 = await request(app)
            .get('/api/orders/history?page=2&limit=2')
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        expect(response2.body.orders.length).toBe(1);
        expect(response2.body.pagination.hasMore).toBe(false);
    });

    test('GET /api/orders should NOT return delivered or cancelled orders for customer', async () => {
        const response = await request(app)
            .get('/api/orders')
            .set('Authorization', `Bearer ${testUserToken}`)
            .expect(200);

        // Should return pending_bids and active (accepted) orders
        expect(response.body.length).toBe(2);

        response.body.forEach(order => {
            expect(order.status).not.toBe('delivered');
            expect(order.status).not.toBe('cancelled');
        });
    });
});
