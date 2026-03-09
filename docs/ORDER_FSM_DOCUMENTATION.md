# Order State Machine (FSM) Documentation

## Overview

This document outlines the Finite State Machines (FSM) for order processing in the Matrix Delivery platform. There are currently **two separate order systems** with conflicting status definitions:

1. **Marketplace Orders** - For vendor-to-customer marketplace transactions
2. **Traditional Delivery Orders** - For customer-to-driver delivery requests

**⚠️ CRITICAL ISSUE**: Both systems use overlapping status names (like 'accepted', 'picked_up', 'delivered', 'cancelled') with different meanings, causing data integrity and business logic conflicts.

---

## 1. Marketplace Order FSM

### States
- `pending` - Order created but payment not confirmed
- `paid` - Payment successfully processed
- `accepted` - Vendor confirms fulfillment
- `assigned` - Delivery driver assigned
- `picked_up` - Driver collected from vendor
- `delivered` - Package delivered to customer
- `completed` - Order finished successfully
- `rejected` - Vendor rejected after payment
- `cancelled` - Order cancelled before completion
- `disputed` - Customer reports issue after delivery
- `refunded` - Payment returned to customer
- `failed` - System or delivery error

### State Transitions

| From State | Event | Actor | To State | Notes |
|------------|-------|-------|----------|-------|
| pending | confirm_payment | customer | paid | Payment verified by gateway |
| pending | cancel_order | admin | cancelled | Admin cancels before processing |
| pending | payment_failed | system | failed | Payment error or timeout |
| paid | accept_order | vendor | accepted | Vendor confirms order |
| paid | reject_order | vendor | rejected | Vendor cannot fulfill |
| paid | cancel_order | admin | cancelled | Admin intervention |
| accepted | assign_driver | system/admin | assigned | Delivery driver assigned |
| assigned | pickup_order | driver | picked_up | Driver collects order |
| picked_up | deliver_order | driver | delivered | Package delivered |
| delivered | confirm_receipt | customer | completed | Order finished successfully |
| delivered | report_issue | customer | disputed | Customer dispute |
| disputed | resolve_complete | admin | completed | Admin resolves dispute |
| disputed | approve_refund | admin | refunded | Refund issued |
| rejected | process_refund | system | refunded | Automatic refund |
| assigned | cancel_order | admin | cancelled | Emergency cancel |
| picked_up | delivery_failed | system | failed | Delivery issue |

### Terminal States
These states end the order lifecycle:
- `completed`
- `cancelled`
- `refunded`
- `failed`

### Marketplace Order State Definitions

| State | Description | Entry Condition | Exit Trigger | Terminal |
|-------|-------------|-----------------|--------------|----------|
| pending | Order created but payment not yet confirmed | Customer places order | Payment confirmed or order canceled | No |
| paid | Payment successfully processed | Payment gateway confirms transaction | Vendor accepts or rejects order | No |
| accepted | Vendor confirms they will fulfill the order | Vendor accepts order | Driver assignment | No |
| assigned | Delivery driver assigned to the order | System/admin assigns driver | Driver picks up order | No |
| picked_up | Driver has collected the order from vendor | Driver confirms pickup | Driver delivers order | No |
| delivered | Order delivered to customer location | Driver confirms delivery | Customer confirms receipt or reports issue | No |
| completed | Order successfully finished | Customer confirms delivery or dispute resolved | None | Yes |
| rejected | Vendor rejected the order after payment | Vendor declines fulfillment | Refund processed | No |
| cancelled | Order canceled before completion | Admin or system cancellation | None | Yes |
| disputed | Customer reports issue after delivery | Customer files dispute | Admin resolves dispute | No |
| refunded | Payment returned to customer | Refund approved or vendor rejection | None | Yes |
| failed | Order failed due to system or delivery error | Payment failure or delivery failure | None | Yes |

---

## 2. Traditional Delivery Order FSM

### States
- `pending_bids` - Order posted, waiting for driver bids
- `accepted` - Driver bid accepted by customer
- `picked_up` - Driver picked up package
- `in_transit` - Package in transit to destination
- `delivered` - Package delivered successfully
- `delivered_pending` - Delivered but awaiting confirmation
- `cancelled` - Order cancelled

### State Transitions

| From State | Event | Actor | To State | Notes |
|------------|-------|-------|----------|-------|
| pending_bids | accept_bid | customer | accepted | Customer accepts driver bid |
| pending_bids | cancel_order | customer/admin | cancelled | Order cancelled before acceptance |
| accepted | pickup_package | driver | picked_up | Driver confirms pickup |
| accepted | cancel_order | customer/driver | cancelled | Cancellation after acceptance |
| picked_up | start_delivery | driver | in_transit | Driver begins delivery |
| picked_up | cancel_order | customer/admin | cancelled | Emergency cancellation |
| in_transit | complete_delivery | driver | delivered | Package delivered |
| in_transit | delivery_issue | driver | cancelled | Cannot complete delivery |
| delivered | confirm_delivery | customer | delivered_pending | Customer confirms receipt |
| delivered_pending | finalize_order | system | completed | Order completion confirmed |
| delivered_pending | dispute_delivery | customer | disputed | Customer reports issue |

### Terminal States
- `completed`
- `cancelled`
- `disputed`

### Traditional Delivery Order State Definitions

| State | Description | Entry Condition | Exit Trigger | Terminal |
|-------|-------------|-----------------|--------------|----------|
| pending_bids | Order posted waiting for drivers | Customer creates delivery request | Driver bid accepted or order cancelled | No |
| accepted | Driver assigned and accepted | Customer accepts driver bid | Driver picks up package | No |
| picked_up | Driver has the package | Driver confirms pickup | Driver starts delivery | No |
| in_transit | Package being delivered | Driver begins transit | Package delivered or issue occurs | No |
| delivered | Package at destination | Driver confirms delivery | Customer confirms or reports issue | No |
| delivered_pending | Delivery confirmed, awaiting finalization | Customer acknowledges delivery | System finalizes or dispute raised | No |
| cancelled | Order cancelled | Customer/driver/admin cancels | None | Yes |
| completed | Order successfully completed | System finalizes delivery | None | Yes |
| disputed | Customer disputes delivery | Customer reports issue | Admin resolution | Yes |

---

## 3. CONFLICT ANALYSIS

### 🚨 Critical Conflicts Identified

#### **Status Name Collisions**

| Conflicting Status | Marketplace Meaning | Traditional Meaning | Impact |
|-------------------|-------------------|-------------------|---------|
| `accepted` | Vendor confirms fulfillment | Driver bid accepted | ❌ **MAJOR** - Different business logic |
| `picked_up` | Driver collected from vendor | Driver picked up from customer | ❌ **MAJOR** - Different actors/locations |
| `delivered` | Package delivered to customer | Package delivered to destination | ⚠️ **MODERATE** - Similar but different context |
| `cancelled` | Order cancelled before completion | Order cancelled at any stage | ⚠️ **MODERATE** - Overlapping but different triggers |

#### **Business Logic Conflicts**

1. **Actor Confusion**:
   - Marketplace `picked_up`: Driver collects from **vendor**
   - Traditional `picked_up`: Driver collects from **customer**

2. **Process Flow Differences**:
   - Marketplace: `pending → paid → accepted → assigned → picked_up → delivered → completed`
   - Traditional: `pending_bids → accepted → picked_up → in_transit → delivered → delivered_pending → completed`

3. **Terminal State Inconsistencies**:
   - Marketplace has `rejected`, `disputed`, `refunded`, `failed`
   - Traditional has `disputed` but lacks `rejected`, `refunded`, `failed`

#### **Database and Query Issues**

```sql
-- PROBLEMATIC: This query returns WRONG results
SELECT * FROM orders WHERE status = 'accepted'
-- Returns both marketplace orders (vendor accepted) AND traditional orders (driver accepted)

-- CORRECT: Should distinguish by order_type
SELECT * FROM orders WHERE status = 'accepted' AND order_type = 'marketplace'
SELECT * FROM orders WHERE status = 'accepted' AND order_type = 'traditional'
```

#### **Code Implementation Conflicts**

```javascript
// Marketplace service expects action-based transitions
await marketplaceOrderService.vendorAcceptOrder(orderId, vendorId);
// Status becomes 'accepted' (vendor confirmed)


// Traditional service expects direct status updates
await orderService.updateOrderStatus(orderId, 'accepted');
// Status becomes 'accepted' (driver bid accepted)
```

---

## 4. RECOMMENDED SOLUTION

### Phase 1: Status Namespace Separation

```javascript
// Separate constants to eliminate conflicts
const MARKETPLACE_ORDER_STATUS = {
  PENDING: 'marketplace_pending',
  PAID: 'marketplace_paid',
  ACCEPTED: 'marketplace_accepted',     // ← Was 'accepted'
  ASSIGNED: 'marketplace_assigned',
  PICKED_UP: 'marketplace_picked_up',   // ← Was 'picked_up'
  DELIVERED: 'marketplace_delivered',   // ← Was 'delivered'
  COMPLETED: 'marketplace_completed',
  CANCELLED: 'marketplace_cancelled',   // ← Was 'cancelled'
  REJECTED: 'marketplace_rejected',
  DISPUTED: 'marketplace_disputed',
  REFUNDED: 'marketplace_refunded',
  FAILED: 'marketplace_failed'
};

const TRADITIONAL_ORDER_STATUS = {
  PENDING_BIDS: 'traditional_pending_bids',
  ACCEPTED: 'traditional_accepted',      // ← Was 'accepted'
  PICKED_UP: 'traditional_picked_up',    // ← Was 'picked_up'
  IN_TRANSIT: 'traditional_in_transit',
  DELIVERED: 'traditional_delivered',    // ← Was 'delivered'
  DELIVERED_PENDING: 'traditional_delivered_pending',
  CANCELLED: 'traditional_cancelled'     // ← Was 'cancelled'
};
```

### Phase 2: Database Migration

```sql
-- Update existing data to use namespaced statuses
UPDATE marketplace_orders SET status = 'marketplace_' || status;
UPDATE orders SET status = 'traditional_' || status WHERE order_type = 'delivery';
```

### Phase 3: Code Updates

1. Update all service methods to use namespaced constants
2. Update controller endpoints to handle both systems
3. Update test files with correct expectations
4. Update frontend components to display appropriate statuses
5. Update database queries to filter by order_type

### Phase 4: Unified API Design

Consider creating a unified order processing API that can handle both order types with appropriate status mappings internally.

---

## 5. IMMEDIATE ACTIONS REQUIRED

1. **STOP using conflicting status names immediately**
2. **Add order_type field to all order tables if not present**
3. **Implement namespaced status constants**
4. **Create data migration script**
5. **Update all code references**
6. **Add comprehensive tests for both FSMs**

**Status**: **CRITICAL - IMMEDIATE FIX REQUIRED** 🔴

**Risk**: Data corruption, incorrect business logic, customer service issues, financial reporting errors.
