const request = require('supertest');
const app = require('../app');
const { expect } = require('chai');

describe('Reviews API Auth', () => {
    let server;
    // We assume the server is exported or can be tested via app
    // If not, we might need setup logic similar to other tests.

    it('should return 401 when posting review without token', async () => {
        const res = await request(app)
            .post('/api/reviews')
            .send({
                rating: 5,
                content: 'Great service!'
            });

        expect(res.status).to.equal(401);
        expect(res.body.error).to.include('No token provided');
    });

    it('should return 400 when posting review with token but missing fields', async () => {
        // Need a valid token. Mocking verifyToken middleware might be easier than login.
        // But for integration test, we use login if possible.
        // Alternatively, we check if 401 is returned FIRST.
    });
});
