/**
 * Balance Controller v1
 * 
 * Handles HTTP requests for balance operations
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { BalanceService } from '../../services/balanceService';
import {
    BadRequestError,
    NotFoundError,
    ForbiddenError,
    InternalServerError
} from '../../utils/errors/ApiError';
import {
    ApiResponse,
    BalanceResponse,
    TransactionResponse,
    HoldResponse as ApiHoldResponse,
    TransactionHistoryResponse,
    BalanceStatementResponse
} from '../../types/api/balanceResponses';
import {
    DepositRequest,
    WithdrawalRequest,
    CreateHoldRequest,
    TransactionHistoryQuery,
    BalanceStatementQuery,
    FreezeBalanceRequest,
    UnfreezeBalanceRequest,
    AdjustBalanceRequest
} from '../../types/api/balanceRequests';
import { UserBalance, HoldResponse } from '../../types/balance';

// Import database pool
const pool = require('../../config/db');

export class BalanceController {
    private balanceService: BalanceService;

    constructor() {
        this.balanceService = new BalanceService(pool);
    }

    // Helper function to convert UserBalance to BalanceResponse
    private toBalanceResponse(balance: UserBalance): BalanceResponse {
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
            frozenAt: balance.frozenAt?.toISOString(),
            frozenBy: balance.frozenBy,
            createdAt: balance.createdAt.toISOString(),
            updatedAt: balance.updatedAt.toISOString()
        };
    }

    /**
     * GET /api/v1/balance/:userId
     * Get user balance
     */
    getBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = parseInt(req.params.userId);

            const balance = await this.balanceService.getBalance(userId);

            const response: ApiResponse<BalanceResponse> = {
                success: true,
                data: this.toBalanceResponse(balance),
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error: any) {
            if (error.message.includes('not found')) {
                res.status(404).json({
                    success: false,
                    error: `Balance not found for user ${req.params.userId}`,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.error('[BalanceController] getBalance Error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Internal server error',
                    timestamp: new Date().toISOString()
                });
            }
        }
    };

    /**
     * POST /api/v1/balance/deposit
     * Deposit funds to user balance
     */
    deposit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const depositData: DepositRequest = req.body;

            const result = await this.balanceService.deposit({
                userId: depositData.userId,
                amount: depositData.amount,
                description: depositData.description,
                metadata: depositData.metadata
            });

            const response: ApiResponse<TransactionResponse> = {
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    userId: result.transaction.userId,
                    type: result.transaction.type,
                    amount: result.transaction.amount,
                    currency: result.transaction.currency,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    status: result.transaction.status,
                    description: result.transaction.description,
                    orderId: result.transaction.orderId,
                    createdAt: result.transaction.createdAt.toISOString(),
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Deposit successful',
                timestamp: new Date().toISOString()
            };

            res.status(201).json(response);
        } catch (error: any) {
            if (error.message.includes('frozen')) {
                next(new ForbiddenError(error.message));
            } else if (error.message.includes('Minimum') || error.message.includes('Maximum')) {
                next(new BadRequestError(error.message));
            } else {
                next(error);
            }
        }
    };

    /**
     * POST /api/v1/balance/withdraw
     * Withdraw funds from user balance
     */
    withdraw = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const withdrawalData: WithdrawalRequest = req.body;

            const result = await this.balanceService.withdraw({
                userId: withdrawalData.userId,
                amount: withdrawalData.amount,
                destination: withdrawalData.destination,
                description: withdrawalData.description,
                metadata: withdrawalData.metadata
            });

            const response: ApiResponse<TransactionResponse> = {
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    userId: result.transaction.userId,
                    type: result.transaction.type,
                    amount: result.transaction.amount,
                    currency: result.transaction.currency,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    status: result.transaction.status,
                    description: result.transaction.description,
                    orderId: result.transaction.orderId,
                    createdAt: result.transaction.createdAt.toISOString(),
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Withdrawal successful',
                timestamp: new Date().toISOString()
            };

            res.status(201).json(response);
        } catch (error: any) {
            if (error.message.includes('Insufficient balance')) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } else if (error.message.includes('frozen')) {
                res.status(403).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } else if (error.message.includes('limit')) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.error('[BalanceController] withdraw Error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Internal server error',
                    timestamp: new Date().toISOString()
                });
            }
        }
    };

    /**
     * GET /api/v1/balance/:userId/transactions
     * Get transaction history
     */
    getTransactionHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = parseInt(req.params.userId);
            const query: TransactionHistoryQuery = {
                userId,
                type: req.query.type as string | string[],
                status: req.query.status as string | string[],
                startDate: req.query.startDate as string,
                endDate: req.query.endDate as string,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
                offset: req.query.offset ? parseInt(req.query.offset as string) : 0
            };

            const transactions = await this.balanceService.getTransactionHistory({
                userId: query.userId,
                type: query.type as any,
                status: query.status as any,
                startDate: query.startDate ? new Date(query.startDate) : undefined,
                endDate: query.endDate ? new Date(query.endDate) : undefined,
                limit: query.limit,
                offset: query.offset
            });

            // Get total count for pagination
            const total = transactions.length; // In production, get actual count from DB

            const response: ApiResponse<TransactionHistoryResponse> = {
                success: true,
                data: {
                    transactions: transactions.map(tx => ({
                        id: tx.id,
                        transactionId: tx.transactionId,
                        userId: tx.userId,
                        type: tx.type,
                        amount: tx.amount,
                        currency: tx.currency,
                        balanceBefore: tx.balanceBefore,
                        balanceAfter: tx.balanceAfter,
                        status: tx.status,
                        description: tx.description,
                        orderId: tx.orderId,
                        createdAt: tx.createdAt.toISOString()
                    })),
                    pagination: {
                        total,
                        limit: query.limit || 50,
                        offset: query.offset || 0,
                        hasMore: (query.offset || 0) + transactions.length < total
                    }
                },
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * GET /api/v1/balance/:userId/statement
     * Get balance statement for a period
     */
    getBalanceStatement = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const userId = parseInt(req.params.userId);
            const startDate = new Date(req.query.startDate as string);
            const endDate = new Date(req.query.endDate as string);

            const statement = await this.balanceService.getBalanceStatement({
                userId,
                startDate,
                endDate
            });

            const response: ApiResponse<BalanceStatementResponse> = {
                success: true,
                data: {
                    userId: statement.userId,
                    period: {
                        startDate: statement.period.startDate.toISOString(),
                        endDate: statement.period.endDate.toISOString()
                    },
                    openingBalance: statement.openingBalance,
                    closingBalance: statement.closingBalance,
                    totalDeposits: statement.totalDeposits,
                    totalWithdrawals: statement.totalWithdrawals,
                    totalEarnings: statement.totalEarnings,
                    totalDeductions: statement.totalDeductions,
                    transactions: statement.transactions.map(tx => ({
                        transactionId: tx.transactionId,
                        type: tx.type,
                        amount: tx.amount,
                        status: tx.status,
                        description: tx.description,
                        createdAt: tx.createdAt.toISOString()
                    })),
                    currency: statement.currency
                },
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/v1/balance/hold
     * Create a balance hold
     */
    createHold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const holdData: CreateHoldRequest = req.body;

            const result = await this.balanceService.createHold({
                userId: holdData.userId,
                amount: holdData.amount,
                reason: holdData.reason,
                metadata: holdData.metadata
            });

            const response: ApiResponse<ApiHoldResponse> = {
                success: true,
                data: {
                    holdId: result.hold.holdId,
                    userId: result.hold.userId,
                    amount: result.hold.amount,
                    currency: result.hold.currency,
                    status: result.hold.status,
                    reason: result.hold.reason,
                    expiresAt: result.hold.expiresAt?.toISOString(),
                    createdAt: result.hold.createdAt.toISOString(),
                    updatedAt: result.hold.updatedAt.toISOString()
                },
                message: 'Hold created successfully',
                timestamp: new Date().toISOString()
            };

            res.status(201).json(response);
        } catch (error: any) {
            if (error.message.includes('Insufficient balance')) {
                res.status(400).json({
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            } else {
                console.error('[BalanceController] createHold Error:', error);
                res.status(500).json({
                    success: false,
                    error: error.message || 'Internal server error',
                    timestamp: new Date().toISOString()
                });
            }
        }
    };

    /**
     * POST /api/v1/balance/hold/:holdId/release
     * Release a balance hold
     */
    releaseHold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const holdId = req.params.holdId;

            const result = await this.balanceService.releaseHold(holdId);

            const response: ApiResponse<ApiHoldResponse> = {
                success: true,
                data: {
                    holdId: result.hold.holdId,
                    userId: result.hold.userId,
                    amount: result.hold.amount,
                    currency: result.hold.currency,
                    status: result.hold.status,
                    reason: result.hold.reason,
                    expiresAt: result.hold.expiresAt?.toISOString(),
                    createdAt: result.hold.createdAt.toISOString(),
                    updatedAt: result.hold.updatedAt.toISOString()
                },
                message: 'Hold released successfully',
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error: any) {
            if (error.message.includes('not found')) {
                next(new NotFoundError(error.message));
            } else if (error.message.includes('not active')) {
                next(new BadRequestError(error.message));
            } else {
                next(error);
            }
        }
    };

    /**
     * POST /api/v1/balance/hold/:holdId/capture
     * Capture a balance hold
     */
    captureHold = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const holdId = req.params.holdId;
            const amount = req.body.amount; // Optional partial capture

            const result = await this.balanceService.captureHold(holdId);

            const response: ApiResponse<TransactionResponse> = {
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    userId: result.transaction.userId,
                    type: result.transaction.type,
                    amount: result.transaction.amount,
                    currency: result.transaction.currency,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    status: result.transaction.status,
                    description: result.transaction.description,
                    orderId: result.transaction.orderId,
                    createdAt: result.transaction.createdAt.toISOString(),
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Hold captured successfully',
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error: any) {
            if (error.message.includes('not found')) {
                next(new NotFoundError(error.message));
            } else if (error.message.includes('not active')) {
                next(new BadRequestError(error.message));
            } else {
                next(error);
            }
        }
    };

    /**
     * POST /api/v1/balance/admin/freeze
     * Freeze user balance (Admin only)
     */
    freezeBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const freezeData: FreezeBalanceRequest = req.body;
            const adminId = (req as any).user.id; // Get from authenticated user

            const result = await this.balanceService.freezeBalance(
                freezeData.userId,
                freezeData.reason,
                adminId
            );

            const response: ApiResponse<BalanceResponse> = {
                success: true,
                data: this.toBalanceResponse(result),
                message: 'Balance frozen successfully',
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/v1/balance/admin/unfreeze
     * Unfreeze user balance (Admin only)
     */
    unfreezeBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const unfreezeData: UnfreezeBalanceRequest = req.body;
            const adminId = (req as any).user.id; // Get from authenticated user

            const result = await this.balanceService.unfreezeBalance(
                unfreezeData.userId,
                adminId
            );

            const response: ApiResponse<BalanceResponse> = {
                success: true,
                data: this.toBalanceResponse(result),
                message: 'Balance unfrozen successfully',
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    /**
     * POST /api/v1/balance/admin/adjust
     * Adjust user balance (Admin only)
     */
    adjustBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const adjustData: AdjustBalanceRequest = req.body;
            const adminId = (req as any).user.id; // Get from authenticated user

            const result = await this.balanceService.adjustBalance(
                adjustData.userId,
                adjustData.amount,
                adjustData.reason,
                adminId
            );

            const response: ApiResponse<TransactionResponse> = {
                success: true,
                data: {
                    transactionId: result.transaction.transactionId,
                    userId: result.transaction.userId,
                    type: result.transaction.type,
                    amount: result.transaction.amount,
                    currency: result.transaction.currency,
                    balanceBefore: result.transaction.balanceBefore,
                    balanceAfter: result.transaction.balanceAfter,
                    status: result.transaction.status,
                    description: result.transaction.description,
                    orderId: result.transaction.orderId,
                    createdAt: result.transaction.createdAt.toISOString(),
                    balance: this.toBalanceResponse(result.balance)
                },
                message: 'Balance adjusted successfully',
                timestamp: new Date().toISOString()
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };
}
