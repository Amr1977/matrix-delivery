const { startOfferExpiryJob } = require('./offerExpiry');
const { startCartCleanupJob } = require('./cartCleanup');
const { startPayoutRunJob } = require('./payoutRun');

function registerJobs() {
  startOfferExpiryJob();
  startCartCleanupJob();
  startPayoutRunJob();
}

module.exports = {
  registerJobs,
  startOfferExpiryJob,
  startCartCleanupJob,
  startPayoutRunJob,
};
