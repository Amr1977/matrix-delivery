/**
 * Balance Service - Comprehensive Test Suite
 * 
 * Tests all balance operations with edge cases and error scenarios.
 * Covers deposits, withdrawals, order payments, driver earnings, holds, and validations.
 * 
 * @module tests/services/balanceService.test
 * @version 1.0.0
 */

import { Pool } from 'pg';
import { BalanceService } from '../../services/balanceService';
import {
    TransactionType,
    TransactionStatus,
    HoldStatus,
    Currency,
} from '../../types/balance';

describe('BalanceService', () => {
    let pool: Pool;
    let balanceService: BalanceService;
    let testUserId: number;
    let testDriverId: number;
    let testAdminId: number;

    // ==========================================================================
    // SETUP AND TEARDOWN
    // ==========================================================================

    beforeAll(async () => {
        // Initialize database connection
        pool = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432'),
            database: process.env.DB_NAME_TEST || 'matrix_delivery_test',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
        });

        balanceService = new BalanceService(pool);

        // Use unique emails to avoid conflicts
        const timestamp = Date.now();

        // Create test users
        const customerResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
       VALUES ('Test Customer', $1, 'hashed', '01234567890', 'customer', 'Egypt', 'Cairo', 'Nasr City')
       RETURNING id`,
            [`test.customer.${timestamp}@test.com`]
        );
        testUserId = customerResult.rows[0].id;

        const driverResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area, vehicle_type)
       VALUES ('Test Driver', $1, 'hashed', '01234567891', 'driver', 'Egypt', 'Cairo', 'Nasr City', 'car')
       RETURNING id`,
            [`test.driver.${timestamp}@test.com`]
        );
        testDriverId = driverResult.rows[0].id;

        // Create admin user for freeze/unfreeze operations
        const adminResult = await pool.query(
            `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
       VALUES ('Test Admin', $1, 'hashed', '01234567892', 'admin', 'Egypt', 'Cairo', 'Nasr City')
       RETURNING id`,
            [`test.admin.${timestamp}@test.com`]
        );
        testAdminId = adminResult.rows[0].id;

        // Create balances
        await balanceService.createBalance(testUserId);
        await balanceService.createBalance(testDriverId);
    });

    afterAll(async () => {
        // Cleanup test data (order matters due to foreign keys)
        try {
            // Delete holds first (they reference transactions)
            await pool.query('DELETE FROM balance_holds WHERE user_id IN ($1, $2)', [
                testUserId,
                testDriverId,
            ]);
            // Then delete transactions
            await pool.query('DELETE FROM balance_transactions WHERE user_id IN ($1, $2)', [
                testUserId,
                testDriverId,
            ]);
            // Then delete balances
            await pool.query('DELETE FROM user_balances WHERE user_id IN ($1, $2)', [
                testUserId,
                testDriverId,
            ]);
            // Delete orders
            await pool.query('DELETE FROM orders WHERE customer_id = $1 OR driver_id = $2', [testUserId, testDriverId]);
            // Finally delete users
            await pool.query(`DELETE FROM users WHERE email LIKE '%@test.com'`);
        } catch (error) {
            console.error('Cleanup error:', error.message);
        }

        await pool.end();
    });

    beforeEach(async () => {
        // Aggressive cleanup: delete ALL test data by email pattern (except admin)
        // This ensures no leftover holds/transactions from previous tests

        // 1. Delete all test holds first (they reference transactions) - exclude admin
        await pool.query(`DELETE FROM balance_holds 
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com' AND email NOT LIKE 'test.admin%')`);

        // 2. Delete all test transactions (they reference orders, so keep orders) - exclude admin
        await pool.query(`DELETE FROM balance_transactions 
            WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test.com' AND email NOT LIKE 'test.admin%')`);

        // 3. Reset balances for test users
        await pool.query(
            `UPDATE user_balances 
       SET available_balance = 0,
           pending_balance = 0,
           held_balance = 0,
           lifetime_deposits = 0,
           lifetime_withdrawals = 0,
           lifetime_earnings = 0,
           total_transactions = 0,
           is_frozen = FALSE,
           freeze_reason = NULL,
           frozen_at = NULL,
           frozen_by = NULL
       WHERE user_id IN ($1, $2)`,
            [testUserId, testDriverId]
        );
    });

    // ==========================================================================
    // BALANCE OPERATIONS TESTS
    // ==========================================================================

    describe('getBalance', () => {
        it('should get user balance', async () => {
            const balance = await balanceService.getBalance(testUserId);

            expect(balance).toBeDefined();
            expect(balance.userId).toBe(testUserId);
            expect(balance.availableBalance).toBe(0);
            expect(balance.currency).toBe(Currency.EGP);
        });

        it('should throw error for non-existent user', async () => {
            await expect(balanceService.getBalance(999999)).rejects.toThrow('Balance not found');
        });
    });

    describe('createBalance', () => {
        it('should create balance for new user', async () => {
            // Create a new test user
            const userResult = await pool.query(
                `INSERT INTO users (name, email, password, phone, primary_role, country, city, area)
         VALUES ('New User', 'new.user@test.com', 'hashed', '01234567892', 'customer', 'Egypt', 'Cairo', 'Nasr City')
         RETURNING id`
            );
            const newUserId = userResult.rows[0].id;

            const balance = await balanceService.createBalance(newUserId);

            expect(balance.userId).toBe(newUserId);
            expect(balance.availableBalance).toBe(0);
            expect(balance.currency).toBe(Currency.EGP);

            // Cleanup
            await pool.query('DELETE FROM user_balances WHERE user_id = $1', [newUserId]);
            await pool.query('DELETE FROM users WHERE id = $1', [newUserId]);
        });

        it('should not create duplicate balance', async () => {
            const balance1 = await balanceService.createBalance(testUserId);
            const balance2 = await balanceService.createBalance(testUserId);

            expect(balance1.userId).toBe(balance2.userId);
        });
    });

    // ==========================================================================
    // DEPOSIT TESTS
    // ==========================================================================

    describe('deposit', () => {
        it('should deposit funds successfully', async () => {
            const result = await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Test deposit',
            });

            expect(result.transaction).toBeDefined();
            expect(result.transaction.type).toBe(TransactionType.DEPOSIT);
            expect(result.transaction.amount).toBe(1000);
            expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);

            expect(result.balance.availableBalance).toBe(1000);
            expect(result.balance.lifetimeDeposits).toBe(1000);
            expect(result.balance.totalTransactions).toBe(1);
        });

        it('should reject negative deposit amount', async () => {
            await expect(
                balanceService.deposit({
                    userId: testUserId,
                    amount: -100,
                    description: 'Invalid deposit',
                })
            ).rejects.toThrow('Deposit amount must be positive');
        });

        it('should reject deposit below minimum', async () => {
            await expect(
                balanceService.deposit({
                    userId: testUserId,
                    amount: 0.5,
                    description: 'Too small deposit',
                })
            ).rejects.toThrow('Minimum deposit amount');
        });

        it('should reject deposit above maximum', async () => {
            await expect(
                balanceService.deposit({
                    userId: testUserId,
                    amount: 200000,
                    description: 'Too large deposit',
                })
            ).rejects.toThrow('Maximum deposit amount');
        });

        it('should reject deposit to frozen balance', async () => {
            // Freeze balance
            await balanceService.freezeBalance(testUserId, 'Test freeze', testAdminId);

            await expect(
                balanceService.deposit({
                    userId: testUserId,
                    amount: 100,
                    description: 'Deposit to frozen balance',
                })
            ).rejects.toThrow('Balance is frozen');

            // Unfreeze
            await balanceService.unfreezeBalance(testUserId, testAdminId);
        });

        it('should handle multiple concurrent deposits correctly', async () => {
            const deposits = Array.from({ length: 5 }, (_, i) =>
                balanceService.deposit({
                    userId: testUserId,
                    amount: 100,
                    description: `Concurrent deposit ${i + 1}`,
                })
            );

            await Promise.all(deposits);

            const balance = await balanceService.getBalance(testUserId);
            expect(balance.availableBalance).toBe(500);
            expect(balance.totalTransactions).toBe(5);
        });
    });

    // ==========================================================================
    // WITHDRAWAL TESTS
    // ==========================================================================

    describe('withdraw', () => {
        beforeEach(async () => {
            // Add initial balance
            await balanceService.deposit({
                userId: testUserId,
                amount: 5000,
                description: 'Initial balance for withdrawal tests',
            });
        });

        it('should withdraw funds successfully', async () => {
            const result = await balanceService.withdraw({
                userId: testUserId,
                amount: 1000,
                destination: 'bank_account',
                description: 'Test withdrawal',
            });

            expect(result.transaction.type).toBe(TransactionType.WITHDRAWAL);
            expect(result.transaction.amount).toBe(-1000);
            expect(result.transaction.status).toBe(TransactionStatus.COMPLETED);

            expect(result.balance.availableBalance).toBe(4000);
            expect(result.balance.lifetimeWithdrawals).toBe(1000);
        });

        it('should reject withdrawal with insufficient balance', async () => {
            await expect(
                balanceService.withdraw({
                    userId: testUserId,
                    amount: 10000,
                    destination: 'bank_account',
                    description: 'Insufficient balance withdrawal',
                })
            ).rejects.toThrow('Insufficient balance');
        });

        it('should reject withdrawal below minimum', async () => {
            await expect(
                balanceService.withdraw({
                    userId: testUserId,
                    amount: 5,
                    destination: 'bank_account',
                    description: 'Too small withdrawal',
                })
            ).rejects.toThrow('Minimum withdrawal amount');
        });

        it('should enforce daily withdrawal limit', async () => {
            // Deposit enough to test daily limit
            await balanceService.deposit({
                userId: testUserId,
                amount: 10000,
                description: 'Setup for limit test',
            });

            // First withdrawal (within limit)
            await balanceService.withdraw({
                userId: testUserId,
                amount: 4000,
                destination: 'bank_account',
                description: 'First withdrawal',
            });

            // Second withdrawal (exceeds daily limit of 5000)
            await expect(
                balanceService.withdraw({
                    userId: testUserId,
                    amount: 2000,
                    destination: 'bank_account',
                    description: 'Second withdrawal',
                })
            ).rejects.toThrow('Daily withdrawal limit exceeded');
        });
    });

    // ==========================================================================
    // ORDER PAYMENT TESTS
    // ==========================================================================

    describe('deductForOrder', () => {
        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial balance for order tests',
            });
        });

        it('should deduct balance for order payment', async () => {
            // Create test order
            const orderResult = await pool.query(
                `INSERT INTO orders (customer_id, driver_id, total_amount, status)
         VALUES ($1, $2, 100, 'pending_bids')
         RETURNING id`,
                [testUserId, testDriverId]
            );
            const orderId = orderResult.rows[0].id;

            const result = await balanceService.deductForOrder({
                userId: testUserId,
                orderId,
                amount: 100,
                description: 'Order payment',
            });

            expect(result.transaction.type).toBe(TransactionType.ORDER_PAYMENT);
            expect(result.transaction.amount).toBe(-100);
            expect(result.transaction.orderId).toBe(orderId);
            expect(result.balance.availableBalance).toBe(900);
        });

        it('should reject order payment with insufficient balance', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (customer_id, driver_id, total_amount, status)
         VALUES ($1, $2, 2000, 'pending_bids')
         RETURNING id`,
                [testUserId, testDriverId]
            );
            const orderId = orderResult.rows[0].id;

            await expect(
                balanceService.deductForOrder({
                    userId: testUserId,
                    orderId,
                    amount: 2000,
                    description: 'Order payment',
                })
            ).rejects.toThrow('Insufficient balance');

            await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
        });
    });

    describe('refundForOrder', () => {
        it('should refund balance for cancelled order', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (customer_id, driver_id, total_amount, status)
         VALUES ($1, $2, 100, 'cancelled')
         RETURNING id`,
                [testUserId, testDriverId]
            );
            const orderId = orderResult.rows[0].id;

            const result = await balanceService.refundForOrder({
                userId: testUserId,
                orderId,
                amount: 100,
                reason: 'Order cancelled',
            });

            expect(result.transaction.type).toBe(TransactionType.ORDER_REFUND);
            expect(result.transaction.amount).toBe(100);
            expect(result.balance.availableBalance).toBe(100);
        });
    });

    // ==========================================================================
    // DRIVER EARNINGS TESTS
    // ==========================================================================

    describe('creditEarnings', () => {
        it('should credit driver earnings', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (customer_id, driver_id, total_amount, status)
         VALUES ($1, $2, 100, 'delivered')
         RETURNING id`,
                [testUserId, testDriverId]
            );
            const orderId = orderResult.rows[0].id;

            const result = await balanceService.creditEarnings({
                driverId: testDriverId,
                orderId,
                amount: 85,
                description: 'Earnings from order',
            });

            expect(result.transaction.type).toBe(TransactionType.EARNINGS);
            expect(result.transaction.amount).toBe(85);
            expect(result.balance.availableBalance).toBe(85);
            expect(result.balance.lifetimeEarnings).toBe(85);
        });
    });

    describe('deductCommission', () => {
        beforeEach(async () => {
            await balanceService.deposit({
                userId: testDriverId,
                amount: 100,
                description: 'Initial balance for commission tests',
            });
        });

        it('should deduct commission from driver', async () => {
            const orderResult = await pool.query(
                `INSERT INTO orders (customer_id, driver_id, total_amount, status)
         VALUES ($1, $2, 100, 'delivered')
         RETURNING id`,
                [testUserId, testDriverId]
            );
            const orderId = orderResult.rows[0].id;

            const result = await balanceService.deductCommission(testDriverId, orderId, 15);

            expect(result.transaction.type).toBe(TransactionType.COMMISSION_DEDUCTION);
            expect(result.transaction.amount).toBe(-15);
            expect(result.balance.availableBalance).toBe(85);
        });
    });

    // ==========================================================================
    // HOLD (ESCROW) TESTS
    // ==========================================================================

    describe('createHold', () => {
        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial balance for hold tests',
            });
        });

        it('should create balance hold', async () => {
            const result = await balanceService.createHold({
                userId: testUserId,
                amount: 100,
                reason: 'Order escrow',
                description: 'Hold for order payment',
            });

            expect(result.hold).toBeDefined();
            expect(result.hold.amount).toBe(100);
            expect(result.hold.status).toBe(HoldStatus.ACTIVE);
            expect(result.balance.availableBalance).toBe(900);
            expect(result.balance.heldBalance).toBe(100);
        });

        it('should reject hold with insufficient balance', async () => {
            await expect(
                balanceService.createHold({
                    userId: testUserId,
                    amount: 2000,
                    reason: 'Order escrow',
                })
            ).rejects.toThrow('Insufficient balance for hold');
        });
    });

    describe('releaseHold', () => {
        let holdId: string;

        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial balance',
            });

            const result = await balanceService.createHold({
                userId: testUserId,
                amount: 100,
                reason: 'Test hold',
            });

            holdId = result.hold.holdId;
        });

        it('should release hold successfully', async () => {
            const result = await balanceService.releaseHold(holdId);

            expect(result.hold.status).toBe(HoldStatus.RELEASED);
            expect(result.balance.availableBalance).toBe(1000);
            expect(result.balance.heldBalance).toBe(0);
        });

        it('should reject releasing non-existent hold', async () => {
            await expect(balanceService.releaseHold('HOLD-invalid')).rejects.toThrow('Hold not found');
        });

        it('should reject releasing already released hold', async () => {
            await balanceService.releaseHold(holdId);

            await expect(balanceService.releaseHold(holdId)).rejects.toThrow('Hold is not active');
        });
    });

    describe('captureHold', () => {
        let holdId: string;

        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial balance',
            });

            const result = await balanceService.createHold({
                userId: testUserId,
                amount: 100,
                reason: 'Test hold',
            });

            holdId = result.hold.holdId;
        });

        it('should capture hold successfully', async () => {
            const result = await balanceService.captureHold(holdId);

            expect(result.transaction.type).toBe(TransactionType.ORDER_PAYMENT);
            expect(result.balance.availableBalance).toBe(900);
            expect(result.balance.heldBalance).toBe(0);
        });
    });

    // ==========================================================================
    // QUERY TESTS
    // ==========================================================================

    describe('getTransactionHistory', () => {
        beforeEach(async () => {
            // Create some transactions
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Deposit 1',
            });

            await balanceService.deposit({
                userId: testUserId,
                amount: 500,
                description: 'Deposit 2',
            });

            await balanceService.withdraw({
                userId: testUserId,
                amount: 200,
                destination: 'bank',
                description: 'Withdrawal 1',
            });
        });

        it('should get all transactions for user', async () => {
            const transactions = await balanceService.getTransactionHistory({
                userId: testUserId,
            });

            expect(transactions.length).toBe(3);
        });

        it('should filter transactions by type', async () => {
            const deposits = await balanceService.getTransactionHistory({
                userId: testUserId,
                type: TransactionType.DEPOSIT,
            });

            expect(deposits.length).toBe(2);
            expect(deposits.every((tx) => tx.type === TransactionType.DEPOSIT)).toBe(true);
        });

        it('should filter transactions by status', async () => {
            const completed = await balanceService.getTransactionHistory({
                userId: testUserId,
                status: TransactionStatus.COMPLETED,
            });

            expect(completed.length).toBe(3);
        });

        it('should limit results', async () => {
            const limited = await balanceService.getTransactionHistory({
                userId: testUserId,
                limit: 2,
            });

            expect(limited.length).toBe(2);
        });
    });

    describe('getBalanceStatement', () => {
        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Deposit',
            });

            await balanceService.withdraw({
                userId: testUserId,
                amount: 200,
                destination: 'bank',
                description: 'Withdrawal',
            });
        });

        it('should generate balance statement', async () => {
            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);

            const statement = await balanceService.getBalanceStatement({
                userId: testUserId,
                startDate,
                endDate,
            });

            expect(statement.userId).toBe(testUserId);
            expect(statement.totalDeposits).toBe(1000);
            expect(statement.totalWithdrawals).toBe(200);
            expect(statement.openingBalance).toBe(0);
            expect(statement.closingBalance).toBe(800);
            expect(statement.transactions.length).toBe(2);
        });
    });

    // ==========================================================================
    // VALIDATION TESTS
    // ==========================================================================

    describe('validateSufficientBalance', () => {
        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial balance',
            });
        });

        it('should return true for sufficient balance', async () => {
            const result = await balanceService.validateSufficientBalance(testUserId, 500);
            expect(result).toBe(true);
        });

        it('should return false for insufficient balance', async () => {
            const result = await balanceService.validateSufficientBalance(testUserId, 2000);
            expect(result).toBe(false);
        });
    });

    describe('validateWithdrawalLimits', () => {
        beforeEach(async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 10000,
                description: 'Initial balance',
            });
        });

        it('should pass validation for amount within limits', async () => {
            const result = await balanceService.validateWithdrawalLimits(testUserId, 1000);

            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        it('should fail validation for amount exceeding daily limit', async () => {
            const result = await balanceService.validateWithdrawalLimits(testUserId, 6000);

            expect(result.isValid).toBe(false);
            expect(result.errors.some((e) => e.includes('Daily withdrawal limit'))).toBe(true);
        });
    });

    // ==========================================================================
    // ADMIN OPERATIONS TESTS
    // ==========================================================================

    describe('freezeBalance', () => {
        it('should freeze user balance', async () => {
            const result = await balanceService.freezeBalance(testUserId, 'Suspicious activity', testAdminId);

            expect(result.isFrozen).toBe(true);
            expect(result.freezeReason).toBe('Suspicious activity');
        });
    });

    describe('unfreezeBalance', () => {
        beforeEach(async () => {
            await balanceService.freezeBalance(testUserId, 'Test freeze', testAdminId);
        });

        it('should unfreeze user balance', async () => {
            const result = await balanceService.unfreezeBalance(testUserId, testAdminId);

            expect(result.isFrozen).toBe(false);
            expect(result.freezeReason).toBeNull();
        });
    });

    describe('adjustBalance', () => {
        it('should adjust balance positively', async () => {
            const result = await balanceService.adjustBalance(testUserId, 500, 'Compensation', testAdminId);

            expect(result.transaction.type).toBe(TransactionType.ADJUSTMENT);
            expect(result.transaction.amount).toBe(500);
            expect(result.balance.availableBalance).toBe(500);
        });

        it('should adjust balance negatively', async () => {
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial balance',
            });

            const result = await balanceService.adjustBalance(testUserId, -200, 'Correction', testAdminId);

            expect(result.transaction.amount).toBe(-200);
            expect(result.balance.availableBalance).toBe(800);
        });
    });

    // ==========================================================================
    // EDGE CASES AND ERROR SCENARIOS
    // ==========================================================================

    describe('Edge Cases', () => {
        it('should handle decimal precision correctly', async () => {
            const result = await balanceService.deposit({
                userId: testUserId,
                amount: 100.55,
                description: 'Decimal deposit',
            });

            expect(result.balance.availableBalance).toBe(100.55);
        });

        it('should maintain balance consistency across concurrent operations', async () => {
            // Initial deposit
            await balanceService.deposit({
                userId: testUserId,
                amount: 1000,
                description: 'Initial',
            });

            // Concurrent withdrawals
            const operations = [
                balanceService.withdraw({
                    userId: testUserId,
                    amount: 100,
                    destination: 'bank',
                    description: 'W1',
                }),
                balanceService.withdraw({
                    userId: testUserId,
                    amount: 150,
                    destination: 'bank',
                    description: 'W2',
                }),
                balanceService.withdraw({
                    userId: testUserId,
                    amount: 200,
                    destination: 'bank',
                    description: 'W3',
                }),
            ];

            await Promise.all(operations);

            const balance = await balanceService.getBalance(testUserId);
            expect(balance.availableBalance).toBe(550);
        });

        it('should rollback transaction on error', async () => {
            const initialBalance = await balanceService.getBalance(testUserId);

            try {
                // This should fail due to insufficient balance
                await balanceService.withdraw({
                    userId: testUserId,
                    amount: 10000,
                    destination: 'bank',
                    description: 'Invalid withdrawal',
                });
            } catch (error) {
                // Expected error
            }

            const finalBalance = await balanceService.getBalance(testUserId);
            expect(finalBalance.availableBalance).toBe(initialBalance.availableBalance);
        });
    });
});
