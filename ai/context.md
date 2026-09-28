# Project Context

This repository contains:

- Backend (Node.js + Express)
- Frontend (React)
- PostgreSQL database
- Modules like auth, orders, delivery

Matrix Delivery currently supports:

- Customer orders
- Courier delivery

We have added:

- Vendor marketplace
  - Vendors
  - Stores
  - Catalog
  - Offers
  - Nested categories
  - Carts
  - Platform commission

The database is PostgreSQL.

Key schema facts:

- vendors.id = VARCHAR(255) PRIMARY KEY (not SERIAL — this is important for FK references in new migrations)
- stores.vendor_id = VARCHAR(255) REFERENCES vendors(id) ON DELETE CASCADE
- Migration 021 added latitude/longitude + PostGIS geography to stores
- PostGIS is conditionally enabled at startup (backend/database/startup.js)

Use this file as a high-level project guide.


## Vendor Catalog Schema (Canonical - Model B)

The live production database uses the modular Model B schema for the vendor marketplace.
The older flat vendor_items / vendor_categories tables (Model A) exist but are empty
and deprecated; backend/routes/vendors.js (Model A route file) is not mounted in app.js.

Canonical table hierarchy (migrations 010-023, all applied):

    vendors (id VARCHAR(255) PK)
      -> stores (vendor_id -> vendors.id, has latitude/longitude/geography per migration 021)
            -> categories (store_id -> stores.id, supports nesting via parent_id)
                  -> items (store_id -> stores.id, category_id -> categories.id)
                        -> offers (item_id -> items.id)
            -> shopping_carts (user_id, store_id)
                  -> cart_items (cart_id -> shopping_carts.id, item_id -> items.id)
            -> marketplace_orders (cart_id, store_id, vendor_id, buyer_id)
                  -> marketplace_order_items (order_id -> marketplace_orders.id)
                  -> marketplace_order_vendor_fsm
                  -> marketplace_order_payment_fsm
                  -> marketplace_order_delivery_fsm
            -> vendor_payouts (vendor_id -> vendors.id, order_id -> marketplace_orders.id)

marketplace_reviews (order_id -> marketplace_orders.id, vendor_id -> vendors.id)
marketplace_metrics (KPI snapshots, migration 022)

Migrations 022 (marketplace_metrics) and 023 (marketplace_reviews) were applied to
production on 2026-09-28. database/schema/schema.sql was regenerated via pg_dump
to reflect the full live schema.

SQL bug fix: backend/modules/marketplace/repositories/vendorRepository.js
createVendor had a $13 placeholder with only 12 values - fixed by removing the extra placeholder.

Browse endpoints: /api/browse/items and /api/browse/items-near were updated
to query Model B tables (items JOIN stores JOIN vendors LEFT JOIN categories) instead
of the deprecated Model A vendor_items table. Field aliases (item_name, vendor_name,
vendor_city, stock_qty, is_active) are maintained for frontend compatibility.

New npm scripts:
- db:migrate: apply pending migrations to production
- db:migrate:force: force-apply all migrations (ignores already-exists errors)
- db:schema:dump: regenerate database/schema/schema.sql via pg_dump --schema-only
- db:schema:check: verify schema.sql is not stale relative to migration files (CI gate)
