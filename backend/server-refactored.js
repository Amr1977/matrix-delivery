const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const logger = require('./logger');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

// Import extracted routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      connectSrc: ["'self'", "https://matrix-api.oldantique50.com"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      frameSrc: ["'self'", "https://www.google.com"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.http(`${req.method} ${req.path}`, {
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    category: 'http'
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.performance(`${req.method} ${req.path}`, duration, {
      status: res.statusCode,
      ip: clientIP
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Footer stats endpoint (placeholder - would be implemented separately)
app.get('/api/footer/stats', (req, res) => {
  res.json({
    usersByRole: { customer: 0, driver: 0 },
    activeOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    avgRating: 0.0,
    activeDrivers: 0,
    todayOrders: 0,
    deploymentTimestamp: new Date().toISOString(),
    serverUptime: Math.floor(process.uptime())
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  const clientIP = socket.handshake.address;
  logger.socket('Client connected', {
    socketId: socket.id,
    ip: clientIP,
    category: 'socket'
  });

  socket.on('join_order', (data) => {
    const { orderId, token } = data;
    logger.socket('Client joined order room', {
      socketId: socket.id,
      orderId,
      ip: clientIP,
      category: 'socket'
    });
    socket.join(`order_${orderId}`);
  });

  socket.on('leave_order', (orderId) => {
    logger.socket('Client left order room', {
      socketId: socket.id,
      orderId,
      ip: clientIP,
      category: 'socket'
    });
    socket.leave(`order_${orderId}`);
  });

  socket.on('update_location', (data) => {
    const { orderId, latitude, longitude, token } = data;
    logger.socket('Location update received', {
      socketId: socket.id,
      orderId,
      latitude,
      longitude,
      ip: clientIP,
      category: 'socket'
    });

    // Broadcast location update to order room
    socket.to(`order_${orderId}`).emit('location_update', {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    logger.socket('Client disconnected', {
      socketId: socket.id,
      ip: clientIP,
      category: 'socket'
    });
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.error(`Unhandled error: ${err.message}`, {
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: clientIP,
    category: 'error'
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.warn(`404 - Route not found: ${req.method} ${req.path}`, {
    ip: clientIP,
    category: 'http'
  });

  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully', { category: 'system' });
  server.close(() => {
    logger.info('Server closed', { category: 'system' });
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully', { category: 'system' });
  server.close(() => {
    logger.info('Server closed', { category: 'system' });
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    category: 'system'
  });
});

module.exports = { app, server, io };
