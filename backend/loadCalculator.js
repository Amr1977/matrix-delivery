/**
 * @module loadCalculator
 * @description Request tracker with rolling latency and error rate metrics
 */

import { config } from "./config.js";

/**
 * @typedef {Object} Metrics
 * @property {number} currentLoad - Current active request count
 * @property {number} avgLatencyMs - Rolling average latency in milliseconds
 * @property {number} errorRate - Error rate in [0,1] range
 * @property {boolean} warmup - Whether server is still in warmup period
 */

/**
 * Creates a request tracker with middleware and metrics getter
 * @returns {{ middleware: import('express').RequestHandler, getMetrics: () => Metrics }}
 */
function createRequestTracker() {
  let activeRequests = 0;
  const windowSize = config.ROLLING_WINDOW_SIZE;
  const startTime = Date.now();

  const latencyBufferFull = new Array(windowSize).fill(0);
  const errorBufferFull = new Array(windowSize).fill(0);
  let bufferIndex = 0;

  /**
   * Express middleware to track requests
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  function middleware(req, res, next) {
    if (req.path === "/health") {
      return next();
    }

    activeRequests++;

    const requestStart = Date.now();
    let counted = false;

    const decrement = () => {
      if (counted) return;
      counted = true;
      if (activeRequests > 0) {
        activeRequests--;
      }

      const duration = Date.now() - requestStart;
      latencyBufferFull[bufferIndex] = duration;

      const isError = res.statusCode >= 500 ? 1 : 0;
      errorBufferFull[bufferIndex] = isError;

      bufferIndex = (bufferIndex + 1) % windowSize;
    };

    res.on("finish", decrement);
    res.on("close", decrement);

    return next();
  }

  /**
   * Get current metrics
   * @returns {Metrics}
   */
  function getMetrics() {
    const now = Date.now();
    const inWarmup = now - startTime < config.WARMUP_PERIOD_MS;

    let totalLatency = 0;
    let count = 0;
    for (let i = 0; i < windowSize; i++) {
      if (latencyBufferFull[i] > 0) {
        totalLatency += latencyBufferFull[i];
        count++;
      }
    }

    const avgLatencyMs =
      count > 0 ? totalLatency / count : config.LATENCY_BASELINE_MS;

    let totalErrors = 0;
    let totalRequests = 0;
    for (let i = 0; i < windowSize; i++) {
      if (errorBufferFull[i] > 0 || latencyBufferFull[i] > 0) {
        totalRequests++;
        totalErrors += errorBufferFull[i];
      }
    }

    const errorRate =
      totalRequests > 0
        ? Math.min(1, Math.max(0, totalErrors / totalRequests))
        : 0;

    return {
      currentLoad: activeRequests,
      avgLatencyMs: avgLatencyMs,
      errorRate: errorRate,
      warmup: inWarmup,
    };
  }

  return { middleware, getMetrics };
}

/**
 * Compute load factor from current load and max capacity
 * @param {number} currentLoad
 * @param {number} maxCapacity
 * @returns {number} Load factor clamped to [0,1]
 */
function computeLoadFactor(currentLoad, maxCapacity) {
  if (maxCapacity <= 0) return 1;
  return Math.min(1, Math.max(0, currentLoad / maxCapacity));
}

export { createRequestTracker, computeLoadFactor };
export default createRequestTracker;
