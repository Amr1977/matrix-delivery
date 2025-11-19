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

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
dotenv.config({ path: envFile });

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// CORS Configuration - Only enabled in non-production environments
let corsOptions;
if (!IS_PRODUCTION) {
  corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control, Pragma'],
    credentials: true,
    optionsSuccessStatus: 200
  };
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
  connectionTimeoutMillis: 2000,
});

// Database initialization
const initDatabase = async () => {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id VARCHAR(255) PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255) NOT NULL, phone VARCHAR(50) NOT NULL, role VARCHAR(50) NOT NULL CHECK (role IN ('customer', 'driver', 'admin')), vehicle_type VARCHAR(100), rating DECIMAL(3,2) DEFAULT 5.00, completed_deliveries INTEGER DEFAULT 0, is_available BOOLEAN DEFAULT true, is_verified BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS orders (id VARCHAR(255) PRIMARY KEY, order_number VARCHAR(50) UNIQUE NOT NULL, title VARCHAR(255) NOT NULL, description TEXT, pickup_address TEXT NOT NULL, delivery_address TEXT NOT NULL, from_lat DECIMAL(10,8) NOT NULL, from_lng DECIMAL(11,8) NOT NULL, from_name VARCHAR(255) NOT NULL, to_lat DECIMAL(10,8) NOT NULL, to_lng DECIMAL(11,8) NOT NULL, to_name VARCHAR(255) NOT NULL, package_description TEXT, package_weight DECIMAL(10,2), estimated_value DECIMAL(10,2), special_instructions TEXT, price DECIMAL(10,2) NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'pending_bids' CHECK (status IN ('pending_bids', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled')), customer_id VARCHAR(255) NOT NULL REFERENCES users(id), customer_name VARCHAR(255) NOT NULL, assigned_driver_user_id VARCHAR(255), assigned_driver_name VARCHAR(255), assigned_driver_bid_price DECIMAL(10,2), estimated_delivery_date TIMESTAMP, pickup_time TIMESTAMP, delivery_time TIMESTAMP, current_location_lat DECIMAL(10,8), current_location_lng DECIMAL(11,8), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, accepted_at TIMESTAMP, picked_up_at TIMESTAMP, delivered_at TIMESTAMP, cancelled_at TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bids (id SERIAL PRIMARY KEY, order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE, user_id VARCHAR(255) NOT NULL REFERENCES users(id), driver_name VARCHAR(255) NOT NULL, bid_price DECIMAL(10,2) NOT NULL, estimated_pickup_time TIMESTAMP, estimated_delivery_time TIMESTAMP, message TEXT, status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(order_id, user_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id VARCHAR(255) NOT NULL REFERENCES users(id), order_id VARCHAR(255) REFERENCES orders(id) ON DELETE CASCADE, type VARCHAR(50) NOT NULL, title VARCHAR(255) NOT NULL, message TEXT NOT NULL, is_read BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS location_updates (id SERIAL PRIMARY KEY, order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE, driver_id VARCHAR(255) NOT NULL REFERENCES users(id), latitude DECIMAL(10,8) NOT NULL, longitude DECIMAL(11,8) NOT NULL, status VARCHAR(50) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS driver_locations (id SERIAL PRIMARY KEY, driver_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE, latitude DECIMAL(10,8) NOT NULL, longitude DECIMAL(11,8) NOT NULL, last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(driver_id))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id); CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(assigned_driver_user_id); CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status); CREATE INDEX IF NOT EXISTS idx_bids_order ON bids(order_id); CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id); CREATE INDEX IF NOT EXISTS idx_location_updates_order ON location_updates(order_id);`);
    logger.info('✅ Database initialized successfully');
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

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);
const generateOrderNumber = () => `ORD-${Date.now()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required');
  process.exit(1);
}

const app = express();

if (corsOptions) app.use(cors(corsOptions));
if (corsOptions) app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP request logging with Morgan
app.use(morgan('combined', {
  stream: {
    write: (message) => {
      const parts = message.trim().split(' ');
      if (parts.length >= 9) {
        logger.http('HTTP_REQUEST', {
          method: parts[0], url: parts[1], status: parseInt(parts[2]),
          responseTime: parts[3], ip: parts[6], userAgent: parts[8], category: 'http'
        });
      }
    }
  }
}));

app.use(logger.requestLogger);

// Helper function to create notification with real-time WebSocket emission
const createNotification = async (userId, orderId, type, title, message) => {
  try {
    const result = await pool.query(`INSERT INTO notifications (user_id, order_id, type, title, message) VALUES ($1, $2, $3, $4, $5) RETURNING id, user_id, order_id, type, title, message, created_at`,
      [userId, orderId, type, title, message]);
    const notification = result.rows[0];

    if (io) {
      io.to(`user_${userId}`).emit('notification', {
        id: notification.id, orderId: notification.order_id, type: notification.type,
        title: notification.title, message: notification.message, isRead: false, createdAt: notification.created_at
      });
      logger.info(`Real-time notification sent`, { userId, title, category: 'notification' });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

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

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    res.json({
      status: 'healthy',
      environment: IS_TEST ? 'testing' : (IS_PRODUCTION ? 'production' : 'development'),
      database: 'PostgreSQL',
      stats: { users: parseInt(usersResult.rows[0].count) },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// Driver location management endpoints
app.post('/api/drivers/location', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') return res.status(403).json({ error: 'Only drivers can update location' });
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Latitude and longitude are required' });

    await pool.query(`INSERT INTO driver_locations (driver_id, latitude, longitude) VALUES ($1, $2, $3) ON CONFLICT (driver_id) DO UPDATE SET latitude = $2, longitude = $3, last_updated = CURRENT_TIMESTAMP`,
      [req.user.userId, parseFloat(latitude), parseFloat(longitude)]);

    logger.info(`Driver location updated`, { userId: req.user.userId, name: req.user.name, latitude, longitude, category: 'location' });
    res.json({ message: 'Location updated successfully', location: { latitude, longitude } });
  } catch (error) {
    console.error('Update driver location error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

app.get('/api/drivers/location', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'driver') return res.status(403).json({ error: 'Only drivers can access location' });
    const result = await pool.query('SELECT latitude, longitude, last_updated FROM driver_locations WHERE driver_id = $1', [req.user.userId]);

    if (result.rows.length === 0) return res.json({ location: null });
    res.json({ location: { latitude: parseFloat(result.rows[0].latitude), longitude: parseFloat(result.rows[0].longitude), lastUpdated: result.rows[0].last_updated } });
  } catch (error) {
    console.error('Get driver location error:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);

    if (result.rows.length === 0 || !await bcrypt.compare(password, result.rows[0].password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id, email: user.email, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO connection handling for live tracking
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);

  socket.on('join_order', async (data) => {
    const { orderId, token } = data;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const orderResult = await pool.query('SELECT customer_id, assigned_driver_user_id FROM orders WHERE id = $1', [orderId]);

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
      console.log(`👀 User ${decoded.name} joined tracking for order ${orderId}`);

      // Get current location from DB
      const locationResult = await pool.query('SELECT latitude, longitude, last_updated FROM driver_locations WHERE driver_id = $1', [order.assigned_driver_user_id]);

      if (locationResult.rows.length > 0) {
        const loc = locationResult.rows[0];
        socket.emit('location_update', {
          orderId,
          latitude: parseFloat(loc.latitude),
          longitude: parseFloat(loc.longitude),
          timestamp: loc.last_updated.toISOString()
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
      const orderResult = await pool.query('SELECT assigned_driver_user_id, status FROM orders WHERE id = $1', [orderId]);

      if (orderResult.rows.length === 0 || orderResult.rows[0].assigned_driver_user_id !== decoded.userId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      const { status } = orderResult.rows[0];

      // Update orders table current location
      await pool.query('UPDATE orders SET current_location_lat = $1, current_location_lng = $2 WHERE id = $3', [parseFloat(latitude), parseFloat(longitude), orderId]);

      // Update driver locations table
      await pool.query(`INSERT INTO driver_locations (driver_id, latitude, longitude) VALUES ($1, $2, $3) ON CONFLICT (driver_id) DO UPDATE SET latitude = $2, longitude = $3, last_updated = CURRENT_TIMESTAMP`,
        [decoded.userId, parseFloat(latitude), parseFloat(longitude)]);

      // Insert location update record
      await pool.query('INSERT INTO location_updates (order_id, driver_id, latitude, longitude, status) VALUES ($1, $2, $3, $4, $5)',
        [orderId, decoded.userId, parseFloat(latitude), parseFloat(longitude), status]);

      // Emit to all room members
      io.to(`order_${orderId}`).emit('location_update', {
        orderId,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        timestamp: new Date().toISOString()
      });

      console.log(`📍 Location updated: ${orderId} - ${latitude}, ${longitude}`);
    } catch (error) {
      console.error('Update location error:', error);
    }
  });

  socket.on('leave_order', (orderId) => {
    socket.leave(`order_${orderId}`);
    console.log(`👋 User left order tracking for ${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log('👤 Client disconnected:', socket.id);
  });
});

// Export io instance for use in routes
module.exports.io = io;

// Default error handlers
app.use((req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`, {
    method: req.method, url: req.originalUrl, ip: req.ip, userAgent: req.get('User-Agent'), category: 'http'
  });
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack, method: req.method, url: req.originalUrl, ip: req.ip, userAgent: req.get('User-Agent'), category: 'error'
  });
  res.status(500).json({ error: IS_PRODUCTION ? 'Internal server error' : err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('         🚚 Matrix Delivery Server (PostgreSQL + Socket.IO)');
  console.log('╚════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💾 Database: PostgreSQL (Updated Schema)`);
  console.log(`🚀 Live Tracking: WebSocket enabled`);
  console.log(`🔒 Environment: ${IS_TEST ? 'Testing' : (IS_PRODUCTION ? 'Production' : 'Development')}`);
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
