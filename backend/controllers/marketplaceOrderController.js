const MarketplaceOrderService = require('../services/marketplaceOrderService');
const pool = require('../config/db');
const logger = require('../config/logger');

// Instantiate service
const marketplaceOrderService = new MarketplaceOrderService();

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
      // FSM states are automatically included in order.data.fsm_states if present
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
 * Update order status (vendor actions: accept/reject)
 * PATCH /api/marketplace/orders/:id/status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { action, vendorNotes } = req.body;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required'
      });
    }

    // Get vendor ID from user
    const vendorId = await getVendorIdFromUser(userId);
    if (!vendorId) {
      return res.status(403).json({
        success: false,
        error: 'User is not associated with a vendor account'
      });
    }

    let order;
    switch (action) {
      case 'accept':
        order = await marketplaceOrderService.vendorAcceptOrder(parseInt(id), vendorId);
        break;
      case 'reject':
        order = await marketplaceOrderService.vendorRejectOrder(parseInt(id), vendorId);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid action. Supported actions: accept, reject'
        });
    }

    logger.info(`Order ${action}ed: ${order.order_number}`, {
      orderId: id,
      vendorId,
      action,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: `Order ${action}ed successfully`,
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
 * Customer confirms payment
 * POST /api/marketplace/orders/:id/confirm-payment
 */
const confirmPayment = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { id } = req.params;
    const { paymentReference } = req.body;

    const order = await marketplaceOrderService.customerConfirmPayment(parseInt(id), customerId);

    logger.info(`Payment confirmed for order: ${order.order_number}`, {
      orderId: id,
      customerId,
      paymentReference,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error confirming payment:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
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
 * Admin assigns driver to order
 * POST /api/marketplace/orders/:id/assign-driver
 */
const assignDriver = async (req, res) => {
  try {
    const adminId = req.user.userId;
    const { id } = req.params;
    const { driverId, notes } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        error: 'Driver ID is required'
      });
    }

    // TODO: Verify user has admin role
    // For now, assume the user calling this endpoint is an admin

    const order = await marketplaceOrderService.adminAssignDriver(parseInt(id), adminId, parseInt(driverId));

    logger.info(`Driver assigned to order: ${order.order_number}`, {
      orderId: id,
      adminId,
      assignedDriverId: driverId,
      notes,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error assigning driver:', {
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
 * Driver picks up order
 * POST /api/marketplace/orders/:id/pickup
 */
const pickupOrder = async (req, res) => {
  try {
    const driverId = req.user.userId;
    const { id } = req.params;

    // TODO: Verify user has driver role
    // For now, assume the user calling this endpoint is a driver

    const order = await marketplaceOrderService.driverPickupOrder(parseInt(id), driverId);

    logger.info(`Order picked up: ${order.order_number}`, {
      orderId: id,
      driverId,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: 'Order picked up successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error picking up order:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
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
 * Driver delivers order
 * POST /api/marketplace/orders/:id/deliver
 */
const deliverOrder = async (req, res) => {
  try {
    const driverId = req.user.userId;
    const { id } = req.params;
    const { deliveryNotes } = req.body;

    // TODO: Verify user has driver role
    // For now, assume the user calling this endpoint is a driver

    const order = await marketplaceOrderService.driverDeliverOrder(parseInt(id), driverId);

    logger.info(`Order delivered: ${order.order_number}`, {
      orderId: id,
      driverId,
      deliveryNotes,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: 'Order delivered successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error delivering order:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
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
 * Customer confirms receipt
 * POST /api/marketplace/orders/:id/confirm-receipt
 */
const confirmReceipt = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { id } = req.params;
    const { rating, feedback } = req.body;

    const order = await marketplaceOrderService.customerConfirmReceipt(parseInt(id), customerId);

    logger.info(`Receipt confirmed for order: ${order.order_number}`, {
      orderId: id,
      customerId,
      rating,
      feedback,
      category: 'marketplace_order'
    });

    res.status(200).json({
      success: true,
      message: 'Receipt confirmed successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error confirming receipt:', {
      error: error.message,
      userId: req.user?.userId,
      orderId: req.params.id,
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

module.exports = {
  createOrder,
  getOrder,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  confirmPayment,
  assignDriver,
  pickupOrder,
  deliverOrder,
  confirmReceipt,
  getVendorStats
};
