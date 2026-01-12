/**
 * Top-Up Routes
 * Handles user top-up requests for Egypt payment methods
 * 
 * Requirements: 1.4, 1.5, 2.3, 2.4, 3.3, 6.4, 6.5, 8.1
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyToken } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const { topupRateLimit } = require('../middleware/rateLimit');
const { TopupService, VALID_PAYMENT_METHODS, MIN_TOPUP_AMOUNT, MAX_TOPUP_AMOUNT } = require('../services/topupService');
const { PlatformWalletService } = require('../services/platformWalletService');
const { BalanceService } = require('../services/balanceService');
const { getNotificationService } = require('../services/notificationService');
const logger = require('../config/logger');
const pool = require('../config/db');

// Initialize services
const topupService = new TopupService(pool);
const platformWalletService = new PlatformWalletService(pool);
const balanceService = new BalanceService(pool);

// Wire up dependencies
topupService.setBalanceService(balanceService);

// Validation schemas
const createTopupSchema = Joi.object({
  amount: Joi.number()
    .min(MIN_TOPUP_AMOUNT)
    .max(MAX_TOPUP_AMOUNT)
    .required()
    .messages({
      'number.min': `Minimum top-up amount is ${MIN_TOPUP_AMOUNT} EGP`,
      'number.max': `Maximum top-up amount is ${MAX_TOPUP_AMOUNT} EGP`,
      'any.required': 'Amount is required'
    }),
  paymentMethod: Joi.string()
    .valid(...VALID_PAYMENT_METHODS)
    .required()
    .messages({
      'any.only': 'Invalid payment method',
      'any.required': 'Payment method is required'
    }),
  transactionReference: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Transaction reference is required',
      'any.required': 'Transaction reference is required'
    }),
  platformWalletId: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
});

const topupHistoryQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'verified', 'rejected')
    .optional(),
  startDate: Joi.date()
    .iso()
    .optional(),
  endDate: Joi.date()
    .iso()
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
});

/**
 * @route   POST /api/topups
 * @desc    Create a new top-up request
 * @access  Private (Authenticated users)
 * Requirements: 1.4, 1.5, 2.3, 2.4, 8.1
 */
router.post('/', verifyToken, topupRateLimit, validateBody(createTopupSchema), async (req, res, next) => {
  try {
    const { amount, paymentMethod, transactionReference, platformWalletId } = req.body;
    const userId = req.user.userId;

    // Set notification service if available
    const notificationService = getNotificationService();
    if (notificationService) {
      topupService.setNotificationService(notificationService);
    }

    // Create the top-up request
    const topup = await topupService.createTopup({
      userId,
      amount: parseFloat(amount),
      paymentMethod,
      transactionReference,
      platformWalletId: platformWalletId || null
    });

    logger.info('Top-up request created via API', {
      topupId: topup.id,
      userId,
      amount,
      paymentMethod,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Top-up request submitted successfully. Please wait for admin verification.',
      topup: {
        id: topup.id,
        userId: topup.user_id,
        amount: parseFloat(topup.amount),
        paymentMethod: topup.payment_method,
        transactionReference: topup.transaction_reference,
        platformWalletId: topup.platform_wallet_id,
        status: topup.status,
        createdAt: topup.created_at,
        updatedAt: topup.updated_at
      },
      estimatedConfirmationTime: '5-30 minutes'
    });
  } catch (error) {
    // Handle duplicate reference error
    if (error.code === 'DUPLICATE_REFERENCE') {
      return res.status(409).json({
        success: false,
        error: 'This transaction was already submitted',
        code: 'DUPLICATE_REFERENCE',
        existingStatus: error.existingTopup?.status || 'unknown'
      });
    }

    logger.error('Error creating top-up request', {
      error: error.message,
      userId: req.user?.userId,
      body: req.body,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   GET /api/topups
 * @desc    Get user's top-up history with pagination
 * @access  Private (Authenticated users)
 * Requirements: 6.4, 6.5
 */
router.get('/', verifyToken, validateQuery(topupHistoryQuerySchema), async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { status, startDate, endDate, limit, offset } = req.query;

    const result = await topupService.getTopupHistory(userId, {
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit) || 20,
      offset: parseInt(offset) || 0
    });

    res.json({
      success: true,
      topups: result.topups.map(topup => ({
        id: topup.id,
        userId: topup.user_id,
        amount: parseFloat(topup.amount),
        paymentMethod: topup.payment_method,
        transactionReference: topup.transaction_reference,
        platformWalletId: topup.platform_wallet_id,
        status: topup.status,
        rejectionReason: topup.rejection_reason,
        verifiedAt: topup.verified_at,
        createdAt: topup.created_at,
        updatedAt: topup.updated_at
      })),
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting top-up history', {
      error: error.message,
      userId: req.user?.userId,
      query: req.query,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   GET /api/topups/:id
 * @desc    Get a single top-up by ID
 * @access  Private (Owner only)
 * Requirements: 3.3
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const topupId = parseInt(req.params.id);
    const userId = req.user.userId;

    if (isNaN(topupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid top-up ID'
      });
    }

    // Get topup and verify ownership
    const topup = await topupService.getTopupById(topupId, userId);

    if (!topup) {
      return res.status(404).json({
        success: false,
        error: 'Top-up not found'
      });
    }

    res.json({
      success: true,
      topup: {
        id: topup.id,
        userId: topup.user_id,
        amount: parseFloat(topup.amount),
        paymentMethod: topup.payment_method,
        transactionReference: topup.transaction_reference,
        platformWalletId: topup.platform_wallet_id,
        status: topup.status,
        rejectionReason: topup.rejection_reason,
        verifiedBy: topup.verified_by,
        verifiedAt: topup.verified_at,
        createdAt: topup.created_at,
        updatedAt: topup.updated_at
      }
    });
  } catch (error) {
    logger.error('Error getting top-up by ID', {
      error: error.message,
      topupId: req.params.id,
      userId: req.user?.userId,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   GET /api/topups/wallets/active
 * @desc    Get active platform wallets for top-up
 * @access  Private (Authenticated users)
 * Requirements: 1.1, 1.2, 2.1
 */
router.get('/wallets/active', verifyToken, async (req, res, next) => {
  try {
    const { paymentMethod } = req.query;

    // Validate payment method if provided
    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment method'
      });
    }

    const wallets = await platformWalletService.getActiveWallets(paymentMethod || null);

    res.json({
      success: true,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        paymentMethod: wallet.payment_method,
        phoneNumber: wallet.phone_number,
        instapayAlias: wallet.instapay_alias,
        holderName: wallet.holder_name
      }))
    });
  } catch (error) {
    logger.error('Error getting active wallets', {
      error: error.message,
      paymentMethod: req.query.paymentMethod,
      userId: req.user?.userId,
      ip: req.ip
    });

    next(error);
  }
});

module.exports = router;
