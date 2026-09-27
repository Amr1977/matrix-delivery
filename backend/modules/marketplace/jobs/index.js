const { startOfferExpiryJob } = require('./offerExpiry');
const { startCartCleanupJob } = require('./cartCleanup');
const { startPayoutRunJob } = require('./payoutRun');
const { startMetricsCollectionJob } = require('./metricsCollection');

function registerJobs() {
  startOfferExpiryJob();
  startCartCleanupJob();
  startPayoutRunJob();
  startMetricsCollectionJob();
}

module.exports = {
  registerJobs,
  startOfferExpiryJob,
  startCartCleanupJob,
  startPayoutRunJob,
  startMetricsCollectionJob,
};
