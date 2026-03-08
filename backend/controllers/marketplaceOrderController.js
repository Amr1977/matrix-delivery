const marketplaceOrderService = require('../services/marketplaceOrderService');
const pool = require('../config/db');
const logger = require('../config/logger');

/**
 * Helper function to get vendor ID from user ID
 * @param {number} userId - User ID
 * @returns {Promise<number|null>} Vendor ID or null
 */
const getVendorIdFromUser = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT id FROM vendors WHERE user_id = $1',
      [userId]
    );
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (error) {
    logger.error('Error getting vendor ID from user:', error);
    return null;
  }
};

/**
 * Create new marketplace order from cart
 * POST /api/marketplace/orders
 */
const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      vendorId, // Optional, will be determined from cart store
      deliveryAddress,
      deliveryLat,
      deliveryLng,
      deliveryInstructions,
      deliveryFee,
      customerNotes
    } = req.body;

    // Validate required fields
    if (!deliveryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Delivery address is required'
      });
    }

    const orderData = {
      vendorId,
      deliveryAddress,
      deliveryLat: deliveryLat ? parseFloat(deliveryLat) : null,
      deliveryLng: deliveryLng ? parseFloat(deliveryLng) : null,
      deliveryInstructions,
      deliveryFee: deliveryFee ? parseFloat(deliveryFee) : 0,
      customerNotes,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const order = await marketplaceOrderService.createOrder(userId, orderData);

    logger.info(`Marketplace order created: ${order.order_number}`, {
      orderId: order.id,
      userId,
      totalAmount: order.total_amount,
      category: 'marketplace_order'
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error creating marketplace order:', {
      error: error.message,
      userId: req.user?.userId,
      body: req.body,
      category: 'marketplace_order'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('validation failed') ? 400 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get order by ID
 * GET /api/marketplace/orders/:id
 */
const getOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const order = await marketplaceOrderService.getOrder(parseInt(id), userId);

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error('Error getting marketplace order:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
      category: 'marketplace_order'
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
 * Get orders for current user
 * GET /api/marketplace/orders
 */
const getOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, limit, offset } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const orders = await marketplaceOrderService.getOrdersForUser(userId, filters);

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    logger.error('Error getting marketplace orders:', {
      error: error.message,
      userId: req.user?.userId,
      query: req.query,
      category: 'marketplace_order'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update order status (vendor only)
 * PATCH /api/marketplace/orders/:id/status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user.userId; // This should be vendor ID for authorization
    const { id } = req.params;
    const { status, vendorNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }

    // In a real implementation, we need to get the vendor ID from the user
    // For now, assuming userId is vendor ID (this would need proper vendor lookup)
    const vendorId = await getVendorIdFromUser(userId);

    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: 'User is not associated with a vendor account'
      });
    }

    const order = await marketplaceOrderService.updateOrderStatus(
      parseInt(id),
      status,
      vendorId,
      { vendorNotes }
    );

    logger.info(`Order status updated: ${order.order_number} to ${status}`, {
      orderId: id,
      vendorId,
      newStatus: status,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: order
    });
  } catch (error) {
    logger.error('Error updating order status:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
      body: req.body,
      category: 'marketplace_order'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 :
                      error.message.includes('Invalid') ? 400 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Cancel order (customer or vendor)
 * POST /api/marketplace/orders/:id/cancel
 */
const cancelOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      });
    }

    const order = await marketplaceOrderService.cancelOrder(parseInt(id), userId, reason);

    logger.info(`Order cancelled: ${order.order_number}`, {
      orderId: id,
      cancelledBy: userId,
      reason,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error cancelling order:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
      body: req.body,
      category: 'marketplace_order'
    });

    const statusCode = error.message.includes('not found') ? 404 :
                      error.message.includes('Access denied') ? 403 :
                      error.message.includes('cannot be cancelled') ? 400 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get vendor order statistics
 * GET /api/marketplace/vendor/stats
 */
const getVendorStats = async (req, res) => {
  try {
    const vendorId = req.user.userId; // TODO: Get vendor ID from user relationship

    const stats = await marketplaceOrderService.getOrderStats(vendorId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting vendor stats:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'marketplace_order'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getOrder,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  getVendorStats
};
