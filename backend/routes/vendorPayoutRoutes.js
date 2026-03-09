const express = require('express');
const router = express.Router();
const vendorPayoutController = require('../controllers/vendorPayoutController');
const {
  verifyToken,
  requireRole
} = require('../middleware/auth');

/**
 * Routes for vendor payouts
 * Base path: /api/payouts
 * All routes require authentication
 */

// Get specific payout
router.get('/:id', verifyToken, vendorPayoutController.getPayout);

// Update payout method (vendor/admin)
router.patch('/:id/method', verifyToken, vendorPayoutController.updatePayoutMethod);

// Process payout (admin only)
router.post('/:id/process', verifyToken, requireRole('admin'), vendorPayoutController.processPayout);

// Complete payout (admin only)
router.post('/:id/complete', verifyToken, requireRole('admin'), vendorPayoutController.completePayout);

// Fail payout (admin only)
router.post('/:id/fail', verifyToken, requireRole('admin'), vendorPayoutController.failPayout);

// Get vendor's payouts (vendor only)
router.get('/vendor/payouts', verifyToken, vendorPayoutController.getVendorPayouts);

// Get vendor payout statistics (vendor only)
router.get('/vendor/stats', verifyToken, vendorPayoutController.getVendorPayoutStats);

// Get all payouts (admin only)
router.get('/', verifyToken, requireRole('admin'), vendorPayoutController.getAllPayouts);

// Process pending payouts (admin only)
router.post('/process-pending', verifyToken, requireRole('admin'), vendorPayoutController.processPendingPayouts);

module.exports = router;
