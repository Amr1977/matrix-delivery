/**
 * Balance Routes v1 (JS Version)
 */

const express = require('express');
const { BalanceController } = require('../../controllers/v1/balanceController');

// Mock middlewares since we don't have JS versions of all validators yet
// We will use basic auth middleware which is usually JS
const { verifyToken, requireAdmin } = require('../../middleware/auth');

const router = express.Router();
const controller = new BalanceController();

// Placeholder validators
const validateUserId = (req, res, next) => next();
const validateDeposit = (req, res, next) => next();
const validateWithdrawal = (req, res, next) => next();
// Verify ownership (simplified)
const verifyBalanceOwnership = (req, res, next) => {
    // If admin, pass
    // if (req.user.primary_role === 'admin') return next();
    // Check param vs user
    const userId = req.params.userId || req.body.userId;
    if (userId && userId !== req.user.userId && req.user.primary_role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized access to balance' });
    }
    next();
};

// Apply auth
router.use(verifyToken);

router.get('/:userId', validateUserId, verifyBalanceOwnership, controller.getBalance);
router.get('/:userId/transactions', validateUserId, verifyBalanceOwnership, controller.getTransactionHistory);
router.post('/deposit', validateDeposit, verifyBalanceOwnership, controller.deposit);
router.post('/withdraw', validateWithdrawal, verifyBalanceOwnership, controller.withdraw);

module.exports = router;
