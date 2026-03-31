/**
 * @module config
 * @description Aggregator configuration - validates and exports environment variables
 */

const requiredVars = ["REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD", "WS_PORT"];

const optionalVars = {
  AGGREGATOR_INTERVAL_MS: 5000,
  STALENESS_THRESHOLD_MS: 90000,
  HEALTH_CHECK_TIMEOUT_MS: 2000,
  LATENCY_BASELINE_MS: 1000,
  MIN_SCORE_SPREAD: 0.05,
};

const missing = requiredVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

const config = Object.freeze({
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  WS_PORT: parseInt(process.env.WS_PORT, 10),
  AGGREGATOR_INTERVAL_MS: parseInt(
    process.env.AGGREGATOR_INTERVAL_MS || optionalVars.AGGREGATOR_INTERVAL_MS,
    10,
  ),
  STALENESS_THRESHOLD_MS: parseInt(
    process.env.STALENESS_THRESHOLD_MS || optionalVars.STALENESS_THRESHOLD_MS,
    10,
  ),
  HEALTH_CHECK_TIMEOUT_MS: parseInt(
    process.env.HEALTH_CHECK_TIMEOUT_MS || optionalVars.HEALTH_CHECK_TIMEOUT_MS,
    10,
  ),
  LATENCY_BASELINE_MS: parseInt(
    process.env.LATENCY_BASELINE_MS || optionalVars.LATENCY_BASELINE_MS,
    10,
  ),
  MIN_SCORE_SPREAD: parseFloat(
    process.env.MIN_SCORE_SPREAD || optionalVars.MIN_SCORE_SPREAD,
  ),
});

export { config };
