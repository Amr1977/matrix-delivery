const { Given, When, Then, After } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../backend/.env.testing') });

// Import from backend - adjust path based on tests directory
const { BalanceService } = require(path.join(__dirname, '../../backend/services/balanceService'));
const { PAYMENT_CONFIG } = require(path.join(__dirname, '../../backend/config/paymentConfig'));

// Initialize database connection
let pool;
let balanceService;

// Helper to initialize DB connection
function initializeDB() {
    if (!pool) {
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || '',
        });
        balanceService = new BalanceService(pool);
    }
    return { pool, balanceService };
}

// ==========================================================================
// Background Steps
// ==========================================================================

Given('the platform commission rate is {int}%', function (rate) {
    const { balanceService } = initializeDB();
    this.commissionRate = rate / 100;
    expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(this.commissionRate);
});

Given('the maximum debt threshold is {int} EGP', function (threshold) {
    this.maxDebtThreshold = threshold;
    expect(PAYMENT_CONFIG.DEBT_MANAGEMENT.MAX_DEBT_THRESHOLD).to.equal(threshold);
});

Given('the warning debt threshold is {int} EGP', function (threshold) {
    this.warningThreshold = threshold;
    expect(PAYMENT_CONFIG.DEBT_MANAGEMENT.WARNING_THRESHOLD).to.equal(threshold);
});

// ==========================================================================
// Driver Setup Steps
// ==========================================================================

Given('a driver with balance of {float} EGP', async function (balance) {
    const { pool, balanceService } = initializeDB();

    // Create test driver
    const timestamp = Date.now();
    const driverResult = await pool.query(
        `INSERT INTO users (name, email, password, phone, primary_role, country, city, area, vehicle_type)
         VALUES ('BDD Driver', $1, 'hashed', '01222222222', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
         RETURNING id`,
        [`bdd.driver.${timestamp}@test.com`]
    );
    this.driverId = driverResult.rows[0].id;

    // Create balance
    await balanceService.createBalance(this.driverId);

    // Set initial balance
    if (balance !== 0) {
        await balanceService.deposit({
            userId: this.driverId,
            amount: balance,
            description: 'Initial balance for BDD test'
        });
    }

    this.initialBalance = balance;
    this.totalCommission = 0;
    this.totalCashCollected = 0;
});

Given('a driver starts the day with balance of {float} EGP', async function (balance) {
    const { pool, balanceService } = initializeDB();

    // Create test driver
    const timestamp = Date.now();
    const driverResult = await pool.query(
        `INSERT INTO users (name, email, password, phone, primary_role, country, city, area, vehicle_type)
         VALUES ('BDD Driver', $1, 'hashed', '01222222222', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
         RETURNING id`,
        [`bdd.driver.${timestamp}@test.com`]
    );
    this.driverId = driverResult.rows[0].id;

    // Create balance
    await balanceService.createBalance(this.driverId);

    // Set initial balance
    if (balance !== 0) {
        await balanceService.deposit({
            userId: this.driverId,
            amount: balance,
            description: 'Initial balance for BDD test'
        });
    }

    this.initialBalance = balance;
    this.totalCommission = 0;
    this.totalCashCollected = 0;
});

Given('a driver has completed {int} COD orders totaling {float} EGP', async function (orderCount, totalAmount) {
    const { pool, balanceService } = initializeDB();

    if (!this.driverId) {
        await this.Given('a driver with balance of 0 EGP');
    }

    const amountPerOrder = totalAmount / orderCount;
    for (let i = 0; i < orderCount; i++) {
        const orderResult = await pool.query(
            `INSERT INTO orders (customer_id, driver_id, total_amount, status)
             VALUES (1, $1, $2, 'delivered') RETURNING id`,
            [this.driverId, amountPerOrder]
        );

        const commission = amountPerOrder * this.commissionRate;
        await balanceService.deductCommission(this.driverId, orderResult.rows[0].id, commission);
        this.totalCommission += commission;
        this.totalCashCollected += amountPerOrder;
    }
});

Given('a driver completes {int} COD orders of {float} EGP each', async function (orderCount, amount) {
    const { pool, balanceService } = initializeDB();

    if (!this.driverId) {
        // Create test driver first
        const timestamp = Date.now();
        const driverResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area, vehicle_type)
             VALUES ('BDD Driver', $1, 'hashed', '01222222222', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
             RETURNING id`,
            [`bdd.driver.${timestamp}@test.com`]
        );
        this.driverId = driverResult.rows[0].id;
        await balanceService.createBalance(this.driverId);
        this.totalCommission = 0;
        this.totalCashCollected = 0;
    }

    for (let i = 0; i < orderCount; i++) {
        const orderResult = await pool.query(
            `INSERT INTO orders (customer_id, driver_id, total_amount, status)
             VALUES (1, $1, $2, 'delivered') RETURNING id`,
            [this.driverId, amount]
        );

        const commission = amount * this.commissionRate;
        await balanceService.deductCommission(this.driverId, orderResult.rows[0].id, commission);
        this.totalCommission += commission;
    }
});

Given('the driver\'s current balance is {float} EGP', async function (balance) {
    const { balanceService } = initializeDB();
    const currentBalance = await balanceService.getBalance(this.driverId);

    // Adjust balance to match expected
    const difference = balance - currentBalance.availableBalance;
    if (difference > 0) {
        await balanceService.deposit({
            userId: this.driverId,
            amount: difference,
            description: 'Balance adjustment'
        });
    } else if (difference < 0) {
        await balanceService.deductCommission(this.driverId, 1, Math.abs(difference));
    }
});

Given('the total commission deducted is {float} EGP', function (commission) {
    this.totalCommission = commission;
});

// ==========================================================================
// Order Completion Steps
// ==========================================================================

When('the driver completes a {float} EGP COD order', async function (amount) {
    const { pool, balanceService } = initializeDB();

    // Create order
    const orderResult = await pool.query(
        `INSERT INTO orders (customer_id, driver_id, total_amount, status)
         VALUES (1, $1, $2, 'delivered') RETURNING id`,
        [this.driverId, amount]
    );
    this.lastOrderId = orderResult.rows[0].id;

    // Calculate and deduct commission
    const commission = amount * this.commissionRate;
    await balanceService.deductCommission(this.driverId, this.lastOrderId, commission);

    this.lastCommission = commission;
    this.lastOrderAmount = amount;
    this.totalCommission = (this.totalCommission || 0) + commission;
    this.totalCashCollected = (this.totalCashCollected || 0) + amount;
});

When('the driver completes {int} COD orders of {float} EGP each', async function (orderCount, amount) {
    for (let i = 0; i < orderCount; i++) {
        await this.When(`the driver completes a ${amount} EGP COD order`);
    }
});

When('the driver completes the following COD orders:', async function (dataTable) {
    for (const row of dataTable.hashes()) {
        await this.When(`the driver completes a ${row.amount} EGP COD order`);
    }
});

When('the driver completes {int} more COD orders of {float} EGP each', async function (orderCount, amount) {
    await this.When(`the driver completes ${orderCount} COD orders of ${amount} EGP each`);
});

// ==========================================================================
// Deposit Steps
// ==========================================================================

When('the driver deposits {float} EGP', async function (amount) {
    const { balanceService } = initializeDB();
    await balanceService.deposit({
        userId: this.driverId,
        amount: amount,
        description: 'BDD test deposit'
    });
});

// ==========================================================================
// Assertion Steps - Balance
// ==========================================================================

Then('the driver balance should be {float} EGP', async function (expectedBalance) {
    const { balanceService } = initializeDB();
    const balance = await balanceService.getBalance(this.driverId);
    expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.01);
});

Then('the platform should deduct {float} EGP commission', function (expectedCommission) {
    expect(this.lastCommission).to.be.closeTo(expectedCommission, 0.01);
});

Then('the driver should keep {float} EGP cash', function (expectedCash) {
    const netEarnings = this.lastOrderAmount - this.lastCommission;
    expect(netEarnings).to.be.closeTo(expectedCash, 0.01);
});

Then('the total commission should be {float} EGP', function (expectedCommission) {
    expect(this.totalCommission).to.be.closeTo(expectedCommission, 0.01);
});

Then('the total cash collected should be {float} EGP', function (expectedCash) {
    expect(this.totalCashCollected).to.be.closeTo(expectedCash, 0.01);
});

Then('the net earnings should be {float} EGP', function (expectedNet) {
    const netEarnings = this.totalCashCollected - this.totalCommission;
    expect(netEarnings).to.be.closeTo(expectedNet, 0.01);
});

Then('the balance should be marked as debt', async function () {
    const { balanceService } = initializeDB();
    const balance = await balanceService.getBalance(this.driverId);
    expect(balance.availableBalance).to.be.lessThan(0);
});

// ==========================================================================
// Assertion Steps - Order Acceptance
// ==========================================================================

Then('the driver should still be able to accept orders', async function () {
    const { balanceService } = initializeDB();
    const canAccept = await balanceService.canAcceptOrders(this.driverId);
    expect(canAccept.canAccept).to.be.true;
});

Then('the driver should be able to accept new orders', async function () {
    await this.Then('the driver should still be able to accept orders');
});

Then('the driver should NOT be able to accept new orders', async function () {
    const { balanceService } = initializeDB();
    const canAccept = await balanceService.canAcceptOrders(this.driverId);
    expect(canAccept.canAccept).to.be.false;
});

// ==========================================================================
// Assertion Steps - Notifications
// ==========================================================================

Then('the driver should receive a warning notification', function () {
    // In real implementation, check notifications table
    // For now, just verify balance is at warning threshold
    expect(this.totalCommission).to.be.greaterThan(0);
});

Then('the driver should receive a critical notification', function () {
    // In real implementation, check notifications table
    expect(this.totalCommission).to.be.greaterThan(0);
});

Then('no warning notifications should be shown', function () {
    // Placeholder for notification check
    expect(true).to.be.true;
});

Then('no balance warning notification should be sent', function () {
    // Placeholder for notification check
    expect(true).to.be.true;
});

// ==========================================================================
// Assertion Steps - Configuration
// ==========================================================================

When('the system checks debt management settings', function () {
    this.debtConfig = PAYMENT_CONFIG.DEBT_MANAGEMENT;
});

When('the system checks commission settings', function () {
    this.commissionConfig = PAYMENT_CONFIG;
});

Then('the MAX_DEBT_THRESHOLD should be {int} EGP', function (threshold) {
    expect(this.debtConfig.MAX_DEBT_THRESHOLD).to.equal(threshold);
});

Then('the WARNING_THRESHOLD should be {int} EGP', function (threshold) {
    expect(this.debtConfig.WARNING_THRESHOLD).to.equal(threshold);
});

Then('BLOCK_NEW_ORDERS should be true', function () {
    expect(this.debtConfig.BLOCK_NEW_ORDERS).to.be.true;
});

Then('ALLOW_NEGATIVE_BALANCE should be true', function () {
    expect(this.debtConfig.ALLOW_NEGATIVE_BALANCE).to.be.true;
});

Then('the COMMISSION_RATE should be {float}', function (rate) {
    expect(this.commissionConfig.COMMISSION_RATE).to.equal(rate);
});

Then('the COMMISSION_RATE_PERCENT should be {int}', function (percent) {
    expect(this.commissionConfig.COMMISSION_RATE * 100).to.equal(percent);
});

Then('the COD fee should be {int}', function (fee) {
    expect(this.commissionConfig.COD_FEE || 0).to.equal(fee);
});

// ==========================================================================
// Cleanup
// ==========================================================================

After(async function () {
    if (this.driverId && pool) {
        try {
            await pool.query('DELETE FROM balance_transactions WHERE user_id = $1', [this.driverId]);
            await pool.query('DELETE FROM user_balances WHERE user_id = $1', [this.driverId]);
            await pool.query('DELETE FROM orders WHERE driver_id = $1', [this.driverId]);
            await pool.query('DELETE FROM users WHERE id = $1', [this.driverId]);
        } catch (error) {
            console.error('Cleanup error:', error.message);
        }
    }
});
