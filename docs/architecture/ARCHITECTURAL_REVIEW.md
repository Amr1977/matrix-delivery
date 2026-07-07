# Architectural Analysis: Matrix Delivery Platform

> Generated: 2026-07-07 | Type: Full architectural review | Scope: entire codebase

---

## Executive Summary

This is an ambitious full-stack delivery/ride-hailing platform with **serious architectural debt**. The platform has evolved rapidly (34+ DB migrations, 75+ BDD features, multi-platform support), but this velocity has accumulated significant technical debt across all layers.

**Strengths:** Feature-rich (orders, bidding, real-time tracking, marketplace, payments, wallet, FSM order lifecycle), multi-platform (web, iOS, Android, Electron), comprehensive CI/CD, 75+ BDD feature files, failover architecture.

**Critical Risks:** SQL injection vectors (~3 confirmed), ~3600-line backend monolith, ~4000-line frontend monolith, no centralized error handler, 80+ `useState` in one component, 8+ duplicate DB indexes, minimal test coverage on core paths.

---

## 1. Architecture & Structure

### Positive

- **Feature-rich**: Orders, bidding, real-time tracking, marketplace, payments (Stripe/PayPal/crypto/Paymob), wallet system, FSM-based order lifecycle, multi-platform (web, iOS, Android, Electron)
- **Well-organized folders**: Clear separation of `routes/`, `services/`, `controllers/`, `middleware/`, `fsm/`
- **Event bus** for domain events (though underutilized)
- **Failover architecture**: Frontend has dual-server failover via Firestore/Redis

### Critical Issues

**Monolithic app.js (~3600 lines) and App.js (~4023 lines)**
- Backend `app.js` at `backend/app.js` contains inline route handlers for admin, orders, payments, locations, etc., duplicating logic already in `routes/` and `services/` files
- Frontend `App.js` has 80+ `useState` calls in a single component, massive props drilling (e.g., `ActiveOrderCard` receives 20+ props)
- These are the #1 refactoring priority — maintenance hazard

**No centralized error handler (backend)**
- Express error middleware logs but never sends a response; async crashes in routes without try/catch hang the request
- No global `*` 404 catch-all for unknown API routes
- Error response shapes are inconsistent across endpoints

**No state management library (frontend)**
- 80+ `useState` + 25+ `useEffect` in one component with no Redux/Zustand/Jotai
- State passed through 3-4 component layers via props

**Dual API client systems (frontend)**
- Legacy `api.js` (JS singleton) and modern `services/api/` (TypeScript classes) both exist and are both in active use

---

## 2. Code Quality & Maintainability

### Positive

- **TypeScript API services**: well-structured with generics, typed methods, centralized CSRF handling
- **Custom hooks** (19 of them) for domain logic
- **i18n**: 12 languages via React Context
- **Design system tokens** in `theme.ts` + Tailwind config
- **Consistent parameterized SQL** in most query paths

### Critical Issues

| Issue | Location | Severity |
|-------|----------|----------|
| 3x `verifyAdmin` implementations | `middleware/auth.js:183`, `:210`, inline in `app.js:2056` | High |
| `req.user.primary_role \|\| req.user.primary_role \|\| req.user.primary_role` | `app.js:614` | Medium — copy-paste bug |
| Property name inconsistency | `primary_role` vs `role` across codebase | Medium |
| Rate limiter duplication | `rateLimit.js` + `rateLimiter.js` | Low |
| Backup/dead files in source | `.bak`, `.ts.bak`, `AsyncOrderMap.backup.*` | Low |
| ~25% TypeScript adoption (frontend) | Core app in JS, services in TS, `strict: false` | Medium |
| `console.log` in production | Dozens throughout codebase | Medium |
| 30-day JWT expiry | `authService.js` | Medium |
| `service-key.json` and `.env.production` committed | Contains live credentials | High |

---

## 3. Security Audit

### SQL Injection Vectors — P0

| File | Line | Issue |
|------|------|-------|
| `backend/services/loggingService.js` | 237 | `INTERVAL '${this.logRetentionDays} days'` — **string interpolation into SQL** |
| `backend/scripts/reset-production-db.js` | 62,65 | `DROP/CREATE DATABASE \${dbName}` — unescaped |
| `backend/scripts/migrate_to_neon.js` | 30,45 | `DROP TABLE/IF \${name}` — unescaped |

### Other Security Concerns

- Service-key.json and Firebase admin SDK JSON committed to repo
- CSRF secret falls back to JWT_SECRET — single point of compromise
- Token blacklist fails open when Redis is down
- 50MB JSON body limit — DOS vector
- Nominatim API calls uncached — subject to external rate limits
- `isTest` bypasses all rate limiting — leaks into prod
- Hardcoded CORS origins in `config/express.js`

---

## 4. Database & Performance

### Schema Issues

**~8 pairs of duplicate indexes:**
```
idx_balance_transactions_created_at  ↔  idx_balance_tx_created
idx_balance_transactions_user_id     ↔  idx_balance_tx_user
idx_messages_created                 ↔  idx_messages_created_at
idx_balance_holds_expires            ↔  idx_balance_holds_expires_at
idx_balance_holds_order              ↔  idx_balance_holds_order_id
idx_balance_holds_user               ↔  idx_balance_holds_user_id
idx_location_updates_order           ↔  idx_location_updates_order_id
idx_messages_recipient               ↔  idx_messages_recipient_id
idx_messages_sender                  ↔  idx_messages_sender_id
idx_messages_order                   ↔  idx_messages_order_id
```
Doubles write overhead on those tables.

**`fsm_timeouts.order_id` is INTEGER, `orders.id` is VARCHAR(255)** — FK would fail if enforced.

**VARCHAR(255) primary keys** on most tables instead of UUID type or BIGSERIAL — larger indexes, slower joins.

**57 columns on `orders` table** with `SELECT *` in hot paths.

### Query Performance

**N+1 correlated subqueries** in `orderService.js` `getOrders()` and `getOrderById()`:
- 6 correlated subqueries per row in `getOrderById`
- Same massive query copy-pasted 3x for customer/driver/admin roles
- 300+ subquery executions for 100 orders

**90+ sequential DB round trips on startup** in `database/init.ts`.

**3 separate migration systems** with no single source of truth — root `/migrations/` (8 files) is entirely untracked.

### Missing Indexes
- `emergency_transfers.original_driver_id`
- `platform_reviews.rating`, `platform_reviews.review_type`
- No partitioning on `logs`, `balance_transactions`, `location_updates`

---

## 5. Testing & Quality Assurance

### Positive
- 75+ BDD feature files covering core workflows
- Property-based testing with `fast-check` on critical services
- CI/CD pipelines run lint + tests + security scan on push
- Multi-framework: Jest (unit), Cucumber (BDD), Playwright (E2E)

### Critical Gaps

| Area | Coverage |
|------|----------|
| Core service files (`orderService.js`, `balanceService.js`) | No DB-backed integration tests |
| Route files (30+ files) | Almost no direct route tests |
| Raw SQL query paths | Untested |
| Security (SQL injection, XSS, CSRF) | No tests |
| Load/performance | None |
| `App.js` (4023 lines) | Only a stub test exists |
| `loggingService.js`, `eventBus.js`, `timeoutScheduler.js` | Zero coverage |
| `blockchainService.js`, `paymobService.ts`, `referralService.js` | Zero coverage |

**Infrastructure issues:**
- `backend/__tests__/smoke/api-smoke.test.js:1` contains `process.exit(0)` — kills Jest
- `tests/test-results.json` (5426 lines) is an app log file with `.json` extension
- Test DB setup script missing ~25 tables vs production

---

## 6. DevOps & Infrastructure

### Positive
- Comprehensive CI/CD: GitHub Actions for lint, test, deploy (backend SSH + frontend Firebase), security scan, Android/iOS builds, E2E smoke tests
- PM2 with ecosystem config, log rotation, memory limits
- Docker Compose for local dev (backend + frontend + PostgreSQL + Redis)
- Firebase Hosting for frontend, PM2 on VPS for backend
- Nginx config with security headers, WebSocket support
- Pre-commit hooks: secret scanning (TruffleHog), eslint, large file check

### Issues
- No health check endpoint used in PM2
- Redis config has password in plaintext in `redis/redis.conf`
- No blue/green or zero-downtime deploy

---

## 7. Prioritized Recommendations

### P0 — Must Fix (Security/Correctness)

1. **Fix SQL injection in `loggingService.js:237`** — parameterize the interval value
2. **Add centralized Express error handler** — prevent unhandled async rejections crashing the server
3. **Remove committed secrets** — `backend/service-key.json`, `.env.production`, Firebase keys in `push-notifications/`
4. **Fix `process.exit(0)` in test file** — kills Jest runner

### P1 — Should Fix (Maintainability)

5. **Refactor `app.js`** — extract inline route handlers to proper route/service files
6. **Refactor frontend `App.js`** — extract state management to Zustand/Jotai, break `MainApp` into page-level components
7. **Consolidate dual API clients** — migrate all usage from legacy `api.js` to `services/api/`
8. **Deduplicate `verifyAdmin`** — three implementations, pick one
9. **Remove duplicate DB indexes** — 8+ pairs identified above
10. **Fix `fsm_timeouts.order_id` type mismatch** — INTEGER→VARCHAR(255)

### P2 — Good to Fix (Quality)

11. **Optimize N+1 queries** in `orderService.js` — replace correlated subqueries with joins/LATERAL
12. **Batch DB schema creation** — reduce 90+ startup round trips
13. **Add TypeScript strict mode** — `"strict": true`, migrate core files
14. **Remove dead code** — `.bak` files, commented-out blocks, unused hooks
15. **Remove `console.log` from production code**
16. **Add pagination to all list endpoints**
17. **Reduce 30-day JWT expiry** — 7 days or add refresh tokens
18. **Add integration tests** for top 5 service files with raw SQL
19. **Consolidate 3 migration systems** into single source of truth

### P3 — Long-term Architectural Debt

20. **Adopt query builder (Knex) or ORM** to eliminate raw SQL injection risk
21. **Implement table partitioning** on `logs`, `balance_transactions`, `location_updates`
22. **Add API versioning strategy** — consolidate v0/v1 routes
23. **Implement blue/green deploy** or rolling PM2 restarts
24. **Add load testing** (k6/artillery) for critical paths
25. **Full accessibility audit** — fix WCAG violations

---

## Final Verdict

Matrix Delivery is a **functionally rich but architecturally strained** platform. It does an impressive amount across orders, real-time tracking, payments, marketplace, multi-platform, and internationalization. The failover architecture and FSM-based order lifecycle show thoughtful design.

However, the **~3600-line monoliths**, **SQL injection vectors**, **three `verifyAdmin` implementations**, **~8+ duplicate DB indexes**, and **minimal test coverage on critical paths** represent serious risk. A focused 2-3 week refactoring sprint on P0/P1 items is recommended before adding new features.
