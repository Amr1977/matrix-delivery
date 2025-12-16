/**
 * Balance Routes v1
 * 
 * Defines all balance-related API endpoints
 */

import express from 'express';
import { BalanceController } from '../../controllers/v1/balanceController';
import {
    validateDeposit,
    validateWithdrawal,
    validateCreateHold,
    validateHoldId,
    validateUserId,
    validateTransactionHistory,
    validateBalanceStatement,
    validateFreezeBalance,
    validateUnfreezeBalance,
    validateAdjustBalance
} from '../../middleware/validation/balanceValidation';
import {
    balanceRateLimiter,
    depositRateLimiter,
    withdrawalRateLimiter,
    adminRateLimiter
} from '../../middleware/rateLimiter';

// Import auth middleware (JavaScript module)
const { verifyToken, verifyBalanceOwnership, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const controller = new BalanceController();

// Apply authentication to all balance routes
router.use(verifyToken);

// Apply general rate limiting to all balance routes
router.use(balanceRateLimiter);

// ============================================================================
// PUBLIC ENDPOINTS (Authenticated Users)
// ============================================================================

/**
 * GET /api/v1/balance/:userId
 * Get user balance
 * 
 * @auth Required
 * @access User (own balance) or Admin
 */
router.get(
    '/:userId',
    validateUserId,
    verifyBalanceOwnership,
    controller.getBalance
);

/**
 * POST /api/v1/balance/deposit
 * Deposit funds to user balance
 * 
 * @auth Required
 * @access User (own balance) or Admin
 * @rateLimit 20 deposits per hour
 */
router.post(
    '/deposit',
    depositRateLimiter,
    validateDeposit,
    verifyBalanceOwnership,
    controller.deposit
);

/**
 * POST /api/v1/balance/withdraw
 * Withdraw funds from user balance
 * 
 * @auth Required
 * @access User (own balance) or Admin
 * @rateLimit 10 withdrawals per hour
 */
router.post(
    '/withdraw',
    withdrawalRateLimiter,
    validateWithdrawal,
    verifyBalanceOwnership,
    controller.withdraw
);

/**
 * GET /api/v1/balance/:userId/transactions
 * Get transaction history
 * 
 * @auth Required
 * @access User (own transactions) or Admin
 */
router.get(
    '/:userId/transactions',
    validateTransactionHistory,
    verifyBalanceOwnership,
    controller.getTransactionHistory
);

/**
 * GET /api/v1/balance/:userId/statement
 * Get balance statement for a period
 * 
 * @auth Required
 * @access User (own statement) or Admin
 */
router.get(
    '/:userId/statement',
    validateBalanceStatement,
    verifyBalanceOwnership,
    controller.getBalanceStatement
);

/**
 * POST /api/v1/balance/hold
 * Create a balance hold (escrow)
 * 
 * @auth Required
 * @access User (own balance) or Admin
 */
router.post(
    '/hold',
    validateCreateHold,
    verifyBalanceOwnership,
    controller.createHold
);

/**
 * POST /api/v1/balance/hold/:holdId/release
 * Release a balance hold
 * 
 * @auth Required
 * @access User (own hold) or Admin
 */
router.post(
    '/hold/:holdId/release',
    validateHoldId,
    // verifyHoldOwnership middleware will be added
    controller.releaseHold
);

/**
 * POST /api/v1/balance/hold/:holdId/capture
 * Capture a balance hold
 * 
 * @auth Required
 * @access User (own hold) or Admin
 */
router.post(
    '/hold/:holdId/capture',
    validateHoldId,
    // verifyHoldOwnership middleware will be added
    controller.captureHold
);

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/balance/admin/freeze
 * Freeze user balance
 * 
 * @auth Required
 * @access Admin only
 * @rateLimit 50 requests per 15 minutes
 */
router.post(
    '/admin/freeze',
    adminRateLimiter,
    requireAdmin,
    validateFreezeBalance,
    controller.freezeBalance
);

/**
 * POST /api/v1/balance/admin/unfreeze
 * Unfreeze user balance
 * 
 * @auth Required
 * @access Admin only
 * @rateLimit 50 requests per 15 minutes
 */
router.post(
    '/admin/unfreeze',
    adminRateLimiter,
    requireAdmin,
    validateUnfreezeBalance,
    controller.unfreezeBalance
);

/**
 * POST /api/v1/balance/admin/adjust
 * Adjust user balance (add or subtract)
 * 
 * @auth Required
 * @access Admin only
 * @rateLimit 50 requests per 15 minutes
 */
router.post(
    '/admin/adjust',
    adminRateLimiter,
    requireAdmin,
    validateAdjustBalance,
    controller.adjustBalance
);

export default router;
