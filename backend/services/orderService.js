const { Pool } = require('pg');
const { getDistance } = require('geolib');
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

class OrderService {
  /**
   * Calculate distance between two points using geolib
   */
  getDistance(point1, point2) {
    return getDistance(
      { lat: point1.latitude, lng: point1.longitude },
      { lat: point2.lat, lng: point2.lng }
    );
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sanitize string input
   */
  sanitizeString(str, maxLength = 1000) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength).replace(/[<>\"'&]/g, '');
  }

  /**
   * Get orders for a user based on their role
   */
  async getOrders(userId, userRole, filters = {}) {
    let query;
    let params = [];
    let locationConditions = '';

    if (userRole === 'customer') {
      // Customers see their own orders
      query = `
        SELECT
          o.*,
          json_build_object(
            'userId', d.id,
            'name', d.name,
            'rating', d.rating,
            'completedDeliveries', d.completed_deliveries
          ) as assignedDriver,
          json_agg(
            json_build_object(
              'userId', b.user_id,
              'driverName', u.name,
              'bidPrice', b.bid_price,
              'estimatedPickupTime', b.estimated_pickup_time,
              'estimatedDeliveryTime', b.estimated_delivery_time,
              'message', b.message,
              'driverRating', u.rating,
              'driverCompletedDeliveries', u.completed_deliveries,
              'driverReviewCount', COALESCE(dr.review_count, 0),
              'driverIsVerified', u.is_verified,
              'driverLocation', json_build_object('lat', b.driver_location_lat, 'lng', b.driver_location_lng)
            )
          ) FILTER (WHERE b.id IS NOT NULL) as bids,
          CASE
            WHEN o.assigned_driver_user_id IS NOT NULL THEN
              (SELECT json_build_object(
                'userId', ab.user_id,
                'driverName', au.name,
                'bidPrice', ab.bid_price,
                'estimatedPickupTime', ab.estimated_pickup_time,
                'estimatedDeliveryTime', ab.estimated_delivery_time,
                'message', ab.message,
                'driverRating', au.rating,
                'driverCompletedDeliveries', au.completed_deliveries,
                'driverReviewCount', COALESCE(adr.review_count, 0),
                'driverIsVerified', au.is_verified
              )
              FROM bids ab
              LEFT JOIN users au ON ab.user_id = au.id
              LEFT JOIN (
                SELECT reviewee_id, COUNT(*) as review_count
                FROM reviews
                GROUP BY reviewee_id
              ) adr ON adr.reviewee_id = au.id
              WHERE ab.order_id = o.id AND ab.user_id = o.assigned_driver_user_id)
            ELSE NULL
          END as acceptedBid,
          json_build_object(
            'reviews', json_build_object(
              'toDriver', CASE WHEN r.id IS NOT NULL THEN true ELSE false END,
              'toCustomer', false,
              'toPlatform', false
            )
          ) as reviewStatus
        FROM orders o
        LEFT JOIN users d ON o.assigned_driver_user_id = d.id
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN reviews r ON o.id = r.order_id AND r.reviewer_id = $1 AND r.reviewee_id = d.id
        LEFT JOIN (
          SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
        ) dr ON dr.reviewee_id = u.id
        WHERE o.customer_id = $1
        GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries, r.id
        ORDER BY o.created_at DESC
      `;
      params = [userId];
    } else if (userRole === 'driver') {
      // Reset location conditions for driver
      locationConditions = '';
      const filterParams = [];

      // Distance-based filtering using PostGIS (within 7km of pickup location)
      if (filters.driverLat !== undefined && filters.driverLng !== undefined && !isNaN(filters.driverLat) && !isNaN(filters.driverLng)) {
        locationConditions += ` AND ST_Distance(
          ST_Point(
            (o.pickup_coordinates->>'lng')::float,
            (o.pickup_coordinates->>'lat')::float
          )::geography,
          ST_Point($2, $3)::geography,
          true
        ) <= 7000`;
        filterParams.push(filters.driverLng, filters.driverLat);
        logger.info('PostGIS distance filter applied', {
          driverLng: filters.driverLng,
          driverLat: filters.driverLat,
          distanceThresholdMeters: 7000,
          category: 'orders'
        });

        // Add debugging query to check distances for all orders
        logger.debug('Checking distances for all pending orders', {
          driverLat: filters.driverLat,
          driverLng: filters.driverLng,
          category: 'orders'
        });
        const debugQuery = `
          SELECT
            o.id,
            o.order_number,
            o.pickup_coordinates,
            (o.pickup_coordinates->>'lng')::float as pickup_lng,
            (o.pickup_coordinates->>'lat')::float as pickup_lat,
            ST_Distance(
              ST_Point(
                (o.pickup_coordinates->>'lng')::float,
                (o.pickup_coordinates->>'lat')::float
              )::geography,
              ST_Point($1, $2)::geography,
              true
            ) / 1000 as distance_km
          FROM orders o
          WHERE o.status = 'pending_bids' AND o.assigned_driver_user_id IS NULL
          ORDER BY distance_km ASC
        `;
        const debugResult = await pool.query(debugQuery, [filters.driverLng, filters.driverLat]);
        logger.info('Distance calculation results', {
          driverLat: filters.driverLat,
          driverLng: filters.driverLng,
          totalOrders: debugResult.rows.length,
          distances: debugResult.rows.map(row => ({
            orderId: row.id,
            orderNumber: row.order_number,
            pickupCoords: row.pickup_coordinates,
            pickupLat: row.pickup_lat,
            pickupLng: row.pickup_lng,
            distanceKm: Number(row.distance_km).toFixed(2)
          })),
          category: 'orders'
        });

        // Log which orders should be filtered out
        const ordersWithinRange = debugResult.rows.filter(row => Number(row.distance_km) <= 7);
        const ordersOutsideRange = debugResult.rows.filter(row => Number(row.distance_km) > 7);

        logger.info('Filter analysis', {
          driverLat: filters.driverLat,
          driverLng: filters.driverLng,
          ordersWithin7km: ordersWithinRange.length,
          ordersOutside7km: ordersOutsideRange.length,
          shouldBeFilteredOut: ordersOutsideRange.map(o => ({ id: o.id, distance: Number(o.distance_km).toFixed(2) })),
          category: 'orders'
        });
      } else {
        logger.warn('Skipping PostGIS filter - missing or invalid coordinates', {
          driverLat: filters.driverLat,
          driverLng: filters.driverLng,
          isNaNLat: isNaN(filters.driverLat),
          isNaNLng: isNaN(filters.driverLng),
          category: 'orders'
        });
      }

      // Additional text-based filters
      if (filters.country || filters.city || filters.area) {
        const conditions = [];
        let paramIndex = filterParams.length + 1;

        if (filters.country) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex}`);
          filterParams.push(`%${filters.country}%`);
          paramIndex += 1;
        }
        if (filters.city) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex}`);
          filterParams.push(`%${filters.city}%`);
          paramIndex += 1;
        }
        if (filters.area) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex}`);
          filterParams.push(`%${filters.area}%`);
          paramIndex += 1;
        }

        if (conditions.length > 0) {
          locationConditions += ' AND (' + conditions.join(' AND ') + ')';
        }
      }

      // Drivers see available orders (filtered if specified) and their assigned orders
      query = `
        SELECT
          o.*,
          json_build_object(
            'userId', d.id,
            'name', d.name,
            'rating', d.rating,
            'completedDeliveries', d.completed_deliveries
          ) as assignedDriver,
          json_agg(
            json_build_object(
              'userId', b.user_id,
              'driverName', u.name,
              'bidPrice', b.bid_price,
              'estimatedPickupTime', b.estimated_pickup_time,
              'estimatedDeliveryTime', b.estimated_delivery_time,
              'message', b.message,
              'driverRating', u.rating,
              'driverCompletedDeliveries', u.completed_deliveries,
              'driverReviewCount', COALESCE(dr.review_count, 0),
              'driverIsVerified', u.is_verified,
              'driverLocation', json_build_object('lat', b.driver_location_lat, 'lng', b.driver_location_lng)
            )
          ) FILTER (WHERE b.id IS NOT NULL) as bids,
          CASE
            WHEN o.assigned_driver_user_id IS NOT NULL THEN
              (SELECT json_build_object(
                'userId', ab.user_id,
                'driverName', au.name,
                'bidPrice', ab.bid_price,
                'estimatedPickupTime', ab.estimated_pickup_time,
                'estimatedDeliveryTime', ab.estimated_delivery_time,
                'message', ab.message,
                'driverRating', au.rating,
                'driverCompletedDeliveries', au.completed_deliveries,
                'driverReviewCount', COALESCE(adr.review_count, 0),
                'driverIsVerified', au.is_verified
              )
              FROM bids ab
              LEFT JOIN users au ON ab.user_id = au.id
              LEFT JOIN (
                SELECT reviewee_id, COUNT(*) as review_count
                FROM reviews
                GROUP BY reviewee_id
              ) adr ON adr.reviewee_id = au.id
              WHERE ab.order_id = o.id AND ab.user_id = o.assigned_driver_user_id)
            ELSE NULL
          END as acceptedBid,
          json_build_object(
            'reviews', json_build_object(
              'toDriver', false,
              'toCustomer', CASE WHEN r.id IS NOT NULL THEN true ELSE false END,
              'toPlatform', false
            )
          ) as reviewStatus,
          CASE
            WHEN o.assigned_driver_user_id = $1 THEN 0
            WHEN o.status = 'pending_bids' THEN 1
            ELSE 2
          END as sort_priority
        FROM orders o
        LEFT JOIN users d ON o.assigned_driver_user_id = d.id
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN reviews r ON o.id = r.order_id AND r.reviewer_id = $1 AND r.reviewee_id = o.customer_id
        LEFT JOIN (
          SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
        ) dr ON dr.reviewee_id = u.id
        WHERE (o.status = 'pending_bids' AND o.assigned_driver_user_id IS NULL${locationConditions})
           OR o.assigned_driver_user_id = $1
        GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries, r.id
        ORDER BY sort_priority, o.created_at DESC
      `;
      params = [userId, ...filterParams];
      // Note: userId is used in WHERE clause as $1, and filterParams contains the location coordinates
    } else {
      // Admin sees all orders
      query = `
        SELECT
          o.*,
          json_build_object(
            'userId', d.id,
            'name', d.name,
            'rating', d.rating,
            'completedDeliveries', d.completed_deliveries
          ) as assignedDriver,
          json_agg(
            json_build_object(
              'userId', b.user_id,
              'driverName', u.name,
              'bidPrice', b.bid_price,
              'estimatedPickupTime', b.estimated_pickup_time,
              'estimatedDeliveryTime', b.estimated_delivery_time,
              'message', b.message,
              'driverRating', u.rating,
              'driverCompletedDeliveries', u.completed_deliveries,
              'driverReviewCount', COALESCE(dr.review_count, 0),
              'driverIsVerified', u.is_verified,
              'driverLocation', json_build_object('lat', b.driver_location_lat, 'lng', b.driver_location_lng)
            )
          ) FILTER (WHERE b.id IS NOT NULL) as bids,
          CASE
            WHEN o.assigned_driver_user_id IS NOT NULL THEN
              (SELECT json_build_object(
                'userId', ab.user_id,
                'driverName', au.name,
                'bidPrice', ab.bid_price,
                'estimatedPickupTime', ab.estimated_pickup_time,
                'estimatedDeliveryTime', ab.estimated_delivery_time,
                'message', ab.message,
                'driverRating', au.rating,
                'driverCompletedDeliveries', au.completed_deliveries,
                'driverReviewCount', COALESCE(adr.review_count, 0),
                'driverIsVerified', au.is_verified
              )
              FROM bids ab
              LEFT JOIN users au ON ab.user_id = au.id
              LEFT JOIN (
                SELECT reviewee_id, COUNT(*) as review_count
                FROM reviews
                GROUP BY reviewee_id
              ) adr ON adr.reviewee_id = au.id
              WHERE ab.order_id = o.id AND ab.user_id = o.assigned_driver_user_id)
            ELSE NULL
          END as acceptedBid
        FROM orders o
        LEFT JOIN users d ON o.assigned_driver_user_id = d.id
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN (
          SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
        ) dr ON dr.reviewee_id = u.id
        GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries
        ORDER BY o.created_at DESC
      `;
    }

    console.log('🔍 EXECUTING QUERY:');
    console.log('User role:', userRole);
    console.log('Query:', query);
    console.log('Params:', params);
    console.log('Location conditions applied:', !!locationConditions);
    if (userRole === 'driver') {
      console.log('Driver location from params:', { lng: params[1], lat: params[2] });
    }
    console.log('Filter object:', filters);

    const result = await pool.query(query, params);

    console.log('📊 Query returned', result.rows.length, 'orders');

    return result.rows.map(order => ({
      _id: order.id,
      title: order.title,
      description: order.description,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address,
      packageDescription: order.package_description,
      packageWeight: order.package_weight,
      estimatedValue: order.estimated_value,
      specialInstructions: order.special_instructions,
      price: parseFloat(order.price),
      status: order.status,
      orderNumber: order.order_number,
      createdAt: order.created_at,
      assignedDriver: order.assigneddriver,
      bids: order.bids || [],
      acceptedBid: order.acceptedbid,
      reviewStatus: order.reviewstatus || { reviews: { toDriver: false, toCustomer: false, toPlatform: false } },
      customerId: order.customer_id,
      from: order.from_coordinates ? {
        lat: parseFloat(order.from_coordinates.split(',')[0]),
        lng: parseFloat(order.from_coordinates.split(',')[1])
      } : null,
      to: order.to_coordinates ? {
        lat: parseFloat(order.to_coordinates.split(',')[0]),
        lng: parseFloat(order.to_coordinates.split(',')[1])
      } : null
    }));
  }

  /**
   * Create a new order
   */
  async createOrder(orderData, customerId) {
    console.log('🛠️ ORDER SERVICE - RECEIVED ORDER CREATION REQUEST');
    console.log('🛠️ ORDER SERVICE - RAW ORDER DATA RECEIVED:', JSON.stringify(orderData, null, 2));
    console.log('🛠️ ORDER SERVICE - CUSTOMER ID:', customerId);

    // Extract main order details for validation - directly from root level (fixed structure)
    let title = orderData.title;
    let price = parseFloat(orderData.price);
    console.log('🛠️ ORDER SERVICE - RECEIVED DATA STRUCTURE:', {
      hasTitle: !!orderData.title,
      hasPrice: !!orderData.price,
      hasPickupAddress: !!orderData.pickupAddress,
      hasDropoffAddress: !!orderData.dropoffAddress,
      showManualEntry: orderData.showManualEntry,
      hasPickupLocation: !!orderData.pickupLocation,
      hasDropoffLocation: !!orderData.dropoffLocation
    });

    // Basic validation for title and price
    if (!title || !title.trim()) {
      console.log('🛠️ ORDER SERVICE - THROWING: Order title is required');
      throw new Error('Order title is required');
    }
    if (!price || parseFloat(price) <= 0) {
      console.log('🛠️ ORDER SERVICE - THROWING: Order price must be greater than 0');
      throw new Error('Order price must be greater than 0');
    }
    console.log('🛠️ ORDER SERVICE - VALIDATION PASSED');

    const orderId = this.generateId();
    const orderNumber = `ORD-${Date.now()}`;

    let description, pickupLocation, dropoffLocation, package_description, package_weight, estimated_value, special_instructions;
    let pickupAddress, deliveryAddress, fromCoordinates, toCoordinates;

    console.log('🛠️ ORDER SERVICE - ORDER DATA STRUCTURE ANALYSIS:', {
      hasOrderData: !!orderData.orderData,
      hasShowManualEntry: orderData.showManualEntry !== undefined,
      hasPickupAddress: !!orderData.pickupAddress,
      hasDropoffAddress: !!orderData.dropoffAddress,
      hasPickupLocation: !!orderData.pickupLocation,
      hasDropoffLocation: !!orderData.dropoffLocation
    });

    // Extract additional order fields directly from root level (fixed structure)
    description = orderData.description;
    package_description = orderData.package_description;
    package_weight = orderData.package_weight ? parseFloat(orderData.package_weight) : null;
    estimated_value = orderData.estimated_value ? parseFloat(orderData.estimated_value) : null;
    special_instructions = orderData.special_instructions;

    console.log('🛠️ ORDER SERVICE - EXTRACTED ALL FIELDS:', {
      title, price, description, package_description, special_instructions
    });

    // Validate that coordinates are set (primary requirement)
    if (!orderData.pickupLocation?.coordinates || !orderData.dropoffLocation?.coordinates) {
      throw new Error('Please set pickup and delivery locations on the map or fill address fields (minimum country and city) to generate coordinates.');
    }

    // Build addresses from manual entry data if available
    const pa = orderData.pickupAddress;
    const da = orderData.dropoffAddress;

    if (pa && da) {
      // Build addresses from manual entry if provided
      pickupAddress = `${pa.personName || 'Contact'}, ${pa.street || ''} ${pa.building || ''}, ${pa.floor ? `Floor ${pa.floor}` : ''}, ${pa.apartment ? `Apt ${pa.apartment}` : ''}, ${pa.area || ''}, ${pa.city || ''}, ${pa.country || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '').replace(/,+/g, ', ');
      deliveryAddress = `${da.personName || 'Contact'}, ${da.street || ''} ${da.building || ''}, ${da.floor ? `Floor ${da.floor}` : ''}, ${da.apartment ? `Apt ${da.apartment}` : ''}, ${da.area || ''}, ${da.city || ''}, ${da.country || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '').replace(/,+/g, ', ');
    } else {
      // Use coordinates-only addresses (from map click)
      const pickupCoords = orderData.pickupLocation.coordinates;
      const dropoffCoords = orderData.dropoffLocation.coordinates;
      pickupAddress = `${pickupCoords.lat.toFixed(6)}, ${pickupCoords.lng.toFixed(6)}`;
      deliveryAddress = `${dropoffCoords.lat.toFixed(6)}, ${dropoffCoords.lng.toFixed(6)}`;
    }

    console.log('🛠️ ORDER SERVICE - BUILT ADDRESSES:', { pickupAddress, deliveryAddress });

    // Set coordinates from map location (guaranteed to exist from validation above)
    fromCoordinates = `${orderData.pickupLocation.coordinates.lat},${orderData.pickupLocation.coordinates.lng}`;
    toCoordinates = `${orderData.dropoffLocation.coordinates.lat},${orderData.dropoffLocation.coordinates.lng}`;

    const result = await pool.query(
      `INSERT INTO orders (
        id, customer_id, title, description, pickup_address, delivery_address,
        from_lat, from_lng, to_lat, to_lng, from_coordinates, to_coordinates,
        pickup_coordinates, delivery_coordinates, package_description, package_weight,
        estimated_value, special_instructions, price, status, order_number,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
      RETURNING *`,
      [
        orderId,
        customerId,
        this.sanitizeString(title, 200),
        this.sanitizeString(description, 1000),
        pickupAddress,
        deliveryAddress,
        parseFloat(fromCoordinates.split(',')[0]), // from_lat
        parseFloat(fromCoordinates.split(',')[1]), // from_lng
        parseFloat(toCoordinates.split(',')[0]), // to_lat
        parseFloat(toCoordinates.split(',')[1]), // to_lng
        fromCoordinates, // legacy from_coordinates
        toCoordinates, // legacy to_coordinates
        JSON.stringify({ lat: parseFloat(fromCoordinates.split(',')[0]), lng: parseFloat(fromCoordinates.split(',')[1]) }), // pickup_coordinates
        JSON.stringify({ lat: parseFloat(toCoordinates.split(',')[0]), lng: parseFloat(toCoordinates.split(',')[1]) }), // delivery_coordinates
        this.sanitizeString(package_description, 500),
        package_weight ? parseFloat(package_weight) : null,
        estimated_value ? parseFloat(estimated_value) : null,
        this.sanitizeString(special_instructions, 500),
        parseFloat(price),
        'pending_bids',
        orderNumber
      ]
    );

    const order = result.rows[0];

    logger.order('Order created successfully', {
      orderId: order.id,
      orderNumber: order.order_number,
      customerId,
      price: order.price,
      category: 'order'
    });

    return {
      _id: order.id,
      title: order.title,
      description: order.description,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address,
      packageDescription: order.package_description,
      packageWeight: order.package_weight,
      estimatedValue: order.estimated_value,
      specialInstructions: order.special_instructions,
      price: parseFloat(order.price),
      status: order.status,
      orderNumber: order.order_number,
      createdAt: order.created_at
    };
  }

  /**
   * Place a bid on an order
   */
  async placeBid(orderId, driverId, bidData) {
    const { bidPrice, estimatedPickupTime, estimatedDeliveryTime, message, location } = bidData;

    // Check if order exists and is available for bidding
    const orderCheck = await pool.query(
      'SELECT status, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderCheck.rows[0];
    if (order.status !== 'pending_bids' || order.assigned_driver_user_id) {
      throw new Error('Order is not available for bidding');
    }

    // Check if driver already bid on this order
    const existingBid = await pool.query(
      'SELECT id FROM bids WHERE order_id = $1 AND user_id = $2',
      [orderId, driverId]
    );

    if (existingBid.rows.length > 0) {
      throw new Error('You have already placed a bid on this order');
    }

    // Get driver's name
    const driverResult = await pool.query(
      'SELECT name FROM users WHERE id = $1',
      [driverId]
    );

    if (driverResult.rows.length === 0) {
      throw new Error('Driver not found');
    }

    const driverName = driverResult.rows[0].name;

    const result = await pool.query(
      `INSERT INTO bids (
        order_id, user_id, driver_name, bid_price, estimated_pickup_time,
        estimated_delivery_time, message, driver_location_lat, driver_location_lng, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id`,
      [
        orderId,
        driverId,
        driverName,
        parseFloat(bidPrice),
        estimatedPickupTime || null,
        estimatedDeliveryTime || null,
        this.sanitizeString(message, 500),
        location ? parseFloat(location.lat) : null,
        location ? parseFloat(location.lng) : null
      ]
    );

    const bidId = result.rows[0].id;

    logger.order('Bid placed successfully', {
      bidId,
      orderId,
      driverId,
      bidPrice,
      category: 'order'
    });

    return { message: 'Bid placed successfully' };
  }

  /**
   * Accept a bid on an order
   */
  async acceptBid(orderId, customerId, driverId) {
    // Check if order belongs to customer and is in correct state
    const orderCheck = await pool.query(
      'SELECT customer_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderCheck.rows[0];
    if (order.customer_id !== customerId) {
      throw new Error('Unauthorized');
    }

    if (order.status !== 'pending_bids') {
      throw new Error('Order is not available for bid acceptance');
    }

    // Check if bid exists
    const bidCheck = await pool.query(
      'SELECT id FROM bids WHERE order_id = $1 AND user_id = $2',
      [orderId, driverId]
    );

    if (bidCheck.rows.length === 0) {
      throw new Error('Bid not found');
    }

    // Update order with accepted bid
    await pool.query(
      'UPDATE orders SET status = $1, assigned_driver_user_id = $2, assigned_driver_name = (SELECT driver_name FROM bids WHERE order_id = $3 AND user_id = $2), assigned_driver_bid_price = (SELECT bid_price FROM bids WHERE order_id = $3 AND user_id = $2), price = (SELECT bid_price FROM bids WHERE order_id = $3 AND user_id = $2), accepted_at = NOW() WHERE id = $3',
      ['accepted', driverId, orderId]
    );

    logger.order('Bid accepted successfully', {
      orderId,
      customerId,
      driverId,
      category: 'order'
    });

    return { message: 'Bid accepted successfully' };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, driverId, action) {
    const validActions = ['pickup', 'in-transit', 'complete'];

    if (!validActions.includes(action)) {
      throw new Error('Invalid action');
    }

    // Check order ownership/assignment
    const orderCheck = await pool.query(
      'SELECT customer_id, assigned_driver_user_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderCheck.rows[0];

    // Validate permissions
    if (order.assigned_driver_user_id !== driverId) {
      throw new Error('Only assigned driver can perform this action');
    }

    // Validate status transitions
    const statusMap = {
      pickup: { from: 'accepted', to: 'picked_up' },
      'in-transit': { from: 'picked_up', to: 'in_transit' },
      complete: { from: 'in_transit', to: 'delivered' }
    };

    if (order.status !== statusMap[action].from) {
      throw new Error(`Order must be in ${statusMap[action].from} status`);
    }

    // Update order status
    let query = `UPDATE orders SET status = $1 WHERE id = $2`;
    let params = [statusMap[action].to, orderId];

    const updateFields = {
      pickup: 'picked_up_at = NOW()',
      complete: 'delivered_at = NOW()'
    };

    if (updateFields[action]) {
      query = `UPDATE orders SET status = $1, ${updateFields[action]} WHERE id = $2`;
    }

    await pool.query(query, params);

    // If order is completed, update driver stats
    if (action === 'complete') {
      await pool.query(
        'UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1',
        [driverId]
      );
    }

    logger.order('Order status updated successfully', {
      orderId,
      action,
      newStatus: statusMap[action].to,
      driverId,
      category: 'order'
    });

    return { message: `Order ${action} successful` };
  }

  /**
   * Get order tracking information with live route data
   */
  async getOrderTracking(orderId, userId) {
    const orderResult = await pool.query(
      `SELECT
        o.*,
        json_build_object(
          'userId', d.id,
          'name', d.name,
          'vehicleType', d.vehicle_type,
          'rating', d.rating
        ) as assignedDriver
      FROM orders o
      LEFT JOIN users d ON o.assigned_driver_user_id = d.id
      WHERE o.id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderResult.rows[0];

    // Check if user has permission to view this order
    if (order.customer_id !== userId && order.assigned_driver_user_id !== userId) {
      throw new Error('Unauthorized');
    }

    // Get location history with additional data
    const locationHistory = await pool.query(
      `SELECT latitude, longitude, timestamp, heading, speed_kmh, accuracy_meters, context as location_status
       FROM driver_locations
       WHERE order_id = $1
       ORDER BY timestamp`,
      [orderId]
    );

    // Determine the next color point based on order status
    let nextPoint = 'pickup';
    let currentStepIndex = 0;

    if (order.status === 'picked_up' || order.status === 'in_transit') {
      nextPoint = 'delivery';
      currentStepIndex = 1;
    } else if (order.status === 'delivered') {
      nextPoint = 'completed';
      currentStepIndex = 2;
    }

    // Calculate remaining distance and time to next point
    let distanceToNext = null;
    let timeToNext = null;
    let routeSteps = [];

    if (locationHistory.rows.length > 0 && (order.status === 'picked_up' || order.status === 'in_transit')) {
      const currentLocation = locationHistory.rows[locationHistory.rows.length - 1];
      const destination = {
        lat: parseFloat(order.to_coordinates.split(',')[0]),
        lng: parseFloat(order.to_coordinates.split(',')[1])
      };

      // Calculate straight-line distance using geolib
      distanceToNext = this.getDistance({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      }, destination) / 1000; // Convert to km

      // Estimate time based on speed (assume urban driving speed)
      const assumedSpeedKmh = currentLocation.speed_kmh || 25; // Default urban speed
      timeToNext = (distanceToNext / assumedSpeedKmh) * 60; // Convert to minutes

      // Create route steps for visualization
      routeSteps = [
        {
          id: 'pickup',
          type: 'pickup',
          address: order.pickup_address,
          coordinates: {
            lat: parseFloat(order.from_coordinates.split(',')[0]),
            lng: parseFloat(order.from_coordinates.split(',')[1])
          },
          status: order.status === 'picked_up' || order.status === 'in_transit' || order.status === 'delivered' ? 'completed' : 'upcoming',
          completedAt: order.picked_up_at
        },
        {
          id: 'delivery',
          type: 'delivery',
          address: order.delivery_address,
          coordinates: {
            lat: parseFloat(order.to_coordinates.split(',')[0]),
            lng: parseFloat(order.to_coordinates.split(',')[1])
          },
          status: order.status === 'delivered' ? 'completed' : 'upcoming',
          completedAt: order.delivered_at
        }
      ];
    }

    // Generate route polyline from location history (simplified version)
    let actualRoute = [];
    if (locationHistory.rows.length > 1) {
      actualRoute = locationHistory.rows.map(loc => [parseFloat(loc.longitude), parseFloat(loc.latitude)]);
    }

    // Calculate expected route (simplified straight line for demo)
    let expectedRoute = [];
    if (order.from_coordinates && order.to_coordinates && (order.status === 'picked_up' || order.status === 'in_transit')) {
      const from = {
        lat: parseFloat(order.from_coordinates.split(',')[0]),
        lng: parseFloat(order.from_coordinates.split(',')[1])
      };
      const to = {
        lat: parseFloat(order.to_coordinates.split(',')[0]),
        lng: parseFloat(order.to_coordinates.split(',')[1])
      };
      expectedRoute = [
        [from.lng, from.lat],
        [to.lng, to.lat]
      ];
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      trackingStatus: order.current_tracking_status || 'not_started',
      pickup: {
        address: order.pickup_address,
        coordinates: order.from_coordinates ? {
          lat: parseFloat(order.from_coordinates.split(',')[0]),
          lng: parseFloat(order.from_coordinates.split(',')[1])
        } : null,
        completedAt: order.picked_up_at
      },
      delivery: {
        address: order.delivery_address,
        coordinates: order.to_coordinates ? {
          lat: parseFloat(order.to_coordinates.split(',')[0]),
          lng: parseFloat(order.to_coordinates.split(',')[1])
        } : null,
        completedAt: order.delivered_at
      },
      driver: order.assigneddriver,
      currentLocation: locationHistory.rows.length > 0 ? {
        lat: parseFloat(locationHistory.rows[locationHistory.rows.length - 1].latitude),
        lng: parseFloat(locationHistory.rows[locationHistory.rows.length - 1].longitude),
        heading: locationHistory.rows[locationHistory.rows.length - 1].heading,
        speedKmh: locationHistory.rows[locationHistory.rows.length - 1].speed_kmh,
        accuracyMeters: locationHistory.rows[locationHistory.rows.length - 1].accuracy_meters,
        timestamp: locationHistory.rows[locationHistory.rows.length - 1].timestamp,
        status: locationHistory.rows[locationHistory.rows.length - 1].location_status
      } : null,
      locationHistory: locationHistory.rows.map(loc => ({
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
        timestamp: loc.timestamp,
        heading: loc.heading,
        speedKmh: loc.speed_kmh,
        accuracyMeters: loc.accuracy_meters,
        status: loc.location_status
      })),
      routes: {
        actual: actualRoute,
        expected: expectedRoute
      },
      nextPoint: {
        type: nextPoint,
        distanceKm: distanceToNext,
        estimatedTimeMinutes: timeToNext
      },
      routeSteps: routeSteps,
      createdAt: order.created_at,
      acceptedAt: order.accepted_at,
      pickedUpAt: order.picked_up_at,
      inTransitAt: order.in_transit_at,
      deliveredAt: order.delivered_at
    };
  }

  /**
   * Submit a review for an order
   */
  async submitReview(orderId, reviewerId, reviewData) {
    const {
      reviewType,
      rating,
      comment,
      professionalismRating,
      communicationRating,
      timelinessRating,
      conditionRating
    } = reviewData;

    if (!rating || rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Check if order exists and user has permission
    const orderCheck = await pool.query(
      'SELECT customer_id, assigned_driver_user_id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderCheck.rows[0];
    if (order.status !== 'delivered') {
      throw new Error('Can only review delivered orders');
    }

    let reviewerIdFinal, revieweeId, revieweeRole;

    if (reviewType === 'customer_to_driver') {
      if (order.customer_id !== reviewerId) {
        throw new Error('Unauthorized');
      }
      reviewerIdFinal = reviewerId;
      revieweeId = order.assigned_driver_user_id;
      revieweeRole = 'driver';
    } else if (reviewType === 'driver_to_customer') {
      if (order.assigned_driver_user_id !== reviewerId) {
        throw new Error('Unauthorized');
      }
      reviewerIdFinal = reviewerId;
      revieweeId = order.customer_id;
      revieweeRole = 'customer';
    } else if (reviewType.includes('_to_platform')) {
      reviewerIdFinal = reviewerId;
      revieweeId = null; // Platform reviews don't have a specific reviewee
      revieweeRole = 'platform';
    } else {
      throw new Error('Invalid review type');
    }

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE order_id = $1 AND reviewer_id = $2 AND review_type = $3',
      [orderId, reviewerIdFinal, reviewType]
    );

    if (existingReview.rows.length > 0) {
      throw new Error('Review already submitted for this order');
    }

    const reviewId = this.generateId();
    await pool.query(
      `INSERT INTO reviews (
        id, order_id, reviewer_id, reviewee_id, review_type, rating,
        comment, professionalism_rating, communication_rating,
        timeliness_rating, condition_rating, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
      [
        reviewId,
        orderId,
        reviewerIdFinal,
        revieweeId,
        reviewType,
        rating,
        this.sanitizeString(comment, 1000),
        professionalismRating || null,
        communicationRating || null,
        timelinessRating || null,
        conditionRating || null
      ]
    );

    // Update user rating if reviewing a user (not platform)
    if (revieweeId) {
      const avgRating = await pool.query(
        'SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = $1',
        [revieweeId]
      );

      if (avgRating.rows[0].avg_rating) {
        await pool.query(
          'UPDATE users SET rating = $1 WHERE id = $2',
          [parseFloat(avgRating.rows[0].avg_rating), revieweeId]
        );
      }
    }

    logger.order('Review submitted successfully', {
      reviewId,
      orderId,
      reviewType,
      reviewerId: reviewerIdFinal,
      revieweeId,
      rating,
      category: 'order'
    });

    return { message: 'Review submitted successfully' };
  }

  /**
   * Get reviews for an order
   */
  async getOrderReviews(orderId) {
    const reviews = await pool.query(
      `SELECT
        r.*,
        ru.name as reviewer_name,
        ru.role as reviewer_role,
        re.name as reviewee_name,
        re.role as reviewee_role
      FROM reviews r
      LEFT JOIN users ru ON r.reviewer_id = ru.id
      LEFT JOIN users re ON r.reviewee_id = re.id
      WHERE r.order_id = $1
      ORDER BY r.created_at DESC`,
      [orderId]
    );

    return reviews.rows.map(review => ({
      id: review.id,
      reviewerName: review.reviewer_name,
      reviewerRole: review.reviewer_role,
      revieweeName: review.reviewee_name,
      revieweeRole: review.reviewee_role,
      reviewType: review.review_type,
      rating: review.rating,
      comment: review.comment,
      professionalismRating: review.professionalism_rating,
      communicationRating: review.communication_rating,
      timelinessRating: review.timeliness_rating,
      conditionRating: review.condition_rating,
      createdAt: review.created_at
    }));
  }
}

module.exports = new OrderService();
