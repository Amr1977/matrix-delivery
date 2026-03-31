# Failover & Load Balancing System

Production-grade client-driven failover and load balancing system for the Matrix Delivery Platform.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   VPS Server 1  │     │   VPS Server 2   │
│  (Express +     │     │  (Express +     │
│   Firebase)     │     │   Firebase)      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │  Heartbeat (5s)       │  Heartbeat (5s)
         ▼                       ▼
┌─────────────────────────────────────────────┐
│          Firebase Firestore                │
│     (servers collection - real-time)       │
└─────────────────────┬───────────────────────┘
                      │ onSnapshot (WebSocket)
                      ▼
            ┌─────────────────────┐
            │   React Frontend    │
            │  (Failover Client)  │
            └─────────────────────┘
```

## Prerequisites

- Node.js ≥ 18
- A Firebase project with Firestore enabled
- A service account JSON with Firestore write permissions

## Backend Setup (Per VPS Instance)

1. Install dependencies:

```bash
npm install firebase-admin express cors dotenv
```

2. Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

3. Set environment variables:

```bash
# Path to service account JSON (from Firebase Console → Project Settings → Service Accounts)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Unique identifier for this server instance
FIRESTORE_SERVER_ID=server-1

# Public base URL (no trailing slash)
SERVER_URL=https://api1.example.com

# Max concurrent requests
SERVER_MAX_CAPACITY=100

# Routing priority (lower = preferred)
SERVER_PRIORITY=1
```

4. Start the server:

```bash
node server.js
```

## Frontend Setup

1. Install Firebase client SDK:

```bash
npm install firebase
```

2. Copy `frontend/.env.example` to `.env` and fill in Firebase config values:

```bash
cp .env.example .env
```

3. Start development server:

```bash
npm run dev
```

## Deploying Multiple Backends

Each VPS runs an identical copy of the backend code with different environment variables:

| VPS | FIRESTORE_SERVER_ID | SERVER_URL               | SERVER_PRIORITY |
| --- | ------------------- | ------------------------ | --------------- |
| 1   | server-1            | https://api1.example.com | 1               |
| 2   | server-2            | https://api2.example.com | 1               |
| 3   | server-3            | https://api3.example.com | 2               |

## How Failover Works

1. **Server Registration**: Each backend registers itself in Firestore with URL, load, and priority
2. **Heartbeat**: Every 5 seconds, each server updates its status and load in Firestore
3. **Real-time Updates**: Frontend uses `onSnapshot` to receive instant updates
4. **Server Selection**: Frontend filters healthy servers (status=healthy, heartbeat<20s, circuit closed)
5. **Load Balancing**: Servers sorted by load score (ascending), then priority
6. **Request Execution**: Fetch with 5s timeout, automatic failover to next server on failure
7. **Circuit Breaker**: Failed servers enter 60s cooldown before retry

### Failure Scenarios

- **Kill backend process**: Status set to "unhealthy" via gracefulShutdown → removed from healthy pool
- **Hard crash**: Detected within 20 seconds via staleness threshold → removed from healthy pool
- **Request timeout**: 5s AbortController → failover to next server
- **Network error**: markServerFailed() → 60s circuit breaker cooldown

## Testing Failover

1. Start 2+ backend servers on different ports
2. Open frontend and verify server list loads
3. Click "Make Request" - should succeed
4. Kill one backend process (`Ctrl+C` or `kill`)
5. Watch frontend - server should show "unhealthy" within 20s
6. Make another request - should automatically route to remaining server

## Firestore Cost Estimate

**Write operations per server:**

- 1 heartbeat every 5 seconds = 12 writes/minute
- 12 writes/min × 60 min × 24 hr = 17,280 writes/day per server

**Total daily writes:**

```
N servers × 17,280 writes/day = daily write count
```

| Servers | Daily Writes | Spark Free Tier    |
| ------- | ------------ | ------------------ |
| 1       | 17,280       | OK                 |
| 2       | 34,560       | OK                 |
| 3       | 51,840       | ⚠️ Over free limit |
| 4       | 69,120       | ❌ Over free limit |

**Recommendation**: Use Blaze (pay-as-you-go) plan for any deployment with 3+ servers. The free tier allows 50,000 writes/day.

## Environment Variables Reference

### Backend (.env)

| Variable                       | Description                  | Example                       |
| ------------------------------ | ---------------------------- | ----------------------------- |
| GOOGLE_APPLICATION_CREDENTIALS | Path to service account JSON | /path/to/service-account.json |
| FIRESTORE_SERVER_ID            | Unique server ID             | server-1                      |
| SERVER_URL                     | Public base URL              | https://api1.example.com      |
| SERVER_MAX_CAPACITY            | Max concurrent requests      | 100                           |
| SERVER_PRIORITY                | Routing priority             | 1                             |
| PORT                           | Express server port          | 5001                          |
| ALLOWED_ORIGINS                | CORS origins                 | https://example.com           |

### Frontend (.env)

| Variable                       | Description          | Example                   |
| ------------------------------ | -------------------- | ------------------------- |
| REACT_APP_FIREBASE_API_KEY     | Firebase API key     | AIzaSy...                 |
| REACT_APP_FIREBASE_AUTH_DOMAIN | Firebase auth domain | myproject.firebaseapp.com |
| REACT_APP_FIREBASE_PROJECT_ID  | Firebase project ID  | myproject                 |
| REACT_APP_FIREBASE_APP_ID      | Firebase app ID      | 1:123456789:web:abc       |

## Security Notes

- Firestore rules deny all client writes (defense in depth)
- Only backend servers with Admin SDK credentials can write
- Frontend reads without auth via client SDK
- Idempotency keys prevent duplicate requests during failover
- Circuit breaker prevents hammering failed servers
