# API Inventory

This document lists all enumerated backend API endpoints for the Matrix Delivery application.

## 1. Application Root (`app.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/browse/vendors` | GET | Inline (app.js) | No | None | `q`, `city`, `sort`, `page`, `limit` | `vendors` |
| `/api/browse/items` | GET | Inline (app.js) | No | None | `q`, `category`, `vendor_id`, `city`, `min_price`, `max_price` | `vendor_items`, `vendors` |
| `/api/browse/vendors-near` | GET | Inline (app.js) | No | None | `lat`, `lng`, `radius_km` | `vendors` (PostGIS) |
| `/api/browse/items-near` | GET | Inline (app.js) | No | None | `lat`, `lng`, `radius_km`, `category` | `vendor_items`, `vendors` (PostGIS) |
| `/api/test/seed` | POST | Inline (app.js) | No (Production check only) | `if (IS_PRODUCTION)` | `vendors` (array) | `vendors`, `vendor_items` |
| `/api/vendors` | GET | Inline (app.js) | No | None | `q` | `vendors` |
| `/api/vendors` | POST | Inline (app.js) | Yes (Admin) | `verifyTokenOrTestBypass`, `isAdmin` | `name`, `city`, etc. | `vendors` |
| `/api/vendors/:id` | GET | Inline (app.js) | No | None | `id` (path) | `vendors` |
| `/api/vendors/self` | POST | Inline (app.js) | Yes (Vendor) | `verifyTokenOrTestBypass`, `isVendor` | `name`, `city`... | `vendors` |
| `/api/vendors/self` | GET | Inline (app.js) | Yes (Vendor) | `verifyTokenOrTestBypass`, `isVendor` | None | `vendors` |
| `/api/vendors/self` | PUT | Inline (app.js) | Yes (Vendor) | `verifyTokenOrTestBypass`, `isVendor` | `name`, `description`... | `vendors` |
| `/api/vendors/:id` | PUT | Inline (app.js) | Yes (Vendor/Admin) | `verifyTokenOrTestBypass`, `authorizeVendorManage` | `name`... | `vendors` |
| `/api/vendors/:id` | DELETE | Inline (app.js) | Yes (Vendor/Admin) | `verifyTokenOrTestBypass`, `authorizeVendorManage` | `id` (path) | `vendors` |
| `/api/vendors/:id/items` | GET | Inline (app.js) | No | None | `id` (path) | `vendor_items` |
| `/api/vendors/:id/items` | POST | Inline (app.js) | Yes (Vendor/Admin) | `verifyTokenOrTestBypass`, `authorizeVendorManage` | `item_name`, `price`... | `vendor_items` |
| `/api/vendors/:id/items/:itemId` | PUT | Inline (app.js) | Yes (Vendor/Admin) | `verifyTokenOrTestBypass`, `authorizeVendorManage` | `item_name`... | `vendor_items` |
| `/api/vendors/:id/items/:itemId` | DELETE | Inline (app.js) | Yes (Vendor/Admin) | `verifyTokenOrTestBypass`, `authorizeVendorManage` | `itemId` (path) | `vendor_items` |
| `/api/logs/frontend` | POST | Inline (app.js) | No | None | `level`, `message`, `userId`... | Logs (File system) |
| `/api/auth/verify-user` | POST | Inline (app.js) | **NO** | **NONE** (Critical risk) | `email` | `users` |
| `/api/users/:id/reputation` | GET | Inline (app.js) | Yes | `verifyToken` | `id` (path) | `users`, `reviews` |
| `/api/users/:id/reviews/received` | GET | Inline (app.js) | Yes | `verifyToken` | `id` (path) | `reviews`, `users` |

## 2. Orders (`routes/orders.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/orders/` | GET | `route.get('/')` | Yes | `verifyToken` | `lat`, `lng`, filters | `orders` |
| `/api/orders/` | POST | `route.post('/')` | Yes (Cust/Admin) | `verifyToken`, `orderCreationRateLimit` | Order details | `orders` |
| `/api/orders/:orderId/bid` | POST | `route.post(...)` | Yes (Driver) | `verifyToken` | `bid_price`, `time_estimate` | `bids` |
| `/api/orders/:orderId/accept-bid` | POST | `route.post(...)` | Yes (Customer) | `verifyToken` | `userId` (driverId) | `orders`, `bids` |
| `/api/orders/:orderId/review` | POST | `route.post(...)` | Yes | `verifyToken` | Review content | `reviews` |
| `/api/orders/:orderId/:action` | POST | `route.post(...)` | Yes | `verifyToken` | `action` (pickup/transit/complete) | `orders` |
| `/api/orders/:orderId/reviews` | GET | `route.get(...)` | Yes | `verifyToken` | `orderId` (path) | `reviews` |

## 3. Auth (`routes/auth.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/auth/register` | POST | `authController.register` | No | None | User details | `users` |
| `/api/auth/login` | POST | `authController.login` | No | None | Creds | `users` |
| `/api/auth/logout` | POST | `authController.logout` | No | None | None | Session |
| `/api/auth/me` | GET | `authController.getMe` | Yes | `verifyToken` | None | `users` |
| `/api/auth/profile` | PUT | `authController.updateProfile` | Yes | `verifyToken` | Profile fields | `users` |
| `/api/auth/switch-primary_role` | POST | `authController.switchRole` | Yes | `verifyToken` | `primary_role` | `users` |
| `/api/auth/verify-user` | POST | `authController.verifyUser` | Yes (Admin) | `requireRole('admin')` | `email` | `users` |
| `/api/auth/forgot-password` | POST | `authController.forgotPassword` | No | None | `email` | `users` |

## 4. Admin (`routes/admin.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/admin/stats` | GET | Inline | Yes (Admin) | `verifyAdmin` | `range` | `users`, `orders` |
| `/api/admin/users` | GET | Inline | Yes (Admin) | `verifyAdmin` | `page`, `limit`, `search` | `users` |
| `/api/admin/users/:id` | GET | Inline | Yes (Admin) | `verifyAdmin` | `id` (path) | `users`, `orders` |
| `/api/admin/users/:id/verify` | POST | Inline | Yes (Admin) | `verifyAdmin` | `id` (path) | `users` |
| `/api/admin/users/:id/suspend` | POST | Inline | Yes (Admin) | `verifyAdmin` | `id`, `reason` | `users` |
| `/api/admin/users/:id/unsuspend`| POST | Inline | Yes (Admin) | `verifyAdmin` | `id` | `users` |
| `/api/admin/users/:id` | DELETE | Inline | Yes (Admin) | `verifyAdmin` | `id` | `users` |
| `/api/admin/orders` | GET | Inline | Yes (Admin) | `verifyAdmin` | `status`, `search` | `orders` |
| `/api/admin/orders/:id` | GET | Inline | Yes (Admin) | `verifyAdmin` | `id` | `orders` |
| `/api/admin/orders/:id/cancel` | POST | Inline | Yes (Admin) | `verifyAdmin` | `id`, `reason` | `orders` |

## 5. Drivers (`routes/drivers.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/drivers/tracking/:orderId/start` | POST | Inline | Yes (Driver) | `verifyToken`, `requireRole('driver')` | `orderId` | `orders` |
| `/api/drivers/tracking/:orderId/stop` | POST | Inline | Yes (Driver) | `verifyToken`, `requireRole('driver')` | `orderId` | `orders`, `driver_locations` |
| `/api/drivers/tracking/:orderId/status`| GET | Inline | Yes | `verifyToken` | `orderId` | `orders`, `driver_locations` |
| `/api/drivers/status` | POST | Inline | Yes (Driver) | `verifyToken`, `requireRole('driver')` | `isOnline` | Memory/Redis |
| `/api/drivers/location/:orderId` | POST | Inline | Yes (Driver) | `verifyToken`, `requireRole('driver')` | `lat`, `lng` | `driver_locations` |
// ... other driver endpoints ...

## 6. Payment & Wallet (`routes/payments.js`, `routes/walletPayments.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/payments/create-intent` | POST | Inline | Yes | `verifyToken` | `orderId`, `amount` | Stripe |
| `/api/wallet-payments` | POST | Inline | Yes | `authenticate` | `amount`, `screenshot` | `wallet_payments` |
| `/api/wallet-payments/pending` | GET | Inline | Yes (Admin) | `authenticate`, `authorize(['admin'])` | `limit` | `wallet_payments` |
// ... other payment endpoints ...

## 7. Messages (`routes/messages.js`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/messages` | POST | Inline | Yes | `verifyToken` | `recipientId`, `content` | `messages` |
| `/api/messages/order/:orderId` | GET | Inline | Yes | `verifyToken` | `orderId` | `messages` |

## 8. V1 Routes (`routes/v1/balance.ts`)

| Endpoint | Method | Handler | Auth Required | Enforcement | Inputs | Objects Accessed |
|---|---|---|---|---|---|---|
| `/api/v1/balance/:userId` | GET | `controller.getBalance` | Yes | `verifyToken`, `verifyBalanceOwnership` | `userId` | Balance |
| `/api/v1/balance/deposit` | POST | `controller.deposit` | Yes | `verifyToken`, `verifyBalanceOwnership` | Amount | Balance |
// ... other balance endpoints ...
