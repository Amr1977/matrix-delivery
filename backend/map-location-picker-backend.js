// ============ BACKEND: Map Location Picker Implementation ============
// Exported as a function to be used in server.js

const logger = require('./config/logger');
const { verifyToken } = require('./middleware/auth');

// Helper functions for ID generation (same as OrderService)
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

const generateOrderNumber = () => {
  return `ORD-${Date.now()}`;
};

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to estimate duration based on vehicle type
const estimateDuration = (distanceKm, vehicleType) => {
  const speeds = {
    walker: 5,    // km/h
    bicycle: 15,  // km/h
    bike: 15,     // km/h (same as bicycle)
    car: 25,      // km/h in city
    van: 20,      // km/h
    truck: 18     // km/h
  };
  const speed = speeds[vehicleType] || 25;
  return Math.ceil((distanceKm / speed) * 60); // Convert to minutes
};

// Helper function to check if location is remote area
const isRemoteArea = (address) => {
  const remoteKeywords = ['farm', 'desert', 'rural', 'countryside', 'village', 'remote', 'outskirts'];
  const addressLower = JSON.stringify(address).toLowerCase();
  return remoteKeywords.some(keyword => addressLower.includes(keyword));
};

// Helper function to check if location is international
const isInternationalOrder = (pickupCountry, deliveryCountry) => {
  return pickupCountry !== deliveryCountry;
};

// Helper function to parse Google Maps URL
const parseGoogleMapsUrl = (url) => {
  try {
    // Format: https://www.google.com/maps?q=30.0444,31.2357
    // Format: https://maps.google.com/?q=30.0444,31.2357
    // Format: https://goo.gl/maps/... (shortened)

    if (!url) return null;

    // Handle standard format
    const qMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      return {
        lat: parseFloat(qMatch[1]),
        lng: parseFloat(qMatch[2])
      };
    }

    // Handle @format
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      return {
        lat: parseFloat(atMatch[1]),
        lng: parseFloat(atMatch[2])
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

// Main export function - called from server.js
module.exports = (app, pool, jwt) => {
  // ============ API ENDPOINTS ============

  // Reverse geocode coordinates to address (Enhanced)
  app.get('/api/locations/reverse-geocode', async (req, res) => {
    try {
      const { lat, lng } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
      }

      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'Matrix-Delivery-App/1.0' }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.error) {
        return res.status(404).json({ error: 'Location not found' });
      }

      // Transform to our format
      const result = {
        coordinates: { lat: parseFloat(data.lat), lng: parseFloat(data.lon) },
        locationLink: `https://www.google.com/maps?q=${lat},${lng}`,
        address: {
          country: data.address?.country || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          area: data.address?.suburb || data.address?.neighbourhood || data.address?.district || '',
          street: data.address?.road || data.address?.street || data.address?.pedestrian || '',
          buildingNumber: data.address?.house_number || '',
          postcode: data.address?.postcode || ''
        },
        displayName: data.display_name,
        isRemote: isRemoteArea(data.address)
      };

      res.json(result);
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      res.status(500).json({ error: 'Failed to reverse geocode location' });
    }
  });

  // Forward geocode address to coordinates
  app.get('/api/locations/forward-geocode', async (req, res) => {
    try {
      const { country, city, area, street, building } = req.query;

      if (!country || !city) {
        return res.status(400).json({ error: 'Country and city are required for geocoding' });
      }

      // Build search string from address components
      const addressParts = [street, area, city, country].filter(Boolean);
      const searchQuery = addressParts.join(', ');

      // Use Nominatim for forward geocoding
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5`;

      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'Matrix-Delivery-App/1.0' }
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'No results found for this address' });
      }

      // Return the first result or all results
      const results = data.map(item => ({
        coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
        locationLink: `https://www.google.com/maps?q=${item.lat},${item.lon}`,
        displayName: item.display_name,
        address: {
          country: item.address?.country || country,
          city: item.address?.city || item.address?.town || item.address?.village || city,
          area: item.address?.suburb || item.address?.neighbourhood || item.address?.district || area || '',
          street: item.address?.road || item.address?.street || item.address?.pedestrian || street || '',
          buildingNumber: item.address?.house_number || building || '',
          postcode: item.address?.postcode || ''
        },
        confidence: parseFloat(item.importance) || 0
      }));

      // Return the best result (removing allResults to avoid circular reference)
      const bestResult = results[0];
      res.json(bestResult);
    } catch (error) {
      console.error('Forward geocoding error:', error);
      res.status(500).json({ error: 'Failed to geocode address' });
    }
  });

  // Parse Google Maps URL
  app.post('/api/locations/parse-maps-url', async (req, res) => {
    try {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({ error: 'URL is required' });
      }

      const coords = parseGoogleMapsUrl(url);

      if (!coords) {
        return res.status(400).json({ error: 'Invalid Google Maps URL format' });
      }

      // Now reverse geocode these coordinates
      const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json&addressdetails=1`;

      const response = await fetch(nominatimUrl, {
        headers: { 'User-Agent': 'Matrix-Delivery-App/1.0' }
      });

      const data = await response.json();

      res.json({
        coordinates: coords,
        locationLink: `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
        address: {
          country: data.address?.country || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          area: data.address?.suburb || data.address?.neighbourhood || data.address?.district || '',
          street: data.address?.road || data.address?.street || '',
          buildingNumber: data.address?.house_number || '',
          postcode: data.address?.postcode || ''
        },
        displayName: data.display_name
      });
    } catch (error) {
      console.error('Parse URL error:', error);
      res.status(500).json({ error: 'Failed to parse Google Maps URL' });
    }
  });

  // Calculate route between two points
  app.post('/api/locations/calculate-route', async (req, res) => {
    try {
      const { pickup, delivery } = req.body;

      if (!pickup?.lat || !pickup?.lng || !delivery?.lat || !delivery?.lng) {
        return res.status(400).json({ error: 'Pickup and delivery coordinates are required' });
      }

      // Calculate straight-line distance
      const straightDistance = calculateDistance(
        pickup.lat, pickup.lng,
        delivery.lat, delivery.lng
      );

      // Try to get actual route from OSRM
      let routeDistance = straightDistance;
      let routeDuration = null;
      let routePolyline = null;
      let osrmSuccess = false;

      try {
        // Use environment variable for OSRM server, default to public server
        const osrmServer = process.env.OSRM_SERVER_URL || 'http://router.project-osrm.org';
        const osrmUrl = `${osrmServer}/route/v1/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?overview=full&geometries=polyline`;

        console.log(`Calculating route via OSRM: ${pickup.lat},${pickup.lng} -> ${delivery.lat},${delivery.lng}`);

        const osrmResponse = await fetch(osrmUrl, {
          headers: {
            'User-Agent': 'Matrix-Delivery-App/1.0'
          }
        });

        if (osrmResponse.ok) {
          const osrmData = await osrmResponse.json();

          if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
            const route = osrmData.routes[0];
            routeDistance = route.distance / 1000; // Convert meters to km
            routeDuration = route.duration / 60; // Convert seconds to minutes
            routePolyline = route.geometry;
            osrmSuccess = true;

            console.log(`OSRM route calculated: ${routeDistance.toFixed(2)}km, ${routeDuration.toFixed(0)}min`);
          } else {
            console.warn('OSRM returned no routes:', osrmData.code);
          }
        } else {
          console.warn(`OSRM API error: HTTP ${osrmResponse.status}`);
        }
      } catch (osrmError) {
        console.warn('OSRM routing failed, using straight-line distance:', osrmError.message);
        // Estimate route distance as straight-line * 1.3 (typical urban factor)
        routeDistance = straightDistance * 1.3;
      }

      // Calculate estimates for all vehicle types using actual or estimated distance
      const estimates = {
        walker: {
          duration_minutes: routeDuration || estimateDuration(routeDistance, 'walker'),
          speed_kmh: 5,
          icon: '🚶'
        },
        bicycle: {
          duration_minutes: routeDuration ? Math.ceil(routeDuration * 0.6) : estimateDuration(routeDistance, 'bicycle'),
          speed_kmh: 15,
          icon: '🚲'
        },
        car: {
          duration_minutes: routeDuration || estimateDuration(routeDistance, 'car'),
          speed_kmh: 25,
          icon: '🚗'
        },
        van: {
          duration_minutes: routeDuration ? Math.ceil(routeDuration * 1.25) : estimateDuration(routeDistance, 'van'),
          speed_kmh: 20,
          icon: '🚐'
        },
        truck: {
          duration_minutes: routeDuration ? Math.ceil(routeDuration * 1.4) : estimateDuration(routeDistance, 'truck'),
          speed_kmh: 18,
          icon: '🚛'
        }
      };

      res.json({
        distance_km: parseFloat(routeDistance.toFixed(2)),
        straight_line_distance_km: parseFloat(straightDistance.toFixed(2)),
        polyline: routePolyline,
        estimates,
        route_found: osrmSuccess,
        osrm_used: osrmSuccess
      });
    } catch (error) {
      console.error('Route calculation error:', error);
      res.status(500).json({ error: 'Failed to calculate route' });
    }
  });

  // Get/Update delivery agent preferences
  app.get('/api/delivery-agent/preferences', verifyToken, async (req, res) => {
    try {
      if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) !== 'driver') {
        return res.status(403).json({ error: 'Only delivery agents can access preferences' });
      }

      const result = await pool.query(
        `SELECT * FROM delivery_agent_preferences WHERE agent_id = $1`,
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        // Create default preferences
        const defaultPrefs = await pool.query(
          `INSERT INTO delivery_agent_preferences (agent_id, max_distance_km, accept_remote_areas, accept_international)
         VALUES ($1, 50.00, false, false)
         RETURNING *`,
          [req.user.userId]
        );
        return res.json(defaultPrefs.rows[0]);
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({ error: 'Failed to get preferences' });
    }
  });

  app.put('/api/delivery-agent/preferences', verifyToken, async (req, res) => {
    try {
      if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) !== 'driver') {
        return res.status(403).json({ error: 'Only delivery agents can update preferences' });
      }

      const { max_distance_km, accept_remote_areas, accept_international } = req.body;

      const result = await pool.query(
        `INSERT INTO delivery_agent_preferences (agent_id, max_distance_km, accept_remote_areas, accept_international, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (agent_id) 
       DO UPDATE SET 
         max_distance_km = EXCLUDED.max_distance_km,
         accept_remote_areas = EXCLUDED.accept_remote_areas,
         accept_international = EXCLUDED.accept_international,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
        [
          req.user.userId,
          max_distance_km !== undefined ? max_distance_km : 50.00,
          accept_remote_areas !== undefined ? accept_remote_areas : false,
          accept_international !== undefined ? accept_international : false
        ]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // Duplicate POST /api/orders handler removed.
  // Code now uses backend/routes/orders.js correctly.

  // Update GET /api/orders to include filtering for delivery agents
  // This enhances the existing orders endpoint
  const originalGetOrders = app._router.stack.find(r =>
    r.route?.path === '/api/orders' && r.route?.methods?.get
  );

  // Enhanced GET /api/orders with delivery agent filtering
  app.get('/api/orders', verifyToken, async (req, res) => {
    try {
      let query, params;

      if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'customer') {
        // Customer view - show only active orders (exclude delivered and cancelled)
        query = `SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
               FROM orders o
               LEFT JOIN bids b ON o.id = b.order_id
               LEFT JOIN users u ON b.user_id = u.id
               WHERE o.customer_id = $1 AND o.status NOT IN ('delivered', 'cancelled')
               GROUP BY o.id ORDER BY o.created_at DESC`;
        params = [req.user.userId];
      } else if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'driver') {
        // Driver view - show their assigned orders, bids, and available orders WITHIN 7KM
        const { lat, lng } = req.query;

        // For drivers, location is REQUIRED to fetch available orders
        if (!lat || !lng) {
          return res.status(400).json({
            error: 'Driver location (lat/lng) is required to fetch available orders. Please enable location services and try again.'
          });
        }

        const driverLat = parseFloat(lat);
        const driverLng = parseFloat(lng);

        if (isNaN(driverLat) || isNaN(driverLng)) {
          return res.status(400).json({
            error: 'Invalid latitude or longitude values'
          });
        }

        query = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               cu.rating as customerrating,
               cu.completed_deliveries as customercompletedorders,
               cu.is_verified as customerisverified,
               cu.created_at as customerjoinedat
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN users cu ON o.customer_id = cu.id
        WHERE (
          o.assigned_driver_user_id = $1
          OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1)
          OR (
            o.status = 'pending_bids'
            AND ST_Distance(
              ST_Point(
                (o.pickup_coordinates->>'lng')::float,
                (o.pickup_coordinates->>'lat')::float
              )::geography,
              ST_Point($2, $3)::geography
            ) <= 7000
          )
        )
        AND o.status != 'delivered' AND o.status != 'cancelled'
        GROUP BY o.id, cu.rating, cu.completed_deliveries, cu.is_verified, cu.created_at
        ORDER BY o.created_at DESC
      `;
        params = [req.user.userId, driverLng, driverLat];
      } else if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'admin') {
        // Admin view - show all orders
        query = `SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               c.rating as customerrating,
               c.completed_deliveries as customercompletedorders,
               c.is_verified as customerisverified,
               c.created_at as customerjoinedat
               FROM orders o
               LEFT JOIN bids b ON o.id = b.order_id
               LEFT JOIN users u ON b.user_id = u.id
               LEFT JOIN users c ON o.customer_id = c.id
               GROUP BY o.id, c.rating, c.completed_deliveries, c.is_verified, c.created_at
               ORDER BY o.created_at DESC`;
        params = [];
      }

      const result = await pool.query(query, params);

      const orders = result.rows.map(order => ({
        _id: order.id,
        orderNumber: order.order_number,
        title: order.title,
        description: order.description,
        pickupAddress: order.pickup_address,
        deliveryAddress: order.delivery_address,
        from: {
          lat: parseFloat(order.from_lat),
          lng: parseFloat(order.from_lng),
          name: order.from_name
        },
        to: {
          lat: parseFloat(order.to_lat),
          lng: parseFloat(order.to_lng),
          name: order.to_name
        },
        pickupCoordinates: order.pickup_coordinates,
        deliveryCoordinates: order.delivery_coordinates,
        pickupLocationLink: order.pickup_location_link,
        deliveryLocationLink: order.delivery_location_link,
        estimatedDistanceKm: order.estimated_distance_km ? parseFloat(order.estimated_distance_km) : null,
        estimatedDurationMinutes: order.estimated_duration_minutes,
        routePolyline: order.route_polyline,
        isRemoteArea: order.is_remote_area,
        isInternational: order.is_international,
        packageDescription: order.package_description,
        packageWeight: order.package_weight ? parseFloat(order.package_weight) : null,
        estimatedValue: order.estimated_value ? parseFloat(order.estimated_value) : null,
        specialInstructions: order.special_instructions,
        price: parseFloat(order.price),
        status: order.status,
        bids: order.bids,
        customerId: order.customer_id,
        customerName: order.customer_name,
        assignedDriver: order.assigned_driver_user_id ? {
          userId: order.assigned_driver_user_id,
          driverName: order.assigned_driver_name,
          bidPrice: parseFloat(order.assigned_driver_bid_price)
        } : null,
        estimatedDeliveryDate: order.estimated_delivery_date,
        currentLocation: order.current_location_lat ? {
          lat: parseFloat(order.current_location_lat),
          lng: parseFloat(order.current_location_lng)
        } : null,
        customerRating: order.customerrating ? parseFloat(order.customerrating) : 5.0,
        customerCompletedOrders: order.customercompletedorders || 0,
        customerIsVerified: order.customerisverified || false,
        customerJoinedAt: order.customerjoinedat,
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        pickedUpAt: order.picked_up_at,
        deliveredAt: order.delivered_at
      }));

      res.json(orders);
    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({ error: 'Failed to get orders' });
    }
  });

  // Get order history with pagination (delivered and cancelled orders)
  app.get('/api/orders/history', verifyToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const statusFilter = req.query.status; // Optional: 'delivered', 'cancelled', or both

      // Build status condition
      let statusCondition = "o.status IN ('delivered', 'cancelled')";
      if (statusFilter === 'delivered') {
        statusCondition = "o.status = 'delivered'";
      } else if (statusFilter === 'cancelled') {
        statusCondition = "o.status = 'cancelled'";
      }

      let query, params, countQuery, countParams;

      if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'customer') {
        // Get total count
        countQuery = `SELECT COUNT(*) as total FROM orders o WHERE o.customer_id = $1 AND ${statusCondition}`;
        countParams = [req.user.userId];

        // Get paginated orders
        query = `SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
               FROM orders o
               LEFT JOIN bids b ON o.id = b.order_id
               LEFT JOIN users u ON b.user_id = u.id
               WHERE o.customer_id = $1 AND ${statusCondition}
               GROUP BY o.id 
               ORDER BY COALESCE(o.delivered_at, o.cancelled_at, o.created_at) DESC
               LIMIT $2 OFFSET $3`;
        params = [req.user.userId, limit, offset];
      } else if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'driver') {
        // Get total count for driver
        countQuery = `SELECT COUNT(DISTINCT o.id) as total 
                      FROM orders o 
                      WHERE (o.assigned_driver_user_id = $1 OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1))
                      AND ${statusCondition}`;
        countParams = [req.user.userId];

        // Get paginated orders for driver
        query = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               cu.rating as customerrating,
               cu.completed_deliveries as customercompletedorders,
               cu.is_verified as customerisverified,
               cu.created_at as customerjoinedat
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN users cu ON o.customer_id = cu.id
        WHERE (
          o.assigned_driver_user_id = $1
          OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1)
        )
        AND ${statusCondition}
        GROUP BY o.id, cu.rating, cu.completed_deliveries, cu.is_verified, cu.created_at
        ORDER BY COALESCE(o.delivered_at, o.cancelled_at, o.created_at) DESC
        LIMIT $2 OFFSET $3
      `;
        params = [req.user.userId, limit, offset];
      } else if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'admin') {
        // Get total count for admin
        countQuery = `SELECT COUNT(*) as total FROM orders o WHERE ${statusCondition}`;
        countParams = [];

        // Get paginated orders for admin
        query = `SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               c.rating as customerrating,
               c.completed_deliveries as customercompletedorders,
               c.is_verified as customerisverified,
               c.created_at as customerjoinedat
               FROM orders o
               LEFT JOIN bids b ON o.id = b.order_id
               LEFT JOIN users u ON b.user_id = u.id
               LEFT JOIN users c ON o.customer_id = c.id
               WHERE ${statusCondition}
               GROUP BY o.id, c.rating, c.completed_deliveries, c.is_verified, c.created_at
               ORDER BY COALESCE(o.delivered_at, o.cancelled_at, o.created_at) DESC
               LIMIT $1 OFFSET $2`;
        params = [limit, offset];
      }

      // Get total count
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);
      const hasMore = page < totalPages;

      // Get orders
      const result = await pool.query(query, params);

      const orders = result.rows.map(order => ({
        _id: order.id,
        orderNumber: order.order_number,
        title: order.title,
        description: order.description,
        pickupAddress: order.pickup_address,
        deliveryAddress: order.delivery_address,
        from: {
          lat: parseFloat(order.from_lat),
          lng: parseFloat(order.from_lng),
          name: order.from_name
        },
        to: {
          lat: parseFloat(order.to_lat),
          lng: parseFloat(order.to_lng),
          name: order.to_name
        },
        pickupCoordinates: order.pickup_coordinates,
        deliveryCoordinates: order.delivery_coordinates,
        pickupLocationLink: order.pickup_location_link,
        deliveryLocationLink: order.delivery_location_link,
        estimatedDistanceKm: order.estimated_distance_km ? parseFloat(order.estimated_distance_km) : null,
        estimatedDurationMinutes: order.estimated_duration_minutes,
        routePolyline: order.route_polyline,
        isRemoteArea: order.is_remote_area,
        isInternational: order.is_international,
        packageDescription: order.package_description,
        packageWeight: order.package_weight ? parseFloat(order.package_weight) : null,
        estimatedValue: order.estimated_value ? parseFloat(order.estimated_value) : null,
        specialInstructions: order.special_instructions,
        price: parseFloat(order.price),
        status: order.status,
        bids: order.bids,
        customerId: order.customer_id,
        customerName: order.customer_name,
        assignedDriver: order.assigned_driver_user_id ? {
          userId: order.assigned_driver_user_id,
          driverName: order.assigned_driver_name,
          bidPrice: parseFloat(order.assigned_driver_bid_price)
        } : null,
        estimatedDeliveryDate: order.estimated_delivery_date,
        currentLocation: order.current_location_lat ? {
          lat: parseFloat(order.current_location_lat),
          lng: parseFloat(order.current_location_lng)
        } : null,
        customerRating: order.customerrating ? parseFloat(order.customerrating) : 5.0,
        customerCompletedOrders: order.customercompletedorders || 0,
        customerIsVerified: order.customerisverified || false,
        customerJoinedAt: order.customerjoinedat,
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        pickedUpAt: order.picked_up_at,
        deliveredAt: order.delivered_at,
        cancelledAt: order.cancelled_at
      }));

      res.json({
        orders,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasMore
        }
      });
    } catch (error) {
      console.error('Get order history error:', error);
      res.status(500).json({ error: 'Failed to get order history' });
    }
  });

  // Combined updates endpoint for performance
  app.get('/api/updates', verifyToken, async (req, res) => {
    try {
      // 1. Fetch Notifications
      const notifQuery = `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`;
      const notifPromise = pool.query(notifQuery, [req.user.userId]);

      // 2. Fetch Orders (reusing logic from /api/orders)
      let orderQuery, orderParams;

      if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'customer') {
        orderQuery = `SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
               FROM orders o
               LEFT JOIN bids b ON o.id = b.order_id
               LEFT JOIN users u ON b.user_id = u.id
               WHERE o.customer_id = $1 AND o.status NOT IN ('delivered', 'cancelled')
               GROUP BY o.id ORDER BY o.created_at DESC`;
        orderParams = [req.user.userId];
      } else if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) === 'driver') {
        const { lat, lng } = req.query;
        // For drivers, location is REQUIRED to fetch available orders
        if (!lat || !lng) {
          // If no location, return empty orders but still return notifications
          const notifResult = await notifPromise;
          return res.json({
            orders: [],
            notifications: notifResult.rows.map(notif => ({
              id: notif.id, orderId: notif.order_id, type: notif.type, title: notif.title,
              message: notif.message, isRead: notif.is_read, createdAt: notif.created_at
            }))
          });
        }

        const driverLat = parseFloat(lat);
        const driverLng = parseFloat(lng);

        orderQuery = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object(
                 'userId', b.user_id,
                 'driverName', b.driver_name,
                 'bidPrice', b.bid_price,
                 'estimatedPickupTime', b.estimated_pickup_time,
                 'estimatedDeliveryTime', b.estimated_delivery_time,
                 'message', b.message,
                 'status', b.status,
                 'createdAt', b.created_at,
                 'driverRating', u.rating,
                 'driverCompletedDeliveries', u.completed_deliveries,
                 'driverIsVerified', u.is_verified
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               cu.rating as customerrating,
               cu.completed_deliveries as customercompletedorders,
               cu.is_verified as customerisverified,
               cu.created_at as customerjoinedat
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN users cu ON o.customer_id = cu.id
        WHERE (
          o.assigned_driver_user_id = $1
          OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1)
          OR (
            o.status = 'pending_bids'
            AND ST_Distance(
              ST_Point(
                (o.pickup_coordinates->>'lng')::float,
                (o.pickup_coordinates->>'lat')::float
              )::geography,
              ST_Point($2, $3)::geography
            ) <= 7000
          )
        )
        AND o.status != 'delivered' AND o.status != 'cancelled'
        GROUP BY o.id, cu.rating, cu.completed_deliveries, cu.is_verified, cu.created_at
        ORDER BY o.created_at DESC
      `;
        orderParams = [req.user.userId, driverLng, driverLat];
      } else {
        // Admin or other
        orderQuery = `SELECT * FROM orders LIMIT 50`;
        orderParams = [];
      }

      const [notifResult, orderResult] = await Promise.all([
        notifPromise,
        pool.query(orderQuery, orderParams)
      ]);

      const orders = orderResult.rows.map(order => ({
        _id: order.id,
        orderNumber: order.order_number,
        title: order.title,
        description: order.description,
        pickupAddress: order.pickup_address,
        deliveryAddress: order.delivery_address,
        from: {
          lat: parseFloat(order.from_lat),
          lng: parseFloat(order.from_lng),
          name: order.from_name
        },
        to: {
          lat: parseFloat(order.to_lat),
          lng: parseFloat(order.to_lng),
          name: order.to_name
        },
        pickupCoordinates: order.pickup_coordinates,
        deliveryCoordinates: order.delivery_coordinates,
        pickupLocationLink: order.pickup_location_link,
        deliveryLocationLink: order.delivery_location_link,
        estimatedDistanceKm: order.estimated_distance_km ? parseFloat(order.estimated_distance_km) : null,
        estimatedDurationMinutes: order.estimated_duration_minutes,
        routePolyline: order.route_polyline,
        isRemoteArea: order.is_remote_area,
        isInternational: order.is_international,
        packageDescription: order.package_description,
        packageWeight: order.package_weight ? parseFloat(order.package_weight) : null,
        estimatedValue: order.estimated_value ? parseFloat(order.estimated_value) : null,
        specialInstructions: order.special_instructions,
        price: parseFloat(order.price),
        status: order.status,
        bids: order.bids,
        customerId: order.customer_id,
        customerName: order.customer_name,
        assignedDriver: order.assigned_driver_user_id ? {
          userId: order.assigned_driver_user_id,
          driverName: order.assigned_driver_name,
          bidPrice: parseFloat(order.assigned_driver_bid_price)
        } : null,
        estimatedDeliveryDate: order.estimated_delivery_date,
        currentLocation: order.current_location_lat ? {
          lat: parseFloat(order.current_location_lat),
          lng: parseFloat(order.current_location_lng)
        } : null,
        customerRating: order.customerrating ? parseFloat(order.customerrating) : 5.0,
        customerCompletedOrders: order.customercompletedorders || 0,
        customerIsVerified: order.customerisverified || false,
        customerJoinedAt: order.customerjoinedat,
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        pickedUpAt: order.picked_up_at,
        deliveredAt: order.delivered_at
      }));

      const notifications = notifResult.rows.map(notif => ({
        id: notif.id, orderId: notif.order_id, type: notif.type, title: notif.title,
        message: notif.message, isRead: notif.is_read, createdAt: notif.created_at
      }));

      res.json({ orders, notifications });

    } catch (error) {
      console.error('Get updates error:', error);
      res.status(500).json({ error: 'Failed to get updates' });
    }
  });

  // End of function
};
