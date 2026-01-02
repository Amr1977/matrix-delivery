
const Redis = require('ioredis');

async function flush() {
    console.log('Attempting to connect to Redis...');

    // Try environment variable or default
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log('Using URL:', redisUrl);

    const redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null // Don't retry
    });

    redis.on('error', (err) => {
        console.error('Redis Error:', err.message);
        console.log('If you are using PM2 without external Redis, restart the process to clear memory cache: `pm2 restart matrix-delivery-backend`');
        process.exit(1);
    });

    try {
        await redis.flushall();
        console.log('✅ Redis FLUSHALL successful.');
        process.exit(0);
    } catch (error) {
        console.error('Failed to flush:', error.message);
        process.exit(1);
    }
}

flush();
