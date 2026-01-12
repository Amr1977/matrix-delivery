/**
 * Admin Top-Up Routes
 * Handles admin verification and management of top-up requests
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.8, 5.7
 */

const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyAdmin } = require('../middleware/auth');
const { validateBody, validateQuery } = require('../middleware/validation');
const { TopupService, VALID_PAYMENT_METHODS } = require('../services/topupService');
const { PlatformWalletService } = require('../services/platformWalletService');
const { BalanceService } = require('../services/balanceService');
const { getNotificationService } = require('../services/notificationService');

// Helper to safely get notification service
const safeGetNotificationService = () => {
  try {
    return getNotificationService();
  } catch (error) {
    // Service not initialized yet - this is okay, notifications will be skipped
    return null;
  }
};
const logger = require('../config/logger');
const pool = require('../config/db');

// Initialize services
const topupService = new TopupService(pool);
const platformWalletService = new PlatformWalletService(pool);
const balanceService = new BalanceService(pool);

// Wire up dependencies
topupService.setBalanceService(balanceService);

// Validation schemas
const pendingTopupsQuerySchema = Joi.object({
  paymentMethod: Joi.string()
    .valid(...VALID_PAYMENT_METHODS)
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
    .default(50),
  offset: Joi.number()
    .integer()
    .min(0)
    .default(0)
});

const rejectTopupSchema = Joi.object({
  reason: Joi.string()
    .trim()
    .min(1)
    .max(500)
    .required()
    .messages({
      'string.empty': 'Rejection reason is required',
      'any.required': 'Rejection reason is required'
    })
});

const createWalletSchema = Joi.object({
  paymentMethod: Joi.string()
    .valid(...VALID_PAYMENT_METHODS)
    .required()
    .messages({
      'any.only': 'Invalid payment method',
      'any.required': 'Payment method is required'
    }),
  phoneNumber: Joi.string()
    .trim()
    .max(20)
    .when('paymentMethod', {
      is: Joi.valid('vodafone_cash', 'orange_money', 'etisalat_cash', 'we_pay'),
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, '')
    })
    .messages({
      'any.required': 'Phone number is required for smart wallets'
    }),
  instapayAlias: Joi.string()
    .trim()
    .max(100)
    .when('paymentMethod', {
      is: 'instapay',
      then: Joi.required(),
      otherwise: Joi.optional().allow(null, '')
    })
    .messages({
      'any.required': 'InstaPay alias is required for InstaPay wallets'
    }),
  holderName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Holder name is required',
      'any.required': 'Holder name is required'
    }),
  dailyLimit: Joi.number()
    .positive()
    .default(50000),
  monthlyLimit: Joi.number()
    .positive()
    .default(500000)
});

const updateWalletSchema = Joi.object({
  phoneNumber: Joi.string()
    .trim()
    .max(20)
    .optional()
    .allow(null, ''),
  instapayAlias: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(null, ''),
  holderName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  dailyLimit: Joi.number()
    .positive()
    .optional(),
  monthlyLimit: Joi.number()
    .positive()
    .optional(),
  isActive: Joi.boolean()
    .optional()
});

/**
 * @route   GET /api/admin/topups/pending
 * @desc    Get pending top-up requests for admin verification
 * @access  Admin only
 * Requirements: 4.1, 4.2, 4.6, 4.8
 */
router.get('/pending', verifyAdmin, validateQuery(pendingTopupsQuerySchema), async (req, res, next) => {
  try {
    const { paymentMethod, startDate, endDate, limit, offset } = req.query;

    // Set notification service if available
    const notificationService = safeGetNotificationService();
    if (notificationService) {
      topupService.setNotificationService(notificationService);
    }

    const result = await topupService.getPendingTopups({
      paymentMethod,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });

    logger.info('Admin fetched pending topups', {
      adminId: req.admin.id,
      filters: { paymentMethod, startDate, endDate },
      resultCount: result.topups.length,
      pendingCount: result.pendingCount,
      ip: req.ip
    });

    res.json({
      success: true,
      topups: result.topups.map(topup => ({
        id: topup.id,
        userId: topup.user_id,
        userName: topup.user_name,
        userEmail: topup.user_email,
        userPhone: topup.user_phone,
        amount: parseFloat(topup.amount),
        paymentMethod: topup.payment_method,
        transactionReference: topup.transaction_reference,
        platformWalletId: topup.platform_wallet_id,
        status: topup.status,
        createdAt: topup.created_at,
        updatedAt: topup.updated_at
      })),
      total: result.total,
      pendingCount: result.pendingCount,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Error getting pending topups', {
      error: error.message,
      adminId: req.admin?.id,
      query: req.query,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   POST /api/admin/topups/:id/verify
 * @desc    Verify a pending top-up request
 * @access  Admin only
 * Requirements: 4.3
 */
router.post('/:id/verify', verifyAdmin, async (req, res, next) => {
  try {
    const topupId = parseInt(req.params.id);
    const adminId = req.admin.id;

    if (isNaN(topupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid top-up ID'
      });
    }

    // Set notification service if available
    const notificationService = safeGetNotificationService();
    if (notificationService) {
      topupService.setNotificationService(notificationService);
    }

    const result = await topupService.verifyTopup(topupId, adminId, req.ip);

    logger.info('Admin verified topup', {
      topupId,
      adminId,
      userId: result.topup.user_id,
      amount: result.topup.amount,
      newBalance: result.newBalance,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Top-up verified successfully',
      topup: {
        id: result.topup.id,
        userId: result.topup.user_id,
        amount: parseFloat(result.topup.amount),
        paymentMethod: result.topup.payment_method,
        transactionReference: result.topup.transaction_reference,
        status: result.topup.status,
        verifiedBy: result.topup.verified_by,
        verifiedAt: result.topup.verified_at,
        createdAt: result.topup.created_at,
        updatedAt: result.topup.updated_at
      },
      newBalance: result.newBalance
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'Top-up not found') {
      return res.status(404).json({
        success: false,
        error: 'Top-up not found'
      });
    }

    if (error.message.startsWith('Top-up is already')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    logger.error('Error verifying topup', {
      error: error.message,
      topupId: req.params.id,
      adminId: req.admin?.id,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   POST /api/admin/topups/:id/reject
 * @desc    Reject a pending top-up request
 * @access  Admin only
 * Requirements: 4.4
 */
router.post('/:id/reject', verifyAdmin, validateBody(rejectTopupSchema), async (req, res, next) => {
  try {
    const topupId = parseInt(req.params.id);
    const adminId = req.admin.id;
    const { reason } = req.body;

    if (isNaN(topupId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid top-up ID'
      });
    }

    // Set notification service if available
    const notificationService = safeGetNotificationService();
    if (notificationService) {
      topupService.setNotificationService(notificationService);
    }

    const topup = await topupService.rejectTopup(topupId, adminId, reason, req.ip);

    logger.info('Admin rejected topup', {
      topupId,
      adminId,
      userId: topup.user_id,
      amount: topup.amount,
      reason,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Top-up rejected',
      topup: {
        id: topup.id,
        userId: topup.user_id,
        amount: parseFloat(topup.amount),
        paymentMethod: topup.payment_method,
        transactionReference: topup.transaction_reference,
        status: topup.status,
        rejectionReason: topup.rejection_reason,
        verifiedBy: topup.verified_by,
        verifiedAt: topup.verified_at,
        createdAt: topup.created_at,
        updatedAt: topup.updated_at
      }
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'Top-up not found') {
      return res.status(404).json({
        success: false,
        error: 'Top-up not found'
      });
    }

    if (error.message.startsWith('Top-up is already')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    if (error.message === 'Rejection reason is required') {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }

    logger.error('Error rejecting topup', {
      error: error.message,
      topupId: req.params.id,
      adminId: req.admin?.id,
      reason: req.body.reason,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   GET /api/admin/platform-wallets
 * @desc    Get all platform wallets (including inactive)
 * @access  Admin only
 * Requirements: 5.7
 */
router.get('/platform-wallets', verifyAdmin, async (req, res, next) => {
  try {
    const wallets = await platformWalletService.getAllWallets();

    logger.info('Admin fetched platform wallets', {
      adminId: req.admin.id,
      walletCount: wallets.length,
      ip: req.ip
    });

    res.json({
      success: true,
      wallets: wallets.map(wallet => ({
        id: wallet.id,
        paymentMethod: wallet.payment_method,
        phoneNumber: wallet.phone_number,
        instapayAlias: wallet.instapay_alias,
        holderName: wallet.holder_name,
        isActive: wallet.is_active,
        dailyLimit: parseFloat(wallet.daily_limit),
        monthlyLimit: parseFloat(wallet.monthly_limit),
        dailyUsed: parseFloat(wallet.daily_used),
        monthlyUsed: parseFloat(wallet.monthly_used),
        lastResetDaily: wallet.last_reset_daily,
        lastResetMonthly: wallet.last_reset_monthly,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }))
    });
  } catch (error) {
    logger.error('Error getting platform wallets', {
      error: error.message,
      adminId: req.admin?.id,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   POST /api/admin/platform-wallets
 * @desc    Create a new platform wallet
 * @access  Admin only
 * Requirements: 5.7
 */
router.post('/platform-wallets', verifyAdmin, validateBody(createWalletSchema), async (req, res, next) => {
  try {
    const { paymentMethod, phoneNumber, instapayAlias, holderName, dailyLimit, monthlyLimit } = req.body;

    const wallet = await platformWalletService.createWallet({
      paymentMethod,
      phoneNumber,
      instapayAlias,
      holderName,
      dailyLimit,
      monthlyLimit
    });

    logger.info('Admin created platform wallet', {
      adminId: req.admin.id,
      walletId: wallet.id,
      paymentMethod,
      holderName,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Platform wallet created successfully',
      wallet: {
        id: wallet.id,
        paymentMethod: wallet.payment_method,
        phoneNumber: wallet.phone_number,
        instapayAlias: wallet.instapay_alias,
        holderName: wallet.holder_name,
        isActive: wallet.is_active,
        dailyLimit: parseFloat(wallet.daily_limit),
        monthlyLimit: parseFloat(wallet.monthly_limit),
        dailyUsed: parseFloat(wallet.daily_used),
        monthlyUsed: parseFloat(wallet.monthly_used),
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    logger.error('Error creating platform wallet', {
      error: error.message,
      adminId: req.admin?.id,
      body: req.body,
      ip: req.ip
    });

    next(error);
  }
});

/**
 * @route   PUT /api/admin/platform-wallets/:id
 * @desc    Update a platform wallet
 * @access  Admin only
 * Requirements: 5.7
 */
router.put('/platform-wallets/:id', verifyAdmin, validateBody(updateWalletSchema), async (req, res, next) => {
  try {
    const walletId = parseInt(req.params.id);

    if (isNaN(walletId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet ID'
      });
    }

    const { phoneNumber, instapayAlias, holderName, dailyLimit, monthlyLimit, isActive } = req.body;

    const wallet = await platformWalletService.updateWallet(walletId, {
      phoneNumber,
      instapayAlias,
      holderName,
      dailyLimit,
      monthlyLimit,
      isActive
    });

    logger.info('Admin updated platform wallet', {
      adminId: req.admin.id,
      walletId,
      updates: Object.keys(req.body),
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Platform wallet updated successfully',
      wallet: {
        id: wallet.id,
        paymentMethod: wallet.payment_method,
        phoneNumber: wallet.phone_number,
        instapayAlias: wallet.instapay_alias,
        holderName: wallet.holder_name,
        isActive: wallet.is_active,
        dailyLimit: parseFloat(wallet.daily_limit),
        monthlyLimit: parseFloat(wallet.monthly_limit),
        dailyUsed: parseFloat(wallet.daily_used),
        monthlyUsed: parseFloat(wallet.monthly_used),
        lastResetDaily: wallet.last_reset_daily,
        lastResetMonthly: wallet.last_reset_monthly,
        createdAt: wallet.created_at,
        updatedAt: wallet.updated_at
      }
    });
  } catch (error) {
    // Handle specific errors
    if (error.message === 'Wallet not found') {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    if (error.message === 'No update fields provided') {
      return res.status(400).json({
        success: false,
        error: 'No update fields provided'
      });
    }

    logger.error('Error updating platform wallet', {
      error: error.message,
      walletId: req.params.id,
      adminId: req.admin?.id,
      body: req.body,
      ip: req.ip
    });

    next(error);
  }
});

module.exports = router;
