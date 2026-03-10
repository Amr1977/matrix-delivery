# Matrix Delivery Platform — Frontend Audit

**Audited:** 2026-03-10  
**Codebase:** `/frontend/src/` — 185 source files, ~50,600 LOC  
**Stack:** React 18 + TypeScript (mixed JS/TS) • React Router 7 • Leaflet/react-leaflet • Socket.IO • Firebase (push, analytics, hosting) • Stripe • Capacitor (iOS shell)

---

## 1. App Structure & Routing

**Router:** `createBrowserRouter` (React Router v7) defined at the bottom of `App.js`.

| Route | Component | Notes |
|---|---|---|
| `/` | `MatrixLanding` | Marketing landing page |
| `/app` | `MainApp` | Main authenticated dashboard |
| `/login` | `MainApp` | Login form (state toggle in MainApp) |
| `/register` | `MainApp` | Registration form |
| `/create-order` | `CreateOrderPage` | Standalone order creation page |
| `/reviews` | `ReviewsPage` | Reviews listing |
| `/chat/:orderId` | `ChatPage` | Order-specific messaging |
| `/balance` | `BalanceDashboardPage` | Wallet/balance dashboard |
| `/balance/transactions` | `TransactionHistoryPage` | Transaction history |
| `/balance/statement` | `BalanceStatementPage` | PDF statements |
| `/landing` | `MatrixLanding` | Alias for `/` |
| `*` | Redirect → `/` | Catch-all |

**Architecture concern:** `App.js` is a **2,945-line monolith**. It contains all state, all handlers, all modals, and both auth + main app rendering. This is the single biggest maintainability risk in the codebase. Sub-views (admin, earnings, location settings, legal pages, profile) are toggled via a `viewType` state variable rather than proper routes.

---

## 2. Pages

| Page | Status | Notes |
|---|---|---|
| `MatrixLanding.tsx` | ✅ Complete | Marketing landing page |
| `CreateOrderPage.js` | ✅ Functional | Wraps `updated-order-creation-form.js` (1,840 LOC) — duplicates validation logic from App.js |
| `ProfilePage.js` | ✅ Functional | Profile editing, preferences, payment methods |
| `BalancePages.tsx` | ✅ Functional | Dashboard, transactions, statements — well-structured |
| `ReviewsPage.tsx` | ✅ Functional | Reviews listing |
| `CryptoTest.js` | 🧪 Dev/Test | Crypto wallet testing page — should be removed for production |

---

## 3. Components Catalog

### Core Feature Groups

| Group | Files | Status |
|---|---|---|
| **orders/** | 8 files | ✅ ActiveOrderCard, BidWithLiveLocation, DriverBiddingCard, OrderBiddingSection, OrderStatusSection, LocationFilter |
| **auth/** | 5 files + tests | ✅ LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, EmailVerificationBanner |
| **maps/** | 5 files | ✅ LiveTrackingMap, OrdersMap, DriverBiddingMap, LocationMarker, MapController |
| **messaging/** | 10 files | ✅ ChatPage, ChatInterface, ConversationsList, MessageBubble, VoiceMessagePlayer, MediaViewer, DragDropUpload, MessageReactions |
| **payments/** | 6 files + tests | ✅ StripePaymentForm, PaymobCheckout, PaymentMethodSelector, PaymentMethodsManager |
| **balance/** | 6 files + tests | ✅ BalanceDashboard, TransactionHistory, BalanceStatement, DepositModal, WithdrawalModal |
| **admin/** | 12 files + tests | ✅ AdminDashboard, AdminPaymentsPanel, AdminWalletsPanel, AdminWithdrawalsPanel, SystemHealthDashboard, LogsViewer |
| **driver/** | 3 files + tests | ✅ DriverEarningsDashboard, CashBalanceCard |
| **crypto/** | 3 files + tests | 🧪 WalletConnect, CryptoPayment, DriverEarnings — experimental |
| **layout/** | MainLayout, SideMenu, Footer, SettingsModal, SupportDeveloperModal, ContactUsModal | ✅ Functional |
| **mobile/** | 2 files | ⚠️ CourierDashboardScreen, CustomerHomeScreen — appear to be newer mobile-first screens, not yet integrated into routing |
| **notifications/** | 1 file | ✅ NotificationPanel |
| **push/** | 1 file | ✅ PushNotificationPermission |
| **reviews/** | 1 file | ✅ ReviewModal |
| **legal/** | 5 files | ✅ PrivacyPolicy, TermsOfService, RefundPolicy, DriverAgreement, CookiePolicy |

### Standalone Components (src/components/ root)
- `InteractiveLocationPicker.js` — click-to-pick location on map
- `RoutePreviewMap.js` — route visualization
- `FullscreenMapModal.js` — fullscreen map overlay
- `LocationSelector.js`, `SavedAddressSelector.js` — address management
- `BrowseVendors.js`, `BrowseItems.js` — vendor/marketplace browsing
- `VendorSelfDashboard.js` — vendor self-service
- `RoleSwitcher.js` — role switching UI
- `MobileNavBar.js` — bottom navigation bar
- `MaintenancePage.js` — backend-down fallback
- `DiagnosticWrapper.js`, `SafeRender.js`, `GlobalError.js` — error handling
- `AsyncOrderMap.js` + backup file (should clean up backup)

---

## 4. API Integration

### Dual API Layer (⚠️ inconsistency)

**Old layer** (`src/api.js`):
- Axios-style wrapper using `fetch` with cookie credentials
- Used directly in some components (`api.get('/updates')` in App.js)
- Base URL: `process.env.REACT_APP_API_URL || 'http://localhost:5000/api'`

**New layer** (`src/services/api/`):
- TypeScript API client (`ApiClient`) with CSRF token management
- Service classes: `AuthApi`, `OrdersApi`, `DriversApi`, `UsersApi`, `NotificationsApi`, `ReviewsApi`, `MapsApi`, `platformWalletsApi`
- Cookie-based auth with automatic CSRF fetch and retry on 403
- Used in most of App.js handlers

**Key endpoints called:**
- Auth: `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/switch-role`, `/csrf-token`
- Orders: `/orders`, `/orders/history`, `/orders/:id/bid`, `/orders/:id/accept-bid`, `/orders/:id/status`, `/orders/:id/location`, `/orders/:id/reviews`
- Users: `/users/profile`, `/users/preferences`, `/users/availability`, `/users/:id/reviews/received|given`, `/users/payment-methods`, `/users/favorites`
- Drivers: `/drivers/status`, `/drivers/location`
- Notifications: `/notifications`, `/notifications/:id/read`
- Maps: `/maps/tiles/{z}/{x}/{y}.png`, OSRM routing via `router.project-osrm.org`
- Combined: `/updates` (orders + notifications in one call)
- WebSocket: Socket.IO for real-time notifications

**⚠️ Issue:** Both `api.js` and `services/api/client.ts` are in use simultaneously. The `/updates` endpoint is called through the old `api.js` while most other calls go through `services/api/`. This should be unified.

---

## 5. Auth Flow

**Method:** Custom backend auth with **httpOnly cookies** (not Firebase Auth).

**Flow:**
1. Register: POST `/auth/register` → server sets httpOnly session cookie → GET `/auth/me` to verify
2. Login: POST `/auth/login` → server sets httpOnly session cookie → GET `/auth/me` to verify
3. Session restore: On mount, GET `/auth/me` — if 200, user is authenticated
4. Logout: POST `/auth/logout` → server clears cookie
5. CSRF protection: GET `/csrf-token` before state-changing requests, auto-retry on 403
6. Role switching: POST `/auth/switch-role`

**Security features:**
- reCAPTCHA on login/register (configurable via env var)
- CSRF token management with auto-refresh
- No tokens in localStorage — pure httpOnly cookie auth
- FingerprintJS included in dependencies (device fingerprinting)

**Firebase is NOT used for auth** — it's used only for:
- Push notifications (FCM via `getMessaging`)
- Analytics (`getAnalytics`)
- Hosting (deployment target)

**Status:** ✅ Solid auth flow. Cookie-based auth is more secure than localStorage tokens.

---

## 6. Maps

**Provider:** OpenStreetMap tiles proxied through the backend (`/api/maps/tiles/{z}/{x}/{y}.png`)  
**Library:** Leaflet + react-leaflet  
**Routing:** OSRM (`router.project-osrm.org`) for route calculations + `@mapbox/polyline` for decoding

### Map Components:
| Component | Purpose | Status |
|---|---|---|
| `LiveTrackingMap.js` | Real-time order tracking with driver position, routes, ETA | ✅ Feature-rich — smart polling, visibility-aware |
| `OrdersMap.js` | Shows available orders on map for drivers | ✅ Working |
| `DriverBiddingMap.js` | Shows bidding drivers' locations | ⚠️ TODO: needs real driver location API |
| `InteractiveLocationPicker.js` | Click-to-pick location | ✅ Working |
| `RoutePreviewMap.js` | Route preview between pickup/dropoff | ✅ Working |
| `FullscreenMapModal.js` | Fullscreen map overlay | ✅ Working |

**Location picking in order creation:** The `updated-order-creation-form.js` includes map-based location picking with address fields. Both manual address entry and map pin selection are supported.

**⚠️ Known issues:**
- TODO in `updated-order-creation-form.js`: "currently we are not affecting map upon address change" — map doesn't update when address fields are typed in
- TODO: "on each character change in address fields onAddressChange will be invoked" — performance issue with no debouncing
- Nominatim (OpenStreetMap) used for reverse geocoding — rate-limited, no API key

---

## 7. Mobile Readiness

### Current State: ⚠️ Responsive but not mobile-optimized

**What exists:**
- `Mobile.css` (658 lines) — comprehensive responsive breakpoints at 767px, 480px, 360px
- Safe area insets for notched devices (`env(safe-area-inset-*)`)
- Viewport meta tag programmatically set with `user-scalable=no`
- `MobileNavBar.js` — bottom navigation bar
- `mobileView` state in App.js (detects `window.innerWidth <= 768`)
- Capacitor config (`com.matrix.delivery`) for iOS wrapper
- `@capacitor/ios`, `@capacitor/device` in dependencies

**What's concerning:**
1. **`mobile/` components (`CourierDashboardScreen.tsx`, `CustomerHomeScreen.tsx`) are not integrated** into routing — they exist but aren't used
2. **Massive inline styles throughout App.js** — no consistent design system for mobile
3. **No touch gesture handling** beyond basic clicks
4. **Modal-heavy UI** — notifications, messaging, payments, reviews all use fixed-position modals. On mobile these can be janky
5. **Tailwind is installed** (`tailwindcss` in devDeps) but barely used — most styling is inline
6. **No PWA service worker** for offline support (Firebase messaging SW exists but not for caching)

**For a courier on mobile:**
- ✅ Can log in, view orders, accept bids
- ✅ Location tracking works
- ✅ Push notifications configured
- ⚠️ The driver tab switcher stacks vertically on mobile (6 tabs = lots of scrolling)
- ⚠️ Map interactions may be clunky in small viewports
- ❌ No native app published (Capacitor configured but no `ios/` platform folder detected)

---

## 8. Internationalization (i18n)

**System:** Custom React context (`I18nProvider`) with `localStorage` persistence.

**Supported languages (5):**
| Language | RTL | Status |
|---|---|---|
| English (`en`) | No | ✅ Primary, fully translated |
| Arabic (`ar`) | Yes | ✅ RTL support with `document.dir` |
| Spanish (`es`) | No | ✅ Present |
| French (`fr`) | No | ✅ Present |
| German (`de`) | No | ✅ Present |

**Locales file:** 4,313 lines covering auth, orders, driver, status, reviews, notifications, tracking, common UI strings.

**Implementation:** Dot-notation keys (`t('auth.signIn')`), fallback to key string if missing.

**⚠️ Issues:**
- Some strings in App.js are hardcoded English (e.g., "Orders Map", "My Pending Bids", "My Earnings", review type headers in modals)
- Registration form labels partially untranslated

---

## 9. Known Issues & Code Quality

### 🔴 Critical
1. **App.js monolith (2,945 LOC)** — all state, all handlers, all views in one component. Makes debugging and testing extremely difficult.
2. **Duplicated validation logic** — `handlePublishOrder` in App.js and `CreateOrderPage.js` have nearly identical order validation code.
3. **`updated-order-creation-form.js` (1,840 LOC)** — filename suggests it's a "temp" file that became permanent.
4. **Pickup/dropoff data format inconsistency** — explicitly called out in code: `TODO 🛑🛑🛑!!!!!! BLOODY SHIT !!!!!! UNIFY THE BLOODY PICKUP/DROPOFF RETURNED DATA FORMAT !!!!!!! 🛑🛑🛑🛑`

### 🟡 Moderate
5. **127 `console.log` statements** left in production code — information leak and console noise.
6. **Dual API layers** — `api.js` (old) and `services/api/` (new) both in use.
7. **Backup file in components/** — `AsyncOrderMap.backup.20260310165228.js` should be removed.
8. **`useLocationData.js`** — has a TODO saying "I think this is no longer used and should be deleted."
9. **CryptoTest page** accessible in production — development/testing feature.
10. **Hardcoded localhost fallbacks** in ~18 files — safe (only used when env var missing) but inconsistent ports (one says `3000`, rest say `5000`).

### 🟢 Minor
11. **Mixed JS/TS codebase** — some hooks have both `.js` and `.ts` versions (e.g., `useDriver.js` + `useDriver.ts`).
12. **Firebase API keys in source** — normal for client-side Firebase (restricted by security rules), but all env configs (dev/staging/test/prod) are committed.
13. **No debouncing on address field changes** in order creation form (TODO acknowledged).
14. **`eslint-disable` comments** scattered throughout for `react-hooks/exhaustive-deps`.

### Hardcoded URLs (all safe fallbacks)
All localhost references follow the pattern `process.env.REACT_APP_API_URL || 'http://localhost:5000/api'` — these are development fallbacks and won't affect production. One inconsistency: `Footer.tsx` falls back to port `3000` instead of `5000`.

---

## 10. Build & Deploy

**Build system:** Create React App (`react-scripts 5.0.1`)

**Build scripts:**
- `build:prod` — copies `.env.production`, generates git info, builds with `NODE_OPTIONS=--max-old-space-size=5120`
- Multiple environment configs: `.env.develop`, `.env.staging`, `.env.test`, `.env.testing`, `.env.production`, `.env.lan`

**Deployment:** Firebase Hosting
- `firebase.json` configured with SPA rewrites (`** → /index.html`)
- Project: `matrix-delivery`
- Production API: `https://matrix-delivery-api.mywire.org/api`

**Production environment (.env.production):**
- ✅ API URL configured
- ✅ reCAPTCHA site key
- ✅ Stripe publishable key (test mode: `pk_test_*`)
- ✅ VAPID public key for push notifications
- ⚠️ Stripe is still using **test keys** in production config

**Can it build?** Likely yes, given the comprehensive build scripts and env configs. The `--max-old-space-size=5120` flag suggests the build is memory-hungry (expected for 50K+ LOC).

**Capacitor:** Configured for iOS (`com.matrix.delivery`) but no platform folder generated yet — mobile native build not ready.

---

## 🎯 Critical Path Assessment: Customer Places Order → Courier Accepts on Mobile

### Customer Flow (placing an order):
1. ✅ Register/Login at `/login` or `/register`
2. ✅ Click "Create Order" → navigates to `/create-order`
3. ⚠️ Fill order form (1,840 LOC form component) — works but:
   - Pickup/dropoff data format is inconsistent (known issue)
   - Map doesn't update when typing address
   - No debounce on address fields
4. ✅ Submit order → API call creates order
5. ✅ Wait for bids → real-time notifications via Socket.IO + push
6. ✅ Accept a bid → order moves to accepted state
7. ✅ Track delivery via LiveTrackingMap
8. ✅ Confirm delivery
9. ✅ Leave review

### Courier Flow (accepting an order on mobile):
1. ✅ Register as driver (with vehicle type, location)
2. ✅ Login → lands on driver dashboard
3. ✅ Auto-redirected to "bidding" view if no active orders
4. ⚠️ Need location access — geolocation prompt works, but:
   - If denied, driver sees "Location access denied" error
   - Fake location dev tool still accessible in production
5. ✅ Browse available orders in area
6. ✅ View order on map (OrdersMap)
7. ✅ Place bid with price + message
8. ✅ Get notified when bid accepted (push + in-app + TTS)
9. ✅ Update status: picked_up → in_transit → delivered
10. ✅ Location tracked and sent to backend during delivery

### What blocks the flow:
| Blocker | Severity | Impact |
|---|---|---|
| Stripe test keys in production | 🔴 | Payments won't process real money |
| No native mobile app deployed | 🟡 | Couriers must use mobile browser (works but no push reliability) |
| Location permission UX | 🟡 | If denied, courier is stuck — no graceful fallback |
| Order form data format inconsistency | 🟡 | Can cause order creation failures in edge cases |
| Form doesn't debounce address input | 🟢 | Performance issue, not a blocker |

### What works well:
- ✅ End-to-end order lifecycle is complete
- ✅ Real-time updates via Socket.IO + push notifications
- ✅ Cookie-based auth with CSRF protection
- ✅ OpenStreetMap integration with route visualization
- ✅ Multi-language support (5 languages + RTL)
- ✅ Comprehensive admin panel
- ✅ In-app messaging per order
- ✅ Review system with detailed ratings
- ✅ Balance/wallet system with deposit/withdrawal
- ✅ Driver earnings tracking

---

## Recommendations (Priority Order)

1. **Split App.js** into proper route-based pages with shared context providers. This is the #1 technical debt item.
2. **Unify pickup/dropoff data format** — the "BLOODY SHIT" TODO is a real risk for order creation failures.
3. **Switch Stripe to live keys** before accepting real payments.
4. **Remove dev artifacts** from production: CryptoTest page, backup files, fake location tool, 127 console.logs.
5. **Integrate the mobile/ components** (CourierDashboardScreen, CustomerHomeScreen) — they seem purpose-built but unused.
6. **Unify API layers** — migrate remaining `api.js` calls to `services/api/` TypeScript services.
7. **Add debouncing** to order creation form address fields.
8. **Build and publish** the Capacitor iOS app for couriers who need reliable push notifications.
9. **Fix hardcoded English strings** in driver view titles and review modals.
10. **Add PWA service worker** for offline order viewing and notification reliability.
