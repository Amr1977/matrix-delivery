const cron = require('node-cron');
const logger = require('../../../config/logger');
const vendorPayoutService = require('../services/vendorPayoutService');

const schedule = process.env.PAYOUT_RUN_CRON || '0 2 * * *';

function startPayoutRunJob() {
  cron.schedule(schedule, async () => {
    try {
      const processed = await vendorPayoutService.processPendingPayouts(50);
      logger.info(`Payout run job: processed ${processed.length} payouts`, {
        category: 'marketplace_job',
        job: 'payoutRun',
      });
    } catch (err) {
      logger.error('Payout run job error:', {
        message: err.message,
        category: 'marketplace_job',
        job: 'payoutRun',
      });
    }
  });

  logger.info(`Scheduled payout run job (cron: ${schedule})`, {
    category: 'marketplace_job',
  });
}

module.exports = { startPayoutRunJob, schedule };
