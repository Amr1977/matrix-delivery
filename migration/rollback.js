/**
 * @module rollback
 * @description Rollback script to restore V1 if migration fails before step 7
 */

import { readFileSync, existsSync } from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import admin from "firebase-admin";
import Redis from "ioredis";

const execAsync = promisify(exec);

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  WARNING: This rollback restores V1 from Firestore snapshot.   ║
║  If STEP 7 (Firestore deletion) has already completed,        ║
║  this script CANNOT automatically restore your data.            ║
╚════════════════════════════════════════════════════════════════╝
`);

const requiredEnvVars = [
  "GOOGLE_APPLICATION_CREDENTIALS",
  "FIREBASE_PROJECT_ID",
  "REDIS_HOST",
  "REDIS_PORT",
  "REDIS_PASSWORD",
  "MIGRATION_LOG_PATH",
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
  snapshotPath: process.env.MIGRATION_LOG_PATH + ".snapshot.json",
};

function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function stepR1StopV2Processes() {
  log("STEP R1: Stopping V2 processes...");

  try {
    await execAsync("pm2 stop mdp-backend");
  } catch {
    // May not be running
  }

  await new Promise((resolve) => setTimeout(resolve, 2000));
  log("V2 processes stopped.");
}

async function stepR2FlushRedisKeys() {
  log("STEP R2: Flushing Redis keys...");

  const redis = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
  });

  const scanAndDelete = async (pattern) => {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  };

  await scanAndDelete("mdp:server:*");
  await scanAndDelete("mdp:idempotency:*");
  await redis.del("mdp:servers:index", "mdp:routing:active");

  await redis.quit();
  log("Redis keys flushed.");
}

async function stepR3RestoreFirestore() {
  log("STEP R3: Restoring Firestore from snapshot...");

  if (!existsSync(config.snapshotPath)) {
    throw new Error(
      `Cannot rollback — snapshot missing: ${config.snapshotPath}`,
    );
  }

  const snapshotData = readFileSync(config.snapshotPath, "utf8");
  const v1Snapshot = JSON.parse(snapshotData);

  const db = admin.firestore();

  const batchSize = 500;
  for (let i = 0; i < v1Snapshot.length; i += batchSize) {
    const batch = db.batch();
    const chunk = v1Snapshot.slice(i, i + batchSize);

    for (const server of chunk) {
      const docRef = db.collection("servers").doc(server.id);
      batch.set(docRef, server);
    }

    await batch.commit();
  }

  log(`Restored ${v1Snapshot.length} documents to Firestore.`);
}

async function stepR4RestartV1Backends() {
  log("STEP R4: Restarting V1 backends...");

  await execAsync("pm2 start mdp-backend");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  log("V1 backends restarted.");
}

async function stepR5VerifyV1() {
  log("STEP R5: Verifying V1 heartbeats...");

  const db = admin.firestore();
  const snapshot = await db.collection("servers").get();

  const now = Date.now();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.lastHeartbeat) {
      const age = now - data.lastHeartbeat;
      if (age > 60000) {
        log(
          `WARNING: ${doc.id} last heartbeat is ${Math.round(age / 1000)}s old`,
        );
      }
    }
  }

  log("Rollback complete. V1 restored.");
  process.exit(0);
}

async function runRollback() {
  try {
    log("Starting rollback...");

    process.env.GOOGLE_APPLICATION_CREDENTIALS = config.credentialsPath;
    admin.initializeApp();

    await stepR1StopV2Processes();
    await stepR2FlushRedisKeys();
    await stepR3RestoreFirestore();
    await stepR4RestartV1Backends();
    await stepR5VerifyV1();
  } catch (error) {
    log(`ROLLBACK FAILED: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

runRollback();
