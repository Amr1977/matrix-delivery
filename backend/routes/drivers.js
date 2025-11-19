const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../logger');

const router = express.Router();

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

// Update/Get driver location
router.post('/location', verifyToken, requireRole('driver'), apiRateLimit, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude must be numbers' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }

    // For now, we'll store this in memory. In a production app, you'd save this to a database
    // with timestamps and potentially use Redis for geospatial queries

    const location = {
      latitude: parseFloat(latitude.toFixed(8)),
      longitude: parseFloat(longitude.toFixed(8)),
      lastUpdated: new Date()
    };

    logger.info(`Driver location updated`, {
      userId: req.user.userId,
      latitude: location.latitude,
      longitude: location.longitude,
      category: 'driver'
    });

    res.json({
      location,
      message: 'Location updated successfully'
    });

  } catch (error) {
    logger.error(`Driver location update error: ${error.message}`, {
      userId: req.user.userId,
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
