You are a senior Node.js and React engineer implementing a production-grade
client-driven failover and load balancing system for the Matrix Delivery
Platform. Follow every instruction precisely. Do not prototype — write
deployable code.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DECISIONS (LOCKED — DO NOT DEVIATE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Backend auth to Firestore   → Firebase Admin SDK with service account JSON
- Frontend server updates     → onSnapshot (real-time WebSocket listener)
- Failover scope              → ALL endpoints, with idempotency keys
- Frontend framework          → React (hooks only, no class components)
- Heartbeat interval          → 5 000 ms
- Staleness threshold         → 20 000 ms (3× heartbeat + jitter buffer)
- Per-request timeout         → 5 000 ms via AbortController
- Circuit breaker cooldown    → 60 000 ms
- Region field                → DROP from schema and selector; omit entirely
- Offline persistence         → DISABLED on Firebase client SDK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FOLDER STRUCTURE (EXACT — CREATE EVERY FILE LISTED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

matrix-delivery-platform/
├── backend/
│   ├── serverRegistry.js       ← server registration + heartbeat module
│   ├── loadCalculator.js       ← getCurrentLoad() and related utilities
│   ├── server.js               ← Express entry point (example integration)
│   └── .env.example            ← required env vars (no real secrets)
├── frontend/
│   ├── src/
│   │   ├── firebase.js         ← Firebase client SDK init (persistence OFF)
│   │   ├── serverSelector.js   ← server list, filtering, scoring, sorting
│   │   ├── circuitBreaker.js   ← in-memory + localStorage circuit breaker
│   │   ├── fetchWithFailover.js← failover fetch with idempotency + timeout
│   │   ├── useServerRegistry.js← React hook wrapping onSnapshot
│   │   └── ExampleComponent.jsx← example React integration
│   └── .env.example
├── firestore.rules             ← production Firestore security rules
└── README.md                   ← setup and deployment instructions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FIRESTORE SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Collection: servers
Document path: servers/{serverId}

Fields:
  url            string    Base API URL, no trailing slash. e.g. https://api1.example.com
  status         string    "healthy" | "unhealthy"
  currentLoad    number    Active in-flight HTTP request count (integer ≥ 0)
  maxCapacity    number    Max concurrent requests this instance can handle (integer > 0)
  lastHeartbeat  number    Unix timestamp in ms — Date.now() at time of last write
  priority       number    Integer. Lower = preferred when load scores are equal. Default 1.

DO NOT include a region field anywhere.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 1 — backend/loadCalculator.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Implement an atomic active-request counter using a plain integer module-level
variable. Export these functions with full JSDoc:

  createRequestTracker()
    Returns an object { middleware, getCurrentLoad }.
    middleware is Express middleware that:
      - increments the counter on every incoming request
      - decrements the counter on res.on('finish', ...) and res.on('close', ...)
      - never double-decrements (use a boolean flag per request)
    getCurrentLoad() returns the current integer counter value.

  getCpuLoad()
    Returns os.loadavg()[0] (1-minute load average) as a number.
    Used only as a fallback metric — label it clearly in JSDoc.

  computeLoadFactor(currentLoad, maxCapacity)
    Returns currentLoad / maxCapacity clamped to [0, 1].
    Throws TypeError if maxCapacity is 0 or negative.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 2 — backend/serverRegistry.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Use Firebase Admin SDK. Auth via service account JSON file path from env var
GOOGLE_APPLICATION_CREDENTIALS (standard ADC — do not pass the path manually,
just call admin.initializeApp() with no credential argument so ADC picks it up
automatically).

Read all config from environment variables. Required vars:
  FIRESTORE_SERVER_ID      string   Unique identifier for this server instance
  SERVER_URL               string   Public base URL of this server (no trailing slash)
  SERVER_MAX_CAPACITY      number   Max concurrent requests (parse as integer)
  SERVER_PRIORITY          number   Routing priority (parse as integer, default 1)
  GOOGLE_APPLICATION_CREDENTIALS   Path to service account JSON (consumed by ADC)

Export an async function:

  startRegistry({ getCurrentLoad })
    Accepts an object with a getCurrentLoad function (injected from
    loadCalculator.js — do NOT import loadCalculator directly here).

    On call:
      1. Calls registerServer() — writes initial Firestore document with
         status: "healthy", currentLoad: 0, and all config fields.
         Uses set() with merge: true so restart doesn't lose existing data.
      2. Starts a heartbeat interval every 5 000 ms that calls updateHeartbeat().
      3. Registers SIGTERM and SIGINT handlers that call gracefulShutdown().
      4. Returns a stop() function that clears the interval and calls
         gracefulShutdown() — for use in tests or programmatic shutdown.

  registerServer()  (private, not exported)
    Writes the full Firestore document using Admin SDK.

  updateHeartbeat({ getCurrentLoad })  (private, not exported)
    Calls getCurrentLoad(), then does a Firestore update() with:
      status: "healthy"
      currentLoad: <result of getCurrentLoad()>
      lastHeartbeat: Date.now()
    Wraps the Firestore call in try/catch. On error: log the error,
    do NOT crash the process.

  gracefulShutdown()  (private, not exported)
    Calls Firestore update() with status: "unhealthy".
    Awaits the write before the process can exit.
    Called by SIGTERM/SIGINT handlers. Handlers must call process.exit(0)
    AFTER the await resolves, not before.

JSDoc every exported and private function. Use async/await throughout.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 3 — backend/server.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Minimal Express app demonstrating correct integration. Must:
  1. Import createRequestTracker from loadCalculator.js
  2. Call createRequestTracker() and mount middleware with app.use()
  3. Import startRegistry from serverRegistry.js
  4. Call startRegistry({ getCurrentLoad }) after express app is created
     but BEFORE app.listen()
  5. Include CORS middleware using the 'cors' npm package.
     Read allowed origins from env var ALLOWED_ORIGINS (comma-separated).
  6. Include a GET /health endpoint returning JSON:
     { status: "ok", load: getCurrentLoad(), ts: Date.now() }
  7. Include a GET /api/example endpoint that simulates 200ms of async work
     and returns { message: "ok", serverId: process.env.FIRESTORE_SERVER_ID }
  8. Use dotenv to load .env file at the top of the file.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 4 — backend/.env.example
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

List every env var used across all backend files with placeholder values and
a one-line comment explaining each. Include:
  GOOGLE_APPLICATION_CREDENTIALS
  FIRESTORE_SERVER_ID
  SERVER_URL
  SERVER_MAX_CAPACITY
  SERVER_PRIORITY
  PORT
  ALLOWED_ORIGINS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 5 — frontend/src/firebase.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Initialize Firebase client SDK. Read all values from Vite env vars
(import.meta.env.VITE_*). Required vars:
  VITE_FIREBASE_API_KEY
  VITE_FIREBASE_AUTH_DOMAIN
  VITE_FIREBASE_PROJECT_ID
  VITE_FIREBASE_APP_ID

CRITICAL: Do NOT call enableIndexedDbPersistence() or enableMultiTabIndexedDbPersistence().
Offline persistence must remain disabled so stale server states are never read from cache.

Export: app (FirebaseApp), db (Firestore instance).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 6 — frontend/src/circuitBreaker.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Two-layer storage: in-memory Map (primary) + localStorage (survives page
refresh). Cooldown period: 60 000 ms. localStorage key: "mdp_circuit_breaker".

Export these functions with full JSDoc:

  isCircuitOpen(serverUrl)
    Returns true if the server is currently in cooldown.
    Checks in-memory Map first. If not found, checks localStorage.
    If found in localStorage but not memory, hydrates the memory Map.
    Cooldown expired entries are deleted from both layers before returning.

  markServerFailed(serverUrl)
    Records failure timestamp in both the in-memory Map and localStorage.
    Stores as JSON object: { [serverUrl]: timestamp }.
    Reads existing localStorage value, merges the new entry, writes back.

  resetServer(serverUrl)
    Removes the server from both the in-memory Map and localStorage.
    Used when a server succeeds after a circuit was open.

  getFailedServers()
    Returns a plain object snapshot of all currently failed servers
    (url → timestamp). Expired entries are pruned before returning.

All localStorage access must be wrapped in try/catch to handle
private browsing or storage quota errors silently.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 7 — frontend/src/serverSelector.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pure functions — no Firestore imports here. Accepts raw server arrays.
Export with full JSDoc:

  STALENESS_THRESHOLD_MS
    Exported constant: 20000

  isServerHealthy(server)
    Returns true if ALL of:
      - server.status === "healthy"
      - Date.now() - server.lastHeartbeat < STALENESS_THRESHOLD_MS
      - isCircuitOpen(server.url) === false  (import from circuitBreaker.js)
    Returns false otherwise.

  computeLoadScore(server)
    Returns server.currentLoad / server.maxCapacity.
    Returns 1 (fully saturated) if maxCapacity is 0 to avoid division by zero.

  rankServers(servers)
    1. Filters to healthy servers using isServerHealthy()
    2. Checks localStorage for sticky session key "mdp_sticky_server"
       If the stored URL is still in the healthy list, move that server
       to the front of the array before sorting (preserve sticky preference).
    3. Sorts remaining servers: primary key ascending loadScore,
       secondary key ascending priority.
    4. Returns the sorted array (may be empty).

  selectBestServer(servers)
    Calls rankServers(). Returns the first element, or null if list is empty.

  getStickyServer()
    Reads "mdp_sticky_server" from localStorage.
    Returns the URL string or null. Wraps in try/catch.

  setStickyServer(serverUrl)
    Writes serverUrl to localStorage key "mdp_sticky_server".
    Wraps in try/catch.

  clearStickyServer()
    Removes "mdp_sticky_server" from localStorage. Wraps in try/catch.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 8 — frontend/src/fetchWithFailover.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Export one function with full JSDoc:

  async fetchWithFailover(endpoint, options, servers)

  Parameters:
    endpoint  string   Path to append to server base URL. Must start with "/".
    options   object   Standard fetch options PLUS:
                         idempotencyKey  string (REQUIRED — throw if missing)
                         method          string (default "GET")
    servers   array    Current server list from the Firestore snapshot
                       (passed in — do NOT fetch Firestore inside this function)

  Behavior:
    1. Call rankServers(servers) from serverSelector.js.
       If the result is empty, throw new Error("NO_HEALTHY_SERVERS").
    2. Inject the idempotency key into request headers as:
       "Idempotency-Key": options.idempotencyKey
    3. For each server in the ranked list:
       a. Check isCircuitOpen(server.url) — skip if open.
       b. Create an AbortController. Set a 5 000 ms timeout via setTimeout
          that calls controller.abort(). Always clear the timeout in a
          finally block to prevent memory leaks.
       c. Build the full URL: server.url + endpoint
       d. Call fetch() with the AbortController signal and injected headers.
       e. On success (response.ok):
            - Call resetServer(server.url) from circuitBreaker.js
            - Call setStickyServer(server.url) from serverSelector.js
            - Log: console.info(`[Failover] Success: ${server.url}${endpoint}`)
            - Return the Response object.
       f. On failure (network error, abort, or !response.ok):
            - Call markServerFailed(server.url) from circuitBreaker.js
            - Log: console.warn(`[Failover] Failed: ${server.url} — trying next`)
            - Continue to next server.
    4. If all servers fail, throw new Error("ALL_SERVERS_FAILED").

  No infinite loops. The loop iterates over the finite ranked list exactly once.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 9 — frontend/src/useServerRegistry.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

React hook. Export:

  useServerRegistry()

  Internally:
    1. Imports db from firebase.js.
    2. Uses useState to hold: servers (array, default []), loading (bool, default true),
       error (null | Error, default null).
    3. In useEffect (runs once on mount):
       a. Calls onSnapshot on the Firestore collection "servers".
       b. In the snapshot callback:
            - Maps each doc to { id: doc.id, ...doc.data() }
            - Sets servers state with the full array (do NOT filter here —
              filtering happens in serverSelector.js)
            - Sets loading: false
       c. In the snapshot error callback:
            - Sets error to the Firestore error
            - Sets loading: false
       d. Returns the unsubscribe function as the useEffect cleanup.
    4. Returns { servers, loading, error }.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 10 — frontend/src/ExampleComponent.jsx
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Demonstrates end-to-end usage. Must show:
  1. Call useServerRegistry() to get live server list.
  2. Display loading state while snapshot initialises.
  3. Display error state if Firestore connection fails.
  4. Show a ranked server list using rankServers() with each server's
     URL, load score (2 decimal places), priority, and status badge
     (green = healthy / red = unhealthy or stale).
  5. A "Make Request" button that calls fetchWithFailover() with:
       endpoint: "/api/example"
       options: { method: "GET", idempotencyKey: crypto.randomUUID() }
       servers: the live servers array from the hook
  6. Display the response JSON below the button.
  7. Display any error message (NO_HEALTHY_SERVERS, ALL_SERVERS_FAILED, etc.)
     in a clearly styled error block.

Use only React hooks (useState, useEffect). No external UI libraries.
Inline styles only. No CSS files or CSS modules.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 11 — firestore.rules
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Write production Firestore security rules that enforce:

  servers collection:
    - READ: allow for all authenticated AND unauthenticated requests
      (frontend reads without auth via client SDK)
    - WRITE: DENY all from client SDK
      (all writes come from Admin SDK on backend, which bypasses rules)

  All other collections: deny read and write.

Include a comment in the rules file explaining why writes are denied at the
rules level even though Admin SDK bypasses rules — this is defence in depth
to prevent any accidental client-side write path.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FILE 12 — README.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Include these sections:

  Prerequisites
    Node.js ≥ 18, a Firebase project with Firestore enabled, a service account
    JSON with Firestore write permissions.

  Backend setup (per VPS instance)
    1. npm install firebase-admin express cors dotenv
    2. Copy .env.example to .env and fill in values
    3. Set GOOGLE_APPLICATION_CREDENTIALS to the absolute path of your
       service account JSON file
    4. Set a unique FIRESTORE_SERVER_ID per instance (e.g. server-1, server-2)
    5. node server.js

  Frontend setup
    1. npm install firebase
    2. Copy frontend/.env.example to frontend/.env and fill in values
    3. npm run dev (Vite) or npm run build for production

  Deploying multiple backends
    Explain that each VPS runs an identical copy of the backend code with a
    different FIRESTORE_SERVER_ID and SERVER_URL in its .env file.

  Testing failover
    Explain how to kill one backend process and observe the frontend
    automatically routing to the next server within one staleness window
    (≤ 20 seconds).

  Firestore write cost estimate
    Calculate: N servers × 12 writes/min × 60 min × 24 hr = daily write count.
    Show the formula. Note Firebase Spark free tier limit (50 000 writes/day)
    and the break-even server count at that limit (≈ 2 servers).
    Recommend Blaze pay-as-you-go for any production deployment with 3+ servers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL CODE QUALITY RULES (APPLY TO EVERY FILE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- async/await everywhere. No .then() chains, no callbacks.
- Every exported function has a complete JSDoc block:
    @param with type and description for every parameter
    @returns with type and description
    @throws for any thrown errors
- No hardcoded URLs, timeouts, or thresholds anywhere.
  All tuneable values are declared as named constants at the top of the file.
- All environment variable access goes through a validated config object.
  At startup, check that required env vars are set and throw a descriptive
  Error if any are missing — do not let the process start with undefined config.
- Every Firestore operation is wrapped in try/catch with a meaningful log.
- No console.log in library modules — use console.info for success paths and
  console.warn/console.error for failure paths so log levels are filterable.
- ES modules (import/export) throughout. Use "type": "module" in package.json.
- No TypeScript. Plain JavaScript with JSDoc types only.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUCCESS CRITERIA — VERIFY BEFORE FINISHING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before outputting code, mentally verify each of the following:

  [ ] Killing backend process → status set to "unhealthy" via gracefulShutdown
  [ ] Hard crash of backend → detected within 20s via staleness threshold
  [ ] fetchWithFailover iterates the ranked list exactly once — no infinite loop
  [ ] Circuit breaker survives page refresh via localStorage
  [ ] No request is retried on a circuit-open server
  [ ] Idempotency key is injected into every request header
  [ ] AbortController timeout is always cleared in a finally block
  [ ] onSnapshot unsubscribe is called on React component unmount
  [ ] Offline persistence is NOT enabled anywhere in firebase.js
  [ ] Admin SDK uses ADC (no hardcoded credential path in code)
  [ ] CORS is configured from env var, not hardcoded
  [ ] All env vars validated at startup with descriptive errors
  [ ] No region field exists anywhere in code or schema

Output every file completely. Do not truncate, summarise, or use placeholders.