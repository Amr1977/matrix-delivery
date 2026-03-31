/**
 * @module serverSelector
 * @description Client-side server selection with health checks
 */

const SERVER_LIST = [
  "https://api.matrix-delivery.com",
  "https://matrix-delivery-api-gc.mywire.org",
];

const HEALTH_ENDPOINT = "/api/health";
const HEALTH_CHECK_TIMEOUT = 5000;

/**
 * Check if a server is healthy
 * @param {string} serverUrl - Base URL of the server
 * @returns {Promise<{url: string, latency: number, healthy: boolean}>}
 */
async function checkServerHealth(serverUrl) {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      HEALTH_CHECK_TIMEOUT,
    );

    const response = await fetch(`${serverUrl}${HEALTH_ENDPOINT}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - start;

    return {
      url: serverUrl,
      latency,
      healthy: response.ok,
    };
  } catch (error) {
    return {
      url: serverUrl,
      latency: HEALTH_CHECK_TIMEOUT,
      healthy: false,
    };
  }
}

/**
 * Get the best server by checking all in parallel and picking the fastest healthy one
 * @returns {Promise<{url: string, latency: number}|null>}
 */
export async function selectBestServer() {
  const results = await Promise.all(
    SERVER_LIST.map((url) => checkServerHealth(url)),
  );

  // Filter to healthy servers, sort by latency
  const healthy = results
    .filter((r) => r.healthy)
    .sort((a, b) => a.latency - b.latency);

  if (healthy.length === 0) {
    console.warn("[ServerSelector] No healthy servers available");
    return null;
  }

  const best = healthy[0];
  console.info(
    `[ServerSelector] Selected ${best.url} (latency: ${best.latency}ms)`,
  );

  return { url: best.url, latency: best.latency };
}

/**
 * Get all server check results
 * @returns {Promise<Array>}
 */
export async function getAllServerStatuses() {
  return Promise.all(SERVER_LIST.map((url) => checkServerHealth(url)));
}

/**
 * Filter available (healthy) servers from server list
 */
export function filterAvailableServers(servers) {
  if (!servers || servers.length === 0) return [];
  return servers.filter((s) => s.status === "healthy" || s.healthy);
}

/**
 * Select server with lowest latency (fastest)
 */
export function weightedRandomSelect(servers) {
  if (!servers || servers.length === 0) return null;

  const sorted = [...servers].sort(
    (a, b) => (a.latency || 0) - (b.latency || 0),
  );
  return sorted[0];
}

export default {
  selectBestServer,
  getAllServerStatuses,
  filterAvailableServers,
  weightedRandomSelect,
};
