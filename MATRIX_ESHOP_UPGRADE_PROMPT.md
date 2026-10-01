# AI Coding Agent Prompt — Full-Featured E-Shop Per Store (Photos, Gallery, Storefront)

Paste as a standalone task to your local agent (opencode/kilocode) with `matrix-delivery` as the working directory. Follow `.agent/rules.md` and `AGENTS.md` conventions throughout (parameterized SQL, `services/api/` on the frontend not legacy `api.js`, i18n via `useI18n()`/`locales.js`, security-first per `.agent/rules.md`).

## Current state (verified against the live schema dump, `database/schema/schema.sql`)

- `stores`: `id, vendor_id, name, description, address, phone, email, status, latitude, longitude, location(geography), created_at, updated_at`. **No logo, no cover image, no gallery.**
- `items`: `id, store_id, category_id, name, description, price, status, inventory_quantity, image_url, created_at, updated_at`. **One single `image_url` column — no multi-photo gallery, no ordering, no primary-image flag.**
- `marketplace_reviews` (migration `023`) already has an `images JSONB` column for review photos — that part's done, don't touch it.
- `backend/services/fileUploadService.js` already wraps Multer with **disk storage** — no cloud image host is wired up yet (`cloudinary` is not in `package.json`, no `CLOUDINARY_*` env vars exist).
- Frontend has almost no storefront UI yet (`BrowseVendors.js`, `VendorSelfDashboard.js` only) — this is greenfield UI work, not a refactor.

## Image storage: Cloudinary (decided)

Use Cloudinary rather than local disk for all images this prompt adds (store logo/cover/gallery, item photos). Reasons: no persistent-disk dependency on whatever the backend deploys to, built-in on-the-fly transforms (thumbnail vs. full-size vs. zoom from one stored image via URL params — don't generate/store multiple resolutions server-side), and a generous free tier to start.

- [ ] Add `cloudinary` to `backend/package.json`. Add `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` to `.env`/`.env.example` (get real values from the user — do not invent placeholder credentials that silently fail).
- [ ] Rework `fileUploadService.js`'s upload path: replace the Multer disk-storage config with `multer.memoryStorage()` (or `multer-storage-cloudinary`, your choice) feeding `cloudinary.uploader.upload_stream(...)`. Keep the existing file-type/size validation in front of it — Cloudinary accepting a file doesn't substitute for your own server-side validation (Rule 4 below still applies).
- [ ] Organize uploads into folders by type/owner for sanity in the Cloudinary dashboard, e.g. `matrix-delivery/stores/{storeId}/gallery`, `matrix-delivery/items/{itemId}`, `matrix-delivery/stores/{storeId}/branding`.
- [ ] **Store both the delivered URL and the Cloudinary `public_id`** on every image row (`item_images.image_url` + `item_images.cloudinary_public_id`, same for the store gallery table, and on `stores.logo_url`/`cover_image_url` pair each with a `_public_id` column) — you need the `public_id` to delete or replace an image later; the URL alone isn't enough to call `cloudinary.uploader.destroy()`.
- [ ] Build thumbnail/grid/detail sizes via Cloudinary URL transformation parameters (e.g. `.../upload/w_400,h_400,c_fill/...`) at render time in the frontend, not by uploading multiple pre-resized files.
- [ ] Every delete endpoint (Phase 2 below) must call `cloudinary.uploader.destroy(public_id)` before removing the DB row, so orphaned images don't pile up in the Cloudinary account.

## Target: what "full-featured e-shop per store" means here

- A store has a logo, a cover/banner image, and a photo gallery.
- An item has an ordered set of photos (not just one), with one marked primary/cover for grid thumbnails.
- Customers get a real storefront: store page (banner + logo + about + rating) → category filter → item grid with thumbnails → item detail page with a photo gallery/zoom, price, stock, description, and existing reviews. Not a bare list of names and prices.
- Vendors get an upload UI: drag-and-drop or multi-select for item photos (add/reorder/delete/set primary), single-image pickers for store logo/cover.

## Rules

1. **Route all uploads through the reworked `fileUploadService.js`/Cloudinary path** described above — don't build a second upload pipeline alongside it.
2. **Migrations are additive, next number is `024`.** Never edit an applied migration.
3. **Keep `items.image_url` working during the transition** — treat it as a denormalized "primary image URL" that gets kept in sync with the new gallery table's primary row, so any existing code reading `items.image_url` (browse endpoints, cart line items, order history) doesn't break. Don't rip it out in the same change that adds the gallery.
4. **Validate uploads server-side**: real file-type checks (not just extension/MIME header trust), size limits, and image dimension sanity — this is a security-first codebase per `.agent/rules.md`, treat uploads as hostile input.
5. **Every new endpoint gets an ownership check** — a vendor can only upload/reorder/delete photos for their own store/items (or admin). Mirror the `authorizeVendorManage` pattern already used elsewhere in `backend/modules/marketplace`.
6. **Test after every phase.** Run `npm run test:backend` and `npm run test:frontend`.

## Phase 1 — Schema

- [ ] `024_add_store_branding.sql`: add `logo_url TEXT`, `logo_public_id TEXT`, `cover_image_url TEXT`, `cover_public_id TEXT` to `stores`.
- [ ] `025_create_item_images_table.sql`:
  ```sql
  CREATE TABLE item_images (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX idx_item_images_item_id ON item_images(item_id);
  ```
  Add a partial unique index (or app-level enforcement) so at most one `is_primary = true` row exists per `item_id`.
- [ ] `026_create_store_gallery_table.sql`: same shape as `item_images` (including `cloudinary_public_id`) but `store_id` instead of `item_id`, for the store's general photo gallery (distinct from logo/cover, which are single-value columns on `stores` itself).

## Phase 2 — Backend

- [ ] Extend `backend/modules/marketplace/services/storeService.js` + `storeController.js`/`storeRoutes.js`: `PATCH /api/marketplace/stores/:id/branding` (logo/cover), `POST /api/marketplace/stores/:id/gallery` (upload, uses `fileUploadService`), `DELETE /api/marketplace/stores/:id/gallery/:imageId`, `PATCH /api/marketplace/stores/:id/gallery/reorder`.
- [ ] Same set for items: `POST /api/marketplace/items/:id/images`, `DELETE /api/marketplace/items/:id/images/:imageId`, `PATCH /api/marketplace/items/:id/images/reorder`, `PATCH /api/marketplace/items/:id/images/:imageId/primary` (also updates `items.image_url` to match, per Rule 3).
- [ ] Update `itemService`'s read path (whatever powers browse/item-detail responses) to include the full `images` array alongside the existing `image_url`, so the frontend can build a gallery without a second round-trip.
- [ ] Update `storeService`'s read path to include `logo_url`, `cover_image_url`, and the gallery array.

## Phase 3 — Frontend (build and review one screen at a time)

- [ ] Store page: banner (`cover_image_url` with graceful fallback if null), logo, name, description, address/map pin (you already have `latitude`/`longitude`), rating (pull from `marketplace_reviews` aggregate if that's already exposed — check before building a second aggregation), category filter chips, item grid using each item's primary image as thumbnail.
- [ ] Item detail page: photo gallery (swipe/click-through, not just a static single image), price, stock status from `inventory_quantity`, description, add-to-cart, reviews section (reuse `marketplace_reviews.images` display logic if any review-photo UI already exists elsewhere — check `frontend/src` before building a new gallery component from scratch).
- [ ] Vendor-side: extend `VendorSelfDashboard.js` (or split into a dedicated store-management screen if it's getting large) with: logo/cover pickers, drag-and-drop gallery manager for the store, and a per-item photo manager (upload multiple, drag to reorder, click to set primary, delete).
- [ ] All new user-facing strings go through `useI18n()`/`locales.js` — no hardcoded English.

## Phase 4 — Verify

- [ ] Test: uploading a non-image file to any of these endpoints is rejected server-side.
- [ ] Test: deleting the current primary image auto-promotes another (or clears `items.image_url` to null if none remain) rather than leaving stock UI broken.
- [ ] Test: a vendor cannot upload/delete/reorder photos on another vendor's store or items (403).
- [ ] Manual pass: create a store, add a logo/cover/gallery, add an item with 3 photos, reorder them, set a new primary, confirm the storefront and item detail page reflect it correctly.

## Output format

For each file: path, then full new/changed content in a fenced block (diff acceptable for large files). Summarize what changed and what you tested at the end of each phase before moving to the next.

## Stop conditions

- If real `CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_API_KEY`/`CLOUDINARY_API_SECRET` values aren't available in the environment — stop and ask the user for them (or for them to create a free Cloudinary account and paste the credentials) rather than proceeding with placeholder values that will fail silently at upload time.
