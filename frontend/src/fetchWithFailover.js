/**
 * @fileoverview Fetch with failover capability using server ranking.
 * Iterates through ranked servers once, with timeout and circuit breaker integration.
 * @module fetchWithFailover
 */

import { rankServers } from "./serverSelector.js";
import {
  isCircuitOpen,
  markServerFailed,
  resetServer,
} from "./circuitBreaker.js";
import { setStickyServer } from "./serverSelector.js";

const REQUEST_TIMEOUT_MS = 5000;

/**
 * Performs a fetch request with automatic failover to the next healthy server.
 * @param {string} endpoint - API endpoint path (must start with "/")
 * @param {Object} options - Fetch options
 * @param {string} options.idempotencyKey - Required unique key for idempotent requests
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object} [options.headers={}] - Additional headers
 * @param {Array<Object>} servers - Array of server objects from Firestore snapshot
 * @returns {Promise<Response>} Fetch Response object
 * @throws {Error} If no healthy servers available or all servers fail
 */
export async function fetchWithFailover(endpoint, options, servers) {
  if (!options.idempotencyKey) {
    throw new Error("idempotencyKey is required in options");
  }

  const rankedServers = rankServers(servers);

  if (rankedServers.length === 0) {
    throw new Error("NO_HEALTHY_SERVERS");
  }

  const headers = {
    ...options.headers,
    "Idempotency-Key": options.idempotencyKey,
  };

  for (const server of rankedServers) {
    // Skip if circuit is open
    if (isCircuitOpen(server.url)) {
      console.warn(`[Failover] Circuit open, skipping: ${server.url}`);
      continue;
    }

    const controller = new AbortController();
    let timeoutId;

    try {
      const fullUrl = `${server.url}${endpoint}`;

      timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS);

      console.info(`[Failover] Trying: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (response.ok) {
        // Success path
        resetServer(server.url);
        setStickyServer(server.url);
        console.info(`[Failover] Success: ${server.url}${endpoint}`);
        return response;
      }

      // Non-ok response
      console.warn(
        `[Failover] Failed (${response.status}): ${server.url} — trying next`,
      );
      markServerFailed(server.url);
    } catch (error) {
      // Network error, abort, or timeout
      console.warn(
        `[Failover] Error: ${server.url} — ${error.message} — trying next`,
      );
      markServerFailed(server.url);
    } finally {
      // Always clear timeout to prevent memory leaks
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  // All servers failed
  throw new Error("ALL_SERVERS_FAILED");
}
