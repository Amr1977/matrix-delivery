const VendorPayoutService = require('../services/vendorPayoutService');
const logger = require('../config/logger');

const vendorPayoutService = new VendorPayoutService();

/**
 * Get payout by ID
 * GET /api/payouts/:id
 */
const getPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const payout = await vendorPayoutService.getPayoutById(parseInt(id));

    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }

    // Check authorization - vendor can see their own payouts, admin can see all
    if (userRole !== 'admin' && payout.vendor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.status(200).json({
      success: true,
      data: payout
    });
  } catch (error) {
    logger.error('Error getting payout:', {
      error: error.message,
      userId: req.user?.userId,
      payoutId: req.params.id,
      category: 'vendor_payout'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get payouts for vendor (vendor endpoint)
 * GET /api/payouts/vendor
 */
const getVendorPayouts = async (req, res) => {
  try {
    const vendorId = req.user.userId; // Assuming vendor user ID maps to vendor ID
    const { status, limit, offset } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const payouts = await vendorPayoutService.getPayoutsByVendor(vendorId, filters);

    res.status(200).json({
      success: true,
      data: payouts,
      meta: {
        filters,
        count: payouts.length
      }
    });
  } catch (error) {
    logger.error('Error getting vendor payouts:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'vendor_payout'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Get all payouts (admin endpoint)
 * GET /api/payouts
 */
const getAllPayouts = async (req, res) => {
  try {
    const { status, vendorId, limit, offset } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (vendorId) filters.vendorId = parseInt(vendorId);
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const payouts = await vendorPayoutService.getAllPayouts(filters);

    res.status(200).json({
      success: true,
      data: payouts,
      meta: {
        filters,
        count: payouts.length
      }
    });
  } catch (error) {
    logger.error('Error getting all payouts:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'vendor_payout'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Update payout method (vendor endpoint)
 * PATCH /api/payouts/:id/method
 */
const updatePayoutMethod = async (req, res) => {
  try {
    const { id } = req.params;
    const { payoutMethod, payoutDetails } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    if (!payoutMethod) {
      return res.status(400).json({
        success: false,
        error: 'Payout method is required'
      });
    }

    // Get payout to check ownership
    const payout = await vendorPayoutService.getPayoutById(parseInt(id));
    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }

    // Check authorization
    if (userRole !== 'admin' && payout.vendor_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const updatedPayout = await vendorPayoutService.updatePayoutMethod(
      parseInt(id),
      payoutMethod,
      payoutDetails
    );

    logger.info(`Payout method updated: ${updatedPayout.payout_number}`, {
      payoutId: id,
      payoutMethod,
      userId,
      category: 'vendor_payout'
    });

    res.status(200).json({
      success: true,
      message: 'Payout method updated successfully',
      data: updatedPayout
    });
  } catch (error) {
    logger.error('Error updating payout method:', {
      error: error.message,
      userId: req.user?.userId,
      payoutId: req.params.id,
      category: 'vendor_payout'
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
 * Process payout (admin endpoint)
 * POST /api/payouts/:id/process
 */
const processPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const payout = await vendorPayoutService.processPayout(parseInt(id), userId);

    logger.info(`Payout processing started: ${payout.payout_number}`, {
      payoutId: id,
      processedBy: userId,
      category: 'vendor_payout'
    });

    res.status(200).json({
      success: true,
      message: 'Payout processing started',
      data: payout
    });
  } catch (error) {
    logger.error('Error processing payout:', {
      error: error.message,
      userId: req.user?.userId,
      payoutId: req.params.id,
      category: 'vendor_payout'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Complete payout (admin endpoint)
 * POST /api/payouts/:id/complete
 */
const completePayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { referenceNumber, payoutDetails } = req.body;

    const payout = await vendorPayoutService.completePayout(
      parseInt(id),
      referenceNumber,
      payoutDetails
    );

    logger.info(`Payout completed: ${payout.payout_number}`, {
      payoutId: id,
      referenceNumber,
      payoutAmount: payout.payout_amount,
      category: 'vendor_payout'
    });

    res.status(200).json({
      success: true,
      message: 'Payout completed successfully',
      data: payout
    });
  } catch (error) {
    logger.error('Error completing payout:', {
      error: error.message,
      userId: req.user?.userId,
      payoutId: req.params.id,
      category: 'vendor_payout'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Fail payout (admin endpoint)
 * POST /api/payouts/:id/fail
 */
const failPayout = async (req, res) => {
  try {
    const { id } = req.params;
    const { failureReason } = req.body;

    if (!failureReason) {
      return res.status(400).json({
        success: false,
        error: 'Failure reason is required'
      });
    }

    const payout = await vendorPayoutService.failPayout(parseInt(id), failureReason);

    logger.warn(`Payout failed: ${payout.payout_number}`, {
      payoutId: id,
      failureReason,
      category: 'vendor_payout'
    });

    res.status(200).json({
      success: true,
      message: 'Payout marked as failed',
      data: payout
    });
  } catch (error) {
    logger.error('Error failing payout:', {
      error: error.message,
      userId: req.user?.userId,
      payoutId: req.params.id,
      category: 'vendor_payout'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get payout statistics for vendor
 * GET /api/payouts/vendor/stats
 */
const getVendorPayoutStats = async (req, res) => {
  try {
    const vendorId = req.user.userId; // Assuming vendor user ID maps to vendor ID

    const stats = await vendorPayoutService.getPayoutStats(vendorId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting vendor payout stats:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'vendor_payout'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Process pending payouts (admin/system endpoint)
 * POST /api/payouts/process-pending
 */
const processPendingPayouts = async (req, res) => {
  try {
    const { limit } = req.body;
    const maxLimit = limit ? Math.min(parseInt(limit), 50) : 10; // Max 50 at once

    const processedPayouts = await vendorPayoutService.processPendingPayouts(maxLimit);

    logger.info(`Batch processed ${processedPayouts.length} payouts`, {
      userId: req.user?.userId,
      category: 'vendor_payout'
    });

    res.status(200).json({
      success: true,
      message: `Processed ${processedPayouts.length} payouts`,
      data: {
        processedCount: processedPayouts.length,
        payouts: processedPayouts
      }
    });
  } catch (error) {
    logger.error('Error processing pending payouts:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'vendor_payout'
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  getPayout,
  getVendorPayouts,
  getAllPayouts,
  updatePayoutMethod,
  processPayout,
  completePayout,
  failPayout,
  getVendorPayoutStats,
  processPendingPayouts
};
