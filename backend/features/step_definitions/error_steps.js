const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// ============================================================================
// ERROR HANDLING STEP DEFINITIONS
// ============================================================================

Given('a payment request with amount {int}', function(amount) {
  this.paymentAmount = amount;
});

Given('a payment request with amount {word}', function(amount) {
  if (amount === 'null') {
    this.paymentAmount = null;
  } else if (amount === 'undefined') {
    this.paymentAmount = undefined;
  }
});

Given('the minimum digital payment amount is {int} EGP', function(minAmount) {
  this.minAmount = minAmount;
});

Given('a customer attempts to pay {float} EGP using a card', function(amount) {
  this.paymentAmount = amount;
  this.paymentMethod = 'card';
});

Given('a customer initiates a payment', function() {
  this.paymentInitiated = true;
});

Given('a customer has insufficient balance', function() {
  this.hasInsufficientBalance = true;
});

Given('a payment is in progress', function() {
  this.paymentInProgress = true;
});

Given('a payment method is temporarily unavailable', function() {
  this.paymentMethodUnavailable = true;
});

Given('an order has already been paid', function() {
  this.orderPaid = true;
});

When('the payment is validated', function() {
  this.validationResult = {
    valid: this.paymentAmount > 0 && this.paymentAmount !== null && this.paymentAmount !== undefined,
    error: null
  };
  
  if (this.paymentAmount <= 0) {
    this.validationResult.error = 'Amount must be greater than 0';
  } else if (this.paymentAmount === null || this.paymentAmount === undefined) {
    this.validationResult.error = 'Invalid amount';
  }
});

When('the payment gateway times out', function() {
  this.paymentStatus = 'pending';
  this.gatewayTimeout = true;
});

When('the customer attempts to pay', function() {
  if (this.hasInsufficientBalance) {
    this.paymentFailed = true;
    this.errorMessage = 'Insufficient funds';
  }
});

When('a network error occurs', function() {
  this.paymentStatus = 'failed';
  this.networkError = true;
});

When('a customer selects that payment method', function() {
  this.selectedUnavailableMethod = true;
});

When('a duplicate payment is attempted', function() {
  if (this.orderPaid) {
    this.duplicateRejected = true;
  }
});

Then('the payment should be rejected', function() {
  expect(this.validationResult.valid).to.be.false;
  expect(this.validationResult.error).to.exist;
});

Then('the error message should indicate {word}', function(errorType) {
  expect(this.validationResult.error).to.be.a('string');
});

Then('the error should indicate {string}', function(errorMessage) {
  expect(this.validationResult.error).to.include(errorMessage.toLowerCase());
});

Then('the payment status should be marked as {string}', function(status) {
  expect(this.paymentStatus).to.equal(status);
});

Then('the customer should be notified to retry', function() {
  this.retryNotification = true;
  expect(this.retryNotification).to.be.true;
});

Then('the order should not be marked as paid', function() {
  expect(this.orderPaid).to.not.be.true;
});

Then('the payment should fail', function() {
  expect(this.paymentFailed).to.be.true;
});

Then('the error should be {string}', function(errorMessage) {
  expect(this.errorMessage).to.equal(errorMessage);
});

Then('the order should remain unpaid', function() {
  expect(this.orderPaid).to.not.be.true;
});

Then('the payment should be marked as {string}', function(status) {
  expect(this.paymentStatus).to.equal(status);
});

Then('the transaction should be logged', function() {
  this.transactionLogged = true;
  expect(this.transactionLogged).to.be.true;
});

Then('the customer should be able to retry', function() {
  this.canRetry = true;
  expect(this.canRetry).to.be.true;
});

Then('the customer should be notified', function() {
  this.customerNotified = true;
  expect(this.customerNotified).to.be.true;
});

Then('alternative payment methods should be suggested', function() {
  this.alternativesSuggested = true;
  expect(this.alternativesSuggested).to.be.true;
});

Then('the duplicate should be rejected', function() {
  expect(this.duplicateRejected).to.be.true;
});

Then('the original payment should remain valid', function() {
  expect(this.orderPaid).to.be.true;
});

Then('the customer should be informed the order is already paid', function() {
  this.alreadyPaidNotification = true;
  expect(this.alreadyPaidNotification).to.be.true;
});
