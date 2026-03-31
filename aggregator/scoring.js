/**
 * @module scoring
 * @description Pure scoring functions for server load balancing
 */

import { config } from "./config.js";

/**
 * Clamps a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Computes a score for a server based on various metrics
 * Lower score = better (more preferred for routing)
 * @param {Object} server - Server object with metrics
 * @param {number} server.currentLoad - Current active request count
 * @param {number} server.maxCapacity - Maximum capacity
 * @param {number} server.avgLatencyMs - Average latency in milliseconds
 * @param {number} server.errorRate - Error rate in [0,1] range
 * @param {boolean} server.warmup - Whether server is in warmup period
 * @returns {number} Score clamped to [0,1], lower = better
 */
function computeScore(server) {
  const loadFactor =
    server.maxCapacity > 0
      ? clamp(server.currentLoad / server.maxCapacity, 0, 1)
      : 1;

  const latencyFactor = clamp(
    server.avgLatencyMs / config.LATENCY_BASELINE_MS,
    0,
    1,
  );

  const errRate = clamp(server.errorRate, 0, 1);

  let raw = loadFactor * 0.5 + latencyFactor * 0.3 + errRate * 0.2;

  if (server.warmup === true) {
    raw = raw + 0.3;
  }

  return clamp(raw, 0, 1);
}

/**
 * Normalizes scores across all servers to [0,1] range
 * @param {Array} servers - Array of server objects with score property
 * @returns {Array} New array with normalized scores
 */
function normalizeScores(servers) {
  if (!servers || servers.length === 0) {
    return servers;
  }

  const scores = servers.map((s) => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  if (max === min) {
    return servers;
  }

  const spread = max - min;
  if (spread < config.MIN_SCORE_SPREAD) {
    console.warn(
      `[Scoring] Score spread (${spread.toFixed(4)}) below minimum (${config.MIN_SCORE_SPREAD})`,
    );
  }

  return servers.map((server) => ({
    ...server,
    score: (server.score - min) / (max - min),
  }));
}

export { clamp, computeScore, normalizeScores };
export default { clamp, computeScore, normalizeScores };
