const offerService = require('../services/offerService');
const logger = require('../config/logger');

/**
 * Create a new offer
 * POST /api/offers
 */
const createOffer = async (req, res) => {
  try {
    const vendorId = req.user.userId; // From auth middleware

    const offerData = {
      item_id: req.body.item_id,
      title: req.body.title,
      description: req.body.description,
      discount_type: req.body.discount_type,
      discount_value: req.body.discount_value,
      start_date: req.body.start_date,
      end_date: req.body.end_date
    };

    const offer = await offerService.createOffer(vendorId, offerData);

    logger.info(`Offer created successfully: ${offer.id}`, {
      vendorId,
      itemId: offer.item_id,
      category: 'offer'
    });

    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer
    });
  } catch (error) {
    logger.error('Error creating offer:', {
      error: error.message,
      vendorId: req.user?.userId,
      body: req.body,
      category: 'offer'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get offer by ID
 * GET /api/offers/:id
 */
const getOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.primary_role;
    const grantedRoles = req.user.granted_roles || [];

    // Vendors can only see their own offers, admins can see all
    const vendorId = (userRole === 'admin' || grantedRoles.includes('admin')) ? null : userId;

    const offer = await offerService.getOfferById(id, vendorId);

    res.status(200).json({
      success: true,
      data: offer
    });
  } catch (error) {
    logger.error('Error getting offer:', {
      error: error.message,
      offerId: req.params.id,
      userId: req.user?.userId,
      category: 'offer'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update offer
 * PUT /api/offers/:id
 */
const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.userId;

    const updateData = {
      title: req.body.title,
      description: req.body.description,
      discount_type: req.body.discount_type,
      discount_value: req.body.discount_value,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      status: req.body.status
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const offer = await offerService.updateOffer(id, vendorId, updateData);

    logger.info(`Offer updated successfully: ${id}`, {
      vendorId,
      offerId: id,
      category: 'offer'
    });

    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: offer
    });
  } catch (error) {
    logger.error('Error updating offer:', {
      error: error.message,
      offerId: req.params.id,
      vendorId: req.user?.userId,
      body: req.body,
      category: 'offer'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Delete offer
 * DELETE /api/offers/:id
 */
const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.userId;

    const offer = await offerService.deleteOffer(id, vendorId);

    logger.info(`Offer deleted successfully: ${id}`, {
      vendorId,
      offerId: id,
      category: 'offer'
    });

    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully',
      data: offer
    });
  } catch (error) {
    logger.error('Error deleting offer:', {
      error: error.message,
      offerId: req.params.id,
      vendorId: req.user?.userId,
      category: 'offer'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Deactivate offer
 * POST /api/offers/:id/deactivate
 */
const deactivateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.userId;

    const offer = await offerService.deactivateOffer(id, vendorId);

    logger.info(`Offer deactivated successfully: ${id}`, {
      vendorId,
      offerId: id,
      category: 'offer'
    });

    res.status(200).json({
      success: true,
      message: 'Offer deactivated successfully',
      data: offer
    });
  } catch (error) {
    logger.error('Error deactivating offer:', {
      error: error.message,
      offerId: req.params.id,
      vendorId: req.user?.userId,
      category: 'offer'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get offers for a specific item
 * GET /api/items/:itemId/offers
 */
const getOffersByItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.primary_role;
    const grantedRoles = req.user.granted_roles || [];

    // Vendors can only see offers for their own items, admins can see all
    const vendorId = (userRole === 'admin' || grantedRoles.includes('admin')) ? null : userId;

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    let offers;
    if (vendorId) {
      // Vendor view - only their offers
      offers = await offerService.getOffersByItem(itemId, vendorId, limit, offset);
    } else {
      // Admin view - all offers for the item
      offers = await offerService.getActiveOffersByItem(itemId);
    }

    res.status(200).json({
      success: true,
      data: offers,
      pagination: {
        limit,
        offset,
        count: offers.length
      }
    });
  } catch (error) {
    logger.error('Error getting offers by item:', {
      error: error.message,
      itemId: req.params.itemId,
      userId: req.user?.userId,
      category: 'offer'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get offers for current vendor
 * GET /api/offers
 */
const getVendorOffers = async (req, res) => {
  try {
    const vendorId = req.user.userId;
    const userRole = req.user.primary_role;
    const grantedRoles = req.user.granted_roles || [];

    // Only vendors and admins can access this endpoint
    if (userRole !== 'vendor' && !grantedRoles.includes('vendor') &&
        userRole !== 'admin' && !grantedRoles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: Only vendors can view their offers'
      });
    }

    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const filters = {};
    if (req.query.status !== undefined) {
      filters.status = req.query.status === 'true';
    }
    if (req.query.discount_type) {
      filters.discount_type = req.query.discount_type;
    }

    let offers;
    if (userRole === 'admin' || grantedRoles.includes('admin')) {
      // Admin can see all offers
      offers = await offerService.getAllOffers(limit, offset, filters);
    } else {
      // Vendor can only see their own offers
      offers = await offerService.getOffersByVendor(vendorId, limit, offset, filters);
    }

    res.status(200).json({
      success: true,
      data: offers,
      pagination: {
        limit,
        offset,
        count: offers.length
      }
    });
  } catch (error) {
    logger.error('Error getting vendor offers:', {
      error: error.message,
      vendorId: req.user?.userId,
      category: 'offer'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Calculate discounted price for an item
 * GET /api/offers/calculate-price
 */
const calculateDiscountedPrice = async (req, res) => {
  try {
    const { item_id, offer_id } = req.query;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        error: 'item_id is required'
      });
    }

    // Get item details
    const pool = require('../config/db');
    const itemResult = await pool.query('SELECT * FROM items WHERE id = $1', [item_id]);

    if (itemResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Item not found'
      });
    }

    const item = itemResult.rows[0];
    let discountedPrice = item.price;

    // If specific offer requested, use it
    if (offer_id) {
      const offer = await offerService.getOfferById(offer_id);
      if (offer && offer.item_id == item_id) {
        discountedPrice = offerService.calculateDiscountedPrice(item.price, offer);
      }
    } else {
      // Otherwise, find the best active offer
      const activeOffers = await offerService.getActiveOffersByItem(item_id);
      if (activeOffers.length > 0) {
        // Use the offer with the highest discount
        const bestOffer = activeOffers.reduce((best, current) => {
          const bestDiscount = offerService.calculateDiscountedPrice(item.price, best);
          const currentDiscount = offerService.calculateDiscountedPrice(item.price, current);
          return (item.price - currentDiscount) > (item.price - bestDiscount) ? current : best;
        });
        discountedPrice = offerService.calculateDiscountedPrice(item.price, bestOffer);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        original_price: item.price,
        discounted_price: discountedPrice,
        discount_amount: item.price - discountedPrice,
        discount_percentage: item.price > 0 ? ((item.price - discountedPrice) / item.price * 100) : 0
      }
    });
  } catch (error) {
    logger.error('Error calculating discounted price:', {
      error: error.message,
      itemId: req.query.item_id,
      offerId: req.query.offer_id,
      category: 'offer'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createOffer,
  getOffer,
  updateOffer,
  deleteOffer,
  deactivateOffer,
  getOffersByItem,
  getVendorOffers,
  calculateDiscountedPrice
};
