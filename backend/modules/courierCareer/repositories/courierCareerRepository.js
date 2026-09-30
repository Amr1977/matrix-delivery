const pool = require('../../../config/db');
const logger = require('../../../config/logger');

class CourierCareerRepository {
  /**
   * Get tier rules from database
   */
  async getTierRules() {
    const result = await pool.query(
      `SELECT tier_name, display_order, min_completed_deliveries, min_tenure_days, min_rating, min_team_size
       FROM courier_tier_rules
       ORDER BY display_order`
    );
    return result.rows;
  }

  /**
   * Get a specific tier rule
   */
  async getTierRule(tierName) {
    const result = await pool.query(
      `SELECT * FROM courier_tier_rules WHERE tier_name = $1`,
      [tierName]
    );
    return result.rows[0];
  }

  /**
   * Get courier's current stats and tier
   */
  async getCourierStats(userId) {
    const result = await pool.query(
      `SELECT id, name, primary_role, rating, completed_deliveries, is_verified,
              current_tier, is_profile_public, tier_updated_at, created_at,
              service_area_zone, city, country, profile_picture_url, license_number
       FROM users
       WHERE id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Update courier's tier
   */
  async updateCourierTier(userId, newTier) {
    const result = await pool.query(
      `UPDATE users 
       SET current_tier = $1, tier_updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING current_tier, tier_updated_at`,
      [newTier, userId]
    );
    return result.rows[0];
  }

  /**
   * Record a career event
   */
  async recordCareerEvent(userId, eventType, eventDetail = {}) {
    const result = await pool.query(
      `INSERT INTO courier_career_events (courier_user_id, event_type, event_detail)
       VALUES ($1, $2, $3)
       RETURNING id, courier_user_id, event_type, event_detail, occurred_at`,
      [userId, eventType, JSON.stringify(eventDetail)]
    );
    return result.rows[0];
  }

  /**
   * Get courier's career events (chronological)
   */
  async getCareerEvents(userId, limit = 100) {
    const result = await pool.query(
      `SELECT id, courier_user_id, event_type, event_detail, occurred_at
       FROM courier_career_events
       WHERE courier_user_id = $1
       ORDER BY occurred_at ASC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Get public profile data for a courier
   */
  async getPublicProfile(userId) {
    const result = await pool.query(
      `SELECT id, name, profile_picture_url, rating, completed_deliveries, 
              is_verified, current_tier, tier_updated_at, created_at,
              service_area_zone, city, country, license_number
       FROM users
       WHERE id = $1 AND is_profile_public = true`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Update profile visibility
   */
  async updateProfileVisibility(userId, isPublic) {
    const result = await pool.query(
      `UPDATE users SET is_profile_public = $1 WHERE id = $2 RETURNING is_profile_public`,
      [isPublic, userId]
    );
    return result.rows[0];
  }

  /**
   * Create a courier team
   */
  async createTeam(leaderUserId, name) {
    const result = await pool.query(
      `INSERT INTO courier_teams (leader_user_id, name)
       VALUES ($1, $2)
       RETURNING id, leader_user_id, name, created_at`,
      [leaderUserId, name]
    );
    return result.rows[0];
  }

  /**
   * Get team by leader
   */
  async getTeamByLeader(leaderUserId) {
    const result = await pool.query(
      `SELECT * FROM courier_teams WHERE leader_user_id = $1`,
      [leaderUserId]
    );
    return result.rows[0];
  }

  /**
   * Get team by ID with members
   */
  async getTeamWithMembers(teamId) {
    const teamResult = await pool.query(
      `SELECT * FROM courier_teams WHERE id = $1`,
      [teamId]
    );
    const team = teamResult.rows[0];
    
    if (!team) return null;
    
    const membersResult = await pool.query(
      `SELECT ctm.*, u.name, u.rating, u.completed_deliveries, u.current_tier, u.profile_picture_url
       FROM courier_team_members ctm
       JOIN users u ON u.id = ctm.courier_user_id
       WHERE ctm.team_id = $1
       ORDER BY ctm.joined_at`,
      [teamId]
    );
    
    return { ...team, members: membersResult.rows };
  }

  /**
   * Add member to team
   */
  async addTeamMember(teamId, courierUserId) {
    const result = await pool.query(
      `INSERT INTO courier_team_members (team_id, courier_user_id)
       VALUES ($1, $2)
       RETURNING id, team_id, courier_user_id, joined_at`,
      [teamId, courierUserId]
    );
    return result.rows[0];
  }

  /**
   * Remove member from team
   */
  async removeTeamMember(courierUserId) {
    const result = await pool.query(
      `DELETE FROM courier_team_members WHERE courier_user_id = $1 RETURNING courier_user_id`,
      [courierUserId]
    );
    return result.rows[0];
  }

  /**
   * Get courier's team membership
   */
  async getCourierTeam(courierUserId) {
    const result = await pool.query(
      `SELECT ctm.*, ct.name as team_name, ct.leader_user_id
       FROM courier_team_members ctm
       JOIN courier_teams ct ON ct.id = ctm.team_id
       WHERE ctm.courier_user_id = $1`,
      [courierUserId]
    );
    return result.rows[0];
  }

  /**
   * Get team member count
   */
  async getTeamMemberCount(teamId) {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM courier_team_members WHERE team_id = $1`,
      [teamId]
    );
    return parseInt(result.rows[0].count);
  }

  /**
   * Get public courier directory (paginated, filterable)
   */
  async getPublicDirectory({ page = 1, limit = 20, tier, city, country }) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE u.is_profile_public = true AND (u.primary_role = \'driver\' OR \'driver\' = ANY(u.granted_roles))';
    const params = [];
    let paramIndex = 1;

    if (tier) {
      whereClause += ` AND u.current_tier = $${paramIndex}`;
      params.push(tier);
      paramIndex++;
    }
    if (city) {
      whereClause += ` AND u.city ILIKE $${paramIndex}`;
      params.push(`%${city}%`);
      paramIndex++;
    }
    if (country) {
      whereClause += ` AND u.country ILIKE $${paramIndex}`;
      params.push(`%${country}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT u.id, u.name, u.profile_picture_url, u.rating, u.completed_deliveries,
              u.is_verified, u.current_tier, u.tier_updated_at, u.created_at,
              u.service_area_zone, u.city, u.country
       FROM users u
       ${whereClause}
       ORDER BY u.current_tier DESC NULLS LAST, u.rating DESC NULLS LAST, u.completed_deliveries DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return {
      couriers: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all active couriers for tier recalculation (batched)
   */
  async getActiveCouriersBatch(offset, limit) {
    const result = await pool.query(
      `SELECT id, name, rating, completed_deliveries, current_tier, created_at,
              is_available, is_verified, service_area_zone
       FROM users
       WHERE primary_role = 'driver' OR 'driver' = ANY(granted_roles)
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  /**
   * Get total count of active couriers
   */
  async getActiveCouriersCount() {
    const result = await pool.query(
      `SELECT COUNT(*) FROM users 
       WHERE primary_role = 'driver' OR 'driver' = ANY(granted_roles)`
    );
    return parseInt(result.rows[0].count);
  }
}

module.exports = new CourierCareerRepository();