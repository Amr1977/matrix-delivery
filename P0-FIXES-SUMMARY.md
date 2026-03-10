# P0 Bug Fixes Summary

**Date:** 2026-03-10  
**Fixed by:** Osama (P0 Bugfix Agent)  
**Audit reference:** AUDIT-BACKEND.md

---

## Bug 1: TypeScript Import Mismatches (13 files fixed)

### Critical — `paymentConfig.ts` (file doesn't exist)
The file `config/paymentConfig.ts` does not exist (only `.ts.bak` backup). These requires would crash at runtime:

| File | Line(s) | Fix |
|------|---------|-----|
| `services/paymentService.js` | 226-227 | `paymentConfig.ts` → `paymentConfig.js` |
| `services/paymentService.js` | 681-682 | `paymentConfig.ts` → `paymentConfig.js` |
| `scripts/deploy-escrow.js` | 12 | `paymentConfig.ts` → `paymentConfig.js` |

### Robustness — removed `.ts` extension from requires
These files are genuine `.ts` modules that work via `ts-node/register`, but best practice is extension-less requires for robust module resolution:

| File | Import fixed |
|------|-------------|
| `database/startup.js:2` | `./init.ts` → `./init` |
| `database/startup.js:142` | `../services/activityTracker.ts` → `../services/activityTracker` |
| `database/startup.js:148` | `../migrationRunner.ts` → `../migrationRunner` |
| `app.js:176` | `./routes/heartbeat.ts` → `./routes/heartbeat` |
| `app.js:3211` | `./services/notificationService.ts` → `./services/notificationService` |
| `server.js:210` | `./services/activityTracker.ts` → `./services/activityTracker` |
| `services/marketplaceOrderService.js:909` | `./notificationService.ts` → `./notificationService` |
| `routes/admin.js:11` | `../services/notificationService.ts` → `../services/notificationService` |
| `routes/payments.js:3` | `../services/paymobService.ts` → `../services/paymobService` |
| `routes/drivers.js:9` | `../services/notificationService.ts` → `../services/notificationService` |
| `scripts/run_test_migrations.js:12` | `../database/init.ts` → `../database/init` |

---

## Bug 2: orderService.js — Variable Reference & Query Bugs

### Fix 2a: `transition.to` → `newStatus`
**Problem:** Code referenced `transition.to` in 4 places, but the variable is `transitionResult` (from `orderFSMRegistry.validateTransition()`), and the next status is already stored in `const newStatus = transitionResult.nextStatus` at line 1244. The variable `transition` is never defined in this scope.

**Fix:** Replaced all `transition.to` references with `newStatus`:
- Line ~1270: idempotency check comparison
- Line ~1272: logger.info message
- Line ~1273: console.log debug message  
- Line ~1277: console.log debug message
- Line ~1412: logger.order success log

### Fix 2b: `ANY($3::text[])` query with string param
**Problem:** Two query assignments overwrote each other:
```js
query = `...WHERE id = $2 AND status = $3`;           // ← correct
query = `...WHERE id = $2 AND status = ANY($3::text[])`;  // ← overwrites! $3 is a plain string
```
The second query expects an array parameter, but `params[2]` is `order.status` (a single string). This would cause a PostgreSQL type error.

**Fix:** Removed the duplicate `ANY($3::text[])` query assignment. Kept the simple `= $3` equality check, which is correct for single-status matching.

---

## Bug 3: Database CHECK Constraint — Missing FSM States

**Problem:** The `orders` table CHECK constraint only allowed 6-7 statuses:
```sql
-- Original schema: pending_bids, accepted, picked_up, in_transit, delivered, cancelled
-- Migration 20260131 added: delivered_pending (7 total)
```

But `config/constants.js` defines 15 ORDER_STATUS values, and the FSM uses all of them:
`pending`, `pending_bids`, `accepted`, `paid`, `assigned`, `picked_up`, `in_transit`, `delivered`, `delivered_pending`, `completed`, `canceled`, `disputed`, `refunded`, `rejected`, `failed`

Any order transitioning to a missing state (e.g., `completed`, `failed`, `refunded`) would fail with a CHECK constraint violation.

**Fix:** Created new migration `backend/migrations/20260310_fix_order_status_check_constraint.sql` that:
1. Drops existing `orders_status_check` constraints
2. Adds a new constraint covering all 16 states (15 from constants + `cancelled` British spelling variant for safety)

---

## Files Modified

| File | Type of change |
|------|---------------|
| `backend/services/paymentService.js` | Fixed `.ts` → `.js` imports (4 occurrences) |
| `backend/services/orderService.js` | Fixed `transition.to` refs + removed bad ANY query |
| `backend/database/startup.js` | Removed `.ts` extensions from 3 requires |
| `backend/app.js` | Removed `.ts` extensions from 2 requires |
| `backend/server.js` | Removed `.ts` extension from 1 require |
| `backend/services/marketplaceOrderService.js` | Removed `.ts` extension from 1 require |
| `backend/routes/admin.js` | Removed `.ts` extension from 1 require |
| `backend/routes/payments.js` | Removed `.ts` extension from 1 require |
| `backend/routes/drivers.js` | Removed `.ts` extension from 1 require |
| `backend/scripts/deploy-escrow.js` | Fixed `.ts` → `.js` import |
| `backend/scripts/run_test_migrations.js` | Removed `.ts` extension from 1 require |

## Files Created

| File | Purpose |
|------|---------|
| `backend/migrations/20260310_fix_order_status_check_constraint.sql` | Expands CHECK constraint to all 16 FSM states |
| `P0-FIXES-SUMMARY.md` | This file |
