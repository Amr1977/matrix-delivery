const express = require('express');
const { Pool } = require('pg');
const { verifyToken, requireRole } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../logger');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const router = express.Router();

// Start tracking for a specific order
router.post('/tracking/:orderId/start', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const { orderId } = req.params;
    const driverId = req.user.userId;

    // Check if driver is assigned to this order
    const orderCheck = await pool.query(
      'SELECT id, assigned_driver_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.assigned_driver_id !== driverId) {
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
      'SELECT id, assigned_driver_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.assigned_driver_id !== driverId) {
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
    const userRole = req.user.role;

    // Check if user has permission to view this order
    const orderCheck = await pool.query(
      'SELECT id, customer_id, assigned_driver_id, current_tracking_status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.customer_id !== userId && order.assigned_driver_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this order tracking' });
    }

    // Get latest location for this order
    const latestLocation = await pool.query(
      `SELECT dl.latitude, dl.longitude, dl.timestamp, dl.heading, dl.speed_kmh, dl.accuracy_meters,
              dl.status as location_status
       FROM driver_locations dl
       WHERE dl.driver_id = $1 AND dl.order_id = $2 AND dl.status = 'active'
       ORDER BY dl.timestamp DESC LIMIT 1`,
      [order.assigned_driver_id, orderId]
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
      'SELECT id, assigned_driver_id, current_tracking_status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderCheck.rows[0];
    if (order.assigned_driver_id !== driverId) {
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

module.exports = router;
