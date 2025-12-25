const request = require('supertest');
const app = require('./server');
const jwt = require('jsonwebtoken');

// Generate test token
const token = jwt.sign(
    { userId: 1, primary_role: 'customer', primary_role: 'customer' },
    process.env.JWT_SECRET,
    { expiresIn: '1h', issuer: 'matrix-delivery', audience: 'matrix-delivery-api' }
);

async function testWithdrawal() {
    console.log('Testing withdrawal...');

    const response = await request(app)
        .post('/api/v1/balance/withdraw')
        .set('Authorization', `Bearer ${token}`)
        .send({
            userId: 1,
            amount: 1000,
            destination: 'bank_account',
            description: 'Test withdrawal'
        });

    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(response.body, null, 2));
}

testWithdrawal().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
