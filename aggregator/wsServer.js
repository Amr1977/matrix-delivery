/**
 * @module wsServer
 * @description WebSocket server for broadcasting server snapshots to clients
 */

import { WebSocketServer } from "ws";
import { config } from "./config.js";

let wss = null;
let lastSnapshot = null;
const clients = new Set();

/**
 * Starts the WebSocket server
 * @returns {WebSocketServer} The WebSocket server instance
 */
function startWsServer() {
  wss = new WebSocketServer({ port: config.WS_PORT });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.info(`[WsServer] Client connected, total: ${clients.size}`);

    if (lastSnapshot !== null) {
      try {
        ws.send(JSON.stringify(lastSnapshot));
      } catch (err) {
        console.warn(
          "[WsServer] Failed to send snapshot to new client:",
          err.message,
        );
      }
    } else {
      try {
        ws.send(JSON.stringify({ servers: [], updatedAt: null }));
      } catch (err) {
        console.warn("[WsServer] Failed to send empty snapshot:", err.message);
      }
    }

    ws.on("close", () => {
      clients.delete(ws);
      console.info(`[WsServer] Client disconnected, total: ${clients.size}`);
    });

    ws.on("error", (err) => {
      console.warn("[WsServer] Client error:", err.message);
      clients.delete(ws);
    });
  });

  wss.on("error", (err) => {
    console.error("[WsServer] Server error:", err.message);
  });

  console.info(`[WsServer] Started on port ${config.WS_PORT}`);

  return wss;
}

/**
 * Broadcasts server snapshot to all connected clients
 * @param {Array} servers - Array of server objects
 */
function broadcast(servers) {
  lastSnapshot = { servers, updatedAt: Date.now() };

  let sentCount = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(lastSnapshot));
        sentCount++;
      } catch (err) {
        console.warn("[WsServer] Failed to broadcast to client:", err.message);
      }
    }
  }

  console.info(`[WsServer] broadcast to ${sentCount} clients`);
}

/**
 * Gets the current number of connected clients
 * @returns {number} Number of connected clients
 */
function getClientCount() {
  return clients.size;
}

export { startWsServer, broadcast, getClientCount };
export default { startWsServer, broadcast, getClientCount };
