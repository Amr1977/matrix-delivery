const cron = require('node-cron');
const logger = require('../../../config/logger');
const cartService = require('../services/cartService');

const schedule = process.env.CART_CLEANUP_CRON || '0 * * * *';

function startCartCleanupJob() {
  cron.schedule(schedule, async () => {
    try {
      const deletedCount = await cartService.cleanupExpiredCarts();
      logger.info(`Cart cleanup job: removed ${deletedCount} expired carts`, {
        category: 'marketplace_job',
        job: 'cartCleanup',
      });
    } catch (err) {
      logger.error('Cart cleanup job error:', {
        message: err.message,
        category: 'marketplace_job',
        job: 'cartCleanup',
      });
    }
  });

  logger.info(`Scheduled cart cleanup job (cron: ${schedule})`, {
    category: 'marketplace_job',
  });
}

module.exports = { startCartCleanupJob, schedule };
