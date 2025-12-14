const express = require('express');
const router = express.Router();
const walletPaymentService = require('../services/walletPaymentService');
const { authenticate, authorize } = require('../middleware/auth');
const { uploadToCloudinary } = require('../middleware/upload');

/**
 * @route   POST /api/wallet-payments
 * @desc    Create a new wallet payment request
 * @access  Private (Customer)
 */
router.post('/', authenticate, uploadToCloudinary.single('screenshot'), async (req, res) => {
    try {
        const {
            orderId,
            walletType,
            amount,
            senderPhone,
            senderName,
            transactionReference,
            transferTimestamp,
            notes
        } = req.body;

        // Verify order belongs to customer
        const orderCheck = await req.pool.query(
            'SELECT id, customer_id, total_amount FROM orders WHERE id = $1',
            [orderId]
        );

        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (orderCheck.rows[0].customer_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized to pay for this order' });
        }

        // Get screenshot URL if uploaded
        const screenshotUrl = req.file ? req.file.path : null;

        const walletPayment = await walletPaymentService.createWalletPayment({
            orderId,
            walletType,
            amount: parseFloat(amount),
            senderPhone,
            senderName,
            transactionReference,
            transferTimestamp,
            screenshotUrl,
            notes
        });

        res.status(201).json({
            success: true,
            message: 'Wallet payment submitted for confirmation',
            walletPayment
        });
    } catch (error) {
        console.error('Error creating wallet payment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/wallet-payments/pending
 * @desc    Get all pending wallet payments for admin review
 * @access  Private (Admin)
 */
router.get('/pending', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const pendingPayments = await walletPaymentService.getPendingPayments(limit);

        res.json({
            success: true,
            count: pendingPayments.length,
            payments: pendingPayments
        });
    } catch (error) {
        console.error('Error getting pending payments:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/wallet-payments/:id
 * @desc    Get wallet payment by ID
 * @access  Private (Admin or payment owner)
 */
router.get('/:id', authenticate, async (req, res) => {
    try {
        const walletPayment = await walletPaymentService.getWalletPaymentById(req.params.id);

        if (!walletPayment) {
            return res.status(404).json({ error: 'Wallet payment not found' });
        }

        // Check authorization
        if (req.user.role !== 'admin' && walletPayment.customer_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        res.json({
            success: true,
            walletPayment
        });
    } catch (error) {
        console.error('Error getting wallet payment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/wallet-payments/:id/confirm
 * @desc    Confirm a wallet payment (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/confirm', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const { notes } = req.body;

        const result = await walletPaymentService.confirmWalletPayment(
            req.params.id,
            req.user.id,
            notes
        );

        res.json({
            success: true,
            message: 'Wallet payment confirmed successfully',
            ...result
        });
    } catch (error) {
        console.error('Error confirming wallet payment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/wallet-payments/:id/reject
 * @desc    Reject a wallet payment (admin only)
 * @access  Private (Admin)
 */
router.post('/:id/reject', authenticate, authorize(['admin']), async (req, res) => {
    try {
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const walletPayment = await walletPaymentService.rejectWalletPayment(
            req.params.id,
            req.user.id,
            reason
        );

        res.json({
            success: true,
            message: 'Wallet payment rejected',
            walletPayment
        });
    } catch (error) {
        console.error('Error rejecting wallet payment:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/wallet-payments/wallets/active
 * @desc    Get active platform wallets
 * @access  Private
 */
router.get('/wallets/active', authenticate, async (req, res) => {
    try {
        const wallets = await walletPaymentService.getActivePlatformWallets();

        res.json({
            success: true,
            wallets
        });
    } catch (error) {
        console.error('Error getting platform wallets:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/wallet-payments/sms/forward
 * @desc    Forward SMS for auto-verification (Future feature)
 * @access  Private (System/Webhook)
 */
router.post('/sms/forward', async (req, res) => {
    try {
        // TODO: Add webhook authentication
        const result = await walletPaymentService.processSMS(req.body);

        res.json(result);
    } catch (error) {
        console.error('Error processing SMS:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
