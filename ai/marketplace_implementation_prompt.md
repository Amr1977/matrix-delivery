# AI Implementation Prompt: Vendor Marketplace

You are an expert backend engineer implementing the **Vendor Marketplace feature for Matrix Delivery**.

Use the provided **Design Document: Vendor Marketplace** as the authoritative specification.

Your goal is to implement the backend system using **Node.js, Express, PostgreSQL, and PostGIS** while preserving any existing infrastructure.

---

# Important Rules

1. **DO NOT overwrite existing code or database structures.**
2. **Always check the current schema first before creating migrations.**
3. **Generate incremental migrations only for missing tables or columns.**
4. **Follow the controller → service → repository architecture.**
5. **All code must be production-quality and modular.**
6. **Use async/await and proper error handling.**
7. **All database queries must use parameterized queries.**
8. **Respect role-based access control.**

---

# Technology Stack

Backend

* Node.js
* Express.js
* PostgreSQL
* PostGIS
* JWT authentication
* Multer for file uploads

Architecture

```
controllers → services → repositories → database
```

---

# Project Folder Structure

Create or extend the following structure:

```
backend/

controllers/
vendorController.js
storeController.js
categoryController.js
itemController.js
offerController.js
cartController.js
marketplaceOrderController.js
payoutController.js

services/
vendorService.js
storeService.js
categoryService.js
itemService.js
offerService.js
cartService.js
marketplaceOrderService.js
payoutService.js

repositories/
vendorRepository.js
storeRepository.js
categoryRepository.js
itemRepository.js
offerRepository.js
cartRepository.js
orderRepository.js
payoutRepository.js

routes/
vendorRoutes.js
storeRoutes.js
categoryRoutes.js
itemRoutes.js
offerRoutes.js
cartRoutes.js
marketplaceOrderRoutes.js
payoutRoutes.js

middleware/
authMiddleware.js
roleMiddleware.js
validationMiddleware.js

migrations/
```

---

# Step-by-Step Implementation Plan

Implement the system **incrementally in the following milestones**.

---

# Milestone 1: Vendor Module

Generate:

VendorRepository
VendorService
VendorController
VendorRoutes

Endpoints

```
POST /api/vendors/register
GET /api/vendors/:id
PUT /api/vendors/:id
POST /api/vendors/:id/approve
POST /api/vendors/:id/reject
GET /api/vendors
```

Features

* vendor registration
* vendor approval workflow
* vendor profile updates
* admin vendor listing

---

# Milestone 2: Store Module

Generate:

StoreRepository
StoreService
StoreController
StoreRoutes

Endpoints

```
POST /api/stores
GET /api/stores/:id
PUT /api/stores/:id
DELETE /api/stores/:id
GET /api/vendors/:vendorId/stores
GET /api/stores/nearby
```

Requirements

* validate vendor ownership
* PostGIS spatial queries for nearby search
* store activation / deactivation

---

# Milestone 3: Category Module

Generate:

CategoryRepository
CategoryService
CategoryController
CategoryRoutes

Features

* hierarchical categories
* parent-child validation
* prevent circular references

Endpoints

```
POST /api/categories
GET /api/categories
GET /api/categories/:id
PUT /api/categories/:id
DELETE /api/categories/:id
```

---

# Milestone 4: Item Catalog

Generate:

ItemRepository
ItemService
ItemController
ItemRoutes

Features

* CRUD for items
* inventory tracking
* image uploads
* soft delete

Endpoints

```
POST /api/items
GET /api/items/:id
PUT /api/items/:id
DELETE /api/items/:id
GET /api/stores/:storeId/items
POST /api/items/:id/images
PATCH /api/items/:id/inventory
```

---

# Milestone 5: Offers Module

Generate:

OfferRepository
OfferService
OfferController
OfferRoutes

Features

* percentage discounts
* fixed discounts
* offer scheduling
* automatic expiration

Endpoints

```
POST /api/offers
GET /api/offers/:id
PUT /api/offers/:id
DELETE /api/offers/:id
GET /api/items/:itemId/offers
```

---

# Milestone 6: Cart Module

Generate:

CartRepository
CartService
CartController
CartRoutes

Features

* single-store cart constraint
* stock validation
* cart expiration

Endpoints

```
POST /api/cart/items
PUT /api/cart/items/:itemId
DELETE /api/cart/items/:itemId
GET /api/cart
DELETE /api/cart
```

---

# Milestone 7: Marketplace Orders

Generate:

MarketplaceOrderRepository
MarketplaceOrderService
MarketplaceOrderController
MarketplaceOrderRoutes

Features

* order creation
* inventory deduction
* delivery integration
* order status lifecycle

Endpoints

```
POST /api/marketplace/orders
GET /api/marketplace/orders/:id
PATCH /api/marketplace/orders/:id/status
GET /api/marketplace/orders
```

---

# Milestone 8: Vendor Payouts

Generate:

PayoutRepository
PayoutService
PayoutController
PayoutRoutes

Features

* calculate vendor earnings
* commission deduction (10%)
* payout tracking
* retry failed payouts

Endpoints

```
GET /api/payouts
GET /api/payouts/:id
POST /api/payouts/:id/retry
```

---

# Background Jobs

Generate scheduled jobs:

Offer expiration job

```
expireOffers()
```

Cart cleanup job

```
expireOldCarts()
```

Payout processing job

```
processPendingPayouts()
```

---

# Security Requirements

Implement:

JWT authentication middleware
Role-based authorization middleware
Rate limiting
File upload validation

Roles

```
admin
vendor
customer
driver
```

---

# Database Requirements

Use PostgreSQL.

If PostGIS is not enabled:

```
CREATE EXTENSION IF NOT EXISTS postgis;
```

Ensure migrations match the design document tables:

* vendors
* stores
* categories
* items
* offers
* shopping_carts
* cart_items
* marketplace_orders
* marketplace_order_items
* vendor_payouts
* marketplace_audit_logs

---

# Coding Standards

All code must include:

* try/catch error handling
* validation checks
* logging
* descriptive error responses
* modular exports

Use this response format:

```
Controller
Service
Repository
Routes
Migration SQL
```

---

# Before Writing Code

First perform these steps:

1. Read the design document completely.
2. Inspect the existing database schema.
3. Determine which tables already exist.
4. Generate only missing migrations.
5. Print a summary of changes before generating code.

---

# Output Requirements

When generating code:

* Output files in separate code blocks.
* Clearly label file paths.
* Follow the architecture exactly.

Example format:

```
backend/services/vendorService.js
```

```
code
```

---

# Final Goal

Implement a fully functional **Vendor Marketplace backend system** that integrates with the existing Matrix Delivery infrastructure while preserving all current functionality.
