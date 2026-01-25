/**
 * Platform Wallet Service
 * Handles platform wallet management for Egypt payment methods
 * Supports Smart Wallets (Vodafone Cash, Orange Money, Etisalat Cash, WE Pay) and InstaPay
 * 
 * Requirements: 5.1, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
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

class PlatformWalletService {
  constructor(dbPool = pool) {
    this.pool = dbPool;
    // Track last selected wallet index per payment method for round-robin
    this.lastSelectedIndex = new Map();
  }

  /**
   * Get active platform wallets, optionally filtered by payment method
   * Requirements: 5.1, 5.4
   * 
   * @param {string} [paymentMethod] - Optional payment method filter
   * @returns {Promise<Array>} List of active platform wallets
   */
  async getActiveWallets(paymentMethod = null) {
    try {
      let query = `
        SELECT 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          COALESCE(holder_name, wallet_name) as holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at
        FROM platform_wallets 
        WHERE is_active = TRUE
      `;
      const params = [];

      if (paymentMethod) {
        if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
          throw new Error(`Invalid payment method: ${paymentMethod}`);
        }
        query += ' AND wallet_type = $1';
        params.push(paymentMethod);
      }

      query += ' ORDER BY wallet_type, id';

      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error) {
      logger.error('Error getting active wallets', { error: error.message, paymentMethod });
      throw error;
    }
  }

  /**
   * Get a platform wallet by ID
   * Requirements: 5.1
   * 
   * @param {number} walletId - The wallet ID
   * @returns {Promise<Object|null>} The wallet or null if not found
   */
  async getWalletById(walletId) {
    try {
      const result = await this.pool.query(
        `SELECT 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          COALESCE(holder_name, wallet_name) as holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at
        FROM platform_wallets 
        WHERE id = $1`,
        [walletId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting wallet by ID', { error: error.message, walletId });
      throw error;
    }
  }

  /**
   * Select the best wallet for a top-up using round-robin selection
   * Only selects from active wallets that haven't exceeded their limits
   * Requirements: 5.3, 5.5, 5.8
   * 
   * @param {string} paymentMethod - The payment method
   * @returns {Promise<Object|null>} The selected wallet or null if none available
   */
  async selectWalletForTopup(paymentMethod) {
    try {
      if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new Error(`Invalid payment method: ${paymentMethod}`);
      }

      // Reset limits if needed before selection
      await this._resetLimitsIfNeeded();

      // Get all active wallets for this payment method that haven't exceeded limits
      const result = await this.pool.query(
        `SELECT 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          COALESCE(holder_name, wallet_name) as holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at
        FROM platform_wallets 
        WHERE is_active = TRUE 
          AND wallet_type = $1
          AND daily_used < daily_limit
          AND monthly_used < monthly_limit
        ORDER BY id`,
        [paymentMethod]
      );

      const wallets = result.rows;

      if (wallets.length === 0) {
        logger.warn('No available wallets for payment method', { paymentMethod });
        return null;
      }

      // Round-robin selection
      const lastIndex = this.lastSelectedIndex.get(paymentMethod) || -1;
      const nextIndex = (lastIndex + 1) % wallets.length;
      this.lastSelectedIndex.set(paymentMethod, nextIndex);

      const selectedWallet = wallets[nextIndex];

      logger.info('Wallet selected for topup', {
        walletId: selectedWallet.id,
        paymentMethod,
        roundRobinIndex: nextIndex
      });

      return selectedWallet;
    } catch (error) {
      logger.error('Error selecting wallet for topup', { error: error.message, paymentMethod });
      throw error;
    }
  }

  /**
   * Create a new platform wallet (admin only)
   * Requirements: 5.7
   * 
   * @param {Object} data - Wallet data
   * @returns {Promise<Object>} The created wallet
   */
  async createWallet(data) {
    const {
      paymentMethod,
      phoneNumber,
      instapayAlias,
      holderName,
      dailyLimit = 50000,
      monthlyLimit = 500000
    } = data;

    try {
      if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new Error(`Invalid payment method: ${paymentMethod}`);
      }

      if (!holderName || holderName.trim() === '') {
        throw new Error('Holder name is required');
      }

      // Validate that smart wallets have phone number and InstaPay has alias
      if (paymentMethod === 'instapay') {
        if (!instapayAlias || instapayAlias.trim() === '') {
          throw new Error('InstaPay alias is required for InstaPay wallets');
        }
      } else {
        if (!phoneNumber || phoneNumber.trim() === '') {
          throw new Error('Phone number is required for smart wallets');
        }
      }

      // Check if wallet already exists for this payment method
      const existingWallet = await this.pool.query(
        'SELECT id FROM platform_wallets WHERE wallet_type = $1',
        [paymentMethod]
      );

      if (existingWallet.rows.length > 0) {
        throw new Error(`Platform wallet already exists for payment method: ${paymentMethod}`);
      }

      const result = await this.pool.query(
        `INSERT INTO platform_wallets (
          wallet_type,
          phone_number,
          instapay_alias,
          holder_name,
          wallet_name,
          daily_limit,
          monthly_limit,
          is_active,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly
        ) VALUES ($1, $2, $3, $4, $4, $5, $6, TRUE, 0, 0, NOW(), NOW())
        RETURNING
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at`,
        [
          paymentMethod,
          phoneNumber || null,
          instapayAlias || null,
          holderName.trim(),
          dailyLimit,
          monthlyLimit
        ]
      );

      logger.info('Platform wallet created', {
        walletId: result.rows[0].id,
        paymentMethod,
        holderName
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error creating platform wallet', { error: error.message, data });
      throw error;
    }
  }

  /**
   * Update a platform wallet (admin only)
   * Requirements: 5.7
   * 
   * @param {number} walletId - The wallet ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} The updated wallet
   */
  async updateWallet(walletId, data) {
    const {
      phoneNumber,
      instapayAlias,
      holderName,
      dailyLimit,
      monthlyLimit,
      isActive
    } = data;

    try {
      // Build dynamic update query
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (phoneNumber !== undefined) {
        updates.push(`phone_number = $${paramIndex++}`);
        params.push(phoneNumber);
      }

      if (instapayAlias !== undefined) {
        updates.push(`instapay_alias = $${paramIndex++}`);
        params.push(instapayAlias);
      }

      if (holderName !== undefined) {
        if (holderName.trim() === '') {
          throw new Error('Holder name cannot be empty');
        }
        updates.push(`holder_name = $${paramIndex++}`);
        updates.push(`wallet_name = $${paramIndex++}`);
        params.push(holderName.trim());
        params.push(holderName.trim());
      }

      if (dailyLimit !== undefined) {
        if (dailyLimit < 0) {
          throw new Error('Daily limit cannot be negative');
        }
        updates.push(`daily_limit = $${paramIndex++}`);
        params.push(dailyLimit);
      }

      if (monthlyLimit !== undefined) {
        if (monthlyLimit < 0) {
          throw new Error('Monthly limit cannot be negative');
        }
        updates.push(`monthly_limit = $${paramIndex++}`);
        params.push(monthlyLimit);
      }

      if (isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        params.push(isActive);
      }

      if (updates.length === 0) {
        throw new Error('No update fields provided');
      }

      updates.push(`updated_at = NOW()`);
      params.push(walletId);

      const result = await this.pool.query(
        `UPDATE platform_wallets 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at`,
        params
      );

      if (result.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      logger.info('Platform wallet updated', {
        walletId,
        updates: Object.keys(data)
      });

      return result.rows[0];
    } catch (error) {
      logger.error('Error updating platform wallet', { error: error.message, walletId, data });
      throw error;
    }
  }

  /**
   * Deactivate a platform wallet (admin only)
   * Requirements: 5.4, 5.7
   * 
   * @param {number} walletId - The wallet ID
   * @returns {Promise<Object>} The deactivated wallet
   */
  async deactivateWallet(walletId) {
    try {
      const result = await this.pool.query(
        `UPDATE platform_wallets 
        SET is_active = FALSE, updated_at = NOW()
        WHERE id = $1
        RETURNING 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at`,
        [walletId]
      );

      if (result.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      logger.info('Platform wallet deactivated', { walletId });

      return result.rows[0];
    } catch (error) {
      logger.error('Error deactivating platform wallet', { error: error.message, walletId });
      throw error;
    }
  }

  /**
   * Update wallet usage after a top-up is verified
   * Requirements: 5.5
   * 
   * @param {number} walletId - The wallet ID
   * @param {number} amount - The top-up amount
   * @returns {Promise<Object>} The updated wallet with new usage
   */
  async updateWalletUsage(walletId, amount) {
    try {
      // First reset limits if needed
      await this._resetLimitsIfNeeded();

      const result = await this.pool.query(
        `UPDATE platform_wallets 
        SET 
          daily_used = daily_used + $1,
          monthly_used = monthly_used + $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at`,
        [amount, walletId]
      );

      if (result.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const wallet = result.rows[0];

      // Check if wallet is approaching limit (80%) and trigger alert
      await this._checkAndAlertLimits(wallet);

      logger.info('Wallet usage updated', {
        walletId,
        amount,
        newDailyUsed: wallet.daily_used,
        newMonthlyUsed: wallet.monthly_used
      });

      return wallet;
    } catch (error) {
      logger.error('Error updating wallet usage', { error: error.message, walletId, amount });
      throw error;
    }
  }

  /**
   * Check wallet limits and trigger admin alert at 80% capacity
   * Requirements: 5.6
   * 
   * @param {Object} wallet - The wallet object
   * @private
   */
  async _checkAndAlertLimits(wallet) {
    const dailyPercentage = (parseFloat(wallet.daily_used) / parseFloat(wallet.daily_limit)) * 100;
    const monthlyPercentage = (parseFloat(wallet.monthly_used) / parseFloat(wallet.monthly_limit)) * 100;

    const alerts = [];

    if (dailyPercentage >= 80) {
      alerts.push({
        type: 'daily',
        percentage: dailyPercentage.toFixed(1),
        used: wallet.daily_used,
        limit: wallet.daily_limit
      });
    }

    if (monthlyPercentage >= 80) {
      alerts.push({
        type: 'monthly',
        percentage: monthlyPercentage.toFixed(1),
        used: wallet.monthly_used,
        limit: wallet.monthly_limit
      });
    }

    if (alerts.length > 0) {
      logger.warn('Wallet approaching limit - admin alert triggered', {
        walletId: wallet.id,
        paymentMethod: wallet.payment_method,
        holderName: wallet.holder_name,
        alerts
      });

      // Emit event for notification service to pick up
      // This will be handled by the notification integration task
      this._emitLimitAlert(wallet, alerts);
    }
  }

  /**
   * Emit limit alert event for notification service
   * @param {Object} wallet - The wallet object
   * @param {Array} alerts - Array of alert objects
   * @private
   */
  _emitLimitAlert(wallet, alerts) {
    // Store alert for notification service to process
    // This is a placeholder - actual notification will be implemented in task 6
    this.lastLimitAlert = {
      wallet,
      alerts,
      timestamp: new Date()
    };
  }

  /**
   * Get the last limit alert (for testing and notification service)
   * @returns {Object|null} The last limit alert or null
   */
  getLastLimitAlert() {
    return this.lastLimitAlert || null;
  }

  /**
   * Reset daily and monthly limits if needed
   * Requirements: 5.5
   * @private
   */
  async _resetLimitsIfNeeded() {
    try {
      const now = new Date();

      // Reset daily limits for wallets where last_reset_daily is not today
      await this.pool.query(
        `UPDATE platform_wallets 
        SET daily_used = 0, last_reset_daily = NOW()
        WHERE DATE(last_reset_daily) < DATE($1)`,
        [now]
      );

      // Reset monthly limits for wallets where last_reset_monthly is not this month
      await this.pool.query(
        `UPDATE platform_wallets 
        SET monthly_used = 0, last_reset_monthly = NOW()
        WHERE DATE_TRUNC('month', last_reset_monthly) < DATE_TRUNC('month', $1::timestamp)`,
        [now]
      );
    } catch (error) {
      logger.error('Error resetting wallet limits', { error: error.message });
      // Don't throw - this is a background operation
    }
  }

  /**
   * Get all wallets (including inactive) for admin management
   * Requirements: 5.7
   * 
   * @returns {Promise<Array>} List of all platform wallets
   */
  async getAllWallets() {
    try {
      const result = await this.pool.query(
        `SELECT 
          id,
          wallet_type as payment_method,
          phone_number,
          instapay_alias,
          COALESCE(holder_name, wallet_name) as holder_name,
          is_active,
          daily_limit,
          monthly_limit,
          daily_used,
          monthly_used,
          last_reset_daily,
          last_reset_monthly,
          created_at,
          updated_at
        FROM platform_wallets 
        ORDER BY wallet_type, id`
      );

      return result.rows;
    } catch (error) {
      logger.error('Error getting all wallets', { error: error.message });
      throw error;
    }
  }
}

module.exports = { PlatformWalletService, VALID_PAYMENT_METHODS };
