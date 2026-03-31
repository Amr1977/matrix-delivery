/**
 * @fileoverview Example Express server demonstrating failover integration.
 * This is a minimal example - integrate the concepts into your main server.js as needed.
 * @example
 */

import "dotenv/config";
import express from "express";
import cors from "cors";
import { createRequestTracker } from "./loadCalculator.js";
import { startRegistry } from "./serverRegistry.js";

const app = express();
const PORT = process.env.PORT || 5001;

const { middleware: requestTracker, getCurrentLoad } = createRequestTracker();
app.use(requestTracker);

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter((o) => o);

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes("*")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    load: getCurrentLoad(),
    ts: Date.now(),
  });
});

app.get("/api/example", async (req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 200));
  res.json({
    message: "ok",
    serverId: process.env.FIRESTORE_SERVER_ID,
  });
});

async function main() {
  const registry = await startRegistry({ getCurrentLoad });

  console.log(`[Server] Starting on port ${PORT}`);

  const server = app.listen(PORT, () => {
    console.log(`[Server] Running at http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    console.log("[Server] Shutting down...");
    await registry.stop();
    server.close(() => {
      console.log("[Server] Closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("[Server] Failed to start:", err);
  process.exit(1);
});
