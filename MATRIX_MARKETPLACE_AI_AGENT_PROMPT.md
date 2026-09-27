# AI Coding Agent Prompt — Complete the Matrix Delivery Multi-Vendor Marketplace

Paste this whole file as your system/task prompt to your local agent (opencode, kilocode, etc.) with the `matrix-delivery` repo open as the working directory. It assumes the agent has read/write file access and can run `psql`/migrations locally.

---

## Role

You are a senior full-stack engineer completing an **already-started** vendor marketplace feature on top of the existing Matrix Delivery platform (Node.js + Express + PostgreSQL backend, React frontend). You are **not** starting from scratch. A prior pass already built vendors, stores, categories, items, offers, cart, marketplace orders, and vendor payouts. Your job is to close the specific gaps identified below, in order, without breaking anything that already works.

## Ground truth documents (read these first, in this order)

1. `ai/system_rules.md` — existing engineering rules, still binding.
2. `ai/vendor-marketplace-design.md` — original design intent (note: some of it, e.g. PostGIS on `stores`, was never actually implemented — verify against real code, not this doc, whenever they conflict).
3. `ai/marketplace_implementation_prompt.md` — the original implementation prompt; most of its milestones 1–2 and parts of 3–8 are already done.
4. `MATRIX_MARKETPLACE_ARCHITECTURE_REPORT.md` (companion file to this prompt) — the authoritative current-state gap analysis. Treat its "Phased Completion Plan" (§5) as your backlog, in order.

## Non-negotiable rules

1. **Inspect before writing.** Before touching any table or file, `grep`/read the actual current file — do not assume the design doc is accurate. Several of its claims (PostGIS geography column on `stores`, `SERIAL` vendor IDs) do not match the real migrations.
2. **Do not modify existing delivery-order logic** unless a phase explicitly requires it (Phase 6 integration verification is the only place this is expected).
3. **Migrations are additive and numbered sequentially.** The last applied migration is `020_add_cod_payment_support.sql`. Your next migration is `021_...`. Never edit an already-applied migration file — write a new one.
4. **Follow existing patterns exactly** where they already exist: `modules/marketplace/{controllers,services,repositories,routes}` for Vendor/Store/Category/Item is the target pattern — match it for everything you move or add. Reuse the PostGIS-with-geolib-fallback pattern already implemented in `backend/services/orderService.js` for any new geo code — do not invent a second fallback strategy.
5. **Parameterized SQL only.** No string-concatenated queries.
6. **Every phase ends with passing tests** before you move to the next phase. Run the existing Jest suite after every phase to confirm no regression.
7. **Print a short before/after summary** at the start of each phase (what you found vs. what you're about to change) before generating code, same as the original prompt required.
8. **Do not commit `.bak` files, `backend/backups/`, or `backend/artifacts/` contents.** If you touch anything near them, flag it, don't silently delete — the user should confirm nothing sensitive is in there first.

## Work queue — execute in this exact order

### Phase 0 — Hygiene (do first, small, low-risk)
- [ ] Remove committed `backend/app.js.bak-*` files and any other `.bak` files under `backend/`. Confirm with a `git rm` (not just filesystem delete).
- [ ] Check `backend/backups/` and `backend/artifacts/` for credentials or DB dumps; report findings before deleting anything.
- [ ] Delete the empty `ai/schema.sql`, or regenerate it as a real `pg_dump --schema-only` snapshot — your choice, but don't leave a 0-byte file.
- [ ] Update `ai/roadmap.md` checkboxes to reflect reality (vendor/store/category/item/offer/cart/order/payout = done; geo search/ratings/search/UI/jobs = not done).
- [ ] Confirm the actual column type of `vendors.id` (`\d vendors` in psql, or read the applied migration) and record it in `ai/context.md` in one line, so this stops being ambiguous.

### Phase 1 — Structural consolidation (refactor only, no behavior change)
- [ ] Move `backend/controllers/offerController.js`, `backend/services/offer{Service,Repository}.js`, `backend/routes/offerRoutes.js` into `backend/modules/marketplace/{controllers,services,repositories,routes}/offer*.js`. Update the `require()` in `app.js`.
- [ ] Same move for Cart, Marketplace Orders, Vendor Payouts.
- [ ] Deduplicate `cartRepository.js` — it currently exists in both `backend/services/` and `backend/repositories/`. Diff them, keep the correct one inside `modules/marketplace/repositories/`, delete the other, fix every import.
- [ ] Resolve the `/api/vendors` vs `/api/marketplace/vendors` duplicate mount in `app.js`. Pick `/api/marketplace/vendors` as canonical; keep `/api/vendors` only if you confirm a shipped mobile client depends on it, in which case alias it, don't duplicate logic.
- [ ] Run the full test suite. Nothing about API behavior should change in this phase — if a test fails, you broke something, fix it before continuing.

### Phase 2 — Geospatial store discovery (the highest-value gap)
- [ ] Write migration `021_add_location_to_stores.sql`: add `latitude DECIMAL(10,8)`, `longitude DECIMAL(11,8)`, and, guarded by a PostGIS-availability check matching the pattern in `backend/database/startup.js`, a `location GEOGRAPHY(POINT,4326)` column with a GIST index.
- [ ] Update `storeService.createStore`/`updateStore` to accept and persist lat/lng (and populate `location` if PostGIS is available).
- [ ] Implement `storeService.searchNearbyStores(lat, lng, radiusKm)` mirroring `orderService.js`'s PostGIS-try/geolib-fallback logic exactly — same try/catch shape, same log messages style, so the codebase stays consistent.
- [ ] Wire this to whatever endpoint `frontend/src/components/BrowseVendors.js` already calls (`/browse/vendors-near`) — check what route currently returns 501 and replace its handler with the real implementation. Do not change the frontend's request shape unless it's actually wrong.
- [ ] Test: create two stores with known coordinates, query at a radius that includes one and excludes the other, assert correctly filtered.

### Phase 3 — Storefront + checkout frontend (largest phase — build incrementally, one screen at a time, and stop for review after each)
Build in this order, each as its own component following the existing `useI18n` + `fetch(apiUrl + ...)` convention visible in `BrowseVendors.js`:
- [ ] Store browse/list page (can extend `BrowseVendors.js`).
- [ ] Store detail page with category filter.
- [ ] Item grid + item detail.
- [ ] Add-to-cart + cart page (enforce single-store cart client-side too, even though the backend already enforces it).
- [ ] Checkout flow → `POST /api/marketplace/orders`.
- [ ] Order confirmation/status page — check whether an existing delivery-order tracking component can be reused for marketplace orders before building a new one.
- [ ] Vendor: item management screens (create/edit/delete/image upload — confirm which Multer route already handles item images, wire to it, don't create a second upload path). Offer creation UI.
- [ ] Admin: vendor approval queue, store moderation.
- [ ] Wire all new screens into the app's actual routing/navigation — confirm they're reachable, not just built.

### Phase 4 — Ratings, search, notifications
- [ ] Migration to add `store_id` (nullable) to the existing `reviews` table, or a new `store_reviews` table if mixing scopes into `reviews` is messier — your call, but check the existing `reviews` schema first and prefer extension over duplication if it's clean.
- [ ] Denormalized `stores.rating_avg`, updated on review write (trigger or application-level, match whatever pattern `cart_items`'s `update_cart_updated_at` trigger already establishes for this codebase).
- [ ] `items` full-text search: generated `tsvector` column + GIN index; new `GET /api/marketplace/search?q=` spanning all stores.
- [ ] Confirm (read the code, don't assume) whether FCM push fires on new marketplace order to the vendor and on status change to the customer. If it doesn't, wire it using the existing FCM service used elsewhere in the codebase — don't build a second notification pathway.

### Phase 5 — Background jobs
- [ ] Add `node-cron` to `backend/package.json`.
- [ ] Register three jobs at server boot: offer expiry (hourly, calls existing `expireOffers`), cart cleanup (daily — you'll need to write `expireOldCarts`, it doesn't exist yet, using the `shopping_carts.expires_at` column that's already there), payout run (every 30 min, calls existing `processPendingPayouts`-equivalent in `vendorPayoutService.js`).
- [ ] Log every job run (start, count processed, errors) using the existing logger.

### Phase 6 — Delivery integration verification + correctness hardening (do not skip this)
- [ ] Trace the actual code path from a confirmed `marketplace_order` to driver assignment. If it exists, write a test proving it. If it doesn't exist, build it by calling into the existing delivery-order driver-assignment/FSM logic — do not duplicate dispatch logic.
- [ ] **Fix the inventory race condition**: checkout must decrement `items.inventory_quantity` using either `SELECT ... FOR UPDATE` inside the order transaction, or a conditional `UPDATE items SET inventory_quantity = inventory_quantity - $qty WHERE id = $id AND inventory_quantity >= $qty` and abort the order if the update affects 0 rows. Test this explicitly with a concurrent-request test (fire two checkouts for the last unit of stock, assert only one succeeds).
- [ ] Confirm rate limiting and file-upload validation (type/size) are applied to every `/api/marketplace/*` route, not just the legacy delivery routes.
- [ ] Write a marketplace-specific test file (or set of files) under `tests/` covering: vendor approval lifecycle, store CRUD + geo search, single-store cart constraint, checkout → commission math, payout calculation, and the concurrency test above.

## Output format for every phase

For each change, output:
```
### <file path>
```
followed by a fenced code block with the full new/changed file content (or a diff if the file is large and the change is small — your judgement, but be unambiguous about what changed). End each phase with a one-paragraph summary of what you did and what you verified with tests.

## Stop conditions

Stop and ask the user before proceeding if:
- A migration would need to alter or drop data in a table that already has production rows (confirm environment first).
- You find evidence that `backend/backups/` or `.bak` files contain real credentials.
- The `vendors.id` type turns out to be inconsistent across already-applied migrations (i.e., a real existing bug, not just a doc mismatch) — this needs a human decision on the fix, not a silent migration.
