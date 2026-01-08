const express = require('express');
const orderService = require('../services/orderService');
const { verifyToken, requireRole } = require('../middleware/auth');
const { orderCreationRateLimit, apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../config/logger');

const router = express.Router();

// Routes

// Get orders (filtered by user primary_role and location filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { country, city, area, lat, lng, status } = req.query;
    const filters = { country, city, area };

    logger.info('GET /api/orders request received', {
      userId: req.user?.userId || 'unauthenticated',
      primary_role: req.user?.primary_role || 'unknown',
      query: req.query,
      hasLat: !!req.query.lat,
      hasLng: !!req.query.lng,
      isAuthenticated: !!req.user,
      category: 'orders',
      status: !!req.query.status
    });

    // For drivers, location-based filtering is preferred but no longer mandatory for fetching ASSIGNED orders
    if ((req.user.primary_role || req.user.primary_role) === 'driver') {
      if (!lat || !lng) {
        logger.warn('Driver fetching orders without location - showing only assigned orders', {
          userId: req.user.userId,
          primary_role: (req.user.primary_role || req.user.primary_role),
          category: 'orders'
        });
        // We do NOT return 400 here anymore. We let it pass to the service,
        // which will handle filtering (showing only assigned orders, no pending bids)
      } else {
        filters.driverLat = parseFloat(lat);
        filters.driverLng = parseFloat(lng);
        logger.info('Driver location filter applied', {
          driverLat: filters.driverLat,
          driverLng: filters.driverLng,
          rawLat: lat,
          rawLng: lng,
          userId: req.user.userId,
          category: 'orders'
        });
      }

      // Fetch driver's available cash for cash capacity filtering
      const pool = require('../config/db');
      try {
        const cashResult = await pool.query(
          'SELECT available_cash FROM users WHERE id = $1',
          [req.user.userId]
        );
        if (cashResult.rows.length > 0) {
          filters.driverCash = parseFloat(cashResult.rows[0].available_cash) || 0;
          logger.info('Driver cash balance filter applied', {
            userId: req.user.userId,
            driverCash: filters.driverCash,
            category: 'orders'
          });
        }
      } catch (cashError) {
        logger.warn('Failed to fetch driver cash balance', {
          userId: req.user.userId,
          error: cashError.message,
          category: 'orders'
        });
        // Continue without cash filtering if query fails
      }
    } else {
      // Non-drivers should not provide lat/lng parameters (they don't get filtered)
      if (lat || lng) {
        logger.warn('Non-driver provided lat/lng parameters - ignoring (no filtering applied)', {
          userId: req.user.userId,
          primary_role: (req.user.primary_role || req.user.primary_role),
          lat,
          lng,
          category: 'orders'
        });
      }
    }

    const orders = await orderService.getOrders(req.user.userId, (req.user.primary_role || req.user.primary_role), filters);

    console.log('📦 ORDERS RESPONSE:', {
      userId: req.user.userId,
      primary_role: (req.user.primary_role || req.user.primary_role),
      totalOrders: orders.length,
      pendingBidsOrders: orders.filter(o => o.status === 'pending_bids').length,
      assignedOrders: orders.filter(o => o.assignedDriver).length,
      appliedFilters: filters
    });

    res.json(orders);
  } catch (error) {
    logger.error(`Get orders error: ${error.message}`, {
      userId: req.user.userId,
      primary_role: (req.user.primary_role || req.user.primary_role),
      filters: req.query,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// Get single order by ID (with ownership check)
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Fetch the order
    const order = await orderService.getOrderById(orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 2. Check Ownership (Customer, Assigned Driver, or Admin)
    const userId = req.user.userId;
    const userRole = req.user.primary_role || req.user.role;
    const userRoles = req.user.granted_roles || req.user.roles || [];
    const isAdmin = userRole === 'admin' || (Array.isArray(userRoles) && userRoles.includes('admin'));

    const isCustomer = order.customer_id === userId;
    const isAssignedDriver = order.assigned_driver_user_id === userId;

    // Allow if: Admin, Customer (Owner), or Assigned Driver
    if (!isAdmin && !isCustomer && !isAssignedDriver) {
      logger.security('IDOR attempt blocked: User tried to access order they do not own', {
        userId,
        orderId,
        userRole,
        category: 'security'
      });
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this order' });
    }

    res.json(order);
  } catch (error) {
    logger.error(`Get order error: ${error.message}`, {
      userId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to fetch order' });
  }
});

// Create new order
router.post('/', verifyToken, orderCreationRateLimit, async (req, res, next) => {
  try {
    if (!['customer', 'admin'].includes(req.user.primary_role)) {
      return res.status(403).json({ error: 'Only customers and admins can create orders' });
    }

    // Explicitly select allowed fields to prevent mass assignment
    const {
      title, price, description, package_description, package_weight, estimated_value,
      special_instructions, pickupAddress, dropoffAddress, pickupLocation, dropoffLocation,
      showManualEntry, estimated_delivery_date,
      upfront_payment, require_upfront_payment // Added fields
    } = req.body;

    const orderData = {
      title, price, description, package_description, package_weight, estimated_value,
      special_instructions, pickupAddress, dropoffAddress, pickupLocation, dropoffLocation,
      showManualEntry, estimated_delivery_date,
      upfront_payment, require_upfront_payment // Added fields
    };

    const order = await orderService.createOrder(orderData, req.user.userId, req.user.name);
    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
});

// Place bid on order
router.post('/:orderId/bid', verifyToken, async (req, res) => {
  try {
    const userRole = req.user.primary_role;
    if (userRole !== 'driver') {
      return res.status(400).json({ error: 'Only drivers can place bids' });
    }

    const result = await orderService.placeBid(req.params.orderId, req.user.userId, req.body);
    res.json(result);
  } catch (error) {
    logger.error(`Bid placement error: ${error.message}`, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      category: 'error'
    });

    // Return 400 for business logic errors (order not available, already bid, etc.)
    if (error.message.includes('not available for bidding') ||
      error.message.includes('already placed a bid') ||
      error.message === 'Order not found') {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to place bid' });
  }
});

// Modify bid
router.put('/:orderId/bid', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.primary_role) !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can modify bids' });
    }

    const result = await orderService.modifyBid(req.params.orderId, req.user.userId, req.body);
    res.json(result);
  } catch (error) {
    logger.error(`Bid modification error: ${error.message}`, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to modify bid' });
  }
});

// Withdraw bid
router.delete('/:orderId/bid', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.primary_role) !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can withdraw bids' });
    }

    const result = await orderService.withdrawBid(req.params.orderId, req.user.userId);
    res.json(result);
  } catch (error) {
    logger.error(`Bid withdrawal error: ${error.message}`, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      category: 'error'
    });

    // Handle specific error messages
    if (error.message === 'Order not found' || error.message === 'Bid not found for this driver') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Cannot withdraw bid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to withdraw bid' });
  }
});

// Withdraw from accepted order (Driver)
router.post('/:orderId/withdraw', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.primary_role) !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can withdraw from orders' });
    }

    const result = await orderService.withdrawOrder(req.params.orderId, req.user.userId);
    res.json(result);
  } catch (error) {
    logger.error(`Order withdrawal error: ${error.message}`, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      category: 'error'
    });

    if (error.message === 'Order not found') {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Unauthorized') || error.message.includes('Only assigned driver')) {
      return res.status(403).json({ error: error.message });
    }
    if (error.message.includes('Cannot withdraw')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to withdraw from order' });
  }
});

// Accept bid
router.post('/:orderId/accept-bid', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.primary_role) !== 'customer') {
      return res.status(403).json({ error: 'Only customers can accept bids' });
    }

    const driverId = req.body.driverId || req.body.userId;
    if (!driverId) {
      return res.status(400).json({ error: 'Invalid driver ID' });
    }

    const result = await orderService.acceptBid(req.params.orderId, req.user.userId, driverId);
    res.json(result);
  } catch (error) {
    logger.error(`Bid acceptance error: ${error.message}`, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      category: 'error'
    });

    // Return 400 for business logic/validation errors
    if (error.message.includes('not available for bid acceptance') ||
      error.message.includes('Unauthorized') ||
      error.message.includes('not found') ||
      error.message.includes('Bid not found') ||
      error.message.includes('cannot accept')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to accept bid' });
  }
});

// Update order status via PATCH (explicit status update)
router.patch('/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Map status to action for orderService
    const actionMap = {
      'picked_up': 'pickup',
      'in_transit': 'in-transit',
      'delivered': 'complete',
      'delivered_pending': 'complete'
    };

    const action = actionMap[status] || status;
    const result = await orderService.updateOrderStatus(req.params.orderId, req.user.userId, action);
    res.json(result);
  } catch (error) {
    logger.error(`Order status update error (PATCH): ${error.message}`, {
      orderId: req.params.orderId,
      status: req.body.status,
      userId: req.user.userId,
      category: 'error'
    });

    // Return 404 for not found errors
    if (error.message === 'Order not found') {
      return res.status(404).json({ error: error.message });
    }

    // Return 403 for authorization errors
    if (error.message.includes('Only assigned driver') ||
      error.message.includes('Only customer can confirm')) {
      return res.status(403).json({ error: error.message });
    }

    // Return 400 for validation errors
    if (error.message.includes('Order must be in') || error.message.includes('Invalid action')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
});

// Submit review for order
router.post('/:orderId/review', verifyToken, async (req, res) => {
  try {
    const result = await orderService.submitReview(req.params.orderId, req.user.userId, req.body);
    res.json(result);
  } catch (error) {
    logger.error(`Review submission error: ${error.message}`, {
      orderId: req.params.orderId,
      userId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to submit review' });
  }
});

// Update order status (pickup, in-transit, complete)
router.post('/:orderId/:action', verifyToken, async (req, res) => {
  try {
    const result = await orderService.updateOrderStatus(req.params.orderId, req.user.userId, req.params.action);
    res.json(result);
  } catch (error) {
    logger.error(`Order status update error: ${error.message}`, {
      orderId: req.params.orderId,
      action: req.params.action,
      userId: req.user.userId,
      category: 'error'
    });

    // Return 404 for not found errors
    if (error.message === 'Order not found') {
      return res.status(404).json({ error: error.message });
    }

    // Return 403 for authorization errors
    if (error.message.includes('Only assigned driver') ||
      error.message.includes('Only customer can confirm')) {
      return res.status(403).json({ error: error.message });
    }

    // Return 400 for validation errors
    if (error.message.includes('Order must be in') || error.message.includes('Invalid action')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to update order status' });
  }
});

// Get order reviews
router.get('/:orderId/reviews', verifyToken, async (req, res) => {
  try {
    const reviews = await orderService.getOrderReviews(req.params.orderId);
    res.json(reviews);
  } catch (error) {
    logger.error(`Get order reviews error: ${error.message}`, {
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get reviews' });
  }
});

module.exports = router;
