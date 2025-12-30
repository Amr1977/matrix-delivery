const request = require('supertest');
const { expect } = require('chai');
const app = require('../../server');
const pool = require('../../config/db');
const jwt = require('jsonwebtoken');
const { resetDatabase } = require('../../database/init');

describe('Platform Reviews API Integration', () => {
    let token;
    let userId;
    let reviewId;

    beforeAll(async () => {
        try {
            // Force reset database to ensure schema matches current code (e.g. password_hash vs password)
            console.log('Resetting Database...');
            await resetDatabase(pool);
            console.log('Database Reset Complete.');

            // Create Test User
            const userRes = await pool.query(`
                INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
                VALUES ('test-reviewer-id', 'Test Reviewer', 'reviewer@test.com', 'hashedpassword', '1234567890', 'customer', true)
                ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                RETURNING id, email, primary_role
            `);
            userId = userRes.rows[0].id;

            token = jwt.sign(
                { userId: userId, role: 'customer' },
                'test-secret-key-12345-very-long-secret-key-at-least-64-characters-long-for-security-validation-persistence-check',
                {
                    expiresIn: '1h',
                    audience: 'matrix-delivery-api',
                    issuer: 'matrix-delivery'
                }
            );
        } catch (e) {
            console.error('SETUP FAILED:', e);
            throw e;
        }
    });

    afterAll(async () => {
        if (userId) {
            try {
                await pool.query('DELETE FROM platform_reviews WHERE user_id = $1', [userId]);
                await pool.query('DELETE FROM users WHERE id = $1', [userId]);
            } catch (e) {
                console.error('CLEANUP FAILED:', e);
            }
        }
    });

    describe('POST /api/reviews', () => {
        it('should create a review successfully with valid data', async () => {
            const res = await request(app)
                .post('/api/reviews')
                .set('Cookie', [`token=${token}`])
                .send({
                    rating: 5,
                    content: 'Great app!',
                    professionalism_rating: 5,
                    communication_rating: 4,
                    timeliness_rating: 5,
                    package_condition_rating: 5
                });

            if (res.status !== 201) {
                console.error('Review Create Failed:', res.status, res.body);
            }
            expect(res.status).to.equal(201);
            expect(res.body).to.have.property('id');
            reviewId = res.body.id;
        });

        // ... (rest of tests, simplified for debug run if needed, but keeping full is fine)

        it('should fail with validation error for invalid rating', async () => {
            const res = await request(app)
                .post('/api/reviews')
                .set('Cookie', [`token=${token}`])
                .send({
                    rating: 6,
                    content: 'Bad rating'
                });
            expect(res.status).to.equal(400);
        });
    });

    // Keeping other tests...
    describe('GET /api/reviews', () => {
        it('should list reviews', async () => {
            const res = await request(app).get('/api/reviews');
            expect(res.status).to.equal(200);
            expect(res.body.reviews).to.be.an('array');
            if (reviewId) {
                const myReview = res.body.reviews.find(r => r.id === reviewId);
                expect(myReview).to.exist;
            }
        });
    });

    describe('POST /api/reviews/:id/vote', () => {
        let voterToken;
        let voterId;

        beforeAll(async () => {
            if (!reviewId) return; // Skip if main review setup failed
            const userRes = await pool.query(`
                INSERT INTO users (id, name, email, password_hash, phone, primary_role)
                VALUES ('voter-id', 'Voter', 'voter@test.com', 'hashed', '0987654321', 'customer')
                RETURNING id
            `);
            voterId = userRes.rows[0].id;
            voterToken = jwt.sign(
                { userId: voterId, role: 'customer' },
                process.env.JWT_SECRET || 'test_secret',
                { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
            );
        });

        afterAll(async () => {
            if (voterId) await pool.query('DELETE FROM users WHERE id = $1', [voterId]);
        });

        it('should allow upvoting a review', async () => {
            if (!reviewId) return;
            const res = await request(app)
                .post(`/api/reviews/${reviewId}/vote`)
                .set('Cookie', [`token=${voterToken}`]);

            expect(res.status).to.equal(200);
            expect(res.body.upvotes).to.be.at.least(1);
        });

        it('should prevent double voting', async () => {
            if (!reviewId) return;
            const res = await request(app)
                .post(`/api/reviews/${reviewId}/vote`)
                .set('Cookie', [`token=${voterToken}`]);

            expect(res.status).to.equal(400);
        });
    });

    describe('POST /api/reviews/:id/flag', () => {
        let flaggerToken;
        let flaggerId;
        let hiddenReviewId;

        beforeAll(async () => {
            if (!userId) return;
            const userRes = await pool.query(`
                INSERT INTO users (id, name, email, password_hash, phone, primary_role)
                VALUES ('flagger-id', 'Flagger', 'flagger@test.com', 'hashed', '1122334455', 'customer')
                RETURNING id
            `);
            flaggerId = userRes.rows[0].id;
            flaggerToken = jwt.sign(
                { userId: flaggerId, role: 'customer' },
                process.env.JWT_SECRET || 'test_secret',
                { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
            );

            // Create a review to be flagged
            const reviewRes = await pool.query(`
                INSERT INTO platform_reviews (user_id, rating, content)
                VALUES ($1, 5, 'To be hidden')
                RETURNING id
            `, [userId]);
            hiddenReviewId = reviewRes.rows[0].id;
        });

        afterAll(async () => {
            if (flaggerId) await pool.query('DELETE FROM users WHERE id = $1', [flaggerId]);
            if (hiddenReviewId) await pool.query('DELETE FROM platform_reviews WHERE id = $1', [hiddenReviewId]);
        });

        it('should allow flagging a review', async () => {
            if (!hiddenReviewId) return;
            const res = await request(app)
                .post(`/api/reviews/${hiddenReviewId}/flag`)
                .set('Cookie', [`token=${flaggerToken}`])
                .send({ reason: 'Spam' });

            expect(res.status).to.equal(200);
        });
    });
});
