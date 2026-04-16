# AI Agent Prompt: Implement Failover Mechanism (Matrix Delivery Style)

## Overview

Implement a client-driven failover system where multiple servers register themselves in Firestore, and the frontend dynamically selects the fastest responding server.

## How It Works

### Server-Side (Backend)

1. **Startup**: Each server registers itself in Firestore `servers` collection
2. **Heartbeat**: Every 60 seconds, server updates its `lastHeartbeat` timestamp
3. **Peer Health Check**: Every 60 seconds, each server checks ALL other active servers concurrently
4. **Cleanup**: Remove non-responding servers from Firestore (no response = remove their entry)
5. **Shutdown**: On restart/shutdown, remove server entry from Firestore

### Client-Side (Frontend)

1. **Server Discovery**: On app start, fetch all servers from Firestore `servers` collection
2. **Concurrent Health Check**: Send health check requests to ALL servers CONCURRENTLY
3. **First Responder Wins**: Pick the server that responds first (fastest)
4. **Sticky Connection**: Stay connected to selected server until it fails
5. **Failover**: On failure, re-run discovery + health check to find next fastest server

## Firestore Schema

Collection: `servers` (documents by serverId)

```
servers/{serverId}
├── url: string        // Base API URL, e.g., "https://api.matrix-delivery.com"
├── status: string     // "healthy" | "unhealthy"
├── lastHeartbeat: number  // Unix timestamp (Date.now())
├── createdAt: timestamp   // Server startup timestamp
```

## Environment Variables

**Backend:**

- `FIRESTORE_SERVER_ID`: Unique server identifier (e.g., `aws-primary`, `gcp-secondary`)
- `SERVER_URL`: Public base URL of this server
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to Firebase service account JSON
- `FIRESTORE_PROJECT_ID`: GCP project ID

**Frontend:**

- Firebase client config (VITE*FIREBASE*\*)

## Implementation Steps

### Backend - Step 1: Create `serverRegistry.js`

```javascript
const admin = require('firebase-admin');
const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const serversCollection = db.collection('servers');

let healthCheckInterval = null;

async function registerServer(serverId, url) {
  await serversCollection.doc(serverId).set({
    url,
    status: 'healthy',
    lastHeartbeat: Date.now(),
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function updateHeartbeat(serverId) {
  await serversCollection.doc(serverId).update({
    lastHeartbeat: Date.now(),
    status: 'healthy'
  });
}

async function removeServer(serverId) {
  await serversCollection.doc(serverId).delete();
}

async function healthCheckPeers(myServerId) {
  const snapshot = await serversCollection.get();
  const peers = snapshot.docs
    .filter(doc => doc.id !== myServerId)
    .map(doc => ({ id: doc.id, ...doc.data() }));

  // Check all peers concurrently
  const checkPromises = peers.map(async (peer) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${peer.url}/api/health`, {
        signal: controller.signal
      });
      clearTimeout(timeout);

      return response.ok ? peer.id : null;
    } catch (error) {
      // Non-responding server - remove it
      await removeServer(peer.id);
      return null;
    }
  });

  await Promise.all(checkPromises);
}

function startRegistry(serverId, url) {
  // Register this server
  await registerServer(serverId, url);

  // Start heartbeat + peer check every 60 seconds
  healthCheckInterval = setInterval(async () => {
    await updateHeartbeat(serverId);
    await healthCheckPeers(serverId);
  }, 60000);

  // Remove server on shutdown
  process.on('SIGTERM', async () => {
    clearInterval(healthCheckInterval);
    await removeServer(serverId);
    process.exit(0);
  });
}

module.exports = { startRegistry };
```

### Backend - Step 2: Health Endpoint

```javascript
// GET /api/health
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    environment: process.env.NODE_ENV,
    database: "PostgreSQL",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
```

### Backend - Step 3: Integrate in `server.js`

```javascript
const { startRegistry } = require("./serverRegistry");

// After server is fully initialized and listening
server = httpServer.listen(PORT, "127.0.0.1", () => {
  console.log(`Server running on http://localhost:${PORT}`);

  // Start registry AFTER server is ready
  startRegistry(process.env.FIRESTORE_SERVER_ID, process.env.SERVER_URL);

  // Signal PM2 ready
  if (process.send) process.send("ready");
});
```

### Frontend - Step 1: Server Discovery + Health Check

```javascript
// useServerHealth.js
import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } = require('firebase/firestore');

const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

export function useServerHealth() {
  const [serverUrl, setServerUrl] = useState(null);

  const selectFastestServer = async () => {
    // Fetch all servers
    const snapshot = await getDocs(collection(db, 'servers'));
    const servers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (servers.length === 0) {
      throw new Error('No servers available');
    }

    // Concurrent health check to ALL servers
    const checks = servers.map(async (server) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        const response = await fetch(`${server.url}/api/health`, {
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (response.ok) {
          return server.url;
        }
        return null;
      } catch (error) {
        return null;
      }
    });

    // First one to respond wins
    const results = await Promise.all(checks);
    const fastestServer = results.find(url => url !== null);

    if (!fastestServer) {
      throw new Error('All servers failed health check');
    }

    setServerUrl(fastestServer);
    return fastestServer;
  };

  useEffect(() => {
    selectFastestServer();
  }, []);

  return { serverUrl, selectFastestServer };
}
```

### Frontend - Step 2: API Client with Auto-Failover

```javascript
// api.js
import { useServerHealth } from "./hooks/useServerHealth";

const MAX_RETRIES = 3;

async function fetchWithFailover(endpoint, options = {}) {
  let { serverUrl, selectFastestServer } = useServerHealth();

  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${serverUrl}${endpoint}`, {
        ...options,
        credentials: "include",
      });

      if (!response.ok && response.status === 503) {
        // Server died, try failover
        serverUrl = await selectFastestServer();
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      // Try failover on network error
      serverUrl = await selectFastestServer();
    }
  }

  throw lastError;
}
```

## Configuration

```javascript
const config = {
  // Backend
  heartbeatInterval: 60000, // 1 minute
  healthCheckTimeout: 10000, // 10 seconds for peer check

  // Frontend
  frontendHealthCheckTimeout: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 1000,
};
```

## Testing Procedures

1. **Server Startup**: Verify server appears in Firestore
2. **Peer Detection**: Stop server B, verify server A removes B's entry
3. **Frontend Selection**: Kill active server, verify frontend switches to next
4. **Race Condition**: Start 3 servers, verify fastest is selected
5. **Recovery**: Restart killed server, verify it rejoins pool

## Best Practices

- Use AbortController for timeout handling
- Handle SIGTERM/SIGINT for graceful cleanup
- Log all health check failures
- Keep server count small (2-3 servers ideal)
- Use idempotency for critical operations
- Monitor failover frequency - investigate if > 10/day

## Optimizations

### Optimization 1: Round-Robin Health Checks (O(n) instead of O(n²))

Instead of every server checking every other server every minute (redundant O(n²)), use round-robin so only ONE server does the check per minute.

```javascript
// Only the server with lowest ID runs the health check each minute
async function shouldRunHealthCheck(myServerId) {
  const snapshot = await serversCollection.orderBy("serverId").limit(1).get();
  const coordinator = snapshot.docs[0].id;
  return coordinator === myServerId;
}

async function healthCheckPeers(myServerId) {
  // Only one server runs the full check per cycle
  const shouldRun = await shouldRunHealthCheck(myServerId);
  if (!shouldRun) {
    console.log("Health check handled by another server this minute");
    return;
  }

  // This coordinator checks ALL peers and removes stale ones
  const snapshot = await serversCollection.get();
  const peers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  for (const peer of peers) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${peer.url}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) await removeServer(peer.id);
    } catch (error) {
      await removeServer(peer.id); // Remove non-responders
    }
  }
}
```

### Optimization 2: Idempotency for Balance-Critical Requests

During failover, the same request might reach multiple servers. Use idempotency keys to prevent duplicate operations (double deductions, double withdrawals, etc.).

**Backend Middleware:**

```javascript
const idempotencyStore = new Map(); // Use Redis in production

function idempotencyMiddleware(req, res, next) {
  const key = req.headers["x-idempotency-key"];
  if (!key) return res.status(400).json({ error: "Idempotency key required" });

  const existing = idempotencyStore.get(key);
  if (existing) return res.status(200).json(existing);

  idempotencyStore.set(key, { status: "processing" });
  next();
}

async function completeIdempotentRequest(key, result) {
  idempotencyStore.set(key, {
    status: "completed",
    result,
    completedAt: Date.now(),
  });
  setTimeout(() => idempotencyStore.delete(key), 24 * 60 * 60 * 1000); // 24h TTL
}
```

**Balance Operations Requiring Idempotency:**

- `POST /api/withdraw` - Withdrawals
- `POST /api/deposit` - Deposits
- `POST /api/orders` - Create order (payment)
- `POST /api/transfer` - Balance transfers
- `POST /api/payment/confirm` - Payment confirmations

**Frontend - Generate Idempotency Keys:**

```javascript
function generateIdempotencyKey(userId, endpoint, body) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex")
    .substring(0, 8);
  const minute = Math.floor(Date.now() / 60000);
  return `${userId}:${endpoint}:${hash}:${minute}`;
}

// Usage
fetch("/api/withdraw", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Idempotency-Key": generateIdempotencyKey(userId, "POST /api/withdraw", {
      amount: 100,
    }),
  },
  body: JSON.stringify({ amount: 100 }),
});
```
