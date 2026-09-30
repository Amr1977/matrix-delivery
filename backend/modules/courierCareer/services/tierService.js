const courierCareerRepository = require('../repositories/courierCareerRepository');
const logger = require('../../../config/logger');

class TierService {
  /**
   * Determine eligible tier based on courier stats and tier rules
   * @param {Object} stats - Courier stats (completed_deliveries, rating, created_at)
   * @param {Array} tierRules - Array of tier rules from database
   * @param {number} teamSize - Current team size (for team_leader tier)
   * @returns {string} Eligible tier name
   */
  determineEligibleTier(stats, tierRules, teamSize = 0) {
    const { completed_deliveries, rating, created_at } = stats;
    const tenureDays = Math.floor((Date.now() - new Date(created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    // Check tiers in descending order of display_order (highest first)
    // team_leader has highest display_order but special requirements
    const sortedRules = [...tierRules].sort((a, b) => b.display_order - a.display_order);
    
    for (const rule of sortedRules) {
      // team_leader requires min_team_size satisfied
      if (rule.tier_name === 'team_leader') {
        if (teamSize < rule.min_team_size) continue;
      }
      
      const meetsDeliveries = completed_deliveries >= rule.min_completed_deliveries;
      const meetsTenure = tenureDays >= rule.min_tenure_days;
      const meetsRating = parseFloat(rating) >= parseFloat(rule.min_rating);
      
      if (meetsDeliveries && meetsTenure && meetsRating) {
        return rule.tier_name;
      }
    }
    
    // Default to junior (should always match since junior has 0 thresholds)
    return 'junior';
  }

  /**
   * Recalculate and update a courier's tier
   * @param {string} userId - Courier user ID
   * @returns {Object} Result with tier change info
   */
  async recalculateTier(userId) {
    const client = require('../../../config/db').connect();
    const dbClient = await client;
    
    try {
      await dbClient.query('BEGIN');
      
      // Get courier stats
      const courier = await courierCareerRepository.getCourierStats(userId);
      if (!courier) {
        throw new Error(`Courier ${userId} not found`);
      }
      
      // Get tier rules
      const tierRules = await courierCareerRepository.getTierRules();
      
      // Get team size if courier is a team leader
      let teamSize = 0;
      const team = await courierCareerRepository.getTeamByLeader(userId);
      if (team) {
        teamSize = await courierCareerRepository.getTeamMemberCount(team.id);
      }
      
      // Determine eligible tier
      const eligibleTier = this.determineEligibleTier(courier, tierRules, teamSize);
      const currentTier = courier.current_tier || 'junior';
      
      // If tier changed, update and record career event
      if (eligibleTier !== currentTier) {
        // Update tier in users table
        await courierCareerRepository.updateCourierTier(userId, eligibleTier);
        
        // Record career event
        const eventType = this.getTierEventType(currentTier, eligibleTier);
        await courierCareerRepository.recordCareerEvent(userId, eventType, {
          previous_tier: currentTier,
          new_tier: eligibleTier,
          stats_at_change: {
            completed_deliveries: courier.completed_deliveries,
            rating: courier.rating,
            tenure_days: Math.floor((Date.now() - new Date(courier.created_at).getTime()) / (1000 * 60 * 60 * 24)),
            team_size: teamSize
          }
        });
        
        await dbClient.query('COMMIT');
        
        logger.info(`Courier tier changed`, {
          userId,
          previousTier: currentTier,
          newTier: eligibleTier,
          category: 'courier_career'
        });
        
        return {
          changed: true,
          previousTier: currentTier,
          newTier: eligibleTier,
          eventType
        };
      }
      
      await dbClient.query('COMMIT');
      return { changed: false, currentTier };
      
    } catch (error) {
      await dbClient.query('ROLLBACK');
      logger.error('Tier recalculation failed:', { userId, error: error.message });
      throw error;
    } finally {
      dbClient.release();
    }
  }

  /**
   * Determine event type based on tier change direction
   */
  getTierEventType(previousTier, newTier) {
    const tierOrder = { junior: 1, mid: 2, senior: 3, team_leader: 4 };
    return tierOrder[newTier] > tierOrder[previousTier] ? 'tier_promoted' : 'tier_demoted';
  }

  /**
   * Recalculate tiers for all active couriers (batched)
   * Used by cron job
   * @param {Object} options - { batchSize, offset }
   * @returns {Object} Stats { processed, promoted, demoted, errors }
   */
  async recalculateAllTiers({ batchSize = 100, offset = 0 } = {}) {
    const stats = { processed: 0, promoted: 0, demoted: 0, errors: 0 };
    
    const couriers = await courierCareerRepository.getActiveCouriersBatch(offset, batchSize);
    
    for (const courier of couriers) {
      try {
        const result = await this.recalculateTier(courier.id);
        stats.processed++;
        if (result.changed) {
          if (result.eventType === 'tier_promoted') stats.promoted++;
          else if (result.eventType === 'tier_demoted') stats.demoted++;
        }
      } catch (error) {
        stats.errors++;
        logger.error(`Tier recalculation error for ${courier.id}:`, error.message);
      }
    }
    
    return stats;
  }
}

module.exports = new TierService();