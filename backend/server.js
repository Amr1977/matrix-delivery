const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { getDistance } = require('geolib');
const Recaptcha = require('google-recaptcha-v2');

dotenv.config();
const app = express();

// Add security middleware for production
// NOT USED: helmet, rateLimit packages - using custom implementation for demo

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
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

    console.log('✅ PostgreSQL Database initialized');
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

// Helper function to create notification
const createNotification = async (userId, orderId, type, title, message) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, order_id, type, title, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, orderId, type, title, message]
    );
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

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

// reCAPTCHA verification
const verifyRecaptcha = async (token) => {
  try {
    if (!token) {
      console.warn('No reCAPTCHA token provided');
      return false;
    }

    if (!process.env.RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return false;
    }

    // Use direct HTTP request to Google's API instead of the package
    const axios = require('axios'); // Make sure to install: npm install axios
    
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token
        }
      }
    );

    const result = response.data;

    if (!result.success) {
      console.warn('reCAPTCHA verification failed:', result['error-codes']);
      return false;
    }

    // For reCAPTCHA v3, check the score (optional)
    if (result.score !== undefined) {
      if (result.score < 0.5) {
        console.warn('reCAPTCHA score too low:', result.score);
        return false;
      }
      console.log('reCAPTCHA score:', result.score);
    }

    console.log('✅ reCAPTCHA verification successful');
    return true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
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

    // Verify reCAPTCHA token if not in test mode
    if (!IS_TEST && !(await verifyRecaptcha(recaptchaToken))) {
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

    // Verify reCAPTCHA token if not in test mode
    if (!IS_TEST && !(await verifyRecaptcha(recaptchaToken))) {
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
      'SELECT id, name, email, role, rating, completed_deliveries FROM users WHERE id = $1',
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
      completedDeliveries: user.completed_deliveries
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
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
      query = `SELECT o.*, COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids FROM orders o LEFT JOIN bids b ON o.id = b.order_id WHERE o.customer_id = $1 GROUP BY o.id ORDER BY o.created_at DESC`;
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
               COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        WHERE (o.assigned_driver_user_id = $1 OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1))
        AND o.status != 'delivered' AND o.status != 'cancelled'
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      const activeOrdersResult = await pool.query(activeOrdersQuery, [req.user.userId]);

      // Get bidding orders (pending_bids) - no distance filtering
      const biddingOrdersQuery = `
        SELECT o.*,
               COALESCE(json_agg(json_build_object('userId', b.user_id, 'driverName', b.driver_name, 'bidPrice', b.bid_price, 'estimatedPickupTime', b.estimated_pickup_time, 'estimatedDeliveryTime', b.estimated_delivery_time, 'message', b.message, 'status', b.status, 'createdAt', b.created_at) ORDER BY b.created_at DESC) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        WHERE o.status = 'pending_bids'
        AND NOT EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1)
        GROUP BY o.id
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
      const newRating = parseFloat(ratingsResult.rows[0].avg_rating);
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

// ============ END OF PART 6 ============
// Continue with Error Handling

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: IS_PRODUCTION ? 'Internal server error' : err.message });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('         🚚 Matrix Delivery Server (PostgreSQL)');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💾 Database: PostgreSQL`);
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
