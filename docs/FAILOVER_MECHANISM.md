# Failover Mechanism Implementation Plan V1.1

## Implementation Status

| Component                  | File                                    | Status         |
| -------------------------- | --------------------------------------- | -------------- |
| Round-robin health check   | `backend/services/serverRegistry.js`    | ✅ Implemented |
| Registry integration       | `backend/server.js`                     | ✅ Implemented |
| Health endpoint pool stats | `backend/routes/health.js`              | ✅ Implemented |
| Idempotency middleware     | `backend/middleware/idempotency.js`     | ✅ Implemented |
| Balance routes idempotency | `backend/routes/v1/balance.js`          | ✅ Implemented |
| Server health hook         | `frontend/src/hooks/useServerHealth.ts` | ✅ Implemented |
| API client with failover   | `frontend/src/services/api/failover.ts` | ✅ Implemented |
| Socket.IO hook             | `frontend/src/hooks/useSocketIO.ts`     | ✅ Implemented |
| FetchWithFailover update   | `frontend/src/fetchWithFailover.js`     | ✅ Updated     |
| API idempotency key        | `frontend/src/api.js`                   | ✅ Updated     |

## Current Architecture (Confirmed by User)

- Each server has a 1-based position in the sorted server list (sorted by serverId)
- Exactly ONE server checks all other servers each minute
- Selection formula: `(currentMinute % N) + 1` where N = total servers
- Example with 3 servers:
  - Minute 0,3,6... → Server at position 1 checks
  - Minute 1,4,7... → Server at position 2 checks
  - Minute 2,5,8... → Server at position 3 checks
- The checking server removes non-responding servers from Firestore
- Frontend fetches server list, does concurrent health check, picks first responder

## Identified Gaps to Fix

### 1. WebSocket / Socket.IO Reconnection

**Problem**: Real-time connections (driver tracking, order updates) break on failover
**Solution**:

- On failover detect, close current Socket.IO connection
- Reconnect to new server URL
- Re-subscribe to same rooms (order room, driver room)
- Frontend should maintain reconnection attempts

### 2. JWT Session Validity

**Problem**: Are tokens valid across all servers?
**Solution**:

- JWTs should be signed with a shared secret accessible to all servers
- If using different secrets per server, implement token exchange
- Recommend: Shared JWT secret in environment variables

### 3. Database Connection Pool Warming

**Problem**: When a server becomes primary after failover, it gets all traffic immediately - cold DB pool causes slow responses
**Solution**:

- On startup, run a few warmup queries (e.g., `SELECT 1`, fetch user count)
- Keep minimum 1 idle connection in pool
- Monitor connection pool stats in health endpoint

### 4. Clock Skew in Idempotency Keys

**Problem**: Keys include minute timestamp - different server clocks = different keys for same request
**Solution**:

- Use `Date.now()` from client (trusted), not server
- Key format: `{userId}:{endpoint}:{bodyHash}:{clientTimestampMinute}`
- Server stores key based on client-provided timestamp

### 5. Frontend Server List Cache

**Problem**: Frontend may use stale server list
**Solution**:

- On every API error (5xx), re-fetch server list from Firestore
- Add `serverListVersion` field - if version changed, refresh immediately
- Default refresh interval: 60 seconds when app is in foreground

### 6. Recovery Rejoin (Stale Server Removal)

**Problem**: When a "dead" server recovers, it tries to re-register but may have been removed by another server
**Solution**:

- On restart, server re-registers itself (normal behavior)
- No special handling needed - fresh registration overwrites any stale data

## Implementation Steps

### Backend Changes

1. **Update `serverRegistry.js`**
   - Add position-based check interval calculation
   - Add warmup queries on startup

2. **Add Idempotency Middleware**
   - Accept client-side timestamp in idempotency key
   - Store processed keys in Redis (or in-memory)

3. **Update Health Endpoint**
   - Include connection pool stats

### Frontend Changes

1. **Update `useServerHealth.js`**
   - On 5xx error, trigger re-selection
   - Add periodic server list refresh

2. **Add Socket.IO Reconnection**
   - On connection error, re-establish with new server

### Configuration

```javascript
const config = {
  // One server checks per minute (round-robin)
  // Selection: (currentMinute % totalServers) + 1
  // Position 1 checks at minutes 0, N, 2N...
  // Position 2 checks at minutes 1, N+1, 2N+1...

  healthCheckInterval: 60000, // Check every minute

  // Frontend
  serverListRefreshInterval: 60000, // 60 seconds
  healthCheckTimeout: 5000,

  // Idempotency
  idempotencyKeyTTL: 24 * 60 * 60 * 1000, // 24 hours
};
```

### Implementation (Backend)

```javascript
async function getMyPosition(serverId) {
  const snapshot = await serversCollection.orderBy("serverId").get();
  const servers = snapshot.docs.map((doc) => doc.id);
  return servers.indexOf(serverId) + 1; // 1-based
}

async function shouldRunHealthCheck(myServerId) {
  const servers = await serversCollection.orderBy("serverId").get();
  const totalServers = servers.docs.length;
  const myPosition = await getMyPosition(myServerId);

  const currentMinute = Math.floor(Date.now() / 60000);
  const checkPosition = (currentMinute % totalServers) + 1;

  return myPosition === checkPosition;
}

async function healthCheckAndClean() {
  const snapshot = await serversCollection.get();
  const servers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  for (const server of servers) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${server.url}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) await removeServer(server.id);
    } catch (error) {
      await removeServer(server.id); // Remove non-responders
    }
  }
}

// Run every minute - only one server will actually do the work
setInterval(async () => {
  if (await shouldRunHealthCheck(myServerId)) {
    await healthCheckAndClean();
  }
}, 60000);
```

## Testing Plan

1. Round-robin: Verify only one server runs check each minute
2. Server removal: Kill server B, verify A detects and removes it from Firestore
3. Failover: Kill primary, verify frontend switches within 10 seconds
4. Idempotency: Send same withdrawal request to different servers, verify only one processes
5. Socket.IO: Kill server during active order tracking, verify reconnection
6. Recovery: Restart killed server, verify it rejoins correctly

## Implementation Details

### Backend - Server Registry (`backend/services/serverRegistry.js`)

```javascript
// Round-robin health check selection
async function shouldRunHealthCheck() {
  const myPosition = await getMyPosition(myServerId);
  const currentMinute = Math.floor(Date.now() / 60000);
  const checkPosition = (currentMinute % totalServers) + 1;
  return myPosition === checkPosition;
}

// Database warmup on startup
async function warmupDatabase(pool) {
  await pool.query("SELECT 1");
  const result = await pool.query("SELECT COUNT(*) as count FROM users");
}
```

### Backend - Idempotency Middleware (`backend/middleware/idempotency.js`)

```javascript
// Uses client-provided timestamp to avoid clock skew
function generateKey(req) {
  const clientTimestamp =
    req.headers["idempotency-key"]?.split(":").pop() ||
    Math.floor(Date.now() / 60000);
  return `${userId}:${endpoint}:${bodyHash}:${clientTimestamp}`;
}
```

### Frontend - Fetch with Failover (`frontend/src/fetchWithFailover.js`)

- Server list cached with 60s TTL
- On 5xx: refresh server list, failover to healthy server
- On network error: refresh server list, retry with new server
- Sticky server selection until failure

### Frontend - Socket.IO Hook (`frontend/src/hooks/useSocketIO.ts`)

- Auto-reconnect on connection error
- Re-subscribes to user room after reconnect
- Configurable reconnection attempts (default: 5)
