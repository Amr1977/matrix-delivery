/**
 * @module scoring
 * @description Pure scoring functions for server load balancing
 */

const { config } = require("./config.js");

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
 * @param {Array} servers - Array of server objects
 * @returns {Array} New array with normalized scores
 */
function normalizeScores(servers) {
  if (!servers || servers.length === 0) return servers;

  const scores = servers.map((s) => s.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  if (max === min) return servers;

  return servers.map((server) => ({
    ...server,
    score: (server.score - min) / (max - min),
  }));
}

module.exports = { clamp, computeScore, normalizeScores };
