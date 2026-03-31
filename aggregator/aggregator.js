/**
 * @module aggregator
 * @description Main aggregator loop - reads Redis, health checks, scores, broadcasts
 */

import Redis from "ioredis";
import { config } from "./config.js";
import { computeScore, normalizeScores } from "./scoring.js";
import { startWsServer, broadcast } from "./wsServer.js";

/**
 * Creates a Redis client for the aggregator
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

/**
 * Runs a single aggregation cycle
 * @returns {Promise<void>}
 */
async function runAggregatorCycle() {
  try {
    const redis = createRedisClient();

    const serverIds = await redis.smembers("mdp:servers:index");

    if (serverIds.length === 0) {
      console.info("[Aggregator] No servers in index, broadcasting empty list");
      broadcast([]);
      await redis.quit();
      return;
    }

    const servers = [];
    for (const serverId of serverIds) {
      const data = await redis.hgetall(`mdp:server:${serverId}`);
      if (!data || Object.keys(data).length === 0) {
        continue;
      }

      servers.push({
        id: serverId,
        url: data.url,
        status: data.status,
        currentLoad: parseInt(data.currentLoad, 10) || 0,
        maxCapacity: parseInt(data.maxCapacity, 10) || 0,
        priority: parseInt(data.priority, 10) || 1,
        lastHeartbeat: parseInt(data.lastHeartbeat, 10) || 0,
        avgLatencyMs:
          parseFloat(data.avgLatencyMs) || config.LATENCY_BASELINE_MS,
        errorRate: parseFloat(data.errorRate) || 0,
        warmup: data.warmup === "true",
      });
    }

    const healthyServers = servers.filter((server) => {
      const isHealthy = server.status === "healthy";
      const isFresh =
        Date.now() - server.lastHeartbeat < config.STALENESS_THRESHOLD_MS;
      return isHealthy && isFresh;
    });

    const checkedServers = await Promise.allSettled(
      healthyServers.map(async (server) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(
            () => controller.abort(),
            config.HEALTH_CHECK_TIMEOUT_MS,
          );

          const response = await fetch(`${server.url}/health`, {
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (!response.ok) {
            throw new Error(`Health check failed: ${response.status}`);
          }

          return server;
        } catch (err) {
          console.warn(
            `[Aggregator] Health check failed for ${server.url}:`,
            err.message,
          );
          await redis.hset(`mdp:server:${server.id}`, "status", "unhealthy");
          return null;
        }
      }),
    );

    const passingServers = checkedServers
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => r.value);

    const scoredServers = passingServers.map((server) => ({
      url: server.url,
      score: computeScore(server),
      priority: server.priority,
    }));

    const normalized = normalizeScores(scoredServers);

    const routingData = JSON.stringify({
      servers: normalized,
      updatedAt: Date.now(),
    });
    await redis.set("mdp:routing:active", routingData);

    broadcast(normalized);

    console.info(
      `[Aggregator] cycle complete, healthy: ${passingServers.length}`,
    );

    await redis.quit();
  } catch (error) {
    console.error("[Aggregator] Cycle error:", error.message);
  }
}

let intervalId = null;

/**
 * Starts the aggregator
 */
function start() {
  console.info("[Aggregator] Starting...");

  startWsServer();

  runAggregatorCycle().then(() => {
    intervalId = setInterval(runAggregatorCycle, config.AGGREGATOR_INTERVAL_MS);
    console.info("[Aggregator] Started successfully");
  });

  const shutdown = (signal) => {
    console.info(`[Aggregator] Received ${signal}, shutting down...`);
    if (intervalId) {
      clearInterval(intervalId);
    }
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();

export { runAggregatorCycle, createRedisClient };
export default { runAggregatorCycle };
