# Design Document: Vendor Marketplace

## Overview

The Vendor Marketplace feature extends the Matrix Delivery platform to enable a multi-sided marketplace where vendors can register, create stores, manage product catalogs, and fulfill orders through the existing delivery infrastructure. This design maintains the current architecture while adding new capabilities for vendor management, product discovery, and marketplace transactions.

### Key Design Principles

1. **Preserve Existing Infrastructure**: All new features integrate with existing authentication, payment, and delivery systems
2. **Single-Store Transactions**: Each order contains items from only one store to simplify logistics
3. **Incremental Database Changes**: Augment existing schema without breaking current functionality
4. **Modular Architecture**: Follow established controller-service-repository pattern
5. **Performance First**: Use spatial indexing for location queries and optimize for scale

### System Context

The marketplace operates within the Matrix Delivery ecosystem:
- **Vendors** register and manage stores through a dedicated portal
- **Customers** discover stores, browse items, and place orders through the existing customer interface
- **Drivers** deliver marketplace orders using the current delivery workflow
- **Admins** oversee vendor approval, monitor marketplace health, and manage disputes

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
├──────────────────┬──────────────────┬──────────────────────┤
│  Vendor Portal   │  Customer App    │   Admin Dashboard    │
│  (React/TS)      │  (React/TS)      │   (React/TS)         │
└────────┬─────────┴────────┬─────────┴──────────┬───────────┘
         │                  │                    │
         └──────────────────┼────────────────────┘
                            │
                    ┌───────▼────────┐
                    │   API Gateway   │
                    │  (Express.js)   │
                    └───────┬────────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌────▼─────┐     ┌─────▼──────┐    ┌─────▼──────┐
    │ Vendor   │     │  Store     │    │   Order    │
    │ Module   │     │  Module    │    │   Module   │
    └────┬─────┘     └─────┬──────┘    └─────┬──────┘
         │                 │                  │
         └─────────────────┼──────────────────┘

                       │
              ┌────────▼─────────┐
              │  Service Layer   │
              │  - VendorService │
              │  - StoreService  │
              │  - ItemService   │
              │  - OfferService  │
              │  - CartService   │
              │  - PayoutService │
              └────────┬─────────┘
                       │
              ┌────────▼─────────┐
              │  Data Layer      │
              │  (PostgreSQL)    │
              │  + PostGIS       │
              └──────────────────┘
```

### Module Structure

Following the established pattern, each marketplace module contains:

```
backend/
├── controllers/
│   ├── vendorController.js      # HTTP request handling
│   ├── storeController.js
│   ├── itemController.js
│   ├── offerController.js
│   └── cartController.js
├── services/
│   ├── vendorService.js         # Business logic
│   ├── storeService.js
│   ├── itemService.js
│   ├── offerService.js
│   ├── cartService.js
│   └── payoutService.js
├── repositories/
│   ├── vendorRepository.js      # Data access
│   ├── storeRepository.js
│   ├── itemRepository.js
│   ├── offerRepository.js
│   └── cartRepository.js
└── routes/
    ├── vendorRoutes.js          # API endpoints
    ├── storeRoutes.js
    ├── itemRoutes.js
    ├── offerRoutes.js
    └── cartRoutes.js
```



## Components and Interfaces

### Backend Components

#### 1. Vendor Management Module

**VendorService**
- Handles vendor registration, approval workflow, and profile management
- Integrates with AuthService for JWT token generation
- Manages vendor status transitions (pending → active/rejected)

```javascript
class VendorService {
  async registerVendor(vendorData)
  async approveVendor(vendorId, adminId)
  async rejectVendor(vendorId, adminId, reason)
  async updateVendorProfile(vendorId, updates)
  async getVendorById(vendorId)
  async listVendors(filters, pagination)
}
```

**VendorController**
- POST /api/vendors/register - Vendor registration
- GET /api/vendors/:id - Get vendor details
- PUT /api/vendors/:id - Update vendor profile
- POST /api/vendors/:id/approve - Admin approval
- POST /api/vendors/:id/reject - Admin rejection
- GET /api/vendors - List vendors (admin only)

#### 2. Store Management Module

**StoreService**
- Manages store CRUD operations
- Validates geographic coordinates using PostGIS
- Handles store visibility and status management

```javascript
class StoreService {
  async createStore(vendorId, storeData)
  async updateStore(storeId, vendorId, updates)
  async deactivateStore(storeId, vendorId)
  async getStoreById(storeId)
  async getStoresByVendor(vendorId)
  async searchNearbyStores(latitude, longitude, radius)
}
```

**StoreController**
- POST /api/stores - Create store
- GET /api/stores/:id - Get store details
- PUT /api/stores/:id - Update store
- DELETE /api/stores/:id - Deactivate store
- GET /api/vendors/:vendorId/stores - List vendor stores
- GET /api/stores/nearby - Search nearby stores



#### 3. Category Management Module

**CategoryService**
- Manages hierarchical category structure
- Validates parent-child relationships
- Prevents circular references

```javascript
class CategoryService {
  async createCategory(categoryData)
  async updateCategory(categoryId, updates)
  async deleteCategory(categoryId)
  async getCategoryById(categoryId)
  async getCategoryHierarchy()
  async getCategoriesByParent(parentId)
}
```

**CategoryController**
- POST /api/categories - Create category
- GET /api/categories/:id - Get category
- PUT /api/categories/:id - Update category
- DELETE /api/categories/:id - Delete category
- GET /api/categories - Get category hierarchy
- GET /api/categories/:id/children - Get child categories

#### 4. Item Catalog Module

**ItemService**
- Manages product inventory
- Handles image uploads and validation
- Tracks stock levels and availability

```javascript
class ItemService {
  async createItem(storeId, itemData)
  async updateItem(itemId, storeId, updates)
  async deleteItem(itemId, storeId)
  async getItemById(itemId)
  async getItemsByStore(storeId, filters)
  async updateInventory(itemId, quantity)
  async uploadItemImage(itemId, imageFile)
}
```

**ItemController**
- POST /api/items - Create item
- GET /api/items/:id - Get item details
- PUT /api/items/:id - Update item
- DELETE /api/items/:id - Soft delete item
- GET /api/stores/:storeId/items - List store items
- POST /api/items/:id/images - Upload item image
- PATCH /api/items/:id/inventory - Update inventory



#### 5. Offers and Promotions Module

**OfferService**
- Manages promotional offers
- Validates discount values and date ranges
- Applies highest discount when multiple offers exist

```javascript
class OfferService {
  async createOffer(itemId, offerData)
  async updateOffer(offerId, updates)
  async deactivateOffer(offerId)
  async getOfferById(offerId)
  async getActiveOffersByItem(itemId)
  async expireOffers() // Cron job
}
```

**OfferController**
- POST /api/offers - Create offer
- GET /api/offers/:id - Get offer details
- PUT /api/offers/:id - Update offer
- DELETE /api/offers/:id - Deactivate offer
- GET /api/items/:itemId/offers - Get item offers

#### 6. Shopping Cart Module

**CartService**
- Manages single-store cart constraint
- Validates item availability and stock
- Handles cart expiration

```javascript
class CartService {
  async addToCart(customerId, itemId, quantity)
  async updateCartItem(customerId, itemId, quantity)
  async removeFromCart(customerId, itemId)
  async getCart(customerId)
  async clearCart(customerId)
  async validateCart(customerId)
  async expireOldCarts() // Cron job
}
```

**CartController**
- POST /api/cart/items - Add item to cart
- PUT /api/cart/items/:itemId - Update cart item
- DELETE /api/cart/items/:itemId - Remove from cart
- GET /api/cart - Get customer cart
- DELETE /api/cart - Clear cart



#### 7. Marketplace Order Module

**MarketplaceOrderService**
- Creates orders from cart contents
- Calculates commission (10% of item subtotal)
- Integrates with existing delivery system
- Manages inventory deduction

```javascript
class MarketplaceOrderService {
  async createOrder(customerId, deliveryAddress)
  async calculateOrderTotal(cartItems)
  async assignDriver(orderId)
  async updateOrderStatus(orderId, status)
  async getOrderById(orderId)
  async getOrdersByVendor(vendorId, filters)
  async getOrdersByCustomer(customerId, filters)
}
```

**MarketplaceOrderController**
- POST /api/marketplace/orders - Create order
- GET /api/marketplace/orders/:id - Get order details
- PATCH /api/marketplace/orders/:id/status - Update status
- GET /api/marketplace/orders - List orders (filtered by role)

#### 8. Vendor Payout Module

**PayoutService**
- Calculates vendor earnings (order total - 10% commission)
- Integrates with existing payment system
- Handles payout retries and failures

```javascript
class PayoutService {
  async calculatePayout(orderId)
  async processPayout(orderId)
  async retryFailedPayout(payoutId)
  async getPayoutsByVendor(vendorId, filters)
  async getPayoutById(payoutId)
}
```

**PayoutController**
- GET /api/payouts - List vendor payouts
- GET /api/payouts/:id - Get payout details
- POST /api/payouts/:id/retry - Retry failed payout



### Frontend Components

#### Vendor Portal (React/TypeScript)

```
frontend/src/components/vendor/
├── VendorDashboard.tsx          # Main dashboard with analytics
├── VendorRegistration.tsx       # Registration flow
├── StoreManagement.tsx          # Store CRUD interface
├── StoreForm.tsx                # Store creation/edit form
├── ProductCatalog.tsx           # Item management interface
├── ProductForm.tsx              # Item creation/edit form
├── CategoryManager.tsx          # Category hierarchy management
├── OfferManager.tsx             # Promotional offers interface
├── InventoryTracker.tsx         # Stock level monitoring
├── OrderList.tsx                # Vendor order management
├── PayoutHistory.tsx            # Earnings and payouts
└── Analytics.tsx                # Sales performance metrics
```

#### Customer Storefront (React/TypeScript)

```
frontend/src/components/marketplace/
├── StoreDiscovery.tsx           # Browse nearby stores
├── StoreCard.tsx                # Store preview card
├── StorePage.tsx                # Individual store view
├── ProductGrid.tsx              # Item listing with filters
├── ProductCard.tsx              # Item preview card
├── ProductDetail.tsx            # Item detail modal
├── ShoppingCart.tsx             # Cart management
├── CartItem.tsx                 # Individual cart item
└── CheckoutFlow.tsx             # Order placement
```

#### Admin Interface (React/TypeScript)

```
frontend/src/components/admin/
├── VendorApproval.tsx           # Vendor approval workflow
├── VendorList.tsx               # All vendors management
├── MarketplaceAnalytics.tsx     # Platform-wide metrics
└── DisputeResolution.tsx        # Handle vendor/customer issues
```



## Data Models

### Database Schema

#### Vendors Table (Augmented)

```sql
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,  -- Link to auth
  business_name VARCHAR(255) NOT NULL,
  business_type VARCHAR(100),
  tax_id VARCHAR(100),
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50) NOT NULL,
  address TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
  rejection_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_user_id ON vendors(user_id);
CREATE INDEX idx_vendors_status ON vendors(status);
```

#### Stores Table (Augmented with PostGIS)

```sql
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE stores (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,  -- PostGIS for spatial queries
  phone VARCHAR(50),
  email VARCHAR(255),
  opening_hours JSONB,  -- Store hours as JSON
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_orders INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stores_vendor_id ON stores(vendor_id);
CREATE INDEX idx_stores_location ON stores USING GIST(location);  -- Spatial index
CREATE INDEX idx_stores_status ON stores(status);
```



#### Categories Table (Existing)

```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(500),
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_name ON categories(name);
```

#### Items Table (Augmented)

```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  inventory_quantity INTEGER DEFAULT 0 CHECK (inventory_quantity >= 0),
  low_stock_threshold INTEGER DEFAULT 10,
  images JSONB,  -- Array of image URLs
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock')),
  is_deleted BOOLEAN DEFAULT FALSE,  -- Soft delete
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_items_store_id ON items(store_id);
CREATE INDEX idx_items_category_id ON items(category_id);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_name ON items USING GIN(to_tsvector('english', name));  -- Full-text search
```



#### Offers Table (Existing)

```sql
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value DECIMAL(10,2) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_date_range CHECK (end_date > start_date)
);

CREATE INDEX idx_offers_item_id ON offers(item_id);
CREATE INDEX idx_offers_status ON offers(status);
CREATE INDEX idx_offers_date_range ON offers(start_date, end_date);
```

#### Shopping Carts Table (New)

```sql
CREATE TABLE shopping_carts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id)  -- One cart per customer
);

CREATE INDEX idx_carts_customer_id ON shopping_carts(customer_id);
CREATE INDEX idx_carts_updated_at ON shopping_carts(updated_at);  -- For expiration
```

#### Cart Items Table (New)

```sql
CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_add DECIMAL(10,2) NOT NULL,  -- Snapshot price
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cart_id, item_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX idx_cart_items_item_id ON cart_items(item_id);
```



#### Marketplace Orders Table (New)

```sql
CREATE TABLE marketplace_orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES users(id),
  store_id INTEGER NOT NULL REFERENCES stores(id),
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  delivery_address TEXT NOT NULL,
  delivery_location GEOGRAPHY(POINT, 4326),
  
  -- Pricing breakdown
  items_subtotal DECIMAL(10,2) NOT NULL,
  platform_commission DECIMAL(10,2) NOT NULL,  -- 10% of items_subtotal
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'confirmed', 'preparing', 'ready_for_pickup',
    'assigned_to_driver', 'in_transit', 'delivered', 'cancelled'
  )),
  
  -- Driver assignment
  driver_id INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP,
  
  -- Timestamps
  confirmed_at TIMESTAMP,
  delivered_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_marketplace_orders_customer_id ON marketplace_orders(customer_id);
CREATE INDEX idx_marketplace_orders_store_id ON marketplace_orders(store_id);
CREATE INDEX idx_marketplace_orders_vendor_id ON marketplace_orders(vendor_id);
CREATE INDEX idx_marketplace_orders_driver_id ON marketplace_orders(driver_id);
CREATE INDEX idx_marketplace_orders_status ON marketplace_orders(status);
CREATE INDEX idx_marketplace_orders_created_at ON marketplace_orders(created_at);
```



#### Marketplace Order Items Table (New)

```sql
CREATE TABLE marketplace_order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  item_name VARCHAR(255) NOT NULL,  -- Snapshot
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,  -- Price at order time
  discount_applied DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON marketplace_order_items(order_id);
CREATE INDEX idx_order_items_item_id ON marketplace_order_items(item_id);
```

#### Vendor Payouts Table (New)

```sql
CREATE TABLE vendor_payouts (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  order_id INTEGER NOT NULL REFERENCES marketplace_orders(id),
  
  -- Payout calculation
  order_total DECIMAL(10,2) NOT NULL,
  platform_commission DECIMAL(10,2) NOT NULL,
  vendor_earnings DECIMAL(10,2) NOT NULL,  -- order_total - commission
  
  -- Payment processing
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255),
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payouts_vendor_id ON vendor_payouts(vendor_id);
CREATE INDEX idx_payouts_order_id ON vendor_payouts(order_id);
CREATE INDEX idx_payouts_status ON vendor_payouts(status);
```



#### Audit Logs Table (New)

```sql
CREATE TABLE marketplace_audit_logs (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,  -- 'vendor', 'store', 'item', 'order'
  entity_id INTEGER NOT NULL,
  action VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'approve', 'reject'
  actor_id INTEGER REFERENCES users(id),
  actor_role VARCHAR(50),
  changes JSONB,  -- Before/after values
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON marketplace_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_id ON marketplace_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created_at ON marketplace_audit_logs(created_at);
```

### Data Relationships

```
users (existing)
  ├─→ vendors (1:1)
  │     ├─→ stores (1:N)
  │     │     ├─→ items (1:N)
  │     │     │     ├─→ offers (1:N)
  │     │     │     └─→ cart_items (1:N)
  │     │     └─→ marketplace_orders (1:N)
  │     └─→ vendor_payouts (1:N)
  ├─→ shopping_carts (1:1)
  │     └─→ cart_items (1:N)
  └─→ marketplace_orders (1:N as customer/driver)

categories
  ├─→ categories (self-referencing for hierarchy)
  └─→ items (1:N)

marketplace_orders
  ├─→ marketplace_order_items (1:N)
  └─→ vendor_payouts (1:1)
```

