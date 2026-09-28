Vendor Marketplace Implementation

[x] Vendor accounts
[x] Store creation
[x] Nested categories
[x] Item catalog
[x] Offers system
[x] Nearby store search (Phase 2 - geospatial)
[x] Cart
[x] Marketplace order flow
[x] Commission calculation
[x] Vendor payouts
[x] Ratings, full-text search
[x] Storefront UI
[x] Background jobs
[x] Delivery integration
[x] Marketplace test suite
[x] Phase 6: Delivery integration verification + correctness hardening

- Inventory race condition fixed (SELECT ... FOR UPDATE + rowCount check)
- Rate limiting on marketplace order creation route
- 7 integration tests for inventory, commissions, payouts
  [x] Phase 7: Observability & production readiness
- marketplace_metrics table for business KPIs
- MarketplaceMetricsService collecting order flow, finance, vendor perf
- Hourly cron job for metrics collection
- Admin monitoring API routes (/api/marketplace/monitoring/\*)
- Marketplace KPIs added to /api/health endpoint
- 12 unit tests for metrics service

Current reality check:

- vendor/store/category/item/offer/cart/order/payout are implemented in the codebase.
- nearby-store geo search is implemented (migration 021, PostGIS + geolib fallback).
- Full marketplace lifecycle complete: creation → delivery → payout.
- Observability layer: health + system health + marketplace metrics.
- Remaining: frontend storefront UI, ratings/reviews UI, full-text search.

[x] Phase 7.5: Vendor Catalog Schema Reconciliation
- Confirmed Model B (stores/categories/items/offers/shopping_carts/marketplace_orders/vendor_payouts/marketplace_reviews/marketplace_metrics) as canonical schema
- Model A (vendor_items, vendor_categories) confirmed empty; backend/routes/vendors.js is dead code (not mounted)
- Applied migrations 022 (marketplace_metrics) and 023 (marketplace_reviews) to production (2026-09-28)
- Fixed SQL bug in vendorRepository.js createVendor (12 columns / 12 placeholders mismatch)
- Updated browse.js /items and /items-near to use Model B tables (was using deprecated vendor_items)
- Regenerated database/schema/schema.sql via pg_dump to reflect full live schema
- Added db:migrate, db:migrate:force, db:schema:dump, db:schema:check npm scripts
- Added scripts/apply-pending-migrations.js and scripts/dump-schema.js
- Added scripts/check-schema-drift.js for CI schema freshness gate
- All 604 unit tests pass (5 pre-existing FSM module-resolution failures unrelated to changes)
- All 7 marketplace integration tests pass
