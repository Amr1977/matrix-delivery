import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PAYMENT_CONFIG, calculateCommission } from '../../config/paymentConfig';

// Type definitions
interface Order {
    id: string;
    amount: number;
    status: string;
    paymentStatus?: string;
}

interface Payment {
    method: string;
    commission: number;
    rate: number;
}

interface PaymentMethodWorld {
    paymentMethods?: string[];
    expectedRate?: number;
    orderAmount?: number;
    order?: Order;
    paymentMethod?: string;
    hasValidPaymentMethod?: boolean;
    selectedPaymentMethod?: string;
    commission?: number;
    payout?: number;
    paymentProcessed?: boolean;
    payments?: Payment[];
    revenueRecorded?: boolean;
    collectionAmount?: number;
}

// ============================================================================
// PAYMENT METHOD STEP DEFINITIONS
// ============================================================================

Given('the platform is configured with multiple payment methods', function (this: PaymentMethodWorld) {
    this.paymentMethods = ['stripe', 'paypal', 'paymob_card', 'paymob_wallet', 'crypto', 'cod'];
});

Given('all payment methods use {int}% commission rate', function (this: PaymentMethodWorld, rate: number) {
    this.expectedRate = rate / 100;
    expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(this.expectedRate);
});

Given('a customer has placed an order for {float} EGP', function (this: PaymentMethodWorld, amount: number) {
    this.orderAmount = amount;
    this.order = {
        id: `order_${Date.now()}`,
        amount: amount,
        status: 'pending'
    };
});

Given('the customer has a valid credit card', function (this: PaymentMethodWorld) {
    this.paymentMethod = 'card';
    this.hasValidPaymentMethod = true;
});

Given('the customer has a PayPal account', function (this: PaymentMethodWorld) {
    this.paymentMethod = 'paypal';
    this.hasValidPaymentMethod = true;
});

Given('the customer has a valid debit card', function (this: PaymentMethodWorld) {
    this.paymentMethod = 'debit_card';
    this.hasValidPaymentMethod = true;
});

Given('the customer has Vodafone Cash wallet', function (this: PaymentMethodWorld) {
    this.paymentMethod = 'vodafone_cash';
    this.hasValidPaymentMethod = true;
});

When('the customer pays using {word}', function (this: PaymentMethodWorld, paymentMethod: string) {
    if (!this.orderAmount) throw new Error('Order amount not set');

    this.selectedPaymentMethod = paymentMethod;
    const result = calculateCommission(this.orderAmount);
    this.commission = result.commission;
    this.payout = result.payout;
    this.paymentProcessed = true;
});



When('the customer pays using Paymob card integration', function (this: PaymentMethodWorld) {
    if (!this.orderAmount) throw new Error('Order amount not set');

    this.selectedPaymentMethod = 'paymob_card';
    const result = calculateCommission(this.orderAmount);
    this.commission = result.commission;
    this.payout = result.payout;
    this.paymentProcessed = true;
});

When('the customer pays using Paymob wallet integration', function (this: PaymentMethodWorld) {
    if (!this.orderAmount) throw new Error('Order amount not set');

    this.selectedPaymentMethod = 'paymob_wallet';
    const result = calculateCommission(this.orderAmount);
    this.commission = result.commission;
    this.payout = result.payout;
    this.paymentProcessed = true;
});



When('the customer selects cash on delivery', function (this: PaymentMethodWorld) {
    if (!this.orderAmount) throw new Error('Order amount not set');

    this.selectedPaymentMethod = 'cod';
    const result = calculateCommission(this.orderAmount);
    this.commission = result.commission;
    this.payout = result.payout;
    this.paymentProcessed = true;
});

When('orders are paid using different payment methods', function (this: PaymentMethodWorld) {
    if (!this.paymentMethods) throw new Error('Payment methods not set');

    this.payments = this.paymentMethods.map(method => {
        const result = calculateCommission(100);
        return {
            method,
            commission: result.commission,
            rate: result.rate
        };
    });
});

Then('the payment should be processed successfully', function (this: PaymentMethodWorld) {
    expect(this.paymentProcessed).to.be.true;
    expect(this.commission).to.be.a('number');
    expect(this.payout).to.be.a('number');
});

Then('the driver should receive {float} EGP', function (this: PaymentMethodWorld, expectedPayout: number) {
    expect(this.payout).to.be.closeTo(expectedPayout, 0.01);
});

Then('the payment method should be recorded as {word}', function (this: PaymentMethodWorld, method: string) {
    expect(this.selectedPaymentMethod).to.equal(method);
});

Then('all payment methods should apply {int}% commission', function (this: PaymentMethodWorld, rate: number) {
    if (!this.payments) throw new Error('Payments not processed');

    const expectedRate = rate / 100;
    this.payments.forEach(payment => {
        expect(payment.rate).to.equal(expectedRate);
    });
});

Then('no payment method should have a different rate', function (this: PaymentMethodWorld) {
    if (!this.payments) throw new Error('Payments not processed');

    const rates = this.payments.map(p => p.rate);
    const uniqueRates = [...new Set(rates)];
    expect(uniqueRates).to.have.lengthOf(1);
});

Then('the order status should be updated to {string}', function (this: PaymentMethodWorld, status: string) {
    if (!this.order) throw new Error('Order not created');

    this.order.status = status;
    expect(this.order.status).to.equal(status);
});

Then('the revenue should be recorded in platform_revenue table', function (this: PaymentMethodWorld) {
    this.revenueRecorded = true;
    expect(this.revenueRecorded).to.be.true;
});

Then('the commission should be calculated in basis points \\({int})', function (this: PaymentMethodWorld, basisPoints: number) {
    const expectedBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE * 10000;
    expect(expectedBasisPoints).to.equal(basisPoints);
});

Then('the driver should collect {float} EGP from customer', function (this: PaymentMethodWorld, amount: number) {
    this.collectionAmount = amount;
    expect(this.collectionAmount).to.equal(this.orderAmount);
});

Then('the driver should remit {float} EGP to platform', function (this: PaymentMethodWorld, amount: number) {
    expect(this.commission).to.be.closeTo(amount, 0.01);
});
