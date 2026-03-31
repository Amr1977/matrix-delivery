/**
 * @module serverRegistry
 * @description Server registration and health checking using Firestore
 * - Self-registers on startup
 * - Every 60s: checks other servers, removes non-responding ones
 * - Removes self on shutdown
 */

const admin = require("./config/firebase-admin");
const db = admin.firestore();

let getMetrics = null;
let aggregatorInterval = null;
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

/**
 * Register this server in Firestore
 */
async function registerServer() {
  const serverId = getServerId();
  const serverRef = db.collection(collectionName).doc(serverId);

  const data = {
    url: getServerUrl(),
    registeredAt: admin.firestore.FieldValue.serverTimestamp(),
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

/**
 * Get all servers from Firestore
 */
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

/**
 * Health check a single server
 */
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

/**
 * Aggregator cycle: check other servers, remove non-responding ones
 */
async function runAggregatorCycle() {
  console.info("[Aggregator] Running health check cycle...");

  const servers = await getAllServers();
  const now = Date.now();
  const selfUrl = getServerUrl();

  for (const server of servers) {
    // Skip self
    if (server.url === selfUrl) {
      continue;
    }

    const age = now - (server.updatedAt?.toDate?.() || 0);
    const isStale = age > 120000; // 2 minutes

    if (!isStale) {
      const isReachable = await healthCheckServer(server.url);
      if (!isReachable) {
        console.warn(
          `[Aggregator] ${server.url} not responding, removing from Firestore`,
        );
        await db.collection(collectionName).doc(server.id).delete();
      }
    } else {
      console.warn(
        `[Aggregator] ${server.url} stale (last update: ${age}ms), removing`,
      );
      await db.collection(collectionName).doc(server.id).delete();
    }
  }
}

/**
 * Start the server registry
 */
function startRegistry({ getMetrics: getMetricsFn }) {
  getMetrics = getMetricsFn;

  return registerServer()
    .then(() => {
      // Run aggregator health check every 60 seconds
      aggregatorInterval = setInterval(runAggregatorCycle, 60000);

      console.info(`[Registry] Started for ${getServerId()}`);

      process.on("SIGTERM", () => {
        console.info("[Registry] Shutting down...");
        if (aggregatorInterval) clearInterval(aggregatorInterval);
        // Remove self from Firestore
        db.collection(collectionName)
          .doc(getServerId())
          .delete()
          .then(() => {
            console.info("[Registry] Self removed from Firestore");
            process.exit(0);
          })
          .catch((err) => {
            console.error("[Registry] Failed to remove self:", err);
            process.exit(1);
          });
      });

      return {
        stop: () => {
          if (aggregatorInterval) clearInterval(aggregatorInterval);
          return db.collection(collectionName).doc(getServerId()).delete();
        },
      };
    })
    .catch((error) => {
      console.error("[Registry] Failed to start:", error.message);
      process.exit(1);
    });
}

module.exports = { startRegistry, getAllServers, healthCheckServer };
