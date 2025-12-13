const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { PAYMENT_CONFIG, calculateCommission } = require('../../config/paymentConfig');

// ============================================================================
// PAYMENT COMMISSION STEP DEFINITIONS
// ============================================================================

Given('the platform commission rate is {int}%', function(rate) {
  this.expectedCommissionRate = rate / 100;
  expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(this.expectedCommissionRate);
});

Given('the driver payout rate is {int}%', function(rate) {
  this.expectedPayoutRate = rate / 100;
  const actualPayoutRate = 1 - PAYMENT_CONFIG.COMMISSION_RATE;
  expect(actualPayoutRate).to.equal(this.expectedPayoutRate);
});

Given('an order with amount {float} EGP', function(amount) {
  this.orderAmount = amount;
});

Given('a custom commission rate of {int}%', function(rate) {
  this.customRate = rate / 100;
});

When('the commission is calculated', function() {
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.rate = result.rate;
});

When('the commission is calculated with custom rate', function() {
  const result = calculateCommission(this.orderAmount, this.customRate);
  this.commission = result.commission;
  this.payout = result.payout;
  this.rate = result.rate;
});

Then('the platform commission should be {float} EGP', function(expectedCommission) {
  expect(this.commission).to.be.closeTo(expectedCommission, 0.01);
});

Then('the driver payout should be {float} EGP', function(expectedPayout) {
  expect(this.payout).to.be.closeTo(expectedPayout, 0.01);
});

Then('the commission plus payout should equal {float} EGP', function(total) {
  const sum = this.commission + this.payout;
  expect(sum).to.be.closeTo(total, 0.01);
});

Then('the commission plus payout should equal the original amount within {float} EGP', function(tolerance) {
  const sum = this.commission + this.payout;
  expect(sum).to.be.closeTo(this.orderAmount, tolerance);
});
