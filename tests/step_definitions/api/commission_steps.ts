import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PAYMENT_CONFIG, calculateCommission } from '../../../backend/config/paymentConfig';

// Type definitions for World context
interface PaymentWorld {
    expectedCommissionRate?: number;
    expectedPayoutRate?: number;
    orderAmount?: number;
    customRate?: number;
    commission?: number;
    payout?: number;
    rate?: number;
}

// ============================================================================
// PAYMENT COMMISSION STEP DEFINITIONS
// ============================================================================

Given('the platform commission rate is {int}%', function (this: PaymentWorld, rate: number) {
    this.expectedCommissionRate = rate / 100;
    expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(this.expectedCommissionRate);
});

Given('the driver payout rate is {int}%', function (this: PaymentWorld, rate: number) {
    this.expectedPayoutRate = rate / 100;
    const actualPayoutRate = 1 - PAYMENT_CONFIG.COMMISSION_RATE;
    expect(actualPayoutRate).to.equal(this.expectedPayoutRate);
});

Given('an order with amount {float} EGP', function (this: PaymentWorld, amount: number) {
    this.orderAmount = amount;
});

Given('a custom commission rate of {int}%', function (this: PaymentWorld, rate: number) {
    this.customRate = rate / 100;
});

When('the commission is calculated', function (this: PaymentWorld) {
    if (!this.orderAmount) throw new Error('Order amount not set');

    const result = calculateCommission(this.orderAmount);
    this.commission = result.commission;
    this.payout = result.payout;
    this.rate = result.rate;
});

When('the commission is calculated with custom rate', function (this: PaymentWorld) {
    if (!this.orderAmount || !this.customRate) {
        throw new Error('Order amount or custom rate not set');
    }

    const result = calculateCommission(this.orderAmount, this.customRate);
    this.commission = result.commission;
    this.payout = result.payout;
    this.rate = result.rate;
});

Then('the platform commission should be {float} EGP', function (this: PaymentWorld, expectedCommission: number) {
    expect(this.commission).to.be.closeTo(expectedCommission, 0.01);
});

Then('the driver payout should be {float} EGP', function (this: PaymentWorld, expectedPayout: number) {
    expect(this.payout).to.be.closeTo(expectedPayout, 0.01);
});

Then('the commission plus payout should equal {float} EGP', function (this: PaymentWorld, total: number) {
    if (!this.commission || !this.payout) throw new Error('Commission or payout not calculated');

    const sum = this.commission + this.payout;
    expect(sum).to.be.closeTo(total, 0.01);
});

Then('the commission plus payout should equal the original amount within {float} EGP',
    function (this: PaymentWorld, tolerance: number) {
        if (!this.commission || !this.payout || !this.orderAmount) {
            throw new Error('Required values not set');
        }

        const sum = this.commission + this.payout;
        expect(sum).to.be.closeTo(this.orderAmount, tolerance);
    }
);
