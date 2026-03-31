/**
 * @module migrate
 * @description Hard cutover migration script from V1 (Firestore) to V2 (Redis)
 */

import { readFileSync, existsSync, writeFileSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import admin from "firebase-admin";
import Redis from "ioredis";

const execAsync = promisify(exec);

const requiredEnvVars = [
  "GOOGLE_APPLICATION_CREDENTIALS",
  "FIREBASE_PROJECT_ID",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "BACKEND_SERVER_IDS",
  "V2_BACKEND_ENV_PATH",
  "V2_AGGREGATOR_ENV_PATH",
  "WS_PORT",
  "MIGRATION_LOG_PATH",
  "AGGREGATOR_DIR",
  "BACKEND_DIR",
];

const missing = requiredEnvVars.filter((v) => !process.env[v]);

if (missing.length > 0) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const config = {
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  projectId: process.env.FIREBASE_PROJECT_ID,
  redisHost: process.env.REDIS_HOST,
  redisPort: parseInt(process.env.REDIS_PORT, 10),
  redisPassword: process.env.REDIS_PASSWORD,
  backendServerIds: process.env.BACKEND_SERVER_IDS.split(",").map((s) =>
    s.trim(),
  ),
  v2BackendEnvPath: process.env.V2_BACKEND_ENV_PATH,
  v2AggregatorEnvPath: process.env.V2_AGGREGATOR_ENV_PATH,
  wsPort: parseInt(process.env.WS_PORT, 10),
  migrationLogPath: process.env.MIGRATION_LOG_PATH,
  aggregatorDir: process.env.AGGREGATOR_DIR,
  backendDir: process.env.BACKEND_DIR,
};

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}`;
  console.log(line);
  writeFileSync(config.migrationLogPath, line + "\n", { flag: "a" });
}

function logSnapshot(message) {
  writeFileSync(config.migrationLogPath + ".snapshot.json", message);
}

async function step1PreflightChecks() {
  log("STEP 1: Running pre-flight checks...");

  if (!existsSync(config.credentialsPath)) {
    throw new Error(
      `GOOGLE_APPLICATION_CREDENTIALS file not found: ${config.credentialsPath}`,
    );
  }

  if (!existsSync(config.v2BackendEnvPath)) {
    throw new Error(`V2 backend env not found: ${config.v2BackendEnvPath}`);
  }

  if (!existsSync(config.v2AggregatorEnvPath)) {
    throw new Error(
      `V2 aggregator env not found: ${config.v2AggregatorEnvPath}`,
    );
  }

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
  });

  const ping = await redis.ping();
  if (ping !== "PONG") {
    throw new Error("Redis ping failed");
  }

  const routingKey = await redis.get("mdp:routing:active");
  if (routingKey) {
    throw new Error(
      "Migration appears already run - mdp:routing:active exists",
    );
  }

  await redis.quit();

  process.env.GOOGLE_APPLICATION_CREDENTIALS = config.credentialsPath;
  admin.initializeApp();
  const db = admin.firestore();
  const snapshot = await db.collection("servers").limit(1).get();

  try {
    await execAsync("pm2 --version");
  } catch {
    throw new Error("PM2 not installed");
  }

  log("Pre-flight checks passed.");
}

async function step2SnapshotV1() {
  log("STEP 2: Snapshotting V1 Firestore data...");

  const db = admin.firestore();
  const snapshot = await db.collection("servers").get();

  const v1Snapshot = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  logSnapshot(JSON.stringify(v1Snapshot, null, 2));
  log(
    `Snapshotted ${v1Snapshot.length} servers: [${v1Snapshot.map((s) => s.id).join(", ")}]`,
  );

  return v1Snapshot;
}

async function step3StopV1Backends() {
  log("STEP 3: Stopping V1 backend processes...");

  try {
    await execAsync("pm2 stop mdp-backend");
  } catch {
    // May not be running
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));
  log("V1 backends stopped. DOWNTIME BEGINS.");
}

async function step4SeedRedis(v1Snapshot) {
  log("STEP 4: Seeding Redis from V1 snapshot...");

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
  });

  for (const server of v1Snapshot) {
    await redis.hset(`mdp:server:${server.id}`, {
      url: server.url || "",
      status: "unhealthy",
      currentLoad: 0,
      maxCapacity: server.maxCapacity || 100,
      priority: server.priority || 1,
      avgLatencyMs: 1000,
      errorRate: 0,
      warmup: "true",
      lastHeartbeat: 0,
    });

    await redis.sadd("mdp:servers:index", server.id);
  }

  await redis.quit();
  log(`Seeded ${v1Snapshot.length} servers into Redis.`);
}

async function step5StartAggregator() {
  log("STEP 5: Starting aggregator...");

  await execAsync(
    `pm2 start ${config.aggregatorDir}/aggregator.js --name mdp-aggregator`,
  );

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
  });

  let found = false;
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const routing = await redis.get("mdp:routing:active");
    if (routing) {
      found = true;
      break;
    }
  }

  await redis.quit();

  if (!found) {
    throw new Error(
      "Aggregator failed to create routing snapshot - check pm2 logs",
    );
  }

  log("Aggregator started, routing snapshot confirmed.");
}

async function step6StartV2Backends() {
  log("STEP 6: Starting V2 backends...");

  await execAsync(
    `pm2 start ${config.backendDir}/server.js --name mdp-backend`,
  );

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
  });

  let servers = [];
  for (let i = 0; i < 7; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const routing = await redis.get("mdp:routing:active");
    if (routing) {
      const data = JSON.parse(routing);
      servers = data.servers || [];
      if (servers.length > 0) break;
    }
  }

  await redis.quit();

  if (servers.length === 0) {
    throw new Error("V2 backends failed to register - check pm2 logs");
  }

  log(
    `V2 backends started. Healthy: [${servers.map((s) => s.url).join(", ")}]`,
  );
}

async function step7DeleteFirestore() {
  log("POINT OF NO RETURN — deleting Firestore data.");

  const db = admin.firestore();

  let serversDeleted = 0;
  const serversSnap = await db.collection("servers").get();
  const serverDeletes = serversSnap.docs.map((doc) => doc.ref.delete());
  await Promise.all(serverDeletes);
  serversDeleted = serverDeletes.length;

  let routingDeleted = 0;
  const routingSnap = await db.collection("routing").get();
  if (routingSnap.size > 0) {
    const routingDeletes = routingSnap.docs.map((doc) => doc.ref.delete());
    await Promise.all(routingDeletes);
    routingDeleted = routingDeletes.length;
  }

  let idempotencyDeleted = 0;
  const idempotencySnap = await db.collection("idempotency").get();
  if (idempotencySnap.size > 0) {
    const idempotencyDeletes = idempotencySnap.docs.map((doc) =>
      doc.ref.delete(),
    );
    await Promise.all(idempotencyDeletes);
    idempotencyDeleted = idempotencyDeletes.length;
  }

  log(
    `Firestore deleted: servers(${serversDeleted}), routing(${routingDeleted}), idempotency(${idempotencyDeleted})`,
  );
}

async function step8WriteCleanupReminder() {
  log("STEP 8: Writing cleanup reminder...");

  const cleanupContent = `# Firebase Cleanup Instructions

Run these steps on all VPS instances after migration:

1. Remove firebase-admin from backend/package.json:
   npm uninstall firebase-admin

2. Delete service account JSON from all VPS instances:
   rm /path/to/service-account.json

3. Remove GOOGLE_APPLICATION_CREDENTIALS from backend .env files

4. Run npm install in backend/ on each VPS:
   cd /path/to/backend && npm install

5. Restart backend:
   pm2 restart mdp-backend
`;

  writeFileSync("FIREBASE_CLEANUP.md", cleanupContent);
  log("Cleanup reminder written to FIREBASE_CLEANUP.md");
}

async function step9Done() {
  log("MIGRATION COMPLETE. Downtime window closed.");
  log("Run: node migration/verify.js");
  log(`Completion timestamp: ${new Date().toISOString()}`);
  process.exit(0);
}

async function runMigration() {
  try {
    log("Starting V1 → V2 migration...");

    await step1PreflightChecks();
    const v1Snapshot = await step2SnapshotV1();
    await step3StopV1Backends();
    await step4SeedRedis(v1Snapshot);
    await step5StartAggregator();
    await step6StartV2Backends();
    await step7DeleteFirestore();
    await step8WriteCleanupReminder();
    await step9Done();
  } catch (error) {
    log(`MIGRATION FAILED: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
