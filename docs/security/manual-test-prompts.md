# Manual Security Test Prompts

Use these prompts to manually verify the security posture of the endpoints.

## 1. Verify Unprotected User Verification
**Target**: `POST /api/auth/verify-user` (Inline in `app.js`)
**Goal**: Confirm if an unauthenticated user can verify an account.
**Steps**:
1. Create a new user account (unverified).
2. Without logging in, send a POST request to `/api/auth/verify-user` with `{"email": "your_test_email"}`.
3. Check if the response is 200 OK.
4. Check if the user is now verified in the DB.

## 2. Test Seed Endpoint Access
**Target**: `POST /api/test/seed`
**Goal**: Verify if the endpoint is accessible without auth in non-prod environments.
**Steps**:
1. Ensure the environment is NOT 'production'.
2. Without logging in, send a POST request to `/api/test/seed` with a valid payload.
3. Observe if it creates data.
4. **Risk**: If this endpoint is accidentally deployed to production with a slightly different env var (e.g. `NODE_ENV=prod`), it might be open.

## 3. IDOR on Orders
**Target**: `GET /api/orders/:id` (via Admin/Driver routes)
**Goal**: Verify isolation.
**Steps**:
1. Login as User A. Create Order X.
2. Login as User B (Customer).
3. Attempt to GET `/api/orders/X` (if such an endpoint exists for customers) or try to `POST /api/orders/X/accept-bid`.
4. Observe if access is denied (403/404).

## 4. Wallet Payment Authorization
**Target**: `GET /api/wallet-payments/:id`
**Goal**: Verify ownership check.
**Steps**:
1. User A creates a wallet payment (ID: 123).
2. User B logs in.
3. User B requests `GET /api/wallet-payments/123`.
4. Expect 403 Forbidden.

## 5. Log Flooding
**Target**: `POST /api/logs/frontend`
**Goal**: Check rate limiting on public endpoint.
**Steps**:
1. Send 100 rapid requests to `/api/logs/frontend`.
2. Observe if any rate limiting kicks in (429 Too Many Requests).
3. If not, this is a DoS vector.

## 6. Vendor Self-Update IDOR
**Target**: `PUT /api/vendors/self` vs `PUT /api/vendors/:id`
**Goal**: Ensure `isVendor` middleware correctly identifies the vendor's own record.
**Steps**:
1. Login as Vendor A.
2. Try to access `PUT /api/vendors/self`. Should work.
3. Try to access `PUT /api/vendors/OTHER_ID`. Should fail (unless you are Admin).
