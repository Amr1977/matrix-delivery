const { startTierRecalculationJob } = require('./tierRecalculation');

function registerJobs() {
  startTierRecalculationJob();
}

module.exports = {
  registerJobs,
  startTierRecalculationJob
};