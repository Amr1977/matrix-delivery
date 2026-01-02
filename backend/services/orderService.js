const pool = require('../config/db');
const { getDistance } = require('geolib');
const logger = require('../config/logger');

// Register ts-node disabled
// require('ts-node/register');

// Import BalanceService (JavaScript)
const { BalanceService } = require('./balanceService.js');
const { PAYMENT_CONFIG } = require('../config/paymentConfig.js');
const balanceService = new BalanceService(pool);

// Environment is already loaded by server.js or jest.setup.js
// No need to call dotenv.config() here

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

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
   * Get single order by ID
   */
  async getOrderById(orderId) {
    const query = `
      SELECT
        o.*,
        o.pickup_contact_name as "pickupContactName",
        o.pickup_contact_phone as "pickupContactPhone",
        o.dropoff_contact_name as "dropoffContactName",
        o.dropoff_contact_phone as "dropoffContactPhone",
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
            'driverIsVerified', u.is_verified,
            'driverProfilePicture', u.profile_picture_url,
            'driverLocation', json_build_object('lat', b.driver_location_lat, 'lng', b.driver_location_lng)
          )
        ) FILTER(WHERE b.id IS NOT NULL) as bids,
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
              'driverIsVerified', au.is_verified
            )
            FROM bids ab
            LEFT JOIN users au ON ab.user_id = au.id
            WHERE ab.order_id = o.id AND ab.user_id = o.assigned_driver_user_id)
          ELSE NULL
        END as acceptedBid
      FROM orders o
      LEFT JOIN users d ON o.assigned_driver_user_id = d.id
      LEFT JOIN bids b ON o.id = b.order_id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE o.id = $1
      GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries
    `;

    const result = await pool.query(query, [orderId]);

    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];

    return {
      _id: order.id,
      id: order.id,
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
      assigned_driver_user_id: order.assigned_driver_user_id,
      customer_id: order.customer_id,
      bids: order.bids || [],
      acceptedBid: order.acceptedbid,
      pickupContactName: order.pickupContactName,
      pickupContactPhone: order.pickupContactPhone,
      dropoffContactName: order.dropoffContactName,
      dropoffContactPhone: order.dropoffContactPhone,
      pickupLocation: order.pickup_coordinates ? {
        coordinates: {
          lat: parseFloat(order.pickup_coordinates.lat || order.from_lat),
          lng: parseFloat(order.pickup_coordinates.lng || order.from_lng)
        }
      } : { coordinates: { lat: parseFloat(order.from_lat), lng: parseFloat(order.from_lng) } },
      dropoffLocation: order.delivery_coordinates ? {
        coordinates: {
          lat: parseFloat(order.delivery_coordinates.lat || order.to_lat),
          lng: parseFloat(order.delivery_coordinates.lng || order.to_lng)
        }
      } : { coordinates: { lat: parseFloat(order.to_lat), lng: parseFloat(order.to_lng) } }
    };
  }

  /**
   * Get orders for a user based on their primary_role
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
  o.pickup_contact_name as pickupContactName,
  o.pickup_contact_phone as pickupContactPhone,
  o.dropoff_contact_name as dropoffContactName,
  o.dropoff_contact_phone as dropoffContactPhone,
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
      'driverProfilePicture', u.profile_picture_url,
      'driverGender', COALESCE(u.gender, 'male'),
      'driverMemberSince', u.created_at,
      'driverLocation', json_build_object('lat', b.driver_location_lat, 'lng', b.driver_location_lng)
    )
  ) FILTER(WHERE b.id IS NOT NULL) as bids,
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
    'driverIsVerified', au.is_verified,
    'driverProfilePicture', au.profile_picture_url,
    'driverGender', COALESCE(au.gender, 'male'),
    'driverMemberSince', au.created_at
  )
              FROM bids ab
              LEFT JOIN users au ON ab.user_id = au.id
              LEFT JOIN(
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
        LEFT JOIN(
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
      let usePostGIS = false;

      // Distance-based filtering - try PostGIS first, fallback to geolib
      if (filters.driverLat !== undefined && filters.driverLng !== undefined && !isNaN(filters.driverLat) && !isNaN(filters.driverLng)) {
        // Try to use PostGIS for distance filtering
        try {
          // Test if PostGIS is available
          await pool.query('SELECT PostGIS_version()');

          locationConditions += ` AND ST_Distance(
    ST_Point(
      (o.pickup_coordinates ->> 'lng'):: float,
      (o.pickup_coordinates ->> 'lat'):: float
    ):: geography,
    ST_Point($2, $3):: geography
  ) <= 7000`;
          filterParams.push(filters.driverLng, filters.driverLat);
          usePostGIS = true;

          logger.info('PostGIS distance filter applied', {
            driverLng: filters.driverLng,
            driverLat: filters.driverLat,
            distanceThresholdMeters: 7000,
            category: 'orders'
          });
        } catch (postgisError) {
          logger.warn('PostGIS not available, will use geolib fallback', {
            error: postgisError.message,
            driverLat: filters.driverLat,
            driverLng: filters.driverLng,
            category: 'orders'
          });
          // Will filter in JavaScript after fetching all orders
          usePostGIS = false;
        }
      } else {
        // Driver has NO location. We must NOT show pending bids (unless we want to show all global bids, which might be too much)
        // Correct logic: If no location, invalidating the "pending_bids" part of the query by adding a FALSE condition
        // The OR clause (assigned orders) will still work.
        locationConditions += ' AND 1=0';

        logger.warn('Skipping distance filter - missing or invalid coordinates. Hiding pending bids.', {
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
          conditions.push(`o.pickup_address ILIKE $${paramIndex} `);
          filterParams.push(`% ${filters.country}% `);
          paramIndex += 1;
        }
        if (filters.city) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex} `);
          filterParams.push(`% ${filters.city}% `);
          paramIndex += 1;
        }
        if (filters.area) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex} `);
          filterParams.push(`% ${filters.area}% `);
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
  CASE WHEN o.assigned_driver_user_id = $1 THEN o.pickup_contact_name ELSE NULL END as "pickupContactName",
  CASE WHEN o.assigned_driver_user_id = $1 THEN o.pickup_contact_phone ELSE NULL END as "pickupContactPhone",
  CASE WHEN o.assigned_driver_user_id = $1 THEN o.dropoff_contact_name ELSE NULL END as "dropoffContactName",
  CASE WHEN o.assigned_driver_user_id = $1 THEN o.dropoff_contact_phone ELSE NULL END as "dropoffContactPhone",
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
  ) FILTER(WHERE b.id IS NOT NULL) as bids,
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
              LEFT JOIN(
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
        LEFT JOIN(
  SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
) dr ON dr.reviewee_id = u.id
WHERE(o.status = 'pending_bids' AND o.assigned_driver_user_id IS NULL${locationConditions})
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
  o.pickup_contact_name as "pickupContactName",
  o.pickup_contact_phone as "pickupContactPhone",
  o.dropoff_contact_name as "dropoffContactName",
  o.dropoff_contact_phone as "dropoffContactPhone",
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
  ) FILTER(WHERE b.id IS NOT NULL) as bids,
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
              LEFT JOIN(
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
        LEFT JOIN(
  SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
) dr ON dr.reviewee_id = u.id
        GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries
        ORDER BY o.created_at DESC
      `;
    }

    // Debug logging - only in debug mode to avoid memory overhead in production
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Executing orders query', {
        userRole,
        paramsCount: params.length,
        hasLocationConditions: !!locationConditions,
        category: 'orders'
      });
    }

    const result = await pool.query(query, params);

    let ordersToReturn = result.rows;

    // Apply geolib fallback filtering for drivers if PostGIS wasn't used
    if (userRole === 'driver' && !usePostGIS && filters.driverLat && filters.driverLng) {
      logger.info('Applying geolib distance filter', {
        totalOrders: ordersToReturn.length,
        driverLat: filters.driverLat,
        driverLng: filters.driverLng,
        category: 'orders'
      });

      ordersToReturn = ordersToReturn.filter(order => {
        // Only filter pending_bids orders, keep assigned orders
        if (order.assigned_driver_user_id === params[0]) {
          return true; // Always include driver's assigned orders
        }

        if (order.status !== 'pending_bids') {
          return true; // Keep non-pending orders
        }

        try {
          const pickupCoords = order.pickup_coordinates;
          if (!pickupCoords || !pickupCoords.lat || !pickupCoords.lng) {
            logger.warn('Order missing pickup coordinates', {
              orderId: order.id,
              category: 'orders'
            });
            return false;
          }

          const distance = getDistance(
            { latitude: filters.driverLat, longitude: filters.driverLng },
            { latitude: pickupCoords.lat, longitude: pickupCoords.lng }
          );

          const distanceKm = distance / 1000;
          const withinRange = distanceKm <= 7;

          logger.debug('Geolib distance calculated', {
            orderId: order.id,
            orderNumber: order.order_number,
            distanceKm: distanceKm.toFixed(2),
            withinRange,
            category: 'orders'
          });

          return withinRange;
        } catch (error) {
          logger.error('Error calculating distance with geolib', {
            error: error.message,
            orderId: order.id,
            category: 'orders'
          });
          return false;
        }
      });

      logger.info('Geolib filter applied', {
        originalCount: result.rows.length,
        filteredCount: ordersToReturn.length,
        removedCount: result.rows.length - ordersToReturn.length,
        category: 'orders'
      });
    }

    // Debug logging for contact info visibility
    if (ordersToReturn.length > 0 && userRole === 'driver') {
      const sample = ordersToReturn.find(o => o.assigned_driver_user_id);
      if (sample) {
        logger.info(`[DEBUG] Driver Order Check`, {
          inspectorId: params[0],
          orderId: sample.id,
          assignedDriverId: sample.assigned_driver_user_id,
          match: sample.assigned_driver_user_id == params[0],
          pickupContact: sample.pickupContactName, // Check raw alias return
          pickupContactRaw: sample.pickup_contact_name // Check column return if alias failed
        });
      }
    }

    return ordersToReturn.map(order => ({
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
      } : null,
      pickupContactName: order.pickupContactName,
      pickupContactPhone: order.pickupContactPhone,
      dropoffContactName: order.dropoffContactName,
      dropoffContactPhone: order.dropoffContactPhone
    }));
  }

  /**
   * Create a new order
   */
  async createOrder(orderData, customerId, customerName) {
    if (process.env.LOG_LEVEL === 'debug') {
      logger.debug('Order creation request', {
        customerId,
        hasTitle: !!orderData.title,
        hasPrice: !!orderData.price,
        category: 'order_creation'
      });
    }

    // Extract main order details for validation
    let title = orderData.title;
    let price = parseFloat(orderData.price);

    // Basic validation for title and price
    if (!title || !title.trim()) {
      throw new Error('Order title is required');
    }
    if (!price || parseFloat(price) <= 0) {
      throw new Error('Order price must be greater than 0');
    }

    const orderId = this.generateId();
    const orderNumber = `ORD - ${Date.now()} `;

    let description, pickupLocation, dropoffLocation, package_description, package_weight, estimated_value, special_instructions;
    let pickupAddress, deliveryAddress, fromCoordinates, toCoordinates;

    // Extract additional order fields directly from root level (fixed structure)
    description = orderData.description;
    package_description = orderData.package_description;
    package_weight = orderData.package_weight ? parseFloat(orderData.package_weight) : null;
    estimated_value = orderData.estimated_value ? parseFloat(orderData.estimated_value) : null;
    // Remove duplicate estimated_value assignment if present
    special_instructions = orderData.special_instructions;
    const estimated_delivery_date = orderData.estimated_delivery_date;

    // Validate that coordinates are set (primary requirement)
    if (!orderData.pickupLocation?.coordinates || !orderData.dropoffLocation?.coordinates) {
      throw new Error('Please set pickup and delivery locations on the map or fill address fields (minimum country and city) to generate coordinates.');
    }

    // Build addresses from manual entry data if available
    const pa = orderData.pickupAddress;
    const da = orderData.dropoffAddress;

    if (pa && da) {
      // Build addresses from manual entry if provided
      pickupAddress = `${pa.street || ''} ${pa.building ? `Building ${pa.building}` : ''}, ${pa.floor ? `Floor ${pa.floor}` : ''}, ${pa.apartment ? `Apt ${pa.apartment}` : ''}, ${pa.area || ''}, ${pa.city || ''}, ${pa.country || ''} `.replace(/, ,/g, ',').replace(/^,|,$/g, '').replace(/,+/g, ', ');
      deliveryAddress = `${da.street || ''} ${da.building ? `Building ${da.building}` : ''}, ${da.floor ? `Floor ${da.floor}` : ''}, ${da.apartment ? `Apt ${da.apartment}` : ''}, ${da.area || ''}, ${da.city || ''}, ${da.country || ''} `.replace(/, ,/g, ',').replace(/^,|,$/g, '').replace(/,+/g, ', ');
    } else {
      // Use coordinates-only addresses (from map click)
      const pickupCoords = orderData.pickupLocation.coordinates;
      const dropoffCoords = orderData.dropoffLocation.coordinates;
      pickupAddress = `${pickupCoords.lat.toFixed(6)}, ${pickupCoords.lng.toFixed(6)} `;
      deliveryAddress = `${dropoffCoords.lat.toFixed(6)}, ${dropoffCoords.lng.toFixed(6)} `;
    }

    // Extract separate contact info for new columns
    const pickupContactName = pa?.personName || null;
    const pickupContactPhone = pa?.personPhone || null;
    const dropoffContactName = da?.personName || null;
    const dropoffContactPhone = da?.personPhone || null;

    const queryText = `INSERT INTO orders(
  id, customer_id, title, description, pickup_address, delivery_address,
  from_lat, from_lng, to_lat, to_lng, from_coordinates, to_coordinates,
  pickup_coordinates, delivery_coordinates, package_description, package_weight,
  estimated_value, special_instructions, price, status, order_number,
  pickup_contact_name, pickup_contact_phone, dropoff_contact_name, dropoff_contact_phone,
  created_at, customer_name, estimated_delivery_date
) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), $26, $27)
RETURNING * `;

    const result = await pool.query(queryText,
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
        orderNumber,
        this.sanitizeString(pickupContactName, 255),
        this.sanitizeString(pickupContactPhone, 50),
        this.sanitizeString(dropoffContactName, 255),
        this.sanitizeString(dropoffContactPhone, 50),
        this.sanitizeString(customerName, 255),
        estimated_delivery_date || null
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
      `INSERT INTO bids(
  order_id, user_id, driver_name, bid_price, estimated_pickup_time,
  estimated_delivery_time, message, driver_location_lat, driver_location_lng, created_at
) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id`,
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

    // Send notification to customer
    try {
      const order = (await pool.query('SELECT customer_id, title FROM orders WHERE id = $1', [orderId])).rows[0];
      const { createNotification } = require('./notificationService');
      await createNotification(
        order.customer_id,
        orderId,
        'bid_placed',
        'New Bid Received',
        `${driverName} placed a bid of $${bidPrice} on your order "${order.title}"`
      );
    } catch (notifyError) {
      logger.error('Failed to send bid notification', notifyError);
    }

    return { message: 'Bid placed successfully' };
  }

  /**
   * Modify an existing bid
   */
  async modifyBid(orderId, driverId, bidData) {
    const { bidPrice, message } = bidData;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query('SELECT id, status, customer_id, order_number, title FROM orders WHERE id = $1', [orderId]);
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'pending_bids') {
        throw new Error('Cannot modify bid after order is no longer accepting bids');
      }

      const bidResult = await client.query('SELECT id FROM bids WHERE order_id = $1 AND user_id = $2', [orderId, driverId]);
      if (bidResult.rows.length === 0) {
        throw new Error('Bid not found for this driver');
      }
      const bidId = bidResult.rows[0].id;

      await client.query('UPDATE bids SET bid_price = $1, message = $2 WHERE id = $3', [bidPrice, message || null, bidId]);

      // Get driver name
      const driverResult = await client.query('SELECT name FROM users WHERE id = $1', [driverId]);
      const driverName = driverResult.rows[0]?.name || 'Driver';

      logger.order('Bid modified successfully', {
        bidId,
        orderId,
        driverId,
        bidPrice,
        category: 'order'
      });

      // Send notification using NotificationService
      try {
        const { createNotification } = require('./notificationService');
        await createNotification(
          order.customer_id,
          order.id,
          'bid_modified',
          'Bid Modified',
          `${driverName} updated their bid to $${parseFloat(bidPrice).toFixed(2)} for order "${order.title}"`
        );
      } catch (notifyError) {
        logger.error('Failed to send bid modification notification', notifyError);
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Accept a bid on an order
   */
  async acceptBid(orderId, customerId, driverId) {
    // Check if order belongs to customer and is in correct state
    const orderCheck = await pool.query(
      'SELECT customer_id, status, title, order_number FROM orders WHERE id = $1',
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
      'SELECT id, bid_price FROM bids WHERE order_id = $1 AND user_id = $2',
      [orderId, driverId]
    );

    if (bidCheck.rows.length === 0) {
      throw new Error('Bid not found');
    }


    // ✅ Check if driver can accept orders (debt check)
    const driverStatus = await balanceService.canAcceptOrders(driverId);

    if (!driverStatus.canAccept) {
      logger.warn('Driver cannot accept bid due to debt', {
        orderId,
        driverId,
        currentBalance: driverStatus.currentBalance,
        debtThreshold: driverStatus.debtThreshold,
        category: 'order'
      });
      throw new Error(
        `Cannot accept order: ${driverStatus.reason} `
      );
    }


    // Update order with accepted bid
    await pool.query(
      'UPDATE orders SET status = $1, assigned_driver_user_id = $2, assigned_driver_name = (SELECT driver_name FROM bids WHERE order_id = $3 AND user_id = $4), assigned_driver_bid_price = (SELECT bid_price FROM bids WHERE order_id = $3 AND user_id = $5), price = (SELECT bid_price FROM bids WHERE order_id = $3 AND user_id = $6), accepted_at = NOW() WHERE id = $3',
      ['accepted', driverId, orderId, driverId, driverId, driverId]
    );

    logger.order('Bid accepted successfully', {
      orderId,
      customerId,
      driverId,
      driverBalance: driverStatus.currentBalance,
      category: 'order'
    });

    // Send notification to driver
    try {
      const { createNotification } = require('./notificationService');
      await createNotification(
        driverId,
        orderId,
        'bid_accepted',
        'Bid Accepted! 🚀',
        `Your bid for order "${order.title}" (${order.order_number}) was accepted! Proceed to pickup.`
      );
    } catch (notifyError) {
      logger.error('Failed to send bid acceptance notification', notifyError);
    }

    return { message: 'Bid accepted successfully' };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, userId, action) {
    // Alias map to handle frontend calling 'picked_up' instead of 'pickup'
    const actionAlias = {
      'picked_up': 'pickup',
      'pickup': 'pickup',
      'in_transit': 'in-transit',
      'in-transit': 'in-transit',
      'delivered': 'complete', // Handle frontend 'delivered' action
      'complete': 'complete', // عك يعك عكا !!! صلح العك دة!!!
      'confirm_delivery': 'confirm_delivery' // NEW: Customer confirms delivery
    };

    const normalizedAction = actionAlias[action];

    if (!normalizedAction) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Check order ownership/assignment
    const orderCheck = await pool.query(
      'SELECT customer_id, assigned_driver_user_id, status, title, price FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderCheck.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderCheck.rows[0];

    // Validate permissions and actions
    if (normalizedAction === 'confirm_delivery') {
      if (order.customer_id !== userId) {
        throw new Error('Only customer can confirm delivery');
      }
    } else {
      // Driver actions
      if (order.assigned_driver_user_id !== userId) {
        throw new Error('Only assigned driver can perform this action');
      }
    }

    // Validate status transitions
    const statusMap = {
      pickup: { from: ['accepted'], to: 'picked_up' },
      'in-transit': { from: ['picked_up'], to: 'in_transit' },
      // Driver marks as complete -> pending confirmation
      complete: { from: ['in_transit', 'in-transit', 'picked_up'], to: 'delivered_pending' },
      // Customer confirms -> delivered
      confirm_delivery: { from: ['delivered_pending'], to: 'delivered' }
    };

    const transition = statusMap[normalizedAction];
    if (!transition) {
      throw new Error(`Invalid action transition for ${normalizedAction}`);
    }

    const expectedPreviousStatuses = transition.from;

    if (!expectedPreviousStatuses.includes(order.status)) {
      throw new Error(`Order must be in ${expectedPreviousStatuses.join(' or ')} status (current: ${order.status})`);
    }

    // Update order status
    let query = `UPDATE orders SET status = $1 WHERE id = $2`;
    let params = [transition.to, orderId];

    const updateFields = {
      pickup: 'picked_up_at = NOW()',
      // complete (driver) -> no timestamp update yet, or maybe 'arrived_at'? 
      complete: 'delivered_at = NOW()', // We can set it tentatively, or wait for confirm. Let's set it now.
      confirm_delivery: 'completed_at = NOW()' // Maybe a new field? Or just leave delivered_at.
    };

    if (updateFields[normalizedAction]) {
      query = `UPDATE orders SET status = $1, ${updateFields[normalizedAction]} WHERE id = $2`;
    }

    await pool.query(query, params);

    //TODO How about completed orders count for customer user!!
    // If order is confirmed by customer, update driver stats AND deduct commission
    if (normalizedAction === 'confirm_delivery') {
      await pool.query(
        'UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1',
        [order.assigned_driver_user_id]
      );

      // Deduct Commission
      const commission = (parseFloat(order.price) || 0) * PAYMENT_CONFIG.COMMISSION_RATE;
      if (commission > 0) {
        try {
          await balanceService.deductCommission(order.assigned_driver_user_id, orderId, commission);
          logger.info(`Commission of ${commission} deducted for order ${orderId}`);
          let driver_balance = await balanceService.getBalance(order.assigned_driver_user_id);
          logger.info(`Driver Balance: ` + JSON.stringify(driver_balance));
        } catch (commError) {
          logger.error('Failed to deduct commission', { orderId, error: commError.message });
          // We do NOT treat this as a failure of the API call, but we log it critical.
          // In real world, we might want to retry.
        }
      }

      // Credit driver (Earnings)
      // Usually, for COD, driver keeps cash (Price). Earning = Price - Commission.
      // But we track "Wallet Balance".
      // If COD: Driver gets Cash (+Price). Wallet Balance should decrease by Commission (-Commission).
      // So `deductCommission` does exactly that.
      // If Online Payment: Driver gets nothing locally. Wallet Balance should increase by (Price - Commission).
      // We assume COD for now or simplicity. 
      // If we supported Online Payment, we'd need to know payment method.
      // Let's assume COD implies: Driver holds cash (Debt).
      // Wait, `deductCommission` reduces balance.
      // If user starts with 0. 
      // Order 100. Commission 15.
      // Driver collects 100 Cash.
      // Wallet = 0 - 15 = -15.
      // Driver has 100 Cash + (-15 Wallet). Net +85. Correct.
      // Eventually Driver pays platform 15 to reset wallet.
    }

    logger.order('Order status updated successfully', {
      orderId,
      action: normalizedAction,
      newStatus: transition.to,
      userId,
      category: 'order'
    });

    // Notify users about status change
    try {
      const { createNotification } = require('./notificationService');
      let title, message, targetUserId;

      if (normalizedAction === 'pickup') {
        targetUserId = order.customer_id;
        title = 'Order Picked Up 📦';
        message = `Your order "${order.title}" has been picked up and is on the way!`;
      } else if (normalizedAction === 'in-transit') {
        targetUserId = order.customer_id;
        title = 'Order In Transit 🚚';
        message = `Your order "${order.title}" is now moving towards the destination.`;
      } else if (normalizedAction === 'complete') {
        // Driver marked as complete -> Notify Customer to Confirm
        targetUserId = order.customer_id;
        title = 'Delivery Confirmation Required ✅';
        message = `Driver marked "${order.title}" as delivered. Please confirm to complete the order.`;
      } else if (normalizedAction === 'confirm_delivery') {
        // Customer confirmed -> Notify Driver
        targetUserId = order.assigned_driver_user_id;
        title = 'Order Completed 🎉';
        message = `Customer confirmed delivery for "${order.title}". Great job!`;
      }

      if (title && targetUserId) {
        await createNotification(
          targetUserId,
          orderId,
          `order_${normalizedAction}`,
          title,
          message
        );
      }
    } catch (notifyError) {
      logger.error('Failed to send status update notification', notifyError);
    }

    return { message: `Order ${normalizedAction} successful` };
  }

  /**
   * Withdraw a bid
   */
  async withdrawBid(orderId, driverId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orderResult = await client.query('SELECT id, status, customer_id, order_number FROM orders WHERE id = $1', [orderId]);
      if (orderResult.rows.length === 0) {
        throw new Error('Order not found');
      }
      const order = orderResult.rows[0];

      if (order.status !== 'pending_bids') {
        throw new Error('Cannot withdraw bid after order is no longer accepting bids');
      }

      const bidResult = await client.query('SELECT id, bid_price FROM bids WHERE order_id = $1 AND user_id = $2', [orderId, driverId]);
      if (bidResult.rows.length === 0) {
        throw new Error('Bid not found for this driver');
      }
      const bid = bidResult.rows[0];

      await client.query('DELETE FROM bids WHERE id = $1', [bid.id]);

      // Get driver name for notification
      const driverResult = await client.query('SELECT name FROM users WHERE id = $1', [driverId]);
      const driverName = driverResult.rows[0]?.name || 'Driver';

      // Send notification using the NotificationService
      try {
        const { createNotification } = require('./notificationService');
        await createNotification(
          order.customer_id,
          order.id,
          'bid_withdrawn',
          'Bid Withdrawn',
          `${driverName} withdrew their bid`
        );
      } catch (notifyError) {
        logger.error('Failed to send withdrawn notification', notifyError);
        // Fallback to direct insert if service fails
        await client.query(
          `INSERT INTO notifications (user_id, order_id, type, title, message, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, false, NOW())`,
          [order.customer_id, order.id, 'bid_withdrawn', 'Bid Withdrawn', `${driverName} withdrew their bid`]
        );
      }

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
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

    let reviewerIdFinal, revieweeId, revieweeRole, reviewerRole;

    // Get reviewer's primary_role from database
    const reviewerResult = await pool.query('SELECT primary_role FROM users WHERE id = $1', [reviewerId]);
    if (reviewerResult.rows.length === 0) {
      throw new Error('Reviewer not found');
    }
    reviewerRole = reviewerResult.rows[0].primary_role;

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
      `INSERT INTO reviews(
    id, order_id, reviewer_id, reviewee_id, reviewer_role,
    review_type, rating, comment, professionalism_rating, communication_rating,
    timeliness_rating, condition_rating, created_at
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        reviewId,
        orderId,
        reviewerIdFinal,
        revieweeId,
        reviewerRole,
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
  ru.primary_role as reviewer_role,
  re.name as reviewee_name,
  re.primary_role as reviewee_role
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
