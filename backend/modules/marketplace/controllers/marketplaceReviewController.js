/**
 * Marketplace Review Controller
 *
 * Thin HTTP handlers for marketplace review endpoints.
 * Delegates all business logic to marketplaceReviewService.
 *
 * @module modules/marketplace/controllers/marketplaceReviewController
 */

const reviewService = require('../services/marketplaceReviewService');

const handleControllerError = (error, res, next) => {
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
};

/**
 * POST /api/marketplace/reviews
 * Create a review for a completed order
 */
exports.createReview = async (req, res, next) => {
  try {
    const review = await reviewService.createReview(req.user.userId, req.body);
    res.status(201).json(review);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

/**
 * GET /api/marketplace/reviews/vendor/:vendorId
 * List reviews for a vendor (public)
 */
exports.getVendorReviews = async (req, res, next) => {
  try {
    const result = await reviewService.getVendorReviews(
      req.params.vendorId,
      req.query,
    );
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

/**
 * GET /api/marketplace/reviews/user/:userId
 * List reviews written by a user (authenticated, can only view own)
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    if (req.params.userId !== req.user.userId && req.user.role !== 'admin') {
      const error = new Error('Unauthorized');
      error.statusCode = 403;
      throw error;
    }
    const result = await reviewService.getUserReviews(
      req.params.userId,
      req.query,
    );
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

/**
 * GET /api/marketplace/reviews/:id
 * Get a single review by ID
 */
exports.getReviewById = async (req, res, next) => {
  try {
    const review = await reviewService.getReviewById(
      parseInt(req.params.id, 10),
    );
    res.json(review);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

/**
 * PUT /api/marketplace/reviews/:id
 * Update a review (only by original reviewer)
 */
exports.updateReview = async (req, res, next) => {
  try {
    const review = await reviewService.updateReview(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.body,
    );
    res.json(review);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

/**
 * DELETE /api/marketplace/reviews/:id
 * Delete a review (only by original reviewer, within 7-day window)
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const result = await reviewService.deleteReview(
      parseInt(req.params.id, 10),
      req.user.userId,
    );
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

/**
 * POST /api/marketplace/reviews/:id/flag
 * Flag a review for moderation
 */
exports.flagReview = async (req, res, next) => {
  try {
    const result = await reviewService.flagReview(
      parseInt(req.params.id, 10),
      req.user.userId,
      req.body.reason,
    );
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};
