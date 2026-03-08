# Design Document: Vendor Marketplace

## Overview

The Vendor Marketplace feature extends the Matrix Delivery platform to enable a multi-sided marketplace where vendors can register, create stores, manage product catalogs, and fulfill orders through the existing delivery infrastructure.

This design maintains the current architecture while adding capabilities for vendor management, product discovery, and marketplace transactions.

### Key Design Principles

1. Preserve existing infrastructure.
2. Single-store transactions for logistics simplicity.
3. Incremental database changes.
4. Modular architecture.
5. Performance-optimized queries.

### System Context

Actors in the system:

**Vendors**

* Register businesses
* Create stores
* Manage inventory
* Receive payouts

**Customers**

* Discover nearby stores
* Browse items
* Place marketplace orders

**Drivers**

* Deliver marketplace orders using the existing delivery system

**Admins**

* Approve vendors
* Monitor marketplace activity
* Resolve disputes

---

# Architecture

## High Level Architecture

```
Client Layer
 ├── Vendor Portal
 ├── Customer App
 └── Admin Dashboard

        │

API Gateway (Express.js)

        │

Modules
 ├── Vendor Module
 ├── Store Module
 ├── Item Module
 ├── Offer Module
 ├── Cart Module
 └── Order Module

        │

Service Layer
 ├── VendorService
 ├── StoreService
 ├── ItemService
 ├── OfferService
 ├── CartService
 └── PayoutService

        │

Data Layer
PostgreSQL + PostGIS
```

---

# Module Structure

```
backend/
 ├── controllers/
 │    ├── vendorController.js
 │    ├── storeController.js
 │    ├── itemController.js
 │    ├── offerController.js
 │    └── cartController.js
 │
 ├── services/
 │    ├── vendorService.js
 │    ├── storeService.js
 │    ├── itemService.js
 │    ├── offerService.js
 │    ├── cartService.js
 │    └── payoutService.js
 │
 ├── repositories/
 │    ├── vendorRepository.js
 │    ├── storeRepository.js
 │    ├── itemRepository.js
 │    ├── offerRepository.js
 │    └── cartRepository.js
 │
 └── routes/
      ├── vendorRoutes.js
      ├── storeRoutes.js
      ├── itemRoutes.js
      ├── offerRoutes.js
      └── cartRoutes.js
```

---

# Backend Components

## Vendor Management

### VendorService

Handles vendor lifecycle.

```
registerVendor()
approveVendor()
rejectVendor()
updateVendorProfile()
getVendorById()
listVendors()
```

### VendorController

Endpoints:

```
POST /api/vendors/register
GET /api/vendors/:id
PUT /api/vendors/:id
POST /api/vendors/:id/approve
POST /api/vendors/:id/reject
GET /api/vendors
```

---

## Store Management

### StoreService

Responsibilities:

* Create store
* Update store
* Store location validation
* Search nearby stores

Methods

```
createStore()
updateStore()
deactivateStore()
getStoreById()
getStoresByVendor()
searchNearbyStores()
```

### StoreController

Endpoints

```
POST /api/stores
GET /api/stores/:id
PUT /api/stores/:id
DELETE /api/stores/:id
GET /api/vendors/:vendorId/stores
GET /api/stores/nearby
```

---

## Category Management

Supports hierarchical categories.

Methods

```
createCategory()
updateCategory()
deleteCategory()
getCategoryHierarchy()
getCategoriesByParent()
```

Endpoints

```
POST /api/categories
GET /api/categories
GET /api/categories/:id
PUT /api/categories/:id
DELETE /api/categories/:id
```

---

## Item Catalog

### ItemService

Responsibilities

* Inventory tracking
* Product CRUD
* Image uploads

Methods

```
createItem()
updateItem()
deleteItem()
getItemById()
getItemsByStore()
updateInventory()
uploadItemImage()
```

Endpoints

```
POST /api/items
GET /api/items/:id
PUT /api/items/:id
DELETE /api/items/:id
GET /api/stores/:storeId/items
```

---

## Offers and Promotions

### OfferService

Handles promotional logic.

Methods

```
createOffer()
updateOffer()
deactivateOffer()
getOfferById()
getActiveOffersByItem()
expireOffers()
```

---

## Shopping Cart

Cart supports **single store constraint**.

Methods

```
addToCart()
updateCartItem()
removeFromCart()
getCart()
clearCart()
validateCart()
expireOldCarts()
```

Endpoints

```
POST /api/cart/items
PUT /api/cart/items/:itemId
DELETE /api/cart/items/:itemId
GET /api/cart
DELETE /api/cart
```

---

## Marketplace Orders

### MarketplaceOrderService

Responsibilities

* Create order
* Deduct inventory
* Assign driver
* Track order status

Methods

```
createOrder()
calculateOrderTotal()
assignDriver()
updateOrderStatus()
getOrderById()
getOrdersByVendor()
getOrdersByCustomer()
```

---

## Vendor Payouts

### PayoutService

Calculates vendor earnings.

Commission:

```
10% of item subtotal
```

Methods

```
calculatePayout()
processPayout()
retryFailedPayout()
getPayoutsByVendor()
```

---

# Database Schema

## Vendors Table

```sql
CREATE TABLE vendors (
 id SERIAL PRIMARY KEY,
 user_id INTEGER REFERENCES users(id),
 business_name VARCHAR(255),
 contact_email VARCHAR(255),
 status VARCHAR(20) DEFAULT 'pending',
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Stores Table

PostGIS enabled.

```sql
CREATE TABLE stores (
 id SERIAL PRIMARY KEY,
 vendor_id INTEGER REFERENCES vendors(id),
 name VARCHAR(255),
 address TEXT,
 location GEOGRAPHY(POINT,4326),
 rating DECIMAL(3,2) DEFAULT 0
);
```

---

## Items Table

```sql
CREATE TABLE items (
 id SERIAL PRIMARY KEY,
 store_id INTEGER REFERENCES stores(id),
 category_id INTEGER REFERENCES categories(id),
 name VARCHAR(255),
 price DECIMAL(10,2),
 inventory_quantity INTEGER
);
```

---

## Shopping Cart Tables

```
shopping_carts
cart_items
```

---

## Marketplace Orders

```
marketplace_orders
marketplace_order_items
```

Stores order and item snapshots.

---

## Vendor Payouts

Tracks vendor earnings per order.

```
vendor_payouts
```

---

# Correctness Properties

The system must guarantee the following properties:

Vendor lifecycle correctness

* vendor registration creates pending account
* admin approval activates vendor

Store consistency

* store location validation
* store inventory isolation

Inventory safety

* inventory cannot drop below zero
* stock must exist before checkout

Cart constraints

* cart must contain items from only one store

Order correctness

* order total calculation must be consistent
* inventory deduction must occur atomically

Payout integrity

* vendor earnings = order_total − platform_commission

Authorization guarantees

* vendor can only access own data
* admin has global access
* customers have read-only access

---

# API Specification

## Register Vendor

POST

```
/api/vendors/register
```

Example request

```
{
 "business_name": "Fresh Farm Market",
 "contact_email": "owner@freshfarm.com",
 "contact_phone": "+123456789"
}
```

---

## Create Store

POST

```
/api/stores
```

Request

```
{
 "name": "Fresh Farm Downtown",
 "latitude": 37.77,
 "longitude": -122.41
}
```

---

## Add Item

POST

```
/api/items
```

Request

```
{
 "name": "Organic Apples",
 "price": 2.99,
 "inventory_quantity": 200
}
```

---

## Add Item to Cart

POST

```
/api/cart/items
```

Request

```
{
 "item_id": 21,
 "quantity": 2
}
```

---

## Create Order

POST

```
/api/marketplace/orders
```

Response

```
{
 "order_number": "MKP-2026-5012",
 "total_amount": 34.20
}
```

---

# Background Jobs

## Offer Expiration Job

Runs hourly.

```
Deactivate expired offers
```

---

## Cart Cleanup Job

Runs daily.

```
Delete carts inactive for 7 days
```

---

## Inventory Monitoring

Runs every 10 minutes.

```
Detect low stock items
```

---

## Vendor Payout Processing

Runs every 30 minutes.

```
Process completed deliveries
```

---

# Security Considerations

Security protections include:

JWT authentication
RBAC authorization
SQL injection prevention
Rate limiting
Secure file upload validation

Allowed image types

```
jpeg
png
webp
```

Max file size

```
5MB
```

---

# Performance Considerations

Spatial queries use **PostGIS indexes**.

Example

```
ST_DWithin(store.location, user_location, radius)
```

Search optimization uses

```
PostgreSQL full text search
GIN indexes
```

---

# Scalability Strategy

Future scaling options

* Redis caching
* read replicas
* ElasticSearch search engine
* CDN image delivery
* S3 object storage

---

# Monitoring and Observability

Important metrics

* marketplace order volume
* vendor onboarding rate
* cart abandonment rate
* payout processing latency

Logs stored in

```
marketplace_audit_logs
```

---

# Deployment Plan

Phase 1

Vendor onboarding
Store management

Phase 2

Product catalog
Inventory management

Phase 3

Cart and ordering

Phase 4

Vendor payouts
Analytics dashboard

---

# Future Enhancements

Potential improvements

Multi-store carts
Vendor subscription plans
AI product recommendations
Real-time inventory sync
Marketplace search ranking

---

# Conclusion

The Vendor Marketplace transforms the Matrix Delivery platform into a **full multi-vendor commerce ecosystem** while preserving the existing delivery infrastructure.

Key advantages:

* modular architecture
* scalable spatial search
* secure vendor operations
* extensible marketplace features

This design allows the platform to evolve from a **delivery service into a full marketplace platform**.
