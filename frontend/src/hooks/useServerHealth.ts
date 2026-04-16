/**
 * useServerHealth Hook
 * Manages server health, failover detection, and Socket.IO reconnection
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";

const HEALTH_ENDPOINT = "/api/health";
const HEALTH_CHECK_TIMEOUT = 5000;
const SERVER_LIST_REFRESH_INTERVAL = 60000;
const MAX_RETRY_ATTEMPTS = 3;

export interface ServerInfo {
  id: string;
  url: string;
  healthy: boolean;
  lastHeartbeat?: any;
}

export interface UseServerHealthReturn {
  servers: ServerInfo[];
  currentServer: ServerInfo | null;
  loading: boolean;
  error: string | null;
  isHealthy: boolean;
  refreshServers: () => Promise<void>;
  selectServer: (server: ServerInfo) => void;
  triggerFailover: () => void;
}

export const useServerHealth = (
  onFailover?: (newServer: ServerInfo, oldServer: ServerInfo | null) => void,
): UseServerHealthReturn => {
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [currentServer, setCurrentServer] = useState<ServerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState(true);
  const retryCountRef = useRef(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const fetchServers = useCallback(async (): Promise<ServerInfo[]> => {
    try {
      const serversCol = collection(db, "servers");
      const snapshot = await getDocs(serversCol);
      const serverList: ServerInfo[] = [];

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.url && data.healthy) {
          let url = data.url;
          if (!url.endsWith("/api")) {
            url = `${url}/api`;
          }
          serverList.push({
            id: doc.id,
            url,
            healthy: data.healthy !== false,
            lastHeartbeat: data.lastHeartbeat,
          });
        }
      });

      return serverList;
    } catch (err) {
      console.error("Failed to fetch servers:", err);
      throw err;
    }
  }, []);

  const checkServerHealth = useCallback(
    async (server: ServerInfo): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(
          () => controller.abort(),
          HEALTH_CHECK_TIMEOUT,
        );

        const response = await fetch(`${server.url}${HEALTH_ENDPOINT}`, {
          method: "GET",
          signal: controller.signal,
          credentials: "include",
        });

        clearTimeout(timeout);
        return response.ok;
      } catch {
        return false;
      }
    },
    [],
  );

  const findHealthyServer = useCallback(
    async (serverList: ServerInfo[]): Promise<ServerInfo | null> => {
      const healthChecks = await Promise.all(
        serverList.map(async (server) => ({
          server,
          healthy: await checkServerHealth(server),
        })),
      );

      return healthChecks.find((r) => r.healthy)?.server || null;
    },
    [checkServerHealth],
  );

  const refreshServers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const serverList = await fetchServers();
      setServers(serverList);

      if (serverList.length === 0) {
        setError("No servers available");
        setIsHealthy(false);
      } else if (!currentServer) {
        const healthy = await findHealthyServer(serverList);
        if (healthy) {
          setCurrentServer(healthy);
          setIsHealthy(true);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to refresh servers");
      setIsHealthy(false);
    } finally {
      setLoading(false);
    }
  }, [fetchServers, findHealthyServer, currentServer]);

  const selectServer = useCallback(
    (server: ServerInfo) => {
      const oldServer = currentServer;
      setCurrentServer(server);
      setIsHealthy(true);
      retryCountRef.current = 0;

      if (onFailover && server.id !== oldServer?.id) {
        onFailover(server, oldServer);
      }
    },
    [currentServer, onFailover],
  );

  const triggerFailover = useCallback(async () => {
    retryCountRef.current += 1;

    if (retryCountRef.current > MAX_RETRY_ATTEMPTS) {
      setError("Max failover attempts reached");
      setIsHealthy(false);
      return;
    }

    setIsHealthy(false);

    if (servers.length > 0) {
      const healthy = await findHealthyServer(servers);
      if (healthy) {
        selectServer(healthy);
      } else {
        await refreshServers();
        const freshHealthy = await findHealthyServer(servers);
        if (freshHealthy) {
          selectServer(freshHealthy);
        }
      }
    } else {
      await refreshServers();
    }
  }, [servers, findHealthyServer, selectServer, refreshServers]);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      try {
        await refreshServers();
      } catch {
        // Handled in refreshServers
      }
    };

    if (mounted) {
      setup();
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    const serversCol = collection(db, "servers");
    const unsubscribe = onSnapshot(serversCol, (snapshot: any) => {
      const serverList: ServerInfo[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.url && data.healthy) {
          let url = data.url;
          if (!url.endsWith("/api")) {
            url = `${url}/api`;
          }
          serverList.push({
            id: doc.id,
            url,
            healthy: data.healthy !== false,
            lastHeartbeat: data.lastHeartbeat,
          });
        }
      });
      setServers(serverList);
    });

    unsubscribeRef.current = unsubscribe;

    const interval = setInterval(refreshServers, SERVER_LIST_REFRESH_INTERVAL);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshServers]);

  return {
    servers,
    currentServer,
    loading,
    error,
    isHealthy,
    refreshServers,
    selectServer,
    triggerFailover,
  };
};

export default useServerHealth;
