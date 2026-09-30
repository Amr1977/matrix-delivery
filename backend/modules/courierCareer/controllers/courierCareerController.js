const tierService = require('../services/tierService');
const courierProfileService = require('../services/courierProfileService');
const courierTeamService = require('../services/courierTeamService');
const logger = require('../../../config/logger');

class CourierCareerController {
  /**
   * GET /api/couriers/:id/profile
   * Get public profile for a courier
   */
  async getPublicProfile(req, res) {
    try {
      const { id } = req.params;
      const requester = {
        userId: req.user.userId,
        primary_role: req.user.primary_role
      };
      
      const profile = await courierProfileService.getPublicProfile(id, requester);
      res.json({ success: true, profile });
    } catch (error) {
      logger.error('Get public profile error:', { userId: req.user.userId, targetId: req.params.id, error: error.message });
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to get profile' });
    }
  }

  /**
   * PATCH /api/couriers/me/profile-visibility
   * Update own profile visibility
   */
  async updateProfileVisibility(req, res) {
    try {
      const userId = req.user.userId;
      const { is_profile_public } = req.body;
      
      if (typeof is_profile_public !== 'boolean') {
        return res.status(400).json({ error: 'is_profile_public must be a boolean' });
      }
      
      const result = await courierProfileService.updateProfileVisibility(userId, is_profile_public);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Update profile visibility error:', { userId: req.user.userId, error: error.message });
      res.status(500).json({ error: error.message || 'Failed to update profile visibility' });
    }
  }

  /**
   * GET /api/couriers/:id/career-history
   * Get career timeline for a courier
   */
  async getCareerHistory(req, res) {
    try {
      const { id } = req.params;
      const requester = {
        userId: req.user.userId,
        primary_role: req.user.primary_role
      };
      
      const events = await courierProfileService.getCareerHistory(id, requester);
      res.json({ success: true, career_events: events });
    } catch (error) {
      logger.error('Get career history error:', { userId: req.user.userId, targetId: req.params.id, error: error.message });
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to get career history' });
    }
  }

  /**
   * POST /api/couriers/teams
   * Create a new team (become team leader)
   */
  async createTeam(req, res) {
    try {
      const leaderUserId = req.user.userId;
      const { name } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: 'Team name is required' });
      }
      
      const team = await courierTeamService.createTeam(leaderUserId, name.trim());
      res.status(201).json({ success: true, team });
    } catch (error) {
      logger.error('Create team error:', { userId: req.user.userId, error: error.message });
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to create team' });
    }
  }

  /**
   * POST /api/couriers/teams/:id/members
   * Add a member to a team
   */
  async addTeamMember(req, res) {
    try {
      const { id: teamId } = req.params;
      const { courier_user_id } = req.body;
      const requesterUserId = req.user.userId;
      
      if (!courier_user_id) {
        return res.status(400).json({ error: 'courier_user_id is required' });
      }
      
      const member = await courierTeamService.addMember(parseInt(teamId), courier_user_id, requesterUserId);
      res.status(201).json({ success: true, member });
    } catch (error) {
      logger.error('Add team member error:', { userId: req.user.userId, teamId: req.params.id, error: error.message });
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to add team member' });
    }
  }

  /**
   * DELETE /api/couriers/teams/:id/members/:courierUserId
   * Remove a member from a team
   */
  async removeTeamMember(req, res) {
    try {
      const { courierUserId } = req.params;
      const requesterUserId = req.user.userId;
      
      await courierTeamService.removeMember(courierUserId, requesterUserId);
      res.json({ success: true, message: 'Member removed from team' });
    } catch (error) {
      logger.error('Remove team member error:', { userId: req.user.userId, courierUserId: req.params.courierUserId, error: error.message });
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to remove team member' });
    }
  }

  /**
   * GET /api/couriers/teams/:id
   * Get team with members and stats
   */
  async getTeam(req, res) {
    try {
      const { id: teamId } = req.params;
      const team = await courierTeamService.getTeamWithStats(parseInt(teamId));
      res.json({ success: true, team });
    } catch (error) {
      logger.error('Get team error:', { userId: req.user.userId, teamId: req.params.id, error: error.message });
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ error: error.message || 'Failed to get team' });
    }
  }

  /**
   * GET /api/couriers/me/team
   * Get current user's team info
   */
  async getMyTeam(req, res) {
    try {
      const userId = req.user.userId;
      const team = await courierTeamService.getCourierTeamInfo(userId);
      res.json({ success: true, team });
    } catch (error) {
      logger.error('Get my team error:', { userId: req.user.userId, error: error.message });
      res.status(500).json({ error: error.message || 'Failed to get team info' });
    }
  }

  /**
   * GET /api/couriers/directory
   * Get public courier directory (paginated, filterable)
   */
  async getDirectory(req, res) {
    try {
      const { page = 1, limit = 20, tier, city, country } = req.query;
      
      const result = await require('../repositories/courierCareerRepository').getPublicDirectory({
        page: parseInt(page),
        limit: Math.min(parseInt(limit), 100),
        tier,
        city,
        country
      });
      
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Get courier directory error:', { error: error.message });
      res.status(500).json({ error: 'Failed to get courier directory' });
    }
  }

  /**
   * POST /api/couriers/recalculate-tier (admin only)
   * Manually trigger tier recalculation for a courier
   */
  async recalculateTier(req, res) {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }
      
      const result = await tierService.recalculateTier(userId);
      res.json({ success: true, ...result });
    } catch (error) {
      logger.error('Manual tier recalculation error:', { userId: req.user.userId, error: error.message });
      res.status(500).json({ error: error.message || 'Failed to recalculate tier' });
    }
  }
}

module.exports = new CourierCareerController();