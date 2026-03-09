const { db } = require('../config/db');
const logger = require('../config/logger');

/**
 * Vendor Payout Service
 * Handles all vendor payout operations for marketplace orders
 */
class VendorPayoutService {
  /**
   * Create a payout for a completed order
   * @param {number} orderId - Order ID
   * @param {Object} orderData - Order data with vendor and amount info
   * @returns {Promise<Object>} Created payout
   */
  async createPayout(orderId, orderData) {
    try {
      const payoutNumber = await this.generatePayoutNumber();

      // Calculate payout amounts
      const commissionAmount = orderData.commission_amount || (orderData.total_amount * 0.10); // Default 10% commission
      const payoutAmount = orderData.total_amount - commissionAmount;

      const payoutData = {
        payout_number: payoutNumber,
        vendor_id: orderData.vendor_id,
        order_id: orderId,
        order_total: orderData.total_amount,
        commission_amount: commissionAmount,
        payout_amount: payoutAmount,
        currency: orderData.currency || 'EGP',
        payout_method: 'pending', // Will be set by vendor/admin
        status: 'pending'
      };

      const result = await db.query(`
        INSERT INTO vendor_payouts (
          payout_number, vendor_id, order_id, order_total,
          commission_amount, payout_amount, currency, payout_method, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        payoutData.payout_number,
        payoutData.vendor_id,
        payoutData.order_id,
        payoutData.order_total,
        payoutData.commission_amount,
        payoutData.payout_amount,
        payoutData.currency,
        payoutData.payout_method,
        payoutData.status
      ]);

      logger.info(`Vendor payout created: ${payoutNumber}`, {
        payoutId: result.rows[0].id,
        orderId,
        vendorId: orderData.vendor_id,
        payoutAmount,
        category: 'vendor_payout'
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating vendor payout:', error);
      throw error;
    }
  }

  /**
   * Process a payout (mark as processing)
   * @param {number} payoutId - Payout ID
   * @param {number} processedBy - User ID processing the payout
   * @returns {Promise<Object>} Updated payout
   */
  async processPayout(payoutId, processedBy) {
    try {
      const result = await db.query(`
        UPDATE vendor_payouts
        SET status = 'processing',
            processed_by = $2,
            processed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'pending'
        RETURNING *
      `, [payoutId, processedBy]);

      if (result.rows.length === 0) {
        throw new Error('Payout not found or not in pending status');
      }

      logger.info(`Payout processing started: ${result.rows[0].payout_number}`, {
        payoutId,
        processedBy,
        category: 'vendor_payout'
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error processing payout:', error);
      throw error;
    }
  }

  /**
   * Complete a payout
   * @param {number} payoutId - Payout ID
   * @param {string} referenceNumber - External payment reference
   * @param {Object} payoutDetails - Payment method details
   * @returns {Promise<Object>} Updated payout
   */
  async completePayout(payoutId, referenceNumber = null, payoutDetails = {}) {
    try {
      const result = await db.query(`
        UPDATE vendor_payouts
        SET status = 'completed',
            reference_number = $2,
            payout_details = $3,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'processing'
        RETURNING *
      `, [payoutId, referenceNumber, JSON.stringify(payoutDetails)]);

      if (result.rows.length === 0) {
        throw new Error('Payout not found or not in processing status');
      }

      logger.info(`Payout completed: ${result.rows[0].payout_number}`, {
        payoutId,
        referenceNumber,
        payoutAmount: result.rows[0].payout_amount,
        category: 'vendor_payout'
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error completing payout:', error);
      throw error;
    }
  }

  /**
   * Fail a payout
   * @param {number} payoutId - Payout ID
   * @param {string} failureReason - Reason for failure
   * @returns {Promise<Object>} Updated payout
   */
  async failPayout(payoutId, failureReason) {
    try {
      const result = await db.query(`
        UPDATE vendor_payouts
        SET status = 'failed',
            failure_reason = $2,
            failed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'processing'
        RETURNING *
      `, [payoutId, failureReason]);

      if (result.rows.length === 0) {
        throw new Error('Payout not found or not in processing status');
      }

      logger.warn(`Payout failed: ${result.rows[0].payout_number}`, {
        payoutId,
        failureReason,
        category: 'vendor_payout'
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error failing payout:', error);
      throw error;
    }
  }

  /**
   * Get payout by ID
   * @param {number} payoutId - Payout ID
   * @returns {Promise<Object>} Payout data
   */
  async getPayoutById(payoutId) {
    try {
      const result = await db.query(`
        SELECT
          vp.*,
          v.name as vendor_name,
          v.email as vendor_email,
          mo.order_number,
          mo.status as order_status
        FROM vendor_payouts vp
        JOIN vendors v ON vp.vendor_id = v.id
        JOIN marketplace_orders mo ON vp.order_id = mo.id
        WHERE vp.id = $1
      `, [payoutId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting payout by ID:', error);
      throw error;
    }
  }

  /**
   * Get payouts for a vendor
   * @param {number} vendorId - Vendor ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of payouts
   */
  async getPayoutsByVendor(vendorId, filters = {}) {
    try {
      const { status, limit = 50, offset = 0 } = filters;

      let whereClause = 'WHERE vp.vendor_id = $1';
      let params = [vendorId];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND vp.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const result = await db.query(`
        SELECT
          vp.*,
          mo.order_number,
          mo.status as order_status,
          mo.total_amount as order_total
        FROM vendor_payouts vp
        JOIN marketplace_orders mo ON vp.order_id = mo.id
        ${whereClause}
        ORDER BY vp.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting payouts by vendor:', error);
      throw error;
    }
  }

  /**
   * Get all payouts with optional filters (admin function)
   * @param {Object} filters - Filters
   * @returns {Promise<Array>} Array of payouts
   */
  async getAllPayouts(filters = {}) {
    try {
      const { status, vendorId, limit = 50, offset = 0 } = filters;

      let whereClause = '';
      let params = [];
      let paramIndex = 1;

      if (status) {
        whereClause += `WHERE vp.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (vendorId) {
        whereClause += whereClause ? ` AND vp.vendor_id = $${paramIndex}` : `WHERE vp.vendor_id = $${paramIndex}`;
        params.push(vendorId);
        paramIndex++;
      }

      const result = await db.query(`
        SELECT
          vp.*,
          v.name as vendor_name,
          v.email as vendor_email,
          mo.order_number,
          mo.status as order_status
        FROM vendor_payouts vp
        JOIN vendors v ON vp.vendor_id = v.id
        JOIN marketplace_orders mo ON vp.order_id = mo.id
        ${whereClause}
        ORDER BY vp.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, limit, offset]);

      return result.rows;
    } catch (error) {
      logger.error('Error getting all payouts:', error);
      throw error;
    }
  }

  /**
   * Update payout method for a vendor
   * @param {number} payoutId - Payout ID
   * @param {string} payoutMethod - Payment method
   * @param {Object} payoutDetails - Method-specific details
   * @returns {Promise<Object>} Updated payout
   */
  async updatePayoutMethod(payoutId, payoutMethod, payoutDetails = {}) {
    try {
      const result = await db.query(`
        UPDATE vendor_payouts
        SET payout_method = $2,
            payout_details = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'pending'
        RETURNING *
      `, [payoutId, payoutMethod, JSON.stringify(payoutDetails)]);

      if (result.rows.length === 0) {
        throw new Error('Payout not found or not in pending status');
      }

      logger.info(`Payout method updated: ${result.rows[0].payout_number}`, {
        payoutId,
        payoutMethod,
        category: 'vendor_payout'
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating payout method:', error);
      throw error;
    }
  }

  /**
   * Get payout statistics for a vendor
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Object>} Payout statistics
   */
  async getPayoutStats(vendorId) {
    try {
      const result = await db.query(`
        SELECT
          COUNT(*) as total_payouts,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payouts,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payouts,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_payouts,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payouts,
          COALESCE(SUM(CASE WHEN status = 'completed' THEN payout_amount END), 0) as total_paid,
          COALESCE(AVG(CASE WHEN status = 'completed' THEN payout_amount END), 0) as avg_payout_amount,
          COALESCE(SUM(commission_amount), 0) as total_commissions
        FROM vendor_payouts
        WHERE vendor_id = $1
      `, [vendorId]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting payout stats:', error);
      throw error;
    }
  }

  /**
   * Generate a unique payout number
   * @returns {Promise<string>} Payout number
   */
  async generatePayoutNumber() {
    try {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      let counter = 0;
      let payoutNumber;

      do {
        payoutNumber = `PAYOUT-${dateStr}-${counter.toString().padStart(4, '0')}`;
        counter++;
      } while (await this.payoutNumberExists(payoutNumber));

      return payoutNumber;
    } catch (error) {
      logger.error('Error generating payout number:', error);
      throw error;
    }
  }

  /**
   * Check if a payout number already exists
   * @param {string} payoutNumber - Payout number to check
   * @returns {Promise<boolean>} Whether the number exists
   */
  async payoutNumberExists(payoutNumber) {
    try {
      const result = await db.query(
        'SELECT 1 FROM vendor_payouts WHERE payout_number = $1',
        [payoutNumber]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error checking payout number existence:', error);
      return false;
    }
  }

  /**
   * Process pending payouts (batch processing)
   * @param {number} limit - Maximum number of payouts to process
   * @returns {Promise<Array>} Array of processed payouts
   */
  async processPendingPayouts(limit = 10) {
    try {
      // Get pending payouts that are ready for processing
      const pendingPayouts = await db.query(`
        SELECT * FROM vendor_payouts
        WHERE status = 'pending'
        AND payout_method != 'pending'
        ORDER BY created_at ASC
        LIMIT $1
      `, [limit]);

      const processedPayouts = [];

      for (const payout of pendingPayouts.rows) {
        try {
          // Mark as processing
          await this.processPayout(payout.id, null); // System processed

          // In a real implementation, this would integrate with payment gateways
          // For now, we'll simulate successful processing
          await this.completePayout(payout.id, `AUTO-${Date.now()}`, {
            processedBy: 'system',
            method: payout.payout_method
          });

          processedPayouts.push(payout);
        } catch (error) {
          logger.error(`Failed to process payout ${payout.id}:`, error);
          await this.failPayout(payout.id, error.message);
        }
      }

      logger.info(`Processed ${processedPayouts.length} pending payouts`, {
        category: 'vendor_payout'
      });

      return processedPayouts;
    } catch (error) {
      logger.error('Error processing pending payouts:', error);
      throw error;
    }
  }
}

module.exports = VendorPayoutService;
