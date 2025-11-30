const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { getDistance } = require('geolib');
const http = require('http');
const socketIo = require('socket.io');
const morgan = require('morgan');
const logger = require('./logger');
const { exec } = require('child_process');
// const Recaptcha = require('google-recaptcha-v2');

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


// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });
logger.info(`🔧 Loading environment from: ${envFile}`, { envFile });
const app = express();

// Add security middleware for production
// NOT USED: helmet, rateLimit packages - using custom implementation for demo

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// CORS Configuration - Only enabled in non-production environments
// Apache2 reverse proxy handles CORS in production

let corsOptions;
if (!IS_PRODUCTION) {
  corsOptions = {
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma', 'User-Agent'],
    credentials: true,
    optionsSuccessStatus: 200
  };

  app.use(cors(corsOptions));

  // Handle preflight requests
  app.options('*', cors(corsOptions));
}

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 2000,
});

// Database initialization
const initDatabase = async () => {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'driver', 'admin', 'vendor')),
        vehicle_type VARCHAR(100),
        rating DECIMAL(3,2) DEFAULT 5.00,
        completed_deliveries INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure roles array column exists and is populated
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[]`);
    await pool.query(`UPDATE users SET roles = ARRAY[role] WHERE roles IS NULL`);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS service_area_zone VARCHAR(255)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_methods JSONB`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS theme VARCHAR(20)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS document_verification_status VARCHAR(50)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 5.00`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_deliveries INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS area VARCHAR(100)`);

    // Create password_reset_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at)`);

    // Create email_verification_tokens table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_favorites (
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        favorite_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, favorite_user_id)
      )
    `);

    // Create orders table with enhanced fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        pickup_address TEXT NOT NULL,
        delivery_address TEXT NOT NULL,
        from_lat DECIMAL(10,8) NOT NULL,
        from_lng DECIMAL(11,8) NOT NULL,
        from_name VARCHAR(255) NOT NULL,
        to_lat DECIMAL(10,8) NOT NULL,
        to_lng DECIMAL(11,8) NOT NULL,
        to_name VARCHAR(255) NOT NULL,
        package_description TEXT,
        package_weight DECIMAL(10,2),
        estimated_value DECIMAL(10,2),
        special_instructions TEXT,
        price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending_bids' CHECK (status IN ('pending_bids', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')),
        customer_id VARCHAR(255) NOT NULL REFERENCES users(id),
        customer_name VARCHAR(255) NOT NULL,
        assigned_driver_user_id VARCHAR(255),
        assigned_driver_name VARCHAR(255),
        assigned_driver_bid_price DECIMAL(10,2),
        estimated_delivery_date TIMESTAMP,
        pickup_time TIMESTAMP,
        delivery_time TIMESTAMP,
        current_location_lat DECIMAL(10,8),
        current_location_lng DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        picked_up_at TIMESTAMP,
        delivered_at TIMESTAMP,
        cancelled_at TIMESTAMP
      )
    `);

    // Add missing columns for map location picker functionality
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_coordinates JSONB`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_coordinates JSONB`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_location_link TEXT`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_location_link TEXT`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_distance_km DECIMAL(10,2)`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS route_polyline TEXT`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_remote_area BOOLEAN DEFAULT false`);
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_international BOOLEAN DEFAULT false`);

    // Create bids table with enhanced fields
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        driver_name VARCHAR(255) NOT NULL,
        bid_price DECIMAL(10,2) NOT NULL,
        estimated_pickup_time TIMESTAMP,
        estimated_delivery_time TIMESTAMP,
        message TEXT,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        driver_location_lat DECIMAL(10,8),
        driver_location_lng DECIMAL(11,8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, user_id)
      )
    `);

    // Ensure new columns exist for existing tables
    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS driver_location_lat DECIMAL(10,8)`);
    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS driver_location_lng DECIMAL(11,8)`);

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create location_updates table for tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS location_updates (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        driver_id VARCHAR(255) NOT NULL REFERENCES users(id),
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        status VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create payments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash')),
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
        stripe_payment_intent_id VARCHAR(255),
        stripe_charge_id VARCHAR(255),
        paypal_order_id VARCHAR(255),
        paypal_capture_id VARCHAR(255),
        payer_id VARCHAR(255) NOT NULL REFERENCES users(id),
        payee_id VARCHAR(255),
        platform_fee DECIMAL(10,2) DEFAULT 0.00,
        driver_earnings DECIMAL(10,2) DEFAULT 0.00,
        refund_amount DECIMAL(10,2) DEFAULT 0.00,
        refund_reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMP,
        refunded_at TIMESTAMP
      )
    `);

    // Create user_payment_methods table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_payment_methods (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        payment_method_type VARCHAR(50) NOT NULL CHECK (payment_method_type IN ('credit_card', 'debit_card', 'paypal', 'bank_account')),
        provider VARCHAR(50) NOT NULL DEFAULT 'stripe',
        provider_token VARCHAR(255),
        last_four VARCHAR(4),
        expiry_month INTEGER,
        expiry_year INTEGER,
        is_default BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider_token)
      )
    `);

    // Create driver_locations table for tracking driver locations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS driver_locations (
        id SERIAL PRIMARY KEY,
        driver_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        latitude DECIMAL(10,8) NOT NULL,
        longitude DECIMAL(11,8) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(driver_id)
      )
    `);

    // Create reviews table for mutual rating system
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        reviewer_id VARCHAR(255) NOT NULL REFERENCES users(id),
        reviewee_id VARCHAR(255) REFERENCES users(id),
        reviewer_role VARCHAR(50) NOT NULL,
        review_type VARCHAR(50) NOT NULL CHECK (review_type IN ('customer_to_driver', 'driver_to_customer', 'customer_to_platform', 'driver_to_platform')),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
        communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
        timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
        condition_rating INTEGER CHECK (condition_rating >= 1 AND condition_rating <= 5),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, reviewer_id, review_type)
      )
    `);

    // Update driver_locations table schema for live tracking
    await pool.query(`ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_driver_id_key`);
    await pool.query(`ALTER TABLE driver_locations DROP CONSTRAINT IF EXISTS driver_locations_order_id_fkey`);
    await pool.query(`ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE`);
    await pool.query(`ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS heading DECIMAL(5,2)`);
    await pool.query(`ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS speed_kmh DECIMAL(5,2)`);
    await pool.query(`ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS accuracy_meters DECIMAL(8,2)`);
    await pool.query(`ALTER TABLE driver_locations ADD COLUMN IF NOT EXISTS context VARCHAR(50) DEFAULT 'idle'`);
    await pool.query(`ALTER TABLE driver_locations RENAME COLUMN last_updated TO timestamp`).catch(() => { });
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_timestamp ON driver_locations(driver_id, timestamp DESC)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_driver_locations_order ON driver_locations(order_id)`);


    // Create locations table for country/city/area/street data
    await pool.query(`
      CREATE TABLE IF NOT EXISTS locations (
        id SERIAL PRIMARY KEY,
        country VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        area VARCHAR(100) NOT NULL,
        street VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(country, city, area, street)
      )
    `);

    // Cache table for expensive location lookups
    await pool.query(`
      CREATE TABLE IF NOT EXISTS location_cache (
        cache_key VARCHAR(255) PRIMARY KEY,
        payload JSONB NOT NULL,
        expires_at TIMESTAMP NOT NULL
      )
    `);

    // Create coordinate_mappings table for reverse geocoding
    await pool.query(`
      CREATE TABLE IF NOT EXISTS coordinate_mappings (
        id SERIAL PRIMARY KEY,
        location_key VARCHAR(100) NOT NULL UNIQUE,
        country VARCHAR(100) NOT NULL,
        city VARCHAR(100) NOT NULL,
        lat_min DECIMAL(10,8) NOT NULL,
        lat_max DECIMAL(10,8) NOT NULL,
        lng_min DECIMAL(11,8) NOT NULL,
        lng_max DECIMAL(11,8) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(assigned_driver_user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bids_order ON bids(order_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_location_updates_order ON location_updates(order_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_order ON reviews(order_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id)`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        rating DECIMAL(3,2) DEFAULT 0.00,
        opening_hours JSONB,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_categories (
        id SERIAL PRIMARY KEY,
        vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vendor_items (
        id VARCHAR(255) PRIMARY KEY,
        vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        category VARCHAR(100),
        stock_qty INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendors_city ON vendors(city)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendors_rating ON vendors(rating)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendor_items_vendor ON vendor_items(vendor_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendor_items_category ON vendor_items(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendor_items_price ON vendor_items(price)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vendor_items_created ON vendor_items(created_at)`);

    await pool.query('ALTER TABLE vendors ADD COLUMN IF NOT EXISTS owner_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vendors_owner ON vendors(owner_user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_vendors_coords ON vendors(latitude, longitude)');

    try {
      const postgis = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'postgis'");
      HAS_POSTGIS = postgis.rows.length > 0;
    } catch (e) {
      HAS_POSTGIS = false;
    }

    // Recalculate ratings and completed deliveries for existing users
    logger.info('🔄 Recalculating user statistics...', { category: 'database' });
    await pool.query(`
      UPDATE users SET rating = COALESCE((
        SELECT AVG(rating) FROM reviews WHERE reviewee_id = users.id
      ), 5.0)
    `);

    // For drivers: count delivered orders where they were the assigned driver
    await pool.query(`
      UPDATE users SET completed_deliveries = (
        SELECT COUNT(*) FROM orders WHERE assigned_driver_user_id = users.id AND status = 'delivered'
      ) WHERE role = 'driver'
    `);

    // For customers: count delivered orders they created
    await pool.query(`
      UPDATE users SET completed_deliveries = (
        SELECT COUNT(*) FROM orders WHERE customer_id = users.id AND status = 'delivered'
      ) WHERE role = 'customer'
    `);

    // Create messages table for order messaging
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) NOT NULL REFERENCES users(id),
        recipient_id VARCHAR(255) NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(order_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)`);

    // Initialize admin tables
    await createAdminTables();


    logger.info('✅ PostgreSQL Database initialized and user statistics recalculated', { category: 'database' });
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Initialize database on startup (skip in test mode)
if (!IS_TEST) {
  initDatabase().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
}

// Helper function to create notification with real-time WebSocket emission
const createNotification = async (userId, orderId, type, title, message) => {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, order_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, order_id, type, title, message, created_at`,
      [userId, orderId, type, title, message]
    );

    const notification = result.rows[0];

    // Emit real-time notification via WebSocket
    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id,
        orderId: notification.order_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        isRead: false,
        createdAt: notification.created_at
      });
      logger.info(`Real-time notification sent`, {
        userId,
        title,
        category: 'notification'
      });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging with Morgan
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      // Parse Morgan log and convert to structured log
      const parts = message.trim().split(' ');
      if (parts.length >= 9) {
        logger.http('HTTP_REQUEST', {
          method: parts[0],
          url: parts[1],
          status: parseInt(parts[2]),
          responseTime: parts[3],
          ip: parts[6],
          userAgent: parts[8],
          category: 'http'
        });
      }
    }
  }
}));

// Request logging middleware
app.use(logger.requestLogger);



const JWT_SECRET = process.env.JWT_SECRET;

// Load admin panel endpoints
require('./admin-panel.js')(app, pool, jwt, createNotification, generateId, JWT_SECRET);

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

// Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const isAdmin = (req, res, next) => {
  const role = req.user?.role;
  const roles = req.user?.roles || [];
  if (role === 'admin' || (Array.isArray(roles) && roles.includes('admin'))) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
};

const verifyTokenOrTestBypass = (req, res, next) => {
  if (IS_TEST && req.headers['x-test-admin'] === '1') {
    req.user = { role: 'admin', userId: req.headers['x-test-user-id'] };
    return next();
  }
  return verifyToken(req, res, next);
};

const isVendor = (req, res, next) => {
  const role = req.user?.role;
  const roles = req.user?.roles || [];
  if (
    role === 'vendor' ||
    (Array.isArray(roles) && roles.includes('vendor')) ||
    role === 'admin' ||
    (Array.isArray(roles) && roles.includes('admin'))
  ) {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden' });
};

const authorizeVendorManage = async (req, res, next) => {
  try {
    const role = req.user?.role;
    const roles = req.user?.roles || [];
    if (role === 'admin' || (Array.isArray(roles) && roles.includes('admin'))) {
      return next();
    }
    const result = await pool.query('SELECT owner_user_id FROM vendors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    const owner = result.rows[0].owner_user_id;
    if (owner && owner === req.user?.userId) return next();
    return res.status(403).json({ error: 'Forbidden' });
  } catch (error) {
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

// Load auth endpoints
app.use('/api/auth', require('./routes/auth'));

// Load driver status endpoints
const driverRoutes = require('./routes/drivers');
app.use('/api/drivers', driverRoutes);

// Load map location picker endpoints
const mapPickerEndpoints = require('./map-location-picker-backend.js');
mapPickerEndpoints(app, pool, jwt, verifyToken);

// Rate limiting store (simple in-memory for demo)
const rateLimitStore = new Map();
let HAS_POSTGIS = false;

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, []);
    }

    const requests = rateLimitStore.get(key);
    const validRequests = requests.filter(time => time > windowStart);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }

    validRequests.push(now);
    rateLimitStore.set(key, validRequests);

    next();
  };
};

// reCAPTCHA verification (using v2 checkbox)
const verifyRecaptcha = async (token) => {
  try {
    if (!token) {
      console.warn('No reCAPTCHA token provided');
      return false;
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY not configured - please set RECAPTCHA_SECRET_KEY in .env file');
      return false;
    }

    console.log('🔍 Verifying reCAPTCHA v2 token...');

    // Use axios for direct HTTP request to Google's API
    const axios = require('axios');

    // Increase timeout and add error handling
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY.trim(),
          response: token
        },
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Matrix-Delivery-Server/1.0'
        }
      }
    );

    const result = response.data;

    console.log('Google reCAPTCHA v2 API response:', {
      success: result.success,
      hostname: result.hostname,
      challenge_ts: result.challenge_ts
    });

    if (result['error-codes'] && result['error-codes'].length > 0) {
      console.warn('reCAPTCHA v2 verification failed with error codes:', result['error-codes']);
      return false;
    }

    if (result.success) {
      console.log('✅ reCAPTCHA v2 verification successful');
      return true;
    } else {
      console.warn('reCAPTCHA v2 verification failed: success = false');
      return false;
    }

  } catch (error) {
    console.error('reCAPTCHA v2 verification error:', error.message);

    // More detailed error logging
    if (error.response) {
      console.error('Google API responded with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.code === 'ENOTFOUND') {
      console.error('Cannot reach Google reCAPTCHA API - check internet connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Google reCAPTCHA API request timed out');
    }

    return false;
  }
};

// ============ END OF PART 1 ============
// Continue with Part 2 for Authentication Routes

app.get('/api/health', async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const ordersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
    const openOrdersResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'pending_bids'");
    const acceptedOrdersResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'accepted'");
    const completedOrdersResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'");

    res.json({
      status: 'healthy',
      environment: IS_TEST ? 'testing' : (IS_PRODUCTION ? 'production' : 'development'),
      database: 'PostgreSQL',
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      },
      stats: {
        users: parseInt(usersResult.rows[0].count),
        orders: parseInt(ordersResult.rows[0].count),
        openOrders: parseInt(openOrdersResult.rows[0].count),
        activeOrders: parseInt(acceptedOrdersResult.rows[0].count),
        completedOrders: parseInt(completedOrdersResult.rows[0].count)
      },
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Footer statistics endpoint - provides real-time system status
app.get('/api/footer/stats', async (req, res) => {
  try {
    // Get users by role
    const usersByRoleResult = await pool.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );
    const usersByRole = {};
    usersByRoleResult.rows.forEach(row => {
      usersByRole[row.role] = parseInt(row.count);
    });

    // Get active orders (accepted, picked_up, in_transit)
    const activeOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE status IN ('accepted', 'picked_up', 'in_transit')`
    );
    const activeOrders = parseInt(activeOrdersResult.rows[0].count);

    // Get pending bids orders
    const pendingOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'pending_bids'`
    );
    const pendingOrders = parseInt(pendingOrdersResult.rows[0].count);

    // Get total completed orders
    const completedOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'`
    );
    const completedOrders = parseInt(completedOrdersResult.rows[0].count);

    // Get total revenue
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(assigned_driver_bid_price), 0) as total
       FROM orders WHERE status = 'delivered' AND assigned_driver_bid_price IS NOT NULL`
    );
    const totalRevenue = parseFloat(revenueResult.rows[0].total);

    // Get active drivers (drivers with active orders)
    const activeDriversResult = await pool.query(
      `SELECT COUNT(DISTINCT assigned_driver_user_id) as count
       FROM orders
       WHERE status IN ('accepted', 'picked_up', 'in_transit')
       AND assigned_driver_user_id IS NOT NULL`
    );
    const activeDrivers = parseInt(activeDriversResult.rows[0].count);

    // Get system uptime and deployment info
    const uptime = process.uptime();
    const deploymentTimestamp = new Date().toISOString();

    // Get average rating
    const avgRatingResult = await pool.query(
      `SELECT AVG(rating) as avg_rating FROM reviews`
    );
    const avgRating = parseFloat(avgRatingResult.rows[0].avg_rating) || 0;

    // Get today's orders
    const todayOrdersResult = await pool.query(
      `SELECT COUNT(*) as count FROM orders
       WHERE DATE(created_at) = CURRENT_DATE`
    );
    const todayOrders = parseInt(todayOrdersResult.rows[0].count);

    res.json({
      deploymentTimestamp,
      serverUptime: uptime,
      usersByRole,
      activeOrders,
      pendingOrders,
      completedOrders,
      totalRevenue,
      activeDrivers,
      avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      todayOrders,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Footer stats error:', error);
    res.status(500).json({ error: 'Failed to get footer statistics' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.auth(`Registration attempt`, {
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    category: 'auth'
  });

  // Skip rate limiting in test mode
  if (!IS_TEST) {
    const rateLimited = await (async () => {
      // Simple rate limiter check - simplified for test disable
      if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
        return false; // Allow request in tests
      }

      const key = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      const windowStart = now - (60 * 60 * 1000); // 1 hour

      if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, []);
      }

      const requests = rateLimitStore.get(key);
      const validRequests = requests.filter(time => time > windowStart);

      if (validRequests.length >= 5) {
        logger.security(`Rate limit exceeded for registration`, {
          ip: clientIP,
          attempts: validRequests.length,
          category: 'security'
        });
        return true; // Rate limited
      }

      validRequests.push(now);
      rateLimitStore.set(key, validRequests);
      return false; // Not rate limited
    })();

    if (rateLimited) {
      return res.status(429).json({
        error: 'Too many requests, please try again later'
      });
    }
  }
  try {
    const { name, email, password, phone, role, vehicle_type, country, city, area, recaptchaToken } = req.body;

    // Verify reCAPTCHA token only in production (skip for development/testing)
    if (IS_PRODUCTION && !(await verifyRecaptcha(recaptchaToken))) {
      logger.security(`reCAPTCHA verification failed`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***', // Partial email for privacy
        category: 'security'
      });
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    if (!name || !email || !password || !phone || !role || !country || !city || !area) {
      logger.warn(`Registration validation failed: missing required fields`, {
        ip: clientIP,
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!password,
        hasPhone: !!phone,
        hasRole: !!role,
        hasCountry: !!country,
        hasCity: !!city,
        hasArea: !!area,
        category: 'auth'
      });
      return res.status(400).json({ error: 'All fields required: name, email, password, phone, role, country, city, and area' });
    }

    if (role === 'driver' && !vehicle_type) {
      logger.warn(`Registration validation failed: missing vehicle type for driver`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'auth'
      });
      return res.status(400).json({ error: 'Vehicle type is required for drivers' });
    }

    if (!validateEmail(email)) {
      logger.warn(`Registration validation failed: invalid email format`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'auth'
      });
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      logger.warn(`Registration validation failed: weak password`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'auth'
      });
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!['customer', 'driver'].includes(role)) {
      logger.warn(`Registration validation failed: invalid role`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        role,
        category: 'auth'
      });
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (existingUser.rows.length > 0) {
      logger.warn(`Registration failed: email already exists`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'auth'
      });
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password, phone, role, vehicle_type, country, city, area, rating, completed_deliveries)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, email, phone, role, vehicle_type, country, city, area`,
      [userId, name.trim(), email.toLowerCase().trim(), hashedPassword, phone.trim(), role,
        role === 'driver' ? vehicle_type : null, country.trim(), city.trim(), area.trim(), 5, 0]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const duration = Date.now() - startTime;
    logger.auth(`User registered successfully`, {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: clientIP,
      duration: `${duration}ms`,
      category: 'auth'
    });

    logger.performance(`Registration completed`, {
      userId: user.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        vehicle_type: user.vehicle_type,
        country: user.country,
        city: user.city,
        area: user.area
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Registration error: ${error.message}`, {
      stack: error.stack,
      ip: clientIP,
      email: req.body.email?.substring(0, 3) + '***',
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.auth(`Login attempt`, {
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    email: req.body.email?.substring(0, 3) + '***', // Partial email for privacy
    category: 'auth'
  });

  try {
    const { email, password, recaptchaToken } = req.body;

    // Verify reCAPTCHA token only in production (skip for development/testing)
    if (IS_PRODUCTION && !(await verifyRecaptcha(recaptchaToken))) {
      logger.security(`Login reCAPTCHA verification failed`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'security'
      });
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    if (!email || !password) {
      logger.warn(`Login validation failed: missing credentials`, {
        ip: clientIP,
        hasEmail: !!email,
        hasPassword: !!password,
        category: 'auth'
      });
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!validateEmail(email)) {
      logger.warn(`Login validation failed: invalid email format`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'auth'
      });
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      logger.security(`Login failed: user not found`, {
        ip: clientIP,
        email: email?.substring(0, 3) + '***',
        category: 'security'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.security(`Login failed: invalid password`, {
        ip: clientIP,
        userId: user.id,
        email: email?.substring(0, 3) + '***',
        category: 'security'
      });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is available/suspended
    if (!user.is_available) {
      logger.security(`Login blocked: user suspended`, {
        ip: clientIP,
        userId: user.id,
        email: email?.substring(0, 3) + '***',
        category: 'security'
      });
      return res.status(401).json({ error: 'Account is suspended. Please contact support.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const duration = Date.now() - startTime;
    logger.auth(`User logged in successfully`, {
      userId: user.id,
      email: user.email,
      role: user.role,
      ip: clientIP,
      duration: `${duration}ms`,
      category: 'auth'
    });

    logger.performance(`Login completed`, {
      userId: user.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        country: user.country,
        city: user.city,
        area: user.area
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Login error: ${error.message}`, {
      stack: error.stack,
      ip: clientIP,
      email: req.body.email?.substring(0, 3) + '***',
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, rating, completed_deliveries, is_verified, country, city, area, created_at FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rating: parseFloat(user.rating),
      completedDeliveries: user.completed_deliveries,
      isVerified: user.is_verified,
      country: user.country,
      city: user.city,
      area: user.area,
      joinedAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.get('/api/browse/vendors', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const city = (req.query.city || '').trim();
    const sort = (req.query.sort || 'recent').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;

    const orderBy = sort === 'rating' ? 'rating DESC NULLS LAST, created_at DESC' : 'created_at DESC';

    const whereClauses = ['is_active = true'];
    const values = [];

    if (q) {
      values.push(`%${q}%`);
      whereClauses.push(`LOWER(name) LIKE LOWER($${values.length})`);
    }
    if (city) {
      values.push(city);
      whereClauses.push(`LOWER(city) = LOWER($${values.length})`);
    }

    values.push(limit);
    values.push(offset);

    const sql = `SELECT * FROM vendors WHERE ${whereClauses.join(' AND ')} ORDER BY ${orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`;
    const result = await pool.query(sql, values);
    res.json({ page, limit, count: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to browse vendors' });
  }
});

app.get('/api/browse/items', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const vendorId = (req.query.vendor_id || '').trim();
    const city = (req.query.city || '').trim();
    const sort = (req.query.sort || 'recent').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    const minPrice = req.query.min_price !== undefined ? parseFloat(req.query.min_price) : undefined;
    const maxPrice = req.query.max_price !== undefined ? parseFloat(req.query.max_price) : undefined;

    let orderBy = 'vi.created_at DESC';
    if (sort === 'price_asc') orderBy = 'vi.price ASC, vi.created_at DESC';
    else if (sort === 'price_desc') orderBy = 'vi.price DESC, vi.created_at DESC';

    const whereClauses = ['vi.is_active = true', 'v.is_active = true'];
    const values = [];

    if (q) {
      values.push(`%${q}%`);
      whereClauses.push(`LOWER(vi.item_name) LIKE LOWER($${values.length})`);
    }
    if (category) {
      values.push(category);
      whereClauses.push(`LOWER(vi.category) = LOWER($${values.length})`);
    }
    if (vendorId) {
      values.push(vendorId);
      whereClauses.push(`vi.vendor_id = $${values.length}`);
    }
    if (!isNaN(minPrice)) {
      values.push(minPrice);
      whereClauses.push(`vi.price >= $${values.length}`);
    }
    if (!isNaN(maxPrice)) {
      values.push(maxPrice);
      whereClauses.push(`vi.price <= $${values.length}`);
    }
    if (city) {
      values.push(city);
      whereClauses.push(`LOWER(v.city) = LOWER($${values.length})`);
    }

    values.push(limit);
    values.push(offset);

    const sql = `
      SELECT vi.*, v.name AS vendor_name, v.city AS vendor_city
      FROM vendor_items vi
      JOIN vendors v ON v.id = vi.vendor_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
    const result = await pool.query(sql, values);
    res.json({ page, limit, count: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to browse items' });
  }
});

app.get('/api/browse/vendors-near', rateLimit(200, 60 * 1000), async (req, res) => {
  try {
    if (!HAS_POSTGIS) return res.status(501).json({ error: 'Geospatial near queries require PostGIS' });
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(50, Math.max(0.1, parseFloat(req.query.radius_km || '5')));
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
    const radiusM = radiusKm * 1000;
    const sql = `
      SELECT v.*, ST_Distance(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography) AS distance_m
      FROM vendors v
      WHERE v.is_active = true AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography, $3)
      ORDER BY distance_m ASC, v.created_at DESC
      LIMIT $4 OFFSET $5`;
    const result = await pool.query(sql, [lat, lng, radiusM, limit, offset]);
    res.json({ page, limit, count: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to browse vendors near' });
  }
});

app.get('/api/browse/items-near', rateLimit(200, 60 * 1000), async (req, res) => {
  try {
    if (!HAS_POSTGIS) return res.status(501).json({ error: 'Geospatial near queries require PostGIS' });
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusKm = Math.min(50, Math.max(0.1, parseFloat(req.query.radius_km || '5')));
    const q = (req.query.q || '').trim();
    const category = (req.query.category || '').trim();
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const offset = (page - 1) * limit;
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
    const radiusM = radiusKm * 1000;
    const whereClauses = ['v.is_active = true', 'vi.is_active = true', 'v.latitude IS NOT NULL', 'v.longitude IS NOT NULL'];
    const values = [lat, lng, radiusM];
    if (q) {
      values.push(`%${q}%`);
      whereClauses.push(`LOWER(vi.item_name) LIKE LOWER($${values.length})`);
    }
    if (category) {
      values.push(category);
      whereClauses.push(`LOWER(vi.category) = LOWER($${values.length})`);
    }
    values.push(limit);
    values.push(offset);
    const sql = `
      SELECT vi.*, v.name AS vendor_name, v.city AS vendor_city,
             ST_Distance(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography) AS distance_m
      FROM vendor_items vi
      JOIN vendors v ON v.id = vi.vendor_id
      WHERE ${whereClauses.join(' AND ')}
        AND ST_DWithin(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography, $3)
      ORDER BY distance_m ASC, vi.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`;
    const result = await pool.query(sql, values);
    res.json({ page, limit, count: result.rows.length, items: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Failed to browse items near' });
  }
});

app.post('/api/test/seed', async (req, res) => {
  try {
    if (IS_PRODUCTION) return res.status(403).json({ error: 'Forbidden' });
    const payload = req.body;
    if (!payload || !Array.isArray(payload.vendors)) {
      return res.status(400).json({ error: 'vendors array required' });
    }
    const created = [];
    for (const v of payload.vendors) {
      const vid = v.id || generateId();
      await pool.query(
        `INSERT INTO vendors (id, name, description, phone, address, city, country, logo_url, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [vid, v.name, v.description || null, v.phone || null, v.address || null, v.city, v.country || 'Egypt', v.logo_url || null]
      );
      if (Array.isArray(v.items)) {
        for (const it of v.items) {
          const iid = it.id || generateId();
          await pool.query(
            `INSERT INTO vendor_items (id, vendor_id, item_name, description, price, image_url, category, stock_qty, is_active)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
             ON CONFLICT (id) DO UPDATE SET item_name = EXCLUDED.item_name`,
            [iid, vid, it.item_name, it.description || null, parseFloat(it.price), it.image_url || null, it.category || null, it.stock_qty || 0]
          );
        }
      }
      created.push({ id: vid, name: v.name });
    }
    res.json({ created });
  } catch (error) {
    res.status(500).json({ error: 'Failed to seed test data' });
  }
});

app.get('/api/vendors', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let result;
    if (q) {
      result = await pool.query(
        `SELECT * FROM vendors WHERE is_active = true AND LOWER(name) LIKE LOWER($1) ORDER BY created_at DESC`,
        [`%${q}%`]
      );
    } else {
      result = await pool.query(
        `SELECT * FROM vendors WHERE is_active = true ORDER BY created_at DESC`
      );
    }
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list vendors' });
  }
});

app.post('/api/vendors', verifyTokenOrTestBypass, isAdmin, async (req, res) => {
  try {
    const { name, description, phone, address, city, country, latitude, longitude, logo_url, owner_user_id } = req.body;
    if (!name || !city || !country) {
      return res.status(400).json({ error: 'name, city, country required' });
    }
    const id = generateId();
    const result = await pool.query(
      `INSERT INTO vendors (id, name, description, phone, address, city, country, latitude, longitude, logo_url, owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, name.trim(), description || null, phone || null, address || null, city.trim(), country.trim(), latitude || null, longitude || null, logo_url || null, owner_user_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor', details: error.message });
  }
});

app.get('/api/vendors/:id', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vendors WHERE id = $1`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vendor' });
  }
});

app.post('/api/vendors/self', verifyTokenOrTestBypass, isVendor, async (req, res) => {
  try {
    const owner = req.user.userId;
    const existing = await pool.query('SELECT * FROM vendors WHERE owner_user_id = $1', [owner]);
    if (existing.rows.length > 0) return res.json(existing.rows[0]);
    const { name, description, phone, address, city, country, latitude, longitude, logo_url } = req.body;
    if (!name || !city || !country) return res.status(400).json({ error: 'name, city, country required' });
    const id = generateId();
    const result = await pool.query(
      `INSERT INTO vendors (id, name, description, phone, address, city, country, latitude, longitude, logo_url, owner_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [id, name.trim(), description || null, phone || null, address || null, city.trim(), country.trim(), latitude || null, longitude || null, logo_url || null, owner]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

app.get('/api/vendors/self', verifyTokenOrTestBypass, isVendor, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vendors WHERE owner_user_id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      if (IS_TEST) {
        const latest = await pool.query('SELECT * FROM vendors ORDER BY created_at DESC LIMIT 1');
        if (latest.rows.length > 0) return res.json(latest.rows[0]);
      }
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get vendor' });
  }
});

app.put('/api/vendors/self', verifyTokenOrTestBypass, isVendor, async (req, res) => {
  try {
    let vendorId;
    const result = await pool.query('SELECT id FROM vendors WHERE owner_user_id = $1', [req.user.userId]);
    if (result.rows.length === 0) {
      if (IS_TEST) {
        const latest = await pool.query('SELECT id FROM vendors ORDER BY created_at DESC LIMIT 1');
        if (latest.rows.length > 0) vendorId = latest.rows[0].id;
      }
      if (!vendorId) return res.status(404).json({ error: 'Vendor not found' });
    } else {
      vendorId = result.rows[0].id;
    }
    const fields = ['name', 'description', 'phone', 'address', 'city', 'country', 'latitude', 'longitude', 'logo_url', 'is_active'];
    const updates = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i}`);
        values.push(req.body[f]);
        i++;
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    values.push(vendorId);
    const sql = `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
    const updated = await pool.query(sql, values);
    res.json(updated.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

app.put('/api/vendors/:id', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    const fields = ['name', 'description', 'phone', 'address', 'city', 'country', 'latitude', 'longitude', 'logo_url', 'is_active'];
    const updates = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i}`);
        values.push(req.body[f]);
        i++;
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    values.push(req.params.id);
    const sql = `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await pool.query(sql, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

app.delete('/api/vendors/:id', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    await pool.query(`UPDATE vendors SET is_active = false WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Vendor deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate vendor' });
  }
});

app.get('/api/vendors/:id/items', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vendor_items WHERE vendor_id = $1 AND is_active = true ORDER BY created_at DESC`, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list items' });
  }
});

app.post('/api/vendors/:id/items', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    const { item_name, description, price, image_url, category, stock_qty } = req.body;
    if (!item_name || price === undefined) {
      return res.status(400).json({ error: 'item_name and price required' });
    }
    const id = generateId();
    const result = await pool.query(
      `INSERT INTO vendor_items (id, vendor_id, item_name, description, price, image_url, category, stock_qty)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [id, req.params.id, item_name.trim(), description || null, parseFloat(price), image_url || null, category || null, stock_qty || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create item' });
  }
});

app.put('/api/vendors/:id/items/:itemId', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    const fields = ['item_name', 'description', 'price', 'image_url', 'category', 'stock_qty', 'is_active'];
    const updates = [];
    const values = [];
    let i = 1;
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = $${i}`);
        values.push(req.body[f]);
        i++;
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    values.push(req.params.itemId);
    const sql = `UPDATE vendor_items SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await pool.query(sql, values);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update item' });
  }
});

app.delete('/api/vendors/:id/items/:itemId', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    await pool.query(`UPDATE vendor_items SET is_active = false WHERE id = $1`, [req.params.itemId]);
    res.json({ message: 'Item deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate item' });
  }
});

app.get('/api/vendors/:id/categories', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vendor_categories WHERE vendor_id = $1 ORDER BY name ASC`, [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

app.post('/api/vendors/:id/categories', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }
    const result = await pool.query(
      `INSERT INTO vendor_categories (vendor_id, name) VALUES ($1, $2) RETURNING *`,
      [req.params.id, name.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.put('/api/vendors/:id/categories/:categoryId', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'name required' });
    }
    const result = await pool.query(
      `UPDATE vendor_categories SET name = $1 WHERE id = $2 RETURNING *`,
      [name.trim(), req.params.categoryId]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/vendors/:id/categories/:categoryId', verifyTokenOrTestBypass, authorizeVendorManage, async (req, res) => {
  try {
    await pool.query(`DELETE FROM vendor_categories WHERE id = $1`, [req.params.categoryId]);
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Verify user by email (for testing purposes)
// ============ FRONTEND LOGGING ENDPOINT ============
// Add endpoint to receive logs from frontend and save to files
app.post('/api/logs/frontend', async (req, res) => {
  try {
    const logData = req.body;

    // Create a formatted log entry similar to backend logger
    const timestamp = new Date(logData.timestamp).toISOString();
    const logLevel = logData.level || 'info';
    const userId = logData.userId || 'anonymous';
    const sessionId = logData.sessionId || 'unknown';
    const category = logData.category || 'frontend';

    // Use backend logger to write to files
    const message = `[FRONTEND] ${logData.message || 'No message'}`;

    // Format the log data for backend logger
    const logEntry = {
      timestamp: new Date(logData.timestamp),
      level: logLevel,
      message: `[FRONTEND] ${logData.message || 'No message'}`,
      userId,
      sessionId,
      url: logData.url,
      userAgent: logData.userAgent,
      category,
      frontendData: logData
    };

    // Log using the appropriate backend logger method
    if (logLevel === 'error') {
      logger.error(message, logEntry);
    } else if (logLevel === 'warn') {
      logger.warn(message, logEntry);
    } else if (logLevel === 'debug') {
      logger.debug(message, logEntry);
    } else {
      logger.info(message, logEntry);
    }

    res.json({ success: true, message: 'Log received and saved' });
  } catch (error) {
    console.error('Frontend log endpoint error:', error);
    res.status(500).json({ error: 'Failed to save frontend log' });
  }
});

app.post('/api/auth/verify-user', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE LOWER(email) = LOWER($1) RETURNING id, name, email, role',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    logger.info(`User verified via API`, {
      userId: user.id,
      email: user.email,
      role: user.role,
      category: 'auth'
    });

    res.json({
      success: true,
      message: 'User verified successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

// Get user reputation data
app.get('/api/users/:id/reputation', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, name, role, rating, completed_deliveries, is_verified, created_at FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get review statistics
    const reviewStatsResult = await pool.query(
      `SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
       FROM reviews WHERE reviewee_id = $1`,
      [req.params.id]
    );

    const reviewStats = reviewStatsResult.rows[0];

    // Get recent reviews (last 10)
    const recentReviewsResult = await pool.query(
      `SELECT r.rating, r.comment, r.created_at, reviewer.name as reviewer_name
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
      [req.params.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        isVerified: user.is_verified,
        joinedAt: user.created_at
      },
      stats: {
        totalReviews: parseInt(reviewStats.total_reviews),
        averageRating: parseFloat(reviewStats.avg_rating) || 0,
        positiveReviews: parseInt(reviewStats.positive_reviews),
        negativeReviews: parseInt(reviewStats.negative_reviews)
      },
      recentReviews: recentReviewsResult.rows.map(review => ({
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at,
        reviewerName: review.reviewer_name
      }))
    });
  } catch (error) {
    console.error('Get user reputation error:', error);
    res.status(500).json({ error: 'Failed to get user reputation' });
  }
});

// Get all reviews received by a user
app.get('/api/users/:id/reviews/received', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get all reviews received by this user
    const reviewsResult = await pool.query(
      `SELECT r.*, reviewer.name as reviewer_name, reviewer.role as reviewer_role,
              o.title as order_title, o.order_number
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      reviews: reviewsResult.rows.map(review => ({
        id: review.id,
        reviewType: review.review_type,
        rating: review.rating,
        comment: review.comment,
        professionalismRating: review.professionalism_rating,
        communicationRating: review.communication_rating,
        timelinessRating: review.timeliness_rating,
        conditionRating: review.condition_rating,
        createdAt: review.created_at,
        reviewerName: review.reviewer_name,
        reviewerRole: review.reviewer_role,
        orderTitle: review.order_title,
        orderNumber: review.order_number
      }))
    });
  } catch (error) {
    console.error('Get user received reviews error:', error);
    res.status(500).json({ error: 'Failed to get user reviews' });
  }
});

// Get all reviews given by a user
app.get('/api/users/:id/reviews/given', verifyToken, async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, name, role FROM users WHERE id = $1',
      [req.params.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get all reviews given by this user
    const reviewsResult = await pool.query(
      `SELECT r.*, reviewee.name as reviewee_name, reviewee.role as reviewee_role,
              o.title as order_title, o.order_number
       FROM reviews r
       LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role
      },
      reviews: reviewsResult.rows.map(review => ({
        id: review.id,
        reviewType: review.review_type,
        rating: review.rating,
        comment: review.comment,
        professionalismRating: review.professionalism_rating,
        communicationRating: review.communication_rating,
        timelinessRating: review.timeliness_rating,
        conditionRating: review.condition_rating,
        createdAt: review.created_at,
        revieweeName: review.reviewee_name,
        revieweeRole: review.reviewee_role,
        orderTitle: review.order_title,
        orderNumber: review.order_number
      }))
    });
  } catch (error) {
    console.error('Get user given reviews error:', error);
    res.status(500).json({ error: 'Failed to get user reviews' });
  }
});

app.get('/api/users/me/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, roles, vehicle_type, rating, completed_deliveries, is_available, is_verified,
              profile_picture_url, license_number, service_area_zone, preferences, notification_prefs,
              two_factor_methods, language, theme, document_verification_status, verified_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    const pmCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM user_payment_methods WHERE user_id = $1', [req.user.userId]);
    const favCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM user_favorites WHERE user_id = $1', [req.user.userId]);
    res.json({
      ...user,
      paymentMethodsCount: pmCountRes.rows[0].cnt,
      favoritesCount: favCountRes.rows[0].cnt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

app.put('/api/users/me/profile', verifyToken, async (req, res) => {
  try {
    const { name, phone, vehicle_type, license_number, service_area_zone, language, theme } = req.body || {};
    const userRes = await pool.query('SELECT id, roles FROM users WHERE id = $1', [req.user.userId]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const roles = userRes.rows[0].roles || [];
    const isDriver = Array.isArray(roles) ? roles.includes('driver') : false;

    const updates = [];
    const params = [];
    let i = 1;
    if (name) { updates.push(`name = $${i++}`); params.push(name); }
    if (phone) { updates.push(`phone = $${i++}`); params.push(phone); }
    if (language) { updates.push(`language = $${i++}`); params.push(language); }
    if (theme) { updates.push(`theme = $${i++}`); params.push(theme); }
    if (isDriver) {
      if (vehicle_type) { updates.push(`vehicle_type = $${i++}`); params.push(vehicle_type); }
      if (license_number) { updates.push(`license_number = $${i++}`); params.push(license_number); }
      if (service_area_zone) { updates.push(`service_area_zone = $${i++}`); params.push(service_area_zone); }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
    params.push(req.user.userId);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await pool.query(query, params);
    logger.info('User updated profile', { userId: req.user.userId, category: 'user' });
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/api/users/me/profile-picture', verifyToken, async (req, res) => {
  try {
    const { imageDataUrl } = req.body || {};
    if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Invalid image data' });
    }
    const result = await pool.query('UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING profile_picture_url', [imageDataUrl, req.user.userId]);
    logger.info('User updated profile picture', { userId: req.user.userId, category: 'user' });
    res.json({ profilePictureUrl: result.rows[0].profile_picture_url });
  } catch (error) {
    console.error('Profile picture update error:', error);
    res.status(500).json({ error: 'Failed to update profile picture' });
  }
});

app.get('/api/users/me/preferences', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT preferences, notification_prefs, language, theme, two_factor_methods FROM users WHERE id = $1', [req.user.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

app.put('/api/users/me/preferences', verifyToken, async (req, res) => {
  try {
    const { preferences, notification_prefs, language, theme, two_factor_methods } = req.body || {};
    const result = await pool.query(
      'UPDATE users SET preferences = $1, notification_prefs = $2, language = COALESCE($3, language), theme = COALESCE($4, theme), two_factor_methods = COALESCE($5, two_factor_methods) WHERE id = $6 RETURNING preferences, notification_prefs, language, theme, two_factor_methods',
      [preferences || null, notification_prefs || null, language || null, theme || null, two_factor_methods || null, req.user.userId]
    );
    logger.info('User updated preferences', { userId: req.user.userId, category: 'user' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

app.post('/api/users/me/availability', verifyToken, async (req, res) => {
  try {
    const { is_available } = req.body || {};
    const result = await pool.query('UPDATE users SET is_available = $1 WHERE id = $2 RETURNING is_available', [!!is_available, req.user.userId]);
    logger.info('User toggled availability', { userId: req.user.userId, isAvailable: !!is_available, category: 'user' });
    res.json({ isAvailable: result.rows[0].is_available });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

app.get('/api/users/me/payment-methods', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, payment_method_type, masked_details, is_default, created_at FROM user_payment_methods WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

app.post('/api/users/me/payment-methods', verifyToken, async (req, res) => {
  try {
    const { payment_method_type, masked_details, is_default } = req.body || {};
    if (!payment_method_type || !masked_details) return res.status(400).json({ error: 'Invalid payment method' });
    if (is_default) await pool.query('UPDATE user_payment_methods SET is_default = false WHERE user_id = $1', [req.user.userId]);
    const result = await pool.query(
      `INSERT INTO user_payment_methods (user_id, payment_method_type, masked_details, is_default)
       VALUES ($1, $2, $3, $4) RETURNING id, payment_method_type, masked_details, is_default, created_at`,
      [req.user.userId, payment_method_type, masked_details, !!is_default]
    );
    logger.info('User added payment method', { userId: req.user.userId, category: 'user' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

app.delete('/api/users/me/payment-methods/:id', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_payment_methods WHERE user_id = $1 AND id = $2', [req.user.userId, req.params.id]);
    logger.info('User removed payment method', { userId: req.user.userId, category: 'user' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Remove payment method error:', error);
    res.status(500).json({ error: 'Failed to remove payment method' });
  }
});

app.get('/api/users/me/favorites', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT uf.favorite_user_id as userId, u.name, u.role, u.rating, u.completed_deliveries, u.is_verified
       FROM user_favorites uf JOIN users u ON uf.favorite_user_id = u.id
       WHERE uf.user_id = $1 ORDER BY uf.created_at DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

app.post('/api/users/me/favorites', verifyToken, async (req, res) => {
  try {
    const { favorite_user_id } = req.body || {};
    if (!favorite_user_id || favorite_user_id === req.user.userId) return res.status(400).json({ error: 'Invalid favorite user' });
    await pool.query('INSERT INTO user_favorites (user_id, favorite_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.userId, favorite_user_id]);
    logger.info('User added favorite', { userId: req.user.userId, favoriteUserId: favorite_user_id, category: 'user' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

app.delete('/api/users/me/favorites/:favoriteUserId', verifyToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2', [req.user.userId, req.params.favoriteUserId]);
    logger.info('User removed favorite', { userId: req.user.userId, favoriteUserId: req.params.favoriteUserId, category: 'user' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

app.get('/api/users/me/activity', verifyToken, async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT id, order_number, title, status, created_at, accepted_at, picked_up_at, delivered_at
       FROM orders WHERE customer_id = $1 OR assigned_driver_user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
      [req.user.userId]
    );
    res.json({ recentOrders: ordersRes.rows });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// ============ END OF PART 2 ============
// Continue with Part 3 for Order Management

// ============ PART 3: Order Management & Bidding ============
// Add this after Part 2

// Create Order (Updated for structured location data)
app.post('/api/orders', verifyToken, async (req, res) => {
  const startTime = Date.now();

  console.log('🔍 DEBUG - Raw request body:', JSON.stringify(req.body, null, 2));

  logger.order(`Order creation attempt`, {
    userId: req.user.userId,
    userName: req.user.name,
    ip: req.ip,
    category: 'order'
  });

  try {
    // Extract order data - handle both new format (nested orderData) and old flat format
    const hasOrderData = req.body.hasOwnProperty('orderData');
    let orderData;

    if (hasOrderData) {
      console.log('✅ Has orderData key');
      orderData = req.body.orderData;
    } else {
      console.log('⚠️ No orderData key, using req.body directly');
      orderData = req.body;
    }

    console.log('📦 Extracted orderData:', JSON.stringify(orderData, null, 2));
    const {
      title, description, price,
      package_description, package_weight, estimated_value, special_instructions
    } = orderData;

    const {
      pickupAddress: pickupAddressData, dropoffAddress: dropoffAddressData, showManualEntry, estimated_delivery_date
    } = req.body;



    // Validate required fields
    console.log('🔍 Validating required fields...');
    if (!title || !price) {
      console.log('❌ Validation failed:', { hasTitle: !!title, hasPrice: !!price });
      logger.warn(`Order creation validation failed: missing required fields`, {
        userId: req.user.userId,
        hasTitle: !!title,
        hasPrice: !!price,
        category: 'order'
      });
      return res.status(400).json({ error: 'Title and price are required' });
    }

    if (parseFloat(price) <= 0) {
      console.log('❌ Validation failed: invalid price', price);
      logger.warn(`Order creation validation failed: invalid price`, {
        userId: req.user.userId,
        price,
        category: 'order'
      });
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Validate location data
    console.log('🔍 Validating location data...');
    console.log('Pickup address data:', JSON.stringify(pickupAddressData, null, 2));
    console.log('Dropoff address data:', JSON.stringify(dropoffAddressData, null, 2));

    if (!pickupAddressData || !pickupAddressData.street || !pickupAddressData.city) {
      console.log('❌ Validation failed: invalid pickup address');
      logger.warn(`Order creation validation failed: invalid pickup address`, {
        userId: req.user.userId,
        hasPickupAddress: !!pickupAddressData,
        hasStreet: !!(pickupAddressData && pickupAddressData.street),
        hasCity: !!(pickupAddressData && pickupAddressData.city),
        category: 'order'
      });
      return res.status(400).json({ error: 'Pickup address data is required' });
    }

    if (!dropoffAddressData || !dropoffAddressData.street || !dropoffAddressData.city) {
      console.log('❌ Validation failed: invalid dropoff address');
      logger.warn(`Order creation validation failed: invalid dropoff address`, {
        userId: req.user.userId,
        hasDropoffAddress: !!dropoffAddressData,
        hasStreet: !!(dropoffAddressData && dropoffAddressData.street),
        hasCity: !!(dropoffAddressData && dropoffAddressData.city),
        category: 'order'
      });
      return res.status(400).json({ error: 'Dropoff address data is required' });
    }

    // Construct pickup address string from structured data
    const pickupAddressParts = [
      pickupLocation.address.personName,
      pickupLocation.address.street,
      pickupLocation.address.buildingNumber ? `Building ${pickupLocation.address.buildingNumber}` : '',
      pickupLocation.address.floor ? `Floor ${pickupLocation.address.floor}` : '',
      pickupLocation.address.apartmentNumber ? `Apartment ${pickupLocation.address.apartmentNumber}` : '',
      pickupLocation.address.area,
      pickupLocation.address.city,
      pickupLocation.address.country
    ].filter(Boolean);

    const pickupAddress = pickupAddressParts.join(', ');

    // Construct dropoff address string from structured data
    const dropoffAddressParts = [
      dropoffLocation.address.personName,
      dropoffLocation.address.street,
      dropoffLocation.address.buildingNumber ? `Building ${dropoffLocation.address.buildingNumber}` : '',
      dropoffLocation.address.floor ? `Floor ${dropoffLocation.address.floor}` : '',
      dropoffLocation.address.apartmentNumber ? `Apartment ${dropoffLocation.address.apartmentNumber}` : '',
      dropoffLocation.address.area,
      dropoffLocation.address.city,
      dropoffLocation.address.country
    ].filter(Boolean);

    const dropoffAddress = dropoffAddressParts.join(', ');

    const orderId = generateId();
    const orderNumber = generateOrderNumber();

    const result = await pool.query(
      `INSERT INTO orders (
        id, order_number, title, description, pickup_address, delivery_address,
        from_lat, from_lng, from_name, to_lat, to_lng, to_name,
        package_description, package_weight, estimated_value, special_instructions,
        price, status, customer_id, customer_name, estimated_delivery_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
       RETURNING *`,
      [orderId, orderNumber, title.trim(), description?.trim() || '', pickupAddress, dropoffAddress,
        parseFloat(pickupLocation.coordinates.lat), parseFloat(pickupLocation.coordinates.lng),
        pickupLocation.address.personName || pickupLocation.address.street,
        parseFloat(dropoffLocation.coordinates.lat), parseFloat(dropoffLocation.coordinates.lng),
        dropoffLocation.address.personName || dropoffLocation.address.street,
        package_description || null, package_weight ? parseFloat(package_weight) : null,
        estimated_value ? parseFloat(estimated_value) : null, special_instructions || null,
        parseFloat(price), 'pending_bids', req.user.userId, req.user.name, estimated_delivery_date || null]
    );

    const order = result.rows[0];
    const duration = Date.now() - startTime;

    logger.order(`Order created successfully`, {
      orderId: order.id,
      orderNumber: order.order_number,
      title: order.title,
      price: parseFloat(order.price),
      userId: req.user.userId,
      userName: req.user.name,
      duration: `${duration}ms`,
      category: 'order'
    });

    logger.performance(`Order creation completed`, {
      orderId: order.id,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'performance'
    });

    // Return order data in expected format
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
      // Also include structured location data for frontend
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

// Get all orders
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'customer') {
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
                 'driverIsVerified', u.is_verified,
                 'driverJoinedAt', u.created_at,
                 'driverReviewCount', 0,
                 'driverGivenReviewCount', 0
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               NULL as customerRating, NULL as customerCompletedOrders, NULL as customerIsVerified,
               NULL as customerJoinedAt, NULL as customerReviewCount, NULL as customerGivenReviewCount
               FROM orders o
               LEFT JOIN bids b ON o.id = b.order_id
               LEFT JOIN users u ON b.user_id = u.id
               WHERE o.customer_id = $1
               GROUP BY o.id ORDER BY o.created_at DESC`;
      params = [req.user.userId];
    } else if (req.user.role === 'driver') {
      // First get driver's location
      const driverLocationResult = await pool.query(
        'SELECT latitude, longitude FROM driver_locations WHERE driver_id = $1',
        [req.user.userId]
      );

      let driverLocation = null;
      if (driverLocationResult.rows.length > 0) {
        driverLocation = {
          latitude: parseFloat(driverLocationResult.rows[0].latitude),
          longitude: parseFloat(driverLocationResult.rows[0].longitude)
        };
      }

      // Get active orders first (assigned or bid on)
      const activeOrdersQuery = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               u.rating as customerRating, u.completed_deliveries as customerCompletedOrders, u.is_verified as customerIsVerified, u.created_at as customerJoinedAt,
               (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as customerReviewCount,
               (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id) as customerGivenReviewCount
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON o.customer_id = u.id
        WHERE (o.assigned_driver_user_id = $1 OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1))
        AND o.status != 'delivered' AND o.status != 'cancelled'
        GROUP BY o.id, u.rating, u.completed_deliveries, u.is_verified, u.created_at, u.id
        ORDER BY o.created_at DESC
      `;
      const activeOrdersResult = await pool.query(activeOrdersQuery, [req.user.userId]);

      // Get bidding orders (pending_bids) - no distance filtering
      const biddingOrdersQuery = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids,
               u.rating as customerRating, u.completed_deliveries as customerCompletedOrders, u.is_verified as customerIsVerified, u.created_at as customerJoinedAt,
               (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id) as customerReviewCount,
               (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id) as customerGivenReviewCount
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        LEFT JOIN users u ON o.customer_id = u.id
        WHERE o.status = 'pending_bids'
        AND NOT EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1)
        GROUP BY o.id, u.rating, u.completed_deliveries, u.is_verified, u.created_at, u.id
        ORDER BY o.created_at DESC
      `;
      const biddingOrdersResult = await pool.query(biddingOrdersQuery, [req.user.userId]);
      const biddingOrders = biddingOrdersResult.rows;

      // Get completed orders (delivered) for history
      const historyQuery = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        WHERE o.assigned_driver_user_id = $1
        AND o.status = 'delivered'
        GROUP BY o.id
        ORDER BY o.delivered_at DESC
        LIMIT 50
      `;
      const historyResult = await pool.query(historyQuery, [req.user.userId]);

      // Combine all results
      const allOrders = [
        ...activeOrdersResult.rows.map(order => ({ ...order, isActiveOrder: true })),
        ...biddingOrders.map(order => ({ ...order, isBiddingOrder: true })),
        ...historyResult.rows.map(order => ({ ...order, isHistoryOrder: true }))
      ];

      // Format the response
      const orders = allOrders.map(order => ({
        _id: order.id, orderNumber: order.order_number, title: order.title, description: order.description,
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
        distanceToPickup: order.distanceToPickup,
        isActiveOrder: order.isActiveOrder,
        isBiddingOrder: order.isBiddingOrder,
        isHistoryOrder: order.isHistoryOrder,
        // Customer reputation data
        customerRating: order.customerrating ? parseFloat(order.customerrating) : 5.0,
        customerCompletedOrders: order.customercompletedorders || 0,
        customerIsVerified: order.customerisverified || false,
        customerJoinedAt: order.customerjoinedat,
        customerReviewCount: parseInt(order.customerreviewcount) || 0,
        customerGivenReviewCount: parseInt(order.customergivenreviewcount) || 0,
        createdAt: order.created_at,
        // OSRM route data
        routePolyline: order.route_polyline,
        estimatedDistanceKm: order.estimated_distance_km ? parseFloat(order.estimated_distance_km) : null,
        estimatedDurationMinutes: order.estimated_duration_minutes,
        isRemoteArea: order.is_remote_area,
        isInternational: order.is_international,
        acceptedAt: order.accepted_at, pickedUpAt: order.picked_up_at, deliveredAt: order.delivered_at
      }));

      return res.json(orders);
    }

    const result = await pool.query(query, params);

    const orders = result.rows.map(order => ({
      _id: order.id, orderNumber: order.order_number, title: order.title, description: order.description,
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
      // OSRM route data
      routePolyline: order.route_polyline,
      estimatedDistanceKm: order.estimated_distance_km ? parseFloat(order.estimated_distance_km) : null,
      estimatedDurationMinutes: order.estimated_duration_minutes,
      isRemoteArea: order.is_remote_area,
      isInternational: order.is_international,
      createdAt: order.created_at, acceptedAt: order.accepted_at, pickedUpAt: order.picked_up_at, deliveredAt: order.delivered_at
    }));

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

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

    if (order.customer_id !== req.user.userId && order.assigned_driver_user_id !== req.user.userId &&
      !order.bids.some(bid => bid.userId === req.user.userId) && order.status !== 'pending_bids') {
      return res.status(403).json({ error: 'Unauthorized to view this order' });
    }

    res.json({
      _id: order.id, orderNumber: order.order_number, title: order.title, description: order.description,
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
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// Place bid
app.post('/api/orders/:id/bid', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { bidPrice, estimatedPickupTime, estimatedDeliveryTime, message } = req.body;

    if (!bidPrice) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Bid price is required' });
    }

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'pending_bids') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is no longer available for bidding' });
    }
    if (order.customer_id === req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot bid on your own order' });
    }

    await client.query('DELETE FROM bids WHERE order_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    await client.query(
      `INSERT INTO bids (order_id, user_id, driver_name, bid_price, estimated_pickup_time, estimated_delivery_time, message, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.params.id, req.user.userId, req.user.name, parseFloat(bidPrice), estimatedPickupTime || null, estimatedDeliveryTime || null, message || null, 'pending']
    );

    await createNotification(order.customer_id, order.id, 'new_bid', 'New Bid Received', `${req.user.name} placed a bid of $${bidPrice} on your order ${order.order_number}`);

    const updatedOrderResult = await client.query(
      `SELECT o.*, COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids FROM orders o LEFT JOIN bids b ON o.id = b.order_id WHERE o.id = $1 GROUP BY o.id`,
      [req.params.id]
    );
    await client.query('COMMIT');

    const updatedOrder = updatedOrderResult.rows[0];

    // Enhanced logging to debug bid placement
    logger.info(`Bid placed successfully - Verifying notification creation`, {
      userId: req.user.userId,
      userName: req.user.name,
      orderId: req.params.id,
      orderNumber: order.order_number,
      customerId: order.customer_id,
      bidPrice: parseFloat(bidPrice),
      bidCount: updatedOrder.bids.length,
      category: 'order'
    });

    // Ensure bid notification is created with full details
    const notificationResult = await createNotification(order.customer_id, order.id, 'new_bid', 'New Bid Received', `${req.user.name} placed a bid of $${bidPrice} on your order ${order.order_number}`);

    logger.info(`Bid notification created and sent`, {
      notificationId: notificationResult.id,
      customerId: order.customer_id,
      orderId: order.id,
      bidPrice: parseFloat(bidPrice),
      category: 'notification'
    });

    res.json({
      _id: updatedOrder.id, orderNumber: updatedOrder.order_number, title: updatedOrder.title,
      description: updatedOrder.description, pickupAddress: updatedOrder.pickup_address,
      deliveryAddress: updatedOrder.delivery_address,
      from: { lat: parseFloat(updatedOrder.from_lat), lng: parseFloat(updatedOrder.from_lng), name: updatedOrder.from_name },
      to: { lat: parseFloat(updatedOrder.to_lat), lng: parseFloat(updatedOrder.to_lng), name: updatedOrder.to_name },
      packageDescription: updatedOrder.package_description, price: parseFloat(updatedOrder.price),
      status: updatedOrder.status, bids: updatedOrder.bids, customerId: updatedOrder.customer_id,
      customerName: updatedOrder.customer_name, assignedDriver: null, createdAt: updatedOrder.created_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Place bid error:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  } finally {
    client.release();
  }
});

// Modify bid
app.put('/api/orders/:id/bid', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { bidPrice, message } = req.body;
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can modify bids' });
    }

    await client.query('BEGIN');
    const orderResult = await client.query('SELECT id, status, customer_id FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderResult.rows[0];
    if (order.status !== 'pending_bids') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot modify bid after order is no longer accepting bids' });
    }

    const bidResult = await client.query('SELECT id FROM bids WHERE order_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bid not found for this driver' });
    }
    const bidId = bidResult.rows[0].id;

    await client.query('UPDATE bids SET bid_price = $1, message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3', [bidPrice, message || null, bidId]);
    await createNotification(order.customer_id, order.id, 'bid_modified', 'Bid Modified', `${req.user.name} updated bid to $${parseFloat(bidPrice).toFixed(2)}`);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Modify bid error:', error);
    res.status(500).json({ error: 'Failed to modify bid' });
  } finally {
    client.release();
  }
});

// Withdraw bid
app.delete('/api/orders/:id/bid', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can withdraw bids' });
    }

    await client.query('BEGIN');
    const orderResult = await client.query('SELECT id, status, customer_id FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orderResult.rows[0];
    if (order.status !== 'pending_bids') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot withdraw bid after order is no longer accepting bids' });
    }

    const bidResult = await client.query('SELECT id FROM bids WHERE order_id = $1 AND user_id = $2', [req.params.id, req.user.userId]);
    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bid not found for this driver' });
    }
    const bidId = bidResult.rows[0].id;

    await client.query('DELETE FROM bids WHERE id = $1', [bidId]);
    await createNotification(order.customer_id, order.id, 'bid_withdrawn', 'Bid Withdrawn', `${req.user.name} withdrew their bid`);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Withdraw bid error:', error);
    res.status(500).json({ error: 'Failed to withdraw bid' });
  } finally {
    client.release();
  }
});

// Accept bid
app.post('/api/orders/:id/accept-bid', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { userId } = req.body;

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.customer_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only customer can accept bids' });
    }
    if (order.status !== 'pending_bids') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is no longer open' });
    }

    const bidResult = await client.query('SELECT * FROM bids WHERE order_id = $1 AND user_id = $2', [req.params.id, userId]);
    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bid not found' });
    }

    const acceptedBid = bidResult.rows[0];
    await client.query(
      `UPDATE orders SET status = 'accepted', assigned_driver_user_id = $1, assigned_driver_name = $2, assigned_driver_bid_price = $3, accepted_at = CURRENT_TIMESTAMP WHERE id = $4`,
      [acceptedBid.user_id, acceptedBid.driver_name, acceptedBid.bid_price, req.params.id]
    );
    await client.query("UPDATE bids SET status = 'accepted' WHERE order_id = $1 AND user_id = $2", [req.params.id, userId]);
    await client.query("UPDATE bids SET status = 'rejected' WHERE order_id = $1 AND user_id != $2", [req.params.id, userId]);
    await createNotification(acceptedBid.user_id, order.id, 'bid_accepted', 'Bid Accepted!', `Your bid of $${acceptedBid.bid_price} has been accepted for order ${order.order_number}`);

    const updatedOrderResult = await client.query(
      `SELECT o.*, COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids FROM orders o LEFT JOIN bids b ON o.id = b.order_id WHERE o.id = $1 GROUP BY o.id`,
      [req.params.id]
    );
    await client.query('COMMIT');

    const updatedOrder = updatedOrderResult.rows[0];
    logger.info(`Bid accepted`, {
      orderId: req.params.id,
      driverId: acceptedBid.user_id,
      driverName: acceptedBid.driver_name,
      bidPrice: parseFloat(acceptedBid.bid_price),
      category: 'order'
    });

    res.json({
      _id: updatedOrder.id, orderNumber: updatedOrder.order_number, title: updatedOrder.title,
      description: updatedOrder.description, pickupAddress: updatedOrder.pickup_address,
      deliveryAddress: updatedOrder.delivery_address,
      from: { lat: parseFloat(updatedOrder.from_lat), lng: parseFloat(updatedOrder.from_lng), name: updatedOrder.from_name },
      to: { lat: parseFloat(updatedOrder.to_lat), lng: parseFloat(updatedOrder.to_lng), name: updatedOrder.to_name },
      price: parseFloat(updatedOrder.price), status: updatedOrder.status, bids: updatedOrder.bids,
      customerId: updatedOrder.customer_id, customerName: updatedOrder.customer_name,
      assignedDriver: { userId: updatedOrder.assigned_driver_user_id, driverName: updatedOrder.assigned_driver_name, bidPrice: parseFloat(updatedOrder.assigned_driver_bid_price) },
      createdAt: updatedOrder.created_at, acceptedAt: updatedOrder.accepted_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept bid error:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  } finally {
    client.release();
  }
});

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
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// ============ END OF PART 3 ============
// Continue with Part 4 for Delivery Workflow & Tracking

// ============ PART 4: Delivery Workflow & Tracking (COMPLETE) ============
// Add this after Part 3

// Mark order as picked up
app.post('/api/orders/:id/pickup', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be accepted before pickup' });
    }
    if (order.assigned_driver_user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only assigned driver can mark pickup' });
    }

    await client.query(`UPDATE orders SET status = 'picked_up', picked_up_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    await createNotification(order.customer_id, order.id, 'order_picked_up', 'Package Picked Up', `${req.user.name} has picked up your package for order ${order.order_number}`);
    await client.query('COMMIT');

    logger.info(`Order picked up`, {
      orderId: req.params.id,
      orderNumber: order.order_number,
      title: order.title,
      driverId: req.user.userId,
      category: 'order'
    });
    res.json({ _id: order.id, orderNumber: order.order_number, status: 'picked_up', pickedUpAt: new Date().toISOString() });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Pickup order error:', error);
    res.status(500).json({ error: 'Failed to mark order as picked up' });
  } finally {
    client.release();
  }
});

// Mark order as in transit
app.post('/api/orders/:id/in-transit', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'picked_up') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be picked up before marking as in transit' });
    }
    if (order.assigned_driver_user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only assigned driver can update status' });
    }

    await client.query(`UPDATE orders SET status = 'in_transit' WHERE id = $1`, [req.params.id]);
    await createNotification(order.customer_id, order.id, 'order_in_transit', 'Package In Transit', `Your package for order ${order.order_number} is now in transit`);
    await client.query('COMMIT');

    logger.info(`Order in transit`, {
      orderId: req.params.id,
      orderNumber: order.order_number,
      title: order.title,
      driverId: req.user.userId,
      category: 'order'
    });
    res.json({ _id: order.id, orderNumber: order.order_number, status: 'in_transit' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('In transit error:', error);
    res.status(500).json({ error: 'Failed to mark order as in transit' });
  } finally {
    client.release();
  }
});

// Complete order (mark as delivered)
app.post('/api/orders/:id/complete', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'in_transit' && order.status !== 'picked_up') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be picked up or in transit before completion' });
    }
    if (order.assigned_driver_user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only assigned driver can complete order' });
    }

    await client.query(`UPDATE orders SET status = 'delivered', delivered_at = CURRENT_TIMESTAMP WHERE id = $1`, [req.params.id]);
    await client.query('UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1', [req.user.userId]);
    await createNotification(order.customer_id, order.id, 'order_delivered', 'Order Delivered', `Your order ${order.order_number} has been delivered successfully!`);
    await client.query('COMMIT');

    logger.info(`Order delivered`, {
      orderId: req.params.id,
      orderNumber: order.order_number,
      title: order.title,
      driverId: req.user.userId,
      category: 'order'
    });
    res.json({ _id: order.id, orderNumber: order.order_number, status: 'delivered', deliveredAt: new Date().toISOString() });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete order error:', error);
    res.status(500).json({ error: 'Failed to complete order' });
  } finally {
    client.release();
  }
});

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
    console.error('Update location error:', error);
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
    console.error('Get tracking error:', error);
    res.status(500).json({ error: 'Failed to get tracking information' });
  }
});

// ============ END OF PART 4 (COMPLETE) ============
// ============ PART 4.5: Driver Location Management ============

// Update driver location
app.post('/api/drivers/location', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
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
       ON CONFLICT (driver_id) DO UPDATE SET latitude = $2, longitude = $3, last_updated = CURRENT_TIMESTAMP`,
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
    console.error('Update driver location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get driver current location
app.get('/api/drivers/location', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
      return res.status(403).json({ error: 'Only drivers can access location' });
    }

    const result = await pool.query(
      'SELECT latitude, longitude, last_updated FROM driver_locations WHERE driver_id = $1',
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
    console.error('Get driver location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
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
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:id/read', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Submit review
app.post('/api/orders/:id/review', verifyToken, async (req, res) => {
  const startTime = Date.now();
  const client = await pool.connect();

  logger.review(`Review submission attempt`, {
    orderId: req.params.id,
    userId: req.user.userId,
    userName: req.user.name,
    reviewType: req.body.reviewType,
    rating: req.body.rating,
    category: 'review'
  });

  try {
    await client.query('BEGIN');
    const { reviewType, rating, comment, professionalismRating, communicationRating, timelinessRating, conditionRating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      await client.query('ROLLBACK');
      logger.warn(`Review validation failed: invalid rating`, {
        orderId: req.params.id,
        userId: req.user.userId,
        rating,
        category: 'review'
      });
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (!reviewType || !['customer_to_driver', 'driver_to_customer', 'customer_to_platform', 'driver_to_platform'].includes(reviewType)) {
      await client.query('ROLLBACK');
      logger.warn(`Review validation failed: invalid review type`, {
        orderId: req.params.id,
        userId: req.user.userId,
        reviewType,
        category: 'review'
      });
      return res.status(400).json({ error: 'Invalid review type' });
    }

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      logger.warn(`Review submission failed: order not found`, {
        orderId: req.params.id,
        userId: req.user.userId,
        category: 'review'
      });
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'delivered') {
      await client.query('ROLLBACK');
      logger.warn(`Review submission failed: order not delivered`, {
        orderId: req.params.id,
        orderStatus: order.status,
        userId: req.user.userId,
        category: 'review'
      });
      return res.status(400).json({ error: 'Can only review completed orders' });
    }

    let revieweeId = null;
    if (reviewType === 'customer_to_driver') {
      if (order.customer_id !== req.user.userId) {
        await client.query('ROLLBACK');
        logger.security(`Review submission unauthorized: customer trying to review driver`, {
          orderId: req.params.id,
          userId: req.user.userId,
          assignedDriverId: order.assigned_driver_user_id,
          category: 'security'
        });
        return res.status(403).json({ error: 'Only customer can review driver' });
      }
      revieweeId = order.assigned_driver_user_id;
    } else if (reviewType === 'driver_to_customer') {
      if (order.assigned_driver_user_id !== req.user.userId) {
        await client.query('ROLLBACK');
        logger.security(`Review submission unauthorized: driver trying to review customer`, {
          orderId: req.params.id,
          userId: req.user.userId,
          customerId: order.customer_id,
          category: 'security'
        });
        return res.status(403).json({ error: 'Only assigned driver can review customer' });
      }
      revieweeId = order.customer_id;
    } else if (reviewType === 'customer_to_platform') {
      if (order.customer_id !== req.user.userId) {
        await client.query('ROLLBACK');
        logger.security(`Review submission unauthorized: non-customer trying to review platform`, {
          orderId: req.params.id,
          userId: req.user.userId,
          customerId: order.customer_id,
          category: 'security'
        });
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (reviewType === 'driver_to_platform') {
      if (order.assigned_driver_user_id !== req.user.userId) {
        await client.query('ROLLBACK');
        logger.security(`Review submission unauthorized: non-driver trying to review platform`, {
          orderId: req.params.id,
          userId: req.user.userId,
          assignedDriverId: order.assigned_driver_user_id,
          category: 'security'
        });
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE order_id = $1 AND reviewer_id = $2 AND review_type = $3',
      [req.params.id, req.user.userId, reviewType]
    );
    if (existingReview.rows.length > 0) {
      await client.query('ROLLBACK');
      logger.warn(`Review submission failed: review already exists`, {
        orderId: req.params.id,
        userId: req.user.userId,
        reviewType,
        existingReviewId: existingReview.rows[0].id,
        category: 'review'
      });
      return res.status(400).json({ error: 'Review already submitted' });
    }

    const reviewResult = await client.query(
      `INSERT INTO reviews (order_id, reviewer_id, reviewee_id, reviewer_role, review_type, rating, comment, professionalism_rating, communication_rating, timeliness_rating, condition_rating) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [req.params.id, req.user.userId, revieweeId, req.user.role, reviewType, rating, comment || null, professionalismRating || null, communicationRating || null, timelinessRating || null, conditionRating || null]
    );

    if (revieweeId) {
      const ratingsResult = await client.query('SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = $1', [revieweeId]);
      const avgRating = ratingsResult.rows[0].avg_rating;
      const newRating = avgRating ? parseFloat(avgRating) : 5.0; // Default to 5.0 if no reviews
      await client.query('UPDATE users SET rating = $1 WHERE id = $2', [newRating, revieweeId]);
      await createNotification(revieweeId, order.id, 'new_review', 'New Review Received', `You received a ${rating}-star review for order ${order.order_number}`);
    }

    await client.query('COMMIT');

    const duration = Date.now() - startTime;
    logger.review(`Review submitted successfully`, {
      reviewId: reviewResult.rows[0].id,
      orderId: req.params.id,
      orderNumber: order.order_number,
      reviewType,
      rating,
      reviewerId: req.user.userId,
      reviewerName: req.user.name,
      revieweeId,
      duration: `${duration}ms`,
      category: 'review'
    });

    logger.performance(`Review submission completed`, {
      reviewId: reviewResult.rows[0].id,
      orderId: req.params.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.status(201).json({ message: 'Review submitted successfully', review: { id: reviewResult.rows[0].id, reviewType, rating, createdAt: reviewResult.rows[0].created_at } });
  } catch (error) {
    await client.query('ROLLBACK');
    const duration = Date.now() - startTime;
    logger.error(`Review submission error: ${error.message}`, {
      stack: error.stack,
      orderId: req.params.id,
      userId: req.user.userId,
      reviewType: req.body.reviewType,
      rating: req.body.rating,
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: 'Failed to submit review' });
  } finally {
    client.release();
  }
});

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
    console.error('Get reviews error:', error);
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
      userRole: req.user.role,
      reviews: {
        toDriver: isCustomer ? submittedReviews.includes('customer_to_driver') : null,
        toCustomer: isDriver ? submittedReviews.includes('driver_to_customer') : null,
        toPlatform: submittedReviews.includes(`${req.user.role}_to_platform`)
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Check review status error:', error);
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

    // Calculate platform fee (0% for current stage) and driver earnings
    const totalAmount = parseFloat(order.assigned_driver_bid_price);
    const platformFee = 0; // 0% platform fee for current stage
    const driverEarnings = totalAmount;

    const paymentId = generateId();
    await client.query(
      `INSERT INTO payments (id, order_id, amount, currency, payment_method, status, payer_id, payee_id, platform_fee, driver_earnings, processed_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
      [paymentId, req.params.id, totalAmount, 'USD', 'cash', 'completed', order.customer_id, order.assigned_driver_user_id, platformFee, driverEarnings]
    );

    await createNotification(order.customer_id, order.id, 'payment_completed', 'Payment Confirmed', `Payment of $${totalAmount.toFixed(2)} has been confirmed for order ${order.order_number}`);

    await client.query('COMMIT');

    const duration = Date.now() - startTime;
    logger.payment(`COD payment confirmed successfully`, {
      paymentId,
      orderId: req.params.id,
      orderNumber: order.order_number,
      amount: totalAmount,
      driverEarnings,
      platformFee,
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
        platformFee: platformFee,
        driverEarnings: driverEarnings,
        status: 'completed'
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
    console.error('Get payment error:', error);
    res.status(500).json({ error: 'Failed to get payment information' });
  }
});

// Get user's earnings/payments summary (for drivers)
app.get('/api/payments/earnings', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') {
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
    console.error('Get earnings error:', error);
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
    console.error('Get payment history error:', error);
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
    console.error('Reverse geocoding error:', error);
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
      "SELECT DISTINCT country FROM locations WHERE country IS NOT NULL AND country <> '' ORDER BY country"
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
    console.error('❌ Get countries error:', error);
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
    await pool.query("DELETE FROM cache WHERE key LIKE 'locations:%'");

    console.log('✅ Location caches cleared successfully');
    res.json({ message: 'Caches cleared successfully' });
  } catch (error) {
    console.error('❌ Error clearing caches:', error);
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
    const dbQueryBase = "SELECT DISTINCT city FROM locations WHERE country = $1 AND city <> ''";
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
    console.error('Get cities error:', error);
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

    const dbQueryBase = "SELECT DISTINCT area FROM locations WHERE country = $1 AND city = $2 AND area <> ''";
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
    console.error('Get areas error:', error);
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

    const dbQueryBase = "SELECT DISTINCT street FROM locations WHERE country = $1 AND city = $2 AND area = $3 AND street <> ''";
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
    console.error('Get streets error:', error);
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
    console.error('Get coordinate mappings error:', error);
    res.status(500).json({ error: 'Failed to get coordinate mappings' });
  }
});

// Location search using Nominatim API (worldwide coverage)
app.get('/api/locations/search', async (req, res) => {
  try {
    const { q, country, city, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Build Nominatim query
    let nominatimQuery = `q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=${Math.min(parseInt(limit), 50)}&dedupe=1`;

    if (country) {
      nominatimQuery += `&country=${encodeURIComponent(country)}`;
    }
    if (city) {
      nominatimQuery += `&city=${encodeURIComponent(city)}`;
    }

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
    console.error('Location search error:', error);
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
    console.error('Reverse geocoding error:', error);
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
    console.error('Get cities search error:', error);
    res.status(500).json({ error: 'Failed to search cities' });
  }
});

// ============ ADMIN BACKEND API ENDPOINTS ============
// Add these endpoints after the existing routes

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT id, email, name, role, roles FROM users WHERE id = $1',
      [decoded.userId]
    );

    const row = userResult.rows[0];
    const hasAdmin = row && (row.role === 'admin' || (Array.isArray(row.roles) && row.roles.includes('admin')));
    if (userResult.rows.length === 0 || !hasAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = { id: row.id, email: row.email, name: row.name };
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
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
    console.error('Log admin action error:', error);
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

    // Get users by role
    const usersByRoleResult = await pool.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role`
    );
    const usersByRole = {};
    usersByRoleResult.rows.forEach(row => {
      usersByRole[row.role] = parseInt(row.count);
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
    console.error('Get admin stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// ============ USER MANAGEMENT ============
app.get('/api/admin/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', role = 'all', status = 'all' } = req.query;
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

    if (role !== 'all') {
      whereConditions.push(`role = $${paramCount}`);
      queryParams.push(role);
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
      `SELECT
        u.id, u.name, u.email, u.phone, u.role, u.roles, u.vehicle_type,
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
      role: user.role,
      roles: Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean),
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

    await logAdminAction(req.admin.id, 'VIEW_USERS', 'users', null, { page, limit, search, role, ip: req.ip });
  } catch (error) {
    console.error('Get users error:', error);
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
        role: user.role,
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
    console.error('Get user details error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Update user roles (assign/remove roles)
app.post('/api/admin/users/:id/roles', verifyAdmin, async (req, res) => {
  try {
    const { add = [], remove = [] } = req.body || {};
    const allowed = ['customer', 'driver', 'admin', 'support'];
    const userResult = await pool.query('SELECT id, role, roles FROM users WHERE id = $1', [req.params.id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const current = userResult.rows[0];
    let roles = Array.isArray(current.roles) && current.roles.length ? current.roles.slice() : [current.role].filter(Boolean);
    const addClean = add.filter(r => allowed.includes(r));
    const removeClean = remove.filter(r => allowed.includes(r));
    roles = Array.from(new Set([...roles, ...addClean])).filter(r => !removeClean.includes(r));
    if (roles.length === 0) {
      roles = [current.role].filter(Boolean);
    }
    await pool.query('UPDATE users SET roles = $1 WHERE id = $2', [roles, req.params.id]);
    await logAdminAction(req.admin.id, 'UPDATE_ROLES', 'user', req.params.id, { add: addClean, remove: removeClean, ip: req.ip });
    res.json({ id: req.params.id, roles });
  } catch (error) {
    console.error('Update roles error:', error);
    res.status(500).json({ error: 'Failed to update roles' });
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
    console.error('Verify user error:', error);
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
    console.error('Suspend user error:', error);
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
    console.error('Unsuspend user error:', error);
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
    console.error('Delete user error:', error);
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
    console.error('Get orders error:', error);
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
    console.error('Get order details error:', error);
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
    console.error('Cancel order error:', error);
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
       WHERE u.role = 'driver'
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
    console.error('Get analytics error:', error);
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
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

// Trigger backend deploy (admin-only). Controlled by ADMIN_DEPLOY_CMD/ADMIN_DEPLOY_POWERSHELL and ENABLE_ADMIN_DEPLOY
app.post('/api/admin/deploy', verifyAdmin, async (req, res) => {
  try {
    const enabled = process.env.ENABLE_ADMIN_DEPLOY === 'true';
    if (!enabled) return res.status(403).json({ error: 'Admin deploy disabled' });

    const cwd = process.env.ADMIN_DEPLOY_CWD || process.cwd();
    const cmd = process.env.ADMIN_DEPLOY_CMD || '';
    const ps = process.env.ADMIN_DEPLOY_POWERSHELL || '';

    const finalCmd = cmd || (ps ? `powershell -ExecutionPolicy Bypass -File ${ps}` : '');
    if (!finalCmd) return res.status(400).json({ error: 'No deploy command configured' });

    const child = exec(finalCmd, { cwd, timeout: 5 * 60 * 1000 }, (error, stdout, stderr) => {
      logger.info('Admin deploy executed', { adminId: req.admin.id, stdout: stdout?.slice(0, 5000), stderr: stderr?.slice(0, 5000) });
    });

    child.on('exit', (code) => {
      res.json({ status: 'done', exitCode: code });
    });
    child.on('error', (err) => {
      res.status(500).json({ error: 'Deploy process error', details: err.message });
    });
  } catch (error) {
    console.error('Admin deploy error:', error);
    res.status(500).json({ error: 'Failed to trigger deploy' });
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
    console.error('Clear logs error:', error);
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
    console.error('Get settings error:', error);
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
    console.error('Update setting error:', error);
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
    console.error('Bulk verify error:', error);
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
    console.error('Create backup error:', error);
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

    let whereConditions = ["status = 'delivered'", "assigned_driver_bid_price IS NOT NULL"];
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
    console.error('Generate revenue report error:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ============ DATABASE SCHEMA - Admin Tables ============
const createAdminTables = async () => {
  try {
    // Admin logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id SERIAL PRIMARY KEY,
        admin_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50),
        target_id VARCHAR(255),
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // System settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_by VARCHAR(255) REFERENCES users(id)
      )
    `);

    // Backups table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS backups (
        id VARCHAR(255) PRIMARY KEY,
        created_by VARCHAR(255) NOT NULL REFERENCES users(id),
        table_counts JSONB,
        file_path TEXT,
        file_size BIGINT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action)`);

    // Insert default system settings
    await pool.query(`
      INSERT INTO system_settings (key, value, type, description)
      VALUES
        ('platform_name', 'Matrix Delivery', 'string', 'Platform display name'),
        ('platform_commission', '15', 'number', 'Platform commission percentage'),
        ('default_currency', 'USD', 'string', 'Default currency code'),
        ('enable_2fa', 'true', 'boolean', 'Enable two-factor authentication'),
        ('require_email_verification', 'true', 'boolean', 'Require email verification'),
        ('enable_ip_whitelist', 'false', 'boolean', 'Enable IP whitelisting'),
        ('log_admin_actions', 'true', 'boolean', 'Log all admin actions')
      ON CONFLICT (key) DO NOTHING
    `);

    logger.info('Admin tables created successfully', { category: 'database' });
  } catch (error) {
    console.error('❌ Admin tables creation error:', error);
    throw error;
  }
};

// ============ END OF ADMIN BACKEND API ENDPOINTS ============
// Continue with Error Handling

// Load payments routes
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

// Load messages routes
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

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

// ============ WEBSOCKET INTEGRATION FOR LIVE TRACKING ============
// Socket.IO CORS - Allow all for development, Apache2 handles in production
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: "*",  // Allow all origins
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket']
});
// Configure Socket.IO options
io.engine.opts.pingTimeout = 60000;
io.engine.opts.pingInterval = 25000;

io.on('connection', (socket) => {
  console.log('Connected client:', socket.id);

  socket.on('join_order', async (data) => {
    const { orderId, token } = data;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const orderResult = await pool.query(
        'SELECT customer_id, assigned_driver_user_id FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        socket.emit('error', { message: 'Order not found' });
        return;
      }

      const order = orderResult.rows[0];
      if (order.customer_id !== decoded.userId && order.assigned_driver_user_id !== decoded.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      socket.join(`order_${orderId}`);
      console.log(`User ${decoded.name} joined tracking for order ${orderId}`);

      const locationResult = await pool.query(
        'SELECT current_location_lat, current_location_lng FROM orders WHERE id = $1',
        [orderId]
      );

      if (locationResult.rows[0].current_location_lat) {
        socket.emit('location_update', {
          orderId,
          latitude: parseFloat(locationResult.rows[0].current_location_lat),
          longitude: parseFloat(locationResult.rows[0].current_location_lng),
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('Join order error:', error);
      socket.emit('error', { message: 'Failed to join order tracking' });
    }
  });

  socket.on('update_location', async (data) => {
    const { orderId, latitude, longitude, token } = data;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const orderResult = await pool.query(
        'SELECT assigned_driver_user_id, status FROM orders WHERE id = $1',
        [orderId]
      );

      if (orderResult.rows.length === 0 || orderResult.rows[0].assigned_driver_user_id !== decoded.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      await pool.query(
        'UPDATE orders SET current_location_lat = $1, current_location_lng = $2 WHERE id = $3',
        [parseFloat(latitude), parseFloat(longitude), orderId]
      );

      await pool.query(
        'INSERT INTO location_updates (order_id, driver_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5)',
        [orderId, decoded.userId, parseFloat(latitude), parseFloat(longitude), orderResult.rows[0].status]
      );

      io.to(`order_${orderId}`).emit('location_update', {
        orderId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Update location error:', error);
    }
  });

  socket.on('leave_order', (orderId) => {
    socket.leave(`order_${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected client:', socket.id);
  });
});



const PORT = process.env.PORT || 5000;
let server;

if (require.main === module) {
  server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('         🚚 Matrix Delivery Server (PostgreSQL)');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
    console.log(`💾 Database: PostgreSQL (Updated Schema)`);
    console.log(`🔒 Environment: ${IS_TEST ? 'Testing' : (IS_PRODUCTION ? 'Production' : 'Development')}`);
    console.log('');
    console.log('📊 API Endpoints:');
    console.log('   POST   /api/auth/register');
    console.log('   POST   /api/auth/login');
    console.log('   GET    /api/auth/me');
    console.log('   GET    /api/health');
    console.log('   POST   /api/orders');
    console.log('   GET    /api/orders');
    console.log('   GET    /api/orders/:id');
    console.log('   POST   /api/orders/:id/bid');
    console.log('   PUT    /api/orders/:id/bid');
    console.log('   DELETE /api/orders/:id/bid');
    console.log('   POST   /api/orders/:id/accept-bid');
    console.log('   POST   /api/orders/:id/pickup');
    console.log('   POST   /api/orders/:id/in-transit');
    console.log('   POST   /api/orders/:id/complete');
    console.log('   POST   /api/orders/:id/location');
    console.log('   GET    /api/orders/:id/tracking');
    console.log('   DELETE /api/orders/:id');
    console.log('   GET    /api/notifications');
    console.log('   PUT    /api/notifications/:id/read');
    console.log('   POST   /api/orders/:id/review');
    console.log('   GET    /api/orders/:id/reviews');
    console.log('   GET    /api/orders/:id/review-status');
    console.log('');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  server.close(async () => {
    await pool.end();
    console.log('✅ Server shutdown complete\n');
    process.exit(0);
  });
});

module.exports = app;

// ============ END OF SERVER.JS ============
