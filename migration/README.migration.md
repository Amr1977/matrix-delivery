# Migration Guide: V1 (Firestore) → V2 (Redis)

## Overview

This document provides step-by-step instructions for migrating from the V1 Firestore-based failover system to the V2 Redis-based system.

**Expected downtime**: ~40–50 seconds (Steps 3–6)
**Point of no return**: Step 7 (Firestore deletion)

---

## Before You Start — Checklist

Operator must confirm ALL of the following before proceeding:

- [ ] V2 code deployed to all backend VPS instances, backend/.env filled
- [ ] V2 aggregator code deployed to aggregator VPS, aggregator/.env filled
- [ ] Redis installed and running on aggregator VPS
  - Verify: `redis-cli -a <password> ping` → PONG
- [ ] redis/redis.conf deployed to /etc/redis/redis.conf
  - Restart Redis: `systemctl restart redis-server`
- [ ] PM2 installed: `pm2 --version`
- [ ] migration/.env filled from migration/.env.example
- [ ] Users notified of maintenance window

---

## Multi-VPS Note

`migrate.js` controls PM2 on the LOCAL machine (aggregator VPS) only.

If backends run on **separate VPS instances**, you must manually stop/start their PM2 processes via SSH at Steps 3 and 6.

Commands to run on each backend VPS:

- **Stop V1**: `pm2 stop mdp-backend`
- **Start V2**: `pm2 start backend/server.js --name mdp-backend`

---

## Running the Migration

```bash
cd /path/to/matrix-delivery-platform
cp migration/.env.example migration/.env
# Fill migration/.env with actual values
node migration/migrate.js
```

---

## Migration Steps

### Step 1 — Pre-flight Checks

Validates all dependencies and confirms no prior migration exists.

### Step 2 — Snapshot V1

Reads all Firestore documents from `servers` collection and saves to `migration.log.snapshot.json`.

### Step 3 — Stop V1 Backends

Stops all backend PM2 processes. **DOWNTIME BEGINS.**

### Step 4 — Seed Redis

Writes server metadata to Redis from V1 snapshot, marks all as `unhealthy` (V2 backends will update on first heartbeat).

### Step 5 — Start Aggregator

Starts the aggregator PM2 process and waits for first routing snapshot.

### Step 6 — Start V2 Backends

Starts all backend PM2 processes and waits for healthy registrations.

### Step 7 — Delete Firestore

**POINT OF NO RETURN**

Deletes all documents from:

- `servers` collection
- `routing` collection (if exists)
- `idempotency` collection (if exists)

### Step 8 — Write Cleanup Reminder

Creates FIREBASE_CLEANUP.md with post-migration cleanup steps.

### Step 9 — Done

Migration complete. Proceed to verification.

---

## If Migration Fails

### Before Step 7

Run the rollback script:

```bash
node migration/rollback.js
```

This will:

1. Stop V2 processes
2. Flush Redis keys
3. Restore Firestore from snapshot
4. Restart V1 backends

### At or After Step 7

Firestore data has already been deleted.

1. Check `<MIGRATION_LOG_PATH>.snapshot.json` for manual recovery
2. Review logs: `pm2 logs mdp-aggregator` / `pm2 logs mdp-backend`

---

## Verifying the Migration

```bash
node migration/verify.js
```

Checks performed:

1. Redis ping → PONG
2. Server index contains entries
3. Routing snapshot exists and is fresh
4. WebSocket server responds
5. Backend health endpoints respond
6. Firestore collections are empty (informational)

---

## Post-migration Cleanup

Follow the instructions in **FIREBASE_CLEANUP.md**:

1. Remove firebase-admin from backend/package.json:

   ```bash
   npm uninstall firebase-admin
   ```

2. Delete service account JSON from all VPS instances:

   ```bash
   rm /path/to/service-account.json
   ```

3. Remove `GOOGLE_APPLICATION_CREDENTIALS` from backend .env files

4. Run npm install in backend/ on each VPS:

   ```bash
   cd /path/to/backend && npm install
   ```

5. Restart backend:
   ```bash
   pm2 restart mdp-backend
   ```

---

## Rollback Window

| Steps | Rollback Available        |
| ----- | ------------------------- |
| 1–6   | Yes — via rollback.js     |
| 7     | No — point of no return   |
| 8–9   | No — manual recovery only |

---

## Troubleshooting

### "Migration appears already run"

- Check if `mdp:routing:active` exists in Redis
- If migrating for the first time, delete this key manually or investigate previous run

### Aggregator fails to start

- Check PM2 logs: `pm2 logs mdp-aggregator`
- Verify Redis connection in aggregator/.env

### Backends don't register

- Check PM2 logs: `pm2 logs mdp-backend`
- Verify backend/.env has correct REDIS\_\* values

### Health checks fail

- Verify `/health` endpoint exists on backends
- Check firewall rules allow traffic between aggregator and backends
