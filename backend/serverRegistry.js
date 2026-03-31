/**
 * @fileoverview Server registration and heartbeat management for the Matrix Delivery Platform.
 * Uses Firebase Admin SDK to register servers in Firestore.
 * @module serverRegistry
 */

const admin = require("firebase-admin");
const os = require("os");

let heartbeatInterval = null;
let firestoreDb = null;
let serverConfig = null;

/**
 * Validates required environment variables for server registry.
 * @throws {Error} If any required environment variable is missing
 */
function validateConfig() {
  console.info("[Registry] Validating configuration...");

  const required = [
    "FIRESTORE_SERVER_ID",
    "SERVER_URL",
    "SERVER_MAX_CAPACITY",
    "SERVER_PRIORITY",
  ];

  const missing = required.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  const maxCapacity = parseInt(process.env.SERVER_MAX_CAPACITY, 10);
  const priority = parseInt(process.env.SERVER_PRIORITY, 10);

  if (isNaN(maxCapacity) || maxCapacity <= 0) {
    throw new Error("SERVER_MAX_CAPACITY must be a positive integer");
  }

  if (isNaN(priority)) {
    throw new Error("SERVER_PRIORITY must be an integer");
  }

  serverConfig = {
    serverId: process.env.FIRESTORE_SERVER_ID,
    url: process.env.SERVER_URL.replace(/\/$/, ""),
    maxCapacity,
    priority,
  };

  console.info(
    `[Registry] Config validated: serverId=${serverConfig.serverId}, url=${serverConfig.url}, maxCapacity=${maxCapacity}, priority=${priority}`,
  );
}

/**
 * Initializes Firebase Admin SDK using Application Default Credentials (ADC).
 * GOOGLE_APPLICATION_CREDENTIALS env var must point to service account JSON file.
 * @returns {admin.firestore.Firestore} Firestore database instance
 * @throws {Error} If Firebase is already initialized or credentials are invalid
 */
function initFirebase() {
  console.info("[Registry] Initializing Firebase Admin SDK...");

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.info("[Registry] Firebase Admin SDK initialized");
  } else {
    console.info("[Registry] Firebase Admin SDK already initialized");
  }

  return admin.firestore();
}

/**
 * Registers this server instance in Firestore.
 * Uses set() with merge: true to preserve data on restart.
 * @private
 */
async function registerServer() {
  const serverRef = firestoreDb
    .collection("servers")
    .doc(serverConfig.serverId);

  await serverRef.set(
    {
      url: serverConfig.url,
      status: "healthy",
      currentLoad: 0,
      maxCapacity: serverConfig.maxCapacity,
      priority: serverConfig.priority,
      lastHeartbeat: Date.now(),
    },
    { merge: true },
  );

  console.info(
    `[Registry] Server registered: ${serverConfig.serverId} at ${serverConfig.url}`,
  );
}

/**
 * Updates the server heartbeat in Firestore with current load.
 * @param {Object} params - Parameters object
 * @param {Function} params.getCurrentLoad - Function to get current request count
 * @private
 */
async function updateHeartbeat({ getCurrentLoad }) {
  try {
    const serverRef = firestoreDb
      .collection("servers")
      .doc(serverConfig.serverId);

    await serverRef.update({
      status: "healthy",
      currentLoad: getCurrentLoad(),
      lastHeartbeat: Date.now(),
    });

    console.info(
      `[Registry] Heartbeat updated: ${serverConfig.serverId}, load: ${getCurrentLoad()}`,
    );
  } catch (error) {
    console.error(
      `[Registry] Heartbeat update failed for ${serverConfig.serverId}:`,
      error.message,
    );
  }
}

/**
 * Marks this server as unhealthy during graceful shutdown.
 * @private
 */
async function gracefulShutdown() {
  try {
    const serverRef = firestoreDb
      .collection("servers")
      .doc(serverConfig.serverId);

    await serverRef.update({
      status: "unhealthy",
    });

    console.info(
      `[Registry] Server marked unhealthy: ${serverConfig.serverId}`,
    );
  } catch (error) {
    console.error(`[Registry] Failed to mark server unhealthy:`, error.message);
  }
}

/**
 * Starts the server registry with heartbeat mechanism.
 * @param {Object} params - Parameters object
 * @param {Function} params.getCurrentLoad - Function to get current request count
 * @returns {Object} { stop: Function } Function to stop the registry
 * @throws {Error} If required environment variables are missing or Firebase init fails
 */
async function startRegistry({ getCurrentLoad }) {
  validateConfig();
  firestoreDb = initFirebase();

  await registerServer();

  heartbeatInterval = setInterval(() => {
    updateHeartbeat({ getCurrentLoad });
  }, 5000);

  const shutdownHandler = async (signal) => {
    console.info(
      `[Registry] Received ${signal}, starting graceful shutdown...`,
    );
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    await gracefulShutdown();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdownHandler("SIGTERM"));
  process.on("SIGINT", () => shutdownHandler("SIGINT"));

  console.info(`[Registry] Started for ${serverConfig.serverId}`);

  return {
    stop: async () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      await gracefulShutdown();
    },
  };
}

module.exports = { startRegistry };
