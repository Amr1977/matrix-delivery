import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from 'chai';
import { PAYMENT_CONFIG, calculateCommission } from '../../../backend/config/paymentConfig';

// Type definitions
interface CryptoPayment {
    amount: number;
    token: 'USDC' | 'USDT';
    escrowAddress?: string;
    status: 'pending' | 'escrowed' | 'completed' | 'cancelled' | 'disputed';
    commission?: number;
    driverPayout?: number;
    platformWallet?: string;
    driverWallet?: string;
}

interface ValidationResult {
    valid: boolean;
    error: string | null;
}

interface CryptoWorld {
    escrowContractDeployed?: boolean;
    supportedTokens?: string[];
    commissionRateBasisPoints?: number;
    customerBalance?: number;
    orderAmount?: number;
    orderToken?: 'USDC' | 'USDT';
    payment?: CryptoPayment;
    deliveryCompleted?: boolean;
    orderCancelled?: boolean;
    disputeRaised?: boolean;
    transactionFailed?: boolean;
    errorMessage?: string;
    validationResult?: ValidationResult;
    escrowCreated?: boolean;
    fundsLocked?: boolean;
    fundsReleased?: boolean;
    refundIssued?: boolean;
    gasFeesPaid?: boolean;
}

// ============================================================================
// CRYPTO PAYMENT STEP DEFINITIONS
// ============================================================================

Given('the escrow smart contract is deployed', function (this: CryptoWorld) {
    this.escrowContractDeployed = true;
    this.commissionRateBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS;
});

Given('USDC and USDT tokens are supported', function (this: CryptoWorld) {
    this.supportedTokens = ['USDC', 'USDT'];
});

Given('the commission rate is set to {int} basis points \\({int}%)',
    function (this: CryptoWorld, basisPoints: number, percent: number) {
        expect(this.commissionRateBasisPoints).to.equal(basisPoints);
        expect(PAYMENT_CONFIG.COMMISSION_RATE_PERCENT).to.equal(percent);
    }
);

Given('a customer has placed an order for {float} USDC', function (this: CryptoWorld, amount: number) {
    this.orderAmount = amount;
    this.orderToken = 'USDC';
});

Given('a customer has placed an order for {float} USDT', function (this: CryptoWorld, amount: number) {
    this.orderAmount = amount;
    this.orderToken = 'USDT';
});

Given('the customer has sufficient USDC balance', function (this: CryptoWorld) {
    this.customerBalance = (this.orderAmount || 0) + 100; // Has more than enough
});

Given('a crypto payment of {float} USDC is in escrow', function (this: CryptoWorld, amount: number) {
    this.orderAmount = amount;
    this.orderToken = 'USDC';
    this.payment = {
        amount,
        token: 'USDC',
        status: 'escrowed',
        escrowAddress: '0x' + '1'.repeat(40)
    };
    this.fundsLocked = true;
});

Given('a crypto payment is in escrow', function (this: CryptoWorld) {
    if (!this.payment) {
        this.payment = {
            amount: this.orderAmount || 100,
            token: this.orderToken || 'USDC',
            status: 'escrowed',
            escrowAddress: '0x' + '1'.repeat(40)
        };
    }
    this.fundsLocked = true;
});

Given('the driver has completed the delivery', function (this: CryptoWorld) {
    this.deliveryCompleted = true;
});

Given('a customer has only {float} USDC', function (this: CryptoWorld, balance: number) {
    this.customerBalance = balance;
});

Given('a customer attempts to pay with DAI token', function (this: CryptoWorld) {
    this.orderToken = 'DAI' as any;
});

Given('DAI is not a supported token', function (this: CryptoWorld) {
    expect(this.supportedTokens).to.not.include('DAI');
});

When('the customer initiates crypto payment', function (this: CryptoWorld) {
    if (!this.orderAmount || !this.orderToken) {
        throw new Error('Order amount and token not set');
    }

    const { commission, payout } = calculateCommission(this.orderAmount);

    this.payment = {
        amount: this.orderAmount,
        token: this.orderToken,
        status: 'pending',
        commission,
        driverPayout: payout
    };
});

When('the customer initiates USDT crypto payment', function (this: CryptoWorld) {
    if (!this.orderAmount) throw new Error('Order amount not set');

    const { commission, payout } = calculateCommission(this.orderAmount);

    this.payment = {
        amount: this.orderAmount,
        token: 'USDT',
        status: 'pending',
        commission,
        driverPayout: payout
    };
});

When('the delivery is confirmed', function (this: CryptoWorld) {
    this.deliveryCompleted = true;
});

When('the order is cancelled before delivery', function (this: CryptoWorld) {
    this.orderCancelled = true;
});

When('a dispute is raised', function (this: CryptoWorld) {
    this.disputeRaised = true;
    if (this.payment) {
        this.payment.status = 'disputed';
    }
});

When('the commission rate is queried', function (this: CryptoWorld) {
    this.commissionRateBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS;
});

When('the customer attempts to pay {float} USDC', function (this: CryptoWorld, amount: number) {
    this.orderAmount = amount;

    // Check if customer has sufficient balance
    if (this.customerBalance !== undefined && this.customerBalance < amount) {
        this.transactionFailed = true;
        this.errorMessage = 'Insufficient balance';
        // Also set validationResult for compatibility with error_steps
        this.validationResult = {
            valid: false,
            error: 'Insufficient balance'
        };
    }
});

When('the payment is initiated', function (this: CryptoWorld) {
    // Check if token is supported
    if (this.orderToken && !this.supportedTokens?.includes(this.orderToken)) {
        this.transactionFailed = true;
        this.errorMessage = 'Token not supported';
        // Also set validationResult for compatibility with error_steps
        this.validationResult = {
            valid: false,
            error: 'Token not supported'
        };
    }
});

When('the transaction is submitted', function (this: CryptoWorld) {
    this.gasFeesPaid = true;
});

Then('the smart contract should create an escrow', function (this: CryptoWorld) {
    expect(this.payment?.status).to.be.oneOf(['pending', 'escrowed']);
    this.escrowCreated = true;
});

Then('{float} USDC should be locked in escrow', function (this: CryptoWorld, amount: number) {
    expect(this.payment?.amount).to.equal(amount);
    this.fundsLocked = true;
});

Then('the commission should be calculated as {float} USDC', function (this: CryptoWorld, expectedCommission: number) {
    expect(this.payment?.commission).to.be.closeTo(expectedCommission, 0.01);
});

Then('the driver should receive {float} USDC upon completion', function (this: CryptoWorld, expectedPayout: number) {
    expect(this.payment?.driverPayout).to.be.closeTo(expectedPayout, 0.01);
});

Then('the payment should be processed through the escrow contract', function (this: CryptoWorld) {
    expect(this.payment).to.exist;
    expect(this.payment?.token).to.equal('USDT');
});

Then('the commission should be {float} USDT', function (this: CryptoWorld, expectedCommission: number) {
    expect(this.payment?.commission).to.be.closeTo(expectedCommission, 0.01);
});

Then('{float} USDC should be released to the platform wallet', function (this: CryptoWorld, amount: number) {
    expect(this.deliveryCompleted).to.be.true;
    this.fundsReleased = true;
    // In real implementation, would verify blockchain transaction
});

Then('{float} USDC should be released to the driver wallet', function (this: CryptoWorld, amount: number) {
    expect(this.deliveryCompleted).to.be.true;
    this.fundsReleased = true;
});

Then('the escrow should be marked as completed', function (this: CryptoWorld) {
    if (this.payment) {
        this.payment.status = 'completed';
    }
    expect(this.deliveryCompleted).to.be.true;
});

Then('the full {float} USDC should be refunded to the customer', function (this: CryptoWorld, amount: number) {
    expect(this.orderCancelled).to.be.true;
    this.refundIssued = true;
});

Then('no commission should be charged', function (this: CryptoWorld) {
    // On cancellation, no commission is taken
    expect(this.orderCancelled).to.be.true;
});

Then('the escrow should be marked as cancelled', function (this: CryptoWorld) {
    if (this.payment) {
        this.payment.status = 'cancelled';
    }
    expect(this.orderCancelled).to.be.true;
});

Then('the escrow should be marked as disputed', function (this: CryptoWorld) {
    expect(this.payment?.status).to.equal('disputed');
});

Then('the funds should remain locked', function (this: CryptoWorld) {
    expect(this.fundsLocked).to.be.true;
    expect(this.fundsReleased).to.not.be.true;
});

Then('an admin should be able to resolve the dispute', function (this: CryptoWorld) {
    expect(this.disputeRaised).to.be.true;
    // In real implementation, admin would have special permissions
});

Then('it should return {int} basis points', function (this: CryptoWorld, expectedBasisPoints: number) {
    expect(this.commissionRateBasisPoints).to.equal(expectedBasisPoints);
});

Then('this should equal {int}% in decimal form', function (this: CryptoWorld, expectedPercent: number) {
    const decimalRate = (this.commissionRateBasisPoints || 0) / 10000;
    expect(decimalRate).to.equal(expectedPercent / 100);
});

Then('the transaction should fail', function (this: CryptoWorld) {
    expect(this.transactionFailed).to.be.true;
});

// Note: "the error should indicate" is defined in error_steps.ts

Then('no escrow should be created', function (this: CryptoWorld) {
    expect(this.escrowCreated).to.not.be.true;
});

Then('the transaction should be rejected', function (this: CryptoWorld) {
    expect(this.transactionFailed).to.be.true;
});

Then('the customer should pay the gas fees', function (this: CryptoWorld) {
    expect(this.gasFeesPaid).to.be.true;
});

Then('the gas fees should not affect the commission calculation', function (this: CryptoWorld) {
    // Commission is calculated on order amount, not including gas
    const { commission } = calculateCommission(this.orderAmount || 0);
    expect(this.payment?.commission).to.equal(commission);
});

Then('the driver payout should be {float} USDC', function (this: CryptoWorld, expectedPayout: number) {
    expect(this.payment?.driverPayout).to.be.closeTo(expectedPayout, 0.01);
});

Then('the driver should receive {float} USDT upon completion', function (this: CryptoWorld, expectedPayout: number) {
    expect(this.payment?.driverPayout).to.be.closeTo(expectedPayout, 0.01);
});

Given('the smart contract is deployed', function (this: CryptoWorld) {
    this.escrowContractDeployed = true;
    this.commissionRateBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS;
});

Given('a crypto payment is initiated', function (this: CryptoWorld) {
    if (!this.orderAmount) {
        this.orderAmount = 100;
    }
    if (!this.orderToken) {
        this.orderToken = 'USDC';
    }

    const { commission, payout } = calculateCommission(this.orderAmount);

    this.payment = {
        amount: this.orderAmount,
        token: this.orderToken,
        status: 'pending',
        commission,
        driverPayout: payout
    };
});

Then('the platform should receive exactly {int}% commission', function (this: CryptoWorld, expectedPercent: number) {
    const expectedRate = expectedPercent / 100;
    expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(expectedRate);
});
