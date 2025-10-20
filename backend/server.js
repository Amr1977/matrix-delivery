const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

dotenv.config();
const app = express();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'matrix_delivery',
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        from_lat DECIMAL(10,8) NOT NULL,
        from_lng DECIMAL(11,8) NOT NULL,
        from_name VARCHAR(255) NOT NULL,
        to_lat DECIMAL(10,8) NOT NULL,
        to_lng DECIMAL(11,8) NOT NULL,
        to_name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'completed')),
        customer_id VARCHAR(255) NOT NULL REFERENCES users(id),
        customer_name VARCHAR(255) NOT NULL,
        assigned_driver_user_id VARCHAR(255),
        assigned_driver_name VARCHAR(255),
        assigned_driver_bid_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        accepted_at TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);

    // Create bids table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(255) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id),
        driver_name VARCHAR(255) NOT NULL,
        bid_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(order_id, user_id)
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(assigned_driver_user_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bids_order ON bids(order_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bids_user ON bids(user_id)`);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true
}));

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-12345';

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

// Validation helpers
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password && password.length >= 8;

// Routes

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const usersResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const ordersResult = await pool.query('SELECT COUNT(*) as count FROM orders');
    const openOrdersResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'open'");
    const acceptedOrdersResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'accepted'");
    const completedOrdersResult = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'completed'");

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

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, vehicle_type } = req.body;

    // Validation
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

    // Check if user exists
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
    const { email, password } = req.body;

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

// Create Order
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const { title, description, from, to, price } = req.body;

    if (!title || !from || !to || !price) {
      return res.status(400).json({ error: 'Title, locations, and price are required' });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    const orderId = generateId();
    const result = await pool.query(
      `INSERT INTO orders (id, title, description, from_lat, from_lng, from_name, 
                          to_lat, to_lng, to_name, price, status, customer_id, customer_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        orderId,
        title.trim(),
        description?.trim() || '',
        parseFloat(from.lat),
        parseFloat(from.lng),
        from.name,
        parseFloat(to.lat),
        parseFloat(to.lng),
        to.name,
        parseFloat(price),
        'open',
        req.user.userId,
        req.user.name
      ]
    );

    const order = result.rows[0];
    console.log(`✅ Order created: "${order.title}" by ${req.user.name}`);
    
    res.status(201).json({
      _id: order.id,
      title: order.title,
      description: order.description,
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
      price: parseFloat(order.price),
      status: order.status,
      bids: [],
      customerId: order.customer_id,
      customerName: order.customer_name,
      assignedDriver: null,
      createdAt: order.created_at
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    let query;
    let params;

    if (req.user.role === 'customer') {
      query = `
        SELECT o.*, 
               COALESCE(json_agg(
                 json_build_object(
                   'userId', b.user_id,
                   'driverName', b.driver_name,
                   'bidPrice', b.bid_price,
                   'status', b.status,
                   'createdAt', b.created_at
                 ) ORDER BY b.created_at DESC
               ) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        WHERE o.customer_id = $1
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      params = [req.user.userId];
    } else if (req.user.role === 'driver') {
      // Drivers should see:
      // 1. ALL open orders (regardless of who created them)
      // 2. Orders they've bid on
      // 3. Orders assigned to them
      query = `
        SELECT o.*, 
               COALESCE(json_agg(
                 json_build_object(
                   'userId', b.user_id,
                   'driverName', b.driver_name,
                   'bidPrice', b.bid_price,
                   'status', b.status,
                   'createdAt', b.created_at
                 ) ORDER BY b.created_at DESC
               ) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
        FROM orders o
        LEFT JOIN bids b ON o.id = b.order_id
        WHERE o.status = 'open' 
           OR o.assigned_driver_user_id = $1
           OR EXISTS (SELECT 1 FROM bids WHERE order_id = o.id AND user_id = $1)
        GROUP BY o.id
        ORDER BY o.created_at DESC
      `;
      params = [req.user.userId];
    }

    const result = await pool.query(query, params);
    
    const orders = result.rows.map(order => ({
      _id: order.id,
      title: order.title,
      description: order.description,
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
      createdAt: order.created_at,
      acceptedAt: order.accepted_at,
      completedAt: order.completed_at
    }));

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// Place bid
app.post('/api/orders/:id/bid', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { bidPrice } = req.body;

    // Check order exists and is open
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is no longer available for bidding' });
    }

    if (order.customer_id === req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot bid on your own order' });
    }

    // Delete existing bid if any
    await client.query(
      'DELETE FROM bids WHERE order_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    // Insert new bid
    await client.query(
      `INSERT INTO bids (order_id, user_id, driver_name, bid_price, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.params.id, req.user.userId, req.user.name, parseFloat(bidPrice), 'pending']
    );

    // Get updated order with bids
    const updatedOrderResult = await client.query(
      `SELECT o.*, 
              COALESCE(json_agg(
                json_build_object(
                  'userId', b.user_id,
                  'driverName', b.driver_name,
                  'bidPrice', b.bid_price,
                  'status', b.status,
                  'createdAt', b.created_at
                ) ORDER BY b.created_at DESC
              ) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
       FROM orders o
       LEFT JOIN bids b ON o.id = b.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [req.params.id]
    );

    await client.query('COMMIT');

    const updatedOrder = updatedOrderResult.rows[0];
    console.log(`✅ Bid placed: ${req.user.name} bid $${bidPrice} on "${updatedOrder.title}"`);

    res.json({
      _id: updatedOrder.id,
      title: updatedOrder.title,
      description: updatedOrder.description,
      from: {
        lat: parseFloat(updatedOrder.from_lat),
        lng: parseFloat(updatedOrder.from_lng),
        name: updatedOrder.from_name
      },
      to: {
        lat: parseFloat(updatedOrder.to_lat),
        lng: parseFloat(updatedOrder.to_lng),
        name: updatedOrder.to_name
      },
      price: parseFloat(updatedOrder.price),
      status: updatedOrder.status,
      bids: updatedOrder.bids,
      customerId: updatedOrder.customer_id,
      customerName: updatedOrder.customer_name,
      assignedDriver: null,
      createdAt: updatedOrder.created_at
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

    // Get order
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.customer_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only customer can accept bids' });
    }

    if (order.status !== 'open') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is no longer open' });
    }

    // Get the bid to accept
    const bidResult = await client.query(
      'SELECT * FROM bids WHERE order_id = $1 AND user_id = $2',
      [req.params.id, userId]
    );

    if (bidResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Bid not found' });
    }

    const acceptedBid = bidResult.rows[0];

    // Update order
    await client.query(
      `UPDATE orders 
       SET status = 'accepted',
           assigned_driver_user_id = $1,
           assigned_driver_name = $2,
           assigned_driver_bid_price = $3,
           accepted_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [acceptedBid.user_id, acceptedBid.driver_name, acceptedBid.bid_price, req.params.id]
    );

    // Update bids
    await client.query(
      "UPDATE bids SET status = 'accepted' WHERE order_id = $1 AND user_id = $2",
      [req.params.id, userId]
    );

    await client.query(
      "UPDATE bids SET status = 'rejected' WHERE order_id = $1 AND user_id != $2",
      [req.params.id, userId]
    );

    // Get updated order
    const updatedOrderResult = await client.query(
      `SELECT o.*, 
              COALESCE(json_agg(
                json_build_object(
                  'userId', b.user_id,
                  'driverName', b.driver_name,
                  'bidPrice', b.bid_price,
                  'status', b.status,
                  'createdAt', b.created_at
                ) ORDER BY b.created_at DESC
              ) FILTER (WHERE b.id IS NOT NULL), '[]') as bids
       FROM orders o
       LEFT JOIN bids b ON o.id = b.order_id
       WHERE o.id = $1
       GROUP BY o.id`,
      [req.params.id]
    );

    await client.query('COMMIT');

    const updatedOrder = updatedOrderResult.rows[0];
    console.log(`✅ Bid accepted: ${acceptedBid.driver_name} ($${acceptedBid.bid_price}) for "${updatedOrder.title}"`);

    res.json({
      _id: updatedOrder.id,
      title: updatedOrder.title,
      description: updatedOrder.description,
      from: {
        lat: parseFloat(updatedOrder.from_lat),
        lng: parseFloat(updatedOrder.from_lng),
        name: updatedOrder.from_name
      },
      to: {
        lat: parseFloat(updatedOrder.to_lat),
        lng: parseFloat(updatedOrder.to_lng),
        name: updatedOrder.to_name
      },
      price: parseFloat(updatedOrder.price),
      status: updatedOrder.status,
      bids: updatedOrder.bids,
      customerId: updatedOrder.customer_id,
      customerName: updatedOrder.customer_name,
      assignedDriver: {
        userId: updatedOrder.assigned_driver_user_id,
        driverName: updatedOrder.assigned_driver_name,
        bidPrice: parseFloat(updatedOrder.assigned_driver_bid_price)
      },
      createdAt: updatedOrder.created_at,
      acceptedAt: updatedOrder.accepted_at
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Accept bid error:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  } finally {
    client.release();
  }
});

// Complete order
app.post('/api/orders/:id/complete', verifyToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status !== 'accepted') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order must be accepted before completion' });
    }

    if (order.assigned_driver_user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Only assigned driver can complete order' });
    }

    // Mark order as completed
    await client.query(
      `UPDATE orders SET status = 'completed', completed_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.params.id]
    );

    // Update driver stats
    await client.query(
      'UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1',
      [req.user.userId]
    );

    await client.query('COMMIT');

    console.log(`✅ Order completed: "${order.title}" by ${req.user.name}`);
    res.json({
      _id: order.id,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete order error:', error);
    res.status(500).json({ error: 'Failed to complete order' });
  } finally {
    client.release();
  }
});

// Delete order
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.customer_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only customer can delete order' });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Cannot delete order in progress' });
    }

    await pool.query('DELETE FROM orders WHERE id = $1', [req.params.id]);

    console.log(`✅ Order deleted: "${order.title}" by ${req.user.name}`);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: IS_PRODUCTION ? 'Internal server error' : err.message
  });
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
  console.log('   POST   /api/orders/:id/bid');
  console.log('   POST   /api/orders/:id/accept-bid');
  console.log('   POST   /api/orders/:id/complete');
  console.log('   DELETE /api/orders/:id');
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