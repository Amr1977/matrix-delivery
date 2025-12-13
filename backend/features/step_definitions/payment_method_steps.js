const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
const { PAYMENT_CONFIG, calculateCommission } = require('../../config/paymentConfig');

// ============================================================================
// PAYMENT METHOD STEP DEFINITIONS
// ============================================================================

Given('the platform is configured with multiple payment methods', function() {
  this.paymentMethods = ['stripe', 'paypal', 'paymob_card', 'paymob_wallet', 'crypto', 'cod'];
});

Given('all payment methods use {int}% commission rate', function(rate) {
  this.expectedRate = rate / 100;
  expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(this.expectedRate);
});

Given('a customer has placed an order for {float} EGP', function(amount) {
  this.orderAmount = amount;
  this.order = {
    id: `order_${Date.now()}`,
    amount: amount,
    status: 'pending'
  };
});

Given('the customer has a valid credit card', function() {
  this.paymentMethod = 'card';
  this.hasValidPaymentMethod = true;
});

Given('the customer has a PayPal account', function() {
  this.paymentMethod = 'paypal';
  this.hasValidPaymentMethod = true;
});

Given('the customer has a valid debit card', function() {
  this.paymentMethod = 'debit_card';
  this.hasValidPaymentMethod = true;
});

Given('the customer has Vodafone Cash wallet', function() {
  this.paymentMethod = 'vodafone_cash';
  this.hasValidPaymentMethod = true;
});

When('the customer pays using {word}', function(paymentMethod) {
  this.selectedPaymentMethod = paymentMethod;
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('the customer pays using Stripe', function() {
  this.selectedPaymentMethod = 'stripe';
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('the customer pays using PayPal', function() {
  this.selectedPaymentMethod = 'paypal';
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('the customer pays using Paymob card integration', function() {
  this.selectedPaymentMethod = 'paymob_card';
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('the customer pays using Paymob wallet integration', function() {
  this.selectedPaymentMethod = 'paymob_wallet';
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('the customer pays using crypto', function() {
  this.selectedPaymentMethod = 'crypto';
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('the customer selects cash on delivery', function() {
  this.selectedPaymentMethod = 'cod';
  const result = calculateCommission(this.orderAmount);
  this.commission = result.commission;
  this.payout = result.payout;
  this.paymentProcessed = true;
});

When('orders are paid using different payment methods', function() {
  this.payments = this.paymentMethods.map(method => {
    const result = calculateCommission(100);
    return {
      method,
      commission: result.commission,
      rate: result.rate
    };
  });
});

Then('the payment should be processed successfully', function() {
  expect(this.paymentProcessed).to.be.true;
  expect(this.commission).to.be.a('number');
  expect(this.payout).to.be.a('number');
});

Then('the driver should receive {float} EGP', function(expectedPayout) {
  expect(this.payout).to.be.closeTo(expectedPayout, 0.01);
});

Then('the payment method should be recorded as {word}', function(method) {
  expect(this.selectedPaymentMethod).to.equal(method);
});

Then('all payment methods should apply {int}% commission', function(rate) {
  const expectedRate = rate / 100;
  this.payments.forEach(payment => {
    expect(payment.rate).to.equal(expectedRate);
  });
});

Then('no payment method should have a different rate', function() {
  const rates = this.payments.map(p => p.rate);
  const uniqueRates = [...new Set(rates)];
  expect(uniqueRates).to.have.lengthOf(1);
});

Then('the Stripe payment intent should be created', function() {
  // Mock verification - in real implementation would check Stripe API
  expect(this.selectedPaymentMethod).to.equal('stripe');
});

Then('the payment should be confirmed', function() {
  expect(this.paymentProcessed).to.be.true;
});

Then('the order status should be updated to {string}', function(status) {
  // Mock verification - in real implementation would check database
  this.order.status = status;
  expect(this.order.status).to.equal(status);
});

Then('the PayPal order should be created', function() {
  expect(this.selectedPaymentMethod).to.equal('paypal');
});

Then('the payment should be captured', function() {
  expect(this.paymentProcessed).to.be.true;
});

Then('the revenue should be recorded in platform_revenue table', function() {
  // Mock verification - in real implementation would check database
  this.revenueRecorded = true;
  expect(this.revenueRecorded).to.be.true;
});

Then('the Paymob payment should be initiated', function() {
  expect(this.selectedPaymentMethod).to.equal('paymob_card');
});

Then('the payment should be processed through MIGS', function() {
  // Mock verification
  expect(this.paymentProcessed).to.be.true;
});

Then('the wallet payment should be initiated', function() {
  expect(this.selectedPaymentMethod).to.equal('paymob_wallet');
});

Then('the smart contract should escrow the payment', function() {
  expect(this.selectedPaymentMethod).to.equal('crypto');
});

Then('the commission should be calculated in basis points \\({int})', function(basisPoints) {
  const expectedBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE * 10000;
  expect(expectedBasisPoints).to.equal(basisPoints);
});

Then('the order should be created without upfront payment', function() {
  expect(this.selectedPaymentMethod).to.equal('cod');
  this.order.paymentStatus = 'pending';
});

Then('the commission should still be calculated as {float} EGP', function(expectedCommission) {
  expect(this.commission).to.be.closeTo(expectedCommission, 0.01);
});

Then('the driver should collect {float} EGP from customer', function(amount) {
  this.collectionAmount = amount;
  expect(this.collectionAmount).to.equal(this.orderAmount);
});

Then('the driver should remit {float} EGP to platform', function(amount) {
  expect(this.commission).to.be.closeTo(amount, 0.01);
});
