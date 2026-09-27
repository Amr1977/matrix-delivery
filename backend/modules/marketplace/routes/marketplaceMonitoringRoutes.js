/**
 * Marketplace Monitoring Routes
 *
 * Admin-only endpoints for marketplace observability.
 * Provides KPI snapshots, metrics history, and alert indicators
 * to support operational monitoring and incident response.
 *
 * @module modules/marketplace/routes/marketplaceMonitoringRoutes
 */

const express = require('express');
const router = express.Router();
const logger = require('../../../config/logger');
const { verifyToken } = require('../../../middleware/auth');
const { requireAdmin } = require('../../../middleware/auth');
const MarketplaceMetricsService = require('../services/marketplaceMetricsService');

const metricsService = new MarketplaceMetricsService();

/**
 * GET /api/marketplace/monitoring/metrics/latest
 * Returns the latest marketplace KPI snapshot
 */
router.get('/metrics/latest', verifyToken, requireAdmin, async (req, res) => {
  try {
    const metrics = await metricsService.getLatestMetrics();
    if (!metrics) {
      return res.status(404).json({ error: 'No metrics collected yet' });
    }
    res.json(metrics);
  } catch (error) {
    logger.error('Failed to get latest marketplace metrics', {
      error: error.message,
      category: 'marketplace_monitoring',
    });
    res.status(500).json({ error: 'Failed to retrieve metrics' });
  }
});

/**
 * GET /api/marketplace/monitoring/metrics/history
 * Returns metrics history for charting
 * Query params: hours (default 24, max 168), metricType (optional)
 */
router.get('/metrics/history', verifyToken, requireAdmin, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const metricType = req.query.metricType || null;

    const history = await metricsService.getMetricsHistory(hours, metricType);

    res.json({
      hours,
      metricType: metricType || 'all',
      dataPoints: history.length,
      history,
    });
  } catch (error) {
    logger.error('Failed to get metrics history', {
      error: error.message,
      category: 'marketplace_monitoring',
    });
    res.status(500).json({ error: 'Failed to retrieve metrics history' });
  }
});

/**
 * GET /api/marketplace/monitoring/dashboard
 * Returns dashboard summary with latest metrics, pending payouts, and alerts
 */
router.get('/dashboard', verifyToken, requireAdmin, async (req, res) => {
  try {
    const summary = await metricsService.getDashboardSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Failed to get dashboard summary', {
      error: error.message,
      category: 'marketplace_monitoring',
    });
    res.status(500).json({ error: 'Failed to retrieve dashboard summary' });
  }
});

/**
 * POST /api/marketplace/monitoring/metrics/collect
 * Manual trigger to collect metrics immediately (admin only)
 */
router.post('/metrics/collect', verifyToken, requireAdmin, async (req, res) => {
  try {
    const metrics = await metricsService.collectMetrics('hourly');
    res.json({
      message: 'Metrics collected successfully',
      timestamp: new Date().toISOString(),
      ...metrics,
    });
  } catch (error) {
    logger.error('Failed to manually collect metrics', {
      error: error.message,
      stack: error.stack,
      category: 'marketplace_monitoring',
    });
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

module.exports = router;
