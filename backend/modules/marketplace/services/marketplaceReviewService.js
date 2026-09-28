/**
 * Marketplace Review Service
 *
 * Business logic for vendor/store reviews. Manages the full lifecycle:
 * creation (tied to completed orders), retrieval, updates, deletion,
 * and moderation (flagging/approval).
 *
 * @module modules/marketplace/services/marketplaceReviewService
 */

const reviewRepository = require('../repositories/marketplaceReviewRepository');
const logger = require('../../../config/logger');

class MarketplaceReviewService {
  /**
   * Validate that a user is the customer on a completed marketplace order
   * @param {number} orderId
   * @param {string} userId
   * @returns {Promise<{valid: boolean, order?: Object, vendorId?: string}>}
   */
  async validateOrderOwnership(orderId, userId) {
    const pool = require('../../../config/db');
    const result = await pool.query(
      `SELECT mo.*, mo.user_id
       FROM marketplace_orders mo
       WHERE mo.id = $1 AND mo.user_id = $2
         AND mo.status IN ('delivered', 'customer_delivered', 'completed', 'paid', 'confirmed')`,
      [orderId, userId],
    );

    if (result.rows.length === 0) {
      return { valid: false };
    }

    return {
      valid: true,
      order: result.rows[0],
      vendorId: result.rows[0].vendor_id,
    };
  }

  /**
   * Create a review for a completed marketplace order
   * @param {string} userId - Authenticated user ID
   * @param {Object} reviewData - Review input
   * @returns {Promise<Object>} Created review
   */
  async createReview(userId, reviewData) {
    const {
      orderId,
      rating,
      title,
      content,
      foodQuality,
      serviceRating,
      deliverySpeed,
      images,
    } = reviewData;

    if (!orderId || rating === undefined) {
      const error = new Error('Order ID and rating are required');
      error.statusCode = 400;
      throw error;
    }

    if (rating < 1 || rating > 5) {
      const error = new Error('Rating must be between 1 and 5');
      error.statusCode = 400;
      throw error;
    }

    const ownership = await this.validateOrderOwnership(orderId, userId);
    if (!ownership.valid) {
      const error = new Error('You can only review orders you have received');
      error.statusCode = 403;
      throw error;
    }

    const existingReview = await reviewRepository.findByOrderId(orderId);
    if (existingReview) {
      const error = new Error('You have already reviewed this order');
      error.statusCode = 409;
      throw error;
    }

    const review = await reviewRepository.createReview({
      orderId,
      vendorId: ownership.vendorId,
      reviewerUserId: userId,
      rating,
      title,
      content,
      foodQuality,
      serviceRating,
      deliverySpeed,
      images,
    });

    logger.info('Marketplace review created', {
      orderId,
      vendorId: ownership.vendorId,
      userId,
      rating,
      category: 'marketplace_review',
    });

    return review;
  }

  /**
   * Get reviews for a vendor
   * @param {string} vendorId
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Reviews and pagination
   */
  async getVendorReviews(vendorId, options) {
    return reviewRepository.findByVendor(vendorId, options);
  }

  /**
   * Get reviews written by a user
   * @param {string} userId
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} Reviews and pagination
   */
  async getUserReviews(userId, options) {
    return reviewRepository.findByReviewer(userId, options);
  }

  /**
   * Get a single review by ID
   * @param {number} reviewId
   * @returns {Promise<Object>}
   */
  async getReviewById(reviewId) {
    const review = await reviewRepository.findById(reviewId);
    if (!review) {
      const error = new Error('Review not found');
      error.statusCode = 404;
      throw error;
    }
    return review;
  }

  /**
   * Update a review (only by original reviewer)
   * @param {number} reviewId
   * @param {string} userId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateReview(reviewId, userId, updates) {
    const existing = await reviewRepository.findById(reviewId);
    if (!existing) {
      const error = new Error('Review not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.reviewer_user_id !== userId) {
      const error = new Error('You can only edit your own reviews');
      error.statusCode = 403;
      throw error;
    }

    const updated = await reviewRepository.updateReview(
      reviewId,
      userId,
      updates,
    );
    if (!updated) {
      const error = new Error(
        'Review could not be updated (may be outside edit window)',
      );
      error.statusCode = 409;
      throw error;
    }

    logger.info('Marketplace review updated', {
      reviewId,
      userId,
      category: 'marketplace_review',
    });

    return updated;
  }

  /**
   * Delete a review (only by original reviewer, within 7-day window)
   * @param {number} reviewId
   * @param {string} userId
   * @returns {Promise<{success: boolean}>}
   */
  async deleteReview(reviewId, userId) {
    const existing = await reviewRepository.findById(reviewId);
    if (!existing) {
      const error = new Error('Review not found');
      error.statusCode = 404;
      throw error;
    }

    if (existing.reviewer_user_id !== userId) {
      const error = new Error('You can only delete your own reviews');
      error.statusCode = 403;
      throw error;
    }

    const deleted = await reviewRepository.deleteReview(reviewId, userId);
    if (!deleted) {
      const error = new Error(
        'Review could not be deleted (must be within 7 days of creation)',
      );
      error.statusCode = 409;
      throw error;
    }

    logger.info('Marketplace review deleted', {
      reviewId,
      userId,
      category: 'marketplace_review',
    });

    return { success: true };
  }

  /**
   * Flag a review for moderation
   * @param {number} reviewId
   * @param {string} userId
   * @param {string} reason
   * @returns {Promise<{success: boolean}>}
   */
  async flagReview(reviewId, userId, reason) {
    if (!reason) {
      const error = new Error('Flag reason is required');
      error.statusCode = 400;
      throw error;
    }

    await reviewRepository.flagReview(reviewId, userId, reason);
    return { success: true };
  }
}

module.exports = new MarketplaceReviewService();
