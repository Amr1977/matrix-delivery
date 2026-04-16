/**
 * API Client with Failover Support
 * Provides automatic server failover with sticky session until failure
 */

import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import { ApiClient } from "./client";
import type { ApiError } from "./types";

const HEALTH_ENDPOINT = "/api/health";
const HEALTH_CHECK_TIMEOUT = 5000;
const REQUEST_TIMEOUT_MS = 15000;

let cachedServerList: string[] | null = null;
let serverListPromise: Promise<string[]> | null = null;
let currentServerUrl: string | null = null;

export interface FailoverConfig {
  idempotencyKey: string;
  maxRetries?: number;
  timeout?: number;
}

async function getServerListFromFirestore(): Promise<string[]> {
  if (cachedServerList) {
    return cachedServerList;
  }

  if (serverListPromise) {
    return serverListPromise;
  }

  serverListPromise = (async () => {
    try {
      const serversCol = collection(db, "servers");
      const snapshot = await getDocs(serversCol);
      const servers: string[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.url && data.healthy !== false) {
          let url = data.url;
          if (!url.endsWith("/api")) {
            url = `${url}/api`;
          }
          servers.push(url);
        }
      });

      cachedServerList = [...new Set(servers.filter(Boolean))];
      return cachedServerList!;
    } catch (error) {
      console.warn("[Failover] Firestore error, using fallback:", error);
      cachedServerList = [
        "https://api.matrix-delivery.com/api",
        "https://matrix-delivery-api-gc.mywire.org/api",
      ];
      return cachedServerList;
    } finally {
      serverListPromise = null;
    }
  })();

  return serverListPromise;
}

async function checkServerHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${url}${HEALTH_ENDPOINT}`, {
      method: "GET",
      signal: controller.signal,
      credentials: "include",
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function findHealthyServer(urls: string[]): Promise<string | null> {
  if (urls.length === 0) return null;

  const results = await Promise.all(
    urls.map(async (url) => ({
      url,
      healthy: await checkServerHealth(url),
    })),
  );

  return results.find((r) => r.healthy)?.url || null;
}

export function clearServerCache(): void {
  cachedServerList = null;
  currentServerUrl = null;
}

export function getCurrentServerUrl(): string | null {
  return currentServerUrl;
}

export async function fetchWithFailover<T>(
  endpoint: string,
  options: RequestInit & FailoverConfig,
): Promise<T> {
  const {
    idempotencyKey,
    maxRetries = 1,
    timeout = REQUEST_TIMEOUT_MS,
    ...fetchOptions
  } = options;

  if (!idempotencyKey) {
    throw new Error("idempotencyKey is required for failover requests");
  }

  let serverUrl = currentServerUrl;
  let retries = 0;

  const attemptRequest = async (): Promise<T> => {
    if (!serverUrl) {
      const serverList = await getServerListFromFirestore();
      const healthy = await findHealthyServer(serverList);

      if (!healthy) {
        throw { error: "NO_HEALTHY_SERVERS", statusCode: 503 } as ApiError;
      }

      serverUrl = healthy;
      currentServerUrl = serverUrl;
      console.info(`[Failover] Selected server: ${serverUrl}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        ...fetchOptions,
        signal: controller.signal,
        credentials: "include",
        headers: {
          ...fetchOptions.headers,
          "Idempotency-Key": idempotencyKey,
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return data as T;
      }

      if (response.status >= 500) {
        console.warn(
          `[Failover] Server ${serverUrl} returned ${response.status}`,
        );
        currentServerUrl = null;
        serverUrl = null;

        if (retries < maxRetries) {
          retries++;
          return attemptRequest();
        }

        const errorData = await response.json().catch(() => ({}));
        throw { ...errorData, statusCode: response.status } as ApiError;
      }

      const errorData = await response.json().catch(() => ({}));
      throw { ...errorData, statusCode: response.status } as ApiError;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError" || error.statusCode === 0) {
        console.warn(`[Failover] Server ${serverUrl} failed: ${error.message}`);
        currentServerUrl = null;
        serverUrl = null;

        if (retries < maxRetries) {
          retries++;
          return attemptRequest();
        }
      }

      throw error;
    }
  };

  return attemptRequest();
}

export async function get<T>(
  endpoint: string,
  config?: FailoverConfig,
): Promise<T> {
  return ApiClient.get<T>(endpoint);
}

export async function post<T>(
  endpoint: string,
  data?: any,
  config?: FailoverConfig,
): Promise<T> {
  if (config?.idempotencyKey) {
    return fetchWithFailover<T>(endpoint, {
      ...config,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  return ApiClient.post<T>(endpoint, data);
}

export async function put<T>(
  endpoint: string,
  data?: any,
  config?: FailoverConfig,
): Promise<T> {
  return ApiClient.put<T>(endpoint, data);
}

export async function del<T>(
  endpoint: string,
  config?: FailoverConfig,
): Promise<T> {
  return ApiClient.delete<T>(endpoint);
}

export default {
  fetchWithFailover,
  clearServerCache,
  getCurrentServerUrl,
  get: ApiClient.get,
  post,
  put,
  del,
};
