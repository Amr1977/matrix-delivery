# Matrix Delivery → Multi-Vendor Marketplace: Architecture Report & Completion Plan

**Repo analyzed:** `github.com/Amr1977/matrix-delivery` (live clone, current `main`)
**Goal:** Turn the existing delivery/ride-hailing platform into a full multi-vendor marketplace-with-delivery product, comparable to Marsool (vendors/stores → catalog → cart → checkout → commission → driver fulfillment → payout).
**Prepared as:** an architecture review + gap analysis + phased plan, to be handed to a local coding agent (opencode/kilocode) via the companion prompt file.

---

## 1. Executive Summary

This is not a greenfield build. A previous pass (visible in `ai/` and `backend/modules/marketplace/`) already scaffolded a real vendor-marketplace layer on top of the delivery platform, and roughly **60% of the backend data model and CRUD surface already exists and is wired into `app.js`**. What's missing is concentrated in four places:

1. **Geospatial store discovery is a stub.** The `stores` table has no coordinates at all — no `lat`/`lng`, no PostGIS `geography` column. The frontend's "nearby stores" UI already anticipates a `501 PostGIS not available` response. This is the single most important gap for a Marsool-style app, where "what's near me" is the core loop.
2. **Frontend marketplace UI is almost nonexistent.** Only two components exist (`BrowseVendors.js`, `VendorSelfDashboard.js`), not wired into primary navigation. There is no store storefront page, no category browser, no item detail/cart UI, no checkout flow, no vendor onboarding form, no admin vendor-approval screen. The backend has no consumer yet.
3. **Architectural inconsistency.** Vendor/Store/Category/Item modules follow the intended `modules/marketplace/{controllers,services,repositories,routes}` pattern mandated in `ai/system_rules.md`. Offers, Cart, Marketplace Orders, and Vendor Payouts were instead bolted onto the legacy flat `backend/controllers|services|repositories` structure. Both patterns now coexist — this needs to be resolved before more code is added, or the module boundary erodes further.
4. **No real background job runner.** `expireOffers`, `processPendingPayouts`-style functions exist as service methods but there's no `node-cron`/queue in `package.json` scheduling them — they're callable, not scheduled. Cart expiry (`expireOldCarts`) doesn't exist at all.

Everything else — vendor lifecycle, store CRUD, category hierarchy, item CRUD with inventory/image columns, cart-per-store, marketplace order + commission calculation (10%, `commission_rate`/`commission_amount` columns), and a vendor payout service — is real, migrated, and reachable via API. The plan below is written against what's actually there, not a rebuild.

---

## 2. Current State Inventory

### 2.1 Stack (confirmed from code, not docs)
- **Backend:** Node.js + Express, single large `backend/app.js` (~116K, i.e. it's a god-file — see §5.5) plus a newer `backend/modules/` tree for marketplace code.
- **DB:** PostgreSQL. PostGIS is *conditionally* enabled at startup (`backend/database/startup.js`) and already used elsewhere for delivery-order geo-filtering (`orderService.js`) with a `geolib` fallback when PostGIS is unavailable — but this pattern was never extended to `stores`.
- **Frontend:** React (CRA-style), Capacitor wrapping for Android/iOS, Electron desktop build.
- **Realtime/payments:** `socket.io`, `stripe`, Paymob/crypto payment modules already present for delivery orders.
- **Mobile:** Android + iOS + Electron targets already configured (Capacitor).
- **Tests:** Large Jest/Cucumber suite (`tests/`, `backend/__tests__`) — marketplace surface is not covered yet (see §5.6).

### 2.2 What already exists and works (backend)

| Domain | Layer present | Location | Pattern |
|---|---|---|---|
| Vendors | repo/service/controller/routes | `backend/modules/marketplace/{controllers,services,repositories,routes}/vendor*.js` + legacy `backend/routes/vendors.js` (duplicate mount) | modular ✅ |
| Stores | repo/service/controller/routes | `backend/modules/marketplace/.../store*.js` | modular ✅ |
| Categories | repo/service/controller/routes | `backend/modules/marketplace/.../category*.js` | modular ✅ |
| Items | repo/service/controller/routes | `backend/modules/marketplace/.../item*.js` | modular ✅ |
| Offers | controller/service/repo/routes | `backend/controllers/offerController.js`, `backend/services/offer{Service,Repository}.js`, `backend/routes/offerRoutes.js` | **legacy flat** ⚠️ |
| Cart | controller/service/repo/routes | `backend/controllers/cartController.js`, `backend/services/cart{Service,Repository}.js`, `backend/repositories/cartRepository.js` (duplicated), `backend/routes/cartRoutes.js` | **legacy flat, and duplicated repo file** ⚠️ |
| Marketplace Orders | service/controller/repo/routes | `backend/services/marketplaceOrderService.js`, `backend/controllers/marketplaceOrderController.js`, `backend/repositories/marketplaceOrderRepository.js`, `backend/routes/marketplaceOrderRoutes.js` | **legacy flat** ⚠️ |
| Vendor Payouts | service/controller/routes | `backend/services/vendorPayoutService.js`, `backend/controllers/vendorPayoutController.js`, `backend/routes/vendorPayoutRoutes.js` | **legacy flat, no repository layer** ⚠️ |
| Vendor FSM | present | `backend/fsm/VendorFSM.js` | — |

Routes are all mounted in `app.js`: `/api/marketplace/vendors`, `/api/marketplace/stores`, `/api/marketplace/categories`, `/api/marketplace/items`, `/api/offers`, `/api/cart`, `/api/marketplace/orders`, `/api/vendors` (legacy, duplicate of marketplace/vendors — see §5.4).

### 2.3 Database migrations already applied (in order)

`010` vendors → `011` stores → `012` categories → `013` items → `014` offers → `015` items.inventory_quantity + image_url → `016` shopping_carts + cart_items (with trigger to bump `updated_at`) → `017` marketplace_orders + marketplace_order_items (commission_rate/commission_amount, delivery_lat/lng, delivery_fee, full status timestamps) → `018` vendor_payouts → `019` verbose multi-FSM tables → `020` COD payment support.

This is a coherent, incrementally-numbered migration chain — good hygiene, keep it going (next migration should be `021`).

**Notable schema gaps found by inspection:**
- `stores` has **no `latitude`/`longitude`/`geography` column** — confirmed by reading `011_create_stores_table.sql` directly. The design doc (`ai/vendor-marketplace-design.md`) specifies `GEOGRAPHY(POINT,4326)` but it was never migrated.
- `stores` has **no `rating` column**, and the existing `reviews` table (`20251223_create_reviews_table.sql`) has no `store_id`/`vendor_id` — the current review system is scoped to delivery orders/drivers only, not vendors or stores.
- `vendors.id` and `stores.vendor_id` are typed inconsistently across files: `010_create_vendors_table.sql` doesn't show an explicit type override, but `011_create_stores_table.sql` and `017_create_marketplace_orders_tables.sql` both declare `vendor_id VARCHAR(255) REFERENCES vendors(id)` — confirm `vendors.id` is actually `VARCHAR`, not `SERIAL`, before writing new FKs (the original design doc assumed `SERIAL`; reality diverged). Get this wrong once more and you'll get a silent join bug.
- No full-text search index (`GIN`/`tsvector`) on `items.name`/`description` — "search for a product across all stores" will be a slow `ILIKE` scan.
- No `expires_at` cleanup job for `shopping_carts` despite the column existing (default `+7 days`).

### 2.4 What exists on the frontend
- `BrowseVendors.js`: a list/search UI calling `/browse/vendors` and `/browse/vendors-near` (the latter already coded to expect and handle a 501 from a missing PostGIS path).
- `VendorSelfDashboard.js`: a vendor-facing dashboard shell.
- **Nothing else.** No store detail/storefront page, no category tree UI, no item grid, no item detail, no add-to-cart UI, no cart page, no checkout page, no order-tracking view for marketplace orders, no vendor onboarding/registration form, no admin vendor-approval UI, no vendor item-management UI (add/edit item, upload image, set inventory), no offers/promo UI.
- Neither existing component appears wired into main app navigation/routing in an obviously discoverable way — confirm before assuming any of this is customer-reachable today.

### 2.5 Housekeeping debt worth flagging (not marketplace-specific, but will get in the way)
- `backend/app.js` is ~116K and there are two dated `.bak` copies of it (`app.js.bak-20260330-063146`, `app.js.bak-20260330-224435`) committed to the repo — these should not ship in the repo; they bloat every clone and are a merge-conflict/secret-leak risk.
- Several services have `.bak` siblings committed (`vendorPayoutService.js.bak`, `.bak-20260310-133259`, `marketplaceOrderService.js.bak`). Same issue.
- `backend/backups/` (2.6M) and `backend/artifacts/` (1.3M) are committed — verify nothing sensitive (DB dumps, credentials) is in there; this is exactly the class of issue your prior refactor already flagged for the delivery codebase (committed Firebase credentials).
- `ai/schema.sql` is a 0-byte file — either populate it as the canonical current-schema snapshot or delete it; a promised-but-empty file is worse than no file.
- `ai/roadmap.md` is stale — every box is unchecked even though vendors/stores/categories/items/offers/carts are implemented. Update it or the next agent (human or AI) will re-do finished work.

---

## 3. Gap Analysis vs. a Marsool-style Marketplace

Marsool-class product expectations, mapped against current reality:

| Capability | Status | Notes |
|---|---|---|
| Vendor registration + admin approval | ✅ built | `VendorFSM.js` + approve/reject endpoints exist |
| Store CRUD | ✅ built | no geo yet |
| Category tree | ✅ built | circular-reference check exists |
| Item catalog + inventory + images | ✅ built | image upload via Multer route not yet confirmed wired to item controller — verify |
| Offers/discounts | ✅ built (flat structure) | expiration is callable, not scheduled |
| Single-store cart | ✅ built | no expiry job |
| Checkout → marketplace order w/ commission | ✅ built | commission math confirmed correct (10% default, stored per-order) |
| Delivery fulfillment of marketplace orders | ✅ likely reusable | `marketplace_orders` carries `delivery_lat/lng`; existing driver-assignment/FSM/tracking infra should attach, but **no code confirms a driver ever gets assigned to a `marketplace_order`** — the existing `assignDriver`-style logic lives in the delivery order path; verify it's actually invoked from `marketplaceOrderService.js` |
| Vendor payouts | ✅ built | no scheduled run |
| "Stores near me" | ❌ stub | no coordinates on `stores` at all |
| Product search across vendors | ❌ missing | no index, no endpoint beyond per-store browse |
| Vendor/store ratings | ❌ missing | `reviews` table doesn't reference stores/vendors |
| Customer-facing storefront UI | ❌ missing | almost entirely absent |
| Vendor catalog-management UI | ❌ missing | dashboard shell exists, no item CRUD screens |
| Admin marketplace console (approve vendors, disputes, audit log) | ❌ missing | `marketplace_audit_logs` table from the design doc was never migrated |
| Notifications to vendor on new order | ❓ unconfirmed | FCM infra exists platform-wide; verify it's triggered from `marketplaceOrderService.js` |
| Background jobs (offer expiry, cart cleanup, payout run) | ❌ missing scheduler | functions exist, nothing calls them on a timer |
| Rate limiting / upload validation on marketplace routes specifically | ❓ unconfirmed | platform has rate limiting elsewhere; verify it's applied to `/api/marketplace/*` |
| Automated test coverage for marketplace flows | ❌ missing | no marketplace-specific specs found in `tests/` |

---

## 4. Target Architecture (what "done" should look like)

Keep the existing stack — do not introduce a second database, a second framework, or microservices. This is a modular-monolith extension, matching `ai/system_rules.md`'s own rule #1 ("backend must remain modular") and rule #5 ("avoid modifying existing order logic unless required").

```
backend/modules/marketplace/
 ├── controllers/   vendor, store, category, item, offer, cart, order, payout
 ├── services/      vendor, store, category, item, offer, cart, order, payout, search
 ├── repositories/  (same set)
 ├── routes/        (same set)
 └── jobs/          offerExpiry.js, cartCleanup.js, payoutRun.js  (registered with node-cron)
```

**Migration work required to reach this:** move `offer*`, `cart*`, `marketplaceOrder*`, `vendorPayout*` from the legacy flat directories into `modules/marketplace/*`, updating `require()` paths in `app.js`. This is mechanical (no logic change) but must be done as its own step, behind tests, before new features land on top of the inconsistent structure — otherwise every new feature has to choose which pattern to copy.

**New pieces to add, not move:**
- `stores.location GEOGRAPHY(POINT,4326)` + GIST index, with a `geolib`-fallback path mirroring the existing pattern in `orderService.js` (don't invent a new fallback strategy — reuse the one that already works for delivery orders).
- `store_reviews` (or extend `reviews` with a nullable `store_id`) for vendor/store ratings, plus a `stores.rating_avg` denormalized column updated on write.
- `items` full-text search: `tsvector` generated column + GIN index; a `GET /api/marketplace/search?q=` endpoint spanning all stores.
- `marketplace_audit_logs` table (from the original design doc, never migrated) — admin actions (approve/reject vendor, deactivate store, resolve dispute) should write here.
- `node-cron` (already absent from `package.json`) registered at server boot for: offer expiry (hourly), cart cleanup (daily), payout run (every 30 min) — matching the cadence already specified in `ai/vendor-marketplace-design.md`.
- Frontend: storefront browse → store page → item grid/detail → cart → checkout, vendor onboarding + item management, admin vendor approval — built as new routed React views, reusing the existing i18n (`useI18n`) and API-call conventions visible in `BrowseVendors.js`.

---

## 5. Phased Completion Plan

Each phase is independently shippable and testable. Do not start a phase until the previous one has passing tests — this matches the "incremental migrations only, check before acting" rule already in `ai/marketplace_implementation_prompt.md`, which the agent should keep following.

### Phase 0 — Hygiene (half a day, do this first)
- Remove committed `.bak` files and confirm `backend/backups/`, `backend/artifacts/` don't leak secrets (add to `.gitignore` if they must exist locally).
- Delete or populate `ai/schema.sql`.
- Update `ai/roadmap.md` to reflect actual state (checked boxes for vendor/store/category/item/offer/cart/order/payout).
- Confirm `vendors.id` column type once and document it in `ai/context.md`, so no future migration guesses wrong again.

### Phase 1 — Structural consolidation (1–2 days)
- Move Offers, Cart, Marketplace Orders, Vendor Payouts into `modules/marketplace/*`, matching the Vendor/Store/Category/Item pattern.
- Deduplicate `cartRepository.js` (currently exists in both `backend/services/` and `backend/repositories/` — pick one, delete the other, fix imports).
- Resolve the `/api/vendors` (legacy) vs `/api/marketplace/vendors` route duplication — pick one canonical path, 301/alias the other if backward compatibility is needed by a shipped mobile client.
- No behavior change in this phase; ship it purely as a refactor with the existing test suite green.

### Phase 2 — Geospatial discovery (2–3 days)
- Migration `021_add_location_to_stores.sql`: add `latitude`, `longitude`, and (if PostGIS available) `location GEOGRAPHY(POINT,4326)`, backfill from `address` via geocoding script or leave null for existing rows.
- `storeService.searchNearbyStores(lat, lng, radiusKm)` using the same PostGIS-with-geolib-fallback pattern as `orderService.js` — do not reinvent it.
- Wire `BrowseVendors.js`'s existing `/browse/vendors-near` call to a real, non-501 endpoint.

### Phase 3 — Storefront + checkout UI (1–1.5 weeks, largest phase)
- Store browse (extend `BrowseVendors.js` or replace with store-first browse, since the marketplace is store-centric per the schema).
- Store detail page → category filter → item grid → item detail.
- Cart page (single-store enforced by existing schema constraint), checkout flow hitting `POST /api/marketplace/orders`.
- Order confirmation + status tracking view, reusing existing driver-tracking UI components from the delivery flow wherever the data shapes match.
- Vendor: item management (create/edit/delete, image upload via existing Multer route, inventory adjust), offer creation UI.
- Admin: vendor approval queue, store moderation, `marketplace_audit_logs` viewer.

### Phase 4 — Ratings, search, notifications (3–4 days)
- Store/vendor reviews + denormalized rating.
- Full-text item search endpoint + UI.
- Confirm/complete FCM push on new marketplace order to vendor, and on status change to customer.

### Phase 5 — Background jobs + payout automation (2 days)
- Add `node-cron`, register the three jobs listed in §4.
- Confirm payout run correctness against the commission math already in `vendorPayoutService.js` (spot-checked correct: `payout = total_amount - commission_amount`, default 10%).

### Phase 6 — Delivery integration verification + hardening (2–3 days)
- Trace and confirm (or build, if missing) the path from a confirmed `marketplace_order` to actual driver assignment using the existing delivery-order FSM/dispatch — this is the one integration point the codebase doesn't yet prove out end-to-end.
- Rate limiting + upload validation confirmed on all `/api/marketplace/*` routes.
- Marketplace-specific test suite: vendor lifecycle, store CRUD + geo search, cart single-store constraint, order + commission calculation, payout calculation, inventory can't go negative under concurrent checkout (this last one is a real race condition risk with the current schema — a `SELECT` then `UPDATE` inventory check without row locking will oversell under load; use `SELECT ... FOR UPDATE` or a conditional `UPDATE ... WHERE inventory_quantity >= X` in the checkout transaction).

---

## 6. Key Risks to Call Out to the User

1. **Inventory race condition.** Nothing in the current cart/checkout code was reviewed to confirm row-level locking on `items.inventory_quantity` during checkout. Under concurrent orders for the same low-stock item, this can oversell. Flag this as a correctness bug to fix in Phase 6, not a nice-to-have.
2. **`vendors.id` type ambiguity.** Multiple migrations reference `vendors(id)` as if it's `VARCHAR`, contradicting a naive reading of the original design doc's `SERIAL`. Confirm the live type before Phase 1 touches any of these tables, or a migration will fail or silently create a mismatched FK.
3. **Committed `.bak` files and `backups/`/`artifacts/` directories** are a repeat of the exact class of issue flagged in the prior architectural review (committed credentials) — worth a dedicated look before this feature work, not after.
4. **The "delivery of marketplace orders" link is unproven.** The schema supports it (`delivery_lat/lng` on `marketplace_orders`) but no code path was found that actually assigns a driver to a marketplace order. This is the crux of "delivery like Marsool" and deserves first-class verification, not an assumption that it "just works" because the delivery system exists.

---

## 7. What This Report Does Not Cover

- Payment gateway wiring specifically for marketplace checkout (Stripe/Paymob/crypto modules exist platform-wide; whether they're already parameterized for marketplace order IDs vs. delivery order IDs wasn't traced line-by-line — verify in Phase 3).
- Mobile (Android/iOS/Electron) build implications of new frontend routes — Capacitor config exists but wasn't audited for marketplace-specific deep links.
- Pricing/business-model decisions (commission rate changes, vendor subscription tiers) — these are product decisions, not architecture ones.

---

*Companion file: `MATRIX_MARKETPLACE_AI_AGENT_PROMPT.md` — a ready-to-run prompt for your local coding agent (opencode/kilocode) that operationalizes Phases 0–2 first (the highest-leverage, lowest-risk work), with the rest queued as follow-on milestones.*
