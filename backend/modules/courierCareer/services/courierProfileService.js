const courierCareerRepository = require('../repositories/courierCareerRepository');
const logger = require('../../../config/logger');

class CourierProfileService {
  /**
   * Get public profile for a courier
   * Throws if profile is not public and requester is not owner/admin
   * @param {string} targetUserId - Courier whose profile is requested
   * @param {Object} requester - { userId, primary_role } of the requester
   * @returns {Object} Public profile data
   */
  async getPublicProfile(targetUserId, requester) {
    const profile = await courierCareerRepository.getPublicProfile(targetUserId);
    
    if (!profile) {
      // Check if courier exists but profile is private
      const courier = await courierCareerRepository.getCourierStats(targetUserId);
      if (!courier) {
        const error = new Error('Courier not found');
        error.statusCode = 404;
        throw error;
      }
      
      // Profile exists but is private - check permissions
      const isOwner = requester.userId === targetUserId;
      const isAdmin = requester.primary_role === 'admin';
      
      if (!isOwner && !isAdmin) {
        const error = new Error('Profile is private');
        error.statusCode = 403;
        throw error;
      }
      
      // Owner or admin can see private profile - return full data (but still sanitized)
      return this.sanitizeProfile(courier, true);
    }
    
    // Profile is public - return sanitized public data
    return this.sanitizeProfile(profile, false);
  }

  /**
   * Sanitize profile data - remove PII
   * @param {Object} profile - Raw profile from database
   * @param {boolean} isPrivateAccess - Whether requester has private access (owner/admin)
   * @returns {Object} Sanitized profile
   */
  sanitizeProfile(profile, isPrivateAccess = false) {
    // Base public fields (always safe)
    const publicFields = {
      id: profile.id,
      name: profile.name,
      profile_picture_url: profile.profile_picture_url,
      rating: profile.rating ? parseFloat(profile.rating) : 5.0,
      completed_deliveries: profile.completed_deliveries || 0,
      is_verified: profile.is_verified || false,
      current_tier: profile.current_tier || 'junior',
      tier_updated_at: profile.tier_updated_at,
      tenure_days: profile.created_at 
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      // Location: only city/service_area_zone/country - never exact address/coordinates
      service_area_zone: profile.service_area_zone,
      city: profile.city,
      country: profile.country,
      license_number: profile.license_number, // Professional license is OK to show
      created_at: profile.created_at
    };
    
    // Private access (owner/admin) gets slightly more but still no PII like phone/email/exact address
    if (isPrivateAccess) {
      // No additional fields for now - the public fields are sufficient
      // Could add joined_date, etc. if needed
      return { ...publicFields, is_profile_owner: true };
    }
    
    return publicFields;
  }

  /**
   * Update profile visibility (opt-in/opt-out)
   * @param {string} userId - Courier user ID
   * @param {boolean} isPublic - Whether profile should be public
   * @returns {Object} Updated visibility status
   */
  async updateProfileVisibility(userId, isPublic) {
    const result = await courierCareerRepository.updateProfileVisibility(userId, isPublic);
    
    // Record career event for visibility change
    await courierCareerRepository.recordCareerEvent(userId, 'profile_visibility_changed', {
      is_public: isPublic
    });
    
    logger.info(`Courier profile visibility changed`, {
      userId,
      isPublic,
      category: 'courier_career'
    });
    
    return { is_profile_public: result.is_profile_public };
  }

  /**
   * Get career history (timeline) for a courier
   * @param {string} userId - Courier user ID
   * @param {Object} requester - Requester info for permission check
   * @returns {Array} Career events chronologically
   */
  async getCareerHistory(userId, requester) {
    // Verify access
    const profile = await courierCareerRepository.getCourierStats(userId);
    if (!profile) {
      const error = new Error('Courier not found');
      error.statusCode = 404;
      throw error;
    }
    
    const isPublic = profile.is_profile_public;
    const isOwner = requester.userId === userId;
    const isAdmin = requester.primary_role === 'admin';
    
    if (!isPublic && !isOwner && !isAdmin) {
      const error = new Error('Profile is private');
      error.statusCode = 403;
      throw error;
    }
    
    const events = await courierCareerRepository.getCareerEvents(userId);
    
    // Sanitize events - remove any sensitive data from event_detail
    return events.map(event => ({
      id: event.id,
      event_type: event.event_type,
      event_detail: this.sanitizeEventDetail(event.event_detail),
      occurred_at: event.occurred_at
    }));
  }

  /**
   * Sanitize event detail JSON
   */
  sanitizeEventDetail(detail) {
    if (!detail || typeof detail !== 'object') return detail;
    
    const sanitized = { ...detail };
    // Remove any potentially sensitive fields
    delete sanitized.phone;
    delete sanitized.email;
    delete sanitized.exact_address;
    delete sanitized.coordinates;
    delete sanitized.lat;
    delete sanitized.lng;
    delete sanitized.latitude;
    delete sanitized.longitude;
    
    return sanitized;
  }
}

module.exports = new CourierProfileService();