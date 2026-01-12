/**
 * TopUp Service
 * Handles top-up requests for Egypt payment methods with admin verification
 * 
 * Requirements: 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 4.3, 4.4, 4.5, 4.7, 6.4, 6.5
 */

const pool = require('../config/db');
const logger = require('../config/logger');

// Valid payment methods for Egypt Phase 1
const VALID_PAYMENT_METHODS = [
  'vodafone_cash',
  'orange_money',
  'etisalat_cash',
  'we_pay',
  'instapay'
];

// Amount limits (in EGP)
const MIN_TOPUP_AMOUNT = 10;
const MAX_TOPUP_AMOUNT = 10000;

class TopupService {
  /**
   * @param {Object} dbPool - Database pool instance
   * @param {Object} balanceService - Balance service instance for crediting balance
   * @param {Object} notificationService - Notification service for sending notifications
   */
  constructor(dbPool = pool, balanceService = null, notificationService = null) {
    this.pool = dbPool;
    this.balanceService = balanceService;
    this.notificationService = notificationService;
  }

  /**
   * Set the balance service (for dependency injection)
   * @param {Object} balanceService - Balance service instance
   */
  setBalanceService(balanceService) {
    this.balanceService = balanceService;
  }

  /**
   * Set the notification service (for dependency injection)
   * @param {Object} notificationService - Notification service instance
   */
  setNotificationService(notificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Validate top-up amount
   * Requirements: 1.6, 1.7, 2.5, 2.6
   * 
   * @param {number} amount - The amount to validate
   * @returns {{ valid: boolean, error?: string }}
   */
  validateAmount(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return { valid: false, error: 'Amount must be a valid number' };
    }

    if (amount < MIN_TOPUP_AMOUNT) {
      return { valid: false, error: `Minimum top-up amount is ${MIN_TOPUP_AMOUNT} EGP` };
    }

    if (amount > MAX_TOPUP_AMOUNT) {
      return { valid: false, error: `Maximum top-up amount is ${MAX_TOPUP_AMOUNT} EGP` };
    }

    return { valid: true };
  }

  /**
   * Check for duplicate transaction reference
   * Requirements: 3.1, 3.2, 3.3, 3.4
   * 
   * @param {string} reference - Transaction reference
   * @param {string} paymentMethod - Payment method
   * @returns {Promise<Object|null>} Existing topup if found, null otherwise
   */
  async checkDuplicate(reference, paymentMethod) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id,
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          updated_at
        FROM topups 
        WHERE transaction_reference = $1 AND payment_method = $2`,
        [reference, paymentMethod]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error checking duplicate reference', { 
        error: error.message, 
        reference, 
        paymentMethod 
      });
      throw error;
    }
  }

  /**
   * Create a new top-up request
   * Requirements: 1.4, 1.5, 1.6, 1.7, 2.3, 2.4, 2.5, 2.6
   * 
   * @param {Object} data - Top-up data
   * @param {string} data.userId - User ID
   * @param {number} data.amount - Amount in EGP
   * @param {string} data.paymentMethod - Payment method
   * @param {string} data.transactionReference - Transaction reference from payment provider
   * @param {number} data.platformWalletId - Platform wallet ID
   * @returns {Promise<Object>} Created topup record
   */
  async createTopup(data) {
    const { userId, amount, paymentMethod, transactionReference, platformWalletId } = data;

    // Validate required fields
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!transactionReference || transactionReference.trim() === '') {
      throw new Error('Transaction reference is required');
    }

    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

    // Validate amount
    const amountValidation = this.validateAmount(amount);
    if (!amountValidation.valid) {
      throw new Error(amountValidation.error);
    }

    // Check for duplicate reference
    const existingTopup = await this.checkDuplicate(transactionReference, paymentMethod);
    if (existingTopup) {
      const error = new Error('This transaction was already submitted');
      error.code = 'DUPLICATE_REFERENCE';
      error.existingTopup = existingTopup;
      throw error;
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO topups (
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
        RETURNING 
          id,
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          updated_at`,
        [userId, amount, paymentMethod, transactionReference.trim(), platformWalletId || null]
      );

      const topup = result.rows[0];

      logger.info('Top-up request created', {
        topupId: topup.id,
        userId,
        amount,
        paymentMethod,
        reference: transactionReference
      });

      // Trigger admin notification (non-blocking)
      this._notifyAdmins(topup).catch(err => {
        logger.error('Failed to notify admins of new topup', { error: err.message, topupId: topup.id });
      });

      return topup;
    } catch (error) {
      // Handle unique constraint violation (duplicate reference)
      if (error.code === '23505' && error.constraint === 'topups_unique_reference_per_method') {
        const duplicateError = new Error('This transaction was already submitted');
        duplicateError.code = 'DUPLICATE_REFERENCE';
        throw duplicateError;
      }

      logger.error('Error creating topup', { error: error.message, data });
      throw error;
    }
  }


  /**
   * Verify a pending top-up (admin action)
   * Requirements: 4.3, 4.5, 4.7
   * 
   * @param {number} topupId - Top-up ID
   * @param {string} adminId - Admin user ID
   * @param {string} [ipAddress] - Admin's IP address for audit
   * @returns {Promise<Object>} Updated topup and new balance
   */
  async verifyTopup(topupId, adminId, ipAddress = null) {
    if (!topupId) {
      throw new Error('Top-up ID is required');
    }

    if (!adminId) {
      throw new Error('Admin ID is required');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the topup with lock
      const topupResult = await client.query(
        `SELECT * FROM topups WHERE id = $1 FOR UPDATE`,
        [topupId]
      );

      if (topupResult.rows.length === 0) {
        throw new Error('Top-up not found');
      }

      const topup = topupResult.rows[0];

      if (topup.status !== 'pending') {
        throw new Error(`Top-up is already ${topup.status}`);
      }

      // Update topup status
      const updateResult = await client.query(
        `UPDATE topups 
        SET status = 'verified', 
            verified_by = $1, 
            verified_at = NOW(),
            updated_at = NOW()
        WHERE id = $2
        RETURNING 
          id,
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          updated_at`,
        [adminId, topupId]
      );

      const updatedTopup = updateResult.rows[0];

      // Create audit log
      await this._createAuditLog(client, {
        topupId,
        adminId,
        action: 'verify',
        details: { amount: topup.amount, paymentMethod: topup.payment_method },
        ipAddress
      });

      // Credit user balance using balance service
      let newBalance = null;
      if (this.balanceService) {
        const balanceResult = await this.balanceService.deposit({
          userId: topup.user_id,
          amount: parseFloat(topup.amount),
          description: `Top-up via ${topup.payment_method} (Ref: ${topup.transaction_reference})`
        });
        newBalance = balanceResult.availableBalance;
      }

      await client.query('COMMIT');

      logger.info('Top-up verified', {
        topupId,
        adminId,
        userId: topup.user_id,
        amount: topup.amount,
        newBalance
      });

      // Notify user (non-blocking)
      this._notifyUser(topup.user_id, 'verified', updatedTopup, newBalance).catch(err => {
        logger.error('Failed to notify user of verification', { error: err.message, topupId });
      });

      return { topup: updatedTopup, newBalance };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error verifying topup', { error: error.message, topupId, adminId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reject a pending top-up (admin action)
   * Requirements: 4.4, 4.5, 4.7
   * 
   * @param {number} topupId - Top-up ID
   * @param {string} adminId - Admin user ID
   * @param {string} reason - Rejection reason (required)
   * @param {string} [ipAddress] - Admin's IP address for audit
   * @returns {Promise<Object>} Updated topup
   */
  async rejectTopup(topupId, adminId, reason, ipAddress = null) {
    if (!topupId) {
      throw new Error('Top-up ID is required');
    }

    if (!adminId) {
      throw new Error('Admin ID is required');
    }

    if (!reason || reason.trim() === '') {
      throw new Error('Rejection reason is required');
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get the topup with lock
      const topupResult = await client.query(
        `SELECT * FROM topups WHERE id = $1 FOR UPDATE`,
        [topupId]
      );

      if (topupResult.rows.length === 0) {
        throw new Error('Top-up not found');
      }

      const topup = topupResult.rows[0];

      if (topup.status !== 'pending') {
        throw new Error(`Top-up is already ${topup.status}`);
      }

      // Update topup status
      const updateResult = await client.query(
        `UPDATE topups 
        SET status = 'rejected', 
            rejection_reason = $1,
            verified_by = $2, 
            verified_at = NOW(),
            updated_at = NOW()
        WHERE id = $3
        RETURNING 
          id,
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          updated_at`,
        [reason.trim(), adminId, topupId]
      );

      const updatedTopup = updateResult.rows[0];

      // Create audit log
      await this._createAuditLog(client, {
        topupId,
        adminId,
        action: 'reject',
        details: { 
          amount: topup.amount, 
          paymentMethod: topup.payment_method,
          reason: reason.trim()
        },
        ipAddress
      });

      await client.query('COMMIT');

      logger.info('Top-up rejected', {
        topupId,
        adminId,
        userId: topup.user_id,
        reason: reason.trim()
      });

      // Notify user (non-blocking)
      this._notifyUser(topup.user_id, 'rejected', updatedTopup).catch(err => {
        logger.error('Failed to notify user of rejection', { error: err.message, topupId });
      });

      return updatedTopup;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error rejecting topup', { error: error.message, topupId, adminId });
      throw error;
    } finally {
      client.release();
    }
  }


  /**
   * Get user's top-up history with pagination
   * Requirements: 6.4, 6.5
   * 
   * @param {string} userId - User ID
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.status] - Filter by status
   * @param {Date} [filters.startDate] - Filter by start date
   * @param {Date} [filters.endDate] - Filter by end date
   * @param {number} [filters.limit=20] - Number of records per page
   * @param {number} [filters.offset=0] - Offset for pagination
   * @returns {Promise<Object>} Topup history with pagination info
   */
  async getTopupHistory(userId, filters = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const {
      status,
      startDate,
      endDate,
      limit = 20,
      offset = 0
    } = filters;

    try {
      // Build WHERE clause
      const conditions = ['user_id = $1'];
      const params = [userId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM topups WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get topups
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
      const sanitizedOffset = Math.max(parseInt(offset) || 0, 0);

      params.push(sanitizedLimit, sanitizedOffset);

      const result = await this.pool.query(
        `SELECT 
          id,
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          updated_at
        FROM topups 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      );

      return {
        topups: result.rows,
        pagination: {
          total,
          limit: sanitizedLimit,
          offset: sanitizedOffset,
          hasMore: (sanitizedOffset + sanitizedLimit) < total
        }
      };
    } catch (error) {
      logger.error('Error getting topup history', { error: error.message, userId, filters });
      throw error;
    }
  }

  /**
   * Get pending top-ups for admin verification
   * Requirements: 4.1, 4.2, 4.6
   * 
   * @param {Object} [filters] - Optional filters
   * @param {string} [filters.paymentMethod] - Filter by payment method
   * @param {Date} [filters.startDate] - Filter by start date
   * @param {Date} [filters.endDate] - Filter by end date
   * @param {number} [filters.limit=50] - Number of records per page
   * @param {number} [filters.offset=0] - Offset for pagination
   * @returns {Promise<Object>} Pending topups with count
   */
  async getPendingTopups(filters = {}) {
    const {
      paymentMethod,
      startDate,
      endDate,
      limit = 50,
      offset = 0
    } = filters;

    try {
      // Build WHERE clause
      const conditions = ["status = 'pending'"];
      const params = [];
      let paramIndex = 1;

      if (paymentMethod) {
        if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
          throw new Error(`Invalid payment method: ${paymentMethod}`);
        }
        conditions.push(`payment_method = $${paramIndex++}`);
        params.push(paymentMethod);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }

      const whereClause = conditions.join(' AND ');

      // Get pending count (total pending, not just filtered)
      const pendingCountResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM topups WHERE status = 'pending'`
      );
      const pendingCount = parseInt(pendingCountResult.rows[0].count);

      // Get total count for current filter
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as total FROM topups WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get topups with user info
      const sanitizedLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);
      const sanitizedOffset = Math.max(parseInt(offset) || 0, 0);

      params.push(sanitizedLimit, sanitizedOffset);

      const result = await this.pool.query(
        `SELECT 
          t.id,
          t.user_id,
          t.amount,
          t.payment_method,
          t.transaction_reference,
          t.platform_wallet_id,
          t.status,
          t.rejection_reason,
          t.verified_by,
          t.verified_at,
          t.created_at,
          t.updated_at,
          u.name as user_name,
          u.email as user_email,
          u.phone as user_phone
        FROM topups t
        LEFT JOIN users u ON t.user_id = u.id
        WHERE ${whereClause}
        ORDER BY t.created_at ASC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        params
      );

      return {
        topups: result.rows,
        total,
        pendingCount,
        pagination: {
          total,
          limit: sanitizedLimit,
          offset: sanitizedOffset,
          hasMore: (sanitizedOffset + sanitizedLimit) < total
        }
      };
    } catch (error) {
      logger.error('Error getting pending topups', { error: error.message, filters });
      throw error;
    }
  }

  /**
   * Get a single topup by ID
   * 
   * @param {number} topupId - Top-up ID
   * @param {string} [userId] - Optional user ID to verify ownership
   * @returns {Promise<Object|null>} Topup or null if not found
   */
  async getTopupById(topupId, userId = null) {
    try {
      let query = `
        SELECT 
          id,
          user_id,
          amount,
          payment_method,
          transaction_reference,
          platform_wallet_id,
          status,
          rejection_reason,
          verified_by,
          verified_at,
          created_at,
          updated_at
        FROM topups 
        WHERE id = $1`;
      
      const params = [topupId];

      if (userId) {
        query += ' AND user_id = $2';
        params.push(userId);
      }

      const result = await this.pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting topup by ID', { error: error.message, topupId, userId });
      throw error;
    }
  }


  /**
   * Create audit log entry
   * Requirements: 4.7
   * 
   * @param {Object} client - Database client (for transaction)
   * @param {Object} data - Audit log data
   * @private
   */
  async _createAuditLog(client, data) {
    const { topupId, adminId, action, details, ipAddress } = data;

    try {
      await client.query(
        `INSERT INTO topup_audit_logs (
          topup_id,
          admin_id,
          action,
          details,
          ip_address,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [topupId, adminId, action, JSON.stringify(details), ipAddress]
      );

      logger.info('Audit log created', { topupId, adminId, action });
    } catch (error) {
      logger.error('Error creating audit log', { error: error.message, data });
      // Don't throw - audit log failure shouldn't fail the main operation
    }
  }

  /**
   * Notify admins of new top-up request
   * Requirements: 1.9, 2.8
   * 
   * @param {Object} topup - The created topup
   * @private
   */
  async _notifyAdmins(topup) {
    if (!this.notificationService) {
      logger.warn('Notification service not configured, skipping admin notification');
      return;
    }

    try {
      // Get all admin users
      const adminResult = await this.pool.query(
        `SELECT id FROM users WHERE primary_role = 'admin' AND is_active = true`
      );

      const admins = adminResult.rows;

      for (const admin of admins) {
        await this.notificationService.createNotification({
          userId: admin.id,
          orderId: null,
          type: 'topup_pending',
          title: 'New Top-Up Request',
          message: `New ${topup.payment_method} top-up of ${topup.amount} EGP pending verification`
        });
      }

      logger.info('Admin notifications sent for new topup', { 
        topupId: topup.id, 
        adminCount: admins.length 
      });
    } catch (error) {
      logger.error('Error notifying admins', { error: error.message, topupId: topup.id });
    }
  }

  /**
   * Notify user of top-up status change
   * Requirements: 4.5, 7.2, 7.3
   * 
   * @param {string} userId - User ID
   * @param {string} status - New status ('verified' or 'rejected')
   * @param {Object} topup - The topup record
   * @param {number} [newBalance] - New balance (for verified topups)
   * @private
   */
  async _notifyUser(userId, status, topup, newBalance = null) {
    if (!this.notificationService) {
      logger.warn('Notification service not configured, skipping user notification');
      return;
    }

    try {
      let title, message;

      if (status === 'verified') {
        title = 'Top-Up Successful';
        message = `Your ${topup.amount} EGP top-up has been verified.${newBalance !== null ? ` New balance: ${newBalance} EGP` : ''}`;
      } else if (status === 'rejected') {
        title = 'Top-Up Rejected';
        message = `Your ${topup.amount} EGP top-up was rejected. Reason: ${topup.rejection_reason}`;
      } else {
        return;
      }

      await this.notificationService.createNotification({
        userId,
        orderId: null,
        type: `topup_${status}`,
        title,
        message
      });

      logger.info('User notification sent for topup status change', { 
        topupId: topup.id, 
        userId, 
        status 
      });
    } catch (error) {
      logger.error('Error notifying user', { error: error.message, topupId: topup.id, userId });
    }
  }

  /**
   * Get audit logs for a topup
   * Requirements: 4.7
   * 
   * @param {number} topupId - Top-up ID
   * @returns {Promise<Array>} Audit logs
   */
  async getAuditLogs(topupId) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id,
          topup_id,
          admin_id,
          action,
          details,
          ip_address,
          created_at
        FROM topup_audit_logs 
        WHERE topup_id = $1
        ORDER BY created_at DESC`,
        [topupId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting audit logs', { error: error.message, topupId });
      throw error;
    }
  }
}

module.exports = { 
  TopupService, 
  VALID_PAYMENT_METHODS, 
  MIN_TOPUP_AMOUNT, 
  MAX_TOPUP_AMOUNT 
};
