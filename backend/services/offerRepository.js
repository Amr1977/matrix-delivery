const pool = require('../config/db');
const logger = require('../config/logger');

class OfferRepository {
  /**
   * Create a new offer
   */
  async createOffer(offerData) {
    try {
      const {
        item_id,
        title,
        description,
        discount_type,
        discount_value,
        start_date,
        end_date,
        status = true
      } = offerData;

      const query = `
        INSERT INTO offers (item_id, title, description, discount_type, discount_value, start_date, end_date, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [item_id, title, description, discount_type, discount_value, start_date, end_date, status];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Get offer by ID
   */
  async getOfferById(id) {
    try {
      const query = `
        SELECT o.*, i.name as item_name, i.price as original_price, s.name as store_name
        FROM offers o
        JOIN items i ON o.item_id = i.id
        JOIN stores s ON i.store_id = s.id
        WHERE o.id = $1
      `;

      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting offer by ID:', error);
      throw error;
    }
  }

  /**
   * Update offer
   */
  async updateOffer(id, updateData) {
    try {
      const allowedFields = ['title', 'description', 'discount_type', 'discount_value', 'start_date', 'end_date', 'status'];
      const updates = [];
      const values = [];
      let paramCount = 1;

      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = $${paramCount}`);
          values.push(updateData[key]);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        throw new Error('No valid fields to update');
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      const query = `
        UPDATE offers
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;

      values.push(id);

      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating offer:', error);
      throw error;
    }
  }

  /**
   * Delete offer
   */
  async deleteOffer(id) {
    try {
      const query = 'DELETE FROM offers WHERE id = $1 RETURNING *';
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error deleting offer:', error);
      throw error;
    }
  }

  /**
   * Get active offers for a specific item
   */
  async getActiveOffersByItem(itemId) {
    try {
      const now = new Date();
      const query = `
        SELECT o.*, i.name as item_name, i.price as original_price, s.name as store_name
        FROM offers o
        JOIN items i ON o.item_id = i.id
        JOIN stores s ON i.store_id = s.id
        WHERE o.item_id = $1
        AND o.status = true
        AND o.start_date <= $2
        AND o.end_date > $2
        ORDER BY o.created_at DESC
      `;

      const result = await pool.query(query, [itemId, now]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active offers by item:', error);
      throw error;
    }
  }

  /**
   * Get all offers for a specific item (including inactive)
   */
  async getOffersByItem(itemId, limit = 50, offset = 0) {
    try {
      const query = `
        SELECT o.*, i.name as item_name, i.price as original_price, s.name as store_name
        FROM offers o
        JOIN items i ON o.item_id = i.id
        JOIN stores s ON i.store_id = s.id
        WHERE o.item_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [itemId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting offers by item:', error);
      throw error;
    }
  }

  /**
   * Get all offers with pagination
   */
  async getAllOffers(limit = 50, offset = 0, filters = {}) {
    try {
      let whereConditions = [];
      let values = [];
      let paramCount = 1;

      // Build where conditions based on filters
      if (filters.status !== undefined) {
        whereConditions.push(`o.status = $${paramCount}`);
        values.push(filters.status);
        paramCount++;
      }

      if (filters.item_id) {
        whereConditions.push(`o.item_id = $${paramCount}`);
        values.push(filters.item_id);
        paramCount++;
      }

      if (filters.discount_type) {
        whereConditions.push(`o.discount_type = $${paramCount}`);
        values.push(filters.discount_type);
        paramCount++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT o.*, i.name as item_name, i.price as original_price, s.name as store_name
        FROM offers o
        JOIN items i ON o.item_id = i.id
        JOIN stores s ON i.store_id = s.id
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      values.push(limit, offset);

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error getting all offers:', error);
      throw error;
    }
  }

  /**
   * Expire offers that have passed their end date
   */
  async expireOffers() {
    try {
      const now = new Date();
      const query = `
        UPDATE offers
        SET status = false, updated_at = CURRENT_TIMESTAMP
        WHERE status = true AND end_date <= $1
        RETURNING *
      `;

      const result = await pool.query(query, [now]);
      return result.rows;
    } catch (error) {
      logger.error('Error expiring offers:', error);
      throw error;
    }
  }

  /**
   * Get offers expiring soon (within specified hours)
   */
  async getExpiringOffers(hoursAhead = 24) {
    try {
      const now = new Date();
      const futureTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

      const query = `
        SELECT o.*, i.name as item_name, i.price as original_price, s.name as store_name
        FROM offers o
        JOIN items i ON o.item_id = i.id
        JOIN stores s ON i.store_id = s.id
        WHERE o.status = true
        AND o.end_date > $1
        AND o.end_date <= $2
        ORDER BY o.end_date ASC
      `;

      const result = await pool.query(query, [now, futureTime]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting expiring offers:', error);
      throw error;
    }
  }
}

module.exports = new OfferRepository();
