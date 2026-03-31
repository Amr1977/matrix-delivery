/**
 * @fileoverview Server selection and ranking utilities for failover.
 * Pure functions that accept raw server arrays - no Firestore imports.
 * @module serverSelector
 */

import { isCircuitOpen } from "./circuitBreaker.js";

export const STALENESS_THRESHOLD_MS = 20000;
const STICKY_SERVER_KEY = "mdp_sticky_server";

/**
 * Determines if a server is healthy based on status, heartbeat freshness, and circuit state.
 * @param {Object} server - Server object from Firestore
 * @returns {boolean} True if server is healthy
 */
export function isServerHealthy(server) {
  if (server.status !== "healthy") {
    return false;
  }

  const timeSinceHeartbeat = Date.now() - server.lastHeartbeat;
  if (timeSinceHeartbeat >= STALENESS_THRESHOLD_MS) {
    return false;
  }

  if (isCircuitOpen(server.url)) {
    return false;
  }

  return true;
}

/**
 * Computes the load score for a server (0-1 scale).
 * Returns 1 (fully saturated) if maxCapacity is 0 to avoid division by zero.
 * @param {Object} server - Server object with currentLoad and maxCapacity
 * @returns {number} Load factor between 0 and 1
 */
export function computeLoadScore(server) {
  if (!server.maxCapacity || server.maxCapacity === 0) {
    return 1;
  }
  return server.currentLoad / server.maxCapacity;
}

/**
 * Ranks servers by health, sticky session preference, load score, and priority.
 * @param {Array<Object>} servers - Array of server objects from Firestore
 * @returns {Array<Object>} Sorted array of healthy servers (may be empty)
 */
export function rankServers(servers) {
  // Filter to healthy servers
  const healthy = servers.filter(isServerHealthy);

  if (healthy.length === 0) {
    return [];
  }

  // Check for sticky session
  let stickyServer = null;
  try {
    const stickyUrl = localStorage.getItem(STICKY_SERVER_KEY);
    if (stickyUrl) {
      const found = healthy.find((s) => s.url === stickyUrl);
      if (found) {
        stickyServer = found;
      }
    }
  } catch {
    // localStorage unavailable
  }

  // Sort by load score (ascending), then priority (ascending)
  const sorted = [...healthy].sort((a, b) => {
    const loadScoreA = computeLoadScore(a);
    const loadScoreB = computeLoadScore(b);

    if (loadScoreA !== loadScoreB) {
      return loadScoreA - loadScoreB;
    }

    return a.priority - b.priority;
  });

  // Move sticky server to front if found
  if (stickyServer) {
    const stickyIndex = sorted.findIndex((s) => s.url === stickyServer.url);
    if (stickyIndex > 0) {
      sorted.splice(stickyIndex, 1);
      sorted.unshift(stickyServer);
    }
  }

  return sorted;
}

/**
 * Selects the best server from the available pool.
 * @param {Array<Object>} servers - Array of server objects from Firestore
 * @returns {Object|null} The best server or null if no healthy servers
 */
export function selectBestServer(servers) {
  const ranked = rankServers(servers);
  return ranked.length > 0 ? ranked[0] : null;
}

/**
 * Gets the sticky server URL from localStorage.
 * @returns {string|null} Server URL or null if not set
 */
export function getStickyServer() {
  try {
    return localStorage.getItem(STICKY_SERVER_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets the sticky server URL in localStorage.
 * @param {string} serverUrl - Server URL to make sticky
 */
export function setStickyServer(serverUrl) {
  try {
    localStorage.setItem(STICKY_SERVER_KEY, serverUrl);
  } catch {
    // Silently fail on private browsing
  }
}

/**
 * Clears the sticky server from localStorage.
 */
export function clearStickyServer() {
  try {
    localStorage.removeItem(STICKY_SERVER_KEY);
  } catch {
    // Silently fail on private browsing
  }
}
