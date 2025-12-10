const request = require('supertest');
const pool = require('../config/db');

describe('Admin Notification on User Registration', () => {
    let app;
    let adminUserId;
    let testUserEmail;

    beforeAll(async () => {
        // Import app after database is ready
        app = require('../server');

        // Create a test admin user
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('adminpassword123', 10);
        const adminResult = await pool.query(
            `INSERT INTO users (id, name, email, password, phone, primary_role, granted_roles, country, city, area)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
            [
                'test-admin-' + Date.now(),
                'Test Admin',
                'testadmin' + Date.now() + '@example.com',
                hashedPassword,
                '+1234567890',
                'admin',
                ['admin'],
                'USA',
                'New York',
                'Manhattan'
            ]
        );
        adminUserId = adminResult.rows[0].id;
    });

    afterAll(async () => {
        // Clean up test data
        if (adminUserId) {
            await pool.query('DELETE FROM notifications WHERE user_id = $1', [adminUserId]);
            await pool.query('DELETE FROM users WHERE id = $1', [adminUserId]);
        }
        if (testUserEmail) {
            await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
        }
        await pool.end();
    });

    it('should notify admin when a new user registers', async () => {
        testUserEmail = 'newuser' + Date.now() + '@example.com';

        // Register a new user
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'New Test User',
                email: testUserEmail,
                password: 'password123',
                phone: '+1987654321',
                primary_role: 'customer',
                country: 'USA',
                city: 'Los Angeles',
                area: 'Downtown'
            });

        expect(response.status).toBe(201);
        expect(response.body.user).toBeDefined();

        const newUserId = response.body.user.id;

        // Wait a bit for async notification to be created
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check that admin received notification
        const notificationResult = await pool.query(
            `SELECT * FROM notifications 
       WHERE user_id = $1 
       AND type = 'new_user_registration'
       ORDER BY created_at DESC 
       LIMIT 1`,
            [adminUserId]
        );

        expect(notificationResult.rows.length).toBe(1);
        const notification = notificationResult.rows[0];

        expect(notification.title).toBe('New User Registered');
        expect(notification.message).toContain('New Test User');
        expect(notification.message).toContain('customer');
        expect(notification.message).toContain(`/profile/${newUserId}`);
        expect(notification.is_read).toBe(false);
    });

    it('should handle registration when no admin users exist', async () => {
        // Temporarily remove admin role
        await pool.query(
            'UPDATE users SET granted_roles = $1 WHERE id = $2',
            [['customer'], adminUserId]
        );

        testUserEmail = 'newuser2' + Date.now() + '@example.com';

        // Register a new user
        const response = await request(app)
            .post('/api/auth/register')
            .send({
                name: 'Another Test User',
                email: testUserEmail,
                password: 'password123',
                phone: '+1987654322',
                primary_role: 'driver',
                vehicle_type: 'car',
                country: 'USA',
                city: 'Chicago',
                area: 'Loop'
            });

        // Registration should still succeed even if no admins to notify
        expect(response.status).toBe(201);

        // Restore admin role
        await pool.query(
            'UPDATE users SET granted_roles = $1 WHERE id = $2',
            [['admin'], adminUserId]
        );
    });
});
