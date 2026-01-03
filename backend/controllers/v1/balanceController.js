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
            res.status(201).json({
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    amount: result.transaction.amount,
                    balanceAfter: result.transaction.balanceAfter,
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Withdrawal successful'
            });
        } catch (error) {
            if (error.message && error.message.includes('Insufficient')) return sendError(res, 400, error.message);
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
}

module.exports = { BalanceController };
