const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// JSON File Storage Setup
const DB_DIR = path.join(__dirname, 'database');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const ORDERS_FILE = path.join(DB_DIR, 'orders.json');

// Create database directory if it doesn't exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([]));
}

// Helper functions to read/write JSON files
const readUsers = () => {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
};

const writeUsers = (users) => {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error writing users:', error);
  }
};

const readOrders = () => {
  try {
    const data = fs.readFileSync(ORDERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
};

const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error writing orders:', error);
  }
};

// Generate unique ID
const generateId = () => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

console.log('✅ JSON File Storage initialized');
console.log(`📁 Database directory: ${DB_DIR}`);

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

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

// Routes

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const users = readUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: generateId(),
      name,
      email,
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

    res.json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error(error);
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

    const users = readUsers();
    const user = users.find(u => u.email === email);
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
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', verifyToken, async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create Order
app.post('/api/orders', verifyToken, async (req, res) => {
  try {
    const { title, description, from, to, price } = req.body;
    
    const order = {
      _id: generateId(),
      title,
      description,
      from,
      to,
      price,
      status: 'open',
      bids: [],
      customerId: req.user.userId,
      customerName: req.user.name,
      assignedDriver: null,
      createdAt: new Date().toISOString()
    };

    const orders = readOrders();
    orders.push(order);
    writeOrders(orders);

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get all orders
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    const orders = readOrders();
    // Sort by creation date (newest first)
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
app.get('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const orders = readOrders();
    const order = orders.find(o => o._id === req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Place bid
app.post('/api/orders/:id/bid', verifyToken, async (req, res) => {
  try {
    const { bidPrice } = req.body;
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];
    
    // Remove existing bid from this driver if any
    order.bids = order.bids.filter(bid => bid.userId !== req.user.userId);
    
    // Add new bid
    order.bids.push({
      userId: req.user.userId,
      driverName: req.user.name,
      bidPrice: parseFloat(bidPrice)
    });

    orders[orderIndex] = order;
    writeOrders(orders);

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// Accept bid
app.post('/api/orders/:id/accept-bid', verifyToken, async (req, res) => {
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

    const bid = order.bids.find(b => b.userId === userId);
    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    order.status = 'accepted';
    order.assignedDriver = bid;

    orders[orderIndex] = order;
    writeOrders(orders);

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to accept bid' });
  }
});

// Complete order
app.post('/api/orders/:id/complete', verifyToken, async (req, res) => {
  try {
    const orders = readOrders();
    const orderIndex = orders.findIndex(o => o._id === req.params.id);

    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];

    if (order.assignedDriver?.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Only assigned driver can complete order' });
    }

    order.status = 'completed';
    order.completedAt = new Date().toISOString();

    orders[orderIndex] = order;
    writeOrders(orders);

    // Update driver stats
    const users = readUsers();
    const userIndex = users.findIndex(u => u.id === req.user.userId);
    if (userIndex !== -1) {
      users[userIndex].completedDeliveries = (users[userIndex].completedDeliveries || 0) + 1;
      writeUsers(users);
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// Delete order
app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const orders = readOrders();
    const order = orders.find(o => o._id === req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.customerId !== req.user.userId) {
      return res.status(403).json({ error: 'Only customer can delete order' });
    }

    const filteredOrders = orders.filter(o => o._id !== req.params.id);
    writeOrders(filteredOrders);

    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  const users = readUsers();
  const orders = readOrders();
  res.json({ 
    status: 'Backend server is running',
    database: 'JSON File Storage',
    stats: {
      users: users.length,
      orders: orders.length
    },
    version: '1.0.0'
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📍 Backend API: http://localhost:${PORT}/api`);
  console.log(`💾 Database: JSON Files (${DB_DIR})`);
});