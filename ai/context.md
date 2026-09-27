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
