/**
 * @module config
 * @description Backend configuration - validates and exports environment variables
 */

const requiredVars = [
  "SERVER_ID",
  "SERVER_URL",
  "SERVER_MAX_CAPACITY",
  "PORT",
  "ALLOWED_ORIGINS",
];

const optionalVars = {
  REDIS_HOST: "127.0.0.1",
  REDIS_PORT: 6379,
  SERVER_PRIORITY: 1,
  HEARTBEAT_INTERVAL_MS: 30000,
  WARMUP_PERIOD_MS: 30000,
  ROLLING_WINDOW_SIZE: 50,
  LATENCY_BASELINE_MS: 1000,
};

const missing = requiredVars.filter((v) => !process.env[v]);

const config = Object.freeze({
  SERVER_ID:
    process.env.SERVER_ID || "server-" + (process.env.NODE_APP_INSTANCE || "1"),
  SERVER_URL: process.env.SERVER_URL,
  SERVER_MAX_CAPACITY: parseInt(process.env.SERVER_MAX_CAPACITY, 10) || 100,
  SERVER_PRIORITY: parseInt(
    process.env.SERVER_PRIORITY || optionalVars.SERVER_PRIORITY,
    10,
  ),
  PORT: parseInt(process.env.PORT, 10),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : [],
  REDIS_HOST: process.env.REDIS_HOST || optionalVars.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || optionalVars.REDIS_PORT, 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  HEARTBEAT_INTERVAL_MS: parseInt(
    process.env.HEARTBEAT_INTERVAL_MS || optionalVars.HEARTBEAT_INTERVAL_MS,
    10,
  ),
  WARMUP_PERIOD_MS: parseInt(
    process.env.WARMUP_PERIOD_MS || optionalVars.WARMUP_PERIOD_MS,
    10,
  ),
  ROLLING_WINDOW_SIZE: parseInt(
    process.env.ROLLING_WINDOW_SIZE || optionalVars.ROLLING_WINDOW_SIZE,
    10,
  ),
  LATENCY_BASELINE_MS: parseInt(
    process.env.LATENCY_BASELINE_MS || optionalVars.LATENCY_BASELINE_MS,
    10,
  ),
});

module.exports = { config };
