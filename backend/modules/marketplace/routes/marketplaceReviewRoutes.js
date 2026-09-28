/**
 * Marketplace Review Routes
 *
 * Base path (mounted in app.js):
 *   /api/marketplace/reviews
 *
 * Endpoints:
 *   POST   /                  - Create review (authenticated customer)
 *   GET    /:id               - Get review by ID (public)
 *   PUT    /:id               - Update review (owner only, 7-day window)
 *   DELETE /:id               - Delete review (owner only, 7-day window)
 *   POST   /:id/flag          - Flag review for moderation
 *   GET    /vendor/:vendorId  - List vendor reviews (public)
 *   GET    /user/:userId      - List user's reviews (owner/admin only)
 *
 * @module modules/marketplace/routes/marketplaceReviewRoutes
 */

const express = require('express');
const router = express.Router();

const { verifyToken } = require('../../../middleware/auth');
const reviewController = require('../controllers/marketplaceReviewController');

/**
 * POST /
 * Create a review for a completed order
 * Auth: customer who ordered
 */
router.post('/', verifyToken, reviewController.createReview);

/**
 * GET /vendor/:vendorId
 * List reviews for a vendor (public)
 */
router.get('/vendor/:vendorId', reviewController.getVendorReviews);

/**
 * GET /user/:userId
 * List reviews written by a user (owner or admin)
 */
router.get('/user/:userId', verifyToken, reviewController.getUserReviews);

/**
 * GET /:id
 * Get a single review by ID
 */
router.get('/:id', reviewController.getReviewById);

/**
 * PUT /:id
 * Update a review (owner only, 7-day window)
 */
router.put('/:id', verifyToken, reviewController.updateReview);

/**
 * DELETE /:id
 * Delete a review (owner only, 7-day window)
 */
router.delete('/:id', verifyToken, reviewController.deleteReview);

/**
 * POST /:id/flag
 * Flag a review for moderation
 */
router.post('/:id/flag', verifyToken, reviewController.flagReview);

module.exports = router;
