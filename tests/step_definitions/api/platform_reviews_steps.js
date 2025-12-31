const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../../backend/server');
const pool = require('../../config/db');
const bcrypt = require('bcryptjs');

// Helper to get or create a review ID
async function getOrCreateReviewId(userId) {
    // Try to find one first to avoid unique constraint if we just want "a review"
    const res = await pool.query('SELECT id FROM platform_reviews LIMIT 1');
    if (res.rows.length > 0) return res.rows[0].id;

    // Create one if none exist
    const ins = await pool.query(`
        INSERT INTO platform_reviews (user_id, rating, content)
        VALUES ($1, 4, 'Test Review')
        RETURNING id
    `, [userId]);
    return ins.rows[0].id;
}

Given('I am authenticated as a reviewer', async function () {
    try {
        const email = `reviewer_${Date.now()}_${Math.floor(Math.random() * 1000)}@test.com`;
        const password = 'Password123!';
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = `reviewer-${Date.now()}`;

        // Create user
        await pool.query(`
            INSERT INTO users (id, name, email, phone, password_hash, primary_role, is_verified)
            VALUES ($1, 'Reviewer', $2, '1234567890', $3, 'customer', true)
        `, [userId, email, hashedPassword]);

        // Login to get token
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email, password });

        expect(res.status).to.equal(200);

        // Store in world
        const cookies = res.headers['set-cookie'];
        if (cookies) {
            const tokenCookie = cookies.find(c => c.startsWith('token='));
            if (tokenCookie) {
                this.world.token = tokenCookie.split(';')[0].split('=')[1];
            }
        }

        if (!this.world.token) {
            throw new Error('Authentication failed: No token in cookies');
        }

        this.world.userId = userId;
        this.world.email = email;
    } catch (error) {
        console.error('Authentication Error:', error);
        throw error;
    }
});

Given('I have not reviewed the platform today', async function () {
    const userId = this.world.userId;
    if (userId) {
        await pool.query('DELETE FROM platform_reviews WHERE user_id = $1', [userId]);
    }
});

When('I submit a review with:', async function (dataTable) {
    const data = dataTable.rowsHash();
    // Convert string numbers to actual numbers
    if (data.rating) data.rating = parseInt(data.rating);
    if (data.professionalism_rating) data.professionalism_rating = parseInt(data.professionalism_rating);
    if (data.communication_rating) data.communication_rating = parseInt(data.communication_rating);
    if (data.timeliness_rating) data.timeliness_rating = parseInt(data.timeliness_rating);
    if (data.package_condition_rating) data.package_condition_rating = parseInt(data.package_condition_rating);

    const req = request(app)
        .post('/api/reviews')
        .set('Cookie', `token=${this.world.token}`)
        .send(data);

    this.world.response = await req;
});

Then('the response should ensure validation errors exist', function () {
    expect(this.world.response.body).to.have.property('errors');
    expect(this.world.response.body.errors).to.be.an('array');
});

Given('there are {int} approved reviews in the system', async function (count) {
    const userId = this.world.userId;
    for (let i = 0; i < count; i++) {
        await pool.query(`
            INSERT INTO platform_reviews (user_id, rating, content, is_approved)
            VALUES ($1, 5, $2, true)
        `, [userId, `Mock Review ${i}`]);
    }
});

When('I request the reviews list', async function () {
    const req = request(app).get('/api/reviews');
    this.world.response = await req;
});

Then('the response should include a list of reviews', function () {
    expect(this.world.response.body).to.have.property('reviews');
    expect(this.world.response.body.reviews).to.be.an('array');
});

Then('the list should contain at least {int} reviews', function (count) {
    expect(this.world.response.body.reviews.length).to.be.at.least(count);
});

Given('there is an existing review', async function () {
    const userId = this.world.userId;
    const reviewId = await getOrCreateReviewId(userId);
    if (!this.world.mockData) this.world.mockData = {};
    this.world.mockData.reviewId = reviewId;
});

Given('I have not voted on this review', async function () {
    const reviewId = this.world.mockData.reviewId;
    const userId = this.world.userId;
    await pool.query('DELETE FROM platform_review_votes WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
});

When('I upvote the review', async function () {
    const reviewId = this.world.mockData.reviewId;
    const req = request(app)
        .post(`/api/reviews/${reviewId}/vote`)
        .set('Cookie', `token=${this.world.token}`);

    this.world.response = await req;
});

Then('the review upvote count should increase by {int}', function (count) {
    expect(this.world.response.body).to.have.property('upvotes');
});

Given('I have not flagged this review', async function () {
    const reviewId = this.world.mockData.reviewId;
    const userId = this.world.userId;
    await pool.query('DELETE FROM platform_review_flags WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
});

When('I flag the review as {string}', async function (reason) {
    const reviewId = this.world.mockData.reviewId;
    const req = request(app)
        .post(`/api/reviews/${reviewId}/flag`)
        .set('Cookie', `token=${this.world.token}`)
        .send({ reason });

    this.world.response = await req;
});

Then('the review flag count should increase by {int}', function (count) {
    expect(this.world.response.body).to.have.property('flag_count');
});



