const offerRepository = require('./offerRepository');
const pool = require('../config/db');
const logger = require('../config/logger');

class OfferService {
  /**
   * Create a new offer
   */
  async createOffer(vendorId, offerData) {
    try {
      const {
        item_id,
        title,
        description,
        discount_type,
        discount_value,
        start_date,
        end_date
      } = offerData;

      // Validate required fields
      if (!item_id || !title || !discount_type || discount_value === undefined) {
        throw new Error('Missing required fields: item_id, title, discount_type, discount_value');
      }

      // Validate discount type
      if (!['percentage', 'fixed'].includes(discount_type)) {
        throw new Error('Invalid discount_type. Must be "percentage" or "fixed"');
      }

      // Validate discount value
      if (discount_value <= 0) {
        throw new Error('Discount value must be greater than 0');
      }

      // For percentage discounts, ensure it's not over 100%
      if (discount_type === 'percentage' && discount_value > 100) {
        throw new Error('Percentage discount cannot exceed 100%');
      }

      // Validate dates
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const now = new Date();

      if (startDate >= endDate) {
        throw new Error('Start date must be before end date');
      }

      if (endDate <= now) {
        throw new Error('End date must be in the future');
      }

      // Verify item exists and belongs to vendor's store
      const itemCheck = await pool.query(`
        SELECT i.*, s.vendor_id
        FROM items i
        JOIN stores s ON i.store_id = s.id
        WHERE i.id = $1
      `, [item_id]);

      if (itemCheck.rows.length === 0) {
        throw new Error('Item not found');
      }

      const item = itemCheck.rows[0];
      if (item.vendor_id !== vendorId) {
        throw new Error('Access denied: Item does not belong to your store');
      }

      // For fixed discounts, ensure discount doesn't exceed item price
      if (discount_type === 'fixed' && discount_value >= item.price) {
        throw new Error('Fixed discount cannot be greater than or equal to item price');
      }

      // Check for conflicting active offers on the same item
      const existingOffers = await offerRepository.getActiveOffersByItem(item_id);
      const hasConflict = existingOffers.some(offer => {
        const offerStart = new Date(offer.start_date);
        const offerEnd = new Date(offer.end_date);
        return (startDate < offerEnd && endDate > offerStart); // Overlapping date ranges
      });

      if (hasConflict) {
        throw new Error('Item already has an active offer during the specified date range');
      }

      const offerPayload = {
        item_id,
        title,
        description,
        discount_type,
        discount_value,
        start_date: startDate,
        end_date: endDate,
        status: true
      };

      const offer = await offerRepository.createOffer(offerPayload);

      logger.info(`Offer created: ${offer.id} for item ${item_id} by vendor ${vendorId}`);
      return offer;
    } catch (error) {
      logger.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Get offer by ID
   */
  async getOfferById(id, vendorId = null) {
    try {
      const offer = await offerRepository.getOfferById(id);

      if (!offer) {
        throw new Error('Offer not found');
      }

      // If vendorId provided, check if offer belongs to vendor's store
      if (vendorId) {
        const itemCheck = await pool.query(`
          SELECT s.vendor_id
          FROM items i
          JOIN stores s ON i.store_id = s.id
          WHERE i.id = $1
        `, [offer.item_id]);

        if (itemCheck.rows.length === 0 || itemCheck.rows[0].vendor_id !== vendorId) {
          throw new Error('Access denied: Offer does not belong to your store');
        }
      }

      return offer;
    } catch (error) {
      logger.error('Error getting offer by ID:', error);
      throw error;
    }
  }

  /**
   * Update offer
   */
  async updateOffer(id, vendorId, updateData) {
    try {
      // First verify ownership
      const existingOffer = await this.getOfferById(id, vendorId);

      const allowedUpdates = ['title', 'description', 'discount_type', 'discount_value', 'start_date', 'end_date', 'status'];

      // Validate updates
      if (updateData.discount_type && !['percentage', 'fixed'].includes(updateData.discount_type)) {
        throw new Error('Invalid discount_type. Must be "percentage" or "fixed"');
      }

      if (updateData.discount_value !== undefined && updateData.discount_value <= 0) {
        throw new Error('Discount value must be greater than 0');
      }

      // Validate dates if being updated
      if (updateData.start_date || updateData.end_date) {
        const startDate = new Date(updateData.start_date || existingOffer.start_date);
        const endDate = new Date(updateData.end_date || existingOffer.end_date);

        if (startDate >= endDate) {
          throw new Error('Start date must be before end date');
        }

        const now = new Date();
        if (endDate <= now) {
          throw new Error('End date must be in the future');
        }
      }

      // Validate discount value against item price for fixed discounts
      if (updateData.discount_type === 'fixed' || (existingOffer.discount_type === 'fixed' && updateData.discount_value !== undefined)) {
        const discountValue = updateData.discount_value !== undefined ? updateData.discount_value : existingOffer.discount_value;
        if (discountValue >= existingOffer.original_price) {
          throw new Error('Fixed discount cannot be greater than or equal to item price');
        }
      }

      // For percentage discounts, ensure it's not over 100%
      if (updateData.discount_type === 'percentage' || (existingOffer.discount_type === 'percentage' && updateData.discount_value !== undefined)) {
        const discountValue = updateData.discount_value !== undefined ? updateData.discount_value : existingOffer.discount_value;
        if (discountValue > 100) {
          throw new Error('Percentage discount cannot exceed 100%');
        }
      }

      const filteredUpdates = {};
      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          filteredUpdates[key] = updateData[key];
        }
      });

      if (Object.keys(filteredUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const updatedOffer = await offerRepository.updateOffer(id, filteredUpdates);

      logger.info(`Offer updated: ${id} by vendor ${vendorId}`);
      return updatedOffer;
    } catch (error) {
      logger.error('Error updating offer:', error);
      throw error;
    }
  }

  /**
   * Deactivate offer
   */
  async deactivateOffer(id, vendorId) {
    try {
      // Verify ownership first
      await this.getOfferById(id, vendorId);

      const updatedOffer = await offerRepository.updateOffer(id, { status: false });

      logger.info(`Offer deactivated: ${id} by vendor ${vendorId}`);
      return updatedOffer;
    } catch (error) {
      logger.error('Error deactivating offer:', error);
      throw error;
    }
  }

  /**
   * Delete offer
   */
  async deleteOffer(id, vendorId) {
    try {
      // Verify ownership first
      await this.getOfferById(id, vendorId);

      const deletedOffer = await offerRepository.deleteOffer(id);

      logger.info(`Offer deleted: ${id} by vendor ${vendorId}`);
      return deletedOffer;
    } catch (error) {
      logger.error('Error deleting offer:', error);
      throw error;
    }
  }

  /**
   * Get active offers for a specific item
   */
  async getActiveOffersByItem(itemId) {
    try {
      return await offerRepository.getActiveOffersByItem(itemId);
    } catch (error) {
      logger.error('Error getting active offers by item:', error);
      throw error;
    }
  }

  /**
   * Get all offers for a specific item (including inactive)
   */
  async getOffersByItem(itemId, vendorId, limit = 50, offset = 0) {
    try {
      // Verify vendor owns the item
      const itemCheck = await pool.query(`
        SELECT s.vendor_id
        FROM items i
        JOIN stores s ON i.store_id = s.id
        WHERE i.id = $1
      `, [itemId]);

      if (itemCheck.rows.length === 0) {
        throw new Error('Item not found');
      }

      if (itemCheck.rows[0].vendor_id !== vendorId) {
        throw new Error('Access denied: Item does not belong to your store');
      }

      return await offerRepository.getOffersByItem(itemId, limit, offset);
    } catch (error) {
      logger.error('Error getting offers by item:', error);
      throw error;
    }
  }

  /**
   * Get all offers for a vendor's stores (admin/vendor view)
   */
  async getOffersByVendor(vendorId, limit = 50, offset = 0, filters = {}) {
    try {
      const queryFilters = { ...filters };

      // Get all items belonging to vendor's stores
      const itemsQuery = await pool.query(`
        SELECT i.id
        FROM items i
        JOIN stores s ON i.store_id = s.id
        WHERE s.vendor_id = $1
      `, [vendorId]);

      const itemIds = itemsQuery.rows.map(row => row.id);

      if (itemIds.length === 0) {
        return [];
      }

      // Build filters for offers query
      const offersFilters = {};
      if (filters.status !== undefined) {
        offersFilters.status = filters.status;
      }
      if (filters.discount_type) {
        offersFilters.discount_type = filters.discount_type;
      }

      // Get offers for all vendor's items
      const allOffers = [];
      for (const itemId of itemIds) {
        const offers = await offerRepository.getOffersByItem(itemId, limit, offset);
        allOffers.push(...offers);
      }

      // Apply filters
      let filteredOffers = allOffers;
      if (offersFilters.status !== undefined) {
        filteredOffers = filteredOffers.filter(offer => offer.status === offersFilters.status);
      }
      if (offersFilters.discount_type) {
        filteredOffers = filteredOffers.filter(offer => offer.discount_type === offersFilters.discount_type);
      }

      // Sort by created date (most recent first) and apply pagination
      filteredOffers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      const startIndex = offset;
      const endIndex = startIndex + limit;
      return filteredOffers.slice(startIndex, endIndex);
    } catch (error) {
      logger.error('Error getting offers by vendor:', error);
      throw error;
    }
  }

  /**
   * Calculate discounted price for an item
   */
  calculateDiscountedPrice(originalPrice, offer) {
    if (!offer || !offer.status) {
      return originalPrice;
    }

    const now = new Date();
    const startDate = new Date(offer.start_date);
    const endDate = new Date(offer.end_date);

    if (now < startDate || now >= endDate) {
      return originalPrice;
    }

    if (offer.discount_type === 'percentage') {
      const discount = (originalPrice * offer.discount_value) / 100;
      return Math.max(0, originalPrice - discount);
    } else if (offer.discount_type === 'fixed') {
      return Math.max(0, originalPrice - offer.discount_value);
    }

    return originalPrice;
  }

  /**
   * Expire offers that have passed their end date
   * This is called by the background job
   */
  async expireOffers() {
    try {
      const expiredOffers = await offerRepository.expireOffers();

      if (expiredOffers.length > 0) {
        logger.info(`Expired ${expiredOffers.length} offers`);
      }

      return expiredOffers;
    } catch (error) {
      logger.error('Error expiring offers:', error);
      throw error;
    }
  }

  /**
   * Get offers expiring soon (for notifications)
   */
  async getExpiringOffers(hoursAhead = 24) {
    try {
      return await offerRepository.getExpiringOffers(hoursAhead);
    } catch (error) {
      logger.error('Error getting expiring offers:', error);
      throw error;
    }
  }
}

module.exports = new OfferService();
