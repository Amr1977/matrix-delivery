/**
 * @module fetchWithFailover
 * @description Simple failover: parallel health check, pick first responder
 */

const SERVER_LIST = [
  "https://api.matrix-delivery.com",
  "https://matrix-delivery-api-gc.mywire.org",
];

const HEALTH_ENDPOINT = "/api/health";
const HEALTH_CHECK_TIMEOUT = 5000;

/**
 * Fire parallel health checks and return first healthy server
 * @returns {Promise<{url: string}|null>}
 */
async function findHealthyServer() {
  const results = await Promise.all(
    SERVER_LIST.map(async (url) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          HEALTH_CHECK_TIMEOUT,
        );

        const response = await fetch(`${url}${HEALTH_ENDPOINT}`, {
          method: "GET",
          signal: controller.signal,
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
 * Fetch with failover - health check on demand, pick first responder
 */
export async function fetchWithFailover(endpoint, options) {
  if (!options.idempotencyKey) {
    throw new TypeError("idempotencyKey is required");
  }

  // Find first healthy server
  const server = await findHealthyServer();

  if (!server) {
    throw new Error("NO_HEALTHY_SERVERS");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${server.url}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        "Idempotency-Key": options.idempotencyKey,
        "Content-Type": "application/json",
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      console.info(`[Failover] success: ${server.url}${endpoint}`);
      return response;
    }

    // Try next server on failure
    console.warn(`[Failover] ${server.url} failed, trying others`);
    const otherServers = SERVER_LIST.filter((s) => s !== server.url);

    for (const url of otherServers) {
      try {
        const altController = new AbortController();
        const altTimeout = setTimeout(() => altController.abort(), 10000);

        const altResponse = await fetch(`${url}${endpoint}`, {
          ...options,
          signal: altController.signal,
          headers: {
            ...options.headers,
            "Idempotency-Key": options.idempotencyKey,
            "Content-Type": "application/json",
          },
        });

        clearTimeout(altTimeout);

        if (altResponse.ok) {
          console.info(`[Failover] success on fallback: ${url}${endpoint}`);
          return altResponse;
        }
      } catch (e) {
        console.warn(`[Failover] fallback ${url} failed`);
      }
    }

    throw new Error("ALL_SERVERS_FAILED");
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export default { fetchWithFailover };
