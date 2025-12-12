const request = require('supertest');
const app = require('../server'); // Adjusted path to backend root
const pool = require('../config/db');
const { generateToken } = require('../services/authService'); // generateToken is in authService class, but accessible via instance?
// Wait, generateToken in authService is a method.
// Check utils/auth if it exists.
// List in step 134 showed `utils` dir.
// Let's assume `utils/auth` exists or I need to import it differently.
// Actually, `authService.js` has `generateToken`.
// Let's check `utils` content or just stick to using `authService` if I need to generate token manually (which I don't, I login).
// But the test header imports `generateToken`. I probably copied it from another test.
// Let's remove `generateToken` import if not used, or fix it.
// The test uses `token` from login response. It references `generateToken` in imports but I don't see it used in the test body I wrote in step 116.
// Ah, I wrote: `const { generateToken } = require('../../utils/auth');`
// But I never used `generateToken` in the test body!
// So I can just remove that line.

// Mock generateId if needed, or rely on actual implementation
// Assuming authService uses a real DB connection as per previous context

describe('Verification Status Refactor Check', () => {
    let testUser = {
        name: 'Refactor Test User',
        email: `refactor_${Date.now()}@example.com`,
        password: 'password123',
        phone: '1234567890',
        primary_role: 'customer',
        country: 'US',
        city: 'New York',
        area: 'Test Area'
    };
    let token;
    let userId;

    beforeAll(async () => {
        // Register user
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        if (res.statusCode !== 201) {
            console.error('Registration failed:', res.body);
        }
        if (res.statusCode !== 201) {
            console.log('Registration Error Body:', JSON.stringify(res.body, null, 2));
        }
        expect(res.statusCode).toEqual(201);
        userId = res.body.user.id;

        // Manually verify user in DB
        await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);

        // Login to get token
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });

        // Token is in cookie, not body
        const cookies = loginRes.headers['set-cookie'];
        if (cookies) {
            token = cookies.find(c => c.startsWith('token=')).split(';')[0].split('=')[1];
        } else {
            // Fallback if returned in body (it was removed for security but logic might differ in test env?)
            token = loginRes.body.token;
        }
    });

    afterAll(async () => {
        if (userId) {
            await pool.query('DELETE FROM email_verification_tokens WHERE user_id = $1', [userId]);
            await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        }
    });

    test('Login response should have is_verified and NOT isVerified', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });

        expect(res.statusCode).toEqual(200);
        expect(res.body.user).toBeDefined();

        // CHECK: is_verified SHOULD be present
        expect(res.body.user.is_verified).toBe(true);

        // CHECK: isVerified SHOULD NOT be present
        expect(res.body.user.isVerified).toBeUndefined();
    });

    test('Get Profile response should have is_verified and NOT isVerified', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.statusCode).toEqual(200);

        // CHECK: is_verified SHOULD be present
        expect(res.body.is_verified).toBe(true);

        // CHECK: isVerified SHOULD NOT be present
        expect(res.body.isVerified).toBeUndefined();
    });
});
