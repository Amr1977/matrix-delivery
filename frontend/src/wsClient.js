/**
 * @module wsClient
 * @description WebSocket client for receiving server snapshots from aggregator
 */

let socket = null;
let reconnectTimer = null;
let lastSnapshot = null;
const listeners = new Set();

/**
 * Connects to the WebSocket aggregator
 * @private
 */
function connect() {
  const wsUrl =
    import.meta.env.REACT_APP_AGGREGATOR_WS_URL || "ws://localhost:4001";

  socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.info("[WsClient] connected to", wsUrl);
  };

  socket.onmessage = (event) => {
    try {
      lastSnapshot = JSON.parse(event.data);
      for (const callback of listeners) {
        callback(lastSnapshot);
      }
    } catch (err) {
      console.error("[WsClient] Failed to parse message:", err.message);
    }
  };

  socket.onclose = () => {
    console.warn("[WsClient] Disconnected, reconnecting in 3s...");
    reconnectTimer = setTimeout(connect, 3000);
  };

  socket.onerror = (err) => {
    console.warn("[WsClient] Error:", err.message);
  };
}

/**
 * Creates and returns the WebSocket client interface
 * @returns {{ subscribe: Function, unsubscribe: Function, getLastSnapshot: Function, disconnect: Function }}
 */
function createWsClient() {
  connect();

  return {
    /**
     * Subscribe to server snapshots
     * @param {Function} callback - Function to call with snapshot data
     */
    subscribe(callback) {
      listeners.add(callback);
      if (lastSnapshot !== null) {
        callback(lastSnapshot);
      }
    },

    /**
     * Unsubscribe from server snapshots
     * @param {Function} callback - Function to remove
     */
    unsubscribe(callback) {
      listeners.delete(callback);
    },

    /**
     * Get the last known snapshot
     * @returns {Object|null} Last snapshot or null
     */
    getLastSnapshot() {
      return lastSnapshot;
    },

    /**
     * Disconnect the WebSocket
     */
    disconnect() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    },
  };
}

export { createWsClient };
export default { createWsClient };
