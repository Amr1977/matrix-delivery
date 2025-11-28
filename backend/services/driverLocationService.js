const pool = require('./db');

/**
 * Driver Location Service
 * Manages real-time driver location tracking for bidding and active orders
 */

/**
 * Update driver's current location
 * @param {number} driverId - Driver's user ID
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} heading - Direction in degrees (optional)
 * @param {number} speedKmh - Speed in km/h (optional)
 * @param {number} accuracyMeters - GPS accuracy in meters (optional)
 * @param {string} context - Context: 'bidding', 'active_order', 'idle'
 * @param {number} orderId - Order ID if context is 'active_order' (optional)
 */
async function updateDriverLocation(driverId, latitude, longitude, heading = null, speedKmh = null, accuracyMeters = null, context = 'idle', orderId = null) {
    try {
        const query = `
      INSERT INTO driver_locations (driver_id, order_id, latitude, longitude, heading, speed_kmh, accuracy_meters, context, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *
    `;

        const values = [driverId, orderId, latitude, longitude, heading, speedKmh, accuracyMeters, context];
        const result = await pool.query(query, values);

        return result.rows[0];
    } catch (error) {
        console.error('Error updating driver location:', error);
        throw error;
    }
}

/**
 * Get driver's most recent location
 * @param {number} driverId - Driver's user ID
 * @returns {Object} Latest location data or null
 */
async function getDriverLocation(driverId) {
    try {
        const query = `
      SELECT * FROM driver_locations
      WHERE driver_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;

        const result = await pool.query(query, [driverId]);
        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting driver location:', error);
        throw error;
    }
}

/**
 * Get locations of all drivers who have bid on an order
 * @param {number} orderId - Order ID
 * @returns {Array} Array of driver locations with driver info
 */
async function getDriversLocationsForOrder(orderId) {
    try {
        const query = `
      SELECT 
        dl.*,
        u.name as driver_name,
        b.bid_price,
        b.estimated_pickup_time,
        b.estimated_delivery_time
      FROM bids b
      JOIN users u ON b.driver_id = u.id
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations
        WHERE driver_id = b.driver_id
        ORDER BY timestamp DESC
        LIMIT 1
      ) dl ON true
      WHERE b.order_id = $1
      AND dl.timestamp > NOW() - INTERVAL '5 minutes'
      ORDER BY b.created_at DESC
    `;

        const result = await pool.query(query, [orderId]);
        return result.rows;
    } catch (error) {
        console.error('Error getting drivers locations for order:', error);
        throw error;
    }
}

/**
 * Clean up old location records (keep last 24 hours only)
 */
async function cleanupOldLocations() {
    try {
        const query = `
      DELETE FROM driver_locations
      WHERE timestamp < NOW() - INTERVAL '24 hours'
    `;

        const result = await pool.query(query);
        console.log(`Cleaned up ${result.rowCount} old location records`);
        return result.rowCount;
    } catch (error) {
        console.error('Error cleaning up old locations:', error);
        throw error;
    }
}

module.exports = {
    updateDriverLocation,
    getDriverLocation,
    getDriversLocationsForOrder,
    cleanupOldLocations
};
