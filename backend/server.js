const dotenv = require('dotenv');

// Register ts-node to load TypeScript modules
require('ts-node/register');

// Load environment FIRST
// Check ENV_FILE first (set by PM2), then fall back to NODE_ENV-based detection
const envFile = process.env.ENV_FILE || 
  (process.env.NODE_ENV === 'production' ? '.env.production' : 
   process.env.NODE_ENV === 'staging' ? '.env.staging' : 
   process.env.NODE_ENV === 'development' ? '.env.development' : 
   process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing' ? '.env.testing' : '.env');

if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing') {
  dotenv.config({ path: '.env.testing' });
} else {
  dotenv.config({ path: envFile });
}

const app = require('./app');
//TODO use https ⚠️
const http = require('http');
const socketIo = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const logger = require('./config/logger');
const pool = require('./config/db');
const { getNotificationService } = require('./services/notificationService');
const configureSocket = require('./config/socket');
const { startCleanup, stopCleanup } = require('./middleware/rateLimit');
const { initializePushService } = require('./services/pushNotificationService');
const pushRoutes = require('./routes/push');
app.use('/api/push', pushRoutes);

// Initialize Push Notification Service with pool
initializePushService(pool);

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5001;

// Create HTTP server wrapping the Express app
const httpServer = http.createServer(app);

// Socket.IO CORS - Align with Express CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
    'http://localhost:3000',
    'http://192.168.1.2:3000',
    'https://' + process.env.REPLIT_DEV_DOMAIN,
    'https://matrix-delivery.web.app'
  ];

const io = socketIo(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        // Return specific origin for credential support
        callback(null, origin);
      } else {
        logger.warn(`Socket.IO CORS blocked origin: ${origin}`, { category: 'websocket' });
        // Return specific origin anyway but log it (for debugging)
        callback(null, origin);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true, // Support older Socket.IO clients
  path: '/socket.io/'
});

// ============================================================================
// SOCKET.IO REDIS ADAPTER FOR PM2 CLUSTER MODE
// This enables session sharing across multiple PM2 instances
// ============================================================================
if (process.env.REDIS_URL && !IS_TEST) {
  try {
    // Create pub/sub clients for Socket.IO adapter
    // These are separate from the main Redis client used for caching/blacklist
    const pubClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true
    });
    const subClient = pubClient.duplicate();

    // Connect both clients
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO Redis adapter connected - cluster mode enabled');
      })
      .catch((err) => {
        logger.error('❌ Socket.IO Redis adapter connection failed:', err.message);
        logger.warn('⚠️ Falling back to in-memory adapter (single instance only)');
      });

    // Handle adapter client errors
    pubClient.on('error', (err) => {
      logger.error('Socket.IO Redis pub client error:', err.message);
    });
    subClient.on('error', (err) => {
      logger.error('Socket.IO Redis sub client error:', err.message);
    });
  } catch (err) {
    logger.error('❌ Failed to setup Socket.IO Redis adapter:', err.message);
  }
} else if (!IS_TEST) {
  logger.info('ℹ️ Socket.IO using in-memory adapter (single instance mode)');
}

// Configure Socket.IO
configureSocket(io);

// Initialize Notification Service with Socket.IO instance
const { initializeNotificationService } = require('./services/notificationService');
initializeNotificationService(pool, io, logger);

// Initialize Messaging Service with Socket.IO instance
const messagingService = require('./services/messagingService');
messagingService.setSocketIo(io);

let server;

process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err);
  logger.error('❌ UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION:', reason);
  logger.error('❌ UNHANDLED REJECTION:', reason);
  process.exit(1);
});

if (require.main === module) {
  // Start rate limit cleanup only when running the server directly
  startCleanup();

  // Start cache cleanup to prevent memory leaks
  const { startCacheCleanup } = require('./utils/cache');
  startCacheCleanup();
  logger.info('✅ Cache cleanup scheduled (every 5 minutes)');

  // Schedule driver location cleanup every 6 hours
  const { cleanupOldLocations } = require('./services/driverLocationService');
  const locationCleanupInterval = setInterval(async () => {
    try {
      const count = await cleanupOldLocations();
      if (count > 0) {
        logger.info(`Driver location cleanup: removed ${count} records`);
      }
    } catch (err) {
      logger.error('Driver location cleanup error:', err.message);
    }
  }, 6 * 60 * 60 * 1000);
  locationCleanupInterval.unref();

  server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('         🚚 Matrix Delivery Server (PostgreSQL)');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`✅ Server running on: http://localhost:${PORT}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}/api [RELOAD-TEST-${Date.now()}]`);
    console.log(`💾 Database: PostgreSQL`);
    console.log(`🔒 Environment: ${IS_TEST ? 'Testing' : (IS_PRODUCTION ? 'Production' : 'Development')}`);
    console.log('');
    // ... Additional endpoint logs omitted for brevity in entry point ...

    // Signal PM2 that the application is ready
    if (process.send) {
      process.send('ready');
    }
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server...');
  stopCleanup();

  // Stop activity tracker interval and flush pending updates
  try {
    const { activityTracker } = require('./services/activityTracker.ts');
    activityTracker.stopPeriodicCommit();
    await activityTracker.flush();
    console.log('✅ Activity tracker stopped');
  } catch (err) {
    console.error('Activity tracker shutdown error:', err.message);
  }

  // Stop cache cleanup
  const { stopCacheCleanup } = require('./utils/cache');
  stopCacheCleanup();
  console.log('✅ Cache cleanup stopped');

  if (server) {
    server.close(async () => {
      await pool.end();
      console.log('✅ Server shutdown complete\n');
      process.exit(0);
    });
  } else {
    await pool.end();
    process.exit(0);
  }
});

// Export app/io for consistency if referenced elsewhere?
// app.js is already exported from app.js
// If server.js is imported, it should probably export the app too or server
module.exports = app;
