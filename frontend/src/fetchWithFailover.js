/**
 * @module fetchWithFailover
 * @description Fetch with failover capability using weighted random selection
 */

import {
  filterAvailableServers,
  weightedRandomSelect,
  getStickyServer,
  setStickyServer,
} from "./serverSelector.js";
import {
  isCircuitOpen,
  markServerFailed,
  resetServer,
} from "./circuitBreaker.js";

const REQUEST_TIMEOUT_MS = parseInt(
  import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? "5000",
  10,
);

/**
 * Performs a fetch request with automatic failover to next healthy server
 * @param {string} endpoint - API endpoint path (must start with "/")
 * @param {Object} options - Fetch options
 * @param {string} options.idempotencyKey - Required unique key for idempotent requests
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.headers={}] - Additional headers
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @param {Array} servers - Array of server objects from WebSocket snapshot
 * @returns {Promise<Response>} Fetch Response object
 * @throws {TypeError} If idempotencyKey is missing or empty
 * @throws {Error} "NO_HEALTHY_SERVERS" if no available servers
 * @throws {Error} "ALL_SERVERS_FAILED" if all servers fail
 */
export async function fetchWithFailover(endpoint, options, servers) {
  if (!options.idempotencyKey || typeof options.idempotencyKey !== "string") {
    throw new TypeError(
      "idempotencyKey is required and must be a non-empty string",
    );
  }

  const available = filterAvailableServers(servers);

  if (available.length === 0) {
    throw new Error("NO_HEALTHY_SERVERS");
  }

  const attemptList = [];
  const remaining = [...available];

  const sticky = getStickyServer(available);
  if (sticky) {
    const stickyServer = remaining.find((s) => s.url === sticky);
    if (stickyServer) {
      attemptList.push(stickyServer);
      const idx = remaining.indexOf(stickyServer);
      remaining.splice(idx, 1);
    }
  }

  while (remaining.length > 0) {
    const selected = weightedRandomSelect(remaining);
    if (selected) {
      attemptList.push(selected);
      const idx = remaining.indexOf(selected);
      remaining.splice(idx, 1);
    }
  }

  for (const server of attemptList) {
    if (isCircuitOpen(server.url)) {
      continue;
    }

    const controller = new AbortController();
    let timeoutId;

    try {
      timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const headers = {
        ...options.headers,
        "Idempotency-Key": options.idempotencyKey,
        "Content-Type": "application/json",
      };

      const fetchOptions = {
        ...options,
        headers,
        signal: controller.signal,
      };

      const response = await fetch(server.url + endpoint, fetchOptions);

      clearTimeout(timeoutId);

      if (response.ok) {
        resetServer(server.url);
        setStickyServer(server.url);
        console.info("[Failover] success:", server.url + endpoint);
        return response;
      }

      console.warn("[Failover] failed:", server.url, "— trying next");
      markServerFailed(server.url);
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.warn("[Failover] failed:", server.url, "— trying next");
      markServerFailed(server.url);
    }
  }

  throw new Error("ALL_SERVERS_FAILED");
}
