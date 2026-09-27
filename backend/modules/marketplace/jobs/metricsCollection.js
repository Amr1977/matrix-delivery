/**
 * Marketplace Metrics Collection Job
 *
 * Runs on a cron schedule to collect business-level marketplace KPIs
 * (order flow, commissions, vendor ratings, payouts, error rates)
 * and persists them to the marketplace_metrics table.
 *
 * @module modules/marketplace/jobs/metricsCollection
 */

const cron = require('node-cron');
const logger = require('../../../config/logger');
const MarketplaceMetricsService = require('../services/marketplaceMetricsService');

const schedule = process.env.MARKETPLACE_METRICS_CRON || '*/5 * * * *';
const metricsService = new MarketplaceMetricsService();

function startMetricsCollectionJob() {
  cron.schedule(schedule, async () => {
    try {
      const metrics = await metricsService.collectMetrics('hourly');
      logger.info('Marketplace metrics collection completed', {
        category: 'marketplace_job',
        job: 'metricsCollection',
        totalOrders: metrics.total_orders,
        ordersDelivered: metrics.orders_delivered,
        orderVolumeEgp: metrics.order_volume_egp,
      });
    } catch (err) {
      logger.error('Marketplace metrics collection job error', {
        message: err.message,
        stack: err.stack,
        category: 'marketplace_job',
        job: 'metricsCollection',
      });
    }
  });

  logger.info(
    `Scheduled marketplace metrics collection job (cron: ${schedule})`,
    {
      category: 'marketplace_job',
    },
  );
}

module.exports = { startMetricsCollectionJob, schedule };
