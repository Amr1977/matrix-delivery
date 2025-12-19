/**
 * Balance Service - Core Implementation
 * 
 * Enterprise-grade balance management service with ACID compliance.
 * Handles all balance operations for customers and drivers including:
 * - Deposits and withdrawals
 * - Order payments and refunds
 * - Driver earnings and commissions
 * - Balance holds (escrow)
 * - Transaction history and reporting
 * 
 * @module services/balanceService
 * @version 1.0.0
 * @author Matrix Delivery Team
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
    UserBalance,
    BalanceTransaction,
    BalanceHold,
    TransactionType,
    TransactionStatus,
    HoldStatus,
    Currency,
    DepositDTO,
    WithdrawalDTO,
    OrderPaymentDTO,
    OrderRefundDTO,
    EarningsDTO,
    CreateHoldDTO,
    TransactionFilters,
    BalanceStatementRequest,
    TransactionResponse,
    HoldResponse,
    BalanceStatement,
    TransactionSummary,
    BalanceValidation,
    IBalanceService,
    DEFAULT_CURRENCY,
    TRANSACTION_LIMITS,
    DEFAULT_LIMITS,
} from '../types/balance';
import { PAYMENT_CONFIG } from '../config/paymentConfig';

const logger = require('../utils/logger');

/**
 * Balance Service Class
 * 
 * Implements IBalanceService interface with full ACID compliance.
 * All balance-modifying operations use database transactions to ensure consistency.
 */
export class BalanceService implements IBalanceService {
    private pool: Pool;

    /**
     * Initialize Balance Service
     * @param pool - PostgreSQL connection pool
     */
    constructor(pool: Pool) {
        this.pool = pool;
    }

    // ==========================================================================
    // BALANCE OPERATIONS
    // ==========================================================================

    /**
     * Get user's balance information
     * 
     * @param userId - User ID
     * @returns User balance object
     * @throws Error if balance not found
     */
    async getBalance(userId: number): Promise<UserBalance> {
        try {
            const result = await this.pool.query(
                `SELECT 
          user_id as "userId",
          available_balance as "availableBalance",
          pending_balance as "pendingBalance",
          held_balance as "heldBalance",
          total_balance as "totalBalance",
          currency,
          daily_withdrawal_limit as "dailyWithdrawalLimit",
          monthly_withdrawal_limit as "monthlyWithdrawalLimit",
          minimum_balance as "minimumBalance",
          auto_reload_threshold as "autoReloadThreshold",
          auto_reload_amount as "autoReloadAmount",
          lifetime_deposits as "lifetimeDeposits",
          lifetime_withdrawals as "lifetimeWithdrawals",
          lifetime_earnings as "lifetimeEarnings",
          total_transactions as "totalTransactions",
          is_active as "isActive",
          is_frozen as "isFrozen",
          freeze_reason as "freezeReason",
          frozen_at as "frozenAt",
          frozen_by as "frozenBy",
          created_at as "createdAt",
          updated_at as "updatedAt",
          last_transaction_at as "lastTransactionAt"
        FROM user_balances
        WHERE user_id = $1`,
                [userId]
            );

            if (result.rows.length === 0) {
                throw new Error(`Balance not found for user ${userId}`);
            }

            // Convert decimal strings to numbers
            const row = result.rows[0];
            return {
                ...row,
                availableBalance: parseFloat(row.availableBalance) || 0,
                pendingBalance: parseFloat(row.pendingBalance) || 0,
                heldBalance: parseFloat(row.heldBalance) || 0,
                totalBalance: parseFloat(row.totalBalance) || 0,
                dailyWithdrawalLimit: parseFloat(row.dailyWithdrawalLimit) || 0,
                monthlyWithdrawalLimit: parseFloat(row.monthlyWithdrawalLimit) || 0,
                minimumBalance: parseFloat(row.minimumBalance) || 0,
                autoReloadThreshold: row.autoReloadThreshold ? parseFloat(row.autoReloadThreshold) : null,
                autoReloadAmount: row.autoReloadAmount ? parseFloat(row.autoReloadAmount) : null,
                lifetimeDeposits: parseFloat(row.lifetimeDeposits) || 0,
                lifetimeWithdrawals: parseFloat(row.lifetimeWithdrawals) || 0,
                lifetimeEarnings: parseFloat(row.lifetimeEarnings) || 0,
            };
        } catch (error) {
            logger.error('Error getting balance', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Create balance for a new user
     * 
     * @param userId - User ID
     * @param currency - Currency code (default: EGP)
     * @returns Created user balance
     */
    async createBalance(userId: number, currency: Currency = DEFAULT_CURRENCY): Promise<UserBalance> {
        try {
            const result = await this.pool.query(
                `INSERT INTO user_balances (
          user_id, currency, available_balance, pending_balance, held_balance
        ) VALUES ($1, $2, 0, 0, 0)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING 
          user_id as "userId",
          available_balance as "availableBalance",
          pending_balance as "pendingBalance",
          held_balance as "heldBalance",
          total_balance as "totalBalance",
          currency,
          daily_withdrawal_limit as "dailyWithdrawalLimit",
          monthly_withdrawal_limit as "monthlyWithdrawalLimit",
          minimum_balance as "minimumBalance",
          lifetime_deposits as "lifetimeDeposits",
          lifetime_withdrawals as "lifetimeWithdrawals",
          lifetime_earnings as "lifetimeEarnings",
          total_transactions as "totalTransactions",
          is_active as "isActive",
          is_frozen as "isFrozen",
          created_at as "createdAt",
          updated_at as "updatedAt"`,
                [userId, currency]
            );

            if (result.rows.length === 0) {
                // Balance already exists, fetch it
                return this.getBalance(userId);
            }

            // Parse decimal strings to numbers
            const row = result.rows[0];
            logger.info('Balance created', { userId, currency });
            return {
                ...row,
                availableBalance: parseFloat(row.availableBalance) || 0,
                pendingBalance: parseFloat(row.pendingBalance) || 0,
                heldBalance: parseFloat(row.heldBalance) || 0,
                totalBalance: parseFloat(row.totalBalance) || 0,
                dailyWithdrawalLimit: parseFloat(row.dailyWithdrawalLimit) || 0,
                monthlyWithdrawalLimit: parseFloat(row.monthlyWithdrawalLimit) || 0,
                minimumBalance: parseFloat(row.minimumBalance) || 0,
                lifetimeDeposits: parseFloat(row.lifetimeDeposits) || 0,
                lifetimeWithdrawals: parseFloat(row.lifetimeWithdrawals) || 0,
                lifetimeEarnings: parseFloat(row.lifetimeEarnings) || 0,
            };
        } catch (error) {
            logger.error('Error creating balance', { userId, currency, error: error.message });
            throw error;
        }
    }

    // ==========================================================================
    // DEPOSIT OPERATIONS
    // ==========================================================================

    /**
     * Deposit funds to user balance
     * 
     * Creates a deposit transaction and credits the user's available balance.
     * Uses database transaction for ACID compliance.
     * 
     * @param dto - Deposit data transfer object
     * @returns Transaction and updated balance
     * @throws Error if deposit fails or validation fails
     */
    async deposit(dto: DepositDTO): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Validate amount
            if (dto.amount <= 0) {
                throw new Error('Deposit amount must be positive');
            }

            if (dto.amount < TRANSACTION_LIMITS.MIN_DEPOSIT) {
                throw new Error(`Minimum deposit amount is ${TRANSACTION_LIMITS.MIN_DEPOSIT}`);
            }

            if (dto.amount > TRANSACTION_LIMITS.MAX_DEPOSIT) {
                throw new Error(`Maximum deposit amount is ${TRANSACTION_LIMITS.MAX_DEPOSIT}`);
            }

            // Get current balance
            const balance = await this.getBalanceForUpdate(client, dto.userId);

            // Check if balance is frozen
            if (balance.isFrozen) {
                throw new Error('Balance is frozen. Cannot perform deposit.');
            }

            // Calculate new balance
            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore + dto.amount;

            // Create transaction record
            const transaction = await this.createTransaction(client, {
                userId: dto.userId,
                type: TransactionType.DEPOSIT,
                amount: dto.amount,
                currency: dto.currency || balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: dto.description,
                metadata: dto.metadata,
                walletPaymentId: dto.walletPaymentId,
            });

            // Update balance
            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance + $1,
             lifetime_deposits = lifetime_deposits + $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [dto.amount, dto.userId]
            );

            await client.query('COMMIT');

            // Get updated balance
            const updatedBalance = await this.getBalance(dto.userId);

            logger.info('Deposit completed', {
                userId: dto.userId,
                amount: dto.amount,
                transactionId: transaction.transactionId,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Deposit failed', { dto, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // WITHDRAWAL OPERATIONS
    // ==========================================================================

    /**
     * Withdraw funds from user balance
     * 
     * Creates a withdrawal transaction and deducts from available balance.
     * Validates withdrawal limits before processing.
     * 
     * @param dto - Withdrawal data transfer object
     * @returns Transaction and updated balance
     * @throws Error if insufficient balance or limits exceeded
     */
    async withdraw(dto: WithdrawalDTO): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Validate amount
            if (dto.amount <= 0) {
                throw new Error('Withdrawal amount must be positive');
            }

            if (dto.amount < TRANSACTION_LIMITS.MIN_WITHDRAWAL) {
                throw new Error(`Minimum withdrawal amount is ${TRANSACTION_LIMITS.MIN_WITHDRAWAL}`);
            }

            // Get current balance
            const balance = await this.getBalanceForUpdate(client, dto.userId);

            // Check if balance is frozen
            if (balance.isFrozen) {
                throw new Error('Balance is frozen. Cannot perform withdrawal.');
            }

            // Check sufficient balance
            if (balance.availableBalance < dto.amount) {
                throw new Error(
                    `Insufficient balance. Available: ${balance.availableBalance}, Required: ${dto.amount}`
                );
            }

            // Validate withdrawal limits
            const limitValidation = await this.validateWithdrawalLimits(dto.userId, dto.amount);
            if (!limitValidation.isValid) {
                throw new Error(limitValidation.errors.join(', '));
            }

            // Calculate new balance
            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore - dto.amount;

            // Create transaction record
            const transaction = await this.createTransaction(client, {
                userId: dto.userId,
                type: TransactionType.WITHDRAWAL,
                amount: -dto.amount, // Negative for withdrawal
                currency: dto.currency || balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: dto.description,
                metadata: { ...dto.metadata, destination: dto.destination },
            });

            // Update balance
            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance - $1,
             lifetime_withdrawals = lifetime_withdrawals + $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [dto.amount, dto.userId]
            );

            await client.query('COMMIT');

            // Get updated balance
            const updatedBalance = await this.getBalance(dto.userId);

            logger.info('Withdrawal completed', {
                userId: dto.userId,
                amount: dto.amount,
                transactionId: transaction.transactionId,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Withdrawal failed', { dto, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // ORDER OPERATIONS
    // ==========================================================================

    /**
     * Deduct balance for order payment
     * 
     * Deducts amount from customer's available balance for order payment.
     * Creates a hold first, then captures it when order is confirmed.
     * 
     * @param dto - Order payment data transfer object
     * @returns Transaction and updated balance
     */
    async deductForOrder(dto: OrderPaymentDTO): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get current balance
            const balance = await this.getBalanceForUpdate(client, dto.userId);

            // Check sufficient balance
            if (balance.availableBalance < dto.amount) {
                throw new Error('Insufficient balance for order payment');
            }

            // Calculate new balance
            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore - dto.amount;

            // Create transaction
            const transaction = await this.createTransaction(client, {
                userId: dto.userId,
                type: TransactionType.ORDER_PAYMENT,
                amount: -dto.amount,
                currency: dto.currency || balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: dto.description,
                metadata: dto.metadata,
                orderId: dto.orderId,
            });

            // Update balance
            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance - $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [dto.amount, dto.userId]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(dto.userId);

            logger.info('Order payment deducted', {
                userId: dto.userId,
                orderId: dto.orderId,
                amount: dto.amount,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Order payment failed', { dto, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Refund balance for cancelled order
     * 
     * Credits customer's balance when order is cancelled or refunded.
     * 
     * @param dto - Order refund data transfer object
     * @returns Transaction and updated balance
     */
    async refundForOrder(dto: OrderRefundDTO): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const balance = await this.getBalanceForUpdate(client, dto.userId);

            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore + dto.amount;

            const transaction = await this.createTransaction(client, {
                userId: dto.userId,
                type: TransactionType.ORDER_REFUND,
                amount: dto.amount,
                currency: dto.currency || balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: `Refund for order #${dto.orderId}: ${dto.reason}`,
                metadata: { reason: dto.reason, ...dto.metadata },
                orderId: dto.orderId,
            });

            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance + $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [dto.amount, dto.userId]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(dto.userId);

            logger.info('Order refund completed', {
                userId: dto.userId,
                orderId: dto.orderId,
                amount: dto.amount,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Order refund failed', { dto, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // DRIVER OPERATIONS
    // ==========================================================================

    /**
     * Credit driver earnings
     * 
     * Credits driver's balance with earnings from completed order.
     * 
     * @param dto - Earnings data transfer object
     * @returns Transaction and updated balance
     */
    async creditEarnings(dto: EarningsDTO): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const balance = await this.getBalanceForUpdate(client, dto.driverId);

            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore + dto.amount;

            const transaction = await this.createTransaction(client, {
                userId: dto.driverId,
                type: TransactionType.EARNINGS,
                amount: dto.amount,
                currency: dto.currency || balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: dto.description,
                metadata: dto.metadata,
                orderId: dto.orderId,
            });

            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance + $1,
             lifetime_earnings = lifetime_earnings + $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [dto.amount, dto.driverId]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(dto.driverId);

            logger.info('Driver earnings credited', {
                driverId: dto.driverId,
                orderId: dto.orderId,
                amount: dto.amount,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Credit earnings failed', { dto, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Deduct platform commission from driver
     * 
     * Deducts commission from driver's balance.
     * ALLOWS NEGATIVE BALANCE (creates debt) for COD orders.
     * 
     * @param driverId - Driver user ID
     * @param orderId - Order ID
     * @param commission - Commission amount
     * @returns Transaction and updated balance
     */
    async deductCommission(
        driverId: number,
        orderId: number,
        commission: number
    ): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const balance = await this.getBalanceForUpdate(client, driverId);

            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore - commission;

            // ✅ ALLOW NEGATIVE BALANCE (creates debt)
            // Log warning if creating or increasing debt
            if (balanceAfter < 0) {
                logger.warn('Commission creates/increases debt', {
                    driverId,
                    orderId,
                    balanceBefore,
                    balanceAfter,
                    commission,
                    debtAmount: Math.abs(balanceAfter),
                    category: 'balance'
                });
            }

            const transaction = await this.createTransaction(client, {
                userId: driverId,
                type: TransactionType.COMMISSION_DEDUCTION,
                amount: -commission,
                currency: balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: `Platform commission for order #${orderId}`,
                orderId,
            });

            // Update balance (can go negative)
            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance - $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [commission, driverId]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(driverId);

            logger.info('Commission deducted', {
                driverId,
                orderId,
                commission,
                newBalance: updatedBalance.availableBalance,
                isDebt: updatedBalance.availableBalance < 0,
                category: 'balance'
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Commission deduction failed', { driverId, orderId, commission, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Check if driver can accept new orders based on debt
     * 
     * Drivers are blocked from accepting orders if their balance
     * falls below the maximum debt threshold.
     * 
     * @param driverId - Driver user ID
     * @returns Object with canAccept status, reason, and balance info
     */
    async canAcceptOrders(driverId: number): Promise<{
        canAccept: boolean;
        reason?: string;
        currentBalance: number;
        debtThreshold: number;
    }> {
        try {
            const balance = await this.getBalance(driverId);
            const threshold = PAYMENT_CONFIG.DEBT_MANAGEMENT.MAX_DEBT_THRESHOLD;

            if (balance.availableBalance < threshold) {
                return {
                    canAccept: false,
                    reason: `Balance (${balance.availableBalance} EGP) below minimum threshold (${threshold} EGP). Please deposit funds to continue accepting orders.`,
                    currentBalance: balance.availableBalance,
                    debtThreshold: threshold,
                };
            }

            return {
                canAccept: true,
                currentBalance: balance.availableBalance,
                debtThreshold: threshold,
            };
        } catch (error) {
            logger.error('Error checking if driver can accept orders', { driverId, error: error.message });
            throw error;
        }
    }

    // ==========================================================================
    // HOLD OPERATIONS (ESCROW)
    // ==========================================================================

    /**
     * Create a balance hold (escrow)
     * 
     * Moves funds from available balance to held balance.
     * Used for order payments, disputes, etc.
     * 
     * @param dto - Create hold data transfer object
     * @returns Hold and updated balance
     */
    async createHold(dto: CreateHoldDTO): Promise<HoldResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const balance = await this.getBalanceForUpdate(client, dto.userId);

            // Check sufficient balance
            if (balance.availableBalance < dto.amount) {
                throw new Error('Insufficient balance for hold');
            }

            const holdId = `HOLD-${uuidv4()}`;

            // Create hold transaction
            const transaction = await this.createTransaction(client, {
                userId: dto.userId,
                type: TransactionType.HOLD,
                amount: -dto.amount,
                currency: dto.currency || balance.currency,
                balanceBefore: balance.availableBalance,
                balanceAfter: balance.availableBalance - dto.amount,
                status: TransactionStatus.COMPLETED,
                description: `Hold created: ${dto.reason}`,
                metadata: dto.metadata,
                orderId: dto.orderId,
            });

            // Create hold record
            const holdResult = await client.query(
                `INSERT INTO balance_holds (
          hold_id, user_id, amount, currency, reason, order_id,
          expires_at, description, metadata, transaction_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
                [
                    holdId,
                    dto.userId,
                    dto.amount,
                    dto.currency || balance.currency,
                    dto.reason,
                    dto.orderId,
                    dto.expiresAt,
                    dto.description,
                    dto.metadata,
                    transaction.id,
                    HoldStatus.ACTIVE,
                ]
            );

            // Update balance (move from available to held)
            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance - $1,
             held_balance = held_balance + $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [dto.amount, dto.userId]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(dto.userId);
            const hold = this.mapHoldFromDb(holdResult.rows[0]);

            logger.info('Hold created', {
                userId: dto.userId,
                holdId,
                amount: dto.amount,
            });

            return {
                hold,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Create hold failed', { dto, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Release a balance hold
     * 
     * Moves funds from held balance back to available balance.
     * Used when order is cancelled or dispute is resolved in customer's favor.
     * 
     * @param holdId - Hold ID
     * @returns Hold and updated balance
     */
    async releaseHold(holdId: string): Promise<HoldResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get hold
            const holdResult = await client.query(
                'SELECT * FROM balance_holds WHERE hold_id = $1 FOR UPDATE',
                [holdId]
            );

            if (holdResult.rows.length === 0) {
                throw new Error(`Hold not found: ${holdId}`);
            }

            const hold = holdResult.rows[0];

            if (hold.status !== HoldStatus.ACTIVE) {
                throw new Error(`Hold is not active: ${hold.status}`);
            }

            const balance = await this.getBalanceForUpdate(client, hold.user_id);

            // Create release transaction
            const transaction = await this.createTransaction(client, {
                userId: hold.user_id,
                type: TransactionType.RELEASE,
                amount: hold.amount,
                currency: hold.currency,
                balanceBefore: balance.availableBalance,
                balanceAfter: balance.availableBalance + hold.amount,
                status: TransactionStatus.COMPLETED,
                description: `Hold released: ${hold.reason}`,
                orderId: hold.order_id,
            });

            // Update hold status
            await client.query(
                `UPDATE balance_holds
         SET status = $1, released_at = CURRENT_TIMESTAMP
         WHERE hold_id = $2`,
                [HoldStatus.RELEASED, holdId]
            );

            // Update balance (move from held to available)
            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance + $1,
             held_balance = held_balance - $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [hold.amount, hold.user_id]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(hold.user_id);
            const updatedHold = this.mapHoldFromDb({ ...hold, status: HoldStatus.RELEASED });

            logger.info('Hold released', {
                userId: hold.user_id,
                holdId,
                amount: hold.amount,
            });

            return {
                hold: updatedHold,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Release hold failed', { holdId, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Capture a balance hold
     * 
     * Deducts funds from held balance (completes the hold).
     * Used when order is completed or dispute is resolved against customer.
     * 
     * @param holdId - Hold ID
     * @returns Transaction and updated balance
     */
    async captureHold(holdId: string): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Get hold
            const holdResult = await client.query(
                'SELECT * FROM balance_holds WHERE hold_id = $1 FOR UPDATE',
                [holdId]
            );

            if (holdResult.rows.length === 0) {
                throw new Error(`Hold not found: ${holdId}`);
            }

            const hold = holdResult.rows[0];

            if (hold.status !== HoldStatus.ACTIVE) {
                throw new Error(`Hold is not active: ${hold.status}`);
            }

            const balance = await this.getBalanceForUpdate(client, hold.user_id);

            // Create capture transaction
            const transaction = await this.createTransaction(client, {
                userId: hold.user_id,
                type: TransactionType.ORDER_PAYMENT,
                amount: -hold.amount,
                currency: hold.currency,
                balanceBefore: balance.heldBalance,
                balanceAfter: balance.heldBalance - hold.amount,
                status: TransactionStatus.COMPLETED,
                description: `Hold captured: ${hold.reason}`,
                orderId: hold.order_id,
            });

            // Update hold status
            await client.query(
                `UPDATE balance_holds
         SET status = $1, released_at = CURRENT_TIMESTAMP
         WHERE hold_id = $2`,
                [HoldStatus.CAPTURED, holdId]
            );

            // Update balance (deduct from held)
            await client.query(
                `UPDATE user_balances
         SET held_balance = held_balance - $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [hold.amount, hold.user_id]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(hold.user_id);

            logger.info('Hold captured', {
                userId: hold.user_id,
                holdId,
                amount: hold.amount,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Capture hold failed', { holdId, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // QUERY OPERATIONS
    // ==========================================================================

    /**
     * Get transaction history with filters
     * 
     * @param filters - Transaction filters
     * @returns Array of transactions
     */
    async getTransactionHistory(filters: TransactionFilters): Promise<BalanceTransaction[]> {
        try {
            let query = `
        SELECT 
          id, transaction_id as "transactionId", user_id as "userId",
          type, amount, currency,
          balance_before as "balanceBefore", balance_after as "balanceAfter",
          status, order_id as "orderId",
          wallet_payment_id as "walletPaymentId",
          withdrawal_request_id as "withdrawalRequestId",
          related_transaction_id as "relatedTransactionId",
          processed_at as "processedAt", processed_by as "processedBy",
          processing_method as "processingMethod",
          description, metadata, notes,
          created_at as "createdAt", updated_at as "updatedAt",
          ip_address as "ipAddress", user_agent as "userAgent"
        FROM balance_transactions
        WHERE 1=1
      `;

            const params: any[] = [];
            let paramCount = 1;

            if (filters.userId) {
                query += ` AND user_id = $${paramCount++}`;
                params.push(filters.userId);
            }

            if (filters.type) {
                if (Array.isArray(filters.type)) {
                    query += ` AND type = ANY($${paramCount++})`;
                    params.push(filters.type);
                } else {
                    query += ` AND type = $${paramCount++}`;
                    params.push(filters.type);
                }
            }

            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    query += ` AND status = ANY($${paramCount++})`;
                    params.push(filters.status);
                } else {
                    query += ` AND status = $${paramCount++}`;
                    params.push(filters.status);
                }
            }

            if (filters.startDate) {
                query += ` AND created_at >= $${paramCount++}`;
                params.push(filters.startDate);
            }

            if (filters.endDate) {
                query += ` AND created_at <= $${paramCount++}`;
                params.push(filters.endDate);
            }

            if (filters.minAmount !== undefined) {
                query += ` AND ABS(amount) >= $${paramCount++}`;
                params.push(filters.minAmount);
            }

            if (filters.maxAmount !== undefined) {
                query += ` AND ABS(amount) <= $${paramCount++}`;
                params.push(filters.maxAmount);
            }

            if (filters.orderId) {
                query += ` AND order_id = $${paramCount++}`;
                params.push(filters.orderId);
            }

            query += ` ORDER BY created_at DESC`;

            if (filters.limit) {
                query += ` LIMIT $${paramCount++}`;
                params.push(filters.limit);
            }

            if (filters.offset) {
                query += ` OFFSET $${paramCount++}`;
                params.push(filters.offset);
            }

            const result = await this.pool.query(query, params);

            // Parse decimal strings to numbers
            return result.rows.map(row => ({
                ...row,
                amount: parseFloat(row.amount) || 0,
                balanceBefore: parseFloat(row.balanceBefore) || 0,
                balanceAfter: parseFloat(row.balanceAfter) || 0,
            }));
        } catch (error) {
            logger.error('Error getting transaction history', { filters, error: error.message });
            throw error;
        }
    }

    /**
     * Get balance statement for a period
     * 
     * @param request - Statement request
     * @returns Balance statement with transactions
     */
    async getBalanceStatement(request: BalanceStatementRequest): Promise<BalanceStatement> {
        try {
            const balance = await this.getBalance(request.userId);

            // Get transactions for period
            const transactions = await this.getTransactionHistory({
                userId: request.userId,
                startDate: request.startDate,
                endDate: request.endDate,
            });

            // Calculate opening balance (balance at start of period)
            const openingBalanceResult = await this.pool.query(
                `SELECT COALESCE(SUM(amount), 0) as total
         FROM balance_transactions
         WHERE user_id = $1 AND created_at < $2 AND status = 'completed'`,
                [request.userId, request.startDate]
            );

            const openingBalance = parseFloat(openingBalanceResult.rows[0].total);

            // Calculate totals
            const totals = transactions.reduce(
                (acc, tx) => {
                    if (tx.status !== TransactionStatus.COMPLETED) return acc;

                    switch (tx.type) {
                        case TransactionType.DEPOSIT:
                        case TransactionType.BONUS:
                        case TransactionType.CASHBACK:
                            acc.totalDeposits += tx.amount;
                            break;
                        case TransactionType.WITHDRAWAL:
                            acc.totalWithdrawals += Math.abs(tx.amount);
                            break;
                        case TransactionType.EARNINGS:
                            acc.totalEarnings += tx.amount;
                            break;
                        case TransactionType.ORDER_PAYMENT:
                        case TransactionType.COMMISSION_DEDUCTION:
                        case TransactionType.FEE:
                        case TransactionType.PENALTY:
                            acc.totalDeductions += Math.abs(tx.amount);
                            break;
                    }

                    return acc;
                },
                {
                    totalDeposits: 0,
                    totalWithdrawals: 0,
                    totalEarnings: 0,
                    totalDeductions: 0,
                }
            );

            return {
                userId: request.userId,
                period: {
                    startDate: request.startDate,
                    endDate: request.endDate,
                },
                openingBalance,
                closingBalance: balance.availableBalance,
                ...totals,
                transactions,
                currency: balance.currency,
            };
        } catch (error) {
            logger.error('Error getting balance statement', { request, error: error.message });
            throw error;
        }
    }

    /**
     * Get transaction summary for a period
     * 
     * @param userId - User ID
     * @param startDate - Start date
     * @param endDate - End date
     * @returns Transaction summary
     */
    async getTransactionSummary(
        userId: number,
        startDate: Date,
        endDate: Date
    ): Promise<TransactionSummary> {
        try {
            const transactions = await this.getTransactionHistory({
                userId,
                startDate,
                endDate,
            });

            const balance = await this.getBalance(userId);

            // Group by type
            const byType: Record<string, { count: number; totalAmount: number }> = {};
            const byStatus: Record<string, number> = {};

            transactions.forEach((tx) => {
                // By type
                if (!byType[tx.type]) {
                    byType[tx.type] = { count: 0, totalAmount: 0 };
                }
                byType[tx.type].count++;
                byType[tx.type].totalAmount += Math.abs(tx.amount);

                // By status
                byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
            });

            return {
                userId,
                period: { startDate, endDate },
                totalTransactions: transactions.length,
                byType: byType as any,
                byStatus: byStatus as any,
                currency: balance.currency,
            };
        } catch (error) {
            logger.error('Error getting transaction summary', { userId, error: error.message });
            throw error;
        }
    }

    // ==========================================================================
    // VALIDATION OPERATIONS
    // ==========================================================================

    /**
     * Validate if user has sufficient balance
     * 
     * @param userId - User ID
     * @param amount - Amount to check
     * @returns True if sufficient balance
     */
    async validateSufficientBalance(userId: number, amount: number): Promise<boolean> {
        try {
            const balance = await this.getBalance(userId);
            return balance.availableBalance >= amount;
        } catch (error) {
            logger.error('Error validating balance', { userId, amount, error: error.message });
            return false;
        }
    }

    /**
     * Validate withdrawal against limits
     * 
     * @param userId - User ID
     * @param amount - Withdrawal amount
     * @returns Validation result
     */
    async validateWithdrawalLimits(userId: number, amount: number): Promise<BalanceValidation> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            const balance = await this.getBalance(userId);

            // Check daily limit
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const dailyWithdrawalsResult = await this.pool.query(
                `SELECT COALESCE(SUM(ABS(amount)), 0) as total
         FROM balance_transactions
         WHERE user_id = $1 
           AND type = 'withdrawal'
           AND status = 'completed'
           AND created_at >= $2`,
                [userId, today]
            );

            const dailyWithdrawals = parseFloat(dailyWithdrawalsResult.rows[0].total);

            if (dailyWithdrawals + amount > balance.dailyWithdrawalLimit) {
                errors.push(
                    `Daily withdrawal limit exceeded. Limit: ${balance.dailyWithdrawalLimit}, ` +
                    `Already withdrawn today: ${dailyWithdrawals}, Requested: ${amount}`
                );
            }

            // Check monthly limit
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

            const monthlyWithdrawalsResult = await this.pool.query(
                `SELECT COALESCE(SUM(ABS(amount)), 0) as total
         FROM balance_transactions
         WHERE user_id = $1 
           AND type = 'withdrawal'
           AND status = 'completed'
           AND created_at >= $2`,
                [userId, monthStart]
            );

            const monthlyWithdrawals = parseFloat(monthlyWithdrawalsResult.rows[0].total);

            if (monthlyWithdrawals + amount > balance.monthlyWithdrawalLimit) {
                errors.push(
                    `Monthly withdrawal limit exceeded. Limit: ${balance.monthlyWithdrawalLimit}, ` +
                    `Already withdrawn this month: ${monthlyWithdrawals}, Requested: ${amount}`
                );
            }

            // Check if withdrawal would go below minimum balance
            if (balance.availableBalance - amount < balance.minimumBalance) {
                warnings.push(
                    `Withdrawal would bring balance below minimum (${balance.minimumBalance})`
                );
            }

            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        } catch (error) {
            logger.error('Error validating withdrawal limits', { userId, amount, error: error.message });
            return {
                isValid: false,
                errors: ['Validation error: ' + error.message],
                warnings: [],
            };
        }
    }

    // ==========================================================================
    // ADMIN OPERATIONS
    // ==========================================================================

    /**
     * Freeze user balance (admin only)
     * 
     * @param userId - User ID
     * @param reason - Freeze reason
     * @param adminId - Admin user ID
     * @returns Updated balance
     */
    async freezeBalance(userId: number, reason: string, adminId: number): Promise<UserBalance> {
        try {
            await this.pool.query(
                `UPDATE user_balances
         SET is_frozen = TRUE,
             freeze_reason = $1,
             frozen_at = CURRENT_TIMESTAMP,
             frozen_by = $2
         WHERE user_id = $3`,
                [reason, adminId, userId]
            );

            logger.warn('Balance frozen', { userId, reason, adminId });

            return this.getBalance(userId);
        } catch (error) {
            logger.error('Error freezing balance', { userId, reason, error: error.message });
            throw error;
        }
    }

    /**
     * Unfreeze user balance (admin only)
     * 
     * @param userId - User ID
     * @param adminId - Admin user ID
     * @returns Updated balance
     */
    async unfreezeBalance(userId: number, adminId: number): Promise<UserBalance> {
        try {
            await this.pool.query(
                `UPDATE user_balances
         SET is_frozen = FALSE,
             freeze_reason = NULL,
             frozen_at = NULL,
             frozen_by = NULL
         WHERE user_id = $1`,
                [userId]
            );

            logger.info('Balance unfrozen', { userId, adminId });

            return this.getBalance(userId);
        } catch (error) {
            logger.error('Error unfreezing balance', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Adjust balance manually (admin only)
     * 
     * @param userId - User ID
     * @param amount - Adjustment amount (positive or negative)
     * @param reason - Adjustment reason
     * @param adminId - Admin user ID
     * @returns Transaction and updated balance
     */
    async adjustBalance(
        userId: number,
        amount: number,
        reason: string,
        adminId: number
    ): Promise<TransactionResponse> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            const balance = await this.getBalanceForUpdate(client, userId);

            const balanceBefore = balance.availableBalance;
            const balanceAfter = balanceBefore + amount;

            const transaction = await this.createTransaction(client, {
                userId,
                type: TransactionType.ADJUSTMENT,
                amount,
                currency: balance.currency,
                balanceBefore,
                balanceAfter,
                status: TransactionStatus.COMPLETED,
                description: `Admin adjustment: ${reason}`,
                metadata: { adjustedBy: adminId, reason },
                processedBy: adminId,
            });

            await client.query(
                `UPDATE user_balances
         SET available_balance = available_balance + $1,
             total_transactions = total_transactions + 1,
             last_transaction_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
                [amount, userId]
            );

            await client.query('COMMIT');

            const updatedBalance = await this.getBalance(userId);

            logger.warn('Balance adjusted', {
                userId,
                amount,
                reason,
                adminId,
            });

            return {
                transaction,
                balance: updatedBalance,
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Balance adjustment failed', { userId, amount, reason, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ==========================================================================
    // PRIVATE HELPER METHODS
    // ==========================================================================

    /**
     * Get balance with row lock (for update)
     * 
     * @param client - Database client
     * @param userId - User ID
     * @returns User balance
     * @private
     */
    private async getBalanceForUpdate(client: PoolClient, userId: number): Promise<UserBalance> {
        const result = await client.query(
            `SELECT 
        user_id as "userId",
        available_balance as "availableBalance",
        pending_balance as "pendingBalance",
        held_balance as "heldBalance",
        total_balance as "totalBalance",
        currency,
        daily_withdrawal_limit as "dailyWithdrawalLimit",
        monthly_withdrawal_limit as "monthlyWithdrawalLimit",
        minimum_balance as "minimumBalance",
        is_active as "isActive",
        is_frozen as "isFrozen"
      FROM user_balances
      WHERE user_id = $1
      FOR UPDATE`,
            [userId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Balance not found for user ${userId}`);
        }

        // Convert decimal strings to numbers
        const row = result.rows[0];
        return {
            ...row,
            availableBalance: parseFloat(row.availableBalance) || 0,
            pendingBalance: parseFloat(row.pendingBalance) || 0,
            heldBalance: parseFloat(row.heldBalance) || 0,
            totalBalance: parseFloat(row.totalBalance) || 0,
            dailyWithdrawalLimit: parseFloat(row.dailyWithdrawalLimit) || 0,
            monthlyWithdrawalLimit: parseFloat(row.monthlyWithdrawalLimit) || 0,
            minimumBalance: parseFloat(row.minimumBalance) || 0,
        };
    }

    /**
     * Create a transaction record
     * 
     * @param client - Database client
     * @param data - Transaction data
     * @returns Created transaction
     * @private
     */
    private async createTransaction(
        client: PoolClient,
        data: {
            userId: number;
            type: TransactionType;
            amount: number;
            currency: Currency;
            balanceBefore: number;
            balanceAfter: number;
            status: TransactionStatus;
            description: string;
            metadata?: Record<string, any>;
            orderId?: number;
            walletPaymentId?: number;
            withdrawalRequestId?: number;
            relatedTransactionId?: number;
            processedBy?: number;
            processingMethod?: string;
        }
    ): Promise<BalanceTransaction> {
        const transactionId = `TXN-${uuidv4()}`;

        const result = await client.query(
            `INSERT INTO balance_transactions (
        transaction_id, user_id, type, amount, currency,
        balance_before, balance_after, status, description, metadata,
        order_id, wallet_payment_id, withdrawal_request_id,
        related_transaction_id, processed_by, processing_method,
        processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING 
        id, transaction_id as "transactionId", user_id as "userId",
        type, amount, currency,
        balance_before as "balanceBefore", balance_after as "balanceAfter",
        status, description, metadata,
        order_id as "orderId",
        wallet_payment_id as "walletPaymentId",
        withdrawal_request_id as "withdrawalRequestId",
        related_transaction_id as "relatedTransactionId",
        processed_at as "processedAt",
        processed_by as "processedBy",
        processing_method as "processingMethod",
        created_at as "createdAt",
        updated_at as "updatedAt"`,
            [
                transactionId,
                data.userId,
                data.type,
                data.amount,
                data.currency,
                data.balanceBefore,
                data.balanceAfter,
                data.status,
                data.description,
                data.metadata ? JSON.stringify(data.metadata) : null,
                data.orderId,
                data.walletPaymentId,
                data.withdrawalRequestId,
                data.relatedTransactionId,
                data.processedBy,
                data.processingMethod,
                data.status === TransactionStatus.COMPLETED ? new Date() : null,
            ]
        );

        // Convert decimal strings to numbers
        const row = result.rows[0];
        return {
            ...row,
            amount: parseFloat(row.amount) || 0,
            balanceBefore: parseFloat(row.balanceBefore) || 0,
            balanceAfter: parseFloat(row.balanceAfter) || 0,
        };
    }

    /**
     * Map database hold record to BalanceHold interface
     * 
     * @param dbHold - Database hold record
     * @returns Mapped BalanceHold
     * @private
     */
    private mapHoldFromDb(dbHold: any): BalanceHold {
        return {
            id: dbHold.id,
            holdId: dbHold.hold_id,
            userId: dbHold.user_id,
            amount: parseFloat(dbHold.amount),
            currency: dbHold.currency,
            reason: dbHold.reason,
            orderId: dbHold.order_id,
            disputeId: dbHold.dispute_id,
            transactionId: dbHold.transaction_id,
            status: dbHold.status,
            heldAt: dbHold.held_at,
            expiresAt: dbHold.expires_at,
            releasedAt: dbHold.released_at,
            releasedBy: dbHold.released_by,
            description: dbHold.description,
            notes: dbHold.notes,
            metadata: dbHold.metadata,
            createdAt: dbHold.created_at,
            updatedAt: dbHold.updated_at,
        };
    }
}

// Export singleton instance
export default BalanceService;
