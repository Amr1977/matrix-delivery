/**
 * @module serverRegistry
 * @description Server registration and heartbeat using Firestore
 */

const admin = require("./config/firebase-admin");
const db = admin.firestore();

let getMetrics = null;
let heartbeatInterval = null;
const collectionName = "servers";

function getServerId() {
  return (
    process.env.FIRESTORE_SERVER_ID ||
    "server-" + (process.env.NODE_APP_INSTANCE || "1")
  );
}

function getServerUrl() {
  return process.env.SERVER_URL;
}

async function registerServer() {
  const serverId = getServerId();
  const serverRef = db.collection(collectionName).doc(serverId);

  const data = {
    url: getServerUrl(),
    status: "healthy",
    currentLoad: 0,
    maxCapacity: parseInt(process.env.SERVER_MAX_CAPACITY) || 100,
    priority: parseInt(process.env.SERVER_PRIORITY) || 1,
    avgLatencyMs: 1000,
    errorRate: 0,
    warmup: true,
    lastHeartbeat: Date.now(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await serverRef.set(data, { merge: true });
    console.info(
      `[Registry] Server registered: ${serverId} at ${getServerUrl()}`,
    );
    return data;
  } catch (error) {
    console.error(`[Registry] Failed to register:`, error.message);
    throw error;
  }
}

async function updateHeartbeat() {
  const serverId = getServerId();
  const metrics = getMetrics
    ? getMetrics()
    : { currentLoad: 0, avgLatencyMs: 1000, errorRate: 0, warmup: true };
  const serverRef = db.collection(collectionName).doc(serverId);

  try {
    await serverRef.update({
      status: "healthy",
      currentLoad: metrics.currentLoad,
      avgLatencyMs: Math.round(metrics.avgLatencyMs),
      errorRate: Math.round(metrics.errorRate * 100) / 100,
      warmup: metrics.warmup,
      lastHeartbeat: Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.info(
      `[Registry] Heartbeat: ${serverId}, load: ${metrics.currentLoad}`,
    );
  } catch (error) {
    console.warn(`[Registry] Heartbeat failed for ${serverId}:`, error.message);
  }
}

async function getAllServers() {
  try {
    const snapshot = await db.collection(collectionName).get();
    const servers = [];
    snapshot.forEach((doc) => {
      servers.push({ id: doc.id, ...doc.data() });
    });
    return servers;
  } catch (error) {
    console.error("[Registry] Failed to get servers:", error.message);
    return [];
  }
}

async function healthCheckServer(serverUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${serverUrl}/api/health`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

async function runAggregatorCycle() {
  console.info("[Aggregator] Running health check cycle...");

  const servers = await getAllServers();
  const now = Date.now();

  for (const server of servers) {
    const age = now - (server.lastHeartbeat || 0);
    const isStale = age > 120000; // 2 minutes

    if (server.status === "healthy" && !isStale) {
      const isReachable = await healthCheckServer(server.url);
      if (!isReachable) {
        console.warn(
          `[Aggregator] ${server.url} not responding, marking unhealthy`,
        );
        await db.collection(collectionName).doc(server.id).update({
          status: "unhealthy",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  }
}

function startRegistry({ getMetrics: getMetricsFn }) {
  getMetrics = getMetricsFn;

  return registerServer()
    .then(() => {
      // Update heartbeat every 30 seconds
      updateHeartbeat();
      heartbeatInterval = setInterval(updateHeartbeat, 30000);

      // Run aggregator health check every 60 seconds
      setInterval(runAggregatorCycle, 60000);

      console.info(`[Registry] Started for ${getServerId()}`);

      process.on("SIGTERM", () => {
        console.info("[Registry] Shutting down...");
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        db.collection(collectionName)
          .doc(getServerId())
          .update({ status: "unhealthy" });
        process.exit(0);
      });

      return {
        stop: () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          return db
            .collection(collectionName)
            .doc(getServerId())
            .update({ status: "unhealthy" });
        },
      };
    })
    .catch((error) => {
      console.error("[Registry] Failed to start:", error.message);
      process.exit(1);
    });
}

module.exports = { startRegistry, getAllServers, healthCheckServer };
