const admin = require("../config/firebase-admin");
const logger = require("../config/logger");

const FIRESTORE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || "matrix-delivery";
const SERVERS_COLLECTION = "servers";
const HEALTH_CHECK_INTERVAL = 60000;
const HEALTH_CHECK_TIMEOUT = 10000;

let db = null;
let myServerId = null;
let myServerUrl = null;
let healthCheckInterval = null;

function getFirestoreDb() {
  if (!db) {
    // Check if Firebase is properly initialized
    if (!admin.apps.length) {
      throw new Error("Firebase not initialized - credentials missing");
    }
    db = admin.firestore();
  }
  return db;
}

function generateServerId() {
  return `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

async function registerServer(serverUrl) {
  const firestore = getFirestoreDb();
  myServerUrl = serverUrl;
  myServerId =
    process.env.FIRESTORE_SERVER_ID ||
    process.env.SERVER_ID ||
    generateServerId();

  try {
    // First, clean up any existing entries with same URL
    const existingSnapshot = await firestore
      .collection(SERVERS_COLLECTION)
      .where("url", "==", serverUrl)
      .get();

    for (const doc of existingSnapshot.docs) {
      if (doc.id !== myServerId) {
        await doc.ref.delete();
        logger.info(`Removed duplicate server entry: ${doc.id}`);
      }
    }

    // Check if already registered with this serverId
    const existingDoc = await firestore
      .collection(SERVERS_COLLECTION)
      .doc(myServerId)
      .get();

    if (existingDoc.exists) {
      // Already registered, just update heartbeat
      await existingDoc.ref.update({
        lastHeartbeat: admin.firestore.Timestamp.now(),
        healthy: true,
      });
      logger.info(
        `Server already registered: ${myServerId} at ${serverUrl}, heartbeat updated`,
      );
    } else {
      // Register new server
      await firestore.collection(SERVERS_COLLECTION).doc(myServerId).set({
        serverId: myServerId,
        url: serverUrl,
        registeredAt: admin.firestore.Timestamp.now(),
        lastHeartbeat: admin.firestore.Timestamp.now(),
        healthy: true,
      });
      logger.info(`Server registered: ${myServerId} at ${serverUrl}`);
    }

    return myServerId;
  } catch (error) {
    logger.error("Server registration failed:", error.message);
    throw error;
  }
}

async function removeServer(serverId) {
  try {
    const firestore = getFirestoreDb();
    await firestore.collection(SERVERS_COLLECTION).doc(serverId).delete();
    logger.info(`Removed dead server: ${serverId}`);
  } catch (error) {
    logger.error("Failed to remove server:", error.message);
  }
}

async function healthCheckAndClean() {
  const firestore = getFirestoreDb();
  const snapshot = await firestore.collection(SERVERS_COLLECTION).get();
  const servers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  logger.info(`Health check: checking ${servers.length} servers`);

  for (const server of servers) {
    if (server.id === myServerId) continue;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT,
      );

      const response = await fetch(`${server.url}/api/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        await removeServer(server.id);
      }
    } catch (error) {
      logger.warn(`Server ${server.id} failed health check: ${error.message}`);
      await removeServer(server.id);
    }
  }
}

async function warmupDatabase(pool) {
  try {
    await pool.query("SELECT 1");
    const result = await pool.query("SELECT COUNT(*) as count FROM users");
    logger.info(`Database warmup: ${result.rows[0].count} users`);
  } catch (error) {
    logger.error("Database warmup failed:", error.message);
  }
}

async function startServerRegistry(pool, serverUrl) {
  await registerServer(serverUrl);

  await warmupDatabase(pool);

  // Only do periodic health checks to clean up dead servers - no heartbeat updates
  healthCheckInterval = setInterval(async () => {
    try {
      await healthCheckAndClean();
    } catch (error) {
      logger.error("Health check cycle failed:", error.message);
    }
  }, HEALTH_CHECK_INTERVAL);

  logger.info("Server registry started");
}

async function stopServerRegistry() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }

  if (myServerId) {
    try {
      const firestore = getFirestoreDb();
      await firestore.collection(SERVERS_COLLECTION).doc(myServerId).delete();
      logger.info(`Server unregistered: ${myServerId}`);
    } catch (error) {
      logger.error("Failed to unregister server:", error.message);
    }
  }
}

async function getActiveServers() {
  const firestore = getFirestoreDb();
  const snapshot = await firestore.collection(SERVERS_COLLECTION).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  startServerRegistry,
  stopServerRegistry,
  getActiveServers,
  registerServer,
};
