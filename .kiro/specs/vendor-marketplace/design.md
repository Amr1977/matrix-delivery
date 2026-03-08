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



## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Vendor Registration Creates Pending Account

*For any* valid vendor registration data, submitting the registration should create a vendor account with status 'pending' and all provided information persisted.

**Validates: Requirements 1.1, 1.2**

### Property 2: Vendor Approval State Transition

*For any* pending vendor, when an admin approves the vendor, the status should transition to 'active', approval timestamp should be set, and notification should be sent.

**Validates: Requirements 1.3, 1.4**

### Property 3: Vendor Authentication JWT Contains Role

*For any* active vendor with valid credentials, authentication should return a JWT token containing the 'vendor' role claim.

**Validates: Requirements 1.5**

### Property 4: Vendor Profile Updates Persist Immediately

*For any* vendor and any valid profile update data, applying the update should persist all changes and update the modified timestamp.

**Validates: Requirements 1.6**

### Property 5: Store Creation Requires Complete Data

*For any* store creation attempt missing required fields (name, location, contact), the system should reject the creation with validation error.

**Validates: Requirements 2.1**



### Property 6: Store Location Validation

*For any* store with location coordinates, creating the store should validate that coordinates are within supported service areas using PostGIS spatial queries.

**Validates: Requirements 2.2**

### Property 7: Store Inventory Independence

*For any* vendor with multiple stores, updating inventory in one store should not affect inventory in other stores owned by the same vendor.

**Validates: Requirements 2.3**

### Property 8: Store Update Timestamp Tracking

*For any* store and any valid update data, applying the update should persist changes and update the updated_at timestamp to current time.

**Validates: Requirements 2.4**

### Property 9: Store Deactivation Preserves Data

*For any* active store, deactivating it should set status to 'inactive', exclude it from customer searches, but preserve all store and item data in the database.

**Validates: Requirements 2.5**

### Property 10: Store Location Update Affects Search Results

*For any* store, when location coordinates are updated, subsequent nearby store searches should reflect the new location in distance calculations and result ordering.

**Validates: Requirements 2.6**

### Property 11: Category Hierarchy Creation

*For any* valid category with a parent_id, creating the category should establish the parent-child relationship and allow retrieval of the complete hierarchy.

**Validates: Requirements 3.1, 3.3**

### Property 12: Category Parent Validation

*For any* category creation with a parent_id, the system should validate that the parent category exists and is active before allowing creation.

**Validates: Requirements 3.2**



### Property 13: Category Deletion Protection

*For any* category with items assigned to it, attempting to delete the category should be rejected with an error indicating items must be reassigned first.

**Validates: Requirements 3.4**

### Property 14: Category Deactivation Cascade

*For any* parent category with child categories, deactivating the parent should cascade the deactivation to all descendant categories in the hierarchy.

**Validates: Requirements 3.5**

### Property 15: Unlimited Category Nesting

*For any* positive integer N, the system should support creating category hierarchies with depth N without errors or performance degradation.

**Validates: Requirements 3.6**

### Property 16: Item Creation Validation

*For any* item creation attempt, the system should validate that all required fields (name, description, price, category_id, store_id) are provided and that price is positive.

**Validates: Requirements 4.1, 4.2**

### Property 17: Item Foreign Key Validation

*For any* item creation, the system should validate that store_id references an existing store and category_id references an existing active category.

**Validates: Requirements 4.3, 12.2**

### Property 18: Item Image Upload Validation

*For any* image upload, the system should validate file type (JPEG/PNG/WebP only), file size (max 5MB), and reject invalid uploads with descriptive errors.

**Validates: Requirements 4.4, 15.1, 15.2**

### Property 19: Item Inventory Tracking

*For any* item inventory update, the system should record the previous quantity, new quantity, timestamp, and source of the change in audit logs.

**Validates: Requirements 4.5, 18.3**



### Property 20: Out of Stock Exclusion

*For any* item with inventory_quantity = 0, the item should be marked as 'out_of_stock' and excluded from customer search results.

**Validates: Requirements 4.6**

### Property 21: Item Soft Delete Preservation

*For any* item, deleting it should set is_deleted = true while preserving all item data and maintaining referential integrity with existing orders.

**Validates: Requirements 4.7**

### Property 22: Offer Creation Validation

*For any* offer creation, the system should validate that all required fields are provided and that start_date < end_date.

**Validates: Requirements 5.1, 5.2**

### Property 23: Percentage Discount Validation

*For any* offer with discount_type = 'percentage', the system should validate that discount_value is between 0 and 100 inclusive.

**Validates: Requirements 5.3**

### Property 24: Fixed Discount Validation

*For any* offer with discount_type = 'fixed', the system should validate that discount_value is less than the item's current price.

**Validates: Requirements 5.4**

### Property 25: Active Offer Price Application

*For any* item with an active offer (current time between start_date and end_date), customer views should display the discounted price calculated from the offer.

**Validates: Requirements 5.5**

### Property 26: Offer Expiration Handling

*For any* offer where current time > end_date, the system should automatically deactivate the offer and display original item pricing.

**Validates: Requirements 5.6**



### Property 27: Highest Discount Precedence

*For any* item with multiple active offers, the system should apply only the offer with the highest discount value to the displayed price.

**Validates: Requirements 5.7**

### Property 28: Nearby Store Search Radius

*For any* customer location and search radius R, the system should return only stores where ST_Distance(customer_location, store_location) <= R using PostGIS spatial queries.

**Validates: Requirements 6.1**

### Property 29: Store Distance Calculation

*For any* store in search results, the system should calculate and display the accurate distance from customer location using PostGIS ST_Distance function.

**Validates: Requirements 6.2**

### Property 30: Category Filter Accuracy

*For any* category filter applied to store search, results should include only stores that have at least one active item in the specified category or its subcategories.

**Validates: Requirements 6.3**

### Property 31: Keyword Search Matching

*For any* keyword search query, results should include stores where the keyword matches store name, item names, or item descriptions using full-text search.

**Validates: Requirements 6.4**

### Property 32: Empty Store Exclusion

*For any* store with zero active items (all items inactive or deleted), the store should be excluded from customer search results.

**Validates: Requirements 6.5**

### Property 33: Store Display Completeness

*For any* store in search results, the displayed data should include store name, distance from customer, rating, and at least one featured item if available.

**Validates: Requirements 6.6**



### Property 34: Cart Item Availability Validation

*For any* item being added to cart, the system should validate that the item status is 'active' and inventory_quantity > 0 before allowing addition.

**Validates: Requirements 7.1**

### Property 35: Cart Item Data Persistence

*For any* item added to cart, the system should store item_id, quantity, store_id, and the current price_at_add in the cart_items table.

**Validates: Requirements 7.2**

### Property 36: Single-Store Cart Constraint

*For any* customer cart, when adding an item from a different store than existing cart items, the system should clear all existing cart items and create a new cart with only the new item.

**Validates: Requirements 7.3, 7.8**

### Property 37: Cart Quantity Stock Validation

*For any* cart item quantity update, the system should validate that the new quantity does not exceed the item's current inventory_quantity.

**Validates: Requirements 7.4**

### Property 38: Cart Price Synchronization

*For any* cart item, when the item's price changes in the items table, the next cart retrieval should update price_at_add to reflect the current price.

**Validates: Requirements 7.5**

### Property 39: Cart Item Removal

*For any* cart item, removing it should immediately delete the cart_items record from the database.

**Validates: Requirements 7.6**

### Property 40: Cart Expiration Cleanup

*For any* shopping cart where updated_at < (current_time - 7 days), the system should delete the cart and all associated cart_items.

**Validates: Requirements 7.7**



### Property 41: Single Order Per Checkout

*For any* customer cart checkout, the system should create exactly one marketplace_orders record containing all cart items from the single store.

**Validates: Requirements 8.1**

### Property 42: Order Total Calculation

*For any* marketplace order, the total_amount should equal items_subtotal + platform_commission + delivery_fee, where platform_commission = items_subtotal * 0.10.

**Validates: Requirements 8.2, 8.3**

### Property 43: Commission Excludes Delivery Fee

*For any* marketplace order, the platform_commission should be calculated as 10% of items_subtotal only, excluding delivery_fee from the calculation.

**Validates: Requirements 8.4, 9.2**

### Property 44: Checkout Availability Validation

*For any* order placement, the system should validate that all cart items are still active and have sufficient inventory_quantity before creating the order.

**Validates: Requirements 8.5**

### Property 45: Order Inventory Deduction

*For any* confirmed marketplace order, the system should deduct the ordered quantity from each item's inventory_quantity atomically within a transaction.

**Validates: Requirements 8.6**

### Property 46: Driver Assignment Notifications

*For any* marketplace order when a driver is assigned, the system should send notifications to both the vendor and customer containing driver details.

**Validates: Requirements 8.7, 16.2**

### Property 47: Delivery Triggers Payout

*For any* marketplace order with status = 'delivered', the system should create a vendor_payouts record and initiate the payout process.

**Validates: Requirements 8.8**



### Property 48: Vendor Payout Calculation

*For any* delivered marketplace order, the vendor_earnings should equal order_total - platform_commission, where platform_commission = items_subtotal * 0.10.

**Validates: Requirements 9.1**

### Property 49: Payout Transaction Record

*For any* payout calculation, the system should create a vendor_payouts record containing order_total, platform_commission, and vendor_earnings breakdown.

**Validates: Requirements 9.3**

### Property 50: Vendor Earnings Display

*For any* vendor viewing earnings, the display should show total_sales (sum of order_total), total_commission (sum of platform_commission), and net_earnings (sum of vendor_earnings).

**Validates: Requirements 9.4**

### Property 51: Payout Payment Integration

*For any* payout with status = 'processing', the system should call the existing payment service with vendor account details and payout amount.

**Validates: Requirements 9.5**

### Property 52: Payout Retry Logic

*For any* payout with status = 'failed', the system should automatically retry with exponential backoff and send notification to vendor after max retries.

**Validates: Requirements 9.6, 19.2**

### Property 53: Dashboard Metrics Calculation

*For any* vendor dashboard view with date range filter, the system should calculate total_sales, order_count, and revenue accurately for orders within the date range.

**Validates: Requirements 10.1, 10.4**

### Property 54: Dashboard Analytics Completeness

*For any* vendor dashboard, the analytics section should display top-selling items, category performance metrics, and order trend data.

**Validates: Requirements 10.2**



### Property 55: Order History Display

*For any* vendor order history view, each order should display order_number, status, customer information, and item details.

**Validates: Requirements 10.3**

### Property 56: Low Stock Highlighting

*For any* vendor inventory view, items where inventory_quantity <= low_stock_threshold should be visually highlighted or flagged.

**Validates: Requirements 10.5, 16.4**

### Property 57: Data Export CSV Format

*For any* vendor data export request, the system should generate a valid CSV file containing all requested sales or inventory data with proper headers.

**Validates: Requirements 10.6**

### Property 58: Vendor Data Authorization

*For any* vendor accessing store, item, or order data, the system should verify that the data belongs to that vendor before allowing access, rejecting unauthorized attempts with 403 Forbidden.

**Validates: Requirements 11.1, 11.2, 11.6**

### Property 59: Admin Full Access

*For any* admin user accessing vendor data, the system should allow full read and write access to all vendors, stores, items, and orders.

**Validates: Requirements 11.3**

### Property 60: Customer Read-Only Access

*For any* customer accessing vendor data, the system should allow read access only to public store and item information, rejecting write attempts with 403 Forbidden.

**Validates: Requirements 11.4**

### Property 61: JWT Authentication Validation

*For any* API endpoint call, the system should validate the JWT token, extract the user role, and enforce role-based access control before processing the request.

**Validates: Requirements 11.5**



### Property 62: Foreign Key Referential Integrity

*For any* entity creation (store, item, offer), the system should validate that all foreign key references (vendor_id, store_id, category_id, item_id) point to existing active records.

**Validates: Requirements 12.1, 12.2, 12.3**

### Property 63: Foreign Key Violation Errors

*For any* database operation that would violate a foreign key constraint, the system should reject the operation and return a descriptive error message.

**Validates: Requirements 12.4**

### Property 64: Cascade Delete Protection

*For any* vendor with active stores, attempting to delete the vendor should be rejected with an error indicating stores must be deactivated first.

**Validates: Requirements 12.5**

### Property 65: Transaction Rollback on Failure

*For any* database transaction that encounters an error, the system should rollback all changes within that transaction to maintain data consistency.

**Validates: Requirements 12.6, 19.1**

### Property 66: API Rate Limiting

*For any* vendor making API requests, when request count exceeds the configured rate limit within the time window, the system should return 429 Too Many Requests with Retry-After header.

**Validates: Requirements 13.1, 13.2**

### Property 67: File Upload Security Validation

*For any* file upload, the system should validate file type against whitelist, validate size <= 5MB, and scan for malware before accepting the upload.

**Validates: Requirements 13.3**

### Property 68: SQL Injection Prevention

*For any* database query, the system should use parameterized queries or prepared statements to prevent SQL injection attacks.

**Validates: Requirements 13.4**

