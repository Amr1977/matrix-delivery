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
