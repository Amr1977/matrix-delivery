/**
 * @module fetchWithFailover
 * @description Failover with Firestore server discovery and sticky server selection
 */

import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

const HEALTH_ENDPOINT = "/api/health";
const HEALTH_CHECK_TIMEOUT = 5000;
const REQUEST_TIMEOUT_MS = 10000;
const SERVER_LIST_REFRESH_INTERVAL = 60000;

// Cache for sticky server selection
let currentServer = null;
let serverListPromise = null;
let lastServerListRefresh = 0;

/**
 * Clear the cached server (call on failover)
 */
export function clearServerCache() {
  currentServer = null;
  serverListPromise = null;
  lastServerListRefresh = 0;
}

/**
 * Force refresh server list
 */
export async function refreshServerList() {
  currentServer = null;
  lastServerListRefresh = Date.now();
  return getServerListFromFirestore();
}

/**
 * Fetch server list from Firestore
 */
async function getServerListFromFirestore() {
  try {
    // Avoid multiple simultaneous Firestore requests
    if (serverListPromise) {
      return serverListPromise;
    }

    serverListPromise = (async () => {
      const serversCol = collection(db, "servers");
      const serversSnapshot = await getDocs(serversCol);
      const servers = [];

      serversSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.url) {
          // Ensure URL includes /api prefix
          const url = data.url.endsWith("/api") ? data.url : `${data.url}/api`;
          servers.push(url);
        }
      });

      // Filter out duplicates and empty URLs
      return [...new Set(servers.filter(Boolean))];
    })();

    const result = await serverListPromise;
    serverListPromise = null; // Reset for next call
    return result;
  } catch (error) {
    console.warn(
      "[Failover] Firestore error, falling back to hardcoded list:",
      error,
    );
    serverListPromise = null;
    // Fallback to hardcoded list if Firestore fails
    return [
      "https://api.matrix-delivery.com/api",
      "https://matrix-delivery-api-gc.mywire.org/api",
    ];
  }
}

/**
 * Fire parallel health checks on server URLs and return first healthy server
 * @param {string[]} serverUrls - Array of server base URLs
 * @returns {Promise<{url: string}|null>}
 */
async function findHealthyServer(serverUrls) {
  if (serverUrls.length === 0) {
    return null;
  }

  const results = await Promise.all(
    serverUrls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          HEALTH_CHECK_TIMEOUT,
        );

        const response = await fetch(`${url}${HEALTH_ENDPOINT}`, {
          method: "GET",
          signal: controller.signal,
          credentials: "include",
        });

        clearTimeout(timeout);
        return { url, healthy: response.ok };
      } catch {
        return { url, healthy: false };
      }
    }),
  );

  const healthy = results.find((r) => r.healthy);
  return healthy ? { url: healthy.url } : null;
}

/**
 * Fetch with failover - health check on demand, pick first responder, sticky until failure
 */
export async function fetchWithFailover(endpoint, options) {
  if (!options.idempotencyKey) {
    throw new TypeError("idempotencyKey is required");
  }

  // Resolve server URL (currentServer is stored as a string URL)
  let serverUrl = currentServer;

  // If no sticky server, get one from Firestore
  // Also refresh if stale (>60 seconds)
  const shouldRefresh =
    !serverUrl ||
    Date.now() - lastServerListRefresh > SERVER_LIST_REFRESH_INTERVAL;

  if (!serverUrl || shouldRefresh) {
    // Clear stale cache if needed
    if (shouldRefresh && currentServer) {
      console.info("[Failover] Server list stale, refreshing...");
      currentServer = null;
    }

    const serverList = await getServerListFromFirestore();
    const found = await findHealthyServer(serverList);

    if (!found) {
      throw new Error("NO_HEALTHY_SERVERS");
    }

    // Set as current sticky server
    serverUrl = found.url;
    currentServer = serverUrl;
    lastServerListRefresh = Date.now();
    console.info(`[Failover] Selected sticky server: ${currentServer}`);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${serverUrl}${endpoint}`, {
      ...options,
      signal: controller.signal,
      credentials: "include",
      headers: {
        ...options.headers,
        "Idempotency-Key": options.idempotencyKey,
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      console.info(`[Failover] success: ${serverUrl}${endpoint}`);
      return response;
    }

    // Server responded with 5xx error - refresh server list before retry
    if (response.status >= 500) {
      console.warn(
        `[Failover] ${serverUrl} returned ${response.status}, refreshing server list`,
      );
      currentServer = null;
      lastServerListRefresh = 0; // Force refresh

      const serverList = await getServerListFromFirestore();
      const found = await findHealthyServer(serverList);

      if (found) {
        serverUrl = found.url;
        currentServer = serverUrl;
        lastServerListRefresh = Date.now();
        console.info(`[Failover] Failover to: ${currentServer}`);

        // Retry with new server
        return fetchWithFailover(endpoint, { ...options, _retry: true });
      }

      throw new Error("NO_HEALTHY_SERVERS");
    }

    // 4xx errors - don't retry, just return
    console.warn(`[Failover] ${serverUrl} returned ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(timeout);

    // Network error or timeout - mark server as failed and refresh
    console.warn(
      `[Failover] ${serverUrl} failed with error: ${error.message}, refreshing server list`,
    );
    currentServer = null;
    lastServerListRefresh = 0; // Force refresh

    // Try once more with fresh server
    const serverList = await getServerListFromFirestore();
    const found = await findHealthyServer(serverList);

    if (found) {
      serverUrl = found.url;
      currentServer = serverUrl;
      lastServerListRefresh = Date.now();
      console.info(`[Failover] Failover to: ${currentServer}`);

      return fetchWithFailover(endpoint, { ...options, _retry: true });
    }

    throw new Error("NO_HEALTHY_SERVERS");
  }
}

export default { fetchWithFailover };
