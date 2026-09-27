const cron = require('node-cron');
const logger = require('../../../config/logger');
const offerService = require('../services/offerService');

const schedule = process.env.OFFER_EXPIRY_CRON || '*/15 * * * *';

function startOfferExpiryJob() {
  cron.schedule(schedule, async () => {
    try {
      const expired = await offerService.expireOffers();
      logger.info(`Offer expiry job: expired ${expired.length} offers`, {
        category: 'marketplace_job',
        job: 'offerExpiry',
      });
    } catch (err) {
      logger.error('Offer expiry job error:', {
        message: err.message,
        category: 'marketplace_job',
        job: 'offerExpiry',
      });
    }
  });

  logger.info(`Scheduled offer expiry job (cron: ${schedule})`, {
    category: 'marketplace_job',
  });
}

module.exports = { startOfferExpiryJob, schedule };
