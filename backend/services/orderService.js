const pool = require("../config/db");
const { getDistance } = require("geolib");
const logger = require("../config/logger");

// Import BalanceService (JavaScript)
const { BalanceService } = require("./balanceService.js");
const { TakafulService } = require("./takafulService.js");
const { PAYMENT_CONFIG } = require("../config/paymentConfig.js");
const { orderFSMRegistry } = require("../fsm/OrderFSMRegistry");
const balanceService = new BalanceService(pool);
const takafulService = new TakafulService(pool);

// Environment is already loaded by server.js or jest.setup.js
// No need to call dotenv.config() here

const IS_TEST =
  process.env.NODE_ENV === "test" || process.env.NODE_ENV === "testing";

class OrderService {
  /**
   * Calculate distance between two points using geolib
   */
  getDistance(point1, point2) {
    logger.log("Point Object structure: " + JSON.stringify(point1));
    return getDistance(
      // عك يعك عكا!!!!!!!!!!!!!!!!!!!!!
      { lat: point1.latitude, lng: point1.longitude },
      { lat: point2.lat, lng: point2.lng },
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
    if (typeof str !== "string") return "";
    return str
      .trim()
      .substring(0, maxLength)
      .replace(/[<>"'&]/g, "");
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
        
        -- Customer Stats
        c.rating as "customerRating",
        c.created_at as "customerJoinedAt",
        c.is_verified as "customerIsVerified",
        (SELECT COUNT(*)::int FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.status IN ('delivered', 'DELIVERED', 'courier_delivered', 'customer_delivered', 'completed', 'COMPLETED')) as "customerCompletedOrders",
        (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = o.customer_id) as "customerReviewCount",
        (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewer_id = o.customer_id) as "customerGivenReviewCount",

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
      LEFT JOIN users c ON o.customer_id = c.id  -- Join Customer
      LEFT JOIN bids b ON o.id = b.order_id
      LEFT JOIN users u ON b.user_id = u.id
      WHERE o.id = $1
      GROUP BY o.id, d.id, c.id, d.name, d.rating, d.completed_deliveries
    `;

    const result = await pool.query(query, [orderId]);

    if (result.rows.length === 0) {
      return null;
    }

    const order = result.rows[0];

    return {
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
      pickupLocation: order.pickup_coordinates
        ? {
            coordinates: {
              lat: parseFloat(order.pickup_coordinates.lat || order.from_lat),
              lng: parseFloat(order.pickup_coordinates.lng || order.from_lng),
            },
          }
        : {
            coordinates: {
              lat: parseFloat(order.from_lat),
              lng: parseFloat(order.from_lng),
            },
          },
      dropoffLocation: order.delivery_coordinates
        ? {
            coordinates: {
              lat: parseFloat(order.delivery_coordinates.lat || order.to_lat),
              lng: parseFloat(order.delivery_coordinates.lng || order.to_lng),
            },
          }
        : {
            coordinates: {
              lat: parseFloat(order.to_lat),
              lng: parseFloat(order.to_lng),
            },
          },

      // Missing Fields Injection
      upfrontPayment: order.upfront_payment
        ? parseFloat(order.upfront_payment)
        : 0,
      requireUpfrontPayment: order.require_upfront_payment,
      customerRating: order.customerRating,
      customerJoinedAt: order.customerJoinedAt,
      customerIsVerified: order.customerIsVerified,
      customerCompletedOrders: order.customerCompletedOrders,
      customerReviewCount: order.customerReviewCount,
      customerGivenReviewCount: order.customerGivenReviewCount,
    };
  }

  /**
   * Get orders for a user based on their primary_role
   */
  async getOrders(userId, userRole, filters = {}) {
    let query;
    let params = [];
    let locationConditions = "";
    let usePostGIS = false;

    if (userRole === "customer") {
      // Customers see their own orders
      query = `
SELECT
o.*,
  o.pickup_contact_name as pickupContactName,
  o.pickup_contact_phone as pickupContactPhone,
  o.dropoff_contact_name as dropoffContactName,
  o.dropoff_contact_phone as dropoffContactPhone,

  -- Customer Stats (for driver view when viewing this customer's order)
  (SELECT rating FROM users WHERE id = o.customer_id) as "customerRating",
  (SELECT created_at FROM users WHERE id = o.customer_id) as "customerJoinedAt",
  (SELECT is_verified FROM users WHERE id = o.customer_id) as "customerIsVerified",
  (SELECT COUNT(*)::int FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.status IN ('delivered', 'DELIVERED', 'courier_delivered', 'customer_delivered', 'completed', 'COMPLETED')) as "customerCompletedOrders",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = o.customer_id) as "customerReviewCount",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewer_id = o.customer_id) as "customerGivenReviewCount",

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
        AND o.status NOT IN ('delivered', 'courier_delivered', 'customer_delivered', 'cancelled')
        GROUP BY o.id, d.id, d.name, d.rating, d.completed_deliveries, r.id
        ORDER BY o.created_at DESC
      `;
      params = [userId];
    } else if (userRole === "driver") {
      // Reset location conditions for driver
      locationConditions = "";
      const filterParams = [];
      // usePostGIS initialized at function scope

      // Distance-based filtering - try PostGIS first, fallback to geolib
      if (
        filters.driverLat !== undefined &&
        filters.driverLng !== undefined &&
        !isNaN(filters.driverLat) &&
        !isNaN(filters.driverLng)
      ) {
        // Try to use PostGIS for distance filtering
        try {
          // Test if PostGIS is available
          await pool.query("SELECT PostGIS_version()");

          locationConditions += ` AND ST_Distance(
    ST_Point(
      (o.pickup_coordinates ->> 'lng'):: float,
      (o.pickup_coordinates ->> 'lat'):: float
    ):: geography,
    ST_Point($2, $3):: geography
  ) <= 7000`;
          filterParams.push(filters.driverLng, filters.driverLat);
          usePostGIS = true;

          logger.info("PostGIS distance filter applied", {
            driverLng: filters.driverLng,
            driverLat: filters.driverLat,
            distanceThresholdMeters: 7000,
            category: "orders",
          });
        } catch (postgisError) {
          logger.warn("PostGIS not available, will use geolib fallback", {
            error: postgisError.message,
            driverLat: filters.driverLat,
            driverLng: filters.driverLng,
            category: "orders",
          });
          // Will filter in JavaScript after fetching all orders
          usePostGIS = false;
        }
      } else {
        // Driver has NO location. We must NOT show pending bids (unless we want to show all global bids, which might be too much)
        // Correct logic: If no location, invalidating the "pending_bids" part of the query by adding a FALSE condition
        // The OR clause (assigned orders) will still work.
        locationConditions += " AND 1=0";

        logger.warn(
          "Skipping distance filter - missing or invalid coordinates. Hiding pending bids.",
          {
            driverLat: filters.driverLat,
            driverLng: filters.driverLng,
            isNaNLat: isNaN(filters.driverLat),
            isNaNLng: isNaN(filters.driverLng),
            category: "orders",
          },
        );
      }

      // Cash capacity filtering - only show orders driver can afford
      if (filters.driverCash !== undefined && filters.driverCash >= 0) {
        // Orders with no upfront payment (NULL or 0) are visible to all drivers
        // Orders with upfront payment are only visible if driver has sufficient cash
        let paramIndex = filterParams.length + 2; // Account for userId ($1) and existing params
        if (filterParams.length === 0) {
          paramIndex = 2; // No location params, so start at $2
        }

        locationConditions += ` AND (o.upfront_payment IS NULL OR o.upfront_payment = 0 OR o.upfront_payment <= $${paramIndex})`;
        filterParams.push(filters.driverCash);

        logger.info("Cash capacity filter applied", {
          driverCash: filters.driverCash,
          paramIndex,
          category: "orders",
        });
      }

      // Additional text-based filters
      if (filters.country || filters.city || filters.area) {
        const conditions = [];
        let paramIndex = filterParams.length + 2; // Start after userId ($1) and any existing location params

        if (filters.country) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex} `);
          filterParams.push(`%${filters.country}%`);
          paramIndex += 1;
        }
        if (filters.city) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex} `);
          filterParams.push(`%${filters.city}%`);
          paramIndex += 1;
        }
        if (filters.area) {
          conditions.push(`o.pickup_address ILIKE $${paramIndex} `);
          filterParams.push(`%${filters.area}%`);
          paramIndex += 1;
        }

        if (conditions.length > 0) {
          locationConditions += " AND (" + conditions.join(" AND ") + ")";
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
  
  -- Customer Stats
  c.rating as "customerRating",
  c.created_at as "customerJoinedAt",
  c.is_verified as "customerIsVerified",
  (SELECT COUNT(*)::int FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.status IN ('delivered', 'DELIVERED', 'courier_delivered', 'customer_delivered', 'completed', 'COMPLETED')) as "customerCompletedOrders",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = o.customer_id) as "customerReviewCount",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewer_id = o.customer_id) as "customerGivenReviewCount",

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
      'driverImage', u.profile_picture_url,
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
    'driverImage', au.profile_picture_url,
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
        LEFT JOIN users c ON o.customer_id = c.id  -- Join Customer
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN reviews r ON o.id = r.order_id AND r.reviewer_id = $1 AND r.reviewee_id = o.customer_id
        LEFT JOIN(
  SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
) dr ON dr.reviewee_id = u.id
WHERE(o.status = 'pending_bids' AND o.assigned_driver_user_id IS NULL${locationConditions})
           OR (o.assigned_driver_user_id = $1 AND o.status NOT IN ('delivered', 'courier_delivered', 'customer_delivered', 'cancelled'))
        GROUP BY o.id, d.id, c.id, d.name, d.rating, d.completed_deliveries, r.id
        ORDER BY sort_priority, o.created_at DESC
  `;
      params = [userId, ...filterParams];
      // Note: userId is used in WHERE clause as $1, and filterParams contains the location coordinates
    } else {
      // Admin sees all orders
      params = [userId];
      query = `
SELECT
o.*,
  o.pickup_contact_name as "pickupContactName",
  o.pickup_contact_phone as "pickupContactPhone",
  o.dropoff_contact_name as "dropoffContactName",
  CASE WHEN o.assigned_driver_user_id = $1 THEN o.dropoff_contact_phone ELSE NULL END as "dropoffContactPhone",
  
  -- Customer Stats
  c.rating as "customerRating",
  c.created_at as "customerJoinedAt",
  c.is_verified as "customerIsVerified",
  (SELECT COUNT(*)::int FROM orders o2 WHERE o2.customer_id = o.customer_id AND o2.status IN ('delivered', 'DELIVERED', 'courier_delivered', 'customer_delivered', 'completed', 'COMPLETED')) as "customerCompletedOrders",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewee_id = o.customer_id) as "customerReviewCount",
  (SELECT COUNT(*)::int FROM reviews r WHERE r.reviewer_id = o.customer_id) as "customerGivenReviewCount",

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
        LEFT JOIN users c ON o.customer_id = c.id  -- Join Customer
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN(
  SELECT reviewee_id, COUNT(*) as review_count
          FROM reviews
          GROUP BY reviewee_id
) dr ON dr.reviewee_id = u.id
        GROUP BY o.id, d.id, c.id, d.name, d.rating, d.completed_deliveries
        ORDER BY o.created_at DESC
      `;
    }

    // Debug logging - only in debug mode to avoid memory overhead in production
    if (process.env.LOG_LEVEL === "debug") {
      logger.debug("Executing orders query", {
        userRole,
        paramsCount: params.length,
        hasLocationConditions: !!locationConditions,
        category: "orders",
      });
    }

    const result = await pool.query(query, params);

    let ordersToReturn = result.rows;

    // Apply geolib fallback filtering for drivers if PostGIS wasn't used
    if (
      userRole === "driver" &&
      !usePostGIS &&
      filters.driverLat &&
      filters.driverLng
    ) {
      logger.info("Applying geolib distance filter", {
        totalOrders: ordersToReturn.length,
        driverLat: filters.driverLat,
        driverLng: filters.driverLng,
        category: "orders",
      });

      ordersToReturn = ordersToReturn.filter((order) => {
        // Only filter pending_bids orders, keep assigned orders
        if (order.assigned_driver_user_id === params[0]) {
          return true; // Always include driver's assigned orders
        }

        if (order.status !== "pending_bids") {
          return true; // Keep non-pending orders
        }

        try {
          const pickupCoords = order.pickup_coordinates;
          if (!pickupCoords || !pickupCoords.lat || !pickupCoords.lng) {
            logger.warn("Order missing pickup coordinates", {
              orderId: order.id,
              category: "orders",
            });
            return false;
          }

          const distance = getDistance(
            { latitude: filters.driverLat, longitude: filters.driverLng },
            { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
          );

          const distanceKm = distance / 1000;
          const withinRange = distanceKm <= 7;

          logger.debug("Geolib distance calculated", {
            orderId: order.id,
            orderNumber: order.order_number,
            distanceKm: distanceKm.toFixed(2),
            withinRange,
            category: "orders",
          });

          return withinRange;
        } catch (error) {
          logger.error("Error calculating distance with geolib", {
            error: error.message,
            orderId: order.id,
            category: "orders",
          });
          return false;
        }
      });

      logger.info("Geolib filter applied", {
        originalCount: result.rows.length,
        filteredCount: ordersToReturn.length,
        removedCount: result.rows.length - ordersToReturn.length,
        category: "orders",
      });
    }

    // Debug logging for contact info visibility
    if (ordersToReturn.length > 0 && userRole === "driver") {
      const sample = ordersToReturn.find((o) => o.assigned_driver_user_id);
      if (sample) {
        logger.info(`[DEBUG] Driver Order Check`, {
          inspectorId: params[0],
          orderId: sample.id,
          assignedDriverId: sample.assigned_driver_user_id,
          match: sample.assigned_driver_user_id == params[0],
          pickupContact: sample.pickupContactName, // Check raw alias return
          pickupContactRaw: sample.pickup_contact_name, // Check column return if alias failed
        });
      }
    }

    return ordersToReturn.map((order) => ({
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
      bids: order.bids || [],
      acceptedBid: order.acceptedbid,
      reviewStatus: order.reviewstatus || {
        reviews: { toDriver: false, toCustomer: false, toPlatform: false },
      },
      customerId: order.customer_id,
      // Customer Stats Injection
      customerRating: order.customerRating,
      customerJoinedAt: order.customerJoinedAt,
      customerIsVerified: order.customerIsVerified,
      customerCompletedOrders: order.customerCompletedOrders,
      customerReviewCount: order.customerReviewCount,
      customerGivenReviewCount: order.customerGivenReviewCount,

      // Financial & Upfront Payment
      requireUpfrontPayment: order.require_upfront_payment,
      upfrontPayment: order.upfront_payment
        ? parseFloat(order.upfront_payment)
        : null,

      // Route Persistence
      routePolyline: order.route_polyline,
      estimatedDistanceKm: order.estimated_distance_km
        ? parseFloat(order.estimated_distance_km)
        : null,
      estimatedDurationMinutes: order.estimated_duration_minutes,

      from: order.from_coordinates
        ? {
            lat: parseFloat(order.from_coordinates.split(",")[0]),
            lng: parseFloat(order.from_coordinates.split(",")[1]),
          }
        : null,
      to: order.to_coordinates
        ? {
            lat: parseFloat(order.to_coordinates.split(",")[0]),
            lng: parseFloat(order.to_coordinates.split(",")[1]),
          }
        : null,
      pickupContactName: order.pickupContactName,
      pickupContactPhone: order.pickupContactPhone,
      dropoffContactName: order.dropoffContactName,
      dropoffContactPhone: order.dropoffContactPhone,
    }));
  }

  /**
   * Create a new order
   */
  async createOrder(orderData, customerId, customerName) {
    if (process.env.LOG_LEVEL === "debug") {
      logger.debug("Order creation request", {
        customerId,
        hasTitle: !!orderData.title,
        hasPrice: !!orderData.price,
        category: "order_creation",
      });
    }

    // Extract main order details for validation
    let title = orderData.title;
    let price = parseFloat(orderData.price); // This is the estimated delivery fee
    const upfrontPayment = parseFloat(orderData.upfront_payment) || 0; // Default 0

    // Basic validation for title and price
    if (!title || !title.trim()) {
      throw new Error("Order title is required");
    }
    if (!price || parseFloat(price) <= 0) {
      throw new Error("Order price must be greater than 0");
    }

    // ✅ PREPAID: Check customer balance for prepaid orders (full amount required)
    const paymentMethod = orderData.payment_method || "COD";
    if (paymentMethod === "PREPAID") {
      const balanceCheck = await balanceService.checkOrderBalance(
        customerId,
        upfrontPayment,
        price,
      );
      if (!balanceCheck.canCreate) {
        throw new Error(
          `Insufficient balance for Prepaid order. Required: ${balanceCheck.requiredBalance} EGP, Available: ${balanceCheck.availableBalance} EGP. Please top up ${balanceCheck.shortfall} EGP.`,
        );
      }
    } else {
      // COD: No balance check needed - courier collects cash on delivery
    }

    const orderId = this.generateId();
    const orderNumber = `ORD - ${Date.now()} `;

    let description,
      pickupLocation,
      dropoffLocation,
      package_description,
      package_weight,
      estimated_value,
      special_instructions;
    let pickupAddress, deliveryAddress, fromCoordinates, toCoordinates;

    // Extract additional order fields directly from root level (fixed structure)
    description = orderData.description;
    package_description = orderData.package_description;
    package_weight = orderData.package_weight
      ? parseFloat(orderData.package_weight)
      : null;
    estimated_value = orderData.estimated_value
      ? parseFloat(orderData.estimated_value)
      : null;
    // Remove duplicate estimated_value assignment if present
    special_instructions = orderData.special_instructions;
    const estimated_delivery_date = orderData.estimated_delivery_date;

    // Validate that coordinates are set (primary requirement)
    if (
      !orderData.pickupLocation?.coordinates ||
      !orderData.dropoffLocation?.coordinates
    ) {
      throw new Error(
        "Please set pickup and delivery locations on the map or fill address fields (minimum country and city) to generate coordinates.",
      );
    }

    // Set coordinates for DB (Format: "lat,lng")
    fromCoordinates = `${orderData.pickupLocation.coordinates.lat},${orderData.pickupLocation.coordinates.lng}`;
    toCoordinates = `${orderData.dropoffLocation.coordinates.lat},${orderData.dropoffLocation.coordinates.lng}`;

    // Build addresses from manual entry data if available
    const pa = orderData.pickupAddress;
    const da = orderData.dropoffAddress;

    if (pa && da) {
      // Build addresses from manual entry if provided
      pickupAddress =
        `${pa.street || ""} ${pa.building ? `Building ${pa.building}` : ""}, ${pa.floor ? `Floor ${pa.floor}` : ""}, ${pa.apartment ? `Apt ${pa.apartment}` : ""}, ${pa.area || ""}, ${pa.city || ""}, ${pa.country || ""} `
          .replace(/, ,/g, ",")
          .replace(/^,|,$/g, "")
          .replace(/,+/g, ", ");
      deliveryAddress =
        `${da.street || ""} ${da.building ? `Building ${da.building}` : ""}, ${da.floor ? `Floor ${da.floor}` : ""}, ${da.apartment ? `Apt ${da.apartment}` : ""}, ${da.area || ""}, ${da.city || ""}, ${da.country || ""} `
          .replace(/, ,/g, ",")
          .replace(/^,|,$/g, "")
          .replace(/,+/g, ", ");
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

    // Extract Route Info
    const routePolyline = orderData.routeInfo?.polyline || null;
    const estimatedDistanceKm = orderData.routeInfo?.distance_km || null;
    const estimatedDurationMinutes =
      orderData.routeInfo?.estimates?.car?.duration_minutes ||
      orderData.routeInfo?.estimates?.van?.duration_minutes ||
      null;

    const queryText = `INSERT INTO orders(
  id,
  customer_id, 
  title, 
  description, 
  pickup_address, 
  delivery_address,
  from_lat, 
  from_lng, 
  to_lat, 
  to_lng, 
  from_coordinates, 
  to_coordinates,
  pickup_coordinates, 
  delivery_coordinates, 
  package_description, 
  package_weight,
  estimated_value, 
  special_instructions, 
  price, status, 
  order_number,
  pickup_contact_name, 
  pickup_contact_phone, 
  dropoff_contact_name, 
  dropoff_contact_phone,
  created_at, 
  customer_name, 
  estimated_delivery_date,
  require_upfront_payment, 
  upfront_payment,
  route_polyline, 
  estimated_distance_km, 
  estimated_duration_minutes,
  payment_method
) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), $26, $27, $28, $29, $30, $31, $32, $33)
RETURNING * `;

    const result = await pool.query(queryText, [
      orderId,
      customerId,
      this.sanitizeString(title, 200),
      this.sanitizeString(description, 1000),
      pickupAddress,
      deliveryAddress,
      parseFloat(fromCoordinates.split(",")[0]), // from_lat
      parseFloat(fromCoordinates.split(",")[1]), // from_lng
      parseFloat(toCoordinates.split(",")[0]), // to_lat
      parseFloat(toCoordinates.split(",")[1]), // to_lng
      fromCoordinates, // legacy from_coordinates
      toCoordinates, // legacy to_coordinates
      JSON.stringify({
        lat: parseFloat(fromCoordinates.split(",")[0]),
        lng: parseFloat(fromCoordinates.split(",")[1]),
      }), // pickup_coordinates
      JSON.stringify({
        lat: parseFloat(toCoordinates.split(",")[0]),
        lng: parseFloat(toCoordinates.split(",")[1]),
      }), // delivery_coordinates
      this.sanitizeString(package_description, 500),
      package_weight ? parseFloat(package_weight) : null,
      estimated_value ? parseFloat(estimated_value) : null,
      this.sanitizeString(special_instructions, 500),
      parseFloat(price),
      "pending_bids",
      orderNumber,
      this.sanitizeString(pickupContactName, 255),
      this.sanitizeString(pickupContactPhone, 50),
      this.sanitizeString(dropoffContactName, 255),
      this.sanitizeString(dropoffContactPhone, 50),
      this.sanitizeString(customerName, 255),
      estimated_delivery_date || null,
      !!orderData.require_upfront_payment, // $28
      orderData.upfront_payment ? parseFloat(orderData.upfront_payment) : null, // $29
      routePolyline, // $30
      estimatedDistanceKm, // $31
      estimatedDurationMinutes ? Math.round(estimatedDurationMinutes) : null, // $32
      orderData.payment_method || "COD", // $33
    ]);

    const order = result.rows[0];

    logger.order("Order created successfully", {
      orderId: order.id,
      orderNumber: order.order_number,
      customerId,
      price: order.price,
      category: "order",
    });

    // Return the full hydrated order (with stats)
    return await this.getOrderById(order.id);
  }

  /**
   * Place a bid on an order
   */
  async placeBid(orderId, driverId, bidData) {
    const {
      bidPrice,
      estimatedPickupTime,
      estimatedDeliveryTime,
      message,
      location,
    } = bidData;

    // Check if order exists and is available for bidding
    const orderCheck = await pool.query(
      "SELECT status, assigned_driver_user_id FROM orders WHERE id = $1",
      [orderId],
    );

    if (orderCheck.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderCheck.rows[0];
    if (order.status !== "pending_bids" || order.assigned_driver_user_id) {
      throw new Error("Order is not available for bidding");
    }

    // ✅ COD MODEL: Check minimum bid amount
    const minimumBid = parseFloat(process.env.MINIMUM_BID_AMOUNT) || 10;
    if (parseFloat(bidPrice) < minimumBid) {
      throw new Error(`Minimum bid amount is ${minimumBid} EGP`);
    }

    // ✅ COD MODEL: Check driver balance threshold for bidding
    const bidCheck = await balanceService.canBid(driverId);
    if (!bidCheck.canBid) {
      // Allow bidding if driver has active orders (can't trap mid-delivery)
      const hasActive = await balanceService.hasActiveOrders(driverId);
      if (!hasActive) {
        throw new Error(bidCheck.reason);
      }
    }

    // Check if driver already bid on this order
    const existingBid = await pool.query(
      "SELECT id FROM bids WHERE order_id = $1 AND user_id = $2",
      [orderId, driverId],
    );

    if (existingBid.rows.length > 0) {
      throw new Error("You have already placed a bid on this order");
    }

    // Get driver's name
    const driverResult = await pool.query(
      "SELECT name FROM users WHERE id = $1",
      [driverId],
    );

    if (driverResult.rows.length === 0) {
      throw new Error("Driver not found");
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
        location ? parseFloat(location.lng) : null,
      ],
    );

    const bidId = result.rows[0].id;

    logger.order("Bid placed successfully", {
      bidId,
      orderId,
      driverId,
      bidPrice,
      category: "order",
    });

    // Send notification to customer
    try {
      const order = (
        await pool.query(
          "SELECT customer_id, title FROM orders WHERE id = $1",
          [orderId],
        )
      ).rows[0];
      const { createNotification } = require("./notificationService");
      await createNotification(
        order.customer_id,
        orderId,
        "bid_placed",
        "New Bid Received",
        `${driverName} placed a bid of $${bidPrice} on your order "${order.title}"`,
      );
    } catch (notifyError) {
      logger.error("Failed to send bid notification", notifyError);
    }

    return { message: "Bid placed successfully" };
  }

  /**
   * Modify an existing bid
   */
  async modifyBid(orderId, driverId, bidData) {
    const { bidPrice, message } = bidData;

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        "SELECT id, status, customer_id, order_number, title FROM orders WHERE id = $1",
        [orderId],
      );
      if (orderResult.rows.length === 0) {
        throw new Error("Order not found");
      }
      const order = orderResult.rows[0];

      if (order.status !== "pending_bids") {
        throw new Error(
          "Cannot modify bid after order is no longer accepting bids",
        );
      }

      // ✅ COD MODEL: Check minimum bid amount
      const minimumBid = parseFloat(process.env.MINIMUM_BID_AMOUNT) || 10;
      if (parseFloat(bidPrice) < minimumBid) {
        throw new Error(`Minimum bid amount is ${minimumBid} EGP`);
      }

      const bidResult = await client.query(
        "SELECT id FROM bids WHERE order_id = $1 AND user_id = $2",
        [orderId, driverId],
      );
      if (bidResult.rows.length === 0) {
        throw new Error("Bid not found for this driver");
      }
      const bidId = bidResult.rows[0].id;

      await client.query(
        "UPDATE bids SET bid_price = $1, message = $2 WHERE id = $3",
        [bidPrice, message || null, bidId],
      );

      // Get driver name
      const driverResult = await client.query(
        "SELECT name FROM users WHERE id = $1",
        [driverId],
      );
      const driverName = driverResult.rows[0]?.name || "Driver";

      logger.order("Bid modified successfully", {
        bidId,
        orderId,
        driverId,
        bidPrice,
        category: "order",
      });

      // Send notification using NotificationService
      try {
        const { createNotification } = require("./notificationService");
        await createNotification(
          order.customer_id,
          order.id,
          "bid_modified",
          "Bid Modified",
          `${driverName} updated their bid to $${parseFloat(bidPrice).toFixed(2)} for order "${order.title}"`,
        );
      } catch (notifyError) {
        logger.error(
          "Failed to send bid modification notification",
          notifyError,
        );
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Driver withdraws from an accepted order
   */
  async withdrawOrder(orderId, driverId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Check order status
      const orderCheck = await client.query(
        "SELECT status, assigned_driver_user_id, title, customer_id FROM orders WHERE id = $1",
        [orderId],
      );

      if (orderCheck.rows.length === 0) {
        throw new Error("Order not found");
      }

      const order = orderCheck.rows[0];

      if (order.assigned_driver_user_id !== driverId) {
        throw new Error("Unauthorized");
      }

      if (order.status !== "accepted") {
        throw new Error(`Cannot withdraw from order in ${order.status} status`);
      }

      // Reset order to pending_bids
      await client.query(
        "UPDATE orders SET status = $1, assigned_driver_user_id = NULL, assigned_driver_name = NULL, assigned_driver_bid_price = NULL, accepted_at = NULL WHERE id = $2",
        ["pending_bids", orderId],
      );

      logger.order("Driver withdrew from order", {
        orderId,
        driverId,
        category: "order",
      });

      // Notify customer
      try {
        const { createNotification } = require("./notificationService");
        await createNotification(
          order.customer_id,
          orderId,
          "driver_withdrawal",
          "Driver Withdrew",
          `Driver has withdrawn from order "${order.title}". The order is back to pending bids.`,
        );
      } catch (notifyError) {
        logger.error("Failed to send withdrawal notification", notifyError);
      }

      await client.query("COMMIT");
      return { message: "Withdrawal successful" };
    } catch (error) {
      await client.query("ROLLBACK");
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
      "SELECT customer_id, status, title, order_number, upfront_payment FROM orders WHERE id = $1",
      [orderId],
    );

    if (orderCheck.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderCheck.rows[0];
    if (order.customer_id !== customerId) {
      throw new Error("Unauthorized");
    }

    if (order.status !== "pending_bids") {
      throw new Error("Order is not available for bid acceptance");
    }

    // Check if bid exists
    const bidCheck = await pool.query(
      "SELECT id, bid_price FROM bids WHERE order_id = $1 AND user_id = $2",
      [orderId, driverId],
    );

    if (bidCheck.rows.length === 0) {
      throw new Error("Bid not found");
    }

    const bidPrice = parseFloat(bidCheck.rows[0].bid_price);
    const upfrontPayment = parseFloat(order.upfront_payment) || 0;

    // Check if driver can accept orders (debt check)
    const driverStatus = await balanceService.canAcceptOrders(driverId);

    if (!driverStatus.canAccept) {
      logger.warn("Driver cannot accept bid due to debt", {
        orderId,
        driverId,
        currentBalance: driverStatus.currentBalance,
        debtThreshold: driverStatus.debtThreshold,
        category: "order",
      });
      throw new Error(`Cannot accept order: ${driverStatus.reason} `);
    }

    // Get payment method for this order
    const paymentMethodResult = await pool.query(
      "SELECT payment_method, price FROM orders WHERE id = $1",
      [orderId],
    );
    const paymentMethod = paymentMethodResult.rows[0]?.payment_method || "COD";
    const orderPrice =
      parseFloat(paymentMethodResult.rows[0]?.price) || bidPrice;

    // ✅ ESCROW/HOLD: Hold customer funds only for PREPAID orders
    // COD orders have no digital hold — driver collects cash on delivery
    let holdAmount;
    if (paymentMethod === "PREPAID") {
      // Prepaid: hold full order price (customer already paid via balance)
      holdAmount = orderPrice;
      try {
        await balanceService.holdFunds(customerId, orderId, holdAmount);
        logger.info("Escrow hold applied", { orderId, customerId, holdAmount });
      } catch (holdError) {
        logger.error("Failed to hold funds for order", {
          orderId,
          customerId,
          holdAmount,
          error: holdError.message,
        });
        throw new Error(`Cannot accept bid: ${holdError.message}`);
      }
    } else {
      // COD: No digital hold — customer pays driver in cash on delivery
      holdAmount = 0;
    }

    // Update order with accepted bid and escrow info
    await pool.query(
      `UPDATE orders SET 
        status = $1, 
        assigned_driver_user_id = $2, 
        assigned_driver_name = (SELECT driver_name FROM bids WHERE order_id = $3 AND user_id = $4), 
        assigned_driver_bid_price = (SELECT bid_price FROM bids WHERE order_id = $3 AND user_id = $5), 
        price = (SELECT bid_price FROM bids WHERE order_id = $3 AND user_id = $6),
        escrow_amount = $7,
        escrow_status = $8,
        accepted_at = NOW() 
      WHERE id = $3`,
      [
        "accepted",
        driverId,
        orderId,
        driverId,
        driverId,
        driverId,
        holdAmount,
        holdAmount > 0 ? "held" : "none",
      ],
    );

    logger.order("Bid accepted successfully", {
      orderId,
      customerId,
      driverId,
      driverBalance: driverStatus.currentBalance,
      category: "order",
    });

    // Send notification to driver
    try {
      const { createNotification } = require("./notificationService");
      await createNotification(
        driverId,
        orderId,
        "bid_accepted",
        "Bid Accepted! 🚀",
        `Your bid for order "${order.title}" (${order.order_number}) was accepted! Proceed to pickup.`,
      );
    } catch (notifyError) {
      logger.error("Failed to send bid acceptance notification", notifyError);
    }

    return { message: "Bid accepted successfully" };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId, userId, action) {
    // Alias map to handle frontend calling 'picked_up' instead of 'pickup'
    const actionAlias = {
      picked_up: "pickup_package",
      pickup: "pickup_package",
      in_transit: "start_transit",
      "in-transit": "start_transit",
      delivered: "complete_delivery", // Handle frontend 'delivered' action
      complete: "complete_delivery",
      confirm_delivery: "confirm_delivery", // Customer confirms delivery
      finalize_order: "finalize_order", // System finalizes order after delivery confirmation
      cancel: "cancel", // Customer/Admin cancels order
      cancelled: "cancel", // Alternative name for cancel action
    };

    const normalizedAction = actionAlias[action];

    if (!normalizedAction) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Check order ownership/assignment (including escrow fields)
    const orderCheck = await pool.query(
      `SELECT customer_id, assigned_driver_user_id, status, title, price, 
              escrow_amount, escrow_status, upfront_payment, driver_distance_traveled_km 
       FROM orders WHERE id = $1`,
      [orderId],
    );

    if (orderCheck.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderCheck.rows[0];
    const orderWithType = { ...order, order_type: "delivery" };

    // Validate transition using FSM registry
    const transitionResult = orderFSMRegistry.validateTransition(
      orderWithType,
      normalizedAction,
      {
        userId,
        userRole:
          normalizedAction === "confirm_delivery" ||
          normalizedAction === "cancel"
            ? "customer"
            : normalizedAction === "finalize_order"
              ? "customer"
              : "driver",
      },
    );

    if (!transitionResult.valid) {
      throw new Error(transitionResult.error);
    }

    // Additional authorization checks
    if (
      normalizedAction === "confirm_delivery" ||
      normalizedAction === "cancel"
    ) {
      // Customer actions
      if (order.customer_id !== userId) {
        throw new Error(
          `Only customer can ${normalizedAction === "cancel" ? "cancel" : "confirm delivery"}`,
        );
      }
    } else if (normalizedAction === "finalize_order") {
      // finalize_order can be called by system, customer, or driver
      if (
        order.customer_id !== userId &&
        order.assigned_driver_user_id !== userId
      ) {
        throw new Error("Only order participants can finalize the order");
      }
    } else {
      // Driver actions
      if (order.assigned_driver_user_id !== userId) {
        throw new Error("Only assigned driver can perform this action");
      }
    }

    // Use the validated transition result
    const newStatus = transitionResult.nextStatus;

    // Update order status safely using optimistic concurrency control
    let query = `UPDATE orders SET status = $1 WHERE id = $2 AND status = $3`;
    let params = [newStatus, orderId, order.status];

    const updateFields = {
      pickup: "picked_up_at = NOW()",
      start_transit: "in_transit_at = NOW()",
      complete_delivery: "delivered_at = NOW()", // Driver marks as complete
      confirm_delivery: "completed_at = NOW()", // Customer confirms
      cancel: "cancelled_at = NOW()", // Record when order was cancelled
    };

    if (updateFields[normalizedAction]) {
      // P0 FIX: Removed duplicate query assignment that used ANY($3::text[]) — $3 param is a plain
      // string (order.status), not an array. Kept the simple equality check which is correct.
      query = `UPDATE orders SET status = $1, ${updateFields[normalizedAction]} WHERE id = $2 AND status = $3`;
    }

    console.log(
      `[DEBUG] Executing update for order ${orderId}, action: ${normalizedAction}. Query: ${query}, Params: ${JSON.stringify(params)}`,
    );
    const updateResult = await pool.query(query, params);
    console.log(
      `[DEBUG] Update result for order ${orderId}: rowCount=${updateResult.rowCount}`,
    );

    if (updateResult.rowCount === 0) {
      // Check if already updated (idempotency)
      const currentOrder = await pool.query(
        "SELECT status FROM orders WHERE id = $1",
        [orderId],
      );
      // P0 FIX: Changed transition.to → newStatus (transitionResult.nextStatus) — transition var doesn't exist
      if (
        currentOrder.rows.length > 0 &&
        currentOrder.rows[0].status === newStatus
      ) {
        logger.info(
          `Order ${orderId} already updated to ${newStatus}, skipping duplicate processing`,
        );
        console.log(
          `[DEBUG] Order ${orderId} already updated to ${newStatus}. Skipping payment logic.`,
        );
        return { message: "Order status already updated" };
      }
      throw new Error(
        `Order status update failed. Current status might have changed.`,
      );
    } else {
      // P0 FIX: Changed transition.to → newStatus
      console.log(
        `[DEBUG] Order ${orderId} status updated to ${newStatus}. Proceeding to payment logic if applicable.`,
      );
    }

    // ✅ CANCEL: Handle cancel action
    if (normalizedAction === "cancel") {
      const escrowAmount = parseFloat(order.escrow_amount) || 0;
      const distanceTraveled =
        parseFloat(order.driver_distance_traveled_km) || 0;
      const baseFee = 10; // Base compensation in EGP
      const perKmRate = 3; // Per km rate in EGP

      if (order.assigned_driver_user_id && distanceTraveled > 0) {
        const driverCompensation = baseFee + distanceTraveled * perKmRate;

        if (escrowAmount > 0 && order.escrow_status === "held") {
          // PREPAID: Forfeit escrow with driver compensation
          const cappedCompensation = Math.min(driverCompensation, escrowAmount);
          try {
            await balanceService.forfeitHold(
              order.customer_id,
              orderId,
              escrowAmount,
              cappedCompensation,
              order.assigned_driver_user_id,
            );
            await pool.query(
              "UPDATE orders SET escrow_status = $1, cancellation_fee = $2, cancelled_by = $3 WHERE id = $4",
              ["forfeited", cappedCompensation, "customer", orderId],
            );
            logger.info("Escrow forfeited with driver compensation", {
              orderId,
              escrowAmount,
              cappedCompensation,
              distanceTraveled,
            });
          } catch (escrowError) {
            logger.error("Failed to forfeit escrow on cancel", {
              orderId,
              error: escrowError.message,
            });
          }
        } else {
          // COD: No escrow — charge customer balance directly for driver compensation
          try {
            await balanceService.deductCancellationFee(
              order.customer_id,
              orderId,
              driverCompensation,
              order.assigned_driver_user_id,
            );
            await pool.query(
              "UPDATE orders SET cancellation_fee = $1, cancelled_by = $2 WHERE id = $3",
              [driverCompensation, "customer", orderId],
            );
            logger.info("COD cancellation fee charged to customer", {
              orderId,
              driverCompensation,
              distanceTraveled,
            });
          } catch (feeError) {
            logger.error("Failed to charge COD cancellation fee", {
              orderId,
              error: feeError.message,
            });
          }
        }
      } else if (escrowAmount > 0 && order.escrow_status === "held") {
        // No driver travel — full escrow refund
        try {
          await balanceService.releaseHold(
            order.customer_id,
            orderId,
            escrowAmount,
          );
          await pool.query(
            "UPDATE orders SET escrow_status = $1, cancelled_by = $2 WHERE id = $3",
            ["released", "customer", orderId],
          );
          logger.info("Escrow refunded (no driver travel)", {
            orderId,
            escrowAmount,
          });
        } catch (escrowError) {
          logger.error("Failed to refund escrow on cancel", {
            orderId,
            error: escrowError.message,
          });
        }
      }
      // else: COD with no travel — no charge needed
    }

    //TODO How about completed orders count for customer user!!
    // If order is confirmed by customer, update driver stats, release escrow, handle commission
    if (normalizedAction === "confirm_delivery") {
      await pool.query(
        "UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1",
        [order.assigned_driver_user_id],
      );

      // Get order details including payment_method
      const orderDetails = await pool.query(
        "SELECT * FROM orders WHERE id = $1",
        [orderId],
      );
      const orderFull = orderDetails.rows[0];
      const paymentMethod = orderFull.payment_method || "COD";

      // Commission rate: 10% platform + 5% Takaful = 15% total
      const deliveryFee = parseFloat(orderFull.price) || 0;
      const platformCommission = deliveryFee * PAYMENT_CONFIG.COMMISSION_RATE; // 10%
      const takafulContribution = deliveryFee * 0.05; // 5%
      const escrowAmount = parseFloat(orderFull.escrow_amount) || 0;

      if (paymentMethod === "COD") {
        // ✅ COD MODEL: Deduct platform fee from courier balance
        if (platformCommission > 0) {
          try {
            await balanceService.deductPlatformFee(
              order.assigned_driver_user_id,
              orderId,
              platformCommission,
            );

            logger.info("Platform fee deducted for COD delivery", {
              orderId,
              deliveryFee,
              platformCommission,
              courierId: order.assigned_driver_user_id,
            });
          } catch (feeError) {
            logger.error("Failed to deduct platform fee", {
              orderId,
              error: feeError.message,
            });
            // Continue - don't block order completion
          }
        }

        // ✅ COD: Record payment in payments table
        try {
          const existingPayment = await pool.query(
            "SELECT id FROM payments WHERE order_id = $1",
            [orderId],
          );
          if (existingPayment.rows.length === 0) {
            const { generateId } = require("../config/utils");
            const paymentId = generateId();
            const driverEarnings = deliveryFee - platformCommission;
            await pool.query(
              `INSERT INTO payments (id, order_id, amount, currency, payment_method, status, payer_id, payee_id, platform_fee, driver_earnings, processed_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
              [
                paymentId,
                orderId,
                deliveryFee,
                "EGP",
                "cash",
                "completed",
                orderFull.customer_id,
                order.assigned_driver_user_id,
                platformCommission,
                driverEarnings,
              ],
            );
          }
        } catch (paymentError) {
          logger.error("Failed to record COD payment", {
            orderId,
            error: paymentError.message,
          });
        }

        // ✅ COD: Record Takaful contribution
        try {
          await takafulService.recordContribution(
            order.assigned_driver_user_id,
            orderId,
            deliveryFee,
          );
        } catch (takafulError) {
          logger.error("Failed to record Takaful contribution", {
            orderId,
            error: takafulError.message,
          });
        }
      } else {
        // ✅ PREPAID MODEL: Release held funds to driver with commission deduction
        if (escrowAmount > 0 && orderFull.escrow_status === "held") {
          try {
            console.log(
              `[DEBUG] Calling releaseHold for order ${orderId} from orderService. Confirming delivery.`,
            );
            await balanceService.releaseHold(
              order.customer_id,
              orderId,
              escrowAmount,
              {
                destinationUserId: order.assigned_driver_user_id,
                platformCommission,
                takafulContribution,
              },
            );
            console.log(`[DEBUG] releaseHold returned for order ${orderId}.`);

            // Update escrow status on order
            console.log(
              `[DEBUG] Updating escrow status to 'released' for order ${orderId}`,
            );
            await pool.query(
              "UPDATE orders SET escrow_status = $1 WHERE id = $2",
              ["released", orderId],
            );
            console.log(`[DEBUG] Escrow status updated for order ${orderId}`);

            logger.info("Escrow released on delivery confirmation", {
              orderId,
              escrowAmount,
              platformCommission,
              takafulContribution,
              driverNet:
                escrowAmount - platformCommission - takafulContribution,
            });

            // ✅ TAKAFUL: Record contribution to fund
            try {
              await takafulService.recordContribution(
                order.assigned_driver_user_id,
                orderId,
                deliveryFee,
              );
            } catch (takafulError) {
              logger.error("Failed to record Takaful contribution", {
                orderId,
                error: takafulError.message,
              });
              // Non-blocking - contribution tracking failure shouldn't block order
            }
          } catch (escrowError) {
            logger.error("Failed to release escrow", {
              orderId,
              error: escrowError.message,
            });
            // Continue - don't block order completion
          }
        }
      }
    }

    logger.order("Order status updated successfully", {
      orderId,
      action: normalizedAction,
      newStatus: newStatus, // P0 FIX: Changed transition.to → newStatus
      userId,
      category: "order",
    });

    // Notify users about status change
    try {
      const { createNotification } = require("./notificationService");
      let title, message, targetUserId;

      if (normalizedAction === "pickup") {
        targetUserId = order.customer_id;
        title = "Order Picked Up 📦";
        message = `Your order "${order.title}" has been picked up and is on the way!`;
      } else if (normalizedAction === "in-transit") {
        targetUserId = order.customer_id;
        title = "Order In Transit 🚚";
        message = `Your order "${order.title}" is now moving towards the destination.`;
      } else if (normalizedAction === "complete") {
        // Driver marked as complete -> Notify Customer to Confirm
        targetUserId = order.customer_id;
        title = "Delivery Confirmation Required ✅";
        message = `Driver marked "${order.title}" as delivered. Please confirm to complete the order.`;
      } else if (normalizedAction === "confirm_delivery") {
        // Customer confirmed -> Notify Driver
        targetUserId = order.assigned_driver_user_id;
        title = "Order Completed 🎉";
        message = `Customer confirmed delivery for "${order.title}". Great job!`;
      } else if (normalizedAction === "cancel") {
        // Order Cancelled
        // If driver was assigned, notify driver
        if (order.assigned_driver_user_id) {
          targetUserId = order.assigned_driver_user_id;
          title = "Order Cancelled ❌";
          message = `Order "${order.title}" has been cancelled by the customer.`;
        }
      }

      if (title && targetUserId) {
        await createNotification(
          targetUserId,
          orderId,
          `order_${normalizedAction}`,
          title,
          message,
        );
      }
    } catch (notifyError) {
      logger.error("Failed to send status update notification", notifyError);
    }

    return { message: `Order ${normalizedAction} successful` };
  }

  /**
   * Withdraw a bid
   */
  async withdrawBid(orderId, driverId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        "SELECT id, status, customer_id, order_number FROM orders WHERE id = $1",
        [orderId],
      );
      if (orderResult.rows.length === 0) {
        throw new Error("Order not found");
      }
      const order = orderResult.rows[0];

      if (order.status !== "pending_bids") {
        throw new Error(
          "Cannot withdraw bid after order is no longer accepting bids",
        );
      }

      const bidResult = await client.query(
        "SELECT id, bid_price FROM bids WHERE order_id = $1 AND user_id = $2",
        [orderId, driverId],
      );
      if (bidResult.rows.length === 0) {
        throw new Error("Bid not found for this driver");
      }
      const bid = bidResult.rows[0];

      await client.query("DELETE FROM bids WHERE id = $1", [bid.id]);

      // Get driver name for notification
      const driverResult = await client.query(
        "SELECT name FROM users WHERE id = $1",
        [driverId],
      );
      const driverName = driverResult.rows[0]?.name || "Driver";

      // Send notification using the NotificationService
      try {
        const { createNotification } = require("./notificationService");
        await createNotification(
          order.customer_id,
          order.id,
          "bid_withdrawn",
          "Bid Withdrawn",
          `${driverName} withdrew their bid`,
        );
      } catch (notifyError) {
        logger.error("Failed to send withdrawn notification", notifyError);
        // Fallback to direct insert if service fails
        await client.query(
          `INSERT INTO notifications (user_id, order_id, type, title, message, is_read, created_at)
           VALUES ($1, $2, $3, $4, $5, false, NOW())`,
          [
            order.customer_id,
            order.id,
            "bid_withdrawn",
            "Bid Withdrawn",
            `${driverName} withdrew their bid`,
          ],
        );
      }

      await client.query("COMMIT");
      return { success: true };
    } catch (error) {
      await client.query("ROLLBACK");
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
      [orderId],
    );

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    // Check if user has permission to view this order
    if (
      order.customer_id !== userId &&
      order.assigned_driver_user_id !== userId
    ) {
      throw new Error("Unauthorized");
    }

    // Get location history with additional data
    const locationHistory = await pool.query(
      `SELECT latitude, longitude, timestamp, heading, speed_kmh, accuracy_meters, context as location_status
       FROM driver_locations
       WHERE order_id = $1
       ORDER BY timestamp`,
      [orderId],
    );

    // Determine the next color point based on order status
    let nextPoint = "pickup";
    let currentStepIndex = 0;

    if (order.status === "picked_up" || order.status === "in_transit") {
      nextPoint = "delivery";
      currentStepIndex = 1;
    } else if (
      [
        "delivered",
        "courier_delivered",
        "customer_delivered",
        "completed",
      ].includes(order.status)
    ) {
      nextPoint = "completed";
      currentStepIndex = 2;
    }

    // Calculate remaining distance and time to next point
    let distanceToNext = null;
    let timeToNext = null;
    let routeSteps = [];

    if (
      locationHistory.rows.length > 0 &&
      (order.status === "picked_up" || order.status === "in_transit")
    ) {
      const currentLocation =
        locationHistory.rows[locationHistory.rows.length - 1];
      const destination = {
        lat: parseFloat(order.to_coordinates.split(",")[0]),
        lng: parseFloat(order.to_coordinates.split(",")[1]),
      };

      // Calculate straight-line distance using geolib
      distanceToNext =
        this.getDistance(
          {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          destination,
        ) / 1000; // Convert to km

      // Estimate time based on speed (assume urban driving speed)
      const assumedSpeedKmh = currentLocation.speed_kmh || 25; // Default urban speed
      timeToNext = (distanceToNext / assumedSpeedKmh) * 60; // Convert to minutes

      // Create route steps for visualization
      routeSteps = [
        {
          id: "pickup",
          type: "pickup",
          address: order.pickup_address,
          coordinates: {
            lat: parseFloat(order.from_coordinates.split(",")[0]),
            lng: parseFloat(order.from_coordinates.split(",")[1]),
          },
          status:
            order.status === "picked_up" ||
            order.status === "in_transit" ||
            [
              "delivered",
              "courier_delivered",
              "customer_delivered",
              "completed",
            ].includes(order.status)
              ? "completed"
              : "upcoming",
          completedAt: order.picked_up_at,
        },
        {
          id: "delivery",
          type: "delivery",
          address: order.delivery_address,
          coordinates: {
            lat: parseFloat(order.to_coordinates.split(",")[0]),
            lng: parseFloat(order.to_coordinates.split(",")[1]),
          },
          status: [
            "delivered",
            "courier_delivered",
            "customer_delivered",
            "completed",
          ].includes(order.status)
            ? "completed"
            : "upcoming",
          completedAt: order.delivered_at,
        },
      ];
    }

    // Generate route polyline from location history (simplified version)
    let actualRoute = [];
    if (locationHistory.rows.length > 1) {
      actualRoute = locationHistory.rows.map((loc) => [
        parseFloat(loc.longitude),
        parseFloat(loc.latitude),
      ]);
    }

    // Calculate expected route (simplified straight line for demo)
    let expectedRoute = [];
    if (
      order.from_coordinates &&
      order.to_coordinates &&
      (order.status === "picked_up" || order.status === "in_transit")
    ) {
      const from = {
        lat: parseFloat(order.from_coordinates.split(",")[0]),
        lng: parseFloat(order.from_coordinates.split(",")[1]),
      };
      const to = {
        lat: parseFloat(order.to_coordinates.split(",")[0]),
        lng: parseFloat(order.to_coordinates.split(",")[1]),
      };
      expectedRoute = [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ];
    }

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      trackingStatus: order.current_tracking_status || "not_started",
      pickup: {
        address: order.pickup_address,
        coordinates: order.from_coordinates
          ? {
              lat: parseFloat(order.from_coordinates.split(",")[0]),
              lng: parseFloat(order.from_coordinates.split(",")[1]),
            }
          : null,
        completedAt: order.picked_up_at,
      },
      delivery: {
        address: order.delivery_address,
        coordinates: order.to_coordinates
          ? {
              lat: parseFloat(order.to_coordinates.split(",")[0]),
              lng: parseFloat(order.to_coordinates.split(",")[1]),
            }
          : null,
        completedAt: order.delivered_at,
      },
      driver: order.assigneddriver,
      currentLocation:
        locationHistory.rows.length > 0
          ? {
              lat: parseFloat(
                locationHistory.rows[locationHistory.rows.length - 1].latitude,
              ),
              lng: parseFloat(
                locationHistory.rows[locationHistory.rows.length - 1].longitude,
              ),
              heading:
                locationHistory.rows[locationHistory.rows.length - 1].heading,
              speedKmh:
                locationHistory.rows[locationHistory.rows.length - 1].speed_kmh,
              accuracyMeters:
                locationHistory.rows[locationHistory.rows.length - 1]
                  .accuracy_meters,
              timestamp:
                locationHistory.rows[locationHistory.rows.length - 1].timestamp,
              status:
                locationHistory.rows[locationHistory.rows.length - 1]
                  .location_status,
            }
          : null,
      locationHistory: locationHistory.rows.map((loc) => ({
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
        timestamp: loc.timestamp,
        heading: loc.heading,
        speedKmh: loc.speed_kmh,
        accuracyMeters: loc.accuracy_meters,
        status: loc.location_status,
      })),
      routes: {
        actual: actualRoute,
        expected: expectedRoute,
      },
      nextPoint: {
        type: nextPoint,
        distanceKm: distanceToNext,
        estimatedTimeMinutes: timeToNext,
      },
      routeSteps: routeSteps,
      createdAt: order.created_at,
      acceptedAt: order.accepted_at,
      pickedUpAt: order.picked_up_at,
      inTransitAt: order.in_transit_at,
      deliveredAt: order.delivered_at,
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
      conditionRating,
    } = reviewData;

    if (!rating || rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check if order exists and user has permission
    const orderCheck = await pool.query(
      "SELECT customer_id, assigned_driver_user_id, status FROM orders WHERE id = $1",
      [orderId],
    );

    if (orderCheck.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderCheck.rows[0];
    if (
      ![
        "delivered",
        "courier_delivered",
        "delivered_pending",
        "customer_delivered",
        "completed",
      ].includes(order.status)
    ) {
      throw new Error("Can only review delivered orders");
    }

    let reviewerIdFinal, revieweeId, revieweeRole, reviewerRole;

    // Get reviewer's primary_role from database
    const reviewerResult = await pool.query(
      "SELECT primary_role FROM users WHERE id = $1",
      [reviewerId],
    );
    if (reviewerResult.rows.length === 0) {
      throw new Error("Reviewer not found");
    }
    reviewerRole = reviewerResult.rows[0].primary_role;

    if (reviewType === "customer_to_driver") {
      if (order.customer_id !== reviewerId) {
        throw new Error("Unauthorized");
      }
      reviewerIdFinal = reviewerId;
      revieweeId = order.assigned_driver_user_id;
      revieweeRole = "driver";
    } else if (reviewType === "driver_to_customer") {
      if (order.assigned_driver_user_id !== reviewerId) {
        throw new Error("Unauthorized");
      }
      reviewerIdFinal = reviewerId;
      revieweeId = order.customer_id;
      revieweeRole = "customer";
    } else if (reviewType.includes("_to_platform")) {
      reviewerIdFinal = reviewerId;
      revieweeId = null; // Platform reviews don't have a specific reviewee
      revieweeRole = "platform";
    } else {
      throw new Error("Invalid review type");
    }

    // Check if review already exists
    const existingReview = await pool.query(
      "SELECT id FROM reviews WHERE order_id = $1 AND reviewer_id = $2 AND review_type = $3",
      [orderId, reviewerIdFinal, reviewType],
    );

    if (existingReview.rows.length > 0) {
      throw new Error("Review already submitted for this order");
    }

    const reviewId = this.generateId();
    await pool.query(
      `INSERT INTO reviews(
    id, user_id, order_id, reviewer_id, reviewee_id, reviewer_role,
    review_type, rating, comment, professionalism_rating, communication_rating,
    timeliness_rating, condition_rating, created_at
  ) VALUES($1, $3, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
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
        conditionRating || null,
      ],
    );

    // Update user rating if reviewing a user (not platform)
    if (revieweeId) {
      const avgRating = await pool.query(
        "SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = $1",
        [revieweeId],
      );

      if (avgRating.rows[0].avg_rating) {
        await pool.query("UPDATE users SET rating = $1 WHERE id = $2", [
          parseFloat(avgRating.rows[0].avg_rating),
          revieweeId,
        ]);
      }
    }

    logger.order("Review submitted successfully", {
      reviewId,
      orderId,
      reviewType,
      reviewerId: reviewerIdFinal,
      revieweeId,
      rating,
      category: "order",
    });

    return { message: "Review submitted successfully" };
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
      [orderId],
    );

    return reviews.rows.map((review) => ({
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
      createdAt: review.created_at,
    }));
  }
}

module.exports = new OrderService();
