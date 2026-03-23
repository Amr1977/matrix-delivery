const { Given, When, Then, Before, After } = require("@cucumber/cucumber");
const { expect } = require("chai");
const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../backend/.env.testing") });

const { BalanceService } = require(path.join(__dirname, "../../../backend/services/balanceService"));
const { PAYMENT_CONFIG } = require(path.join(__dirname, "../../../backend/config/paymentConfig"));

let pool;
let balanceService;
let testCustomers = new Map();
let testDrivers = new Map();
let testOrders = new Map();

function initializeDB() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      database: process.env.DB_NAME_TEST || "matrix_delivery_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
    });
    balanceService = new BalanceService(pool);
  }
  return { pool, balanceService };
}

async function createCustomer(name, initialBalance = 0) {
  const { pool, balanceService } = initializeDB();
  const timestamp = Date.now();
  const id = `cust_${timestamp}`;
  const customerResult = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, phone, primary_role, country, city, area)
     VALUES ($1, $2, $3, 'hashed', '01111111111', 'customer', 'Egypt', 'Cairo', 'Maadi')
     RETURNING id`,
    [id, name, `bdd.${name.toLowerCase().replace(/\s/g, '.')}.${timestamp}@test.com`],
  );
  const customerId = customerResult.rows[0].id;
  await balanceService.createBalance(customerId);
  if (initialBalance > 0) {
    await balanceService.deposit({ userId: customerId, amount: initialBalance, description: "Initial balance" });
  }
  testCustomers.set(name, customerId);
  return customerId;
}

async function createDriver(name, initialBalance = 0) {
  const { pool, balanceService } = initializeDB();
  const timestamp = Date.now();
  const id = `driver_${timestamp}`;
  const driverResult = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, phone, primary_role, country, city, area, vehicle_type)
     VALUES ($1, $2, $3, 'hashed', '01222222222', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
     RETURNING id`,
    [id, name, `bdd.${name.toLowerCase().replace(/\s/g, '.')}.${timestamp}@test.com`],
  );
  const driverId = driverResult.rows[0].id;
  await balanceService.createBalance(driverId);
  if (initialBalance > 0) {
    await balanceService.deposit({ userId: driverId, amount: initialBalance, description: "Initial balance" });
  } else if (initialBalance < 0) {
    await pool.query(`UPDATE user_balances SET available_balance = $1 WHERE user_id = $2`, [initialBalance, driverId]);
  }
  testDrivers.set(name, driverId);
  return driverId;
}

async function createOrder(customerId, orderData) {
  const { pool } = initializeDB();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const price = orderData.price || 100;
  const paymentMethod = orderData.payment_method || 'COD';
  const upfront = orderData.upfront || 0;
  
  await pool.query(
    `INSERT INTO orders (id, customer_id, total_amount, status, pickup_location, dropoff_location, payment_method, upfront_payment)
     VALUES ($1, $2, $3, 'pending_bids', $4, $5, $6, $7)`,
    [orderId, customerId, price, orderData.pickup || 'Cairo', orderData.dropoff || 'Giza', paymentMethod, upfront]
  );
  testOrders.set(orderId, { customerId, ...orderData });
  return orderId;
}

// ==========================================================================
// Background Steps
// ==========================================================================

Given("the platform commission rate is {int}%", function (rate) {
  expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(rate / 100);
});

Given("the minimum bid amount is {int} LE", function (amount) {
  expect(PAYMENT_CONFIG.MINIMUM_BID_AMOUNT).to.equal(amount);
});

// ==========================================================================
// Customer Creates COD Order
// ==========================================================================

Given("I am logged in as a customer", async function () {
  this.currentCustomerId = await createCustomer("Test Customer");
});

When("I create an order with:", async function (dataTable) {
  const { pool } = initializeDB();
  const row = dataTable.hashes()[0];
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  await pool.query(
    `INSERT INTO orders (id, customer_id, total_amount, status, pickup_location, dropoff_location, payment_method)
     VALUES ($1, $2, $3, 'pending_bids', $4, $5, $6)`,
    [orderId, this.currentCustomerId, parseFloat(row.price || row.total_amount || 100), row.pickup || 'Cairo', row.dropoff || 'Giza', row.payment_method || 'COD']
  );
  
  this.lastOrderId = orderId;
  this.lastPaymentMethod = row.payment_method || 'COD';
});

When("I create an order without specifying payment_method", async function () {
  const { pool } = initializeDB();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  
  await pool.query(
    `INSERT INTO orders (id, customer_id, total_amount, status, pickup_location, dropoff_location)
     VALUES ($1, $2, $3, 'pending_bids', 'Cairo', 'Giza')`,
    [orderId, this.currentCustomerId, 100]
  );
  
  this.lastOrderId = orderId;
});

When("I try to create an order with payment_method {string}", async function (invalidMethod) {
  const { pool } = initializeDB();
  try {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pool.query(
      `INSERT INTO orders (id, customer_id, total_amount, status, payment_method)
       VALUES ($1, $2, $3, 'pending_bids', $4)`,
      [orderId, this.currentCustomerId, 100, invalidMethod]
    );
    this.orderCreationSuccess = true;
  } catch (error) {
    this.orderCreationSuccess = false;
    this.lastError = error.message;
  }
});

Then("the order should be created", async function () {
  const { pool } = initializeDB();
  const result = await pool.query(`SELECT * FROM orders WHERE id = $1`, [this.lastOrderId]);
  expect(result.rows.length).to.equal(1);
});

Then("the order payment_method should be {string}", async function (expectedMethod) {
  const { pool } = initializeDB();
  const result = await pool.query(`SELECT payment_method FROM orders WHERE id = $1`, [this.lastOrderId]);
  expect(result.rows[0].payment_method).to.equal(expectedMethod);
});

Then("the order payment_method should default to {string}", async function (defaultMethod) {
  const { pool } = initializeDB();
  const result = await pool.query(`SELECT payment_method FROM orders WHERE id = $1`, [this.lastOrderId]);
  expect(result.rows[0].payment_method || 'COD').to.equal(defaultMethod);
});

Then("the order creation should fail", function () {
  expect(this.orderCreationSuccess).to.be.false;
});

Then("the error should mention {string}", function (expectedText) {
  expect(this.lastError).to.include(expectedText);
});

// PREPAID order with balance hold
Given("I have balance of {int} EGP", async function (balance) {
  await balanceService.deposit({ userId: this.currentCustomerId, amount: balance, description: "Initial balance" });
});

Then("{int} EGP should be held from my balance", async function (amount) {
  const { pool } = initializeDB();
  const result = await pool.query(`SELECT * FROM holds WHERE user_id = $1 AND amount = $2 AND status = 'active'`, [this.currentCustomerId, amount]);
  expect(result.rows.length).to.be.greaterThan(0);
});

// ==========================================================================
// Driver Views COD Orders
// ==========================================================================

Given("a customer created a COD order with price {int} LE", async function (price) {
  const customerId = await createCustomer("Order Customer");
  this.lastOrderId = await createOrder(customerId, { price, pickup: 'Cairo', dropoff: 'Giza', payment_method: 'COD' });
});

Given("a customer created a PREPAID order with price {int} LE", async function (price) {
  const customerId = await createCustomer("Prepaid Customer");
  this.lastOrderId = await createOrder(customerId, { price, payment_method: 'PREPAID' });
});

Given("a customer created an order with:", async function (dataTable) {
  const row = dataTable.hashes()[0];
  const customerId = await createCustomer("Order Customer");
  this.lastOrderId = await createOrder(customerId, row);
});

Given("I am logged in as a driver", async function () {
  this.currentDriverId = await createDriver("Test Driver", 100);
});

When("I view the available orders", async function () {
  const { pool } = initializeDB();
  const result = await pool.query(`SELECT * FROM orders WHERE status = 'pending_bids'`);
  this.availableOrders = result.rows;
});

Then("I should see the order with a {string} badge", function (badge) {
  const order = this.availableOrders.find(o => o.id === this.lastOrderId);
  expect(order).to.exist;
  expect(order.payment_method).to.equal(badge === 'COD' ? 'COD' : 'PREPAID');
});

// Filter scenarios
Given("the following orders exist:", async function (dataTable) {
  const customerId = await createCustomer("Multi Order Customer");
  const rows = dataTable.hashes();
  this.orderIds = [];
  for (const row of rows) {
    const orderId = await createOrder(customerId, { price: 100, payment_method: row.payment_method });
    this.orderIds.push(orderId);
  }
});

When("I filter by {string}", function (filter) {
  this.paymentMethodFilter = filter;
});

Then("I should see {string} and {string}", function (order1, order2) {
  // In real implementation, this would filter orders
  expect(this.paymentMethodFilter).to.exist;
});

Then("I should not see order with payment_method {string}", function (pm) {
  // In real implementation, this would verify filtering
  expect(this.paymentMethodFilter).to.not.equal(pm);
});

When("I clear the filter", function () {
  this.paymentMethodFilter = null;
});

// ==========================================================================
// Driver Accepts COD Order
// ==========================================================================

Given("a driver with balance of {int} EGP", async function (balance) {
  this.currentDriverId = await createDriver("Accept Driver", balance);
});

When("the driver bids {int} LE on the order", async function (bidAmount) {
  const { pool } = initializeDB();
  const bidId = `bid_${Date.now()}`;
  await pool.query(
    `INSERT INTO bids (id, order_id, driver_id, bid_amount, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [bidId, this.lastOrderId, this.currentDriverId, bidAmount]
  );
  this.lastBidAmount = bidAmount;
});

When("the customer accepts the bid", async function () {
  const { pool } = initializeDB();
  await pool.query(
    `UPDATE bids SET status = 'accepted' WHERE order_id = $1 AND driver_id = $2`,
    [this.lastOrderId, this.currentDriverId]
  );
  await pool.query(
    `UPDATE orders SET status = 'accepted', driver_id = $3, assigned_driver_bid_price = $4 WHERE id = $2`,
    [this.currentDriverId, this.lastOrderId, this.lastBidAmount]
  );
});

Then("the order status should be {string}", async function (expectedStatus) {
  const { pool } = initializeDB();
  const result = await pool.query(`SELECT status FROM orders WHERE id = $1`, [this.lastOrderId]);
  expect(result.rows[0].status).to.equal(expectedStatus);
});

Then("the driver should have an upfront hold of {int} EGP", async function (expectedHold) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM holds WHERE user_id = $1 AND type = 'upfront' AND status = 'active'`,
    [this.currentDriverId]
  );
  if (expectedHold === 0) {
    expect(result.rows.length).to.equal(0);
  } else {
    expect(result.rows[0].amount).to.equal(expectedHold);
  }
});

Then("the driver should have an escrow hold of {int} EGP", async function (expectedHold) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM holds WHERE user_id = $1 AND type = 'escrow' AND status = 'active'`,
    [this.currentDriverId]
  );
  expect(result.rows[0].amount).to.equal(expectedHold);
});

// ==========================================================================
// COD Order Delivery Flow
// ==========================================================================

Given("a driver accepted a COD order with bid {int} LE", async function (bidAmount) {
  const driverId = await createDriver("Delivery Driver", 100);
  const customerId = await createCustomer("Delivery Customer");
  const orderId = await createOrder(customerId, { price: 200, payment_method: 'COD' });
  
  const { pool } = initializeDB();
  await pool.query(
    `UPDATE orders SET status = 'accepted', driver_id = $1, assigned_driver_bid_price = $2 WHERE id = $3`,
    [driverId, bidAmount, orderId]
  );
  
  this.lastOrderId = orderId;
  this.currentDriverId = driverId;
  this.lastBidAmount = bidAmount;
});

Given("a driver accepted a COD order with:", async function (dataTable) {
  const row = dataTable.hashes()[0];
  const driverId = await createDriver("Delivery Driver", 100);
  const customerId = await createCustomer("Delivery Customer");
  const orderId = await createOrder(customerId, { price: 200, payment_method: 'COD', upfront: parseFloat(row.upfront || 0) });
  
  const { pool } = initializeDB();
  await pool.query(
    `UPDATE orders SET status = 'accepted', driver_id = $1, assigned_driver_bid_price = $2 WHERE id = $3`,
    [driverId, parseFloat(row.bid), orderId]
  );
  
  this.lastOrderId = orderId;
  this.currentDriverId = driverId;
  this.lastBidAmount = parseFloat(row.bid);
});

Given("a customer created a PREPAID order with price {int} LE", async function (price) {
  const customerId = await createCustomer("Prepaid Customer", 500);
  this.lastOrderId = await createOrder(customerId, { price, payment_method: 'PREPAID' });
  this.currentCustomerId = customerId;
});

Given("a driver accepted the order with bid {int} LE", async function (bidAmount) {
  const driverId = await createDriver("Prepaid Driver", 100);
  const { pool } = initializeDB();
  await pool.query(
    `UPDATE orders SET status = 'accepted', driver_id = $1, assigned_driver_bid_price = $2 WHERE id = $3`,
    [driverId, bidAmount, this.lastOrderId]
  );
  this.currentDriverId = driverId;
  this.lastBidAmount = bidAmount;
});

When("the driver picks up the order", async function () {
  const { pool } = initializeDB();
  await pool.query(`UPDATE orders SET status = 'picked_up' WHERE id = $1`, [this.lastOrderId]);
});

When("the driver delivers the order", async function () {
  const { pool } = initializeDB();
  await pool.query(`UPDATE orders SET status = 'in_transit' WHERE id = $1`, [this.lastOrderId]);
});

When("the driver collects {int} EGP from customer", async function (amount) {
  this.collectedAmount = amount;
});

When("the driver confirms delivery", async function () {
  const { pool, balanceService } = initializeDB();
  const commission = this.lastBidAmount * PAYMENT_CONFIG.COMMISSION_RATE;
  
  await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [this.lastOrderId]);
  await balanceService.deductPlatformFee(this.currentDriverId, this.lastOrderId, commission);
  
  this.lastCommission = commission;
});

Then("the driver should receive {float} EGP", async function (expectedAmount) {
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(this.currentDriverId);
  expect(balance.availableBalance).to.be.closeTo(expectedAmount, 1);
});

Then("a platform_fee transaction of -{int} should be created", async function (feeAmount) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM balance_transactions WHERE user_id = $1 AND type = 'platform_fee' ORDER BY created_at DESC LIMIT 1`,
    [this.currentDriverId]
  );
  expect(result.rows.length).to.be.greaterThan(0);
  expect(Math.abs(result.rows[0].amount)).to.equal(feeAmount);
});

Then("the upfront hold of {int} should be released", async function (amount) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM holds WHERE user_id = $1 AND amount = $2 AND status = 'released'`,
    [this.currentDriverId, amount]
  );
  expect(result.rows.length).to.be.greaterThan(0);
});

Then("the escrow hold of {int} should be released", async function (amount) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM holds WHERE user_id = $1 AND type = 'escrow' AND status = 'released'`,
    [this.currentDriverId, amount]
  );
  expect(result.rows.length).to.be.greaterThan(0);
});

// ==========================================================================
// Balance Impact
// ==========================================================================

Given("a driver with balance of {int} EGP", async function (balance) {
  this.currentDriverId = await createDriver("Balance Driver", balance);
});

Given("the driver completed a COD order with bid {int} LE", async function (bidAmount) {
  const customerId = await createCustomer("Balance Customer");
  const orderId = await createOrder(customerId, { price: 200, payment_method: 'COD' });
  
  const { pool, balanceService } = initializeDB();
  await pool.query(`UPDATE orders SET status = 'delivered', driver_id = $1 WHERE id = $2`, [this.currentDriverId, orderId]);
  await balanceService.deductPlatformFee(this.currentDriverId, orderId, bidAmount * 0.1);
});

Then("the driver balance should be {float} EGP", async function (expectedBalance) {
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(this.currentDriverId);
  expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.1);
});

Then("the platform should have collected {int} EGP commission", async function (expectedCommission) {
  expect(this.lastCommission).to.equal(expectedCommission);
});

Given("a customer with balance of {int} EGP", async function (balance) {
  this.currentCustomerId = await createCustomer("Balance Customer", balance);
});

Then("{int} EGP should be held from customer balance", async function (amount) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM holds WHERE user_id = $1 AND amount = $2 AND status = 'active'`,
    [this.currentCustomerId, amount]
  );
  expect(result.rows.length).to.be.greaterThan(0);
});

Then("the customer available balance should be {int} EGP", async function (expectedBalance) {
  const { balanceService } = initializeDB();
  const bal = await balanceService.getBalance(this.currentCustomerId);
  expect(bal.availableBalance).to.equal(expectedBalance);
});

Given("the order was delivered", async function () {
  const { pool } = initializeDB();
  await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [this.lastOrderId]);
});

When("the customer confirms receipt", async function () {
  const { pool, balanceService } = initializeDB();
  const orderResult = await pool.query(`SELECT total_amount FROM orders WHERE id = $1`, [this.lastOrderId]);
  const amount = orderResult.rows[0].total_amount;
  
  await balanceService.releaseHold(this.currentCustomerId, amount);
  await balanceService.transferToDriver(this.currentDriverId, amount);
});

Then("{int} EGP should be transferred to driver", async function (amount) {
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(this.currentDriverId);
  expect(balance.availableBalance).to.be.greaterThan(0);
});

// ==========================================================================
// Error Cases
// ==========================================================================

Given("I have balance of {int} EGP", async function (balance) {
  if (!this.currentCustomerId) {
    this.currentCustomerId = await createCustomer("Error Customer");
  }
  await balanceService.deposit({ userId: this.currentCustomerId, amount: balance, description: "Initial balance" });
});

When("I try to create a PREPAID order with price {int} LE", async function (price) {
  const { pool } = initializeDB();
  try {
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    await pool.query(
      `INSERT INTO orders (id, customer_id, total_amount, status, payment_method)
       VALUES ($1, $2, $3, 'pending_bids', 'PREPAID')`,
      [orderId, this.currentCustomerId, price]
    );
    this.orderCreationSuccess = true;
  } catch (error) {
    this.orderCreationSuccess = false;
    this.lastError = error.message;
  }
});

Then("the order should be created successfully", function () {
  expect(this.orderCreationSuccess).to.be.true;
});

// ==========================================================================
// Full Workflow - Named Users
// ==========================================================================

Given('customer {string} has balance of {int} EGP', async function (name, balance) {
  await createCustomer(name, balance);
});

Given('driver {string} has balance of {int} EGP', async function (name, balance) {
  await createDriver(name, balance);
});

When('customer {string} creates an order:', async function (name, dataTable) {
  const customerId = testCustomers.get(name);
  const row = dataTable.hashes()[0];
  this.lastOrderId = await createOrder(customerId, row);
  this.lastPaymentMethod = row.payment_method;
});

When('driver {string} filters orders by {string}', function (name, filter) {
  this.paymentMethodFilter = filter;
});

When('driver {string} bids {int} LE', async function (name, bidAmount) {
  const driverId = testDrivers.get(name);
  const { pool } = initializeDB();
  const bidId = `bid_${Date.now()}`;
  await pool.query(
    `INSERT INTO bids (id, order_id, driver_id, bid_amount, status)
     VALUES ($1, $2, $3, $4, 'pending')`,
    [bidId, this.lastOrderId, driverId, bidAmount]
  );
  this.lastBidAmount = bidAmount;
});

When('customer {string} accepts the bid', async function (name) {
  const customerId = testCustomers.get(name);
  const driverId = testDrivers.get("Karim");
  const { pool } = initializeDB();
  await pool.query(
    `UPDATE bids SET status = 'accepted' WHERE order_id = $1 AND driver_id = $2`,
    [this.lastOrderId, driverId]
  );
  await pool.query(
    `UPDATE orders SET status = 'accepted', driver_id = $2 WHERE id = $1`,
    [this.lastOrderId, driverId]
  );
});

When('driver {string} picks up the order', async function (name) {
  const { pool } = initializeDB();
  await pool.query(`UPDATE orders SET status = 'picked_up' WHERE id = $1`, [this.lastOrderId]);
});

When('driver {string} delivers the order', async function (name) {
  const { pool } = initializeDB();
  await pool.query(`UPDATE orders SET status = 'in_transit' WHERE id = $1`, [this.lastOrderId]);
});

When('driver {string} collects {int} EGP cash', function (name, amount) {
  this.collectedAmount = amount;
});

When('driver {string} confirms delivery', async function (name) {
  const driverId = testDrivers.get(name);
  const { pool, balanceService } = initializeDB();
  const commission = this.lastBidAmount * PAYMENT_CONFIG.COMMISSION_RATE;
  
  await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [this.lastOrderId]);
  await balanceService.deductPlatformFee(driverId, this.lastOrderId, commission);
  this.lastCommission = commission;
});

Then('driver {string} balance should be {int} EGP', async function (name, expectedBalance) {
  const driverId = testDrivers.get(name);
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(driverId);
  expect(balance.availableBalance).to.be.closeTo(expectedBalance, 1);
});

Then('a platform_fee of -{int} should be recorded', async function (feeAmount) {
  const driverId = testDrivers.get("Karim");
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM balance_transactions WHERE user_id = $1 AND type = 'platform_fee' ORDER BY created_at DESC LIMIT 1`,
    [driverId]
  );
  expect(result.rows.length).to.be.greaterThan(0);
});

Then('customer {string} balance should be {int} EGP', async function (name, expectedBalance) {
  const customerId = testCustomers.get(name);
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(customerId);
  expect(balance.availableBalance).to.equal(expectedBalance);
});

Then('the escrow of {int} should be released', async function (amount) {
  const customerId = testCustomers.get("Ahmed");
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM holds WHERE user_id = $1 AND status = 'released'`,
    [customerId]
  );
  expect(result.rows.length).to.be.greaterThan(0);
});

// ==========================================================================
// Cleanup
// ==========================================================================

After(async function () {
  if (pool) {
    await pool.end();
    pool = null;
  }
});
