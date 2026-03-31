/**
 * @module loadCalculator
 * @description Request tracker with rolling latency and error rate metrics
 */

const os = require("os");

let activeRequestCount = 0;
let isInitialized = false;

function createRequestTracker() {
  const config = {
    ROLLING_WINDOW_SIZE: parseInt(process.env.ROLLING_WINDOW_SIZE) || 50,
    WARMUP_PERIOD_MS: parseInt(process.env.WARMUP_PERIOD_MS) || 30000,
    LATENCY_BASELINE_MS: parseInt(process.env.LATENCY_BASELINE_MS) || 1000,
  };

  if (!isInitialized) {
    console.info("[LoadCalculator] Request tracker initialized");
    isInitialized = true;
  }

  const windowSize = config.ROLLING_WINDOW_SIZE;
  const startTime = Date.now();
  const latencyBufferFull = new Array(windowSize).fill(0);
  const errorBufferFull = new Array(windowSize).fill(0);
  let bufferIndex = 0;

  const middleware = (req, res, next) => {
    if (req.path === "/health") {
      return next();
    }

    activeRequestCount++;
    const requestStart = Date.now();
    let counted = false;

    const decrement = () => {
      if (counted) return;
      counted = true;
      if (activeRequestCount > 0) {
        activeRequestCount--;
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
  };

  const getMetrics = () => {
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
      currentLoad: activeRequestCount,
      avgLatencyMs: avgLatencyMs,
      errorRate: errorRate,
      warmup: inWarmup,
    };
  };

  return { middleware, getMetrics };
}

function computeLoadFactor(currentLoad, maxCapacity) {
  if (maxCapacity <= 0) return 1;
  return Math.min(1, Math.max(0, currentLoad / maxCapacity));
}

module.exports = { createRequestTracker, computeLoadFactor };
