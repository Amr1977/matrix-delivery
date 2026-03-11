/**
 * Balance Controller v1 (JS Version)
 */

const { BalanceService } = require('../../services/balanceService');
const { getNotificationService } = require('../../services/notificationService');
const TelegramWithdrawalNotificationService = require('../../services/telegramWithdrawalNotificationService');
const TelegramDepositNotificationService = require('../../services/telegramDepositNotificationService');
const pool = require('../../config/db');

// Simple error helpers equivalent to ApiError classes
const sendError = (res, code, message) => {
    return res.status(code).json({
        success: false,
        error: message,
        timestamp: new Date().toISOString()
    });
};

class BalanceController {
    constructor() {
        this.balanceService = new BalanceService(pool);
        let notificationService = null;
        try {
            notificationService = getNotificationService();
        } catch (error) {
            notificationService = null;
        }
        if (notificationService && typeof this.balanceService.setNotificationService === 'function') {
            this.balanceService.setNotificationService(notificationService);
        }

        // Initialize Telegram services if configured
        this.telegramWithdrawalService = null;
        this.telegramDepositService = null;
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID) {
            try {
                this.telegramWithdrawalService = new TelegramWithdrawalNotificationService(
                    process.env.TELEGRAM_BOT_TOKEN,
                    process.env.TELEGRAM_ADMIN_CHAT_ID
                );
                this.telegramDepositService = new TelegramDepositNotificationService(
                    process.env.TELEGRAM_BOT_TOKEN,
                    process.env.TELEGRAM_ADMIN_CHAT_ID
                );
            } catch (error) {
                console.warn('Telegram service initialization failed:', error.message);
            }
        }
    }

    // Helper to format balance response
    toBalanceResponse(balance) {
        return {
            userId: balance.userId,
            availableBalance: balance.availableBalance,
            pendingBalance: balance.pendingBalance,
            heldBalance: balance.heldBalance,
            totalBalance: balance.totalBalance,
            currency: balance.currency,
            dailyWithdrawalLimit: balance.dailyWithdrawalLimit,
            monthlyWithdrawalLimit: balance.monthlyWithdrawalLimit,
            minimumBalance: balance.minimumBalance,
            lifetimeDeposits: balance.lifetimeDeposits,
            lifetimeWithdrawals: balance.lifetimeWithdrawals,
            lifetimeEarnings: balance.lifetimeEarnings,
            totalTransactions: balance.totalTransactions,
            isActive: balance.isActive,
            isFrozen: balance.isFrozen,
            freezeReason: balance.freezeReason,
            frozenAt: balance.frozenAt ? new Date(balance.frozenAt).toISOString() : null,
            frozenBy: balance.frozenBy,
            createdAt: balance.createdAt ? new Date(balance.createdAt).toISOString() : null,
            updatedAt: balance.updatedAt ? new Date(balance.updatedAt).toISOString() : null
        };
    }

    // GET /api/v1/balance/admin/deposits
    getPendingDeposits = async (req, res, next) => {
        try {
            const result = await pool.query(
                'SELECT * FROM deposit_requests WHERE status = $1 ORDER BY created_at DESC',
                ['pending']
            );

            const deposits = result.rows.map(row => ({
                id: row.id,
                requestNumber: row.request_number,
                userId: row.user_id,
                amount: row.amount,
                currency: row.currency,
                status: row.status,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));

            res.status(200).json({
                success: true,
                data: deposits,
                count: deposits.length
            });
        } catch (error) {
            console.error('Error fetching pending deposits:', error);
            return sendError(res, 500, error.message);
        }
    };

    // GET /api/v1/balance/:userId
    getBalance = async (req, res, next) => {
        try {
            const userId = req.params.userId;
            const balance = await this.balanceService.getBalance(userId);
            res.status(200).json({
                success: true,
                data: this.toBalanceResponse(balance),
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Balance error:', error);
            if (error.message && error.message.includes('not found')) {
                return sendError(res, 404, `Balance not found for user ${req.params.userId}`);
            }
            return sendError(res, 500, error.message || 'Internal server error');
        }
    };

    // POST /api/v1/balance/deposit
    deposit = async (req, res, next) => {
        try {
            console.log('💳 Creating deposit request (pending approval)');
            
            // Create pending deposit request instead of direct balance update
            const depositRequestResult = await pool.query(
                'INSERT INTO deposit_requests (request_number, user_id, amount, deposit_method, destination_type, destination_details, status, requires_verification) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
                [
                    'DR-' + Date.now(),
                    req.body.userId,
                    req.body.amount,
                    req.body.depositMethod || 'bank_transfer',
                    req.body.destinationType || 'bank',
                    JSON.stringify(req.body.metadata || {}),
                    'pending',
                    false
                ]
            );

            const depositRequest = depositRequestResult.rows[0];
            console.log('✅ Deposit request created:', depositRequest.id);

            // Send Telegram notification to admin if service is configured
            if (this.telegramDepositService) {
                try {
                    console.log('🔔 Sending Telegram notification for deposit approval');
                    
                    // Fetch user info for the notification
                    const userResult = await pool.query(
                        'SELECT name, phone FROM users WHERE id = $1',
                        [req.body.userId]
                    );
                    const user = userResult.rows[0];
                    
                    if (user) {
                        // Create a deposit object for notification
                        const deposit = {
                            id: depositRequest.id,
                            user_id: req.body.userId,
                            amount: depositRequest.amount,
                            created_at: depositRequest.created_at
                        };
                        
                        const formattedUser = {
                            full_name: user.name,
                            phone_number: user.phone
                        };
                        
                        await this.telegramDepositService.notifyDeposit(deposit, formattedUser);
                        console.log('✅ Telegram deposit notification sent');
                    }
                } catch (error) {
                    console.error('Failed to send Telegram deposit notification:', error.message);
                    // Don't fail the deposit request if notification fails
                }
            }

            res.status(201).json({
                success: true,
                data: {
                    depositRequestId: depositRequest.id,
                    requestNumber: depositRequest.request_number,
                    amount: depositRequest.amount,
                    status: depositRequest.status,
                    createdAt: depositRequest.created_at,
                    message: 'Deposit request created - awaiting admin approval'
                },
                message: 'Deposit request pending approval'
            });
        } catch (error) {
            if (error.message && error.message.includes('frozen')) return sendError(res, 403, error.message);
            if (error.message && (error.message.includes('Minimum') || error.message.includes('Maximum'))) return sendError(res, 400, error.message);
            return sendError(res, 500, error.message);
        }
    };

    // POST /api/v1/balance/admin/deposits/:id/approve
    approveDeposit = async (req, res, next) => {
        try {
            const depositId = req.params.id;
            const adminId = req.user?.id || process.env.TELEGRAM_ADMIN_ID;

            console.log('✅ Admin approving deposit:', depositId);

            const depositResult = await pool.query(
                'SELECT * FROM deposit_requests WHERE id = $1',
                [depositId]
            );

            if (depositResult.rows.length === 0) {
                return sendError(res, 404, 'Deposit request not found');
            }

            const deposit = depositResult.rows[0];
            if (deposit.status !== 'pending') {
                return sendError(res, 400, `Deposit is already ${deposit.status}`);
            }

            const reference = req.body.reference || `DEP-${Date.now()}`;

            await pool.query(
                'UPDATE deposit_requests SET status = $1, processed_by = $2, transaction_reference = $3, processed_at = NOW() WHERE id = $4',
                ['completed', adminId, reference, depositId]
            );

            await pool.query(
                'UPDATE user_balances SET available_balance = available_balance + $1, updated_at = NOW() WHERE user_id = $2',
                [deposit.amount, deposit.user_id]
            );

            console.log('✅ Deposit approved:', deposit.amount, 'EGP');

            res.status(200).json({
                success: true,
                data: {
                    depositId: deposit.id,
                    status: 'completed',
                    reference: reference,
                    amount: deposit.amount
                },
                message: 'Deposit approved and balance updated'
            });
        } catch (error) {
            console.error('Error approving deposit:', error);
            return sendError(res, 500, error.message);
        }
    };

    // POST /api/v1/balance/admin/deposits/:id/reject
    rejectDeposit = async (req, res, next) => {
        try {
            const depositId = req.params.id;
            const adminId = req.user?.id || process.env.TELEGRAM_ADMIN_ID;
            const reason = req.body.reason || 'No reason provided';

            console.log('❌ Admin rejecting deposit:', depositId);

            const depositResult = await pool.query(
                'SELECT * FROM deposit_requests WHERE id = $1',
                [depositId]
            );

            if (depositResult.rows.length === 0) {
                return sendError(res, 404, 'Deposit request not found');
            }

            const deposit = depositResult.rows[0];
            if (deposit.status !== 'pending') {
                return sendError(res, 400, `Deposit is already ${deposit.status}`);
            }

            await pool.query(
                'UPDATE deposit_requests SET status = $1, processed_by = $2, rejection_reason = $3, processed_at = NOW() WHERE id = $4',
                ['rejected', adminId, reason, depositId]
            );

            console.log('✅ Deposit rejected');

            res.status(200).json({
                success: true,
                data: {
                    depositId: deposit.id,
                    status: 'rejected',
                    reason: reason
                },
                message: 'Deposit rejected'
            });
        } catch (error) {
            console.error('Error rejecting deposit:', error);
            return sendError(res, 500, error.message);
        }
    };

    // POST /api/v1/balance/withdraw
    withdraw = async (req, res, next) => {
        try {
            const result = await this.balanceService.withdraw({
                userId: req.body.userId,
                amount: req.body.amount,
                destination: req.body.destination,
                description: req.body.description,
                metadata: req.body.metadata
            });

            // Send Telegram notification to admin if service is configured
            if (this.telegramWithdrawalService) {
                try {
                    console.log('🔔 Sending Telegram notification for withdrawal:', result.withdrawalRequestId);
                    
                    // Fetch withdrawal request and user info for the notification
                    const withdrawalResult = await pool.query(
                        'SELECT id, amount, withdrawal_method, destination_details, created_at FROM withdrawal_requests WHERE id = $1',
                        [result.withdrawalRequestId]
                    );
                    const withdrawal = withdrawalResult.rows[0];
                    
                    const userResult = await pool.query(
                        'SELECT name, phone FROM users WHERE id = $1',
                        [req.body.userId]
                    );
                    const user = userResult.rows[0];
                    
                    if (withdrawal && user) {
                        console.log('✅ Found withdrawal and user, sending notification');
                        // Format user object to match service expectations
                        const formattedUser = {
                            full_name: user.name,
                            phone_number: user.phone
                        };
                        await this.telegramWithdrawalService.notifyWithdrawalRequest(withdrawal, formattedUser);
                        console.log('✅ Telegram notification sent successfully');
                    } else {
                        console.log('⚠️ Withdrawal or user not found');
                    }
                } catch (error) {
                    console.error('❌ Failed to send Telegram notification:', error.message);
                    // Don't fail the withdrawal request if Telegram notification fails
                }
            } else {
                console.log('⚠️ Telegram withdrawal service not configured');
            }

            const data = {
                withdrawalRequestId: result.withdrawalRequestId,
                balance: this.toBalanceResponse(result.balance)
            };
            if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production' && result.verificationCodeDebug) {
                data.verificationCodeDebug = result.verificationCodeDebug;
            }
            res.status(201).json({
                success: true,
                data,
                message: 'Verification code sent to your email'
            });
        } catch (error) {
            if (error.message && error.message.includes('frozen')) return sendError(res, 403, error.message);
            if (error.message && error.message.includes('limit')) return sendError(res, 400, error.message);
            if (error.message && error.message.includes('Insufficient')) return sendError(res, 400, error.message);
            return sendError(res, 500, error.message);
        }
    };

    // POST /api/v1/balance/withdraw/:id/verify
    verifyWithdrawal = async (req, res, next) => {
        try {
            const result = await this.balanceService.verifyWithdrawal({
                userId: req.body.userId,
                withdrawalRequestId: req.params.id || req.body.withdrawalRequestId,
                code: req.body.code
            });
            res.status(200).json({
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    amount: result.transaction.amount,
                    balanceAfter: result.transaction.balanceAfter,
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Withdrawal request confirmed'
            });
        } catch (error) {
            if (error.message && error.message.includes('Unauthorized')) return sendError(res, 403, error.message);
            if (error.message && (error.message.includes('Invalid verification code') || error.message.includes('expired'))) {
                return sendError(res, 400, error.message);
            }
            if (error.message && error.message.includes('Insufficient')) return sendError(res, 400, error.message);
            return sendError(res, 500, error.message);
        }
    };

    // GET /api/v1/balance/admin/withdrawals
    getPendingWithdrawals = async (req, res, next) => {
        try {
            const { limit, offset } = req.query;
            const result = await this.balanceService.getPendingWithdrawals({
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined
            });
            res.status(200).json({
                success: true,
                data: result
            });
        } catch (error) {
            return sendError(res, 500, error.message);
        }
    };

    // POST /api/v1/balance/admin/withdrawals/:id/approve
    approveWithdrawal = async (req, res, next) => {
        try {
            const { reference } = req.body;
            if (!reference) return sendError(res, 400, 'Transaction reference is required');
            
            // In a real app, req.user.id would come from the auth middleware
            // Assuming req.user is populated
            const adminId = req.user ? req.user.id : null;

            await this.balanceService.approveWithdrawal(adminId, req.params.id, reference);
            
            res.status(200).json({
                success: true,
                message: 'Withdrawal approved successfully'
            });
        } catch (error) {
            if (error.message === 'Request not found') return sendError(res, 404, error.message);
            if (error.message === 'Request not eligible for approval') return sendError(res, 400, error.message);
            return sendError(res, 500, error.message);
        }
    };

    // POST /api/v1/balance/admin/withdrawals/:id/reject
    rejectWithdrawal = async (req, res, next) => {
        try {
            const { reason } = req.body;
            if (!reason) return sendError(res, 400, 'Rejection reason is required');

            const adminId = req.user ? req.user.id : null;

            await this.balanceService.rejectWithdrawal(adminId, req.params.id, reason);
            
            res.status(200).json({
                success: true,
                message: 'Withdrawal rejected successfully'
            });
        } catch (error) {
            if (error.message === 'Request not found') return sendError(res, 404, error.message);
            if (error.message === 'Request not eligible for rejection') return sendError(res, 400, error.message);
            return sendError(res, 500, error.message);
        }
    };

    // GET /api/v1/balance/:userId/transactions
    getTransactionHistory = async (req, res, next) => {
        try {
            const userId = req.params.userId;

            // Parse query parameters
            const {
                limit,
                offset,
                type,
                status,
                startDate,
                endDate,
                orderId,
                sortBy,
                sortOrder
            } = req.query;

            // Build options object
            const options = {
                userId,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
                type,
                status,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                orderId,
                sortBy,
                sortOrder
            };

            // Get transaction history from service
            const result = await this.balanceService.getTransactionHistory(options);

            res.status(200).json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Transaction history error:', error);
            if (error.message && error.message.includes('required')) {
                return sendError(res, 400, error.message);
            }
            return sendError(res, 500, error.message || 'Failed to retrieve transaction history');
        }
    };

    // POST /api/v1/balance/withdraw/:id/cancel
    cancelWithdrawal = async (req, res, next) => {
        try {
            const userId = req.body.userId;
            const withdrawalRequestId = req.params.id || req.body.withdrawalRequestId;
            const reason = req.body.reason;

            const result = await this.balanceService.cancelWithdrawal({
                userId,
                withdrawalRequestId,
                reason
            });

            res.status(200).json({
                success: true,
                data: {
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Withdrawal request cancelled'
            });
        } catch (error) {
            if (error.message && error.message.includes('Unauthorized')) {
                return sendError(res, 403, error.message);
            }
            if (error.message && error.message.includes('not pending')) {
                return sendError(res, 400, error.message);
            }
            if (error.message && error.message.includes('not found')) {
                return sendError(res, 404, error.message);
            }
            return sendError(res, 500, error.message || 'Failed to cancel withdrawal');
        }
    };
}

module.exports = { BalanceController };
