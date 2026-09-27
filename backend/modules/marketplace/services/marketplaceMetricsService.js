/**
 * Marketplace Metrics Service
 *
 * Collects business-level KPIs for marketplace observability.
 * Metrics are persisted to the marketplace_metrics table for
 * dashboarding, alerting, and trend analysis.
 *
 * @module modules/marketplace/services/marketplaceMetricsService
 */

const pool = require('../../../config/db');
const logger = require('../../../config/logger');

class MarketplaceMetricsService {
  /**
   * Collect a full snapshot of marketplace KPIs and persist it.
   *
   * @param {string} metricType - 'hourly' | 'daily' | 'weekly'
   * @returns {Promise<Object>} The persisted metrics row
   */
  async collectMetrics(metricType = 'hourly') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // --- Order flow metrics ---
      const orderStatsResult = await client.query(`
        SELECT
          COUNT(*) AS total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') AS orders_pending_bids,
          COUNT(*) FILTER (WHERE status = 'accepted') AS orders_vendor_confirmed,
          COUNT(*) FILTER (WHERE status = 'assigned') AS orders_assigned,
          COUNT(*) FILTER (WHEN status IN ('delivered', 'customer_delivered', 'completed')) AS orders_delivered,
          COUNT(*) FILTER (WHERE status IN ('cancelled', 'refunded', 'failed')) AS orders_cancelled
        FROM marketplace_orders
      `);

      // --- Financial metrics ---
      const financialResult = await client.query(`
        SELECT
          COALESCE(SUM(total_amount), 0) AS order_volume_egp,
          COALESCE(SUM(commission_amount), 0) AS commission_collected_egp,
          COALESCE(SUM(vp.payout_amount) FILTER (WHERE vp.status = 'pending'), 0) AS payouts_pending_egp
        FROM marketplace_orders mo
        LEFT JOIN vendor_payouts vp ON vp.order_id = mo.id
        WHERE mo.created_at >= NOW() - INTERVAL '24 hours'
      `);
      const finRow = financialResult.rows[0];

      // --- Vendor performance ---
      const vendorResult = await client.query(`
        SELECT
          COUNT(*) AS active_vendors,
          COALESCE(AVG(v.rating), 0) AS avg_vendor_rating
        FROM vendors v
        WHERE v.is_active = true
      `);
      const vendorRow = vendorResult.rows[0];

      // --- Preparation and delivery timing (last 24h) ---
      const timingResult = await client.query(`
        SELECT
          COALESCE(AVG(EXTRACT(EPOCH FROM (prepared_at - created_at)) / 60), 0) AS avg_preparation_time_minutes,
          COALESCE(AVG(EXTRACT(EPOCH FROM (delivered_at - prepared_at)) / 60), 0) AS avg_delivery_time_minutes
        FROM marketplace_orders
        WHERE created_at >= NOW() - INTERVAL '24 hours'
          AND prepared_at IS NOT NULL
          AND delivered_at IS NOT NULL
      `);
      const timingRow = timingResult.rows[0];

      // --- Error rates ---
      const errorResult = await client.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'failed') AS order_creation_failures,
          0 AS inventory_conflicts
        FROM marketplace_orders
        WHERE created_at >= NOW() - INTERVAL '24 hours'
      `);
      const errorRow = errorResult.rows[0];

      const orderRow = orderStatsResult.rows[0];

      const metrics = {
        metricType,
        totalOrders: parseInt(orderRow.total_orders) || 0,
        ordersPendingBids: parseInt(orderRow.orders_pending_bids) || 0,
        ordersVendorConfirmed: parseInt(orderRow.orders_vendor_confirmed) || 0,
        ordersAssigned: parseInt(orderRow.orders_assigned) || 0,
        ordersDelivered: parseInt(orderRow.orders_delivered) || 0,
        ordersCancelled: parseInt(orderRow.orders_cancelled) || 0,
        activeVendors: parseInt(vendorRow.active_vendors) || 0,
        avgVendorRating: parseFloat(vendorRow.avg_vendor_rating) || 0,
        orderVolumeEgp: parseFloat(finRow.order_volume_egp) || 0,
        commissionCollectedEgp:
          parseFloat(finRow.commission_collected_egp) || 0,
        payoutsPendingEgp: parseFloat(finRow.payouts_pending_egp) || 0,
        avgPreparationTimeMinutes:
          parseInt(timingRow.avg_preparation_time_minutes) || 0,
        avgDeliveryTimeMinutes:
          parseInt(timingRow.avg_delivery_time_minutes) || 0,
        orderCreationFailures: parseInt(errorRow.order_creation_failures) || 0,
        inventoryConflicts: parseInt(errorRow.inventory_conflicts) || 0,
      };

      await client.query(
        `INSERT INTO marketplace_metrics (
          metric_type,
          total_orders,
          orders_pending_bids,
          orders_vendor_confirmed,
          orders_assigned,
          orders_delivered,
          orders_cancelled,
          active_vendors,
          avg_vendor_rating,
          order_volume_egp,
          commission_collected_egp,
          payouts_pending_egp,
          avg_preparation_time_minutes,
          avg_delivery_time_minutes,
          order_creation_failures,
          inventory_conflicts
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          metrics.metricType,
          metrics.totalOrders,
          metrics.ordersPendingBids,
          metrics.ordersVendorConfirmed,
          metrics.ordersAssigned,
          metrics.ordersDelivered,
          metrics.ordersCancelled,
          metrics.activeVendors,
          metrics.avgVendorRating,
          metrics.orderVolumeEgp,
          metrics.commissionCollectedEgp,
          metrics.payoutsPendingEgp,
          metrics.avgPreparationTimeMinutes,
          metrics.avgDeliveryTimeMinutes,
          metrics.orderCreationFailures,
          metrics.inventoryConflicts,
        ],
      );

      await client.query('COMMIT');

      logger.info('Marketplace metrics collected', {
        category: 'marketplace_metrics',
        ...metrics,
      });

      return metrics;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to collect marketplace metrics', {
        error: error.message,
        stack: error.stack,
        category: 'marketplace_metrics',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieve the most recent metrics snapshot.
   *
   * @returns {Promise<Object|null>} Latest metrics row
   */
  async getLatestMetrics() {
    const result = await pool.query(
      `SELECT * FROM marketplace_metrics ORDER BY timestamp DESC LIMIT 1`,
    );
    return result.rows[0] || null;
  }

  /**
   * Retrieve metrics history for charting.
   *
   * @param {number} hours - Hours of history to retrieve (max 168)
   * @param {string} metricType - Filter by metric type
   * @returns {Promise<Array>} Array of metric snapshots
   */
  async getMetricsHistory(hours = 24, metricType = null) {
    const cappedHours = Math.min(hours, 168);
    let query = `
      SELECT * FROM marketplace_metrics
      WHERE timestamp > NOW() - INTERVAL '${cappedHours} hours'
    `;
    const params = [];

    if (metricType) {
      params.push(metricType);
      query += ` AND metric_type = $1`;
    }

    query += ` ORDER BY timestamp ASC`;
    if (params.length > 0) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(cappedHours * 60);
    } else {
      query += ` LIMIT 1000`;
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get real-time dashboard summary (latest snapshot + alerts).
   *
   * @returns {Promise<Object>} Dashboard summary
   */
  async getDashboardSummary() {
    const [latestResult, pendingPayoutsResult] = await Promise.all([
      pool.query(
        `SELECT * FROM marketplace_metrics ORDER BY timestamp DESC LIMIT 1`,
      ),
      pool.query(
        `SELECT
          COUNT(*) AS pending_payouts,
          COALESCE(SUM(payout_amount), 0) AS pending_payout_total_egp
        FROM vendor_payouts
        WHERE status = 'pending'`,
      ),
    ]);

    const latest = latestResult.rows[0] || null;
    const payouts = pendingPayoutsResult.rows[0] || {
      pending_payouts: 0,
      pending_payout_total_egp: 0,
    };

    const alerts = this._generateAlerts(latest, payouts);

    return {
      latest,
      pendingPayouts: {
        count: parseInt(payouts.pending_payouts) || 0,
        totalEgp: parseFloat(payouts.pending_payout_total_egp) || 0,
      },
      alerts,
    };
  }

  /**
   * Generate alert indicators based on metric thresholds.
   *
   * @param {Object} latest - Latest metrics snapshot
   * @param {Object} payouts - Pending payouts summary
   * @returns {Array} Array of alert objects
   * @private
   */
  _generateAlerts(latest, payouts) {
    const alerts = [];

    if (latest) {
      if ((latest.inventory_conflicts || 0) > 0) {
        alerts.push({
          level: 'warning',
          metric: 'inventory_conflicts',
          message: `${latest.inventory_conflicts} inventory conflicts detected`,
        });
      }

      if ((latest.order_creation_failures || 0) > 5) {
        alerts.push({
          level: 'warning',
          metric: 'order_creation_failures',
          message: `${latest.order_creation_failures} order creation failures in last 24h`,
        });
      }

      if (
        (latest.orders_delivered || 0) > 0 &&
        (latest.orders_cancelled || 0) > 0
      ) {
        const cancellationRate =
          (latest.orders_cancelled /
            (latest.orders_delivered + latest.orders_cancelled)) *
          100;
        if (cancellationRate > 10) {
          alerts.push({
            level: 'warning',
            metric: 'cancellation_rate',
            message: `Order cancellation rate is ${cancellationRate.toFixed(1)}%`,
          });
        }
      }
    }

    if (parseInt(payouts.pending_payouts) > 50) {
      alerts.push({
        level: 'warning',
        metric: 'pending_payouts',
        message: `${payouts.pending_payouts} payouts pending processing`,
      });
    }

    return alerts;
  }
}

module.exports = MarketplaceMetricsService;
