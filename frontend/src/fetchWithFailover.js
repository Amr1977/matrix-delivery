/**
 * @module fetchWithFailover
 * @description Failover with Firestore server discovery and sticky server selection
 * MODIFIED FOR SINGLE SERVER: Uses REACT_APP_API_URL or localhost:5000/api directly
 */

const REQUEST_TIMEOUT_MS = 10000;

export async function fetchWithFailover(endpoint, options) {
  if (!options.idempotencyKey) {
    throw new TypeError("idempotencyKey is required");
  }

  // Get API URL from environment variable or use localhost fallback
  const API_URL = (() => {
    // Try to get from environment variable (if available in runtime)
    if (typeof process !== "undefined" && process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }

    // Try to get from window object (for web apps)
    if (typeof window !== "undefined" && window.REACT_APP_API_URL) {
      return window.REACT_APP_API_URL;
    }

    // Fallback to localhost for development
    return "http://localhost:5000/api";
  })();

  // Ensure URL doesn't have trailing /api duplication
  const BASE_URL = API_URL.endsWith("/api") ? API_URL : `${API_URL}/api`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
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
      console.info(`[Failover] success: ${BASE_URL}${endpoint}`);
      return response;
    }

    // Server responded with 5xx error
    if (response.status >= 500) {
      console.warn(`[Failover] ${BASE_URL} returned ${response.status}`);
      throw new Error(`Server error: ${response.status}`);
    }

    // 4xx errors - don't retry, just return
    console.warn(`[Failover] ${BASE_URL} returned ${response.status}`);
    return response;
  } catch (error) {
    clearTimeout(timeout);

    // Network error or timeout
    console.warn(`[Failover] ${BASE_URL} failed with error: ${error.message}`);
    throw error;
  }
}

export default { fetchWithFailover };
