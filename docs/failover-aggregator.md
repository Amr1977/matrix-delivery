You are a senior Node.js and React engineer.

The Matrix Delivery Platform is currently running V1 (Firestore-based,
prompt already applied). Your task is to do two things in a single run:

  PART A — Implement V2 (Redis-based system, full replacement)
  PART B — Implement migration tooling (hard cutover V1 → V2)

Output PART A files first, then PART B files.
Do not truncate any file. No placeholders. Fully deployable code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURRENT V1 STATE (running now — do not touch these files)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

backend/
  serverRegistry.js     Firebase Admin SDK, heartbeat every 5s to Firestore
  loadCalculator.js     active request counter only
  server.js             Express, no idempotency middleware
  .env.example          uses FIRESTORE_SERVER_ID, GOOGLE_APPLICATION_CREDENTIALS

frontend/src/
  firebase.js           Firebase client SDK, onSnapshot
  serverSelector.js     client-side ranking by loadFactor + priority
  circuitBreaker.js     in-memory + localStorage, 60s cooldown
  fetchWithFailover.js  idempotency key in header, AbortController 5s
  useServerRegistry.js  onSnapshot hook
  ExampleComponent.jsx

firestore.rules
README.md

V1 does NOT have: aggregator, scoring.js, wsServer.js, wsClient.js,
idempotencyMiddleware.js, Redis, or migration scripts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LOCKED DECISIONS — DO NOT DEVIATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Redis location            → same VPS as aggregator, localhost
- Frontend real-time        → WebSocket endpoint on aggregator
- Redis persistence         → AOF (appendonly yes, appendfsync everysec)
- Backend server count      → 2–5 servers
- Redis auth                → requirepass (single password via env var)
- Idempotency TTL           → Redis native SET EX 86400 (no cleanup job)
- Aggregator crash fallback → frontend uses last WebSocket snapshot in memory
- Heartbeat interval        → 30 000 ms
- Staleness threshold       → 90 000 ms
- Aggregator interval       → 5 000 ms
- Health check timeout      → 2 000 ms
- Request timeout           → 5 000 ms via AbortController
- Circuit breaker cooldown  → 60 000 ms, localStorage-backed
- Warmup period             → 30 000 ms from process start
- Latency baseline          → LATENCY_BASELINE_MS env var
- Rolling window            → ROLLING_WINDOW_SIZE env var (default 50)
- Score formula             → (loadFactor×0.5)+(latencyFactor×0.3)+(errorRate×0.2)
                              clamp all inputs to [0,1]
                              if warmup → add 0.3 THEN clamp to [0,1]
- Weight formula            → 1 / (score + 0.01)  NOT  1 - score
- Migration strategy        → hard cutover, brief downtime accepted
- Firestore cleanup         → delete all documents, no audit trail kept
- Module system             → ES modules, "type":"module" in package.json
- Language                  → plain JavaScript with JSDoc, no TypeScript
- Redis client library      → ioredis
- WebSocket library         → ws (aggregator server side)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETE FOLDER STRUCTURE — CREATE EVERY FILE LISTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

matrix-delivery-platform/
├── backend/
│   ├── config.js                ← env validation, exports config object
│   ├── serverRegistry.js        ← Redis HSET heartbeat, graceful shutdown
│   ├── loadCalculator.js        ← request tracker + rolling latency/error
│   ├── idempotencyMiddleware.js ← Redis SET NX server-side idempotency
│   ├── server.js                ← Express entry point
│   └── .env.example
├── aggregator/
│   ├── config.js                ← env validation, exports config object
│   ├── aggregator.js            ← main loop: read Redis → health check →
│   │                               score → write snapshot → broadcast
│   ├── scoring.js               ← computeScore(), normalizeScores(), clamp()
│   ├── wsServer.js              ← ws WebSocket server, broadcast, fallback
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── wsClient.js          ← WebSocket client, reconnect, memory fallback
│   │   ├── circuitBreaker.js    ← in-memory Map + localStorage
│   │   ├── serverSelector.js    ← filterAvailableServers, weightedRandomSelect
│   │   ├── fetchWithFailover.js ← ordered attempt list, timeout, idempotency
│   │   ├── useServerRegistry.js ← React hook wrapping wsClient
│   │   └── ExampleComponent.jsx ← full demo: GET + POST, circuit panel
│   └── .env.example
├── redis/
│   └── redis.conf               ← AOF, requirepass, bind 127.0.0.1, maxmemory
├── migration/
│   ├── migrate.js               ← 9-step hard cutover script
│   ├── rollback.js              ← restores V1 if cutover fails before step 7
│   ├── verify.js                ← 6-check post-cutover verification
│   ├── .env.example
│   └── README.migration.md      ← human runbook with exact commands
└── README.md                    ← updated for V2 Redis architecture

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDIS KEY SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

mdp:server:{serverId}        Hash   url, status, currentLoad, maxCapacity,
                                    lastHeartbeat, priority, avgLatencyMs,
                                    errorRate, warmup
                                    TTL: none (managed via staleness check)

mdp:servers:index            Set    all registered serverId strings
                                    TTL: none

mdp:routing:active           String JSON { servers:[{url,score,priority}],
                                           updatedAt }
                                    TTL: none (overwritten every 5s)

mdp:idempotency:{key}        String JSON { status, body, createdAt }
                                    TTL: 86400s via SET EX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REDIS CLIENT FACTORY — USE THIS PATTERN IN EVERY FILE THAT NEEDS REDIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Each file that needs Redis creates its own client instance:

  import Redis from 'ioredis'
  import { config } from './config.js'

  function createRedisClient() {
    const client = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      password: config.REDIS_PASSWORD,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    })
    client.on('error', err =>
      console.error('[Redis] connection error:', err.message))
    client.on('ready', () =>
      console.info('[Redis] connected and ready'))
    return client
  }

Do NOT share a singleton across files.
Each package (backend/, aggregator/) has its own config.js.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — V2 IMPLEMENTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── FILE A1 — backend/config.js ──────────────────────────────────────────

Read and validate all env vars at import time.
Throw a descriptive Error listing every missing var if any are absent.
Export a frozen config object. Required vars:

  SERVER_ID              unique instance identifier e.g. server-1
  SERVER_URL             public base URL, no trailing slash
  SERVER_MAX_CAPACITY    integer > 0
  SERVER_PRIORITY        integer, default 1
  PORT                   HTTP port
  ALLOWED_ORIGINS        comma-separated CORS origins
  REDIS_HOST             default 127.0.0.1
  REDIS_PORT             integer, default 6379
  REDIS_PASSWORD         requirepass value
  HEARTBEAT_INTERVAL_MS  default 30000
  WARMUP_PERIOD_MS       default 30000
  ROLLING_WINDOW_SIZE    integer, default 50
  LATENCY_BASELINE_MS    default 1000

── FILE A2 — backend/loadCalculator.js ──────────────────────────────────

Export createRequestTracker() → { middleware, getMetrics }

middleware (Express):
  - Increments active counter on every request
  - SKIP /health: if req.path === '/health' call next() immediately,
    do not increment any counter
  - Decrements on res.on('finish') and res.on('close')
  - Boolean flag per request prevents double-decrement
  - Records request duration (Date.now() delta) into circular latency buffer
  - Records error (res.statusCode >= 500) into circular error buffer
  - Both buffers are size ROLLING_WINDOW_SIZE from config

getMetrics() → { currentLoad, avgLatencyMs, errorRate, warmup }
  - currentLoad: integer active request count
  - avgLatencyMs: rolling average of latency buffer
    if buffer is empty → return config.LATENCY_BASELINE_MS (not 0)
  - errorRate: errors/total in rolling window, clamped [0,1]
    if buffer is empty → return 0
  - warmup: Date.now() - startTime < config.WARMUP_PERIOD_MS
  - Never return NaN or undefined from any field

Export computeLoadFactor(currentLoad, maxCapacity):
  Returns currentLoad/maxCapacity clamped [0,1].
  If maxCapacity <= 0 return 1.

Full JSDoc on all exports.

── FILE A3 — backend/serverRegistry.js ──────────────────────────────────

Import createRedisClient. Import config from config.js.
No Firebase imports anywhere in this file.

Export startRegistry({ getMetrics }):
  1. createRedisClient()
  2. registerServer() — HSET mdp:server:{SERVER_ID} all fields,
     SADD mdp:servers:index {SERVER_ID}
     status: "healthy", all metrics from getMetrics(), lastHeartbeat: Date.now()
  3. setInterval(updateHeartbeat, config.HEARTBEAT_INTERVAL_MS)
  4. Register SIGTERM + SIGINT → gracefulShutdown()
  5. Return stop() that clears interval and calls gracefulShutdown()

updateHeartbeat() (private):
  Calls getMetrics(), HSET updated fields + lastHeartbeat: Date.now()
  Wrap in try/catch. On error: console.warn, do not crash.
  Fields to update: status, currentLoad, avgLatencyMs, errorRate,
  warmup (as string "true"/"false"), lastHeartbeat

gracefulShutdown() (private):
  HSET mdp:server:{SERVER_ID} status "unhealthy"
  Await write. redis.quit(). process.exit(0) AFTER await.

All Redis calls wrapped in try/catch. Full JSDoc.

── FILE A4 — backend/idempotencyMiddleware.js ────────────────────────────

Export createIdempotencyMiddleware(redisClient) → Express middleware

JSDoc MUST include a warning: mount only on mutation routes
(POST, PUT, PATCH, DELETE). Never mount globally or on GET routes.

Middleware:
  1. Read header "Idempotency-Key". If missing → 400 JSON error.
  2. GET mdp:idempotency:{key}
     If found → res.status(record.status).json(record.body), return.
  3. If not found:
     Monkey-patch res.json:
       - Store original
       - Replace with wrapper that:
           a. JSON.stringify({ status: res.statusCode, body: arg })
           b. SET mdp:idempotency:{key} <json> EX 86400
           c. Call original res.json(arg)
     Call next()
  4. Redis error on lookup → log + call next() (fail open)
  5. Redis error on store → log only, do not fail response

Full JSDoc on factory and returned middleware.

── FILE A5 — backend/server.js ──────────────────────────────────────────

  1. Import config from config.js (validates env at import)
  2. createRequestTracker() → { middleware, getMetrics }
  3. app.use(middleware) BEFORE routes
  4. createRedisClient() → redisClient
  5. createIdempotencyMiddleware(redisClient) → idempotencyMw
  6. CORS from config.ALLOWED_ORIGINS (split by comma)
  7. startRegistry({ getMetrics }) → store stop()

Routes:
  GET /health
    { status:"ok", serverId:config.SERVER_ID,
      load:metrics.currentLoad, avgLatencyMs:metrics.avgLatencyMs,
      errorRate:metrics.errorRate, warmup:metrics.warmup,
      ts:Date.now() }
    No idempotency middleware.

  GET /api/example
    200ms simulated delay.
    { message:"ok", serverId:config.SERVER_ID }
    No idempotency middleware.

  POST /api/order
    Mount idempotencyMw on this route specifically.
    150ms simulated delay.
    { orderId:crypto.randomUUID(), serverId:config.SERVER_ID }

Graceful HTTP server shutdown: on SIGTERM/SIGINT call stop() before
server.close().

── FILE A6 — backend/.env.example ───────────────────────────────────────

All vars with placeholder values and one-line comments:
SERVER_ID, SERVER_URL, SERVER_MAX_CAPACITY, SERVER_PRIORITY,
PORT, ALLOWED_ORIGINS, REDIS_HOST, REDIS_PORT, REDIS_PASSWORD,
HEARTBEAT_INTERVAL_MS, WARMUP_PERIOD_MS, ROLLING_WINDOW_SIZE,
LATENCY_BASELINE_MS

── FILE A7 — aggregator/config.js ───────────────────────────────────────

Validate and export config for aggregator. Required vars:
  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD,
  WS_PORT, AGGREGATOR_INTERVAL_MS (default 5000),
  STALENESS_THRESHOLD_MS (default 90000),
  HEALTH_CHECK_TIMEOUT_MS (default 2000),
  LATENCY_BASELINE_MS (default 1000),
  MIN_SCORE_SPREAD (float, default 0.05)

── FILE A8 — aggregator/scoring.js ──────────────────────────────────────

Pure functions only. No Redis. No side effects. Import config from config.js.

Export clamp(value, min, max): standard clamp, exported for tests.

Export computeScore(server):
  @param server { currentLoad, maxCapacity, avgLatencyMs, errorRate, warmup }
  @returns number [0,1], lower = better
  Steps:
    1. loadFactor    = clamp(currentLoad/maxCapacity, 0, 1) — if maxCap<=0 use 1
    2. latencyFactor = clamp(avgLatencyMs/config.LATENCY_BASELINE_MS, 0, 1)
    3. errRate       = clamp(server.errorRate, 0, 1)
    4. raw = (loadFactor×0.5) + (latencyFactor×0.3) + (errRate×0.2)
    5. if server.warmup === true → raw = raw + 0.3
    6. return clamp(raw, 0, 1)

Export normalizeScores(servers):
  @param servers array of { url, score, priority, ...rest }
  @returns new array with score replaced by normalized value
  Steps:
    1. Find min/max score across array
    2. If max === min → return servers unchanged (do not divide by zero)
    3. If (max-min) < config.MIN_SCORE_SPREAD → console.warn spread warning
    4. normalizedScore = (score-min)/(max-min)
    5. Return new array with updated score

Full JSDoc on all exports.

── FILE A9 — aggregator/wsServer.js ─────────────────────────────────────

Import ws. Import config from config.js.

Module-level:
  let lastSnapshot = null
  const clients = new Set()

Export startWsServer():
  Creates WebSocket server on config.WS_PORT.
  On connection:
    - clients.add(ws)
    - Send lastSnapshot immediately if not null;
      else send { servers:[], updatedAt:null }
    - Wrap send in try/catch
  On close/error:
    - clients.delete(ws)
  Returns wss instance.

Export broadcast(servers):
  lastSnapshot = { servers, updatedAt: Date.now() }
  For each client in clients where readyState === WebSocket.OPEN:
    client.send(JSON.stringify(lastSnapshot)) wrapped in try/catch
  console.info('[WsServer] broadcast to N clients')

Export getClientCount():
  Returns clients.size

Full JSDoc on all exports.

── FILE A10 — aggregator/aggregator.js ──────────────────────────────────

Import createRedisClient, config, computeScore, normalizeScores, broadcast,
startWsServer.

On startup:
  1. Validate config (import triggers it)
  2. createRedisClient()
  3. startWsServer()
  4. await runAggregatorCycle() — run ONE cycle immediately before interval
     (solves cold-start: frontend gets data on first connect)
  5. setInterval(runAggregatorCycle, config.AGGREGATOR_INTERVAL_MS)
  6. SIGTERM/SIGINT → clearInterval, redis.quit(), process.exit(0)

Export runAggregatorCycle() (exported for testing):

  Step 1: SMEMBERS mdp:servers:index
  Step 2: HGETALL mdp:server:{id} for each — parse all numeric fields
          (stored as strings in Redis):
            currentLoad, maxCapacity, lastHeartbeat, priority → parseInt
            avgLatencyMs, errorRate → parseFloat
            warmup → (value === 'true')
          Skip servers where HGETALL returns null.
  Step 3: Filter healthy:
            server.status === 'healthy'
            AND Date.now() - server.lastHeartbeat < config.STALENESS_THRESHOLD_MS
  Step 4: Active health checks via Promise.allSettled():
            Each check: fetch(server.url+'/health') with AbortController
            timeout config.HEALTH_CHECK_TIMEOUT_MS
            On failure: HSET mdp:server:{id} status 'unhealthy'
                        exclude from scored list
            Each check wrapped in individual try/catch — never let one
            failure abort the others
  Step 5: computeScore() for each passing server
  Step 6: Build scored list [{ url, score, priority }]
  Step 7: normalizeScores()
  Step 8: SET mdp:routing:active JSON.stringify({servers, updatedAt:Date.now()})
          No TTL.
  Step 9: broadcast(scoredServers)
  Step 10: console.info('[Aggregator] cycle complete, healthy: N')

  Entire cycle wrapped in try/catch — log error, never crash process.

── FILE A11 — aggregator/.env.example ───────────────────────────────────

All vars with placeholder values and one-line comments:
REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, WS_PORT,
AGGREGATOR_INTERVAL_MS, STALENESS_THRESHOLD_MS,
HEALTH_CHECK_TIMEOUT_MS, LATENCY_BASELINE_MS, MIN_SCORE_SPREAD

── FILE A12 — frontend/src/wsClient.js ──────────────────────────────────

No framework deps. Plain ES module.
URL from import.meta.env.VITE_AGGREGATOR_WS_URL

Module-level state (not exported):
  let socket = null
  let reconnectTimer = null
  let lastSnapshot = null
  const listeners = new Set()

Export createWsClient() → { subscribe, unsubscribe, getLastSnapshot, disconnect }

Calling createWsClient() calls connect() immediately.

connect() (internal):
  1. new WebSocket(VITE_AGGREGATOR_WS_URL)
  2. onmessage: parse JSON → lastSnapshot → call all listeners
  3. onclose: console.warn reconnecting, setTimeout(connect, 3000)
  4. onerror: console.warn error (close fires after, triggers reconnect)
  5. onopen: console.info connected

subscribe(callback):
  listeners.add(callback)
  If lastSnapshot !== null → call callback(lastSnapshot) immediately

unsubscribe(callback): listeners.delete(callback)

getLastSnapshot(): return lastSnapshot (may be null)

disconnect():
  clearTimeout(reconnectTimer)
  if socket open → socket.close()

CRITICAL fallback: when aggregator is down, lastSnapshot retains last
known data. useServerRegistry must hydrate from getLastSnapshot() on
mount, not wait for first message.

Full JSDoc on all exports.

── FILE A13 — frontend/src/circuitBreaker.js ────────────────────────────

Two-layer storage: in-memory Map + localStorage.
Cooldown: 60 000 ms. localStorage key: "mdp_circuit_breaker".

Export isCircuitOpen(serverUrl):
  Check Map first. If not found check localStorage. Hydrate Map from
  localStorage if found. Delete expired entries from both before return.
  Returns boolean.

Export markServerFailed(serverUrl):
  Record timestamp in Map AND localStorage.
  Read existing localStorage JSON, merge, write back. try/catch.

Export resetServer(serverUrl):
  Remove from Map AND localStorage. try/catch.

Export getFailedServers():
  Plain object snapshot. Prune expired before return.

All localStorage access wrapped in try/catch.
Full JSDoc on all exports.

── FILE A14 — frontend/src/serverSelector.js ────────────────────────────

Pure functions. No WebSocket imports. Import isCircuitOpen from circuitBreaker.

Export filterAvailableServers(servers):
  Filter: isCircuitOpen(server.url) === false
  @param servers array [{ url, score, priority }]
  @returns filtered array

Export weightedRandomSelect(servers):
  @param servers pre-filtered array
  @returns one server object or null if empty
  weight = 1 / (score + 0.01)
  Algorithm:
    1. Compute weights
    2. totalWeight = sum
    3. r = Math.random() * totalWeight
    4. Walk array accumulating until sum > r → return that server

Export selectServer(servers):
  filterAvailableServers() → weightedRandomSelect()
  Returns server or null.

Export getStickyServer(servers):
  Read "mdp_sticky_server" from localStorage.
  Return URL only if it exists in the servers array.
  Returns string or null. try/catch.

Export setStickyServer(url): write to localStorage. try/catch.
Export clearStickyServer(): remove from localStorage. try/catch.

Full JSDoc on all exports.

── FILE A15 — frontend/src/fetchWithFailover.js ─────────────────────────

Module-level constant:
  const REQUEST_TIMEOUT_MS =
    parseInt(import.meta.env.VITE_REQUEST_TIMEOUT_MS ?? '5000', 10)

Export async fetchWithFailover(endpoint, options, servers):
  @param endpoint  string starting with "/"
  @param options   fetch options + required idempotencyKey string
  @param servers   array from WebSocket snapshot
  @throws TypeError if idempotencyKey missing or empty string
  @throws Error("NO_HEALTHY_SERVERS")
  @throws Error("ALL_SERVERS_FAILED")

  1. Throw TypeError if options.idempotencyKey falsy
  2. filterAvailableServers(servers) → available
     If empty → throw NO_HEALTHY_SERVERS
  3. Build ordered attempt list:
     a. getStickyServer(available) → if not null, put first
     b. Fill remaining by calling weightedRandomSelect() on remaining
        servers, removing each picked one from the pool, until all
        available servers are assigned a position
        Result: fully ordered, no duplicates
  4. For each server in attempt list:
     a. Skip if isCircuitOpen(server.url) (may have opened since step 2)
     b. AbortController + setTimeout(REQUEST_TIMEOUT_MS)
        → controller.abort()
        ALWAYS clearTimeout in finally block
     c. headers = { ...options.headers,
                    "Idempotency-Key": options.idempotencyKey,
                    "Content-Type": "application/json" }
     d. fetch(server.url + endpoint, { ...options, signal, headers })
     e. On response.ok:
          clearTimeout (via finally)
          resetServer(server.url)
          setStickyServer(server.url)
          console.info('[Failover] success:', server.url + endpoint)
          return response
     f. On any failure:
          markServerFailed(server.url)
          console.warn('[Failover] failed:', server.url, '— trying next')
          continue
  5. throw new Error("ALL_SERVERS_FAILED")

Full JSDoc with all @param @returns @throws documented.

── FILE A16 — frontend/src/useServerRegistry.js ─────────────────────────

React hook. No Firebase.

Export useServerRegistry() → { servers, updatedAt, connected }

  State: servers=[], updatedAt=null, connected=false
  Ref: clientRef (holds wsClient instance)

  useEffect (runs once on mount):
    1. createWsClient() → clientRef.current
    2. getLastSnapshot() → if not null, setServers + setUpdatedAt immediately
       (crash fallback hydration)
    3. subscribe(callback):
         callback receives { servers, updatedAt }
         setServers(snapshot.servers)
         setUpdatedAt(snapshot.updatedAt)
         setConnected(true)  ← true on first data received
    4. Cleanup: unsubscribe(callback) + disconnect()

  connected = true only after first message received, not on WS open.
  This lets consumers distinguish "never had data" from "connected,
  no healthy servers right now".

Full JSDoc.

── FILE A17 — frontend/src/ExampleComponent.jsx ─────────────────────────

Full demo. Inline styles only. No external libraries.

Sections:
  1. Connection status bar
     connected → green badge "Live"
     !connected && servers.length > 0 → amber badge "Reconnecting (cached)"
     !connected && servers.length === 0 → amber badge "Connecting..."

  2. Server table
     Columns: URL | Score | Priority | Weight | Circuit
     Weight = (1/(score+0.01)).toFixed(2)
     Circuit = isCircuitOpen(url) → red "open" | green "closed"
     Empty+connected → "No healthy servers"
     Empty+!connected → "Connecting to aggregator..."

  3. GET request button
     fetchWithFailover("/api/example",
       { method:"GET", idempotencyKey:crypto.randomUUID() }, servers)
     Shows response JSON. Shows error string on failure.

  4. POST request button
     fetchWithFailover("/api/order",
       { method:"POST", body:JSON.stringify({item:"test"}),
         idempotencyKey:crypto.randomUUID() }, servers)
     Shows response JSON. Note: key randomized per click = new operation.

  5. Circuit breaker panel
     getFailedServers() on render and after each request.
     List failed servers + cooldown expiry time.

useState per button: response, error, loading.

── FILE A18 — frontend/.env.example ─────────────────────────────────────

  VITE_AGGREGATOR_WS_URL     # ws://your-aggregator-ip:4001
  VITE_REQUEST_TIMEOUT_MS    # 5000

── FILE A19 — redis/redis.conf ──────────────────────────────────────────

With inline comments explaining each directive:

  bind 127.0.0.1
  requirepass <REDIS_PASSWORD>
  appendonly yes
  appendfsync everysec
  save ""
  maxmemory 128mb
  maxmemory-policy allkeys-lru
  protected-mode yes
  tcp-keepalive 60
  loglevel notice
  logfile /var/log/redis/redis-server.log

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — MIGRATION TOOLING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

All migration files are ES modules. async/await only.
Every Redis and Firestore operation wrapped in try/catch.
All env vars validated at top of each script before any operations.
Use SCAN not KEYS for Redis key enumeration.
Scripts are NOT safe to run twice — migrate.js checks if
mdp:routing:active already exists and aborts if so.

── FILE B1 — migration/migrate.js ───────────────────────────────────────

9-step hard cutover. Runs on the aggregator VPS.
Logs every step to console AND to MIGRATION_LOG_PATH file.
On any step failure: log error, print "MIGRATION FAILED at step N —
run rollback.js to restore V1", exit code 1. Do not proceed.

Required env vars (validated at startup):
  GOOGLE_APPLICATION_CREDENTIALS
  FIREBASE_PROJECT_ID
  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
  BACKEND_SERVER_IDS      comma-separated e.g. "server-1,server-2"
  V2_BACKEND_ENV_PATH     path to backend/.env (existence check only)
  V2_AGGREGATOR_ENV_PATH  path to aggregator/.env (existence check only)
  WS_PORT
  MIGRATION_LOG_PATH
  AGGREGATOR_DIR          absolute path to aggregator/ directory
  BACKEND_DIR             absolute path to backend/ directory

STEP 1 — Pre-flight checks
  a. GOOGLE_APPLICATION_CREDENTIALS file exists and is readable
  b. V2_BACKEND_ENV_PATH file exists
  c. V2_AGGREGATOR_ENV_PATH file exists
  d. Redis ping → "PONG"
  e. Firebase Admin init + read 1 doc from "servers" collection
  f. pm2 --version succeeds
  g. Check mdp:routing:active does NOT exist in Redis.
     If it does → abort "Migration appears already run."
  Log: "Pre-flight checks passed."

STEP 2 — Snapshot V1 Firestore data
  Read ALL docs from "servers" collection.
  Store as v1Snapshot = [{ id, ...data }]
  Write to MIGRATION_LOG_PATH + ".snapshot.json"
  Log: "Snapshotted N servers: [ids]"

STEP 3 — Stop V1 backend processes
  pm2 stop mdp-backend  (shell exec, capture stderr)
  await 3 000 ms
  Log: "V1 backends stopped. DOWNTIME BEGINS."

STEP 4 — Seed Redis from V1 snapshot
  For each server in v1Snapshot:
    HSET mdp:server:{id} with all fields.
    Force: status="unhealthy", lastHeartbeat=0, warmup="true"
    (V2 backends set healthy on first heartbeat)
    SADD mdp:servers:index {id}
  Log: "Seeded N servers into Redis."

STEP 5 — Start aggregator
  pm2 start {AGGREGATOR_DIR}/aggregator.js --name mdp-aggregator
  Poll mdp:routing:active every 2s, up to 10s total.
  If not found after 10s → abort with aggregator log hint.
  Log: "Aggregator started, routing snapshot confirmed."

STEP 6 — Start V2 backends
  pm2 start {BACKEND_DIR}/server.js --name mdp-backend
  Poll mdp:routing:active every 5s for 35s.
  After 35s read snapshot and parse servers array.
  If empty → abort with backend log hint.
  Log: "V2 backends started. Healthy: [urls]"

STEP 7 — Delete Firestore data (POINT OF NO RETURN)
  Log: "POINT OF NO RETURN — deleting Firestore data."
  Delete all docs from "servers" using batch deletes (max 500/batch).
  Check + delete "routing" collection if docs exist.
  Check + delete "idempotency" collection if docs exist.
  Log: "Firestore deleted: servers(N), routing(M), idempotency(K)"

STEP 8 — Write cleanup reminder
  Write FIREBASE_CLEANUP.md to project root with instructions:
    - Remove firebase-admin from backend/package.json
    - Delete service account JSON from all VPS instances
    - Remove GOOGLE_APPLICATION_CREDENTIALS from backend .env files
    - Run npm install in backend/ on each VPS
    - Restart: pm2 restart mdp-backend
  Log: "Cleanup reminder written to FIREBASE_CLEANUP.md"

STEP 9 — Done
  Log: "MIGRATION COMPLETE. Downtime window closed."
  Log: "Run: node migration/verify.js"
  Log: completion timestamp.
  Exit code 0.

── FILE B2 — migration/rollback.js ──────────────────────────────────────

Restores V1. Safe only if STEP 7 has NOT yet run.
Print prominent warning at start: if Firestore was already deleted
(step 7 completed), this script cannot restore it automatically.

Required env vars: same as migrate.js.
Also reads: MIGRATION_LOG_PATH + ".snapshot.json"
If snapshot file not found → abort "Cannot rollback — snapshot missing."

STEP R1 — Stop V2 processes
  pm2 stop mdp-aggregator (ignore error if not running)
  pm2 stop mdp-backend    (ignore error if not running)
  await 2 000 ms
  Log: "V2 processes stopped."

STEP R2 — Flush Redis keys
  Use SCAN + DEL loop (COUNT 100) for:
    mdp:server:*
    mdp:idempotency:*
  DEL mdp:servers:index
  DEL mdp:routing:active
  Never use KEYS command.
  Log: "Redis keys flushed."

STEP R3 — Restore Firestore from snapshot
  Read snapshot JSON.
  Batch write all docs back to "servers" collection (max 500/batch).
  Log: "Restored N documents to Firestore."

STEP R4 — Restart V1 backends
  pm2 start mdp-backend
  await 10 000 ms
  Log: "V1 backends restarted."

STEP R5 — Verify V1 heartbeats
  For each server in snapshot, read Firestore doc.
  Warn (do not abort) if lastHeartbeat not updated within 60s.
  Log: "Rollback complete. V1 restored."
  Exit code 0.

── FILE B3 — migration/verify.js ────────────────────────────────────────

6 checks. Exit 0 = all pass. Exit 1 = any required check fails.
Check 6 (Firestore empty) is informational — its failure does not
cause exit 1 but is printed in summary.

Required env vars:
  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, WS_PORT,
  BACKEND_SERVER_IDS, EXPECTED_HEALTHY_COUNT (default 1),
  GOOGLE_APPLICATION_CREDENTIALS (optional — if absent, skip check 6)

CHECK 1 — Redis ping → PONG
CHECK 2 — SMEMBERS mdp:servers:index ≥ 1 entry,
           HGETALL each → non-null
CHECK 3 — GET mdp:routing:active exists, updatedAt within 30s,
           servers.length ≥ EXPECTED_HEALTHY_COUNT
CHECK 4 — WebSocket connect to ws://localhost:{WS_PORT},
           receive first message within 5s, valid JSON with servers array
CHECK 5 — Fetch {url}/health for each server in routing snapshot,
           2xx + { status:"ok" } within 3s each
CHECK 6 — Firebase Admin init, read 1 doc from servers/routing/idempotency,
           all must return 0 docs
           SKIP if GOOGLE_APPLICATION_CREDENTIALS not set

Print PASS/FAIL/SKIPPED per check.
Print final summary. Exit 0 or 1.

── FILE B4 — migration/.env.example ─────────────────────────────────────

All vars with placeholder values and one-line comments:
  GOOGLE_APPLICATION_CREDENTIALS
  FIREBASE_PROJECT_ID
  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
  BACKEND_SERVER_IDS
  V2_BACKEND_ENV_PATH
  V2_AGGREGATOR_ENV_PATH
  WS_PORT
  MIGRATION_LOG_PATH
  AGGREGATOR_DIR
  BACKEND_DIR
  EXPECTED_HEALTHY_COUNT

── FILE B5 — migration/README.migration.md ──────────────────────────────

Human runbook. Plain language. Exact commands.

Sections:

  Overview
    What this does. Expected downtime: ~40–50 seconds (Steps 3–6).
    Point of no return: Step 7 (Firestore deletion).

  Before you start — checklist (operator must confirm ALL)
    [ ] V2 code deployed to all backend VPS instances,
        backend/.env filled
    [ ] V2 aggregator code deployed to aggregator VPS,
        aggregator/.env filled
    [ ] Redis installed and running on aggregator VPS
        Verify: redis-cli -a <password> ping → PONG
    [ ] redis/redis.conf deployed to /etc/redis/redis.conf,
        Redis restarted: systemctl restart redis-server
    [ ] PM2 installed: pm2 --version
    [ ] migration/.env filled from migration/.env.example
    [ ] Users notified of maintenance window

  Multi-VPS note
    migrate.js controls PM2 on the LOCAL machine (aggregator VPS) only.
    If backends run on SEPARATE VPS instances, you must manually
    stop/start their PM2 processes via SSH at Steps 3 and 6.
    Commands to run on each backend VPS:
      Stop V1:  pm2 stop mdp-backend
      Start V2: pm2 start backend/server.js --name mdp-backend

  Running the migration
    cd /path/to/matrix-delivery-platform
    cp migration/.env.example migration/.env
    # fill migration/.env
    node migration/migrate.js

  If migration fails
    Before Step 7: node migration/rollback.js
    At or after Step 7: Firestore already deleted — inspect
      <MIGRATION_LOG_PATH>.snapshot.json for manual recovery.
      Check logs: pm2 logs mdp-aggregator / pm2 logs mdp-backend

  Verifying
    node migration/verify.js
    All checks should print PASS.

  Post-migration cleanup
    Follow FIREBASE_CLEANUP.md written to project root.
    Steps: remove firebase-admin dep, delete service account JSON,
    remove GOOGLE_APPLICATION_CREDENTIALS from .env, npm install,
    pm2 restart mdp-backend on each VPS.

  Rollback window
    Steps 1–6:  full rollback via rollback.js
    Step 7:     point of no return
    Steps 8–9:  no rollback needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE — README.md (replace V1 README entirely)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Sections: Architecture overview (4-tier: backends→Redis→aggregator→frontend),
Redis setup, Aggregator setup (with PM2), Backend setup per VPS,
Frontend setup, Testing failover (two-speed detection: circuit breaker 5s
fast path vs staleness 90s safety net), Testing aggregator crash fallback,
Monitoring (PM2 logs).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL CODE QUALITY — EVERY FILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- async/await only. No .then() chains. No callbacks.
- Full JSDoc on every exported function (@param @returns @throws).
- All tuneable values as named constants or config — zero magic numbers.
- Every Redis operation wrapped in try/catch with meaningful log.
- console.info success, console.warn recoverable, console.error unexpected.
- ES modules throughout. "type":"module" in every package.json.
- No TypeScript. JSDoc types only.
- No shared code between packages — each independently deployable.
- Use SCAN not KEYS everywhere.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL CHECKLIST — VERIFY BEFORE OUTPUTTING A SINGLE LINE OF CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ ] Zero Firebase/Firestore references in any V2 file (PART A)
[ ] GET /health excluded from request counter AND idempotency middleware
[ ] Warmup adds 0.3 THEN clamps to [0,1] before normalization
[ ] normalizeScores handles max===min without dividing by zero
[ ] weightedRandomSelect uses 1/(score+0.01) not 1-score
[ ] Aggregator runs one cycle immediately on startup before first interval
[ ] wsServer sends lastSnapshot to each new client on connect
[ ] wsClient hydrates from getLastSnapshot() on mount (crash fallback)
[ ] Redis string fields parsed to numbers before scoring
[ ] Promise.allSettled used for concurrent health checks
[ ] AbortController timeout always cleared in finally
[ ] idempotencyKey checked before any fetch attempt
[ ] Each package has its own config.js with startup validation
[ ] redis.conf has bind 127.0.0.1 not 0.0.0.0
[ ] mdp:servers:index used for server enumeration
[ ] All localStorage access wrapped in try/catch
[ ] migrate.js aborts if mdp:routing:active already exists (idempotency guard)
[ ] rollback.js uses SCAN not KEYS for Redis cleanup
[ ] verify.js exits 0 only when all required checks pass
[ ] migration README has exact commands and multi-VPS note

Output every file in full. Output PART A files first, then PART B files.
Do not truncate any file. Do not use placeholders.