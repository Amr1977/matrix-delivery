/**
 * @module useServerRegistry
 * @description React hook for real-time server registry updates via WebSocket
 */

import { useState, useEffect, useRef } from "react";
import { createWsClient } from "./wsClient.js";

/**
 * React hook that provides real-time server registry data from WebSocket
 * @returns {Object} { servers: Array, updatedAt: number|null, connected: boolean }
 */
export function useServerRegistry() {
  const [servers, setServers] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);

  useEffect(() => {
    clientRef.current = createWsClient();

    const snapshot = clientRef.current.getLastSnapshot();
    if (snapshot && snapshot.servers) {
      setServers(snapshot.servers);
      setUpdatedAt(snapshot.updatedAt);
    }

    const callback = (data) => {
      setServers(data.servers || []);
      setUpdatedAt(data.updatedAt);
      setConnected(true);
    };

    clientRef.current.subscribe(callback);

    return () => {
      if (clientRef.current) {
        clientRef.current.unsubscribe(callback);
        clientRef.current.disconnect();
      }
    };
  }, []);

  return { servers, updatedAt, connected };
}
