/**
 * @module aggregator
 * @description Main aggregator loop - reads Redis, health checks, scores, broadcasts
 */

const fs = require("fs");
const path = require("path");

// Load .env from aggregator directory
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const Redis = require("ioredis");
const { config } = require("./config.js");
const { computeScore, normalizeScores } = require("./scoring.js");
const { startWsServer, broadcast } = require("./wsServer.js");

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
      if (!data || Object.keys(data).length === 0) continue;

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
      return (
        server.status === "healthy" &&
        Date.now() - server.lastHeartbeat < config.STALENESS_THRESHOLD_MS
      );
    });

    const checkedServers = await Promise.allSettled(
      healthyServers.map(async (server) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(
            () => controller.abort(),
            config.HEALTH_CHECK_TIMEOUT_MS,
          );
          const response = await fetch(`${server.url}/api/health`, {
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (!response.ok)
            throw new Error(`Health check failed: ${response.status}`);
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

    await redis.set(
      "mdp:routing:active",
      JSON.stringify({ servers: normalized, updatedAt: Date.now() }),
    );
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

function start() {
  // Use environment port or default to 4001
  const port = process.env.WS_PORT || 4001;
  console.info(`[Aggregator] Starting on port ${port}...`);
  startWsServer(port);

  runAggregatorCycle().then(() => {
    intervalId = setInterval(runAggregatorCycle, config.AGGREGATOR_INTERVAL_MS);
    console.info("[Aggregator] Started successfully");
  });

  process.on("SIGTERM", () => {
    console.info("[Aggregator] Shutting down...");
    if (intervalId) clearInterval(intervalId);
    process.exit(0);
  });
  process.on("SIGINT", () => {
    console.info("[Aggregator] Shutting down...");
    if (intervalId) clearInterval(intervalId);
    process.exit(0);
  });
}

start();

module.exports = { runAggregatorCycle, createRedisClient };
