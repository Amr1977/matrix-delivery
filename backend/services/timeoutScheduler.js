const EventEmitter = require('events');
const pool = require('../config/db');

/**
 * Timeout Scheduler Service
 *
 * Manages scheduled timeouts for FSM state transitions:
 * - Vendor confirmation timeout (15 minutes)
 * - Payment timeout (10 minutes)
 * - Customer confirmation timeout (24 hours)
 *
 * Features:
 * - Persistent timeout scheduling
 * - Automatic cleanup of expired timeouts
 * - Event-driven timeout triggering
 * - Database-backed timeout storage
 */
class TimeoutScheduler extends EventEmitter {
  constructor() {
    super();
    this.activeTimeouts = new Map();
    this.isRunning = false;

    // Start the scheduler
    this.start();
  }

  /**
   * Start the timeout scheduler
   */
  start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('TimeoutScheduler started');

    // Check for pending timeouts every minute
    this.checkInterval = setInterval(() => {
      this.checkPendingTimeouts();
    }, 60000); // 1 minute

    // Initial check
    this.checkPendingTimeouts();
  }

  /**
   * Stop the timeout scheduler
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    // Clear all active timeouts
    for (const [key, timeoutId] of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();

    console.log('TimeoutScheduler stopped');
  }

  /**
   * Schedule a timeout for an FSM state
   * @param {string} orderId - The order ID
   * @param {string} fsmType - The FSM type (vendor, payment, delivery)
   * @param {string} state - The current state
   * @param {number} durationMs - Timeout duration in milliseconds
   * @param {string} event - The event to trigger on timeout
   * @param {object} context - Additional context data
   */
  async scheduleTimeout(orderId, fsmType, state, durationMs, event, context = {}) {
    const timeoutId = this.generateTimeoutId(orderId, fsmType, state);
    const expiresAt = new Date(Date.now() + durationMs);

    try {
      // Store timeout in database
      await pool.query(`
        INSERT INTO fsm_timeouts (
          timeout_id, order_id, fsm_type, state, event, context,
          duration_ms, expires_at, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (timeout_id)
        DO UPDATE SET
          expires_at = $8,
          status = $9,
          updated_at = NOW()
      `, [
        timeoutId,
        orderId,
        fsmType,
        state,
        event,
        JSON.stringify(context),
        durationMs,
        expiresAt,
        'scheduled'
      ]);

      // Schedule in-memory timeout for faster processing
      const memoryTimeoutId = setTimeout(async () => {
        await this.processTimeout(timeoutId, orderId, fsmType, state, event, context);
      }, durationMs);

      this.activeTimeouts.set(timeoutId, memoryTimeoutId);

      console.log(`Timeout scheduled: ${fsmType}:${state} for order ${orderId} (${durationMs}ms)`);

    } catch (error) {
      console.error('Error scheduling timeout:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled timeout
   * @param {string} orderId - The order ID
   * @param {string} fsmType - The FSM type
   * @param {string} state - The state
   */
  async cancelTimeout(orderId, fsmType, state) {
    const timeoutId = this.generateTimeoutId(orderId, fsmType, state);

    try {
      // Cancel in-memory timeout
      const memoryTimeoutId = this.activeTimeouts.get(timeoutId);
      if (memoryTimeoutId) {
        clearTimeout(memoryTimeoutId);
        this.activeTimeouts.delete(timeoutId);
      }

      // Update database status
      await pool.query(`
        UPDATE fsm_timeouts
        SET status = 'cancelled', cancelled_at = NOW()
        WHERE timeout_id = $1 AND status = 'scheduled'
      `, [timeoutId]);

      console.log(`Timeout cancelled: ${fsmType}:${state} for order ${orderId}`);

    } catch (error) {
      console.error('Error cancelling timeout:', error);
      throw error;
    }
  }

  /**
   * Check for and process pending timeouts
   */
  async checkPendingTimeouts() {
    if (!this.isRunning) {
      return;
    }

    try {
      const result = await pool.query(`
        SELECT timeout_id, order_id, fsm_type, state, event, context
        FROM fsm_timeouts
        WHERE status = 'scheduled'
        AND expires_at <= NOW()
        ORDER BY expires_at ASC
        LIMIT 50
      `);

      for (const row of result.rows) {
        await this.processTimeout(
          row.timeout_id,
          row.order_id,
          row.fsm_type,
          row.state,
          row.event,
          JSON.parse(row.context || '{}')
        );
      }

    } catch (error) {
      console.error('Error checking pending timeouts:', error);
    }
  }

  /**
   * Process a timeout when it expires
   */
  async processTimeout(timeoutId, orderId, fsmType, state, event, context) {
    try {
      // Remove from active timeouts
      const memoryTimeoutId = this.activeTimeouts.get(timeoutId);
      if (memoryTimeoutId) {
        clearTimeout(memoryTimeoutId);
        this.activeTimeouts.delete(timeoutId);
      }

      // Mark as processing in database
      await pool.query(`
        UPDATE fsm_timeouts
        SET status = 'processing', processed_at = NOW()
        WHERE timeout_id = $1
      `, [timeoutId]);

      // Emit timeout event
      this.emit('TIMEOUT_OCCURRED', {
        timeoutId,
        orderId,
        fsmType,
        state,
        event,
        context,
        timestamp: new Date()
      });

      console.log(`Timeout processed: ${fsmType}:${state} -> ${event} for order ${orderId}`);

      // Mark as completed
      await pool.query(`
        UPDATE fsm_timeouts
        SET status = 'completed', completed_at = NOW()
        WHERE timeout_id = $1
      `, [timeoutId]);

    } catch (error) {
      console.error(`Error processing timeout ${timeoutId}:`, error);

      // Mark as failed
      await pool.query(`
        UPDATE fsm_timeouts
        SET status = 'failed', error_message = $1, failed_at = NOW()
        WHERE timeout_id = $2
      `, [error.message, timeoutId]);
    }
  }

  /**
   * Get active timeouts for an order
   * @param {string} orderId - The order ID
   */
  async getActiveTimeouts(orderId) {
    const result = await pool.query(`
      SELECT timeout_id, fsm_type, state, event, expires_at, created_at
      FROM fsm_timeouts
      WHERE order_id = $1 AND status = 'scheduled'
      ORDER BY expires_at ASC
    `, [orderId]);

    return result.rows;
  }

  /**
   * Get timeout statistics
   */
  async getTimeoutStats() {
    const result = await pool.query(`
      SELECT
        fsm_type,
        state,
        event,
        COUNT(*) as total_timeouts,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_timeouts,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_timeouts,
        AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time_seconds
      FROM fsm_timeouts
      WHERE created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY fsm_type, state, event
      ORDER BY total_timeouts DESC
    `);

    return result.rows;
  }

  /**
   * Clean up old completed timeouts (maintenance)
   * @param {number} daysOld - Remove timeouts older than this many days
   */
  async cleanupOldTimeouts(daysOld = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await pool.query(`
      DELETE FROM fsm_timeouts
      WHERE status IN ('completed', 'cancelled')
      AND created_at < $1
    `, [cutoffDate]);

    console.log(`Cleaned up ${result.rowCount} old timeouts`);
    return result.rowCount;
  }

  /**
   * Generate unique timeout ID
   */
  generateTimeoutId(orderId, fsmType, state) {
    return `timeout_${orderId}_${fsmType}_${state}_${Date.now()}`;
  }

  /**
   * Handle FSM state changes to manage timeouts
   * @param {string} orderId - The order ID
   * @param {string} fsmType - The FSM type
   * @param {string} newState - The new state
   */
  async handleStateChange(orderId, fsmType, newState) {
    // Cancel any existing timeouts for this FSM since state changed
    const activeTimeouts = await this.getActiveTimeouts(orderId);
    for (const timeout of activeTimeouts) {
      if (timeout.fsm_type === fsmType) {
        await this.cancelTimeout(orderId, fsmType, timeout.state);
      }
    }

    // Schedule new timeout if this state requires one
    const timeoutConfig = this.getTimeoutConfigForState(fsmType, newState);
    if (timeoutConfig) {
      await this.scheduleTimeout(
        orderId,
        fsmType,
        newState,
        timeoutConfig.duration,
        timeoutConfig.event,
        timeoutConfig.context || {}
      );
    }
  }

  /**
   * Get timeout configuration for a specific state
   */
  getTimeoutConfigForState(fsmType, state) {
    const configs = {
      vendor: {
        'awaiting_order_availability_vendor_confirmation': {
          duration: 15 * 60 * 1000, // 15 minutes
          event: 'timeout'
        }
      },
      payment: {
        'payment_pending_for_customer': {
          duration: 10 * 60 * 1000, // 10 minutes
          event: 'timeout'
        }
      },
      delivery: {
        'awaiting_customer_confirmation_of_order_delivery': {
          duration: 24 * 60 * 60 * 1000, // 24 hours
          event: 'customer_timeout'
        }
      }
    };

    return configs[fsmType]?.[state];
  }
}

// Export singleton instance
const timeoutScheduler = new TimeoutScheduler();

module.exports = {
  TimeoutScheduler,
  timeoutScheduler
};
