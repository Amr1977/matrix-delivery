const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
// const googleMapsService = require('../services/googleMapsService');
const { apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../config/logger');
const { createNotification } = require('../services/notificationService'); // Import from notification service

// Environment is already loaded by server.js or jest.setup.js
// No need to call dotenv.config() here



// Start tracking for a specific order
router.post('/tracking/:orderId/start', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.userId;

    // Check if driver is assigned to this order
    const orderCheck = await pool.query(
      'SELECT id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.assigned_driver_user_id !== driverId) {
      return res.status(403).json({ error: 'Driver not assigned to this order' });
    }

    // Update order tracking status
    await pool.query(
      'UPDATE orders SET current_tracking_status = $1 WHERE id = $2',
      ['in_progress', orderId]
    );

    logger.info(`Driver tracking started`, {
      driverId,
      orderId,
      category: 'tracking'
    });

    res.json({
      success: true,
      message: 'Tracking started successfully',
      orderId,
      trackingStatus: 'in_progress'
    });

  } catch (error) {
    logger.error(`Start tracking error: ${error.message}`, {
      driverId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to start tracking' });
  }
});

// Stop tracking for a specific order
router.post('/tracking/:orderId/stop', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.userId;

    // Verify driver permission
    const orderCheck = await pool.query(
      'SELECT id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.assigned_driver_user_id !== driverId) {
      return res.status(403).json({ error: 'Driver not assigned to this order' });
    }

    // Mark existing locations for this order and driver as completed
    await pool.query(
      'UPDATE driver_locations SET status = $1 WHERE driver_id = $2 AND order_id = $3 AND status = $4',
      ['ended', driverId, orderId, 'active']
    );

    // Update order tracking status
    await pool.query(
      'UPDATE orders SET current_tracking_status = $1 WHERE id = $2',
      ['completed', orderId]
    );

    logger.info(`Driver tracking stopped`, {
      driverId,
      orderId,
      category: 'tracking'
    });

    res.json({
      success: true,
      message: 'Tracking stopped successfully',
      orderId,
      trackingStatus: 'completed'
    });

  } catch (error) {
    logger.error(`Stop tracking error: ${error.message}`, {
      driverId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to stop tracking' });
  }
});

// Get tracking status for an order (used by customers and drivers)
router.get('/tracking/:orderId/status', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.primary_role || req.user.role;

    // Check if user has permission to view this order
    const orderCheck = await pool.query(
      'SELECT id, customer_id, assigned_driver_user_id, current_tracking_status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.customer_id !== userId && order.assigned_driver_user_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this order tracking' });
    }

    // Get latest location for this order
    const latestLocation = await pool.query(
      `SELECT dl.latitude, dl.longitude, dl.timestamp, dl.heading, dl.speed_kmh, dl.accuracy_meters,
              dl.status as location_status
       FROM driver_locations dl
       WHERE dl.driver_id = $1 AND dl.order_id = $2 AND dl.status = 'active'
       ORDER BY dl.timestamp DESC LIMIT 1`,
      [order.assigned_driver_user_id, orderId]
    );

    res.json({
      orderId,
      trackingStatus: order.current_tracking_status || 'not_started',
      currentLocation: latestLocation.rows.length > 0 ? {
        latitude: parseFloat(latestLocation.rows[0].latitude),
        longitude: parseFloat(latestLocation.rows[0].longitude),
        timestamp: latestLocation.rows[0].timestamp,
        heading: latestLocation.rows[0].heading,
        speedKmh: latestLocation.rows[0].speed_kmh,
        accuracyMeters: latestLocation.rows[0].accuracy_meters,
        status: latestLocation.rows[0].location_status
      } : null
    });

  } catch (error) {
    logger.error(`Get tracking status error: ${error.message}`, {
      userId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get tracking status' });
  }
});

// Update driver online/offline status
router.post('/status', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const { isOnline } = req.body;

    if (typeof isOnline !== 'boolean') {
      return res.status(400).json({ error: 'isOnline must be a boolean value' });
    }

    // For now, we'll store this in memory. In a production app, you'd save this to the database
    // and potentially use Redis for quick access to online drivers

    logger.info(`Driver status updated`, {
      userId: req.user.userId,
      isOnline: isOnline,
      category: 'driver'
    });

    res.json({
      success: true,
      message: `Driver ${isOnline ? 'went online' : 'went offline'}`,
      isOnline: isOnline
    });

  } catch (error) {
    logger.error(`Driver status update error: ${error.message}`, {
      userId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to update driver status' });
  }
});

// Update driver location for specific order (live tracking)
router.post('/location/:orderId', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { latitude, longitude, heading, speedKmh, accuracyMeters } = req.body;
    const driverId = req.user.userId;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude must be numbers' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }

    // Check if driver is assigned to this order and tracking is active
    const orderCheck = await pool.query(
      'SELECT id, assigned_driver_user_id, current_tracking_status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.assigned_driver_user_id !== driverId) {
      return res.status(403).json({ error: 'Driver not assigned to this order' });
    }

    if (order.current_tracking_status !== 'in_progress') {
      return res.status(400).json({ error: 'Tracking is not active for this order' });
    }

    // Insert location record into database
    const result = await pool.query(
      `INSERT INTO driver_locations
       (driver_id, order_id, latitude, longitude, heading, speed_kmh, accuracy_meters, timestamp, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'active')
       RETURNING id, timestamp`,
      [
        driverId,
        orderId,
        parseFloat(latitude.toFixed(8)),
        parseFloat(longitude.toFixed(8)),
        heading ? parseFloat(heading) : null,
        speedKmh ? parseFloat(speedKmh) : null,
        accuracyMeters ? parseFloat(accuracyMeters) : null
      ]
    );

    const locationData = result.rows[0];

    // Emit real-time location update to all clients tracking this order
    try {
      if (global.io) { // Access io from global scope
        global.io.to(`order_${orderId}`).emit('location_update', {
          orderId,
          latitude: parseFloat(latitude.toFixed(8)),
          longitude: parseFloat(longitude.toFixed(8)),
          timestamp: locationData.timestamp,
          heading,
          speedKmh,
          accuracyMeters
        });
        logger.info(`Real-time location update sent to clients`, {
          orderId,
          latitude: parseFloat(latitude.toFixed(8)),
          longitude: parseFloat(longitude.toFixed(8)),
          category: 'socket'
        });
      }
    } catch (socketError) {
      logger.warn(`Socket emit error (non-critical): ${socketError.message}`, {
        orderId,
        category: 'socket'
      });
    }

    logger.info(`Driver location updated for tracking`, {
      driverId,
      orderId,
      latitude: parseFloat(latitude.toFixed(8)),
      longitude: parseFloat(longitude.toFixed(8)),
      category: 'tracking'
    });

    res.json({
      success: true,
      location: {
        id: locationData.id,
        latitude: parseFloat(latitude.toFixed(8)),
        longitude: parseFloat(longitude.toFixed(8)),
        timestamp: locationData.timestamp,
        heading,
        speedKmh,
        accuracyMeters
      },
      message: 'Location updated successfully'
    });

  } catch (error) {
    logger.error(`Driver location update error: ${error.message}`, {
      driverId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to update location' });
  }
});

// Get driver location
router.get('/location', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    // For now, return a default response. In a production app, you'd fetch from database
    const location = {
      latitude: null,
      longitude: null,
      lastUpdated: null
    };

    res.json({
      location,
      message: 'Location retrieved successfully'
    });

  } catch (error) {
    logger.error(`Get driver location error: ${error.message}`, {
      userId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get location' });
  }
});

// Update driver location for bidding (not tied to specific order)
router.post('/location/bidding', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const driverId = req.user.userId;
    const { latitude, longitude, heading, speed, accuracy } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Insert location update
    await pool.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude, heading, speed_kmh, accuracy_meters, context, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [driverId, latitude, longitude, heading || null, speed || null, accuracy || null, 'bidding']
    );

    logger.info(`Driver location updated (bidding)`, {
      driverId,
      latitude,
      longitude,
      category: 'location'
    });

    res.json({
      success: true,
      message: 'Location updated successfully'
    });

  } catch (error) {
    logger.error(`Update bidding location error: ${error.message}`, {
      driverId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to update location' });
  }
});

// Get driver's current location by driver ID
router.get('/location/bidding/:driverId', verifyToken, async (req, res) => {
  try {
    const { driverId } = req.params;

    // Get most recent location (within last 5 minutes)
    const result = await pool.query(
      `SELECT latitude, longitude, heading, speed_kmh, accuracy_meters, timestamp
       FROM driver_locations
       WHERE driver_id = $1
       AND timestamp > NOW() - INTERVAL '5 minutes'
       ORDER BY timestamp DESC
       LIMIT 1`,
      [driverId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No recent location found' });
    }

    res.json({
      success: true,
      location: result.rows[0]
    });

  } catch (error) {
    logger.error(`Get driver location error: ${error.message}`, {
      driverId: req.params.driverId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get location' });
  }
});

// Get locations of all drivers who have bid on an order
router.get('/location/order/:orderId/bidders', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;

    // Check if user has permission to view this order
    const orderCheck = await pool.query(
      'SELECT id, customer_id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];

    // Only customer or assigned driver can view bidder locations
    if (order.customer_id !== userId && order.assigned_driver_user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all bidders' locations
    const result = await pool.query(
      `SELECT 
        b.driver_id,
        b.driver_name,
        b.bid_price,
        dl.latitude,
        dl.longitude,
        dl.heading,
        dl.speed_kmh,
        dl.accuracy_meters,
        dl.timestamp
      FROM bids b
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations
        WHERE driver_id = b.driver_id
        ORDER BY timestamp DESC
        LIMIT 1
      ) dl ON true
      WHERE b.order_id = $1
      AND dl.timestamp > NOW() - INTERVAL '5 minutes'
      ORDER BY b.created_at DESC`,
      [orderId]
    );

    res.json({
      success: true,
      locations: result.rows
    });

  } catch (error) {
    logger.error(`Get bidders locations error: ${error.message}`, {
      orderId: req.params.orderId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get locations' });
  }
});

// Get driver earnings statistics
router.get('/earnings/stats', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    const driverId = req.user.userId;
    const now = new Date();

    // Optional date range filtering
    const { startDate, endDate } = req.query;
    const hasDateFilter = startDate && endDate;

    // Calculate start of today, week, and month
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start of week
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Helper to get earnings sum with optional end date
    const getEarningsSum = async (startDateParam, endDateParam = null) => {
      // Try to get from payments table first (more accurate if populated)
      let paymentQuery, paymentParams;
      if (endDateParam) {
        paymentQuery = `SELECT SUM(driver_earnings) as total 
         FROM payments 
         WHERE payee_id = $1 
         AND status = 'completed' 
         AND created_at >= $2 AND created_at <= $3`;
        paymentParams = [driverId, startDateParam, endDateParam];
      } else {
        paymentQuery = `SELECT SUM(driver_earnings) as total 
         FROM payments 
         WHERE payee_id = $1 
         AND status = 'completed' 
         AND created_at >= $2`;
        paymentParams = [driverId, startDateParam];
      }

      const paymentResult = await pool.query(paymentQuery, paymentParams);

      if (paymentResult.rows[0].total !== null) {
        return parseFloat(paymentResult.rows[0].total);
      }

      // Fallback to orders price/bids if payments table not fully utilized yet
      let orderQuery, orderParams;
      if (endDateParam) {
        orderQuery = `SELECT SUM(COALESCE(assigned_driver_bid_price, price)) as total
         FROM orders
         WHERE assigned_driver_user_id = $1
         AND status = 'delivered'
         AND delivered_at >= $2 AND delivered_at <= $3`;
        orderParams = [driverId, startDateParam, endDateParam];
      } else {
        orderQuery = `SELECT SUM(COALESCE(assigned_driver_bid_price, price)) as total
         FROM orders
         WHERE assigned_driver_user_id = $1
         AND status = 'delivered'
         AND delivered_at >= $2`;
        orderParams = [driverId, startDateParam];
      }

      const orderResult = await pool.query(orderQuery, orderParams);

      return parseFloat(orderResult.rows[0].total) || 0;
    };

    // If date filter is provided, use it; otherwise use default periods
    let todayEarnings, weekEarnings, monthEarnings;

    if (hasDateFilter) {
      const filterStart = new Date(startDate);
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);

      // When filtering, all three stats show the same filtered range
      const filteredEarnings = await getEarningsSum(filterStart, filterEnd);
      todayEarnings = filteredEarnings;
      weekEarnings = filteredEarnings;
      monthEarnings = filteredEarnings;
    } else {
      [todayEarnings, weekEarnings, monthEarnings] = await Promise.all([
        getEarningsSum(startOfDay),
        getEarningsSum(startOfWeek),
        getEarningsSum(startOfMonth)
      ]);
    }

    // Get earnings for last 7 days for the chart
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      // We need a specific query for this day range
      const dayResult = await pool.query(
        `SELECT SUM(COALESCE(assigned_driver_bid_price, price)) as total
         FROM orders
         WHERE assigned_driver_user_id = $1
         AND status = 'delivered'
         AND delivered_at >= $2 AND delivered_at <= $3`,
        [driverId, dayStart, dayEnd]
      );

      last7Days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullDate: d.toISOString().split('T')[0],
        amount: parseFloat(dayResult.rows[0].total) || 0
      });
    }

    res.json({
      today: todayEarnings,
      week: weekEarnings,
      month: monthEarnings,
      chartData: last7Days
    });

  } catch (error) {
    logger.error(`Get earnings stats error: ${error.message}`, {
      driverId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get earnings stats' });
  }
});

// Get driver earnings history (paginated orders)
router.get('/earnings/history', verifyToken, requireRole('driver'), async (req, res) => {
  try {
    const driverId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Optional date range filtering
    const { startDate, endDate } = req.query;
    const hasDateFilter = startDate && endDate;

    let countQuery, countParams;
    if (hasDateFilter) {
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);

      countQuery = `SELECT COUNT(*) 
       FROM orders 
       WHERE assigned_driver_user_id = $1 
       AND status = 'delivered'
       AND delivered_at >= $2 AND delivered_at <= $3`;
      countParams = [driverId, new Date(startDate), filterEnd];
    } else {
      countQuery = `SELECT COUNT(*) 
       FROM orders 
       WHERE assigned_driver_user_id = $1 
       AND status = 'delivered'`;
      countParams = [driverId];
    }

    // Get total count
    const countResult = await pool.query(countQuery, countParams);
    const totalOrders = parseInt(countResult.rows[0].count);

    // Get orders with rating
    let ordersQuery, ordersParams;
    if (hasDateFilter) {
      const filterEnd = new Date(endDate);
      filterEnd.setHours(23, 59, 59, 999);

      ordersQuery = `SELECT 
        o.id, 
        o.order_number, 
        o.delivered_at, 
        COALESCE(o.assigned_driver_bid_price, o.price) as amount,
        r.rating as rating
       FROM orders o
       LEFT JOIN reviews r ON o.id = r.order_id AND r.reviewee_id = $1
       WHERE o.assigned_driver_user_id = $1 
       AND o.status = 'delivered'
       AND o.delivered_at >= $2 AND o.delivered_at <= $3
       ORDER BY o.delivered_at DESC
       LIMIT $4 OFFSET $5`;
      ordersParams = [driverId, new Date(startDate), filterEnd, limit, offset];
    } else {
      ordersQuery = `SELECT 
        o.id, 
        o.order_number, 
        o.delivered_at, 
        COALESCE(o.assigned_driver_bid_price, o.price) as amount,
        r.rating as rating
       FROM orders o
       LEFT JOIN reviews r ON o.id = r.order_id AND r.reviewee_id = $1
       WHERE o.assigned_driver_user_id = $1 
       AND o.status = 'delivered'
       ORDER BY o.delivered_at DESC
       LIMIT $2 OFFSET $3`;
      ordersParams = [driverId, limit, offset];
    }

    const ordersResult = await pool.query(ordersQuery, ordersParams);

    res.json({
      orders: ordersResult.rows.map(row => ({
        id: row.id,
        orderNumber: row.order_number,
        date: row.delivered_at,
        amount: parseFloat(row.amount),
        rating: row.rating ? parseInt(row.rating) : null
      })),
      pagination: {
        page,
        limit,
        total: totalOrders,
        totalPages: Math.ceil(totalOrders / limit)
      }
    });

  } catch (error) {
    logger.error(`Get earnings history error: ${error.message}`, {
      driverId: req.user.userId,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Failed to get earnings history' });
  }
});

module.exports = router;
