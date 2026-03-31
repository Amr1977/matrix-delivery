/**
 * @module wsServer
 * @description WebSocket server for broadcasting server snapshots to clients
 */

const { WebSocketServer } = require("ws");
const { config } = require("./config.js");

let wss = null;
let lastSnapshot = null;
const clients = new Set();

function startWsServer(port) {
  port = port || 4001;
  wss = new WebSocketServer({ port });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.info(`[WsServer] Client connected, total: ${clients.size}`);

    if (lastSnapshot !== null) {
      try {
        ws.send(JSON.stringify(lastSnapshot));
      } catch (err) {
        console.warn("[WsServer] Failed to send snapshot:", err.message);
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

  console.info(`[WsServer] Started on port ${port}`);
  return wss;
}

function broadcast(servers) {
  lastSnapshot = { servers, updatedAt: Date.now() };

  let sentCount = 0;
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(lastSnapshot));
        sentCount++;
      } catch (err) {
        console.warn("[WsServer] Failed to broadcast:", err.message);
      }
    }
  }
  console.info(`[WsServer] broadcast to ${sentCount} clients`);
}

function getClientCount() {
  return clients.size;
}

module.exports = { startWsServer, broadcast, getClientCount };
