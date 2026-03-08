const express = require('express');
const router = express.Router();
const offerController = require('../controllers/offerController');
const {
  verifyToken,
  requireRole
} = require('../middleware/auth');

// Middleware aliases
const isVendor = requireRole('vendor', 'admin');
const isAdmin = requireRole('admin');

/**
 * Routes for offer management
 * Base path: /api/offers
 */

// Public routes (customers can view active offers)
/**
 * GET /api/offers/calculate-price
 * Calculate discounted price for an item (public)
 */
router.get('/calculate-price', offerController.calculateDiscountedPrice);

/**
 * GET /api/items/:itemId/offers
 * Get active offers for a specific item (public)
 */
router.get('/items/:itemId/offers', offerController.getOffersByItem);

// Protected routes (require authentication)

/**
 * POST /api/offers
 * Create a new offer (vendor only)
 */
router.post('/', verifyToken, isVendor, offerController.createOffer);

/**
 * GET /api/offers
 * Get offers for current vendor or all offers (admin)
 */
router.get('/', verifyToken, isVendor, offerController.getVendorOffers);

/**
 * GET /api/offers/:id
 * Get offer by ID (vendor/admin only, can only see their own unless admin)
 */
router.get('/:id', verifyToken, isVendor, offerController.getOffer);

/**
 * PUT /api/offers/:id
 * Update offer (vendor only, can only update their own)
 */
router.put('/:id', verifyToken, isVendor, offerController.updateOffer);

/**
 * DELETE /api/offers/:id
 * Delete offer (vendor only, can only delete their own)
 */
router.delete('/:id', verifyToken, isVendor, offerController.deleteOffer);

/**
 * POST /api/offers/:id/deactivate
 * Deactivate offer (vendor only, can only deactivate their own)
 */
router.post('/:id/deactivate', verifyToken, isVendor, offerController.deactivateOffer);

module.exports = router;
