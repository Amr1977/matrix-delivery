const express = require('express');
const orderService = require('../services/orderService');
const { verifyToken, requireRole } = require('../middleware/auth');
const { orderCreationRateLimit, apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../config/logger');

const router = express.Router();

// Routes

// Get orders (filtered by user role and location filters)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { country, city, area, lat, lng } = req.query;
    const filters = { country, city, area };

    logger.info('GET /api/orders request received', {
      userId: req.user?.userId || 'unauthenticated',
      role: req.user?.role || 'unknown',
      query: req.query,
      hasLat: !!req.query.lat,
      hasLng: !!req.query.lng,
      isAuthenticated: !!req.user,
      category: 'orders'
    });

    // For drivers, location-based filtering is preferred but no longer mandatory for fetching ASSIGNED orders
    if ((req.user.primary_role || req.user.role) === 'driver') {
      if (!lat || !lng) {
        logger.warn('Driver fetching orders without location - showing only assigned orders', {
          userId: req.user.userId,
          role: (req.user.primary_role || req.user.role),
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
          role: (req.user.primary_role || req.user.role),
          lat,
          lng,
          category: 'orders'
        });
      }
    }

    const orders = await orderService.getOrders(req.user.userId, (req.user.primary_role || req.user.role), filters);

    console.log('📦 ORDERS RESPONSE:', {
      userId: req.user.userId,
      role: (req.user.primary_role || req.user.role),
      totalOrders: orders.length,
      pendingBidsOrders: orders.filter(o => o.status === 'pending_bids').length,
      assignedOrders: orders.filter(o => o.assignedDriver).length,
      appliedFilters: filters
    });

    res.json(orders);
  } catch (error) {
    logger.error(`Get orders error: ${error.message}`, {
      userId: req.user.userId,
      role: (req.user.primary_role || req.user.role),
      filters: req.query,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to fetch orders' });
  }
});

// Create new order
router.post('/', verifyToken, orderCreationRateLimit, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.role) !== 'customer' && (req.user.primary_role || req.user.role) !== 'admin') {
      return res.status(403).json({ error: 'Only customers and admins can create orders' });
    }

    const order = await orderService.createOrder(req.body, req.user.userId);
    res.status(201).json(order);
  } catch (error) {
    logger.error(`Order creation error: ${error.message}`, {
      userId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to create order' });
  }
});

// Place bid on order
router.post('/:orderId/bid', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.role) !== 'driver') {
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

// Accept bid
router.post('/:orderId/accept-bid', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || req.user.role) !== 'customer') {
      return res.status(403).json({ error: 'Only customers can accept bids' });
    }

    const driverId = parseInt(req.body.userId, 10);
    if (isNaN(driverId)) {
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
