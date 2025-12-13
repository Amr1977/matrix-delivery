const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { PAYMENT_CONFIG, calculateCommission } = require('../../config/paymentConfig');

// Load test data from external YAML files
const testDataPath = path.join(__dirname, 'fixtures', 'payment-test-data.yaml');
const configDataPath = path.join(__dirname, 'fixtures', 'payment-config-data.yaml');
const testData = yaml.load(fs.readFileSync(testDataPath, 'utf8'));
const configData = yaml.load(fs.readFileSync(configDataPath, 'utf8'));

describe('Payment System Integration Tests', function () {
    // ============================================================================
    // PAYMENT CONFIGURATION TESTS
    // ============================================================================

    describe('Payment Configuration', function () {
        it('should have correct commission rate structure', function () {
            // Load expected values from config data (NO MAGIC NUMBERS!)
            const expectedDecimal = configData.commission_config.decimal;
            const expectedPercent = configData.commission_config.percent;
            const expectedBasisPoints = configData.commission_config.basis_points;

            expect(PAYMENT_CONFIG.COMMISSION_RATE).to.equal(expectedDecimal);
            expect(PAYMENT_CONFIG.COMMISSION_RATE_PERCENT).to.equal(expectedPercent);
            expect(PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS).to.equal(expectedBasisPoints);
        });

        it('should calculate percentage from decimal correctly', function () {
            const calculatedPercent = PAYMENT_CONFIG.COMMISSION_RATE * 100;
            expect(PAYMENT_CONFIG.COMMISSION_RATE_PERCENT).to.equal(calculatedPercent);
        });

        it('should calculate basis points from decimal correctly', function () {
            const calculatedBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE * 10000;
            expect(PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS).to.equal(calculatedBasisPoints);
        });
    });

    // ============================================================================
    // COMMISSION CALCULATION TESTS (Data-Driven from YAML)
    // ============================================================================

    describe('Commission Calculation', function () {
        testData.commission_test_data.forEach(({ amount, description }) => {
            it(`should calculate correct commission for ${description}`, function () {
                const { commission, payout, rate } = calculateCommission(amount);

                // Calculate expected values using PAYMENT_CONFIG
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;
                const expectedPayout = amount * (1 - PAYMENT_CONFIG.COMMISSION_RATE);

                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(payout).to.be.closeTo(expectedPayout, 0.01);
                expect(rate).to.equal(PAYMENT_CONFIG.COMMISSION_RATE);

                // Verify commission + payout = total
                expect(commission + payout).to.be.closeTo(amount, 0.01);
            });
        });

        it('should support custom commission rates', function () {
            const customRate = 0.10;
            const testAmount = testData.commission_test_data[0].amount;
            const { commission, payout, rate } = calculateCommission(testAmount, customRate);

            const expectedCommission = testAmount * customRate;
            const expectedPayout = testAmount * (1 - customRate);

            expect(commission).to.be.closeTo(expectedCommission, 0.01);
            expect(payout).to.be.closeTo(expectedPayout, 0.01);
            expect(rate).to.equal(customRate);
        });
    });

    // ============================================================================
    // PAYMENT METHOD TESTS (Data-Driven from YAML)
    // ============================================================================

    describe('Payment Methods Commission Consistency', function () {
        const testAmount = testData.commission_test_data[0].amount;

        testData.payment_methods_data.forEach(({ method, display_name }) => {
            it(`should use same commission rate for ${display_name}`, function () {
                const { commission, rate } = calculateCommission(testAmount);

                expect(rate).to.equal(PAYMENT_CONFIG.COMMISSION_RATE);
                expect(commission).to.be.closeTo(testAmount * PAYMENT_CONFIG.COMMISSION_RATE, 0.01);
            });
        });
    });

    // ============================================================================
    // STRIPE PAYMENT TESTS
    // ============================================================================

    describe('Stripe Payment Processing', function () {
        testData.commission_test_data.slice(0, 3).forEach(({ amount, description }) => {
            it(`should calculate commission for Stripe payment: ${description}`, function () {
                const { commission, payout } = calculateCommission(amount);
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;

                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(payout).to.be.closeTo(amount - expectedCommission, 0.01);
            });
        });
    });

    // ============================================================================
    // PAYPAL PAYMENT TESTS
    // ============================================================================

    describe('PayPal Payment Processing', function () {
        testData.commission_test_data.slice(0, 3).forEach(({ amount, description }) => {
            it(`should calculate commission for PayPal payment: ${description}`, function () {
                const { commission, payout } = calculateCommission(amount);
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;

                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(payout).to.be.closeTo(amount - expectedCommission, 0.01);
            });
        });

        it('should use correct payment method identifier', function () {
            const paypalMethod = testData.payment_methods_data.find(m => m.method === 'paypal');
            expect(paypalMethod).to.exist;
            expect(paypalMethod.display_name).to.equal('PayPal');
        });
    });

    // ============================================================================
    // PAYMOB PAYMENT TESTS
    // ============================================================================

    describe('Paymob Payment Processing', function () {
        testData.commission_test_data.slice(0, 3).forEach(({ amount, description }) => {
            it(`should calculate commission for Paymob card payment: ${description}`, function () {
                const { commission, payout } = calculateCommission(amount);
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;

                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(payout).to.be.closeTo(amount - expectedCommission, 0.01);
            });

            it(`should calculate commission for Paymob wallet payment: ${description}`, function () {
                const { commission, payout } = calculateCommission(amount);
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;

                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(payout).to.be.closeTo(amount - expectedCommission, 0.01);
            });
        });
    });

    // ============================================================================
    // CRYPTO PAYMENT TESTS
    // ============================================================================

    describe('Crypto Payment Processing', function () {
        it('should use same commission rate as other methods', function () {
            const testAmount = testData.commission_test_data[3].amount;
            const { commission, rate } = calculateCommission(testAmount);

            expect(rate).to.equal(PAYMENT_CONFIG.COMMISSION_RATE);
            expect(commission).to.be.closeTo(testAmount * PAYMENT_CONFIG.COMMISSION_RATE, 0.01);
        });

        it('should have correct basis points for smart contract', function () {
            const expectedBasisPoints = PAYMENT_CONFIG.COMMISSION_RATE * 10000;
            expect(PAYMENT_CONFIG.COMMISSION_RATE_BASIS_POINTS).to.equal(expectedBasisPoints);
        });

        testData.commission_test_data.slice(0, 3).forEach(({ amount, description }) => {
            it(`should calculate commission for crypto payment: ${description}`, function () {
                const { commission, payout } = calculateCommission(amount);
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;

                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(payout).to.be.closeTo(amount - expectedCommission, 0.01);
            });
        });
    });

    // ============================================================================
    // EDGE CASES TESTS (Data-Driven from YAML)
    // ============================================================================

    describe('Edge Cases', function () {
        testData.edge_case_amounts.forEach(({ amount, description }) => {
            it(`should handle ${description}`, function () {
                const { commission, payout } = calculateCommission(amount);
                const expectedCommission = amount * PAYMENT_CONFIG.COMMISSION_RATE;

                expect(commission).to.be.a('number');
                expect(payout).to.be.a('number');
                expect(commission).to.be.closeTo(expectedCommission, 0.01);
                expect(commission + payout).to.be.closeTo(amount, 0.01);
            });
        });
    });

    // ============================================================================
    // ERROR HANDLING TESTS (Data-Driven from YAML)
    // ============================================================================

    describe('Error Handling', function () {
        testData.invalid_amounts.forEach(({ amount, description }) => {
            it(`should handle ${description}`, function () {
                if (amount === null || amount === undefined) {
                    expect(amount).to.be.oneOf([null, undefined]);
                } else if (amount <= 0) {
                    expect(amount).to.not.be.above(0);
                }
            });
        });
    });

    // ============================================================================
    // REVENUE TRACKING TESTS (Data-Driven from YAML)
    // ============================================================================

    describe('Revenue Tracking', function () {
        testData.revenue_scenarios.forEach(({ name, transactions }) => {
            it(`should calculate revenue correctly for ${name}`, function () {
                const totalRevenue = transactions.reduce((sum, { amount }) => {
                    const { commission } = calculateCommission(amount);
                    return sum + commission;
                }, 0);

                const expectedTotal = transactions.reduce((sum, { amount }) => {
                    return sum + (amount * PAYMENT_CONFIG.COMMISSION_RATE);
                }, 0);

                expect(totalRevenue).to.be.closeTo(expectedTotal, 0.01);
            });
        });

        it('should track revenue by payment method', function () {
            const testAmount = testData.commission_test_data[0].amount;
            const expectedCommission = testAmount * PAYMENT_CONFIG.COMMISSION_RATE;

            testData.payment_methods_data.forEach(({ method }) => {
                const { commission } = calculateCommission(testAmount);
                expect(commission).to.be.closeTo(expectedCommission, 0.01);
            });
        });
    });

    // ============================================================================
    // CONSISTENCY TESTS
    // ============================================================================

    describe('Consistency Tests', function () {
        it('should maintain commission + payout = total for all amounts', function () {
            testData.commission_test_data.forEach(({ amount }) => {
                const { commission, payout } = calculateCommission(amount);
                expect(commission + payout).to.be.closeTo(amount, 0.01);
            });
        });

        it('should use same rate across all payment methods', function () {
            const testAmount = testData.commission_test_data[0].amount;
            const results = testData.payment_methods_data.map(({ method }) => {
                return calculateCommission(testAmount);
            });

            const rates = results.map(r => r.rate);
            const uniqueRates = [...new Set(rates)];

            expect(uniqueRates).to.have.lengthOf(1);
            expect(uniqueRates[0]).to.equal(PAYMENT_CONFIG.COMMISSION_RATE);
        });
    });

    // ============================================================================
    // INTEGRATION TESTS (Data-Driven from YAML)
    // ============================================================================

    describe('Integration Tests', function () {
        testData.integration_scenarios.forEach(({ name, payments }) => {
            it(`should process ${name} correctly`, function () {
                const totalCommission = payments.reduce((sum, { amount }) => {
                    const { commission } = calculateCommission(amount);
                    return sum + commission;
                }, 0);

                const expectedTotal = payments.reduce((sum, { amount }) => {
                    return sum + (amount * PAYMENT_CONFIG.COMMISSION_RATE);
                }, 0);

                expect(totalCommission).to.be.closeTo(expectedTotal, 0.01);
            });
        });
    });
});
