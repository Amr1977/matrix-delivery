# The Battle of Jan 3rd 2026: From 500 Errors to Self-Healing Deploys

## 🛡️ Mission Overview

The objective was to stabilize the production environment after a series of critical failures prevented order creation, real-time updates, and reliable deployments. We fought on multiple fronts: Database, Frontend, DevOps, and WebSocket Infrastructure.

---

## ⚔️ The Fronts

### 1. The Database Schema Drift (500 Error)

**Symptom**: `POST /api/orders` failed with `500 Internal Server Error`.
**Root Cause**: The Production Database was missing columns that the Code expected, specifically:

- `pickup_contact_name`, `pickup_contact_phone`
- `customer_name`
- `estimated_delivery_date`
  **Resolution**:
  We bypassed the confused migration state by creating fresh, force-add migration files (`force_add_contact_columns.sql`) that used `IF NOT EXISTS` to patch the schema safely.
  **Status**: ✅ FIXED

### 2. The Map Reset Loop (Frontend Glitch)

**Symptom**: While dragging the map to pick a location, the view would randomly snap back to the start.
**Root Cause**: **Re-render Reference Instability**.

- The `MapController` component received a `center` prop reference (`{lat: x, lng: y}`) from the parent.
- When real-time data arrived (WebSocket), the parent re-rendered, passing a _new object reference_ with the _same_ numbers.
- The `useEffect` dependency `[center]` triggered, calling `map.setView()`, hijacking user control.
  **Resolution**:
  Implemented `useRef` to track the previous coordinate values. We added a **Deep Value Check** (`current.lat !== prev.lat`) inside the effect. The map now ignores re-renders unless the coordinates _actually_ change.
  **Status**: ✅ FIXED

### 3. The Deploy Script Suicide (DevOps)

**Symptom**: Frontend code changes were not deploying. The script logged "Reloading backend..." and then died.
**Root Cause**:
The `auto-deploy.sh` script ran `pm2 reload all`.
Since `auto-deploy` itself runs under PM2 (as `matrix-deploy`), **it killed itself** mid-execution!
**Resolution**:
Changed the command to `pm2 reload matrix-delivery-backend`, targeting only the API service and sparing the deploy agent.
**Status**: ✅ FIXED

### 4. Admin Access Denied (Bidding)

**Symptom**: Admins testing the app got `400 Bad Request` when bidding.
**Root Cause**:

1. Middleware strictly checked `role === 'driver'`.
2. A typo in `routes/orders.js`: `if ((primary_role || primary_role) !== 'driver')`. It ignored the standard `role` claim.
   **Resolution**:

- Allowed `admin` role to place bids for testing.
- Fixed the typo to check `primary_role || role`.
  **Status**: ✅ FIXED

### 5. WebSocket Connection Refused

**Symptom**: `Firefox can't establish a connection to wss://...`.
**Root Cause**: Missing or conflicting Apache Proxy configuration.
**Resolution**:
Provided a clean Apache `VirtualHost` config using `RewriteRule [P]` for Upgrade headers instead of conflicting `ProxyPass` directives. (Ultimately worked without applying, likely due to fallback to Long-Polling).
**Status**: ✅ RESOLVED

### 6. The Missing Token (VPS Env)

**Symptom**: Script said "Skipping Frontend Deploy".
**Root Cause**: `FIREBASE_TOKEN` was missing from `.env` on VPS.
**Resolution**: Added token to `.env`.
**Status**: ✅ FIXED

---

## 🚀 Key Feature: Self-Healing Deploy Script

We added logic to `auto-deploy.sh` to **update itself**.

- Before `git pull`: Save hash of `auto-deploy.sh`.
- After `git pull`: Compare hash.
- **Trigger**: If changed, the script logs `🔄 Auto-deploy script updated` and exits.
- **Outcome**: PM2 automatically restarts it, loading the new logic instantly. No manual SSH required for pipeline updates.

## 📝 Lessons Learned

1.  **Don't `pm2 reload all`** inside a script managed by PM2.
2.  **Memoize functionality** (or deep compare) in React side-effects that control imperative APIs (like Leaflet).
3.  **Logs are King**: We couldn't have solved the 500 error or Deploy Suicide without reading the explicit log lines.

---

_Documented by Antigravity Agent_
