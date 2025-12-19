/**
 * COD Commission Integration Tests
 * 
 * Tests the complete flow of COD orders with commission deduction,
 * debt management, and order blocking.
 * 
 * @module tests/integration/codCommission.test
 */

import { Pool } from 'pg';
import { BalanceService } from '../../services/balanceService';
import { PAYMENT_CONFIG } from '../../config/paymentConfig';

describe('COD Commission Integration Tests', () => {
    let pool: Pool;
    let balanceService: BalanceService;
    let testCustomerId: number;
    let testDriverId: number;

    beforeAll(async () => {
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
        });

        balanceService = new BalanceService(pool);

        const timestamp = Date.now();

        // Create test customer
        const customerResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
             VALUES ('Test Customer', $1, 'hashed', '01111111111', 'customer', 'Egypt', 'Cairo', 'Nasr City')
             RETURNING id`,
            [`cod.customer.${timestamp}@test.com`]
        );
        testCustomerId = customerResult.rows[0].id;

        // Create test driver
        const driverResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area, vehicle_type)
             VALUES ('Test Driver', $1, 'hashed', '01222222222', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
             RETURNING id`,
            [`cod.driver.${timestamp}@test.com`]
        );
        testDriverId = driverResult.rows[0].id;

        // Create balances
        await balanceService.createBalance(testCustomerId);
        await balanceService.createBalance(testDriverId);
    });

    afterAll(async () => {
        // Cleanup
        try {
            await pool.query('DELETE FROM balance_holds WHERE user_id IN ($1, $2)', [testCustomerId, testDriverId]);
            await pool.query('DELETE FROM balance_transactions WHERE user_id IN ($1, $2)', [testCustomerId, testDriverId]);
            await pool.query('DELETE FROM payments WHERE payer_id = $1 OR payee_id = $2', [testCustomerId, testDriverId]);
            await pool.query('DELETE FROM orders WHERE customer_id = $1 OR driver_id = $2', [testCustomerId, testDriverId]);
            await pool.query('DELETE FROM user_balances WHERE user_id IN ($1, $2)', [testCustomerId, testDriverId]);
            await pool.query(`DELETE FROM users WHERE email LIKE 'cod.%@test.com'`);
        } catch (error) {
            console.error('Cleanup error:', error.message);
        }

        await pool.end();
    });

    beforeEach(async () => {
        // Reset balances and clean transactions
        await pool.query('DELETE FROM balance_holds WHERE user_id IN ($1, $2)', [testCustomerId, testDriverId]);
        await pool.query('DELETE FROM balance_transactions WHERE user_id IN ($1, $2)', [testCustomerId, testDriverId]);
        await pool.query('DELETE FROM payments WHERE payer_id = $1 OR payee_id = $2', [testCustomerId, testDriverId]);
        await pool.query('DELETE FROM orders WHERE customer_id = $1 OR driver_id = $2', [testCustomerId, testDriverId]);

        await pool.query(
            `UPDATE user_balances 
             SET available_balance = 0,
                 pending_balance = 0,
                 held_balance = 0,
                 lifetime_deposits = 0,
                 lifetime_withdrawals = 0,
                 lifetime_earnings = 0,
                 total_transactions = 0
             WHERE user_id IN ($1, $2)`,
            [testCustomerId, testDriverId]
        );
    });

    // ==========================================================================
    // BASIC COD FLOW TESTS
    // ==========================================================================

    describe('Basic COD Flow', () => {
        it('should complete full COD order with commission deduction', async () => {
            // 1. Create order
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status,
                    payment_method
                ) VALUES ($1, $2, 100, 'delivered', 'cod')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );
            const orderId = orderResult.rows[0].id;

            // 2. Calculate commission (15%)
            const totalAmount = 100;
            const commission = totalAmount * PAYMENT_CONFIG.COMMISSION_RATE;
            const driverPayout = totalAmount - commission;

            expect(commission).toBe(15);
            expect(driverPayout).toBe(85);

            // 3. Deduct commission from driver balance
            const commissionResult = await balanceService.deductCommission(
                testDriverId,
                orderId,
                commission
            );

            expect(commissionResult.balance.availableBalance).toBe(-15);

            // 4. Record payment
            await pool.query(
                `INSERT INTO payments (
                    id, order_id, amount, currency, payment_method, status,
                    payer_id, payee_id, platform_fee, driver_earnings, processed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
                [
                    `PAY-${Date.now()}`,
                    orderId,
                    totalAmount,
                    'EGP',
                    'cash',
                    'completed',
                    testCustomerId,
                    testDriverId,
                    commission,
                    driverPayout
                ]
            );

            // 5. Verify payment record
            const paymentResult = await pool.query(
                'SELECT * FROM payments WHERE order_id = $1',
                [orderId]
            );

            expect(paymentResult.rows.length).toBe(1);
            expect(parseFloat(paymentResult.rows[0].platform_fee)).toBe(15);
            expect(parseFloat(paymentResult.rows[0].driver_earnings)).toBe(85);

            // 6. Verify driver can still accept orders (debt is -15, above -200 threshold)
            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);
        });

        it('should handle COD order with driver having positive balance', async () => {
            // Give driver initial balance
            await balanceService.deposit({
                userId: testDriverId,
                amount: 500,
                description: 'Initial balance'
            });

            // Create and complete order
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status,
                    payment_method
                ) VALUES ($1, $2, 100, 'delivered', 'cod')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );

            // Deduct commission
            await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);

            // Balance should be 500 - 15 = 485
            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(485);
        });
    });

    // ==========================================================================
    // DEBT CREATION TESTS
    // ==========================================================================

    describe('Debt Creation', () => {
        it('should create debt when commission exceeds balance', async () => {
            // Driver has 10 EGP
            await balanceService.deposit({
                userId: testDriverId,
                amount: 10,
                description: 'Small balance'
            });

            // Order with 100 EGP (15 EGP commission)
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status
                ) VALUES ($1, $2, 100, 'delivered')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );

            await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-5);
        });

        it('should accumulate debt from multiple orders', async () => {
            // Complete 5 orders, each creating 15 EGP debt
            for (let i = 0; i < 5; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-75);
        });

        it('should allow debt up to threshold (-200 EGP)', async () => {
            // Create debt of -150 EGP (below threshold)
            for (let i = 0; i < 10; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-150);

            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);
        });
    });

    // ==========================================================================
    // ORDER BLOCKING TESTS
    // ==========================================================================

    describe('Order Blocking', () => {
        it('should block driver at exact debt threshold (-200 EGP)', async () => {
            // Create debt of exactly -200 EGP
            for (let i = 0; i < 13; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            // Add small amount to reach exactly -200
            await balanceService.deposit({
                userId: testDriverId,
                amount: 5,
                description: 'Adjustment'
            });

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-190);

            // One more order to reach -200
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status
                ) VALUES ($1, $2, 66.67, 'delivered')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );

            await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 10);

            const finalBalance = await balanceService.getBalance(testDriverId);
            expect(finalBalance.availableBalance).toBe(-200);

            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(false);
            expect(canAccept.reason).toContain('below minimum threshold');
        });

        it('should block driver with excessive debt', async () => {
            // Create debt of -250 EGP (exceeds threshold)
            for (let i = 0; i < 17; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBeLessThan(-200);

            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(false);
        });

        it('should provide clear error message when driver is blocked', async () => {
            // Create excessive debt
            for (let i = 0; i < 20; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            const result = await balanceService.canAcceptOrders(testDriverId);

            expect(result.canAccept).toBe(false);
            expect(result.reason).toBeDefined();
            expect(result.reason).toContain('Balance');
            expect(result.reason).toContain('below minimum threshold');
            expect(result.reason).toContain('-200 EGP');
            expect(result.currentBalance).toBe(-300);
            expect(result.debtThreshold).toBe(-200);
        });
    });

    // ==========================================================================
    // DEBT RECOVERY TESTS
    // ==========================================================================

    describe('Debt Recovery', () => {
        it('should allow orders after driver clears debt', async () => {
            // Create debt
            for (let i = 0; i < 15; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            // Verify blocked
            let canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(false);

            // Deposit to clear debt
            await balanceService.deposit({
                userId: testDriverId,
                amount: 300,
                description: 'Clear debt'
            });

            // Verify unblocked
            canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(75); // 300 - 225 debt
        });

        it('should allow partial debt recovery', async () => {
            // Create debt of -100 EGP
            for (let i = 0; i < 7; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (
                        customer_id, 
                        assigned_driver_user_id, 
                        assigned_driver_bid_price,
                        status
                    ) VALUES ($1, $2, 100, 'delivered')
                    RETURNING id`,
                    [testCustomerId, testDriverId]
                );

                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            // Deposit 50 EGP (partial recovery)
            await balanceService.deposit({
                userId: testDriverId,
                amount: 50,
                description: 'Partial payment'
            });

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-55);

            // Should still be able to accept orders
            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);
        });
    });

    // ==========================================================================
    // EDGE CASES
    // ==========================================================================

    describe('Edge Cases', () => {
        it('should handle zero commission correctly', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status
                ) VALUES ($1, $2, 100, 'delivered')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );

            await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 0);

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(0);
        });

        it('should handle very small commission amounts', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status
                ) VALUES ($1, $2, 10, 'delivered')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );

            await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 1.5);

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-1.5);
        });

        it('should handle large commission amounts', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (
                    customer_id, 
                    assigned_driver_user_id, 
                    assigned_driver_bid_price,
                    status
                ) VALUES ($1, $2, 1000, 'delivered')
                RETURNING id`,
                [testCustomerId, testDriverId]
            );

            await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 150);

            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-150);

            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true); // Still above -200 threshold
        });

        it('should maintain transaction history correctly', async () => {
            // Multiple operations
            await balanceService.deposit({
                userId: testDriverId,
                amount: 100,
                description: 'Deposit'
            });

            const order1 = await pool.query(
                `INSERT INTO orders (customer_id, assigned_driver_user_id, assigned_driver_bid_price, status)
                 VALUES ($1, $2, 100, 'delivered') RETURNING id`,
                [testCustomerId, testDriverId]
            );
            await balanceService.deductCommission(testDriverId, order1.rows[0].id, 15);

            const order2 = await pool.query(
                `INSERT INTO orders (customer_id, assigned_driver_user_id, assigned_driver_bid_price, status)
                 VALUES ($1, $2, 100, 'delivered') RETURNING id`,
                [testCustomerId, testDriverId]
            );
            await balanceService.deductCommission(testDriverId, order2.rows[0].id, 15);

            const transactions = await balanceService.getTransactionHistory({
                userId: testDriverId
            });

            expect(transactions.length).toBe(3); // 1 deposit + 2 commissions
            expect(transactions[0].type).toBe('commission_deduction');
            expect(transactions[1].type).toBe('commission_deduction');
            expect(transactions[2].type).toBe('deposit');
        });
    });

    // ==========================================================================
    // REALISTIC SCENARIOS
    // ==========================================================================

    describe('Realistic Scenarios', () => {
        it('should handle typical driver day: 10 orders with mixed balance', async () => {
            // Driver starts with 50 EGP
            await balanceService.deposit({
                userId: testDriverId,
                amount: 50,
                description: 'Starting balance'
            });

            // Complete 10 orders of varying amounts
            const orderAmounts = [80, 120, 95, 150, 75, 110, 85, 130, 90, 100];

            for (const amount of orderAmounts) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (customer_id, assigned_driver_user_id, assigned_driver_bid_price, status)
                     VALUES ($1, $2, $3, 'delivered') RETURNING id`,
                    [testCustomerId, testDriverId, amount]
                );

                const commission = amount * 0.15;
                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, commission);
            }

            // Total commission: (80+120+95+150+75+110+85+130+90+100) * 0.15 = 163.5
            // Final balance: 50 - 163.5 = -113.5
            const balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBeCloseTo(-113.5, 1);

            // Should still be able to accept orders (above -200 threshold)
            const canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);
        });

        it('should handle driver reaching threshold and recovering', async () => {
            // Scenario: Driver accumulates debt, gets blocked, deposits, continues working

            // Phase 1: Accumulate debt to blocking point
            for (let i = 0; i < 14; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (customer_id, assigned_driver_user_id, assigned_driver_bid_price, status)
                     VALUES ($1, $2, 100, 'delivered') RETURNING id`,
                    [testCustomerId, testDriverId]
                );
                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            let balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-210);

            let canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(false);

            // Phase 2: Driver deposits to recover
            await balanceService.deposit({
                userId: testDriverId,
                amount: 250,
                description: 'Debt recovery'
            });

            balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(40);

            canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);

            // Phase 3: Continue working
            for (let i = 0; i < 3; i++) {
                const orderResult = await pool.query(
                    `INSERT INTO orders (customer_id, assigned_driver_user_id, assigned_driver_bid_price, status)
                     VALUES ($1, $2, 100, 'delivered') RETURNING id`,
                    [testCustomerId, testDriverId]
                );
                await balanceService.deductCommission(testDriverId, orderResult.rows[0].id, 15);
            }

            balance = await balanceService.getBalance(testDriverId);
            expect(balance.availableBalance).toBe(-5);

            canAccept = await balanceService.canAcceptOrders(testDriverId);
            expect(canAccept.canAccept).toBe(true);
        });
    });
});
