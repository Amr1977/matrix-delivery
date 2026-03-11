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
const TelegramPollingService = require('./services/telegramPollingService');
const { BalanceService } = require('./services/balanceService');

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5001;

// Telegram polling service
let telegramPollingService = null;

// Create HTTP server wrapping the Express app
const httpServer = http.createServer(app);

// Socket.IO CORS - Align with Express CORS configuration
const io = socketIo(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow all origins in test mode
      if (IS_TEST) {
        return callback(null, true);
      }

      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        // Allow all for production
        if (IS_PRODUCTION) {
          return callback(null, true);
        }
        return callback(null, 'https://matrix-delivery.web.app');
      }

      // In production, allow all origins to fix CORS issues
      if (IS_PRODUCTION) {
        return callback(null, origin);
      }

      // Parse allowed origins from environment variable for development
      const allowedOrigins = process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
        : [
          'http://localhost:3000',
          'http://192.168.1.2:3000',
          'https://' + process.env.REPLIT_DEV_DOMAIN,
          'https://matrix-delivery.web.app'
        ];

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
// Redis is optional - server will work without it (single instance mode)
// ============================================================================
if (process.env.REDIS_URL && process.env.ENABLE_REDIS === 'true' && !IS_TEST) {
  // Only use Redis adapter if explicitly enabled
  try {
    const pubClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 10000
    });
    const subClient = pubClient.duplicate();

    // Try to connect with timeout
    const connectPromise = Promise.all([pubClient.connect(), subClient.connect()]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
    );

    Promise.race([connectPromise, timeoutPromise])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info('✅ Socket.IO Redis adapter connected - cluster mode enabled');
      })
      .catch((err) => {
        pubClient.disconnect().catch(() => {});
        subClient.disconnect().catch(() => {});
        logger.warn(`⚠️ Redis unavailable for Socket.IO: ${err.message} - using in-memory adapter (single instance)`);
      });

    pubClient.on('error', (err) => {
      logger.debug(`Redis pubClient error: ${err.message}`);
    });
    subClient.on('error', (err) => {
      logger.debug(`Redis subClient error: ${err.message}`);
    });
  } catch (err) {
    logger.warn(`⚠️ Redis setup skipped for Socket.IO: ${err.message} - using in-memory adapter`);
  }
} else if (!IS_TEST) {
  logger.info('ℹ️ Socket.IO using in-memory adapter (set ENABLE_REDIS=true for cluster mode)');
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
    
    // Start Telegram polling service (NOT in test mode)
    if (!IS_TEST && process.env.TELEGRAM_BOT_TOKEN) {
      try {
        telegramPollingService = new TelegramPollingService(
          process.env.TELEGRAM_BOT_TOKEN,
          pool,
          new BalanceService(pool)
        );
        telegramPollingService.start();
        console.log('🤖 Telegram polling service started');
      } catch (err) {
        console.error('❌ Failed to start Telegram polling:', err.message);
      }
    }
    
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
  
  // Stop Telegram polling
  if (telegramPollingService) {
    telegramPollingService.stop();
  }
  
  stopCleanup();

  // Stop activity tracker interval and flush pending updates
  try {
    const { activityTracker } = require('./services/activityTracker') /* P0 FIX: removed .ts ext */;
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
