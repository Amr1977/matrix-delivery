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
      showManualEntry, estimated_delivery_date
    } = req.body;

    const orderData = {
      title, price, description, package_description, package_weight, estimated_value,
      special_instructions, pickupAddress, dropoffAddress, pickupLocation, dropoffLocation,
      showManualEntry, estimated_delivery_date
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
    if ((req.user.primary_role || req.user.primary_role) !== 'driver') {
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

// Accept bid
router.post('/:orderId/accept-bid', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.primary_role) !== 'customer') {
      return res.status(403).json({ error: 'Only customers can accept bids' });
    }

    const driverId = req.body.userId;
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
    res.status(500).json({ error: error.message || 'Failed to accept bid' });
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

    // Return 400 for validation errors
    if (error.message.includes('Order must be in') || error.message.includes('Invalid action') || error.message.includes('Only assigned driver')) {
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
