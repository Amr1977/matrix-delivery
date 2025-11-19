// ============ BACKEND: Map Location Picker Implementation ============
// Exported as a function to be used in server.js

const logger = require('./logger');

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
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
module.exports = (app, pool, jwt, verifyToken) => {
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
    let routePolyline = null;
    
    try {
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${delivery.lng},${delivery.lat}?overview=full&geometries=polyline`;
      
      const osrmResponse = await fetch(osrmUrl);
      
      if (osrmResponse.ok) {
        const osrmData = await osrmResponse.json();
        
        if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
          routeDistance = osrmData.routes[0].distance / 1000; // Convert to km
          routePolyline = osrmData.routes[0].geometry;
        }
      }
    } catch (osrmError) {
      console.warn('OSRM routing failed, using straight-line distance:', osrmError.message);
      // Estimate route distance as straight-line * 1.3 (typical urban factor)
      routeDistance = straightDistance * 1.3;
    }
    
    // Calculate estimates for all vehicle types
    const estimates = {
      walker: {
        duration_minutes: estimateDuration(routeDistance, 'walker'),
        speed_kmh: 5,
        icon: '🚶'
      },
      bicycle: {
        duration_minutes: estimateDuration(routeDistance, 'bicycle'),
        speed_kmh: 15,
        icon: '🚲'
      },
      car: {
        duration_minutes: estimateDuration(routeDistance, 'car'),
        speed_kmh: 25,
        icon: '🚗'
      },
      van: {
        duration_minutes: estimateDuration(routeDistance, 'van'),
        speed_kmh: 20,
        icon: '🚐'
      },
      truck: {
        duration_minutes: estimateDuration(routeDistance, 'truck'),
        speed_kmh: 18,
        icon: '🚛'
      }
    };
    
    res.json({
      distance_km: parseFloat(routeDistance.toFixed(2)),
      straight_line_distance_km: parseFloat(straightDistance.toFixed(2)),
      polyline: routePolyline,
      estimates,
      route_found: !!routePolyline
    });
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate route' });
  }
});

// Get/Update delivery agent preferences
app.get('/api/delivery-agent/preferences', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
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
    if (req.user.role !== 'driver') {
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

// Update the existing POST /api/orders endpoint to handle map location data
// This replaces the existing order creation handler in server.js
app.post('/api/orders', verifyToken, async (req, res) => {
  const startTime = Date.now();

  logger.order(`Order creation attempt`, {
    userId: req.user.userId,
    userName: req.user.name,
    ip: req.ip,
    category: 'order'
  });

  try {
    const {
      title, description, price,
      package_description, package_weight, estimated_value, special_instructions, estimated_delivery_date,
      pickupLocation, dropoffLocation, routeInfo
    } = req.body;

    logger.debug(req.body);

    // Validate required fields
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Validate location data
    if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
      return res.status(400).json({ error: 'Pickup and delivery coordinates are required' });
    }

    // Construct address strings
    const pickupAddressParts = [
      pickupLocation.address?.personName,
      pickupLocation.address?.street,
      pickupLocation.address?.buildingNumber ? `Building ${pickupLocation.address.buildingNumber}` : '',
      pickupLocation.address?.floor ? `Floor ${pickupLocation.address.floor}` : '',
      pickupLocation.address?.apartmentNumber ? `Apartment ${pickupLocation.address.apartmentNumber}` : '',
      pickupLocation.address?.area,
      pickupLocation.address?.city,
      pickupLocation.address?.country
    ].filter(Boolean);

    const dropoffAddressParts = [
      dropoffLocation.address?.personName,
      dropoffLocation.address?.street,
      dropoffLocation.address?.buildingNumber ? `Building ${dropoffLocation.address.buildingNumber}` : '',
      dropoffLocation.address?.floor ? `Floor ${dropoffLocation.address.floor}` : '',
      dropoffLocation.address?.apartmentNumber ? `Apartment ${dropoffLocation.address.apartmentNumber}` : '',
      dropoffLocation.address?.area,
      dropoffLocation.address?.city,
      dropoffLocation.address?.country
    ].filter(Boolean);

    const pickupAddress = pickupAddressParts.join(', ');
    const dropoffAddress = dropoffAddressParts.join(', ');

    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    // Determine if remote area or international
    const isRemote = isRemoteArea(pickupLocation.address) || isRemoteArea(dropoffLocation.address);
    const isInternational = isInternationalOrder(
      pickupLocation.address?.country,
      dropoffLocation.address?.country
    );

    const result = await pool.query(
      `INSERT INTO orders (
        id, order_number, title, description, 
        pickup_address, delivery_address,
        from_lat, from_lng, from_name, 
        to_lat, to_lng, to_name,
        pickup_coordinates, delivery_coordinates,
        pickup_location_link, delivery_location_link,
        estimated_distance_km, estimated_duration_minutes, route_polyline,
        is_remote_area, is_international,
        package_description, package_weight, estimated_value, special_instructions,
        price, status, customer_id, customer_name, estimated_delivery_date
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      ) RETURNING *`,
      [
        orderId, orderNumber, title.trim(), description?.trim() || '',
        pickupAddress, dropoffAddress,
        parseFloat(pickupLocation.coordinates.lat), parseFloat(pickupLocation.coordinates.lng),
        pickupLocation.address?.personName || pickupLocation.address?.street,
        parseFloat(dropoffLocation.coordinates.lat), parseFloat(dropoffLocation.coordinates.lng),
        dropoffLocation.address?.personName || dropoffLocation.address?.street,
        JSON.stringify(pickupLocation.coordinates), JSON.stringify(dropoffLocation.coordinates),
        pickupLocation.locationLink || null, dropoffLocation.locationLink || null,
        routeInfo?.distance_km || null, routeInfo?.estimates?.car?.duration_minutes || null,
        routeInfo?.polyline || null,
        isRemote, isInternational,
        package_description || null, package_weight ? parseFloat(package_weight) : null,
        estimated_value ? parseFloat(estimated_value) : null, special_instructions || null,
        parseFloat(price), 'pending_bids', req.user.userId, req.user.name, estimated_delivery_date || null
      ]
    );

    const order = result.rows[0];
    const duration = Date.now() - startTime;

    logger.order(`Order created successfully`, {
      orderId: order.id,
      orderNumber: order.order_number,
      title: order.title,
      price: parseFloat(order.price),
      distance_km: order.estimated_distance_km,
      isRemoteArea: order.is_remote_area,
      isInternational: order.is_international,
      userId: req.user.userId,
      userName: req.user.name,
      duration: `${duration}ms`,
      category: 'order'
    });

    res.status(201).json({
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
      bids: [],
      customerId: order.customer_id,
      customerName: order.customer_name,
      assignedDriver: null,
      estimatedDeliveryDate: order.estimated_delivery_date,
      createdAt: order.created_at,
      pickupLocation: pickupLocation,
      dropoffLocation: dropoffLocation
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Order creation error: ${error.message}`, {
      stack: error.stack,
      userId: req.user.userId,
      userName: req.user.name,
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update GET /api/orders to include filtering for delivery agents
// This enhances the existing orders endpoint
const originalGetOrders = app._router.stack.find(r => 
  r.route?.path === '/api/orders' && r.route?.methods?.get
);

// Enhanced GET /api/orders with delivery agent filtering
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'customer') {
      // Customer view - show all their orders
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
               WHERE o.customer_id = $1
               GROUP BY o.id ORDER BY o.created_at DESC`;
      params = [req.user.userId];
    } else if (req.user.role === 'driver') {
      // Driver view - show their assigned orders, bids, and available orders
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
          OR (o.status = 'pending_bids')
        )
        AND o.status != 'delivered' AND o.status != 'cancelled'
        GROUP BY o.id, cu.rating, cu.completed_deliveries, cu.is_verified, cu.created_at
        ORDER BY o.created_at DESC
      `;
      params = [req.user.userId];
    } else if (req.user.role === 'admin') {
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

// End of function
};
