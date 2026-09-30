const cron = require('node-cron');
const tierService = require('../services/tierService');
const logger = require('../../../config/logger');

const DEFAULT_SCHEDULE = '0 3 * * *'; // Daily at 3 AM

function startTierRecalculationJob() {
  const schedule = process.env.TIER_RECALCULATION_CRON || DEFAULT_SCHEDULE;
  
  cron.schedule(schedule, async () => {
    const jobStart = Date.now();
    logger.info('Starting daily tier recalculation job', { category: 'courier_career', job: 'tierRecalculation' });
    
    let totalProcessed = 0;
    let totalPromoted = 0;
    let totalDemoted = 0;
    let totalErrors = 0;
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;
    
    try {
      while (hasMore) {
        const stats = await tierService.recalculateAllTiers({ batchSize, offset });
        
        totalProcessed += stats.processed;
        totalPromoted += stats.promoted;
        totalDemoted += stats.demoted;
        totalErrors += stats.errors;
        
        if (stats.processed < batchSize) {
          hasMore = false;
        } else {
          offset += batchSize;
          // Small delay between batches to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      const duration = Date.now() - jobStart;
      
      logger.info('Daily tier recalculation job completed', {
        category: 'courier_career',
        job: 'tierRecalculation',
        duration_ms: duration,
        processed: totalProcessed,
        promoted: totalPromoted,
        demoted: totalDemoted,
        errors: totalErrors
      });
      
    } catch (error) {
      logger.error('Daily tier recalculation job failed:', {
        category: 'courier_career',
        job: 'tierRecalculation',
        error: error.message,
        stack: error.stack
      });
    }
  });
  
  logger.info(`Scheduled tier recalculation job (cron: ${schedule})`, {
    category: 'courier_career',
    job: 'tierRecalculation'
  });
}

module.exports = { startTierRecalculationJob, schedule: DEFAULT_SCHEDULE };