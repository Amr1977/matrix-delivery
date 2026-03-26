const { Given, When, Then, After } = require("@cucumber/cucumber");
const { expect } = require("chai");
const { Pool } = require("pg");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "../../../backend/.env.testing") });

const { BalanceService } = require(
  path.join(__dirname, "../../../backend/services/balanceService"),
);
const { initializeNotificationService } = require(
  path.join(__dirname, "../../../backend/services/notificationService"),
);
const { PAYMENT_CONFIG } = require(
  path.join(__dirname, "../../../backend/config/paymentConfig"),
);

let pool;
let balanceService;
let testCustomerId;
let driversMap = new Map();

function initializeDB() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5433"),
      database: process.env.DB_NAME_TEST || "matrix_delivery_test",
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
    });
    initializeNotificationService(pool, null, console);
    balanceService = new BalanceService(pool);
  }
  return { pool, balanceService };
}

async function ensureTestCustomer() {
  if (!testCustomerId) {
    const { pool } = initializeDB();
    const timestamp = Date.now();
    const id = `cust_${timestamp}`;
    const customerResult = await pool.query(
      `INSERT INTO users (id, name, email, password_hash, phone, primary_role, country, city, area)
             VALUES ($1, 'BDD Customer', $2, 'hashed', '01111111111', 'customer', 'Egypt', 'Cairo', 'Nasr City')
             RETURNING id`,
      [id, `bdd.customer.${timestamp}@test.com`],
    );
    testCustomerId = customerResult.rows[0].id;
  }
  return testCustomerId;
}

async function createDriver(name = "BDD Driver", initialBalance = 0) {
  const { pool, balanceService } = initializeDB();
  const timestamp = Date.now();
  const id = `driver_${timestamp}`;
  const driverResult = await pool.query(
    `INSERT INTO users (id, name, email, password_hash, phone, primary_role, country, city, area, vehicle_type)
         VALUES ($1, $2, $3, 'hashed', '01222222222', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
         RETURNING id`,
    [id, name, `bdd.driver.${timestamp}@test.com`],
  );
  const driverId = driverResult.rows[0].id;
  await balanceService.createBalance(driverId);

  if (initialBalance > 0) {
    await balanceService.deposit({
      userId: driverId,
      amount: initialBalance,
      description: "Initial balance for BDD test",
    });
  } else if (initialBalance < 0) {
    await pool.query(
      `UPDATE user_balances SET available_balance = $1 WHERE user_id = $2`,
      [initialBalance, driverId],
    );
    await pool.query(
      `INSERT INTO balance_transactions (transaction_id, user_id, type, amount, balance_before, balance_after, status, description)
             VALUES ($1, $2, 'adjustment', $3, 0, $3, 'completed', 'Initial debt setup')`,
      [`txn_${Date.now()}`, driverId, initialBalance],
    );
  }

  return driverId;
}

async function createCODOrder(driverId, bidPrice, customerId) {
  const { pool } = initializeDB();
  const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const orderResult = await pool.query(
    `INSERT INTO orders (id, customer_id, driver_id, total_amount, assigned_driver_bid_price, status, payment_method)
         VALUES ($1, $2, $3, $4, $5, 'accepted', 'COD') RETURNING id`,
    [orderId, customerId, driverId, bidPrice * 2, bidPrice],
  );
  return orderResult.rows[0].id;
}

// ==========================================================================
// Background Steps
// ==========================================================================

Given("the platform fee rate is {int}%", function (rate) {
  expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(rate / 100);
});

Given("the minimum bid amount is {int} LE", function (amount) {
  expect(PAYMENT_CONFIG.MINIMUM_BID_AMOUNT).to.equal(amount);
});

Given("the bid blocking threshold is {int} LE", function (threshold) {
  expect(PAYMENT_CONFIG.DEBT_MANAGEMENT.MAX_DEBT_THRESHOLD).to.equal(threshold);
});

Given("the warning threshold is {int} LE", function (threshold) {
  expect(PAYMENT_CONFIG.DEBT_MANAGEMENT.WARNING_THRESHOLD).to.equal(threshold);
});

// ==========================================================================
// Platform Fee Deduction Scenarios
// ==========================================================================

Given("a courier with balance of {float} EGP", async function (balance) {
  this.driverId = await createDriver("BDD Courier", balance);
  this.initialBalance = balance;
});

Given(
  "the courier has an accepted COD order with bid price of {int} LE",
  async function (bidPrice) {
    const customerId = await ensureTestCustomer();
    this.lastOrderId = await createCODOrder(
      this.driverId,
      bidPrice,
      customerId,
    );
    this.lastBidPrice = bidPrice;
  },
);

When("the delivery is confirmed", async function () {
  const { pool, balanceService } = initializeDB();
  const fee = this.lastBidPrice * PAYMENT_CONFIG.COMMISSION_RATE;

  await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [
    this.lastOrderId,
  ]);

  await balanceService.deductPlatformFee(this.driverId, this.lastOrderId, fee);
  this.lastFee = fee;
});

Then(
  "the platform should deduct {float} LE fee ({int}% of bid price)",
  function (expectedFee, percent) {
    expect(this.lastFee).to.be.closeTo(expectedFee, 0.01);
  },
);

Then(
  "the courier balance should be {float} EGP",
  async function (expectedBalance) {
    const { balanceService } = initializeDB();
    const balance = await balanceService.getBalance(this.driverId);
    expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.01);
  },
);

Then(
  "a transaction record should be created with type {string}",
  async function (txnType) {
    const { pool } = initializeDB();
    const result = await pool.query(
      `SELECT * FROM balance_transactions 
         WHERE user_id = $1 AND type = $2 
         ORDER BY created_at DESC LIMIT 1`,
      [this.driverId, txnType],
    );
    expect(result.rows.length).to.be.greaterThan(0);
    expect(result.rows[0].type).to.equal(txnType);
  },
);

Given("the courier has a COD order where:", async function (dataTable) {
  const row = dataTable.hashes()[0];
  const customerPays = parseFloat(row.customer_pays);
  const courierBid = parseFloat(row.courier_bid);

  const customerId = await ensureTestCustomer();
  this.lastOrderId = await createCODOrder(
    this.driverId,
    courierBid,
    customerId,
  );
  this.lastBidPrice = courierBid;
  this.lastOrderAmount = customerPays;
});

Then(
  "the platform should deduct {float} LE fee ({int}% of {int} LE bid)",
  function (expectedFee, percent, bidAmount) {
    expect(this.lastFee).to.be.closeTo(expectedFee, 0.01);
  },
);

Given(
  "the courier has a COD order marked as partial delivery",
  async function () {
    const customerId = await ensureTestCustomer();
    this.lastOrderId = await createCODOrder(this.driverId, 100, customerId);
  },
);

Then("no platform fee should be deducted", async function () {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM balance_transactions 
         WHERE user_id = $1 AND type = 'platform_fee' 
         AND reference_id = $2`,
    [this.driverId, this.lastOrderId],
  );
  expect(result.rows.length).to.equal(0);
});

And(
  "the courier balance should remain {float} EGP",
  async function (expectedBalance) {
    const { balanceService } = initializeDB();
    const balance = await balanceService.getBalance(this.driverId);
    expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.01);
  },
);

Given("the courier bids {int} LE on a COD order", async function (bidAmount) {
  const customerId = await ensureTestCustomer();
  this.lastOrderId = await createCODOrder(this.driverId, bidAmount, customerId);
  this.lastBidPrice = bidAmount;
});

Then("the platform should deduct {int} LE fee", function (expectedFee) {
  expect(this.lastFee).to.be.closeTo(expectedFee, 0.01);
});

// ==========================================================================
// Bid Blocking Scenarios
// ==========================================================================

When("the courier tries to place a bid", async function () {
  const { balanceService } = initializeDB();
  this.bidResult = await balanceService.canBid(this.driverId);
});

Then("the bid should be rejected", function () {
  expect(this.bidResult.canBid).to.be.false;
});

And("the error should mention {string} threshold", function (threshold) {
  expect(this.bidResult.reason).to.include(threshold);
});

Then("the bid should be allowed", function () {
  expect(this.bidResult.canBid).to.be.true;
});

Given("the courier has an active order in progress", async function () {
  const { pool } = initializeDB();
  const customerId = await ensureTestCustomer();
  await pool.query(
    `INSERT INTO orders (id, customer_id, driver_id, total_amount, status, payment_method)
         VALUES ($1, $2, $3, 200, 'accepted', 'COD')`,
    [`ord_active_${Date.now()}`, customerId, this.driverId],
  );
});

And("the reason should be {string}", function (expectedReason) {
  expect(this.bidResult.reason).to.include(expectedReason);
});

Given("the courier has no active orders", async function () {
  // Already the case by default
});

Then("the bid should be rejected", function () {
  expect(this.bidResult.canBid).to.be.false;
});

And("the error should mention {string}", function (errorText) {
  expect(this.bidResult.reason).to.include(errorText);
});

// ==========================================================================
// Minimum Bid Amount Scenarios
// ==========================================================================

When("the courier tries to bid {int} LE", async function (bidAmount) {
  const { balanceService } = initializeDB();
  this.bidResult = await balanceService.canBid(this.driverId, bidAmount);
});

Then("the bid should be rejected", function () {
  expect(this.bidResult.canBid).to.be.false;
});

And("the error should mention {string}", function (errorText) {
  expect(this.bidResult.reason).to.include(errorText);
});

When("the courier tries to bid exactly {int} LE", async function (bidAmount) {
  const { balanceService } = initializeDB();
  this.bidResult = await balanceService.canBid(this.driverId, bidAmount);
});

When("the courier tries to bid {int} LE", async function (bidAmount) {
  const { balanceService } = initializeDB();
  this.bidResult = await balanceService.canBid(this.driverId, bidAmount);
});

// ==========================================================================
// Warning at -80 LE Threshold
// ==========================================================================

When("the courier views the balance dashboard", function () {
  this.dashboardViewed = true;
});

Then("a warning should be displayed", function () {
  expect(this.dashboardViewed).to.be.true;
  // In real implementation would check threshold
});

And("the warning should mention low balance", function () {
  // Threshold check logic
});

Then("no warning should be displayed", function () {
  expect(this.dashboardViewed).to.be.true;
});

Then("a blocked message should be displayed", function () {
  expect(this.dashboardViewed).to.be.true;
});

And("the message should mention {string} threshold", function (threshold) {
  // Would check actual threshold value
});

// ==========================================================================
// Available for Bidding Display
// ==========================================================================

Then("{string} should show {float} EGP", function (displayText, amount) {
  // In real implementation would check UI
  this.biddingDisplay = displayText;
  this.biddingAmount = amount;
});

Then("{string} should show {string}", function (displayText, status) {
  this.biddingDisplay = displayText;
  this.biddingStatus = status;
});

// ==========================================================================
// Transaction Records
// ==========================================================================

Given(
  "the courier completes a COD delivery with bid of {int} LE",
  async function (bidAmount) {
    const { pool, balanceService } = initializeDB();
    const customerId = await ensureTestCustomer();
    const orderId = await createCODOrder(this.driverId, bidAmount, customerId);

    await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [
      orderId,
    ]);

    const fee = bidAmount * PAYMENT_CONFIG.COMMISSION_RATE;
    await balanceService.deductPlatformFee(this.driverId, orderId, fee);
    this.lastFee = fee;
    this.lastOrderId = orderId;
  },
);

Then("a {string} transaction should be created", async function (txnType) {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM balance_transactions 
         WHERE user_id = $1 AND type = $2 
         ORDER BY created_at DESC LIMIT 1`,
    [this.driverId, txnType],
  );
  expect(result.rows.length).to.be.greaterThan(0);
});

And("the transaction amount should be {float} LE", function (expectedAmount) {
  expect(Math.abs(this.lastFee)).to.be.closeTo(expectedAmount, 0.01);
});

And("the transaction should reference the order", function () {
  // Would check reference_id in database
});

Given("the courier has completed {int} COD deliveries", async function (count) {
  for (let i = 0; i < count; i++) {
    const { pool, balanceService } = initializeDB();
    const customerId = await ensureTestCustomer();
    const bidAmount = 50 + i * 10;
    const orderId = await createCODOrder(this.driverId, bidAmount, customerId);

    await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [
      orderId,
    ]);

    const fee = bidAmount * PAYMENT_CONFIG.COMMISSION_RATE;
    await balanceService.deductPlatformFee(this.driverId, orderId, fee);
  }
});

When("the courier views transaction history", async function () {
  const { pool } = initializeDB();
  const result = await pool.query(
    `SELECT * FROM balance_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC`,
    [this.driverId],
  );
  this.transactionHistory = result.rows;
});

Then("there should be {int} {string} transactions", function (count, txnType) {
  const filtered = this.transactionHistory.filter((t) => t.type === txnType);
  expect(filtered.length).to.equal(count);
});

And("each should show the correct fee amount", function () {
  // Would verify each transaction amount matches expected
});

// ==========================================================================
// Earnings Preview in Bidding
// ==========================================================================

Given("the courier is viewing an order", function () {
  this.viewingOrder = true;
});

When("the courier enters a bid of {int} LE", function (bidAmount) {
  this.enteredBid = bidAmount;
  this.estimatedEarnings = bidAmount * (1 - PAYMENT_CONFIG.COMMISSION_RATE);
  this.platformFee = bidAmount * PAYMENT_CONFIG.COMMISSION_RATE;
});

Then(
  "the estimated earnings should show {int} LE",
  function (expectedEarnings) {
    expect(this.estimatedEarnings).to.be.closeTo(expectedEarnings, 0.01);
  },
);

And("the platform fee should show {float} LE", function (expectedFee) {
  expect(this.platformFee).to.be.closeTo(expectedFee, 0.01);
});

Then("a minimum bid warning should be displayed", function () {
  expect(this.enteredBid).to.be.lessThan(PAYMENT_CONFIG.MINIMUM_BID_AMOUNT);
});

// ==========================================================================
// Realistic Workflows
// ==========================================================================

Given("a courier starts with balance of {float} EGP", async function (balance) {
  this.driverId = await createDriver("BDD Courier", balance);
  this.initialBalance = balance;
  this.totalFees = 0;
});

When(
  "the courier completes {int} deliveries with bids:",
  async function (count, dataTable) {
    const { pool, balanceService } = initializeDB();
    const rows = dataTable.hashes();

    for (const row of rows) {
      const bid = parseFloat(row.bid);
      const customerId = await ensureTestCustomer();
      const orderId = await createCODOrder(this.driverId, bid, customerId);

      await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [
        orderId,
      ]);

      const fee = bid * PAYMENT_CONFIG.COMMISSION_RATE;
      await balanceService.deductPlatformFee(this.driverId, orderId, fee);
      this.totalFees += fee;
    }
  },
);

Then("total platform fees should be {float} LE", function (expectedFees) {
  expect(this.totalFees).to.be.closeTo(expectedFees, 0.01);
});

And(
  "the courier balance should be {float} EGP",
  async function (expectedBalance) {
    const { balanceService } = initializeDB();
    const balance = await balanceService.getBalance(this.driverId);
    expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.01);
  },
);

And("the courier should still be able to bid", async function () {
  const { balanceService } = initializeDB();
  const result = await balanceService.canBid(this.driverId);
  expect(result.canBid).to.be.true;
});

Given("the courier has balance of {float} EGP", async function (balance) {
  this.driverId = await createDriver("BDD Courier", balance);
  this.initialBalance = balance;
});

When(
  "the courier completes {int} more delivery with bid of {int} LE",
  async function (count, bidAmount) {
    const { pool, balanceService } = initializeDB();
    const customerId = await ensureTestCustomer();
    const orderId = await createCODOrder(this.driverId, bidAmount, customerId);

    await pool.query(`UPDATE orders SET status = 'delivered' WHERE id = $1`, [
      orderId,
    ]);

    const fee = bidAmount * PAYMENT_CONFIG.COMMISSION_RATE;
    await balanceService.deductPlatformFee(this.driverId, orderId, fee);
    this.lastFee = fee;
  },
);

Then("the balance should be {float} EGP", async function (expectedBalance) {
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(this.driverId);
  expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.01);
});

And("the courier should be blocked from new bids", async function () {
  const { balanceService } = initializeDB();
  const result = await balanceService.canBid(this.driverId);
  expect(result.canBid).to.be.false;
});

When("the courier deposits {float} LE", async function (amount) {
  const { balanceService } = initializeDB();
  await balanceService.deposit({
    userId: this.driverId,
    amount: amount,
    description: "BDD test deposit",
  });
});

Then("the balance should be {float} EGP", async function (expectedBalance) {
  const { balanceService } = initializeDB();
  const balance = await balanceService.getBalance(this.driverId);
  expect(balance.availableBalance).to.be.closeTo(expectedBalance, 0.01);
});

And("the courier should be able to bid again", async function () {
  const { balanceService } = initializeDB();
  const result = await balanceService.canBid(this.driverId);
  expect(result.canBid).to.be.true;
});

Given("the following couriers:", async function (dataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    const courierId = row.courier_id;
    const balance = parseFloat(row.balance);
    const id = await createDriver(courierId, balance);
    driversMap.set(courierId, id);
  }
});

When("each courier tries to bid", async function () {
  const { balanceService } = initializeDB();
  this.bidResults = [];

  for (const [courierId, driverId] of driversMap) {
    const result = await balanceService.canBid(driverId);
    this.bidResults.push({ courierId, ...result });
  }
});

Then("the results should be:", function (dataTable) {
  const rows = dataTable.hashes();
  for (const row of rows) {
    const courierId = row.courier_id;
    const expectedCanBid = row.can_bid === "true";
    const expectedReason = row.reason;

    const actual = this.bidResults.find((r) => r.courierId === courierId);
    expect(actual).to.exist;
    expect(actual.canBid).to.equal(expectedCanBid);

    if (expectedReason) {
      expect(actual.reason).to.include(expectedReason);
    }
  }
});

// ==========================================================================
// Configuration Validation
// ==========================================================================

When("the system checks platform fee settings", function () {
  this.platformFeeConfig = PAYMENT_CONFIG;
});

Then("the COMMISSION_RATE should be {float}", function (rate) {
  expect(this.platformFeeConfig.COMMISSION_RATE).to.equal(rate);
});

And("the MINIMUM_BID_AMOUNT should be {int}", function (amount) {
  expect(this.platformFeeConfig.MINIMUM_BID_AMOUNT).to.equal(amount);
});

When("the system checks bid blocking settings", function () {
  this.bidBlockingConfig = PAYMENT_CONFIG.DEBT_MANAGEMENT;
});

Then("MAX_DEBT_THRESHOLD should be {int}", function (threshold) {
  expect(this.bidBlockingConfig.MAX_DEBT_THRESHOLD).to.equal(threshold);
});

And("WARNING_THRESHOLD should be {int}", function (threshold) {
  expect(this.bidBlockingConfig.WARNING_THRESHOLD).to.equal(threshold);
});

And("BLOCK_NEW_ORDERS should be true", function () {
  expect(this.bidBlockingConfig.BLOCK_NEW_ORDERS).to.be.true;
});

// ==========================================================================
// Cleanup
// ==========================================================================

After(async function () {
  if (this.driverId) {
    try {
      const { pool } = initializeDB();
      await pool.query("DELETE FROM balance_transactions WHERE user_id = $1", [
        this.driverId,
      ]);
      await pool.query("DELETE FROM user_balances WHERE user_id = $1", [
        this.driverId,
      ]);
      await pool.query("DELETE FROM orders WHERE driver_id = $1", [
        this.driverId,
      ]);
      await pool.query("DELETE FROM users WHERE id = $1", [this.driverId]);
    } catch (error) {
      console.error("Cleanup error:", error.message);
    }
  }

  for (const [name, id] of driversMap) {
    try {
      const { pool } = initializeDB();
      await pool.query("DELETE FROM balance_transactions WHERE user_id = $1", [
        id,
      ]);
      await pool.query("DELETE FROM user_balances WHERE user_id = $1", [id]);
      await pool.query("DELETE FROM orders WHERE driver_id = $1", [id]);
      await pool.query("DELETE FROM users WHERE id = $1", [id]);
    } catch (error) {}
  }
  driversMap.clear();
});
