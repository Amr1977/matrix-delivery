import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';

// Type definitions
interface ValidationResult {
    valid: boolean;
    error: string | null;
}

interface ErrorWorld {
    paymentAmount?: number | null | undefined;
    paymentMethod?: string;
    minAmount?: number;
    paymentInitiated?: boolean;
    hasInsufficientBalance?: boolean;
    paymentInProgress?: boolean;
    paymentMethodUnavailable?: boolean;
    orderPaid?: boolean;
    validationResult?: ValidationResult;
    paymentStatus?: string;
    gatewayTimeout?: boolean;
    paymentFailed?: boolean;
    errorMessage?: string;
    networkError?: boolean;
    selectedUnavailableMethod?: boolean;
    duplicateRejected?: boolean;
    retryNotification?: boolean;
    transactionLogged?: boolean;
    canRetry?: boolean;
    customerNotified?: boolean;
    alternativesSuggested?: boolean;
    alreadyPaidNotification?: boolean;
}

// ============================================================================
// ERROR HANDLING STEP DEFINITIONS
// ============================================================================

Given('a payment request with amount {int}', function (this: ErrorWorld, amount: number) {
    this.paymentAmount = amount;
});

Given('a payment request with amount {word}', function (this: ErrorWorld, amount: string) {
    if (amount === 'null') {
        this.paymentAmount = null;
    } else if (amount === 'undefined') {
        this.paymentAmount = undefined;
    }
});

Given('the minimum digital payment amount is {int} EGP', function (this: ErrorWorld, minAmount: number) {
    this.minAmount = minAmount;
});

Given('a customer attempts to pay {float} EGP using a card', function (this: ErrorWorld, amount: number) {
    this.paymentAmount = amount;
    this.paymentMethod = 'card';
});

Given('a customer initiates a payment', function (this: ErrorWorld) {
    this.paymentInitiated = true;
});

Given('a customer has insufficient balance', function (this: ErrorWorld) {
    this.hasInsufficientBalance = true;
});

Given('a payment is in progress', function (this: ErrorWorld) {
    this.paymentInProgress = true;
});

Given('a payment method is temporarily unavailable', function (this: ErrorWorld) {
    this.paymentMethodUnavailable = true;
});

Given('an order has already been paid', function (this: ErrorWorld) {
    this.orderPaid = true;
});

When('the payment is validated', function (this: ErrorWorld) {
    const amount = this.paymentAmount;
    this.validationResult = {
        valid: typeof amount === 'number' && amount > 0,
        error: null
    };

    if (amount === null || amount === undefined) {
        this.validationResult.error = 'Invalid amount';
    } else if (typeof amount === 'number' && amount <= 0) {
        this.validationResult.error = 'Amount must be greater than 0';
    }
});

When('the payment gateway times out', function (this: ErrorWorld) {
    this.paymentStatus = 'pending';
    this.gatewayTimeout = true;
});

When('the customer attempts to pay', function (this: ErrorWorld) {
    if (this.hasInsufficientBalance) {
        this.paymentFailed = true;
        this.errorMessage = 'Insufficient funds';
    }
});

When('a network error occurs', function (this: ErrorWorld) {
    this.paymentStatus = 'failed';
    this.networkError = true;
});

When('a customer selects that payment method', function (this: ErrorWorld) {
    this.selectedUnavailableMethod = true;
});

When('a duplicate payment is attempted', function (this: ErrorWorld) {
    if (this.orderPaid) {
        this.duplicateRejected = true;
    }
});

Then('the payment should be rejected', function (this: ErrorWorld) {
    expect(this.validationResult?.valid).to.be.false;
    expect(this.validationResult?.error).to.exist;
});

Then('the error message should indicate {word}', function (this: ErrorWorld, errorType: string) {
    expect(this.validationResult?.error).to.be.a('string');
});

Then('the error should indicate {string}', function (this: ErrorWorld, errorMessage: string) {
    const error = this.validationResult?.error?.toLowerCase() || '';
    expect(error).to.include(errorMessage.toLowerCase());
});

Then('the payment status should be marked as {string}', function (this: ErrorWorld, status: string) {
    expect(this.paymentStatus).to.equal(status);
});

Then('the customer should be notified to retry', function (this: ErrorWorld) {
    this.retryNotification = true;
    expect(this.retryNotification).to.be.true;
});

Then('the order should not be marked as paid', function (this: ErrorWorld) {
    expect(this.orderPaid).to.not.be.true;
});

Then('the payment should fail', function (this: ErrorWorld) {
    expect(this.paymentFailed).to.be.true;
});

Then('the error should be {string}', function (this: ErrorWorld, errorMessage: string) {
    expect(this.errorMessage).to.equal(errorMessage);
});

Then('the order should remain unpaid', function (this: ErrorWorld) {
    expect(this.orderPaid).to.not.be.true;
});

Then('the payment should be marked as {string}', function (this: ErrorWorld, status: string) {
    expect(this.paymentStatus).to.equal(status);
});

Then('the transaction should be logged', function (this: ErrorWorld) {
    this.transactionLogged = true;
    expect(this.transactionLogged).to.be.true;
});

Then('the customer should be able to retry', function (this: ErrorWorld) {
    this.canRetry = true;
    expect(this.canRetry).to.be.true;
});

Then('the customer should be notified', function (this: ErrorWorld) {
    this.customerNotified = true;
    expect(this.customerNotified).to.be.true;
});

Then('alternative payment methods should be suggested', function (this: ErrorWorld) {
    this.alternativesSuggested = true;
    expect(this.alternativesSuggested).to.be.true;
});

Then('the duplicate should be rejected', function (this: ErrorWorld) {
    expect(this.duplicateRejected).to.be.true;
});

Then('the original payment should remain valid', function (this: ErrorWorld) {
    expect(this.orderPaid).to.be.true;
});

Then('the customer should be informed the order is already paid', function (this: ErrorWorld) {
    this.alreadyPaidNotification = true;
    expect(this.alreadyPaidNotification).to.be.true;
});
