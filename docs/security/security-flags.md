# Security Risk Indicators

This document highlights security heuristics and risk indicators identified during the static analysis.

## Critical Risks

### 1. Unauthenticated User Verification Endpoint
- **Risk Type**: Authentication Bypass / Unauthorized Data Modification
- **Location**: `backend/app.js` (line 665) -> `app.post('/api/auth/verify-user', ...)`
- **Issue**: The endpoint does **not** use `verifyToken` or `requireAdmin` middleware. It updates `users` table setting `is_verified = true` based solely on email input.
- **Impact**: Any user can verify any other user's account by knowing their email address.
- **Recommendation**: Add `verifyToken` and `requireAdmin` (or appropriate internal auth). Note that `routes/auth.js` has a similar endpoint `/verify-user` which *does* use `requireRole('admin')`. The inline one in `app.js` seems to be a duplicate or dev leftover.

### 2. Missing Auth on Test Seeding in Production
- **Risk Type**: Logic Flaw / Business Constraint
- **Location**: `backend/app.js` -> `app.post('/api/test/seed')`
- **Issue**: It checks `if (IS_PRODUCTION) return 403`, but does not require authentication.
- **Impact**: If `IS_PRODUCTION` fails or is misconfigured (e.g., set to 'prod' instead of 'production'), any attacker can flood the database with seed data. It should likely require Admin auth regardless of environment.

### 3. Public Frontend Log Submission
- **Risk Type**: Denial of Service (DoS) / Spam
- **Location**: `backend/app.js` -> `app.post('/api/logs/frontend')`
- **Issue**: Publicly accessible endpoint that writes to logs.
- **Impact**: Malicious users can flood the logs, filling up disk space or masking real attacks.

## High Risks

### 1. Inconsistent Middleware Usage
- **Risk Type**: Authorization Bypass
- **Location**: `backend/walletPayments.js` uses `authenticate`, `authorize` (aliases?) while others use `verifyToken`, `requireRole`.
- **Issue**: Inconsistency increases the chance of a developer missing a check or using the wrong one.

### 2. IDOR Potential in Wallet Payments
- **Risk Type**: IDOR
- **Location**: `backend/routes/walletPayments.js` -> `router.get('/:id', ...)`
- **Issue**: Checks `if (req.user.role !== 'admin' && walletPayment.customer_id !== req.user.id)`.
- **Observation**: This logic appears correct *inline*, but relies on the developer to remember it. `verifyBalanceOwnership` middleware exists in `v1` but is not used here.

### 3. Trust Boundary Violation in Order Creation
- **Risk Type**: Mass Assignment / Logic
- **Location**: `backend/routes/orders.js` -> `createOrder`
- **Issue**: The endpoint accepts `req.body` and passes it to `orderService.createOrder`.
- **Risk**: If `req.body` contains fields like `status`, `price`, `assigned_driver_user_id`, a malicious user might be able to set these if the service layer doesn't strictly filter input. (Needs check of `orderService.js`).

## Medium/Low Risks

### 1. Public Browse Endpoints
- **Location**: `/api/browse/vendors`, `/api/browse/items`
- **Issue**: Completely public.
- **Context**: Probably intended for the landing page, but allows scraping of all vendor/item data without an account. Consider rate limiting or requiring an API key if this data is sensitive.

### 2. Verbose Error Messages
- **Issue**: Many endpoints return `error: error.message` in 500 responses.
- **Risk**: Information leakage (Database patterns, internal paths) if exceptions are not sanitized.

## Heuristic Flags

- **Inline Route Definitions**: `app.js` contains a lot of inline business logic. This makes it harder to audit than separated controllers.
- **Duplicate Logic**: `verify-user` exists in both `app.js` and `routes/auth.js`.
