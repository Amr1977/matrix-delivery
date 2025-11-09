const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { getDistance } = require('geolib');
const http = require('http');
const socketIo = require('socket.io');
// const Recaptcha = require('google-recaptcha-v2');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });
console.log(`🔧 Loading environment from: ${envFile}`);
const app = express();

// Add security middleware for production
// NOT USED: helmet, rateLimit packages - using custom implementation for demo

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// CORS Configuration - DISABLED because Apache2 handles CORS
// Apache2 reverse proxy is already configured with CORS headers
// Uncomment below only if running Node.js directly without Apache2

/*
const corsOptions = {
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control, Pragma'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests
app.options('*', cors(corsOptions));
*/

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
        role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'driver')),
        vehicle_type VARCHAR(100),
        rating DECIMAL(3,2) DEFAULT 5.00,
        completed_deliveries INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, user_id)
      )
    `);

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

    // Recalculate ratings and completed deliveries for existing users
    console.log('🔄 Recalculating user statistics...');
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

    console.log('✅ PostgreSQL Database initialized and user statistics recalculated');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Initialize database on startup
initDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

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
      console.log(`📡 Real-time notification sent to user ${userId}: ${title}`);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};


app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const JWT_SECRET = process.env.JWT_SECRET;

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

// Input sanitization
const sanitizeString = (str, maxLength = 1000) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/[<>\"'&]/g, '');
};

const sanitizeHtml = (str, maxLength = 5000) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength).replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

const sanitizeNumeric = (value, min = 0, max = 1000000) => {
  const num = parseFloat(value);
  if (isNaN(num) || num < min || num > max) return null;
  return Math.round(num * 100) / 100; // Round to 2 decimal places
};

// Rate limiting store (simple in-memory for demo)
const rateLimitStore = new Map();

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

// Validation helpers
const validateEmail = (email) => {
  const sanitized = sanitizeString(email, 255);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
};

const validatePassword = (password) => {
  const sanitized = sanitizeString(password, 255);
  return sanitized && sanitized.length >= 8;
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

app.post('/api/auth/register', async (req, res) => {
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
    const { name, email, password, phone, role, vehicle_type, recaptchaToken } = req.body;

    // Verify reCAPTCHA token only in production (skip for development/testing)
    if (IS_PRODUCTION && !(await verifyRecaptcha(recaptchaToken))) {
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    if (!name || !email || !password || !phone || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (role === 'driver' && !vehicle_type) {
      return res.status(400).json({ error: 'Vehicle type is required for drivers' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    if (!['customer', 'driver'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = generateId();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password, phone, role, vehicle_type, rating, completed_deliveries)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, phone, role, vehicle_type`,
      [userId, name.trim(), email.toLowerCase().trim(), hashedPassword, phone.trim(), role, 
       role === 'driver' ? vehicle_type : null, 5, 0]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`✅ User registered: ${user.email} (${user.role})`);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        vehicle_type: user.vehicle_type
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;

    // Verify reCAPTCHA token only in production (skip for development/testing)
    if (IS_PRODUCTION && !(await verifyRecaptcha(recaptchaToken))) {
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    console.log(`✅ User logged in: ${user.email}`);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, rating, completed_deliveries, is_verified, created_at FROM users WHERE id = $1',
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
      joinedAt: user.created_at
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Verify user by email (for testing purposes)
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
    console.log(`✅ User verified via API: ${user.email} (${user.role})`);

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

// ============ END OF PART 2 ============
// Continue with Part 3 for Order Management

// ============ PART 3: Order Management & Bidding ============
// Add this after Part 2

// Create Order (Updated for structured location data)
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const {
      title, description, price,
      package_description, package_weight, estimated_value, special_instructions, estimated_delivery_date,
      pickupLocation, dropoffLocation  // New structured location data
    } = req.body;

    // Validate required fields
    if (!title || !price) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    // Validate location data
    if (!pickupLocation || !pickupLocation.coordinates || !pickupLocation.address) {
      return res.status(400).json({ error: 'Pickup location data is required' });
    }

    if (!dropoffLocation || !dropoffLocation.coordinates || !dropoffLocation.address) {
      return res.status(400).json({ error: 'Dropoff location data is required' });
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
    console.log(`✅ Order created: "${order.title}" (${order.order_number}) by ${req.user.name}`);

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
    console.error('Create order error:', error);
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
                 'driverReviewCount', (SELECT COUNT(*) FROM reviews WHERE reviewee_id = u.id),
                 'driverGivenReviewCount', (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id)
               ) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
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
        createdAt: order.created_at, acceptedAt: order.accepted_at, pickedUpAt: order.picked_up_at, deliveredAt: order.delivered_at
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
    console.log(`✅ Bid placed: ${req.user.name} bid $${bidPrice} on "${updatedOrder.title}" (${updatedOrder.order_number})`);

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
    console.log(`✅ Bid accepted: ${acceptedBid.driver_name} ($${acceptedBid.bid_price}) for "${updatedOrder.title}"`);

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

    console.log(`✅ Order picked up: "${order.title}" (${order.order_number}) by ${req.user.name}`);
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

    console.log(`✅ Order in transit: "${order.title}" (${order.order_number})`);
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

    console.log(`✅ Order delivered: "${order.title}" (${order.order_number}) by ${req.user.name}`);
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

    console.log(`✅ Driver location updated: ${req.user.name} (${lat.toFixed(6)}, ${lng.toFixed(6)})`);
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { reviewType, rating, comment, professionalismRating, communicationRating, timelinessRating, conditionRating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    if (!reviewType || !['customer_to_driver', 'driver_to_customer', 'customer_to_platform', 'driver_to_platform'].includes(reviewType)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid review type' });
    }

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status !== 'delivered') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only review completed orders' });
    }

    let revieweeId = null;
    if (reviewType === 'customer_to_driver') {
      if (order.customer_id !== req.user.userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Only customer can review driver' });
      }
      revieweeId = order.assigned_driver_user_id;
    } else if (reviewType === 'driver_to_customer') {
      if (order.assigned_driver_user_id !== req.user.userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Only assigned driver can review customer' });
      }
      revieweeId = order.customer_id;
    } else if (reviewType === 'customer_to_platform') {
      if (order.customer_id !== req.user.userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (reviewType === 'driver_to_platform') {
      if (order.assigned_driver_user_id !== req.user.userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Unauthorized' });
      }
    }

    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE order_id = $1 AND reviewer_id = $2 AND review_type = $3',
      [req.params.id, req.user.userId, reviewType]
    );
    if (existingReview.rows.length > 0) {
      await client.query('ROLLBACK');
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
    console.log(`✅ Review submitted: ${reviewType} for order ${order.order_number} by ${req.user.name}`);
    res.status(201).json({ message: 'Review submitted successfully', review: { id: reviewResult.rows[0].id, reviewType, rating, createdAt: reviewResult.rows[0].created_at } });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Submit review error:', error);
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only the assigned driver can confirm COD payment on delivery
    if (order.assigned_driver_user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only assigned driver can confirm payment' });
    }

    if (order.status !== 'delivered') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be delivered before payment can be confirmed' });
    }

    // Check if payment already exists
    const existingPayment = await client.query('SELECT * FROM payments WHERE order_id = $1', [req.params.id]);
    if (existingPayment.rows.length > 0) {
      await client.query('ROLLBACK');
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

    console.log(`✅ COD Payment confirmed: $${totalAmount.toFixed(2)} for order ${order.order_number}`);
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
    console.error('COD payment error:', error);
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
    // First try to get from database
    const dbResult = await pool.query('SELECT DISTINCT country FROM locations ORDER BY country');
    if (dbResult.rows.length > 0) {
      res.json(dbResult.rows.map(row => row.country));
      return;
    }

    // Fallback to common countries if database is empty
    const commonCountries = [
      'Egypt', 'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman',
      'Jordan', 'Lebanon', 'Iraq', 'Syria', 'Turkey', 'Iran',
      'USA', 'Canada', 'UK', 'Germany', 'France', 'Italy', 'Spain',
      'Australia', 'New Zealand', 'Japan', 'South Korea', 'Singapore',
      'India', 'China', 'Russia', 'Brazil', 'Mexico', 'Argentina',
      'South Africa', 'Nigeria', 'Kenya', 'Morocco', 'Algeria'
    ];
    res.json(commonCountries);
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ error: 'Failed to get countries' });
  }
});

// Get cities for a country (hybrid: database + Nominatim API fallback)
app.get('/api/locations/countries/:country/cities', async (req, res) => {
  try {
    // First try to get from database
    const dbResult = await pool.query(
      'SELECT DISTINCT city FROM locations WHERE country = $1 ORDER BY city',
      [req.params.country]
    );

    if (dbResult.rows.length > 0) {
      res.json(dbResult.rows.map(row => row.city));
      return;
    }

    // Fallback to Nominatim API for worldwide coverage
    console.log(`🌍 Fetching cities for ${req.params.country} from Nominatim API...`);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(req.params.country)}&format=json&addressdetails=1&limit=50&dedupe=1&type=city`;

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

    // Cache the results in database for future use
    if (cities.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const city of cities.slice(0, 100)) { // Increased limit to 100 cities
          await client.query(
            'INSERT INTO locations (country, city, area, street) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [req.params.country, city, 'Unknown', 'Unknown']
          );
        }
        await client.query('COMMIT');
        console.log(`✅ Cached ${cities.slice(0, 100).length} cities for ${req.params.country}`);
      } catch (cacheError) {
        await client.query('ROLLBACK');
        console.log('Cache error (non-critical):', cacheError.message);
      } finally {
        client.release();
      }
    }

    res.json(cities);

  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ error: 'Failed to get cities' });
  }
});

// Get areas for a country and city
app.get('/api/locations/countries/:country/cities/:city/areas', async (req, res) => {
  try {
    // First try to get from database
    const dbResult = await pool.query(
      'SELECT DISTINCT area FROM locations WHERE country = $1 AND city = $2 ORDER BY area',
      [req.params.country, req.params.city]
    );

    if (dbResult.rows.length > 0) {
      res.json(dbResult.rows.map(row => row.area));
      return;
    }

    // Fallback to Nominatim API
    console.log(`🌍 Fetching areas for ${req.params.city}, ${req.params.country} from Nominatim API...`);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(req.params.city)}&country=${encodeURIComponent(req.params.country)}&format=json&addressdetails=1&limit=50&dedupe=1`;

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
    )].sort();

    // Cache the results in database for future use
    if (areas.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const area of areas.slice(0, 50)) {
          await client.query(
            'INSERT INTO locations (country, city, area, street) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [req.params.country, req.params.city, area, 'Unknown']
          );
        }
        await client.query('COMMIT');
        console.log(`✅ Cached ${areas.slice(0, 50).length} areas for ${req.params.city}`);
      } catch (cacheError) {
        await client.query('ROLLBACK');
        console.log('Cache error (non-critical):', cacheError.message);
      } finally {
        client.release();
      }
    }

    res.json(areas);

  } catch (error) {
    console.error('Get areas error:', error);
    res.status(500).json({ error: 'Failed to get areas' });
  }
});

// Get streets for a country, city, and area
app.get('/api/locations/countries/:country/cities/:city/areas/:area/streets', async (req, res) => {
  try {
    // First try to get from database
    const dbResult = await pool.query(
      'SELECT DISTINCT street FROM locations WHERE country = $1 AND city = $2 AND area = $3 ORDER BY street',
      [req.params.country, req.params.city, req.params.area]
    );

    if (dbResult.rows.length > 0) {
      res.json(dbResult.rows.map(row => row.street));
      return;
    }

    // Fallback to Nominatim API
    console.log(`🌍 Fetching streets for ${req.params.area}, ${req.params.city}, ${req.params.country} from Nominatim API...`);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(req.params.city)}&country=${encodeURIComponent(req.params.country)}&format=json&addressdetails=1&limit=50&dedupe=1`;

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
    )].sort();

    // Cache the results in database for future use
    if (streets.length > 0) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const street of streets.slice(0, 50)) {
          await client.query(
            'INSERT INTO locations (country, city, area, street) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
            [req.params.country, req.params.city, req.params.area, street]
          );
        }
        await client.query('COMMIT');
        console.log(`✅ Cached ${streets.slice(0, 50).length} streets for ${req.params.area}`);
      } catch (cacheError) {
        await client.query('ROLLBACK');
        console.log('Cache error (non-critical):', cacheError.message);
      } finally {
        client.release();
      }
    }

    res.json(streets);

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

// ============ END OF PART 7 ============
// Continue with Error Handling

// Error handling with CORS headers
// app.use((req, res) => {
//   // Ensure CORS headers are set even for 404 errors
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');

//   res.status(404).json({ error: 'Endpoint not found' });
// });

// app.use((err, req, res, next) => {
//   // Ensure CORS headers are set even for 500 errors
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma');

//   console.error('Server error:', err);
//   res.status(500).json({ error: IS_PRODUCTION ? 'Internal server error' : err.message });
// });

// ============ WEBSOCKET INTEGRATION FOR LIVE TRACKING ============
// DISABLED Socket.IO CORS - Apache2 handles all CORS
const httpServer = http.createServer(app);
const io = socketIo(httpServer, {
  cors: {
    origin: true, // Allow all origins - Apache2 handles CORS
    methods: ['GET', 'POST'],
    credentials: true
  }
});

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
const server = httpServer.listen(PORT, '0.0.0.0', () => {
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
// Complete server.js by combining Parts 1 + 2 + 3 + 4 + 5
