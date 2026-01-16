const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const pool = require('../../../backend/config/db');
const bcrypt = require('bcryptjs');
const { generateId } = require('../../../backend/utils/generators');

Given('the database is initialized', async function () {
    // Database is initialized by the hooks/server manager
    // We can add specific cleanup if needed here
    return true;
});

Given('an admin user exists for withdrawals', async function () {
    const timestamp = Date.now();
    const adminId = generateId();
    const email = `admin_${timestamp}@test.com`;
    const name = 'Test Admin';
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);
    const phone = `+201${timestamp.toString().slice(-9)}`;
    
    await pool.query(
        `INSERT INTO users (
            id, name, email, password_hash, phone, 
            primary_role, granted_roles, is_verified, 
            country, city, area, rating, completed_deliveries
        ) VALUES ($1, $2, $3, $4, $5, 'admin', ARRAY['admin'], true, 'Egypt', 'Cairo', 'Maadi', 0, 0)`,
        [adminId, name, email, passwordHash, phone]
    );

    await pool.query(
        'INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance) VALUES ($1, \'EGP\', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING',
        [adminId]
    );

    const loginResponse = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const loginResult = await loginResponse.json();
    if (!loginResponse.ok) {
        throw new Error(`Failed to login admin: ${loginResult.error || loginResponse.statusText}`);
    }

    const setCookie = loginResponse.headers.get('set-cookie');
    if (!setCookie) {
        throw new Error('Admin login did not return auth cookie');
    }
    const tokenCookie = setCookie.split(',')[0];
    const cookieValue = tokenCookie.split(';')[0];

    this.testData.admin = { 
        id: adminId, 
        email, 
        name,
        primary_role: 'admin'
    };
    this.testData.adminCookie = cookieValue;
});

Given('a driver user exists with balance {float}', async function (amount) {
    const timestamp = Date.now();
    const driverData = {
        name: 'Rich Driver',
        email: `driver_${timestamp}@test.com`,
        password: 'password123',
        primary_role: 'driver',
        phone: `+201${timestamp.toString().slice(-9)}`,
        vehicle_type: 'car',
        country: 'Egypt',
        city: 'Cairo',
        area: 'Maadi'
    };

    const registerResponse = await fetch(`${this.apiUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(driverData)
    });
    const registerResult = await registerResponse.json();
    if (!registerResponse.ok) throw new Error(`Failed to create driver: ${registerResult.error}`);
    
    this.testData.driver = { ...driverData, id: registerResult.user.id };

    const loginResponse = await fetch(`${this.apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: driverData.email, password: driverData.password })
    });
    const loginResult = await loginResponse.json();
    if (!loginResponse.ok) {
        throw new Error(`Failed to login driver: ${loginResult.error || loginResponse.statusText}`);
    }

    const setCookie = loginResponse.headers.get('set-cookie');
    if (!setCookie) {
        throw new Error('Driver login did not return auth cookie');
    }
    const tokenCookie = setCookie.split(',')[0];
    const cookieValue = tokenCookie.split(';')[0];

    this.testData.driverCookie = cookieValue;
    
    const depositResponse = await fetch(`${this.apiUrl}/v1/balance/deposit`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': this.testData.driverCookie
        },
        body: JSON.stringify({
            userId: this.testData.driver.id,
            amount: amount,
            description: 'Initial deposit',
            metadata: {}
        })
    });
    
    if (!depositResponse.ok) {
        const error = await depositResponse.json();
        console.error('Deposit failed:', error);
        throw new Error(`Failed to deposit: ${JSON.stringify(error)}`);
    }
});

Given('the driver has a pending withdrawal request for {float} EGP', async function (amount) {
    const withdrawResponse = await fetch(`${this.apiUrl}/v1/balance/withdraw`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': this.testData.driverCookie
        },
        body: JSON.stringify({
            userId: this.testData.driver.id,
            amount: amount,
            destination: 'vodafone',
            description: 'Test withdrawal',
            metadata: { walletNumber: '01000000000' }
        })
    });
    const withdrawResult = await withdrawResponse.json();
    if (!withdrawResponse.ok) throw new Error(`Failed to withdraw: ${withdrawResult.error}`);
    
    this.testData.withdrawalRequestId = withdrawResult.data.withdrawalRequestId;
    
    // Manually verify to skip PIN flow
    await pool.query(
        `UPDATE withdrawal_requests 
         SET requires_verification = FALSE, verified_at = NOW(), status = 'pending'
         WHERE id = $1`,
        [this.testData.withdrawalRequestId]
    );
    
    await pool.query(
        `UPDATE user_balances
         SET available_balance = available_balance - $1,
             held_balance = held_balance + $1,
             lifetime_withdrawals = lifetime_withdrawals + $1
         WHERE user_id = $2`,
        [amount, this.testData.driver.id]
    );
});

When('the admin requests the list of pending withdrawals', async function () {
    const response = await fetch(`${this.apiUrl}/v1/balance/admin/withdrawals`, {
        method: 'GET',
        headers: { 
            'Cookie': this.testData.adminCookie
        }
    });
    this.response = response;
    this.result = await response.json();
});

Then('the response should contain the pending withdrawal request', function () {
    expect(this.response.ok).to.be.true;
    const requests = this.result.data.requests;
    const request = requests.find(r => r.id === this.testData.withdrawalRequestId);
    expect(request).to.not.be.undefined;
});

Then('the total count should be {int}', function (count) {
    expect(this.result.data.total).to.be.at.least(count);
});

When('the admin approves the withdrawal request with reference {string}', async function (ref) {
    const response = await fetch(`${this.apiUrl}/v1/balance/admin/withdrawals/${this.testData.withdrawalRequestId}/approve`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': this.testData.adminCookie
        },
        body: JSON.stringify({ reference: ref })
    });
    this.response = response;
    this.result = await response.json();
});

Then('the withdrawal request status should be {string}', async function (status) {
    const res = await pool.query('SELECT status FROM withdrawal_requests WHERE id = $1', [this.testData.withdrawalRequestId]);
    expect(res.rows[0].status).to.equal(status);
});

Then('the driver\'s held balance should decrease by {float}', async function (amount) {
    const res = await pool.query('SELECT held_balance FROM user_balances WHERE user_id = $1', [this.testData.driver.id]);
    const held = parseFloat(res.rows[0].held_balance);
    expect(held).to.equal(0);
});

Then('the driver\'s available balance should remain unchanged', async function () {
    const res = await pool.query('SELECT available_balance FROM user_balances WHERE user_id = $1', [this.testData.driver.id]);
    const available = parseFloat(res.rows[0].available_balance);
    expect(available).to.equal(4000);
});

Then('the transaction status should be {string}', async function (status) {
    const res = await pool.query(
        'SELECT status FROM balance_transactions WHERE withdrawal_request_id = $1 AND type = \'withdrawal\'',
        [this.testData.withdrawalRequestId]
    );
    expect(res.rows[0].status).to.equal(status);
});

When('the admin rejects the withdrawal request with reason {string}', async function (reason) {
    const response = await fetch(`${this.apiUrl}/v1/balance/admin/withdrawals/${this.testData.withdrawalRequestId}/reject`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Cookie': this.testData.adminCookie
        },
        body: JSON.stringify({ reason: reason })
    });
    this.response = response;
    this.result = await response.json();
});

Then('the driver\'s available balance should increase by {float}', async function (amount) {
    const res = await pool.query('SELECT available_balance FROM user_balances WHERE user_id = $1', [this.testData.driver.id]);
    const available = parseFloat(res.rows[0].available_balance);
    expect(available).to.equal(5000);
});
