/**
 * @module serverSelector
 * @description Server selection utilities for failover - pure functions
 */

import { isCircuitOpen } from "./circuitBreaker.js";

const STICKY_SERVER_KEY = "mdp_sticky_server";

/**
 * Filters available servers by removing those with open circuits
 * @param {Array} servers - Array of server objects with url and score
 * @returns {Array} Filtered array of available servers
 */
export function filterAvailableServers(servers) {
  if (!servers || servers.length === 0) {
    return [];
  }
  return servers.filter((server) => !isCircuitOpen(server.url));
}

/**
 * Selects a server using weighted random selection
 * Weight = 1 / (score + 0.01), lower score = higher weight
 * @param {Array} servers - Pre-filtered array of available servers
 * @returns {Object|null} Selected server or null if empty
 */
export function weightedRandomSelect(servers) {
  if (!servers || servers.length === 0) {
    return null;
  }

  const weights = servers.map((server) => 1 / (server.score + 0.01));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  const random = Math.random() * totalWeight;
  let cumulative = 0;

  for (let i = 0; i < servers.length; i++) {
    cumulative += weights[i];
    if (cumulative >= random) {
      return servers[i];
    }
  }

  return servers[servers.length - 1];
}

/**
 * Selects an available server using filter + weighted random
 * @param {Array} servers - Array of server objects with url and score
 * @returns {Object|null} Selected server or null if none available
 */
export function selectServer(servers) {
  const available = filterAvailableServers(servers);
  return weightedRandomSelect(available);
}

/**
 * Gets sticky server URL from localStorage if it exists in servers array
 * @param {Array} servers - Array of server objects
 * @returns {string|null} Sticky server URL or null
 */
export function getStickyServer(servers) {
  try {
    const stickyUrl = localStorage.getItem(STICKY_SERVER_KEY);
    if (!stickyUrl) return null;

    const exists = servers && servers.some((s) => s.url === stickyUrl);
    return exists ? stickyUrl : null;
  } catch {
    return null;
  }
}

/**
 * Sets sticky server URL in localStorage
 * @param {string} url - Server URL to make sticky
 */
export function setStickyServer(url) {
  try {
    localStorage.setItem(STICKY_SERVER_KEY, url);
  } catch {
    // Silently fail on private browsing
  }
}

/**
 * Clears sticky server from localStorage
 */
export function clearStickyServer() {
  try {
    localStorage.removeItem(STICKY_SERVER_KEY);
  } catch {
    // Silently fail
  }
}
