/**
 * @module serverRegistry
 * @description Server registration and heartbeat management using Redis
 */

import Redis from "ioredis";
import { config } from "./config.js";

/**
 * @description Creates a Redis client instance for server registry
 * @returns {Redis}
 */
function createRedisClient() {
  const client = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: false,
  });

  client.on("error", (err) =>
    console.error("[Redis] connection error:", err.message),
  );
  client.on("ready", () => console.info("[Redis] connected and ready"));

  return client;
}

let redisClient = null;
let heartbeatInterval = null;

/**
 * Registers this server in Redis
 * @private
 * @async
 */
async function registerServer() {
  const serverKey = `mdp:server:${config.SERVER_ID}`;
  const metrics = {
    currentLoad: 0,
    avgLatencyMs: config.LATENCY_BASELINE_MS,
    errorRate: 0,
    warmup: true,
  };

  try {
    await redisClient.hset(serverKey, {
      url: config.SERVER_URL,
      status: "healthy",
      currentLoad: metrics.currentLoad,
      maxCapacity: config.SERVER_MAX_CAPACITY,
      priority: config.SERVER_PRIORITY,
      avgLatencyMs: metrics.avgLatencyMs,
      errorRate: metrics.errorRate,
      warmup: "true",
      lastHeartbeat: Date.now(),
    });

    await redisClient.sadd("mdp:servers:index", config.SERVER_ID);

    console.info(
      `[Registry] Server registered: ${config.SERVER_ID} at ${config.SERVER_URL}`,
    );
  } catch (error) {
    console.error(`[Registry] Failed to register server:`, error.message);
    throw error;
  }
}

/**
 * Updates heartbeat with current metrics
 * @private
 */
async function updateHeartbeat() {
  try {
    const metrics = getMetrics();
    const serverKey = `mdp:server:${config.SERVER_ID}`;

    await redisClient.hset(serverKey, {
      status: "healthy",
      currentLoad: metrics.currentLoad,
      avgLatencyMs: metrics.avgLatencyMs,
      errorRate: metrics.errorRate,
      warmup: metrics.warmup ? "true" : "false",
      lastHeartbeat: Date.now(),
    });

    console.info(
      `[Registry] Heartbeat updated: ${config.SERVER_ID}, load: ${metrics.currentLoad}`,
    );
  } catch (error) {
    console.warn(
      `[Registry] Heartbeat update failed for ${config.SERVER_ID}:`,
      error.message,
    );
  }
}

/**
 * Graceful shutdown - marks server as unhealthy and disconnects
 * @private
 */
async function gracefulShutdown() {
  try {
    const serverKey = `mdp:server:${config.SERVER_ID}`;
    await redisClient.hset(serverKey, "status", "unhealthy");
    console.info(`[Registry] Server marked unhealthy: ${config.SERVER_ID}`);
  } catch (error) {
    console.error(`[Registry] Failed to mark server unhealthy:`, error.message);
  } finally {
    if (redisClient) {
      await redisClient.quit();
    }
    process.exit(0);
  }
}

/**
 * Starts the server registry with heartbeat mechanism
 * @param {Object} params - Parameters object
 * @param {Function} params.getMetrics - Function to get current metrics
 * @returns {Object} { stop: Function } Function to stop the registry
 */
function startRegistry({ getMetrics }) {
  redisClient = createRedisClient();

  registerServer()
    .then(() => {
      heartbeatInterval = setInterval(
        updateHeartbeat,
        config.HEARTBEAT_INTERVAL_MS,
      );
      console.info(`[Registry] Started for ${config.SERVER_ID}`);
    })
    .catch((error) => {
      console.error(`[Registry] Failed to start:`, error.message);
      process.exit(1);
    });

  const shutdownHandler = (signal) => {
    console.info(
      `[Registry] Received ${signal}, starting graceful shutdown...`,
    );
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    gracefulShutdown();
  };

  process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
  process.on("SIGINT", () => shutdownHandler("SIGINT"));

  return {
    stop: async () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      await gracefulShutdown();
    },
  };
}

export { startRegistry, createRedisClient };
export default { startRegistry };
