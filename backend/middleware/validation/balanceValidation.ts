/**
 * Validation Middleware for Balance API
 * 
 * Validates incoming requests using express-validator
 */

import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../utils/errors/ApiError';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(err => ({
            field: err.type === 'field' ? (err as any).path : 'unknown',
            message: err.msg,
            value: err.type === 'field' ? (err as any).value : undefined
        }));

        return res.status(422).json({
            success: false,
            error: 'Validation failed',
            errors: formattedErrors,
            timestamp: new Date().toISOString()
        });
    }

    next();
};

/**
 * Validate deposit request
 */
export const validateDeposit = [
    body('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('amount')
        .isFloat({ min: 1, max: 100000 })
        .withMessage('Amount must be between 1 and 100,000'),
    body('description')
        .isString()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Description must be between 3 and 200 characters'),
    body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
    handleValidationErrors
];

/**
 * Validate withdrawal request
 */
export const validateWithdrawal = [
    body('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('amount')
        .isFloat({ min: 10, max: 100000 })
        .withMessage('Amount must be between 10 and 100,000'),
    body('destination')
        .isString()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Destination must be between 3 and 100 characters'),
    body('description')
        .isString()
        .trim()
        .isLength({ min: 3, max: 200 })
        .withMessage('Description must be between 3 and 200 characters'),
    body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
    handleValidationErrors
];

/**
 * Validate create hold request
 */
export const validateCreateHold = [
    body('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('amount')
        .isFloat({ min: 1 })
        .withMessage('Amount must be at least 1'),
    body('reason')
        .isString()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Reason must be between 3 and 100 characters'),
    body('expiresInMinutes')
        .optional()
        .isInt({ min: 1, max: 10080 }) // Max 7 days
        .withMessage('Expiration must be between 1 and 10,080 minutes (7 days)'),
    body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
    handleValidationErrors
];

/**
 * Validate hold ID parameter
 */
export const validateHoldId = [
    param('holdId')
        .isString()
        .trim()
        .matches(/^HOLD-[a-f0-9-]+$/i)
        .withMessage('Invalid hold ID format'),
    handleValidationErrors
];

/**
 * Validate user ID parameter
 */
export const validateUserId = [
    param('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    handleValidationErrors
];

/**
 * Validate transaction history query
 */
export const validateTransactionHistory = [
    param('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    query('type')
        .optional()
        .custom((value) => {
            const validTypes = ['deposit', 'withdrawal', 'order_payment', 'order_refund',
                'earnings', 'commission_deduction', 'adjustment', 'hold', 'hold_release'];
            if (Array.isArray(value)) {
                return value.every(t => validTypes.includes(t));
            }
            return validTypes.includes(value);
        })
        .withMessage('Invalid transaction type'),
    query('status')
        .optional()
        .isIn(['pending', 'completed', 'failed', 'cancelled'])
        .withMessage('Invalid status'),
    query('startDate')
        .optional()
        .isISO8601()
        .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
        .optional()
        .isISO8601()
        .withMessage('End date must be a valid ISO 8601 date'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('offset')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Offset must be a non-negative integer'),
    handleValidationErrors
];

/**
 * Validate balance statement query
 */
export const validateBalanceStatement = [
    param('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    query('startDate')
        .isISO8601()
        .withMessage('Start date is required and must be a valid ISO 8601 date'),
    query('endDate')
        .isISO8601()
        .withMessage('End date is required and must be a valid ISO 8601 date'),
    handleValidationErrors
];

/**
 * Validate freeze balance request
 */
export const validateFreezeBalance = [
    body('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('reason')
        .isString()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Reason must be between 5 and 200 characters'),
    handleValidationErrors
];

/**
 * Validate unfreeze balance request
 */
export const validateUnfreezeBalance = [
    body('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    handleValidationErrors
];

/**
 * Validate adjust balance request
 */
export const validateAdjustBalance = [
    body('userId')
        .isInt({ min: 1 })
        .withMessage('User ID must be a positive integer'),
    body('amount')
        .isFloat({ min: -100000, max: 100000 })
        .custom((value) => value !== 0)
        .withMessage('Amount must be between -100,000 and 100,000 and cannot be zero'),
    body('reason')
        .isString()
        .trim()
        .isLength({ min: 5, max: 200 })
        .withMessage('Reason must be between 5 and 200 characters'),
    handleValidationErrors
];
