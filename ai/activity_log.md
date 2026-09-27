# Activity Log

## Phase 6: Delivery Integration Verification + Correctness Hardening

**Completed:**

- Traced marketplace_order → driver assignment path through FSM infrastructure
  - `marketplaceOrderService.js` uses `multiFSMOrchestrator` for delivery FSM
  - Delivery FSM initialized when vendor confirms order
  - `adminAssignDriver()` route exists in marketplaceOrderRoutes.js
  - No automated driver dispatch — requires admin action (confirmed as acceptable)
- Fixed inventory race condition in `marketplaceOrderRepository.createOrder()`
  - Added `SELECT ... FOR UPDATE` row locking before stock deduction
  - Added `rowCount` check on UPDATE — throws and rolls back on concurrent depletion
- Added `orderCreationRateLimit` to `POST /api/marketplace/orders` route
  - Was only protected by global `apiRateLimit` (1000 req/15min)
  - Now has same 100 orders/hour protection as delivery orders
- Updated `tests/unit/repositories/marketplaceOrderRepository.test.js` for new SELECT-FOR-UPDATE mock sequence
- Created `tests/integration/marketplace.integration.test.js` with 7 tests covering:
  - Insufficient stock rollback
  - Concurrent depletion race condition (single winner)
  - Commission calculation math
  - Payout net amount calculation
  - Default 10% commission rate
  - Single-store cart constraint
  - Different-store cart constraint error
- All tests pass (25 total across metrics + repository suites)

## Phase 7: Observability & Production Readiness

**Completed:**

- Created `backend/migrations/022_create_marketplace_metrics_table.sql`
  - Business KPIs table with order flow, finance, vendor performance, timing, error rates
  - 30-day retention with auto-cleanup function
  - Indexes for time-based queries and metric type filtering
- Created `backend/modules/marketplace/services/marketplaceMetricsService.js`
  - `collectMetrics()` — single-transaction KPI collection with rollback
  - `getLatestMetrics()` — most recent snapshot
  - `getMetricsHistory()` — hourly/daily/weekly trend data (capped at 168 hours)
  - `getDashboardSummary()` — latest metrics + pending payouts + alert generation
  - Alert thresholds: inventory conflicts > 0, order failures > 5, cancellation rate > 10%, pending payouts > 50
- Created `backend/modules/marketplace/jobs/metricsCollection.js`
  - Cron job running every 5 minutes (configurable via `MARKETPLACE_METRICS_CRON`)
  - Logs collection results via winston logger
- Registered metrics job in `backend/modules/marketplace/jobs/index.js`
- Created `backend/modules/marketplace/routes/marketplaceMonitoringRoutes.js`
  - `GET /api/marketplace/monitoring/metrics/latest` — latest KPI snapshot
  - `GET /api/marketplace/monitoring/metrics/history` — historical metrics for charts
  - `GET /api/marketplace/monitoring/dashboard` — summary with alerts
  - `POST /api/marketplace/monitoring/metrics/collect` — manual trigger
  - All routes admin-only (verifyToken + requireAdmin)
- Updated `backend/routes/health.js` — added marketplace KPIs to `/api/health`
  - Total marketplace orders, pending/vendor_confirmed/delivered/cancelled counts
  - Order volume (EGP), commission collected (EGP)
- Created `tests/unit/services/marketplaceMetricsService.test.js` — 12 tests covering:
  - Metrics collection with full mock sequence
  - Transaction rollback on error
  - Default 0 values when no data
  - Latest metrics retrieval
  - Null handling
  - History with hour capping (max 168)
  - Metric type filtering
  - Dashboard summary with alerts (inventory conflicts, cancellation rate, pending payouts)
- Updated `ai/roadmap.md` to mark Phase 7 complete
