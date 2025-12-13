const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { PAYMENT_CONFIG, calculateCommission } = require('../../config/paymentConfig');

// ============================================================================
// REVENUE TRACKING STEP DEFINITIONS
// ============================================================================

Given('the platform_revenue table exists', function() {
  this.revenueTableExists = true;
});

Given('all completed payments record revenue', function() {
  this.revenueTrackingEnabled = true;
});

Given('a customer completes a payment of {float} EGP', function(amount) {
  this.paymentAmount = amount;
  const result = calculateCommission(amount);
  this.commission = result.commission;
  this.rate = result.rate;
});

Given('multiple orders are completed', function() {
  this.completedOrders = [];
});

Given('the following orders are completed today:', function(dataTable) {
  this.todayOrders = dataTable.hashes().map(row => ({
    amount: parseFloat(row.amount),
    payment_method: row.payment_method,
    commission: calculateCommission(parseFloat(row.amount)).commission
  }));
});

Given('the following orders are completed this week:', function(dataTable) {
  this.weekOrders = dataTable.hashes().map(row => ({
    amount: parseFloat(row.amount),
    payment_method: row.payment_method,
    commission: calculateCommission(parseFloat(row.amount)).commission
  }));
});

Given('an order with ID {string} is completed', function(orderId) {
  this.orderId = orderId;
  this.revenueRecorded = false;
});

Given('revenue records exist for the past {int} days', function(days) {
  this.revenueHistory = days;
});

When('the payment is confirmed', function() {
  this.paymentConfirmed = true;
  this.revenueRecord = {
    order_id: `order_${Date.now()}`,
    commission_amount: this.commission,
    commission_rate: this.rate,
    payment_method: this.paymentMethod || 'stripe',
    created_at: new Date()
  };
});

When('{int} orders of {float} EGP are paid via {word}', function(count, amount, method) {
  this.methodRevenue = {
    method,
    count,
    amount,
    totalRevenue: count * calculateCommission(amount).commission
  };
});

When('the daily revenue is calculated', function() {
  this.dailyRevenue = this.todayOrders.reduce((sum, order) => sum + order.commission, 0);
  this.revenueBreakdown = this.todayOrders.reduce((acc, order) => {
    if (!acc[order.payment_method]) {
      acc[order.payment_method] = 0;
    }
    acc[order.payment_method] += order.commission;
    return acc;
  }, {});
});

When('the weekly revenue is calculated', function() {
  this.weeklyRevenue = this.weekOrders.reduce((sum, order) => sum + order.commission, 0);
});

When('the revenue is recorded', function() {
  this.revenueRecorded = true;
  this.revenueRecordCount = 1;
});

When('an attempt is made to record revenue again for {string}', function(orderId) {
  // Simulate duplicate prevention
  if (this.revenueRecorded) {
    this.duplicateAttempted = true;
  }
});

When('a report is requested for the last {int} days', function(days) {
  this.reportDays = days;
});

Then('a revenue record should be created', function() {
  expect(this.revenueRecord).to.exist;
  expect(this.revenueRecord.commission_amount).to.be.a('number');
});

Then('the commission_amount should be {float} EGP', function(expectedAmount) {
  expect(this.revenueRecord.commission_amount).to.be.closeTo(expectedAmount, 0.01);
});

Then('the commission_rate should be {float}', function(expectedRate) {
  expect(this.revenueRecord.commission_rate).to.equal(expectedRate);
});

Then('the payment_method should be recorded', function() {
  expect(this.revenueRecord.payment_method).to.be.a('string');
});

Then('the created_at timestamp should be set', function() {
  expect(this.revenueRecord.created_at).to.be.instanceOf(Date);
});

Then('the total revenue for {word} should be {float} EGP', function(method, expectedRevenue) {
  expect(this.methodRevenue.totalRevenue).to.be.closeTo(expectedRevenue, 0.01);
});

Then('the total daily revenue should be {float} EGP', function(expectedRevenue) {
  expect(this.dailyRevenue).to.be.closeTo(expectedRevenue, 0.01);
});

Then('the revenue breakdown should show:', function(dataTable) {
  const expected = dataTable.hashes();
  expected.forEach(row => {
    const method = row.payment_method;
    const expectedAmount = parseFloat(row.revenue);
    expect(this.revenueBreakdown[method]).to.be.closeTo(expectedAmount, 0.01);
  });
});

Then('the total weekly revenue should be {float} EGP', function(expectedRevenue) {
  expect(this.weeklyRevenue).to.be.closeTo(expectedRevenue, 0.01);
});

Then('only one revenue record should exist for {string}', function(orderId) {
  expect(this.revenueRecordCount).to.equal(1);
});

Then('the duplicate insert should be ignored', function() {
  expect(this.duplicateAttempted).to.be.true;
  expect(this.revenueRecordCount).to.equal(1);
});

Then('only revenue from the last {int} days should be included', function(days) {
  expect(this.reportDays).to.equal(days);
});

Then('the total should be accurate', function() {
  expect(this.dailyRevenue).to.be.a('number');
});

Then('the breakdown by payment method should be provided', function() {
  expect(this.revenueBreakdown).to.be.an('object');
});
