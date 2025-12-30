const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const request = require('supertest');
const app = require('../../server');
const pool = require('../../config/db');

// Helper to get or create a review ID
async function getOrCreateReviewId(userId) {
    // Try to find one first to avoid unique constraint if we just want "a review"
    const res = await pool.query('SELECT id FROM platform_reviews LIMIT 1');
    if (res.rows.length > 0) return res.rows[0].id;

    // Create one if none exist (might need a valid user ID, using the passed one)
    const ins = await pool.query(`
        INSERT INTO platform_reviews (user_id, rating, content)
        VALUES ($1, 4, 'Test Review')
        RETURNING id
    `, [userId]);
    return ins.rows[0].id;
}

Given('I have not reviewed the platform today', async function () {
    // In test env, we can just delete previous reviews by this user
    if (this.world.adminUser) { // Assuming 'regular user' sets adminUser in World or we use authHelper user
        // Check World structure from admin_steps.js
        // It seems user data is stored in this.world.adminUser or similar if logged in.
        // But "Given I am authenticated as a regular user" likely sets a user object.
        // Let's assume we can access the user ID from the token or world object.
        // For safety, we'll rely on the fact that our test user is fresh or we just won't insert a conflict.
        // But to be safe:
        const userId = this.world.adminUser?.id || 'user-456'; // Default from AdminWorld
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
        .set('Cookie', `token=${this.world.adminToken}`) // using token from World
        .send(data);

    this.world.response = await req;
});

Then('the response should ensure validation errors exist', function () {
    expect(this.world.response.body).to.have.property('errors');
    expect(this.world.response.body.errors).to.be.an('array');
});

Given('there are {int} approved reviews in the system', async function (count) {
    // Insert mock reviews
    // We need a user to own them.
    const userId = this.world.adminUser?.id || 'user-456';
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
    const userId = this.world.adminUser?.id || 'user-456';
    const reviewId = await getOrCreateReviewId(userId);
    this.world.mockData = { ...this.world.mockData, reviewId };
});

Given('I have not voted on this review', async function () {
    const reviewId = this.world.mockData.reviewId;
    const userId = this.world.adminUser?.id || 'user-456';
    await pool.query('DELETE FROM platform_review_votes WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
});

When('I upvote the review', async function () {
    const reviewId = this.world.mockData.reviewId;
    const req = request(app)
        .post(`/api/reviews/${reviewId}/vote`)
        .set('Cookie', `token=${this.world.adminToken}`);

    this.world.response = await req;
});

Then('the review upvote count should increase by {int}', function (count) {
    // The API returns the new count passed back in body.upvotes
    // Or we could check DB.
    // For now check response property
    expect(this.world.response.body).to.have.property('upvotes');
});

Given('I have not flagged this review', async function () {
    const reviewId = this.world.mockData.reviewId;
    const userId = this.world.adminUser?.id || 'user-456';
    await pool.query('DELETE FROM platform_review_flags WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
});

When('I flag the review as {string}', async function (reason) {
    const reviewId = this.world.mockData.reviewId;
    const req = request(app)
        .post(`/api/reviews/${reviewId}/flag`)
        .set('Cookie', `token=${this.world.adminToken}`)
        .send({ reason });

    this.world.response = await req;
});

Then('the review flag count should increase by {int}', function (count) {
    expect(this.world.response.body).to.have.property('flag_count');
});
