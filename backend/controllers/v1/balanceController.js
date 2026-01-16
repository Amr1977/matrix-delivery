/**
 * Balance Controller v1 (JS Version)
 */

const { BalanceService } = require('../../services/balanceService');
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
            const result = await this.balanceService.deposit({
                userId: req.body.userId,
                amount: req.body.amount,
                description: req.body.description,
                metadata: req.body.metadata
            });
            res.status(201).json({
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    amount: result.transaction.amount,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    createdAt: new Date().toISOString(),
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Deposit successful'
            });
        } catch (error) {
            if (error.message && error.message.includes('frozen')) return sendError(res, 403, error.message);
            if (error.message && (error.message.includes('Minimum') || error.message.includes('Maximum'))) return sendError(res, 400, error.message);
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
