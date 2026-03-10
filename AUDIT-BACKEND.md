# Matrix Delivery Platform — Backend Audit Report

**Audit Date:** 2026-03-10  
**Codebase:** `/backend/`  
**Auditor:** Osama (Backend Audit Agent)

---

## Executive Summary

The Matrix Delivery backend is a **substantial Node.js/Express/PostgreSQL application** (~3200-line app.js, ~1900-line orderService.js) that implements a **dual-mode delivery platform**: traditional peer-to-peer delivery (customer↔driver bidding) and a marketplace (vendor→customer with courier delivery). The codebase is functional but has several **critical issues that would block production deployment**, primarily around broken TypeScript imports, a monolithic app.js file, and inconsistent FSM state naming between the schema and the code.

### Verdict: 🟡 Near-Production but Needs Targeted Fixes

**What works well:**
- Solid escrow-based payment flow (hold → release → commission split)
- Well-structured FSM for order state management
- Comprehensive auth with JWT, role switching, token blacklisting
- Balance system with deposits, withdrawals, escrow, earnings, commission deduction
- Good security foundation (Helmet, CORS, CSRF, rate limiting)

**What blocks production:**
- 🔴 Broken `.ts` imports in JS files (will crash at runtime)
- 🔴 `paymentService.js` references `.ts` config file (breaks on Stripe/PayPal confirm)
- 🔴 3200-line `app.js` monolith with inline route handlers
- 🔴 Order status CHECK constraint mismatch with actual status values used
- 🟡 `transition.to` referenced but `transition` is not defined (should be `transitionResult.nextStatus`)

---

## 1. Server & Core Setup

### server.js
- **Entry point:** Loads `.env` via `dotenv`, registers `ts-node/register` for TS module loading
- **Port:** `process.env.PORT || 5001`
- **HTTP Server:** Plain HTTP (`http.createServer(app)`) — **TODO: HTTPS noted in code**
- **Socket.IO:** Configured with CORS, optional Redis adapter for PM2 cluster mode
- **Graceful shutdown:** Handles `SIGINT`, flushes activity tracker, stops cleanups
- **Background tasks:** Rate limit cleanup, cache cleanup (5 min), driver location cleanup (6 hrs)

### app.js (3216 lines — 🔴 MONOLITHIC)
- **Middleware stack:** Helmet, CORS, compression, cookie-parser, JSON body parser, Morgan logging, CSRF protection
- **Trust proxy** enabled for reverse proxy deployments
- **Route mounting** at `/api/*` prefix — well organized for extracted routes
- **Problem:** ~1500+ lines of **inline route handlers** (order details, driver location, notifications, payments, location data) that should be in route/controller files
- **CSRF** is applied to all `/api` routes — frontend must obtain token via `GET /api/csrf-token`

### Mounted Routes
| Path | Module |
|------|--------|
| `/api/auth` | routes/auth.js |
| `/api/orders` | routes/orders.js |
| `/api/admin` | routes/admin.js |
| `/api/drivers` | routes/drivers.js |
| `/api/users` | routes/users.js |
| `/api/browse` | routes/browse.js |
| `/api/marketplace/vendors` | modules/marketplace/routes/vendorRoutes |
| `/api/marketplace/stores` | modules/marketplace/routes/storeRoutes |
| `/api/marketplace/categories` | modules/marketplace/routes/categoryRoutes |
| `/api/marketplace/items` | modules/marketplace/routes/itemRoutes |
| `/api/marketplace/orders` | marketplaceOrderRoutes |
| `/api/offers` | routes/offerRoutes |
| `/api/cart` | routes/cartRoutes |
| `/api/reviews` | routes/reviews (TS) |
| `/api/maps` | routes/maps.js |
| `/api/takaful` | routes/takaful.js |
| `/api/emergency` | routes/emergency.js |
| `/api/push` | routes/push.js |
| `/api/health` | routes/health.js |
| `/api/v1` | routes/v1/* |
| `/api/heartbeat` | routes/heartbeat.ts |

---

## 2. Database

### PostgreSQL (via `pg` pool + Neon serverless driver available)
- **Connection:** `DATABASE_URL` env var, SSL optional via `DB_SSL`
- **Schema:** Defined in TypeScript files under `database/schema/` — loaded via `ts-node/register`

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | All accounts (customer, driver, admin, vendor). Has `primary_role`, `granted_roles[]`, `is_verified`, `rating` |
| `orders` | Delivery orders with coordinates, escrow tracking, status, bid price |
| `bids` | Driver bids on orders (price, estimated times, message, location) |
| `user_balances` | Per-user wallet: available, pending, held balances + lifetime stats |
| `balance_transactions` | Full audit trail of all money movement |
| `withdrawal_requests` | Withdrawal flow with PIN verification |
| `balance_holds` | Escrow holds linked to orders |
| `payments` | Stripe/PayPal payment records |
| `wallet_payments` | Manual wallet payments (Vodafone Cash, InstaPay) |
| `platform_revenue` | Commission tracking per order |
| `notifications` | In-app notification records |
| `fcm_tokens` | Firebase push notification tokens |
| `messages` | In-app messaging between users |
| `location_updates` | Order location tracking |
| `driver_locations` | Real-time driver positions |
| `reviews` / `platform_reviews` | Order and platform reviews |
| `password_reset_tokens` | Password reset flow |
| `email_verification_tokens` | Email verification flow |
| `vendors` | Marketplace vendor profiles |
| `vendor_categories` / `vendor_items` | Marketplace catalog |

### Migrations
- **40+ migration files** in `migrations/` — mix of numbered (`006_` to `019_`) and dated (`20251219_` to `20260202_`)
- Schema uses ALTER statements for evolving tables (additive, non-destructive)
- **Migration runner** referenced (`migrationRunner.ts`) but is a `.ts` file

### 🔴 Schema Status Constraint Issue
The `orders` table CREATE statement has:
```sql
CHECK (status IN ('pending_bids', 'accepted', 'picked_up', 'in_transit', 'delivered', 'cancelled'))
```
But the FSM and code use additional statuses: `completed`, `delivered_pending`, `disputed`, `refunded`, `failed`. Migration `20260131_add_order_status_check_constraint.sql` likely fixes this, but need to verify it was applied.

---

## 3. Core Order Flow (Delivery Type)

### Lifecycle: `pending_bids` → `accepted` → `picked_up` → `in_transit` → `delivered` → `delivered_pending` → `completed`

#### 1. Order Creation (`createOrder`)
- Customer submits order with pickup/delivery coordinates, title, price (suggested delivery fee), optional upfront payment
- **Escrow balance check:** Verifies customer has `upfront_payment + price` available
- Order starts in `pending_bids` status
- Generates order number, stores coordinates + addresses

#### 2. Bidding Phase (`placeBid` / `modifyBid` / `withdrawBid`)
- Drivers see available orders and place bids with price, estimated times, message
- Duplicate bid check per driver per order
- Customer sees all bids with driver info (rating, completions, location)

#### 3. Bid Acceptance (`acceptBid`)
- Customer selects winning bid
- **Driver debt check:** `canAcceptOrders()` verifies driver balance above -200 EGP threshold
- **Escrow hold:** `balanceService.holdFunds()` moves `upfront + bidPrice` from customer's available → held balance
- Order transitions to `accepted`, stores `escrow_amount`, `escrow_status = 'held'`
- Notification sent to driver

#### 4. Status Progression (`updateOrderStatus`)
- **pickup** → `picked_up` (driver action)
- **start_transit** → `in_transit` (driver action)
- **complete_delivery** → `delivered` (driver marks delivered)
- **confirm_delivery** → `completed` via `delivered_pending` (customer confirms)

#### 5. Delivery Confirmation (`confirm_delivery`)
- Customer confirms receipt
- **Escrow release:** `balanceService.releaseHold()` with:
  - 10% platform commission
  - 5% Takaful (mutual aid fund) contribution
  - Remaining 85% goes to driver
- Driver's `completed_deliveries` count incremented
- Takaful contribution recorded
- **Idempotency:** `releaseHold` checks for existing EARNINGS/REFUND/ORDER_PAYMENT transactions before processing

#### 6. Cancellation (`cancel`)
- **With driver assigned + travel:** Compensation = base fee (10 EGP) + per-km (3 EGP/km), via `forfeitHold()`
- **With driver but no travel:** Full refund via `releaseHold()`
- **No driver assigned:** Full escrow refund
- Escrow status updated to `forfeited` or `released`

### FSM Implementation
Two FSM classes in `OrderFSMRegistry.js`:
- **`DeliveryOrderFSM`**: For peer-to-peer delivery (the main flow)
- **`MarketplaceOrderFSM`**: For vendor marketplace orders (pending → paid → accepted → assigned → picked_up → delivered → completed)

FSM validates transitions before execution, with guard conditions (though guards are checked but context objects may not always have required data populated).

### 🔴 Bug: Variable Reference Error in `updateOrderStatus`
Around line 1300, the code references `transition.to` but the variable is actually `transitionResult` (from `orderFSMRegistry.validateTransition`). The correct field is `transitionResult.nextStatus`. Same issue: `updateFields[normalizedAction]` query gets overwritten by a second assignment on the next line.

```js
// Bug: overwrites the query with ANY() version but params[2] is still a single string
query = `UPDATE orders SET status = $1, ${updateFields[normalizedAction]} WHERE id = $2 AND status = $3`;
query = `UPDATE orders SET status = $1, ${updateFields[normalizedAction]} WHERE id = $2 AND status = ANY($3::text[])`;
```
The second query expects an array for `$3`, but `params[2]` is `order.status` (a string). This would cause a PostgreSQL error.

---

## 4. Payment Flow

### Money Architecture
The platform uses a **wallet-based escrow system** — not direct card-to-card transfers:

1. **Customer deposits** money into wallet (via Stripe, PayPal, or manual wallet transfer)
2. **Orders use wallet balance** — escrow holds at bid acceptance
3. **Driver earns** from released escrow minus commission
4. **Driver withdraws** from wallet to bank/mobile wallet

### Commission Structure
- **Platform commission:** 10% of delivery fee
- **Takaful fund:** 5% of delivery fee (mutual aid/insurance pool for drivers)
- **Driver receives:** 85% of delivery fee
- Defined in `paymentConfig.js` as `COMMISSION_RATE: 0.15` (15% total)

### Payment Providers

#### Stripe (`paymentService.js`)
- Payment intent creation, confirmation via webhook, refunds
- **🔴 BROKEN:** `confirmPayment()` and `capturePayPalPayment()` both do `require('../config/paymentConfig.ts')` — this references the `.ts.bak` backup file extension. The actual JS file is `paymentConfig.js`. This will crash when Stripe/PayPal webhooks fire.

#### PayPal (`paymentService.js`)
- Order creation, capture, refund
- Same `.ts` import bug as Stripe

#### Paymob (`paymobService.ts`)
- Egyptian payment gateway for local cards and mobile wallets
- **Written in TypeScript** — loaded via ts-node, should work at runtime

#### Manual Wallet Payments (`walletPaymentService.js`)
- Vodafone Cash, InstaPay manual transfer verification
- Admin confirms payment, creates balance transaction
- SMS parser service for automated verification

### Balance Service (`balanceService.js`) — **Well Implemented**
- `holdFunds()` — Escrow: available → held
- `releaseHold()` — Order complete: held → driver earnings (with commission deduction)
- `forfeitHold()` — Cancel with penalty: partial refund + driver compensation
- `deposit()` / `withdraw()` — Standard wallet operations
- `creditEarnings()` / `deductCommission()` — Direct balance operations
- `canAcceptOrders()` — Debt threshold check (-200 EGP max debt)
- **Idempotency:** `releaseHold` locks order row (`SELECT ... FOR UPDATE`) and checks for duplicate transactions
- **Transaction safety:** All operations use PostgreSQL transactions with proper ROLLBACK on error

### Withdrawal Flow
1. User requests withdrawal with amount + destination
2. PIN generated and emailed (if `WITHDRAWAL_PIN_REQUIRED=true`)
3. User verifies with PIN → funds move from available → held
4. Admin reviews pending withdrawals → approve (releases held) or reject (refunds to available)
5. Email notification on approval/rejection

---

## 5. Auth System

### Registration (`authService.registerUser`)
- Validates email format, password (8+ chars), role (`customer` or `driver`)
- Drivers require `vehicle_type`
- Creates user + initializes `user_balances` record (0 EGP)
- Returns JWT token

### Login (`authService.loginUser`)
- Email + password (bcrypt comparison)
- Checks `is_available` (account suspension flag)
- Returns user profile + JWT token

### JWT Tokens
- **Expiry:** 30 days
- **Payload:** `userId`, `email`, `name`, `primary_role`, `granted_roles`
- **Audience:** `matrix-delivery-api`, **Issuer:** `matrix-delivery`
- **Delivery:** Cookie (`token`) or `Authorization: Bearer <token>` header

### Token Blacklisting
- On logout, token stored in Redis with TTL matching remaining expiry
- `verifyToken` middleware checks Redis blacklist
- **Fails open** if Redis is down (allows access) — acceptable for non-critical blacklisting

### Role System
- **Roles:** `customer`, `driver`, `admin`, `vendor`
- **`primary_role`:** Active role (determines UI/permissions)
- **`granted_roles[]`:** All roles user has access to
- **Role switching:** `POST /api/auth/switch-primary_role` — issues new token with new primary role
- **Middleware:** `requireRole(...roles)` checks both `primary_role` and `granted_roles`

### Additional Auth Features
- Password reset (15-min token, email delivery)
- Email verification (24-hr token)
- CSRF protection (double-submit cookie pattern)
- Rate limiting on auth endpoints

---

## 6. Known Issues & Bugs

### 🔴 Critical — Will Crash at Runtime

| Issue | Location | Impact |
|-------|----------|--------|
| **`.ts` imports in `.js` files** | `paymentService.js:226-227`, `paymentService.js:681-682` | Stripe/PayPal payment confirmation crashes. References `paymentConfig.ts` but file is `paymentConfig.js` |
| **`.ts` imports** | `routes/admin.js:11`, `routes/drivers.js:9` | `notificationService.ts` import — works IF ts-node is registered, but fragile |
| **`.ts` imports** | `routes/payments.js:3` | `paymobService.ts` — same concern |
| **`.ts` imports** | `database/startup.js:2,142,148` | `init.ts`, `activityTracker.ts`, `migrationRunner.ts` |
| **`.ts` imports** | `app.js:176` | `heartbeat.ts` |
| **`.ts` imports** | `server.js:210` | `activityTracker.ts` |
| **Variable name mismatch** | `orderService.js:~1300` | `transition.to` used but variable is `transitionResult` with `.nextStatus` |
| **Query overwrite bug** | `orderService.js:~1295-1296` | Second query assignment uses `ANY($3::text[])` but param is a plain string, not array |

### 🟡 Medium — Degraded Functionality

| Issue | Location | Impact |
|-------|----------|--------|
| **Order status CHECK constraint** | `database/schema/orders.ts` | Only allows 6 statuses, but code uses ~12. Migration may fix this. |
| **TODO: HTTPS** | `server.js:21` | Running HTTP only. TLS should be at reverse proxy (Nginx/Caddy), documented but not enforced |
| **TODO: Sanitization** | `services/messagingService.js:17` | "USE PROFESSIONAL SANITIZATION PACKAGE" — XSS risk in messages |
| **TODO: Env config** | `services/fileUploadService.js:25` | Hardcoded values that should be in `.env` |
| **TODO: Customer completed count** | `services/orderService.js:1342` | Only driver's count is incremented on completion, not customer's |
| **TODO: Webhook auth** | `routes/walletPayments.js:212` | Wallet payment webhook lacks authentication |
| **TODO: Admin role check** | `controllers/marketplaceOrderController.js:344,384,422` | Role verification not implemented for admin/driver actions |
| **No Paymob integration for deposits** | `paymentService.js` | Stripe/PayPal only — Paymob service exists (`paymobService.ts`) but not wired to deposit flow |

### 🟢 Low — Cosmetic / Code Quality

| Issue | Location | Impact |
|-------|----------|--------|
| Arabic debug comment | `orderService.js:28` | `// عك يعك عكا!!!!!!!!!!!!!!!!!!!!!` — should be cleaned |
| `.bak` files left in codebase | `services/*.bak` | 3 backup files should be gitignored |
| `app.js` monolith | `app.js` (3216 lines) | Inline route handlers should be extracted to controllers |
| `DEBUG` console.logs | `orderService.js`, `balanceService.js` | Production code has `console.log('[DEBUG]...')` statements |
| Duplicate dotenv loading | `server.js` + `app.js` | Both load `.env` — redundant but harmless |

---

## 7. Dependencies

### package.json Analysis

**Runtime deps (34):** Generally reasonable and well-chosen.

| Dependency | Purpose | Concern |
|------------|---------|---------|
| `express` 4.18.2 | Web framework | ✅ Stable |
| `pg` 8.11.3 | PostgreSQL driver | ✅ |
| `jsonwebtoken` 9.0.2 | JWT auth | ✅ |
| `bcryptjs` 3.0.3 | Password hashing | ✅ |
| `stripe` 20.0.0 | Payments | ✅ |
| `@paypal/checkout-server-sdk` 1.0.3 | Payments | ✅ |
| `socket.io` 4.8.1 | Real-time | ✅ |
| `ioredis` 5.8.2 | Redis client | ✅ Optional |
| `helmet` 7.2.0 | Security headers | ✅ |
| `ethers` 6.9.0 | Blockchain/crypto | ⚠️ Large dep for optional feature |
| `firebase-admin` 13.7.0 | Push notifications | ✅ |
| `sharp` 0.34.5 | Image processing | ✅ |
| `better-sqlite3` 12.5.0 | SQLite | ⚠️ Purpose unclear — maybe local caching? |
| `fluent-ffmpeg` 2.1.3 | Video processing | ⚠️ No obvious use case |
| `ts-node` 10.9.2 | TS runtime | ⚠️ Runtime dep for .ts files — should be build-time |
| `@neondatabase/serverless` 1.0.2 | Neon DB driver | ✅ Cloud PostgreSQL |

**Dev deps (26):** Include Hardhat blockchain tooling, testing (Jest, Cucumber, Supertest), TypeScript.

### Security Concerns
- `ts-node` as runtime dependency is unusual — adds attack surface and startup time
- `ethers` + Hardhat tooling suggests smart contract integration planned but adds significant dependency weight
- No `npm audit` results available, but major deps are current versions

---

## 8. Environment Configuration

### Required Environment Variables

| Variable | Purpose | Critical? |
|----------|---------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | 🔴 Yes |
| `JWT_SECRET` | Token signing | 🔴 Yes |
| `NODE_ENV` | Environment mode | 🔴 Yes |
| `PORT` | Server port (default 5001) | 🟡 |
| `CORS_ORIGIN` | Allowed origins | 🟡 |
| `STRIPE_SECRET_KEY` | Stripe payments | 🟡 (if using Stripe) |
| `PAYPAL_CLIENT_ID` / `_SECRET` | PayPal payments | 🟡 (if using PayPal) |
| `PAYMOB_API_KEY` + integration IDs | Egyptian payments | 🟡 (if using Paymob) |
| `SMTP_HOST` / `_PORT` / `_USER` / `_PASS` | Email service | 🟡 |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Push notifications | 🟡 |
| `REDIS_URL` + `ENABLE_REDIS` | Redis (optional) | 🟢 |
| `FRONTEND_URL` | For PayPal redirects | 🟡 |
| `WITHDRAWAL_PIN_REQUIRED` | Withdrawal security | 🟢 (default true) |

### Config Files
- `config/db.js` — PostgreSQL pool setup
- `config/redis.js` — Optional Redis with graceful fallback to in-memory
- `config/express.js` — Middleware configuration
- `config/paymentConfig.js` — Commission rates, debt thresholds, payment method settings
- `config/logger.js` — Winston logging with daily rotation
- `config/socket.js` — Socket.IO event handlers
- `config/firebase-admin.js` — Firebase Admin SDK initialization
- `config/constants.js` — App-wide constants (statuses, roles)

---

## 9. Production Readiness Checklist

### Must Fix Before Production

- [ ] **Fix all `.ts` imports in `.js` files** — Either:
  - Convert referenced `.ts` files to `.js`, OR  
  - Ensure `ts-node/register` is always loaded before any import (currently only in server.js)
  - **Priority:** The `paymentConfig.ts` references in `paymentService.js` WILL crash payment processing
- [ ] **Fix `orderService.js` variable reference** — `transition.to` → `transitionResult.nextStatus`
- [ ] **Fix query overwrite bug** — The `ANY($3::text[])` query needs array param or revert to `= $3`
- [ ] **Verify order status CHECK constraint** — Ensure migration has been applied to allow all FSM states
- [ ] **Remove debug `console.log` statements** from orderService and balanceService
- [ ] **Add webhook authentication** for wallet payments endpoint
- [ ] **Implement role verification** in marketplace order controller actions

### Should Fix

- [ ] Extract inline route handlers from `app.js` into proper route/controller files
- [ ] Add HTTPS documentation (should be handled by reverse proxy)
- [ ] Use professional HTML sanitization for messaging service
- [ ] Clean up `.bak` files and Arabic debug comments
- [ ] Move `ts-node` to devDependencies if possible (pre-compile TS files instead)
- [ ] Increment customer completed order count on delivery confirmation

### Architecture Notes

- The escrow system is **well-designed** — holds, releases, forfeitures, idempotency checks
- FSM approach is sound but the **verbose DeliveryFSM** (in `fsm/DeliveryFSM.js`) with ultra-long state names isn't used by the main order flow — the simpler `DeliveryOrderFSM` in `OrderFSMRegistry.js` is what's actually called
- The `MultiFSMOrchestrator.js` and `VendorFSM.js` / `PaymentFSM.js` exist for the marketplace flow but aren't fully wired
- Balance system handles negative balances (debt) gracefully with configurable thresholds
- The Takaful (mutual aid) system is a unique and thoughtful feature for driver welfare

---

## 10. Summary: What Blocks the Core Flow

The **order → delivery → payment** flow is **architecturally complete** and well-thought-out. The main blockers are:

1. **`paymentService.js` broken imports** — Payment confirmation will crash. Quick fix: change `require('../config/paymentConfig.ts')` → `require('../config/paymentConfig.js')` (or just `require('../config/paymentConfig')`)
2. **`orderService.js` bugs** — Variable name mismatch and query overwrite in `updateOrderStatus`. These will cause status updates to fail.
3. **Status CHECK constraint** — If migration wasn't applied, orders can't transition to `completed`, `in_transit`, `delivered_pending` etc.

Fix these three and the core flow should work end-to-end. Everything else is hardening and code quality.

---

*Report generated by Backend Audit Agent — March 10, 2026*
