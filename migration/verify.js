/**
 * @module verify
 * @description Post-migration verification script
 */

import Redis from "ioredis";

const requiredEnvVars = [
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "BACKEND_SERVER_IDS",
];

const missing = requiredEnvVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const config = {
  redisHost: process.env.REDIS_HOST,
  redisPort: parseInt(process.env.REDIS_PORT, 10),
  redisPassword: process.env.REDIS_PASSWORD,
  backendServerIds: process.env.BACKEND_SERVER_IDS.split(",").map((s) =>
    s.trim(),
  ),
  expectedHealthyCount: parseInt(process.env.EXPECTED_HEALTHY_COUNT, 10) || 1,
  firebaseCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
};

const results = [];

function logCheck(name, status, details = "") {
  const symbol = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : "○";
  console.log(`${symbol} ${name}: ${status} ${details}`);
  results.push({ name, status, details });
}

async function check1RedisPing() {
  try {
    const redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
    });
    const ping = await redis.ping();
    await redis.quit();

    if (ping === "PONG") {
      logCheck("CHECK 1", "PASS", "Redis responding to PING");
      return true;
    }
    logCheck("CHECK 1", "FAIL", `Unexpected response: ${ping}`);
    return false;
  } catch (err) {
    logCheck("CHECK 1", "FAIL", err.message);
    return false;
  }
}

async function check2ServerIndex() {
  try {
    const redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
    });

    const members = await redis.smembers("mdp:servers:index");
    await redis.quit();

    if (members.length < 1) {
      logCheck("CHECK 2", "FAIL", "mdp:servers:index is empty");
      return false;
    }

    logCheck("CHECK 2", "PASS", `${members.length} servers in index`);
    return true;
  } catch (err) {
    logCheck("CHECK 2", "FAIL", err.message);
    return false;
  }
}

async function check3RoutingSnapshot() {
  try {
    const redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
    });

    const routing = await redis.get("mdp:routing:active");
    await redis.quit();

    if (!routing) {
      logCheck("CHECK 3", "FAIL", "mdp:routing:active not found");
      return false;
    }

    const data = JSON.parse(routing);
    const age = Date.now() - data.updatedAt;

    if (age > 30000) {
      logCheck(
        "CHECK 3",
        "FAIL",
        `Routing snapshot is ${Math.round(age / 1000)}s old`,
      );
      return false;
    }

    if (data.servers.length < config.expectedHealthyCount) {
      logCheck(
        "CHECK 3",
        "FAIL",
        `Only ${data.servers.length} healthy servers (expected ${config.expectedHealthyCount})`,
      );
      return false;
    }

    logCheck(
      "CHECK 3",
      "PASS",
      `${data.servers.length} servers, ${Math.round(age / 1000)}s old`,
    );
    return true;
  } catch (err) {
    logCheck("CHECK 3", "FAIL", err.message);
    return false;
  }
}

async function check4BackendHealth() {
  try {
    const redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      password: config.redisPassword,
    });

    const routing = await redis.get("mdp:routing:active");
    await redis.quit();

    if (!routing) {
      logCheck("CHECK 5", "FAIL", "No routing data");
      return false;
    }

    const data = JSON.parse(routing);
    const servers = data.servers;

    for (const server of servers) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${server.url}/health`, {
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          logCheck(
            "CHECK 5",
            "FAIL",
            `${server.url} returned ${response.status}`,
          );
          return false;
        }
      } catch (err) {
        logCheck(
          "CHECK 5",
          "FAIL",
          `${server.url} health check failed: ${err.message}`,
        );
        return false;
      }
    }

    logCheck("CHECK 4", "PASS", "All backend health checks passed");
    return true;
  } catch (err) {
    logCheck("CHECK 4", "FAIL", err.message);
    return false;
  }
}

async function check5FirestoreEmpty() {
  if (!config.firebaseCredentials) {
    logCheck("CHECK 5", "SKIPPED", "GOOGLE_APPLICATION_CREDENTIALS not set");
    return null;
  }

  try {
    const admin = await import("firebase-admin");

    if (admin.apps.length === 0) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = config.firebaseCredentials;
      admin.initializeApp();
    }

    const db = admin.firestore();

    const serversSnap = await db.collection("servers").limit(1).get();
    const routingSnap = await db.collection("routing").limit(1).get();
    const idempotencySnap = await db.collection("idempotency").limit(1).get();

    if (
      serversSnap.size > 0 ||
      routingSnap.size > 0 ||
      idempotencySnap.size > 0
    ) {
      logCheck("CHECK 5", "FAIL", "Firestore still contains data");
      return false;
    }

    logCheck("CHECK 5", "PASS", "Firestore collections are empty");
    return true;
  } catch (err) {
    logCheck("CHECK 5", "FAIL", err.message);
    return false;
  }
}

async function runVerification() {
  console.log("\n=== V2 Migration Verification ===\n");

  const c1 = await check1RedisPing();
  const c2 = await check2ServerIndex();
  const c3 = await check3RoutingSnapshot();
  const c4 = await check4BackendHealth();
  const c5 = await check5FirestoreEmpty();

  console.log("\n=== Summary ===\n");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIPPED").length;

  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log(`SKIPPED: ${skipped}`);

  const check5Failed = c5 === false;

  if (failed > 0 || check5Failed) {
    console.log("\n❌ Verification FAILED");
    process.exit(1);
  }

  console.log("\n✅ Verification PASSED");
  process.exit(0);
}

runVerification();
