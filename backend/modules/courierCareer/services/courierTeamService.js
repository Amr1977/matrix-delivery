const courierCareerRepository = require('../repositories/courierCareerRepository');
const tierService = require('./tierService');
const logger = require('../../../config/logger');

class CourierTeamService {
  /**
   * Create a new team with the courier as leader
   * Requires courier to be at least 'senior' tier
   * @param {string} leaderUserId - Courier user ID
   * @param {string} name - Team name
   * @returns {Object} Created team
   */
  async createTeam(leaderUserId, name) {
    const courier = await courierCareerRepository.getCourierStats(leaderUserId);
    if (!courier) {
      const error = new Error('Courier not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Check if courier is already a team leader
    const existingTeam = await courierCareerRepository.getTeamByLeader(leaderUserId);
    if (existingTeam) {
      const error = new Error('Courier is already a team leader');
      error.statusCode = 400;
      throw error;
    }
    
    // Check if courier is already a member of another team
    const currentTeam = await courierCareerRepository.getCourierTeam(leaderUserId);
    if (currentTeam) {
      const error = new Error('Courier is already a member of another team');
      error.statusCode = 400;
      throw error;
    }
    
    // Check tier requirement (must be senior or above)
    const tierOrder = { junior: 1, mid: 2, senior: 3, team_leader: 4 };
    const currentTier = courier.current_tier || 'junior';
    if (tierOrder[currentTier] < tierOrder.senior) {
      const error = new Error('Must be at least senior tier to create a team');
      error.statusCode = 403;
      throw error;
    }
    
    // Create team
    const team = await courierCareerRepository.createTeam(leaderUserId, name);
    
    // Add leader as team member
    await courierCareerRepository.addTeamMember(team.id, leaderUserId);
    
    // Record career event
    await courierCareerRepository.recordCareerEvent(leaderUserId, 'became_team_leader', {
      team_id: team.id,
      team_name: name
    });
    
    // Recalculate tier (may promote to team_leader if team size requirement met)
    await tierService.recalculateTier(leaderUserId);
    
    logger.info(`Team created`, {
      leaderUserId,
      teamId: team.id,
      teamName: name,
      category: 'courier_career'
    });
    
    return team;
  }

  /**
   * Add a member to a team
   * @param {number} teamId - Team ID
   * @param {string} courierUserId - Courier to add
   * @param {string} requesterUserId - User making the request (must be team leader)
   * @returns {Object} Added member
   */
  async addMember(teamId, courierUserId, requesterUserId) {
    // Verify requester is team leader
    const team = await courierCareerRepository.getTeamWithMembers(teamId);
    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }
    
    if (team.leader_user_id !== requesterUserId) {
      const error = new Error('Only team leader can add members');
      error.statusCode = 403;
      throw error;
    }
    
    // Check if courier exists and is a driver
    const courier = await courierCareerRepository.getCourierStats(courierUserId);
    if (!courier) {
      const error = new Error('Courier not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Check if courier is already in a team
    const currentTeam = await courierCareerRepository.getCourierTeam(courierUserId);
    if (currentTeam) {
      const error = new Error('Courier is already a member of another team');
      error.statusCode = 400;
      throw error;
    }
    
    // Add member
    const member = await courierCareerRepository.addTeamMember(teamId, courierUserId);
    
    // Record career event for the new member
    await courierCareerRepository.recordCareerEvent(courierUserId, 'joined_team', {
      team_id: teamId,
      team_name: team.name
    });
    
    // Recalculate tiers for both leader and member (leader's team size may qualify for team_leader)
    await tierService.recalculateTier(requesterUserId);
    await tierService.recalculateTier(courierUserId);
    
    logger.info(`Member added to team`, {
      teamId,
      courierUserId,
      requesterUserId,
      category: 'courier_career'
    });
    
    return member;
  }

  /**
   * Remove a member from their team
   * @param {string} courierUserId - Courier to remove
   * @param {string} requesterUserId - User making the request (team leader or the member themselves)
   * @returns {Object} Removal result
   */
  async removeMember(courierUserId, requesterUserId) {
    // Get courier's current team
    const currentTeam = await courierCareerRepository.getCourierTeam(courierUserId);
    if (!currentTeam) {
      const error = new Error('Courier is not a member of any team');
      error.statusCode = 404;
      throw error;
    }
    
    // Check permissions: team leader or the member themselves
    const isLeader = currentTeam.leader_user_id === requesterUserId;
    const isSelf = courierUserId === requesterUserId;
    
    if (!isLeader && !isSelf) {
      const error = new Error('Only team leader or the member can remove from team');
      error.statusCode = 403;
      throw error;
    }
    
    // Cannot remove the team leader (they would need to disband team)
    if (currentTeam.leader_user_id === courierUserId) {
      const error = new Error('Team leader cannot be removed. Disband team instead.');
      error.statusCode = 400;
      throw error;
    }
    
    // Remove member
    await courierCareerRepository.removeTeamMember(courierUserId);
    
    // Record career event
    await courierCareerRepository.recordCareerEvent(courierUserId, 'left_team', {
      team_id: currentTeam.id,
      team_name: currentTeam.team_name
    });
    
    // Recalculate tiers for both leader and member
    await tierService.recalculateTier(currentTeam.leader_user_id);
    await tierService.recalculateTier(courierUserId);
    
    logger.info(`Member removed from team`, {
      teamId: currentTeam.id,
      courierUserId,
      requesterUserId,
      category: 'courier_career'
    });
    
    return { success: true };
  }

  /**
   * Get team with members and aggregated stats
   * @param {number} teamId - Team ID
   * @returns {Object} Team with members and stats
   */
  async getTeamWithStats(teamId) {
    const team = await courierCareerRepository.getTeamWithMembers(teamId);
    if (!team) {
      const error = new Error('Team not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Calculate aggregated stats
    const totalDeliveries = team.members.reduce((sum, m) => sum + (m.completed_deliveries || 0), 0);
    const avgRating = team.members.length > 0
      ? team.members.reduce((sum, m) => sum + (m.rating || 5), 0) / team.members.length
      : 0;
    const verifiedCount = team.members.filter(m => m.is_verified).length;
    
    return {
      ...team,
      stats: {
        member_count: team.members.length,
        total_deliveries: totalDeliveries,
        average_rating: Math.round(avgRating * 100) / 100,
        verified_count: verifiedCount
      }
    };
  }

  /**
   * Get courier's team info (if any)
   * @param {string} courierUserId - Courier user ID
   * @returns {Object|null} Team info or null
   */
  async getCourierTeamInfo(courierUserId) {
    const teamMembership = await courierCareerRepository.getCourierTeam(courierUserId);
    if (!teamMembership) return null;
    
    return this.getTeamWithStats(teamMembership.team_id);
  }
}

module.exports = new CourierTeamService();