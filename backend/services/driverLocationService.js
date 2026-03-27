const pool = require("../config/db");
const routeService = require("./routeService");

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
async function updateDriverLocation(
  driverId,
  latitude,
  longitude,
  heading = null,
  speedKmh = null,
  accuracyMeters = null,
  context = "idle",
  orderId = null,
) {
  try {
    const query = `
      INSERT INTO driver_locations (driver_id, order_id, latitude, longitude, heading, speed_kmh, accuracy_meters, context, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (driver_id, order_id) 
      DO UPDATE SET 
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        heading = EXCLUDED.heading,
        speed_kmh = EXCLUDED.speed_kmh,
        accuracy_meters = EXCLUDED.accuracy_meters,
        context = EXCLUDED.context,
        order_id = COALESCE(EXCLUDED.order_id, driver_locations.order_id),
        timestamp = NOW()
      RETURNING *
    `;

    const values = [
      driverId,
      orderId,
      latitude,
      longitude,
      heading,
      speedKmh,
      accuracyMeters,
      context,
    ];
    const result = await pool.query(query, values);

    return result.rows[0];
  } catch (error) {
    console.error("Error updating driver location:", error);
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
    console.error("Error getting driver location:", error);
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
        COALESCE(dl.latitude, b.driver_location_lat) as latitude,
        COALESCE(dl.longitude, b.driver_location_lng) as longitude,
        dl.timestamp as last_location_update,
        u.name as driver_name,
        b.user_id as "userId",
        b.bid_price,
        b.estimated_pickup_time,
        b.estimated_delivery_time,
        b.message,
        u.rating as driver_rating,
        u.completed_deliveries,
        o.from_lat as pickup_lat,
        o.from_lng as pickup_lng
      FROM bids b
      JOIN users u ON b.user_id = u.id
      JOIN orders o ON o.id = b.order_id
      LEFT JOIN LATERAL (
        SELECT * FROM driver_locations
        WHERE driver_id = b.user_id
        ORDER BY timestamp DESC
        LIMIT 1
      ) dl ON true
      WHERE b.order_id = $1
      AND (dl.timestamp > NOW() - INTERVAL '30 minutes' OR b.driver_location_lat IS NOT NULL)
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(query, [orderId]);

    const enriched = await Promise.all(
      result.rows.map(async (row) => {
        const driverLat = Number(row.latitude);
        const driverLng = Number(row.longitude);
        const pickupLat = Number(row.pickup_lat);
        const pickupLng = Number(row.pickup_lng);

        if (
          !Number.isFinite(driverLat) ||
          !Number.isFinite(driverLng) ||
          !Number.isFinite(pickupLat) ||
          !Number.isFinite(pickupLng)
        ) {
          return {
            ...row,
            pickup_distance_km: null,
            pickup_eta_minutes: null,
            driver_to_pickup_polyline: null,
            driver_to_pickup_route_found: false,
            driver_to_pickup_osrm_used: false,
          };
        }

        try {
          const route = await routeService.calculateRoute(
            { lat: driverLat, lng: driverLng },
            { lat: pickupLat, lng: pickupLng },
          );

          return {
            ...row,
            pickup_distance_km: route.distance_km,
            pickup_eta_minutes:
              route.estimates?.car?.duration_minutes ?? route.duration_minutes,
            driver_to_pickup_polyline: route.polyline || null,
            driver_to_pickup_route_found: !!route.route_found,
            driver_to_pickup_osrm_used: !!route.osrm_used,
          };
        } catch (routeError) {
          return {
            ...row,
            pickup_distance_km: null,
            pickup_eta_minutes: null,
            driver_to_pickup_polyline: null,
            driver_to_pickup_route_found: false,
            driver_to_pickup_osrm_used: false,
          };
        }
      }),
    );

    return enriched.map(({ pickup_lat, pickup_lng, ...safeRow }) => safeRow);
  } catch (error) {
    console.error("Error getting drivers locations for order:", error);
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
    console.error("Error cleaning up old locations:", error);
    throw error;
  }
}

module.exports = {
  updateDriverLocation,
  getDriverLocation,
  getDriversLocationsForOrder,
  cleanupOldLocations,
};
