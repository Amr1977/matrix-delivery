const express = require('express');
console.log('!!! APP.JS LOADED [RELOAD-TEST-' + Date.now() + '] !!!');

const cors = require('cors');
const dotenv = require('dotenv');

// Load environment-specific .env file
if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: '.env.testing' });
  console.log('✅ Loaded .env.testing for testing');
} else {
  dotenv.config();
}

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');
const { getDistance } = require('geolib');
const http = require('http');
const socketIo = require('socket.io');
const logger = require('./config/logger');
const path = require('path');

// Import utility modules
const { generateId, generateOrderNumber } = require('./utils/generators');
const { sanitizeString, sanitizeHtml, sanitizeNumeric } = require('./utils/sanitizers');
const { validateEmail, validatePassword, validatePhone, validateRole } = require('./utils/validators');
const { COMMON_COUNTRIES, ORDER_STATUS, BID_STATUS, PAYMENT_STATUS, USER_ROLES, LOCATION_CACHE_TTLS } = require('./config/constants');
const {
  locationMemoryCache,
  getCountriesFromCache,
  setCountriesCache,
  getListFromMemory,
  setListInMemory,
  getPersistedCache,
  persistCache
} = require('./utils/cache');

// Import routes
const ordersRouter = require('./routes/orders');
const cryptoPaymentRoutes = require('./routes/cryptoPayments');
const reviewsRouter = require('./routes/reviews').default;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

const app = express();

// ============================================================================
// EXPRESS CONFIGURATION (Middleware, Security, Logging, CORS)
// ============================================================================
const configureExpress = require('./config/express');
const corsOptions = configureExpress(app);

// ============================================================================
// CSRF PROTECTION (double-submit cookie)
// ============================================================================
const { csrfMiddleware, csrfTokenRoute } = require('./middleware/csrf');

// Protect all /api state-changing routes with CSRF validation
app.use('/api', csrfMiddleware);

// Endpoint to obtain CSRF token (used by SPA before state-changing requests)
app.get('/api/csrf-token', csrfTokenRoute);

// ============================================================================
// DATABASE & ENVIRONMENT SETUP
// ============================================================================
const { validateDatabaseEnvironment, initializeDatabaseConnection } = require('./config/database-init');

// Validate DB Environment variables
validateDatabaseEnvironment();

// Initialize Database Connection (also registers ts-node)
(async () => {
  await initializeDatabaseConnection();
})();

// ============================================================================
// ROUTES & MIDDLEWARE SETUP
// ============================================================================

// Import authentication middleware
const {
  verifyToken,
  requireAdmin,
  requireRole
} = require('./middleware/auth');

// Legacy middleware aliases
const isAdmin = requireAdmin;
const isVendor = requireRole('vendor', 'admin');

// Custom middleware moved to auth.js
// verifyTokenOrTestBypass and authorizeVendorManage are now in ./middleware/auth

// Load browse/marketplace endpoints
app.use('/api/browse', require('./routes/browse'));

// Load vendor management endpoints
app.use('/api/vendors', require('./routes/vendors'));

// Load user profile endpoints
app.use('/api/users', require('./routes/users'));

// Load auth endpoints
app.use('/api/auth', require('./routes/auth'));

// Load admin endpoints
app.use('/api/admin', require('./routes/admin'));

// Load uploads/media endpoints (static file serving for profile pictures, etc.)
app.use('/uploads', require('./routes/uploads'));

const v1Routes = require('./routes/v1');
app.use('/api/v1', v1Routes);

app.use('/api/reviews', reviewsRouter);

// Load driver status endpoints
const driverRoutes = require('./routes/drivers');
app.use('/api/drivers', driverRoutes);

// Load map tile proxy endpoints
app.use('/api/maps', require('./routes/maps'));

// Load map location picker endpoints
const mapPickerEndpoints = require('./map-location-picker-backend.js');
mapPickerEndpoints(app, pool, jwt);

// Load logs endpoints
const logsRouter = require('./routes/logs')(pool);
app.use('/api/logs', logsRouter);

// Load statistics endpoints
const statisticsRouter = require('./routes/statistics');
app.use('/api/stats', statisticsRouter);

// Load heartbeat endpoint
const heartbeatRouter = require('./routes/heartbeat.ts').default;
const { verifyToken: heartbeatAuth } = require('./middleware/auth');
app.use('/api/heartbeat', heartbeatAuth, heartbeatRouter);

// Load health check
app.use('/api/health', require('./routes/health'));

// Load system health monitoring (admin only)
app.use('/api/admin/health', require('./routes/systemHealth'));

// Load Takaful cooperative insurance routes
app.use('/api/takaful', require('./routes/takaful'));

// Load emergency transfer routes
app.use('/api/emergency', require('./routes/emergency'));

let HAS_POSTGIS = false;

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// Inline routes for browse, vendors, and users have been moved to their respective route files.
// See ./routes/browse.js, ./routes/vendors.js, and ./routes/users.js

// ============ END OF PART 2 ============
// Continue with Part 3 for Order Management

// Order creation is now handled by ./routes/orders.js
// using the ordersRouter mounted below.

// ============ ORDERS ROUTES (with proximity filtering) ============
// Mount the orders router which includes 7km radius filtering using PostGIS
app.use('/api/orders', ordersRouter);

// Get single order details
app.get('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids FROM orders o LEFT JOIN bids b ON o.id = b.order_id WHERE o.id = $1 GROUP BY o.id`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Authorization check
    const isOwner = order.customer_id === req.user.userId;
    const isAssignedDriver = order.assigned_driver_user_id === req.user.userId;
    const hasBid = order.bids.some(bid => bid.userId === req.user.userId);
    const isDriver = (req.user.primary_role || req.user.role) === 'driver';

    // Allow access if:
    // 1. User is the owner (customer)
    // 2. User is the assigned driver
    // 3. User has placed a bid on this order
    // 4. Order is open for bidding (pending_bids) AND user is a driver
    if (!isOwner && !isAssignedDriver && !hasBid &&
      !(order.status === 'pending_bids' && isDriver)) {
      return res.status(403).json({ error: 'Unauthorized to view this order' });
    }

    res.json({
      id: order.id, orderNumber: order.order_number, title: order.title, description: order.description,
      pickupAddress: order.pickup_address, deliveryAddress: order.delivery_address,
      from: { lat: parseFloat(order.from_lat), lng: parseFloat(order.from_lng), name: order.from_name },
      to: { lat: parseFloat(order.to_lat), lng: parseFloat(order.to_lng), name: order.to_name },
      packageDescription: order.package_description, packageWeight: order.package_weight ? parseFloat(order.package_weight) : null,
      estimatedValue: order.estimated_value ? parseFloat(order.estimated_value) : null,
      specialInstructions: order.special_instructions, price: parseFloat(order.price), status: order.status,
      bids: order.bids, customerId: order.customer_id, customerName: order.customer_name,
      assignedDriver: order.assigned_driver_user_id ? { userId: order.assigned_driver_user_id, driverName: order.assigned_driver_name, bidPrice: parseFloat(order.assigned_driver_bid_price) } : null,
      estimatedDeliveryDate: order.estimated_delivery_date,
      currentLocation: order.current_location_lat ? { lat: parseFloat(order.current_location_lat), lng: parseFloat(order.current_location_lng) } : null,
      createdAt: order.created_at, acceptedAt: order.accepted_at, pickedUpAt: order.picked_up_at, deliveredAt: order.delivered_at
    });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Place bid
// Delete order
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.customer_id !== req.user.userId) return res.status(403).json({ error: 'Only customer can delete order' });
    if (order.status !== 'pending_bids') return res.status(400).json({ error: 'Cannot delete order that has been accepted' });

    await pool.query('DELETE FROM bids WHERE order_id = $1', [req.params.id]);
    await pool.query('DELETE FROM notifications WHERE order_id = $1', [req.params.id]);
    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
    console.log(`✅ Order deleted: "${order.title}" by ${req.user.name}`);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    logger.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});


// Complete order (mark as delivered)


// Update driver location
app.post('/api/orders/:id/location', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Latitude and longitude are required' });

    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.assigned_driver_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only assigned driver can update location' });
    }

    await pool.query(`UPDATE orders SET current_location_lat = $1, current_location_lng = $2 WHERE id = $3`, [parseFloat(latitude), parseFloat(longitude), req.params.id]);
    await pool.query(`INSERT INTO location_updates (order_id, driver_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5)`, [req.params.id, req.user.userId, parseFloat(latitude), parseFloat(longitude), order.status]);

    res.json({ message: 'Location updated successfully', location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude) } });
  } catch (error) {
    logger.error('Update location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get order tracking details
app.get('/api/orders/:id/tracking', verifyToken, async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.customer_id !== req.user.userId && order.assigned_driver_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view tracking' });
    }

    const locationResult = await pool.query(
      `SELECT latitude, longitude, status, created_at FROM location_updates WHERE order_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );

    res.json({
      orderNumber: order.order_number,
      status: order.status,
      currentLocation: order.current_location_lat ? {
        lat: parseFloat(order.current_location_lat),
        lng: parseFloat(order.current_location_lng)
      } : null,
      pickup: {
        address: order.pickup_address,
        location: {
          lat: parseFloat(order.from_lat),
          lng: parseFloat(order.from_lng)
        }
      },
      delivery: {
        address: order.delivery_address,
        location: {
          lat: parseFloat(order.to_lat),
          lng: parseFloat(order.to_lng)
        }
      },
      estimatedDelivery: order.estimated_delivery_date,
      createdAt: order.created_at,
      acceptedAt: order.accepted_at,
      pickedUpAt: order.picked_up_at,
      deliveredAt: order.delivered_at,
      locationHistory: locationResult.rows.map(loc => ({
        lat: parseFloat(loc.latitude),
        lng: parseFloat(loc.longitude),
        status: loc.status,
        timestamp: loc.created_at
      }))
    });
  } catch (error) {
    logger.error('Get tracking error:', error);
    res.status(500).json({ error: 'Failed to get tracking information' });
  }
});

// ============ END OF PART 4 (COMPLETE) ============
// ============ PART 4.5: Driver Location Management ============

// Update driver location
app.post('/api/drivers/location', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can update location' });
    }

    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    await pool.query(
      `INSERT INTO driver_locations (driver_id, latitude, longitude) VALUES ($1, $2, $3)
       ON CONFLICT (driver_id) DO UPDATE SET latitude = $2, longitude = $3, timestamp = CURRENT_TIMESTAMP`,
      [req.user.userId, lat, lng]
    );

    logger.info(`Driver location updated`, {
      userId: req.user.userId,
      name: req.user.name,
      latitude: lat,
      longitude: lng,
      category: 'location'
    });
    res.json({ message: 'Location updated successfully', location: { latitude: lat, longitude: lng } });
  } catch (error) {
    logger.error('Update driver location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get driver current location
app.get('/api/drivers/location', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can access location' });
    }

    const result = await pool.query(
      'SELECT latitude, longitude, timestamp as last_updated FROM driver_locations WHERE driver_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ location: null });
    }

    const location = result.rows[0];
    res.json({
      location: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        lastUpdated: location.last_updated
      }
    });
  } catch (error) {
    logger.error('Get driver location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Switch user's primary primary_role
app.post('/api/users/me/switch-primary_role', verifyToken, async (req, res) => {
  try {
    const { newRole } = req.body;

    if (!newRole) {
      return res.status(400).json({ error: 'New primary_role is required' });
    }

    // Get user's current granted_roles
    const userResult = await pool.query(
      'SELECT id, email, name, primary_role, granted_roles FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Verify user has this primary_role in granted_roles
    if (!user.granted_roles || !user.granted_roles.includes(newRole)) {
      return res.status(403).json({
        error: 'primary_role not granted',
        grantedRoles: user.granted_roles || []
      });
    }

    // Update primary_role
    await pool.query(
      'UPDATE users SET primary_role = $1 WHERE id = $2',
      [newRole, req.user.userId]
    );

    // Issue new token with updated primary_role
    const newToken = jwt.sign(
      {
        userId: req.user.userId,
        primary_role: newRole,
        granted_roles: user.granted_roles
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set new cookie
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: true, // Required for sameSite: 'none'
      sameSite: 'none', // Required for cross-domain cookies
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.auth('primary_role switched successfully', {
      userId: req.user.userId,
      oldRole: user.primary_role,
      newRole,
      ip: req.ip || req.connection.remoteAddress,
      category: 'auth'
    });

    res.json({
      success: true,
      newRole,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        primary_role: newRole,
        granted_roles: user.granted_roles
      }
    });
  } catch (error) {
    logger.error('primary_role switch error:', {
      error: error.message,
      userId: req.user?.userId,
      requestedRole: req.body.newRole,
      category: 'error'
    });
    res.status(500).json({ error: 'Failed to switch primary_role' });
  }
});

// ============ END OF PART 4.5 ============
// Continue with Part 5 for Notifications & Reviews

// ============ PART 5: Notifications & Reviews (FINAL) ============
// Add this after Part 4

// Get notifications
app.get('/api/notifications', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.userId]
    );
    res.json(result.rows.map(notif => ({
      id: notif.id, orderId: notif.order_id, type: notif.type, title: notif.title,
      message: notif.message, isRead: notif.is_read, createdAt: notif.created_at
    })));
  } catch (error) {
    logger.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read - shared handler
const markNotificationAsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

// Support both PUT and POST methods for marking notifications as read
app.put('/api/notifications/:id/read', verifyToken, markNotificationAsRead);
app.post('/api/notifications/:id/read', verifyToken, markNotificationAsRead);

// Submit review
// Review submission is handled by ordersRouter -> orderService.submitReview


// Get reviews for an order
app.get('/api/orders/:id/reviews', verifyToken, async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.customer_id !== req.user.userId && order.assigned_driver_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view reviews' });
    }

    const reviewsResult = await pool.query(
      `SELECT r.*, reviewer.name as reviewer_name, reviewee.name as reviewee_name FROM reviews r LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id WHERE r.order_id = $1 ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json(reviewsResult.rows.map(review => ({
      id: review.id, reviewType: review.review_type, reviewerName: review.reviewer_name, revieweeName: review.reviewee_name,
      reviewerRole: review.reviewer_role, rating: review.rating, comment: review.comment,
      professionalismRating: review.professionalism_rating, communicationRating: review.communication_rating,
      timelinessRating: review.timeliness_rating, conditionRating: review.condition_rating, createdAt: review.created_at
    })));
  } catch (error) {
    logger.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

// Check review status for an order
app.get('/api/orders/:id/review-status', verifyToken, async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.customer_id !== req.user.userId && order.assigned_driver_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const isCustomer = order.customer_id === req.user.userId;
    const isDriver = order.assigned_driver_user_id === req.user.userId;

    const reviewsResult = await pool.query('SELECT review_type FROM reviews WHERE order_id = $1 AND reviewer_id = $2', [req.params.id, req.user.userId]);
    const submittedReviews = reviewsResult.rows.map(r => r.review_type);

    const status = {
      canReview: order.status === 'delivered',
      userRole: (req.user.primary_role || req.user.primary_role),
      reviews: {
        toDriver: isCustomer ? submittedReviews.includes('customer_to_driver') : null,
        toCustomer: isDriver ? submittedReviews.includes('driver_to_customer') : null,
        toPlatform: submittedReviews.includes(`${req.user.primary_role}_to_platform`)
      }
    };

    res.json(status);
  } catch (error) {
    logger.error('Check review status error:', error);
    res.status(500).json({ error: 'Failed to check review status' });
  }
});

// ============ PART 6: Payments (Cash on Delivery) ============
// Add this after Part 5

// Process COD payment (mark as payment received)
app.post('/api/orders/:id/payment/cod', verifyToken, async (req, res) => {
  const startTime = Date.now();
  const client = await pool.connect();

  logger.payment(`COD payment confirmation attempt`, {
    orderId: req.params.id,
    userId: req.user.userId,
    userName: req.user.name,
    category: 'payment'
  });

  try {
    await client.query('BEGIN');

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`COD payment failed: order not found`, {
        orderId: req.params.id,
        userId: req.user.userId,
        category: 'payment'
      });
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only the assigned driver can confirm COD payment on delivery
    if (order.assigned_driver_user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      logger.security(`COD payment unauthorized attempt`, {
        orderId: req.params.id,
        userId: req.user.userId,
        assignedDriverId: order.assigned_driver_user_id,
        category: 'security'
      });
      return res.status(403).json({ error: 'Only assigned driver can confirm payment' });
    }

    if (order.status !== 'delivered') {
      await client.query('ROLLBACK');
      logger.warn(`COD payment failed: order not delivered`, {
        orderId: req.params.id,
        orderStatus: order.status,
        userId: req.user.userId,
        category: 'payment'
      });
      return res.status(400).json({ error: 'Order must be delivered before payment can be confirmed' });
    }

    // Check if payment already exists
    const existingPayment = await client.query('SELECT * FROM payments WHERE order_id = $1', [req.params.id]);
    if (existingPayment.rows.length > 0) {
      await client.query('ROLLBACK');
      logger.warn(`COD payment failed: payment already exists`, {
        orderId: req.params.id,
        existingPaymentId: existingPayment.rows[0].id,
        userId: req.user.userId,
        category: 'payment'
      });
      return res.status(400).json({ error: 'Payment already recorded' });
    }

    // ✅ NEW: Calculate commission (15%)
    const totalAmount = parseFloat(order.assigned_driver_bid_price);
    const { calculateCommission } = require('./config/paymentConfig');
    const { commission, payout } = calculateCommission(totalAmount);

    // ✅ NEW: Deduct commission from driver balance (can create debt)
    const { BalanceService } = require('./services/balanceService');
    const balanceService = new BalanceService(pool);

    await balanceService.deductCommission(
      order.assigned_driver_user_id,
      req.params.id,
      commission
    );

    // Record payment with correct commission
    const paymentId = generateId();
    await client.query(
      `INSERT INTO payments (id, order_id, amount, currency, payment_method, status, payer_id, payee_id, platform_fee, driver_earnings, processed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [paymentId, req.params.id, totalAmount, 'EGP', 'cash', 'completed', order.customer_id, order.assigned_driver_user_id, commission, payout]
    );

    // ✅ NEW: Check if driver can still accept orders
    const driverStatus = await balanceService.canAcceptOrders(order.assigned_driver_user_id);

    await createNotification(order.customer_id, order.id, 'payment_completed', 'Payment Confirmed', `Payment of ${totalAmount.toFixed(2)} EGP has been confirmed for order ${order.order_number}`);

    // ⚠️ NEW: Warn driver if debt is high
    if (!driverStatus.canAccept) {
      await createNotification(
        order.assigned_driver_user_id,
        order.id,
        'balance_warning',
        'Balance Alert',
        `Your balance is ${driverStatus.currentBalance.toFixed(2)} EGP. Please deposit funds to continue accepting orders.`
      );
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;
    logger.payment(`COD payment confirmed successfully with commission`, {
      paymentId,
      orderId: req.params.id,
      orderNumber: order.order_number,
      amount: totalAmount,
      commission,
      driverEarnings: payout,
      driverBalance: driverStatus.currentBalance,
      canAcceptOrders: driverStatus.canAccept,
      userId: req.user.userId,
      userName: req.user.name,
      duration: `${duration}ms`,
      category: 'payment'
    });

    logger.performance(`COD payment processing completed`, {
      paymentId,
      orderId: req.params.id,
      amount: totalAmount,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      message: 'COD payment confirmed successfully',
      payment: {
        id: paymentId,
        amount: totalAmount,
        platformFee: commission,
        driverEarnings: payout,
        status: 'completed'
      },
      driverStatus: {
        currentBalance: driverStatus.currentBalance,
        canAcceptOrders: driverStatus.canAccept,
        warning: driverStatus.reason
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    const duration = Date.now() - startTime;
    logger.error(`COD payment error: ${error.message}`, {
      stack: error.stack,
      orderId: req.params.id,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: 'Failed to confirm COD payment' });
  } finally {
    client.release();
  }
});

// Get payment status for an order
app.get('/api/orders/:id/payment', verifyToken, async (req, res) => {
  try {
    const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) return res.status(404).json({ error: 'Order not found' });

    const order = orderResult.rows[0];
    if (order.customer_id !== req.user.userId && order.assigned_driver_user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Unauthorized to view payment' });
    }

    const paymentResult = await pool.query(
      `SELECT p.*, u.name as driver_name FROM payments p
       LEFT JOIN users u ON p.payee_id = u.id
       WHERE p.order_id = $1`,
      [req.params.id]
    );

    if (paymentResult.rows.length === 0) {
      return res.json({ status: 'pending', paymentMethod: 'cash' });
    }

    const payment = paymentResult.rows[0];
    res.json({
      id: payment.id,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      status: payment.status,
      platformFee: parseFloat(payment.platform_fee),
      driverEarnings: parseFloat(payment.driver_earnings),
      processedAt: payment.processed_at
    });

  } catch (error) {
    logger.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to get payment information' });
  }
});

// Get user's earnings/payments summary (for drivers)
app.get('/api/payments/earnings', verifyToken, async (req, res) => {
  try {
    if ((req.user.primary_role || (req.user.primary_role || req.user.primary_role)) !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can access earnings' });
    }

    const earningsResult = await pool.query(
      `SELECT
        COUNT(*) as total_deliveries,
        COALESCE(SUM(amount), 0) as total_earnings,
        COALESCE(SUM(driver_earnings), 0) as driver_earnings,
        COALESCE(SUM(platform_fee), 0) as platform_fee,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments
       FROM payments WHERE payee_id = $1`,
      [req.user.userId]
    );

    const stats = earningsResult.rows[0];

    // Get recent payments
    const recentPayments = await pool.query(
      `SELECT p.*, o.order_number, o.title, o.created_at as order_created_at
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.payee_id = $1
       ORDER BY p.processed_at DESC LIMIT 10`,
      [req.user.userId]
    );

    res.json({
      summary: {
        totalDeliveries: parseInt(stats.total_deliveries),
        totalEarnings: parseFloat(stats.total_earnings),
        driverEarnings: parseFloat(stats.driver_earnings),
        platformFee: parseFloat(stats.platform_fee),
        netEarnings: parseFloat(stats.driver_earnings),
        completedPayments: parseInt(stats.completed_payments),
        pendingPayments: parseInt(stats.pending_payments)
      },
      recentPayments: recentPayments.rows.map(payment => ({
        id: payment.id,
        orderNumber: payment.order_number,
        orderTitle: payment.title,
        amount: parseFloat(payment.amount),
        driverEarnings: parseFloat(payment.driver_earnings),
        status: payment.status,
        processedAt: payment.processed_at
      }))
    });

  } catch (error) {
    logger.error('Get earnings error:', error);
    res.status(500).json({ error: 'Failed to get earnings information' });
  }
});

// Get customer's payment history
app.get('/api/payments/history', verifyToken, async (req, res) => {
  try {
    const paymentsResult = await pool.query(
      `SELECT p.*, o.order_number, o.title, u.name as driver_name
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       LEFT JOIN users u ON p.payee_id = u.id
       WHERE p.payer_id = $1
       ORDER BY p.processed_at DESC LIMIT 20`,
      [req.user.userId]
    );

    res.json(paymentsResult.rows.map(payment => ({
      id: payment.id,
      orderNumber: payment.order_number,
      orderTitle: payment.title,
      driverName: payment.driver_name,
      amount: parseFloat(payment.amount),
      paymentMethod: payment.payment_method,
      status: payment.status,
      processedAt: payment.processed_at
    })));

  } catch (error) {
    logger.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

// ============ PART 7: Location Data Management (Hybrid: Database + Geocoding API) ============
// Add this after Part 6

// Get current location details (reverse geocoding)
app.post('/api/location/current', verifyToken, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    // Use Nominatim API for reverse geocoding
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;

    console.log('🌍 Reverse geocoding:', nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Transform to expected format
    const result = {
      coordinates: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon)
      },
      address: {
        country: data.address?.country || '',
        city: data.address?.city || data.address?.town || data.address?.village || '',
        area: data.address?.suburb || data.address?.neighbourhood || data.address?.district || '',
        street: data.address?.road || data.address?.street || data.address?.pedestrian || '',
        buildingNumber: data.address?.house_number || '',
        floor: '',
        apartmentNumber: '',
        personName: '',
        postcode: data.address?.postcode || ''
      }
    };

    console.log(`✅ Reverse geocoded location: ${result.address.city}, ${result.address.country}`);
    res.json(result);

  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to get location details' });
  }
});

// Get all countries (hybrid approach)
app.get('/api/locations/countries', async (req, res) => {
  try {
    const searchTerm = (req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 250, 250);

    const respond = (list, source) => {
      const normalized = Array.isArray(list) ? list.filter(Boolean) : [];
      if (!normalized.length) {
        console.log('🌍 Countries endpoint: returning empty list');
        return res.json([]);
      }
      const filtered = searchTerm
        ? normalized.filter(name => name.toLowerCase().includes(searchTerm))
        : normalized;
      const result = filtered.slice(0, limit);
      console.log(`🌍 Countries endpoint: returning ${result.length} countries from ${source}`, result.slice(0, 3));
      res.json(result);
    };

    // In-memory cache first
    const cachedCountries = getCountriesFromCache();
    if (cachedCountries?.length) {
      console.log('📦 Countries from in-memory cache');
      return respond(cachedCountries, 'memory-cache');
    }

    // Persistent cache second
    const persistedCountries = await getPersistedCache(LOCATION_CACHE_KEYS.COUNTRIES);
    if (persistedCountries?.length) {
      console.log('💾 Countries from persistent cache');
      setCountriesCache(persistedCountries);
      return respond(persistedCountries, 'persistent-cache');
    }

    // Database cache (locations table) - only use if we have a reasonable number of countries (>50)
    const dbResult = await pool.query(
      'SELECT DISTINCT country FROM locations WHERE country IS NOT NULL AND country <> \'\' ORDER BY country'
    );
    if (dbResult.rows.length > 50) {
      const dbCountries = dbResult.rows.map(row => row.country).filter(Boolean);
      console.log('🗄️ Countries from database:', dbCountries.length);
      setCountriesCache(dbCountries);
      await persistCache(LOCATION_CACHE_KEYS.COUNTRIES, dbCountries, LOCATION_CACHE_TTLS.COUNTRIES);
      return respond(dbCountries, 'database');
    } else if (dbResult.rows.length > 0) {
      console.log('⚠️ Database has only', dbResult.rows.length, 'countries (too few), skipping to API');
    }

    // Fetch full list from RestCountries API
    console.log('🌐 Fetching countries from RestCountries API...');
    const response = await fetch(
      'https://restcountries.com/v3.1/all?fields=name',
      { headers: { 'User-Agent': 'Matrix-Delivery-App/1.0' } }
    );
    if (response.ok) {
      const data = await response.json();
      const countries = data
        .map(country => country?.name?.common)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      if (countries.length) {
        console.log('✅ Got', countries.length, 'countries from RestCountries API');
        setCountriesCache(countries);
        await persistCache(LOCATION_CACHE_KEYS.COUNTRIES, countries, LOCATION_CACHE_TTLS.COUNTRIES);
        return respond(countries, 'restcountries-api');
      }
    }

    // Last resort fallback
    console.log('⚠️ Using COMMON_COUNTRIES fallback:', COMMON_COUNTRIES.length, 'countries');
    setCountriesCache(COMMON_COUNTRIES);
    await persistCache(LOCATION_CACHE_KEYS.COUNTRIES, COMMON_COUNTRIES, LOCATION_CACHE_TTLS.COUNTRIES);
    respond(COMMON_COUNTRIES, 'fallback');
  } catch (error) {
    logger.error('❌ Get countries error:', error);
    res.status(500).json({ error: 'Failed to get countries' });
  }
});

// Clear location caches (for debugging/admin purposes)
app.post('/api/locations/cache/clear', async (req, res) => {
  try {
    console.log('🧹 Clearing location caches...');

    // Clear in-memory cache
    locationMemoryCache.countries = { data: null, expiresAt: 0 };
    locationMemoryCache.cities.clear();
    locationMemoryCache.areas.clear();
    locationMemoryCache.streets.clear();

    // Clear persistent cache
    await pool.query('DELETE FROM cache WHERE key LIKE \'locations:%\'');

    console.log('✅ Location caches cleared successfully');
    res.json({ message: 'Caches cleared successfully' });
  } catch (error) {
    logger.error('❌ Error clearing caches:', error);
    res.status(500).json({ error: 'Failed to clear caches' });
  }
});

// Get cities for a country (hybrid: database + Nominatim API fallback)
app.get('/api/locations/countries/:country/cities', async (req, res) => {
  try {
    const country = req.params.country;
    const searchTermRaw = (req.query.q || '').trim();
    const searchTerm = searchTermRaw.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const cacheKey = `${country.toLowerCase()}::${searchTerm}`;

    const respond = (list) => {
      const unique = [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
      res.json(unique.slice(0, limit));
    };

    const cached = getListFromMemory(locationMemoryCache.cities, cacheKey);
    if (cached?.length) {
      return respond(cached);
    }

    // Database cache first
    const dbQueryBase = 'SELECT DISTINCT city FROM locations WHERE country = $1 AND city <> \'\'';
    const dbQuery = searchTerm
      ? `${dbQueryBase} AND city ILIKE $2 ORDER BY city LIMIT $3`
      : `${dbQueryBase} ORDER BY city LIMIT $2`;
    const dbParams = searchTerm
      ? [country, `${searchTermRaw}%`, limit]
      : [country, limit];
    const dbResult = await pool.query(dbQuery, dbParams);
    if (dbResult.rows.length > 0) {
      const cities = dbResult.rows.map(row => row.city).filter(Boolean);
      setListInMemory(locationMemoryCache.cities, cacheKey, cities, LOCATION_CACHE_TTLS.CITIES);
      return respond(cities);
    }

    // Fallback to Nominatim API for worldwide coverage
    console.log(`🌍 Fetching cities for ${country} from Nominatim API...`);
    const searchParams = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: limit.toString(),
      dedupe: '1'
    });
    if (searchTerm) {
      searchParams.set('q', `${searchTermRaw}, ${country}`);
    } else {
      // Use country name directly in query instead of country parameter
      searchParams.set('q', `city in ${country}`);
    }
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    const cities = [...new Set(data
      .filter(item => item.address && (item.address.city || item.address.town || item.address.village))
      .map(item => item.address.city || item.address.town || item.address.village)
    )];

    if (cities.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const cityName of cities.slice(0, 100)) {
          await client.query(
            'INSERT INTO locations (country, city, area, street) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [country, cityName, 'Unknown', 'Unknown']
          );
        }
        await client.query('COMMIT');
        console.log(`✅ Cached ${Math.min(cities.length, 100)} cities for ${country}`);
      } catch (cacheError) {
        await client.query('ROLLBACK');
        console.log('Cache error (non-critical):', cacheError.message);
      } finally {
        client.release();
      }
    }

    setListInMemory(locationMemoryCache.cities, cacheKey, cities, LOCATION_CACHE_TTLS.CITIES);
    respond(cities);
  } catch (error) {
    logger.error('Get cities error:', error);
    res.status(500).json({ error: 'Failed to get cities' });
  }
});

// Get areas for a country and city
app.get('/api/locations/countries/:country/cities/:city/areas', async (req, res) => {
  try {
    const country = req.params.country;
    const city = req.params.city;
    const searchTermRaw = (req.query.q || '').trim();
    const searchTerm = searchTermRaw.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const cacheKey = `${country.toLowerCase()}::${city.toLowerCase()}::${searchTerm}`;

    const respond = (list) => {
      const unique = [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
      res.json(unique.slice(0, limit));
    };

    const cached = getListFromMemory(locationMemoryCache.areas, cacheKey);
    if (cached?.length) {
      return respond(cached);
    }

    const dbQueryBase = 'SELECT DISTINCT area FROM locations WHERE country = $1 AND city = $2 AND area <> \'\'';
    const dbQuery = searchTerm
      ? `${dbQueryBase} AND area ILIKE $3 ORDER BY area LIMIT $4`
      : `${dbQueryBase} ORDER BY area LIMIT $3`;
    const dbParams = searchTerm
      ? [country, city, `%${searchTermRaw}%`, limit]
      : [country, city, limit];
    const dbResult = await pool.query(dbQuery, dbParams);
    if (dbResult.rows.length > 0) {
      const areas = dbResult.rows.map(row => row.area).filter(Boolean);
      setListInMemory(locationMemoryCache.areas, cacheKey, areas, LOCATION_CACHE_TTLS.AREAS);
      return respond(areas);
    }

    console.log(`🌍 Fetching areas for ${city}, ${country} from Nominatim API...`);
    const searchParams = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: limit.toString(),
      dedupe: '1'
    });
    if (searchTerm) {
      searchParams.set('q', `${searchTermRaw}, ${city}, ${country}`);
    } else {
      // Use city and country names directly in query
      searchParams.set('q', `area in ${city}, ${country}`);
    }
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    const areas = [...new Set(data
      .filter(item => item.address && (item.address.suburb || item.address.neighbourhood || item.address.district))
      .map(item => item.address.suburb || item.address.neighbourhood || item.address.district)
    )];

    if (areas.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const areaName of areas.slice(0, 50)) {
          await client.query(
            'INSERT INTO locations (country, city, area, street) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [country, city, areaName, 'Unknown']
          );
        }
        await client.query('COMMIT');
        console.log(`✅ Cached ${Math.min(areas.length, 50)} areas for ${city}`);
      } catch (cacheError) {
        await client.query('ROLLBACK');
        console.log('Cache error (non-critical):', cacheError.message);
      } finally {
        client.release();
      }
    }

    setListInMemory(locationMemoryCache.areas, cacheKey, areas, LOCATION_CACHE_TTLS.AREAS);
    respond(areas);
  } catch (error) {
    logger.error('Get areas error:', error);
    res.status(500).json({ error: 'Failed to get areas' });
  }
});

// Get streets for a country, city, and area
app.get('/api/locations/countries/:country/cities/:city/areas/:area/streets', async (req, res) => {
  try {
    const country = req.params.country;
    const city = req.params.city;
    const area = req.params.area;
    const searchTermRaw = (req.query.q || '').trim();
    const searchTerm = searchTermRaw.toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const cacheKey = `${country.toLowerCase()}::${city.toLowerCase()}::${area.toLowerCase()}::${searchTerm}`;

    const respond = (list) => {
      const unique = [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
      res.json(unique.slice(0, limit));
    };

    const cached = getListFromMemory(locationMemoryCache.streets, cacheKey);
    if (cached?.length) {
      return respond(cached);
    }

    const dbQueryBase = 'SELECT DISTINCT street FROM locations WHERE country = $1 AND city = $2 AND area = $3 AND street <> \'\'';
    const dbQuery = searchTerm
      ? `${dbQueryBase} AND street ILIKE $4 ORDER BY street LIMIT $5`
      : `${dbQueryBase} ORDER BY street LIMIT $4`;
    const dbParams = searchTerm
      ? [country, city, area, `%${searchTermRaw}%`, limit]
      : [country, city, area, limit];
    const dbResult = await pool.query(dbQuery, dbParams);
    if (dbResult.rows.length > 0) {
      const streets = dbResult.rows.map(row => row.street).filter(Boolean);
      setListInMemory(locationMemoryCache.streets, cacheKey, streets, LOCATION_CACHE_TTLS.STREETS);
      return respond(streets);
    }

    console.log(`🌍 Fetching streets for ${area}, ${city}, ${country} from Nominatim API...`);
    const searchParams = new URLSearchParams({
      format: 'json',
      addressdetails: '1',
      limit: limit.toString(),
      dedupe: '1'
    });
    if (searchTerm) {
      searchParams.set('q', `${searchTermRaw}, ${area}, ${city}, ${country}`);
    } else {
      // Use area, city and country names directly in query
      searchParams.set('q', `street in ${area}, ${city}, ${country}`);
    }
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    const streets = [...new Set(data
      .filter(item => item.address && (item.address.road || item.address.street || item.address.pedestrian))
      .map(item => item.address.road || item.address.street || item.address.pedestrian)
    )];

    if (streets.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const streetName of streets.slice(0, 50)) {
          await client.query(
            'INSERT INTO locations (country, city, area, street) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [country, city, area, streetName]
          );
        }
        await client.query('COMMIT');
        console.log(`✅ Cached ${Math.min(streets.length, 50)} streets for ${area}`);
      } catch (cacheError) {
        await client.query('ROLLBACK');
        console.log('Cache error (non-critical):', cacheError.message);
      } finally {
        client.release();
      }
    }

    setListInMemory(locationMemoryCache.streets, cacheKey, streets, LOCATION_CACHE_TTLS.STREETS);
    respond(streets);
  } catch (error) {
    logger.error('Get streets error:', error);
    res.status(500).json({ error: 'Failed to get streets' });
  }
});

// Get coordinate mappings for reverse geocoding
app.get('/api/locations/coordinates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM coordinate_mappings');
    const mappings = {};
    result.rows.forEach(row => {
      mappings[row.location_key] = {
        lat: [parseFloat(row.lat_min), parseFloat(row.lat_max)],
        lng: [parseFloat(row.lng_min), parseFloat(row.lng_max)],
        country: row.country,
        city: row.city
      };
    });
    res.json(mappings);
  } catch (error) {
    logger.error('Get coordinate mappings error:', error);
    res.status(500).json({ error: 'Failed to get coordinate mappings' });
  }
});

// Location search using Nominatim API (worldwide coverage)
app.get('/api/locations/search', async (req, res) => {
  try {
    const { q, country, city, limit = 10 } = req.query;

    if (!q || q.length < 2 || q.length > 200) {
      return res.status(400).json({ error: 'Search query must be between 2 and 200 characters' });
    }

    // Build Nominatim query
    // Append city and country to q to avoid Nominatim parameter issues
    let finalQuery = q;
    if (city) finalQuery += `, ${city}`;
    if (country) finalQuery += `, ${country}`;

    let nominatimQuery = `q=${encodeURIComponent(finalQuery)}&format=json&addressdetails=1&limit=${Math.min(parseInt(limit), 50)}&dedupe=1`;

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${nominatimQuery}`;

    console.log('🌍 Nominatim search:', nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform Nominatim results to our format
    const results = data.map(item => ({
      placeId: item.place_id,
      displayName: item.display_name,
      coordinates: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      },
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      importance: item.importance,
      address: {
        country: item.address?.country || '',
        city: item.address?.city || item.address?.town || item.address?.village || '',
        area: item.address?.suburb || item.address?.neighbourhood || item.address?.district || '',
        street: item.address?.road || item.address?.street || item.address?.pedestrian || '',
        buildingNumber: item.address?.house_number || '',
        postcode: item.address?.postcode || ''
      }
    }));

    // Cache popular results in database (optional)
    if (results.length > 0 && q.length > 3) {
      // Cache top result for future use
      const topResult = results[0];
      try {
        await pool.query(
          `INSERT INTO locations (country, city, area, street)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (country, city, area, street) DO NOTHING`,
          [
            topResult.address.country || 'Unknown',
            topResult.address.city || 'Unknown',
            topResult.address.area || 'Unknown',
            topResult.address.street || 'Unknown'
          ]
        );
      } catch (cacheError) {
        // Ignore cache errors
        console.log('Cache error (non-critical):', cacheError.message);
      }
    }

    res.json(results);

  } catch (error) {
    logger.error('Location search error:', error);
    res.status(500).json({ error: 'Failed to search locations' });
  }
});

// Reverse geocoding using Nominatim API
app.get('/api/locations/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

    console.log('🌍 Nominatim reverse:', nominatimUrl);

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || data.error) {
      return res.status(404).json({ error: 'Location not found' });
    }

    const result = {
      displayName: data.display_name,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      address: {
        country: data.address?.country || '',
        city: data.address?.city || data.address?.town || data.address?.village || '',
        area: data.address?.suburb || data.address?.neighbourhood || data.address?.district || '',
        street: data.address?.road || data.address?.street || data.address?.pedestrian || '',
        buildingNumber: data.address?.house_number || '',
        postcode: data.address?.postcode || ''
      }
    };

    res.json(result);

  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    res.status(500).json({ error: 'Failed to reverse geocode location' });
  }
});

// Get popular cities for a country using Nominatim
app.get('/api/locations/countries/:country/cities/search', async (req, res) => {
  try {
    const { country } = req.params;
    const { limit = 20 } = req.query;

    // First check database
    const dbResult = await pool.query(
      'SELECT DISTINCT city FROM locations WHERE country = $1 ORDER BY city LIMIT $2',
      [country, Math.min(parseInt(limit), 50)]
    );

    if (dbResult.rows.length > 0) {
      res.json(dbResult.rows.map(row => row.city));
      return;
    }

    // Fallback to Nominatim API
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(country)}&format=json&addressdetails=1&limit=${Math.min(parseInt(limit), 50)}&dedupe=1&type=city`;

    const response = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'Matrix-Delivery-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    const cities = [...new Set(data
      .filter(item => item.address && (item.address.city || item.address.town || item.address.village))
      .map(item => item.address.city || item.address.town || item.address.village)
    )].sort();

    res.json(cities);

  } catch (error) {
    logger.error('Get cities search error:', error);
    res.status(500).json({ error: 'Failed to search cities' });
  }
});

// ============ ADMIN BACKEND API ENDPOINTS ============
// Add these endpoints after the existing routes

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
  try {
    // Check for token in cookies first (preferred method)
    let token = req.cookies?.token;

    // Fall back to Authorization header
    if (!token) {
      token = req.headers['authorization']?.split(' ')[1];
    }

    console.log('🔐 verifyAdmin - Token present:', !!token);
    console.log('🔐 verifyAdmin - Cookies:', Object.keys(req.cookies || {}));
    console.log('🔐 verifyAdmin - Auth header:', req.headers['authorization']?.substring(0, 20));

    if (!token) {
      console.log('❌ verifyAdmin - No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔐 verifyAdmin - Token decoded:', { userId: decoded.userId, primary_role: decoded.primary_role });

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT id, email, name, primary_role, granted_roles FROM users WHERE id = $1',
      [decoded.userId]
    );

    const row = userResult.rows[0];
    console.log('🔐 verifyAdmin - User from DB:', {
      id: row?.id,
      primary_role: row?.primary_role,
      granted_roles: row?.granted_roles
    });

    const hasAdmin = row && (row.primary_role === 'admin' || (Array.isArray(row.granted_roles) && row.granted_roles.includes('admin')));
    console.log('🔐 verifyAdmin - Has admin?', hasAdmin);

    if (userResult.rows.length === 0 || !hasAdmin) {
      console.log('❌ verifyAdmin - Admin access denied');
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Set both req.user and req.admin for consistency
    req.user = decoded;
    req.admin = { id: row.id, email: row.email, name: row.name };
    console.log('✅ verifyAdmin - Access granted');
    next();
  } catch (error) {
    logger.error('❌ Admin verification error:', error.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Log admin actions
const logAdminAction = async (adminId, action, targetType, targetId, details = {}) => {
  try {
    await pool.query(
      `INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [adminId, action, targetType, targetId, JSON.stringify(details), details.ip || 'unknown']
    );
  } catch (error) {
    logger.error('Log admin action error:', error);
  }
};

// ============ ADMIN DASHBOARD STATISTICS ============
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
  try {
    const { range = '7d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get total users
    const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(totalUsersResult.rows[0].count);

    // Get new users in range
    const newUsersResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= $1',
      [startDate]
    );
    const newUsers = parseInt(newUsersResult.rows[0].count);

    // Get users by primary_role
    const usersByRoleResult = await pool.query(
      `SELECT primary_role, COUNT(*) as count FROM users GROUP BY primary_role`
    );
    const usersByRole = {};
    usersByRoleResult.rows.forEach(row => {
      usersByRole[row.primary_role] = parseInt(row.count);
    });

    // Get total orders
    const totalOrdersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = parseInt(totalOrdersResult.rows[0].count);

    // Get orders by status
    const ordersByStatusResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    );
    const ordersByStatus = [];
    const statusColors = {
      'pending_bids': '#FCD34D',
      'accepted': '#60A5FA',
      'picked_up': '#C084FC',
      'in_transit': '#F472B6',
      'delivered': '#34D399',
      'cancelled': '#F87171'
    };

    ordersByStatusResult.rows.forEach(row => {
      ordersByStatus.push({
        name: row.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: parseInt(row.count),
        color: statusColors[row.status] || '#9CA3AF'
      });
    });

    // Get active orders
    const activeOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE status IN ('accepted', 'picked_up', 'in_transit')`
    );
    const activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Get completed orders
    const completedOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'`
    );
    const completedOrders = parseInt(completedOrdersResult.rows[0].count);

    // Calculate revenue
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(assigned_driver_bid_price), 0) as total
       FROM orders WHERE status = 'delivered' AND assigned_driver_bid_price IS NOT NULL`
    );
    const revenue = parseFloat(revenueResult.rows[0].total);

    // Get revenue by month
    const revenueDataResult = await pool.query(
      `SELECT
        TO_CHAR(delivered_at, 'Mon') as month,
        COALESCE(SUM(assigned_driver_bid_price), 0) as revenue
       FROM orders
       WHERE status = 'delivered'
         AND delivered_at >= NOW() - INTERVAL '6 months'
         AND assigned_driver_bid_price IS NOT NULL
       GROUP BY TO_CHAR(delivered_at, 'Mon'), DATE_TRUNC('month', delivered_at)
       ORDER BY DATE_TRUNC('month', delivered_at) ASC`
    );
    const revenueData = revenueDataResult.rows.map(row => ({
      month: row.month,
      revenue: parseFloat(row.revenue)
    }));

    // Get user growth
    const userGrowthResult = await pool.query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM') as date,
        COUNT(*) as users
       FROM users
       WHERE created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'YYYY-MM')
       ORDER BY TO_CHAR(created_at, 'YYYY-MM') ASC`
    );

    let cumulativeUsers = totalUsers - newUsers;
    const userGrowth = userGrowthResult.rows.map(row => {
      cumulativeUsers += parseInt(row.users);
      return {
        date: row.date,
        users: cumulativeUsers
      };
    });

    // Calculate metrics
    const avgOrderValueResult = await pool.query(
      `SELECT AVG(assigned_driver_bid_price) as avg_value
       FROM orders
       WHERE status = 'delivered' AND assigned_driver_bid_price IS NOT NULL`
    );
    const avgOrderValue = parseFloat(avgOrderValueResult.rows[0].avg_value) || 0;

    const completionRateResult = await pool.query(
      `SELECT
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN status != 'pending_bids' THEN 1 END), 0) as rate
       FROM orders`
    );
    const completionRate = parseFloat(completionRateResult.rows[0].rate) || 0;

    const avgDeliveryTimeResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - accepted_at)) / 3600) as avg_hours
       FROM orders
       WHERE status = 'delivered'
         AND accepted_at IS NOT NULL
         AND delivered_at IS NOT NULL`
    );
    const avgDeliveryTime = parseFloat(avgDeliveryTimeResult.rows[0].avg_hours) || 0;

    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews`
    );
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    res.json({
      totalUsers,
      newUsers,
      usersByRole,
      totalOrders,
      activeOrders,
      completedOrders,
      revenue,
      ordersByStatus,
      revenueData,
      userGrowth,
      metrics: {
        avgOrderValue,
        completionRate,
        avgDeliveryTime,
        avgRating
      }
    });

    await logAdminAction(req.admin.id, 'VIEW_STATS', 'dashboard', null, { range, ip: req.ip });
  } catch (error) {
    logger.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// ============ USER MANAGEMENT ============
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', primary_role = 'all', status = 'all' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(`(
        LOWER(name) LIKE LOWER($${paramCount}) OR
        LOWER(email) LIKE LOWER($${paramCount}) OR
        id LIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (primary_role !== 'all') {
      whereConditions.push(`primary_role = $${paramCount}`);
      queryParams.push(primary_role);
      paramCount++;
    }

    if (status === 'verified') {
      whereConditions.push(`is_verified = true`);
    } else if (status === 'unverified') {
      whereConditions.push(`is_verified = false`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM users ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    queryParams.push(parseInt(limit), offset);
    const usersResult = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.primary_role, u.granted_roles, u.vehicle_type,
        u.rating, u.completed_deliveries, u.is_verified, u.is_available,
        u.country, u.city, u.area, u.created_at,
        (SELECT COUNT(*) FROM orders WHERE customer_id = u.id OR assigned_driver_user_id = u.id) as total_orders,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as total_reviews
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    const users = usersResult.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      primary_role: user.primary_role,
      granted_roles: Array.isArray(user.granted_roles) && user.granted_roles.length ? user.granted_roles : [user.primary_role].filter(Boolean),
      vehicleType: user.vehicle_type,
      rating: parseFloat(user.rating),
      completedDeliveries: user.completed_deliveries,
      isVerified: user.is_verified,
      isAvailable: user.is_available,
      country: user.country,
      city: user.city,
      area: user.area,
      totalOrders: parseInt(user.total_orders),
      totalReviews: parseInt(user.total_reviews),
      createdAt: user.created_at
    }));

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

    await logAdminAction(req.admin.id, 'VIEW_USERS', 'users', null, { page, limit, search, primary_role, ip: req.ip });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user details
app.get('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  try {
    const userResult = await pool.query(
      `SELECT 
        u.*, 
        (SELECT COUNT(*) FROM orders WHERE customer_id = u.id) as customer_orders,
        (SELECT COUNT(*) FROM orders WHERE assigned_driver_user_id = u.id) as driver_orders,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as reviews_received,
        (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id) as reviews_given,
        (SELECT AVG(rating) FROM reviews WHERE reviewee_id = u.id) as avg_rating
       FROM users u
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const ordersResult = await pool.query(
      `SELECT * FROM orders
       WHERE customer_id = $1 OR assigned_driver_user_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [req.params.id]
    );

    const reviewsResult = await pool.query(
      `SELECT r.*, reviewer.name as reviewer_name, reviewee.name as reviewee_name
       FROM reviews r
       LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
       WHERE r.reviewer_id = $1 OR r.reviewee_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        primary_role: user.primary_role,
        vehicleType: user.vehicle_type,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        isVerified: user.is_verified,
        isAvailable: user.is_available,
        country: user.country,
        city: user.city,
        area: user.area,
        customerOrders: parseInt(user.customer_orders),
        driverOrders: parseInt(user.driver_orders),
        reviewsReceived: parseInt(user.reviews_received),
        reviewsGiven: parseInt(user.reviews_given),
        avgRating: parseFloat(user.avg_rating) || 0,
        createdAt: user.created_at
      },
      recentOrders: ordersResult.rows,
      recentReviews: reviewsResult.rows
    });

    await logAdminAction(req.admin.id, 'VIEW_USER_DETAILS', 'user', req.params.id, { ip: req.ip });
  } catch (error) {
    logger.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Update user granted_roles (assign/remove granted_roles)
app.post('/api/admin/users/:id/granted_roles', verifyAdmin, async (req, res) => {
  try {
    const { add = [], remove = [] } = req.body || {};
    const allowed = ['customer', 'driver', 'admin', 'support'];
    const userResult = await pool.query('SELECT id, primary_role, granted_roles FROM users WHERE id = $1', [req.params.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = userResult.rows[0];
    let granted_roles = Array.isArray(current.granted_roles) && current.granted_roles.length ? current.granted_roles.slice() : [current.primary_role].filter(Boolean);
    const addClean = add.filter(r => allowed.includes(r));
    const removeClean = remove.filter(r => allowed.includes(r));
    granted_roles = Array.from(new Set([...granted_roles, ...addClean])).filter(r => !removeClean.includes(r));
    if (granted_roles.length === 0) {
      granted_roles = [current.primary_role].filter(Boolean);
    }
    await pool.query('UPDATE users SET granted_roles = $1 WHERE id = $2', [granted_roles, req.params.id]);
    await logAdminAction(req.admin.id, 'UPDATE_ROLES', 'user', req.params.id, { add: addClean, remove: removeClean, ip: req.ip });
    res.json({ id: req.params.id, granted_roles });
  } catch (error) {
    logger.error('Update granted_roles error:', error);
    res.status(500).json({ error: 'Failed to update granted_roles' });
  }
});

// Verify user
app.post('/api/admin/users/:id/verify', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    await createNotification(
      user.id,
      null,
      'account_verified',
      'Account Verified',
      'Your account has been verified by an administrator.'
    );

    logger.info(`Admin verified user`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      userId: user.id,
      userEmail: user.email,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'VERIFY_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      ip: req.ip
    });

    res.json({
      message: 'User verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isVerified: user.is_verified
      }
    });
  } catch (error) {
    logger.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Suspend user
app.post('/api/admin/users/:id/suspend', verifyAdmin, async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await pool.query(
      'UPDATE users SET is_available = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    await createNotification(
      user.id,
      null,
      'account_suspended',
      'Account Suspended',
      `Your account has been suspended. ${reason ? `Reason: ${reason}` : 'Please contact support.'}`
    );

    logger.info(`Admin suspended user`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      userId: user.id,
      userEmail: user.email,
      reason,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'SUSPEND_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      reason,
      ip: req.ip
    });

    res.json({
      message: 'User suspended successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAvailable: user.is_available
      }
    });
  } catch (error) {
    logger.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Unsuspend user
app.post('/api/admin/users/:id/unsuspend', verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE users SET is_available = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    await createNotification(
      user.id,
      null,
      'account_unsuspended',
      'Account Reactivated',
      'Your account has been reactivated.'
    );

    logger.info(`Admin unsuspended user`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      userId: user.id,
      userEmail: user.email,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'UNSUSPEND_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      ip: req.ip
    });

    res.json({
      message: 'User unsuspended successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAvailable: user.is_available
      }
    });
  } catch (error) {
    logger.error('Unsuspend user error:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

// Delete user
app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const userResult = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    const activeOrdersResult = await client.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE (customer_id = $1 OR assigned_driver_user_id = $1)
       AND status IN ('pending_bids', 'accepted', 'picked_up', 'in_transit')`,
      [req.params.id]
    );

    if (parseInt(activeOrdersResult.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Cannot delete user with active orders.'
      });
    }

    await client.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    logger.info(`Admin deleted user`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      userId: user.id,
      userEmail: user.email,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'DELETE_USER', 'user', req.params.id, {
      userName: user.name,
      userEmail: user.email,
      ip: req.ip
    });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  } finally {
    client.release();
  }
});

// ============ ORDER MANAGEMENT ============
app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all', search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (status !== 'all') {
      whereConditions.push(`o.status = $${paramCount}`);
      queryParams.push(status);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(
        o.order_number LIKE $${paramCount} OR
        o.title LIKE $${paramCount} OR
        o.id LIKE $${paramCount} OR
        c.name LIKE $${paramCount} OR
        c.email LIKE $${paramCount}
      )`);
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders o
       LEFT JOIN users c ON o.customer_id = c.id
       ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    queryParams.push(parseInt(limit), offset);
    const ordersResult = await pool.query(
      `SELECT
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        d.name as driver_name,
        d.email as driver_email,
        (SELECT COUNT(*) FROM bids WHERE order_id = o.id) as bid_count
       FROM orders o
       LEFT JOIN users c ON o.customer_id = c.id
       LEFT JOIN users d ON o.assigned_driver_user_id = d.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    const orders = ordersResult.rows.map(order => ({
      id: order.id,
      orderNumber: order.order_number,
      title: order.title,
      description: order.description,
      pickupAddress: order.pickup_address,
      deliveryAddress: order.delivery_address,
      price: parseFloat(order.price),
      status: order.status,
      customerId: order.customer_id,
      customerName: order.customer_name,
      customerEmail: order.customer_email,
      driverId: order.assigned_driver_user_id,
      driverName: order.driver_name,
      driverEmail: order.driver_email,
      assignedDriverBidPrice: order.assigned_driver_bid_price ? parseFloat(order.assigned_driver_bid_price) : null,
      bidCount: parseInt(order.bid_count),
      createdAt: order.created_at,
      acceptedAt: order.accepted_at,
      pickedUpAt: order.picked_up_at,
      deliveredAt: order.delivered_at,
      cancelledAt: order.cancelled_at
    }));

    res.json({
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });

    await logAdminAction(req.admin.id, 'VIEW_ORDERS', 'orders', null, { page, limit, status, search, ip: req.ip });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Get single order details
app.get('/api/admin/orders/:id', verifyAdmin, async (req, res) => {
  try {
    const orderResult = await pool.query(
      `SELECT
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        d.name as driver_name,
        d.email as driver_email,
        d.phone as driver_phone,
        d.vehicle_type as driver_vehicle_type
       FROM orders o
       LEFT JOIN users c ON o.customer_id = c.id
       LEFT JOIN users d ON o.assigned_driver_user_id = d.id
       WHERE o.id = $1`,
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    const bidsResult = await pool.query(
      `SELECT b.*, u.name as driver_name, u.email as driver_email, u.phone as driver_phone,
              u.rating as driver_rating, u.completed_deliveries as driver_deliveries
       FROM bids b
       JOIN users u ON b.user_id = u.id
       WHERE b.order_id = $1
       ORDER BY b.created_at DESC`,
      [req.params.id]
    );

    const locationUpdatesResult = await pool.query(
      `SELECT * FROM location_updates
       WHERE order_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.params.id]
    );

    const paymentResult = await pool.query(
      `SELECT * FROM payments WHERE order_id = $1`,
      [req.params.id]
    );

    res.json({
      order: {
        id: order.id,
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
        packageDescription: order.package_description,
        packageWeight: order.package_weight ? parseFloat(order.package_weight) : null,
        estimatedValue: order.estimated_value ? parseFloat(order.estimated_value) : null,
        specialInstructions: order.special_instructions,
        price: parseFloat(order.price),
        status: order.status,
        customer: {
          id: order.customer_id,
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone
        },
        driver: order.assigned_driver_user_id ? {
          id: order.assigned_driver_user_id,
          name: order.driver_name,
          email: order.driver_email,
          phone: order.driver_phone,
          vehicleType: order.driver_vehicle_type
        } : null,
        assignedDriverBidPrice: order.assigned_driver_bid_price ? parseFloat(order.assigned_driver_bid_price) : null,
        createdAt: order.created_at,
        acceptedAt: order.accepted_at,
        pickedUpAt: order.picked_up_at,
        deliveredAt: order.delivered_at,
        cancelledAt: order.cancelled_at
      },
      bids: bidsResult.rows,
      locationUpdates: locationUpdatesResult.rows,
      payment: paymentResult.rows[0] || null
    });

    await logAdminAction(req.admin.id, 'VIEW_ORDER_DETAILS', 'order', req.params.id, { ip: req.ip });
  } catch (error) {
    logger.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to get order details' });
  }
});

// Cancel order
app.post('/api/admin/orders/:id/cancel', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { reason } = req.body;

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'delivered' || order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot cancel completed or already cancelled order' });
    }

    await client.query(
      `UPDATE orders SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );

    await createNotification(
      order.customer_id,
      order.id,
      'order_cancelled',
      'Order Cancelled',
      `Your order ${order.order_number} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`
    );

    if (order.assigned_driver_user_id) {
      await createNotification(
        order.assigned_driver_user_id,
        order.id,
        'order_cancelled',
        'Order Cancelled',
        `Order ${order.order_number} has been cancelled. ${reason ? `Reason: ${reason}` : ''}`
      );
    }

    await client.query('COMMIT');

    logger.info(`Admin cancelled order`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      orderId: req.params.id,
      orderNumber: order.order_number,
      reason,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'CANCEL_ORDER', 'order', req.params.id, {
      orderNumber: order.order_number,
      reason,
      ip: req.ip
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Cancel order error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

// ============ ANALYTICS & REPORTS ============
app.get('/api/admin/analytics/performance', verifyAdmin, async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    const now = new Date();
    let startDate = new Date();
    switch (range) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    const avgOrderValueResult = await pool.query(
      `SELECT AVG(assigned_driver_bid_price) as avg_value
       FROM orders
       WHERE status = 'delivered'
         AND assigned_driver_bid_price IS NOT NULL
         AND delivered_at >= $1`,
      [startDate]
    );

    const completionRateResult = await pool.query(
      `SELECT
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 /
        NULLIF(COUNT(CASE WHEN status != 'pending_bids' THEN 1 END), 0) as rate
       FROM orders
       WHERE created_at >= $1`,
      [startDate]
    );

    const avgDeliveryTimeResult = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (delivered_at - accepted_at)) / 3600) as avg_hours
       FROM orders
       WHERE status = 'delivered'
         AND accepted_at IS NOT NULL
         AND delivered_at IS NOT NULL
         AND delivered_at >= $1`,
      [startDate]
    );

    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating
       FROM reviews
       WHERE created_at >= $1`,
      [startDate]
    );

    const topDriversResult = await pool.query(
      `SELECT
        u.id, u.name, u.email, u.rating,
        COUNT(o.id) as deliveries,
        COALESCE(SUM(o.assigned_driver_bid_price), 0) as earnings
       FROM users u
       JOIN orders o ON o.assigned_driver_user_id = u.id
       WHERE u.primary_role = 'driver'
         AND o.status = 'delivered'
         AND o.delivered_at >= $1
       GROUP BY u.id, u.name, u.email, u.rating
       ORDER BY deliveries DESC, earnings DESC
       LIMIT 10`,
      [startDate]
    );

    const ordersByHourResult = await pool.query(
      `SELECT
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
       FROM orders
       WHERE created_at >= $1
       GROUP BY EXTRACT(HOUR FROM created_at)
       ORDER BY hour`,
      [startDate]
    );

    res.json({
      performance: {
        avgOrderValue: parseFloat(avgOrderValueResult.rows[0].avg_value) || 0,
        completionRate: parseFloat(completionRateResult.rows[0].rate) || 0,
        avgDeliveryTime: parseFloat(avgDeliveryTimeResult.rows[0].avg_hours) || 0,
        customerSatisfaction: parseFloat(avgRatingResult.rows[0].avg_rating) || 0
      },
      topDrivers: topDriversResult.rows.map(driver => ({
        id: driver.id,
        name: driver.name,
        email: driver.email,
        rating: parseFloat(driver.rating),
        deliveries: parseInt(driver.deliveries),
        earnings: parseFloat(driver.earnings)
      })),
      ordersByHour: ordersByHourResult.rows.map(row => ({
        hour: `${String(row.hour).padStart(2, '0')}:00`,
        orders: parseInt(row.count)
      }))
    });

    await logAdminAction(req.admin.id, 'VIEW_ANALYTICS', 'analytics', null, { range, ip: req.ip });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ============ SYSTEM LOGS ============
app.get('/api/admin/logs', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, type = 'all', startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];
    let paramCount = 1;

    if (type !== 'all') {
      whereConditions.push(`action LIKE $${paramCount}`);
      queryParams.push(`${type.toUpperCase()}%`);
      paramCount++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramCount}`);
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramCount}`);
      queryParams.push(endDate);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) as count FROM admin_logs ${whereClause}`,
      queryParams
    );
    const totalCount = parseInt(countResult.rows[0].count);

    queryParams.push(parseInt(limit), offset);
    const logsResult = await pool.query(
      `SELECT
        al.*,
        u.name as admin_name,
        u.email as admin_email
       FROM admin_logs al
       LEFT JOIN users u ON al.admin_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      queryParams
    );

    const logs = logsResult.rows.map(log => ({
      id: log.id,
      adminId: log.admin_id,
      adminName: log.admin_name,
      adminEmail: log.admin_email,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      details: log.details,
      ipAddress: log.ip_address,
      createdAt: log.created_at
    }));

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Clear old logs
app.delete('/api/admin/logs/clear', verifyAdmin, async (req, res) => {
  try {
    const { olderThan = '90d' } = req.body;

    let daysAgo = 90;
    if (olderThan.endsWith('d')) {
      daysAgo = parseInt(olderThan);
    }

    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    const result = await pool.query(
      `DELETE FROM admin_logs WHERE created_at < $1`,
      [dateThreshold]
    );

    logger.info(`Admin cleared old logs`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      deletedCount: result.rowCount,
      olderThan,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'CLEAR_LOGS', 'system', null, {
      olderThan,
      deletedCount: result.rowCount,
      ip: req.ip
    });

    res.json({
      message: 'Logs cleared successfully',
      deletedCount: result.rowCount
    });
  } catch (error) {
    logger.error('Clear logs error:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

// ============ SYSTEM SETTINGS ============
app.get('/api/admin/settings', verifyAdmin, async (req, res) => {
  try {
    const settingsResult = await pool.query(
      'SELECT * FROM system_settings ORDER BY key'
    );

    const settings = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        type: row.type,
        description: row.description,
        updatedAt: row.updated_at
      };
    });

    res.json(settings);

    await logAdminAction(req.admin.id, 'VIEW_SETTINGS', 'system', null, { ip: req.ip });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update system setting
app.put('/api/admin/settings/:key', verifyAdmin, async (req, res) => {
  try {
    const { value } = req.body;

    const result = await pool.query(
      `INSERT INTO system_settings (key, value, updated_at, updated_by)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3)
       ON CONFLICT (key)
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $3
       RETURNING *`,
      [req.params.key, value, req.admin.id]
    );

    logger.info(`Admin updated setting`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      settingKey: req.params.key,
      newValue: value,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'UPDATE_SETTING', 'system', req.params.key, {
      key: req.params.key,
      value,
      ip: req.ip
    });

    res.json({
      message: 'Setting updated successfully',
      setting: result.rows[0]
    });
  } catch (error) {
    logger.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// ============ BULK OPERATIONS ============
app.post('/api/admin/users/bulk/verify', verifyAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'User IDs array required' });
    }

    const result = await client.query(
      `UPDATE users SET is_verified = true
       WHERE id = ANY($1::varchar[])
       RETURNING id, name, email`,
      [userIds]
    );

    for (const user of result.rows) {
      await createNotification(
        user.id,
        null,
        'account_verified',
        'Account Verified',
        'Your account has been verified by an administrator.'
      );
    }

    await client.query('COMMIT');

    logger.info(`Admin bulk verified users`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      count: result.rowCount,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'BULK_VERIFY_USERS', 'users', null, {
      count: result.rowCount,
      userIds,
      ip: req.ip
    });

    res.json({
      message: 'Users verified successfully',
      count: result.rowCount,
      users: result.rows
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Bulk verify error:', error);
    res.status(500).json({ error: 'Failed to verify users' });
  } finally {
    client.release();
  }
});

// ============ DATABASE BACKUP ============
app.post('/api/admin/backup/create', verifyAdmin, async (req, res) => {
  try {
    const backupId = generateId();
    const timestamp = new Date().toISOString();

    const tables = ['users', 'orders', 'bids', 'notifications', 'reviews', 'payments'];
    const tableCounts = {};

    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
      tableCounts[table] = parseInt(result.rows[0].count);
    }

    await pool.query(
      `INSERT INTO backups (id, created_by, table_counts, status, created_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
      [backupId, req.admin.id, JSON.stringify(tableCounts), 'completed']
    );

    logger.info(`Admin created database backup`, {
      adminId: req.admin.id,
      adminName: req.admin.name,
      backupId,
      tableCounts,
      category: 'admin'
    });
    await logAdminAction(req.admin.id, 'CREATE_BACKUP', 'system', backupId, {
      backupId,
      tableCounts,
      ip: req.ip
    });

    res.json({
      message: 'Backup created successfully',
      backupId,
      timestamp,
      tableCounts
    });
  } catch (error) {
    logger.error('Create backup error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

// ============ REPORTS GENERATION ============
app.get('/api/admin/reports/revenue', verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00:00';
        break;
      case 'day':
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    let whereConditions = ['status = \'delivered\'', 'assigned_driver_bid_price IS NOT NULL'];
    let queryParams = [];
    let paramCount = 1;

    if (startDate) {
      whereConditions.push(`delivered_at >= $${paramCount}`);
      queryParams.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereConditions.push(`delivered_at <= $${paramCount}`);
      queryParams.push(endDate);
      paramCount++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const result = await pool.query(
      `SELECT
        TO_CHAR(delivered_at, '${dateFormat}') as period,
        COUNT(*) as order_count,
        SUM(assigned_driver_bid_price) as total_revenue,
        AVG(assigned_driver_bid_price) as avg_order_value,
        MIN(assigned_driver_bid_price) as min_order_value,
        MAX(assigned_driver_bid_price) as max_order_value
       FROM orders
       ${whereClause}
       GROUP BY TO_CHAR(delivered_at, '${dateFormat}')
       ORDER BY period`,
      queryParams
    );

    const report = result.rows.map(row => ({
      period: row.period,
      orderCount: parseInt(row.order_count),
      totalRevenue: parseFloat(row.total_revenue),
      avgOrderValue: parseFloat(row.avg_order_value),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value)
    }));

    await logAdminAction(req.admin.id, 'GENERATE_REVENUE_REPORT', 'reports', null, {
      startDate,
      endDate,
      groupBy,
      ip: req.ip
    });

    res.json({
      report,
      summary: {
        totalOrders: report.reduce((sum, r) => sum + r.orderCount, 0),
        totalRevenue: report.reduce((sum, r) => sum + r.totalRevenue, 0),
        avgOrderValue: report.reduce((sum, r) => sum + r.avgOrderValue, 0) / report.length || 0
      }
    });
  } catch (error) {
    logger.error('Generate revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});


// ============ END OF ADMIN BACKEND API ENDPOINTS ============
// Continue with Error Handling

// Load payments routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// Load messages routes
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// Load upload routes
const uploadRoutes = require('./routes/uploads');
app.use('/api/uploads', uploadRoutes);

// Load crypto payment routes
app.use('/api/crypto', cryptoPaymentRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res, next) => {
  // Pass API requests to the error handler/404 if not found
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Error handling middleware
app.use(logger.errorLogger);

// 404 handler
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    category: 'http'
  });
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    category: 'error'
  });

  // Don't leak error details in production
  const errorMessage = IS_PRODUCTION ? 'Internal server error' : err.message;

  res.status(500).json({
    error: errorMessage,
    ...(IS_TEST && { stack: err.stack }) // Include stack trace in test mode
  });
});

// Initialize notification service with null io (will be set by server.js)
const { initializeNotificationService } = require('./services/notificationService.ts');
initializeNotificationService(pool, null, logger);

module.exports = app;

// ============ END OF SERVER.JS ============
