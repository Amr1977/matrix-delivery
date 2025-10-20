const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

dotenv.config();
const app = express();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// JSON File Storage Setup (for testing and development)
const DB_DIR = path.join(__dirname, 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const ORDERS_FILE = path.join(DB_DIR, 'orders.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
}

const readUsers = () => {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeUsers = (users) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

const readOrders = () => {
  try {
    return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
};

const writeOrders = (orders) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

console.log('✅ JSON File Storage initialized');
console.log(`📁 Database directory: ${DB_DIR}`);

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
app.get('/api/health', (req, res) => {
  const users = readUsers();
  const orders = readOrders();

  const openOrders = orders.filter(o => o.status === 'open').length;
  const acceptedOrders = orders.filter(o => o.status === 'accepted').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;

  res.json({
    status: 'healthy',
    environment: IS_TEST ? 'testing' : (IS_PRODUCTION ? 'production' : 'development'),
    database: 'JSON File Storage',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    stats: {
      users: users.length,
      orders: orders.length,
      openOrders,
      activeOrders: acceptedOrders,
      completedOrders
    },
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
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

    const users = readUsers();
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: generateId(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role,
      rating: 5,
      completedDeliveries: 0,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    writeUsers(users);

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
        role: user.role
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

    const users = readUsers();
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

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
        rating: user.rating,
        completedDeliveries: user.completedDeliveries
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    rating: user.rating,
    completedDeliveries: user.completedDeliveries
  });
});

// Create Order
app.post('/api/orders', verifyToken, (req, res) => {
  try {
    const { title, description, from, to, price } = req.body;

    if (!title || !from || !to || !price) {
      return res.status(400).json({ error: 'Title, locations, and price are required' });
    }

    if (parseFloat(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' });
    }

    const orders = readOrders();
    const order = {
      _id: generateId(),
      title: title.trim(),
      description: description?.trim() || '',
      from: {
        lat: parseFloat(from.lat),
        lng: parseFloat(from.lng),
        name: from.name
      },
      to: {
        lat: parseFloat(to.lat),
        lng: parseFloat(to.lng),
        name: to.name
      },
      price: parseFloat(price),
      status: 'open',
      bids: [],
      customerId: req.user.userId,
      customerName: req.user.name,
      assignedDriver: null,
      createdAt: new Date().toISOString()
    };

    orders.push(order);
    writeOrders(orders);

    console.log(`✅ Order created: "${order.title}" by ${req.user.name}`);
    res.status(201).json(order);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders
app.get('/api/orders', verifyToken, (req, res) => {
  const orders = readOrders();

  // Filter orders based on user role
  let filteredOrders = orders;

  if (req.user.role === 'customer') {
    filteredOrders = orders.filter(order => order.customerId === req.user.userId);
  } else if (req.user.role === 'driver') {
    // Drivers see open orders OR orders where they have bids or are assigned
    filteredOrders = orders.filter(order =>
      order.status === 'open' ||
      order.customerId === req.user.userId ||
      order.assignedDriver?.userId === req.user.userId ||
      order.bids.some(bid => bid.userId === req.user.userId)
    );
  }

  // Sort by creation date (newest first)
  filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json(filteredOrders);
});

// Place bid
app.post('/api/orders/:id/bid', verifyToken, (req, res) => {
  try {
    const { bidPrice } = req.body;
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];

    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Order is no longer available for bidding' });
    }

    if (order.customerId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot bid on your own order' });
    }

    // Remove existing bid from this driver if any
    order.bids = order.bids.filter(bid => bid.userId !== req.user.userId);

    // Add new bid
    order.bids.push({
      userId: req.user.userId,
      driverName: req.user.name,
      bidPrice: parseFloat(bidPrice),
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    orders[orderIndex] = order;
    writeOrders(orders);

    console.log(`✅ Bid placed: ${req.user.name} bid $${bidPrice} on "${order.title}"`);
    res.json(order);
  } catch (error) {
    console.error('Place bid error:', error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Accept bid
app.post('/api/orders/:id/accept-bid', verifyToken, (req, res) => {
  try {
    const { userId } = req.body;
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];

    if (order.customerId !== req.user.userId) {
      return res.status(403).json({ error: 'Only customer can accept bids' });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Order is no longer open' });
    }

    const acceptedBid = order.bids.find(b => b.userId === userId);
    if (!acceptedBid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Set bid as accepted
    acceptedBid.status = 'accepted';

    // Mark order as accepted and assign driver
    order.status = 'accepted';
    order.assignedDriver = {
      userId: acceptedBid.userId,
      driverName: acceptedBid.driverName,
      bidPrice: acceptedBid.bidPrice
    };

    // Reject all other bids
    order.bids.forEach(bid => {
      if (bid.userId !== userId) {
        bid.status = 'rejected';
      }
    });

    order.acceptedAt = new Date().toISOString();

    orders[orderIndex] = order;
    writeOrders(orders);

    console.log(`✅ Bid accepted: ${acceptedBid.driverName} ($${acceptedBid.bidPrice}) for "${order.title}"`);
    res.json(order);
  } catch (error) {
    console.error('Accept bid error:', error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// Complete order
app.post('/api/orders/:id/complete', verifyToken, (req, res) => {
  try {
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];

    if (order.status !== 'accepted') {
      return res.status(400).json({ error: 'Order must be accepted before completion' });
    }

    if (order.assignedDriver?.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Only assigned driver can complete order' });
    }

    // Mark order as completed
    order.status = 'completed';
    order.completedAt = new Date().toISOString();

    // Update driver stats
    const users = readUsers();
    const driverIndex = users.findIndex(u => u.id === req.user.userId);
    if (driverIndex !== -1) {
      users[driverIndex].completedDeliveries = (users[driverIndex].completedDeliveries || 0) + 1;
      writeUsers(users);
    }

    orders[orderIndex] = order;
    writeOrders(orders);

    console.log(`✅ Order completed: "${order.title}" by ${req.user.name}`);
    res.json({
      _id: order._id,
      status: 'completed',
      completedAt: order.completedAt
    });
  } catch (error) {
    console.error('Complete order error:', error);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// Delete order
app.delete('/api/orders/:id', verifyToken, (req, res) => {
  try {
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];

    if (order.customerId !== req.user.userId) {
      return res.status(403).json({ error: 'Only customer can delete order' });
    }

    if (order.status !== 'open') {
      return res.status(400).json({ error: 'Cannot delete order in progress' });
    }

    orders.splice(orderIndex, 1);
    writeOrders(orders);

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
  console.log('═══════════════════════════════════════════════════════');
  console.log('         🚚 Matrix Delivery Testing Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💾 Database: JSON File Storage`);
  console.log(`🔒 Environment: Testing Mode`);
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
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server shutdown complete\n');
    process.exit(0);
  });
});

module.exports = app;
