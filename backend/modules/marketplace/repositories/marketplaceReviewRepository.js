/**
 * Marketplace Review Repository
 *
 * Handles database operations for marketplace vendor/store reviews.
 * Reviews are tied to completed orders to prevent fake reviews.
 *
 * @module modules/marketplace/repositories/marketplaceReviewRepository
 */

const pool = require('../../../config/db');
const logger = require('../../../config/logger');

class MarketplaceReviewRepository {
  /**
   * Create a new review for a marketplace order
   * @param {Object} reviewData - Review fields
   * @returns {Promise<Object>} Created review
   */
  async createReview(reviewData) {
    const {
      orderId,
      vendorId,
      reviewerUserId,
      rating,
      title,
      content,
      foodQuality,
      serviceRating,
      deliverySpeed,
      images,
    } = reviewData;

    const result = await pool.query(
      `INSERT INTO marketplace_reviews (
        order_id, vendor_id, reviewer_user_id,
        rating, title, content,
        food_quality, service_rating, delivery_speed,
        images
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        orderId,
        vendorId,
        reviewerUserId,
        rating,
        title || null,
        content || null,
        foodQuality || null,
        serviceRating || null,
        deliverySpeed || null,
        images ? JSON.stringify(images) : null,
      ],
    );

    return result.rows[0];
  }

  /**
   * Check if a review already exists for an order
   * @param {number} orderId
   * @returns {Promise<Object|null>}
   */
  async findByOrderId(orderId) {
    const result = await pool.query(
      'SELECT * FROM marketplace_reviews WHERE order_id = $1',
      [orderId],
    );
    return result.rows[0] || null;
  }

  /**
   * Get all reviews for a vendor with pagination
   * @param {string} vendorId
   * @param {Object} options - { page, limit, sortBy, filter }
   * @returns {Promise<{reviews: Array, pagination: Object}>}
   */
  async findByVendor(vendorId, options = {}) {
    const {
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = options;

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM marketplace_reviews WHERE vendor_id = $1 AND is_approved = true',
      [vendorId],
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT mr.*, u.name as reviewer_name
       FROM marketplace_reviews mr
       JOIN users u ON mr.reviewer_user_id = u.id
       WHERE mr.vendor_id = $1 AND mr.is_approved = true
       ORDER BY mr.${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $2 OFFSET $3`,
      [vendorId, limit, offset],
    );

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + result.rows.length < totalCount,
      },
    };
  }

  /**
   * Get reviews written by a specific user
   * @param {string} userId
   * @param {Object} options - { page, limit }
   * @returns {Promise<{reviews: Array, pagination: Object}>}
   */
  async findByReviewer(userId, options = {}) {
    const { page = 1, limit = 20 } = options;

    const countResult = await pool.query(
      'SELECT COUNT(*) as count FROM marketplace_reviews WHERE reviewer_user_id = $1',
      [userId],
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT mr.*, v.name as vendor_name, o.order_number
       FROM marketplace_reviews mr
       JOIN vendors v ON mr.vendor_id = v.id
       LEFT JOIN marketplace_orders o ON mr.order_id = o.id
       WHERE mr.reviewer_user_id = $1
       ORDER BY mr.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    return {
      reviews: result.rows,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + result.rows.length < totalCount,
      },
    };
  }

  /**
   * Get a single review by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const result = await pool.query(
      `SELECT mr.*, u.name as reviewer_name, v.name as vendor_name
       FROM marketplace_reviews mr
       JOIN users u ON mr.reviewer_user_id = u.id
       JOIN vendors v ON mr.vendor_id = v.id
       WHERE mr.id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  /**
   * Update review (only by original reviewer)
   * @param {number} reviewId
   * @param {string} reviewerUserId
   * @param {Object} updates - { title, content, rating, food_quality, service_rating, delivery_speed, images }
   * @returns {Promise<Object|null>}
   */
  async updateReview(reviewId, reviewerUserId, updates) {
    const {
      title,
      content,
      rating,
      foodQuality,
      serviceRating,
      deliverySpeed,
      images,
    } = updates;

    const values = [reviewId, reviewerUserId];
    const setClauses = [];
    let paramIndex = 3;

    if (title !== undefined) {
      setClauses.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      setClauses.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (rating !== undefined) {
      setClauses.push(`rating = $${paramIndex++}`);
      values.push(rating);
    }
    if (foodQuality !== undefined) {
      setClauses.push(`food_quality = $${paramIndex++}`);
      values.push(foodQuality);
    }
    if (serviceRating !== undefined) {
      setClauses.push(`service_rating = $${paramIndex++}`);
      values.push(serviceRating);
    }
    if (deliverySpeed !== undefined) {
      setClauses.push(`delivery_speed = $${paramIndex++}`);
      values.push(deliverySpeed);
    }
    if (images !== undefined) {
      setClauses.push(`images = $${paramIndex++}`);
      values.push(images ? JSON.stringify(images) : null);
    }

    if (setClauses.length === 0) {
      return this.findById(reviewId);
    }

    values.push(paramIndex);
    const result = await pool.query(
      `UPDATE marketplace_reviews
       SET ${setClauses.join(', ')}
       WHERE id = $1 AND reviewer_user_id = $2 AND updated_at < $${paramIndex}
       RETURNING *`,
      values,
    );
    return result.rows[0] || null;
  }

  /**
   * Delete a review (only by original reviewer, within 7-day window)
   * @param {number} reviewId
   * @param {string} reviewerUserId
   * @returns {Promise<boolean>}
   */
  async deleteReview(reviewId, reviewerUserId) {
    const result = await pool.query(
      `DELETE FROM marketplace_reviews
       WHERE id = $1 AND reviewer_user_id = $2
         AND created_at > NOW() - INTERVAL '7 days'
       RETURNING id`,
      [reviewId, reviewerUserId],
    );
    return result.rowCount > 0;
  }

  /**
   * Flag a review for moderation
   * @param {number} reviewId
   * @param {string} userId
   * @param {string} reason
   * @returns {Promise<boolean>}
   */
  async flagReview(reviewId, userId, reason) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO review_flags (review_id, user_id, reason)
         VALUES ((SELECT id FROM marketplace_reviews WHERE id = $1), $2, $3)
         ON CONFLICT (review_id, user_id) DO UPDATE SET reason = EXCLUDED.reason
         RETURNING *`,
        [reviewId, userId, reason],
      );

      await client.query(
        'UPDATE marketplace_reviews SET flag_count = flag_count + 1 WHERE id = $1',
        [reviewId],
      );

      const reviewResult = await client.query(
        'SELECT flag_count FROM marketplace_reviews WHERE id = $1',
        [reviewId],
      );

      if (reviewResult.rows[0] && reviewResult.rows[0].flag_count > 2) {
        await client.query(
          'UPDATE marketplace_reviews SET is_approved = false WHERE id = $1',
          [reviewId],
        );
      }

      await client.query('COMMIT');
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to flag review', {
        error: error.message,
        reviewId,
        userId,
        category: 'marketplace_reviews',
      });
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new MarketplaceReviewRepository();
