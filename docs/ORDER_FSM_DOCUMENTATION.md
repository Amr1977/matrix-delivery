# Verbose Multi-FSM Order Processing Documentation

## Overview

This document outlines the **Verbose Multi-Finite State Machine (FSM) Architecture** for order processing in the Matrix Delivery platform. The system now uses **three interconnected FSMs** working together through event-driven orchestration:

1. **Vendor FSM** - Manages vendor preparation lifecycle
2. **Payment FSM** - Handles customer payment processing
3. **Delivery FSM** - Coordinates courier logistics

**🎯 Key Improvements:**
- **Event-driven orchestration** for loose coupling
- **Separate FSM state tables** for normalization and history tracking
- **Comprehensive audit logging** for all state transitions
- **Explicit edge case handling** for complex business scenarios
- **Backward-compatible API design** maintaining existing contracts

---

## 1. Vendor FSM - Preparation Lifecycle

### States (Verbose Naming)
- `awaiting_order_availability_vendor_confirmation` - Initial state, waiting for vendor decision
- `order_rejected_by_vendor` - **Terminal**: Vendor declined to fulfill order
- `awaiting_vendor_start_preparation` - Vendor confirmed, ready to start preparation
- `vendor_is_actively_preparing_order` - Vendor actively preparing the order
- `order_is_fully_prepared_and_ready_for_delivery` - Order ready for courier pickup

### State Transitions

| From State | Event | Actor | To State | Guards | Events Emitted |
|------------|-------|-------|----------|--------|----------------|
| awaiting_order_availability_vendor_confirmation | vendor_confirms_order_is_available | Vendor | awaiting_vendor_start_preparation | vendor_is_active, vendor_has_inventory, order_not_expired | VENDOR_CONFIRMED |
| awaiting_order_availability_vendor_confirmation | vendor_rejects_order_due_to_unavailability | Vendor | order_rejected_by_vendor | - | - |
| awaiting_vendor_start_preparation | vendor_starts_preparing_order | Vendor | vendor_is_actively_preparing_order | - | PREPARATION_STARTED |
| vendor_is_actively_preparing_order | vendor_marks_order_as_fully_prepared | Vendor | order_is_fully_prepared_and_ready_for_delivery | - | PREPARATION_COMPLETE |

**Terminal States**: `order_rejected_by_vendor`

---

## 2. Payment FSM - Customer Payment Processing

### States (Verbose Naming)
- `payment_pending_for_customer` - Waiting for customer payment
- `payment_attempt_failed_for_order` - **Terminal**: Payment failed, customer can retry
- `payment_successfully_received_and_verified_for_order` - **Terminal**: Payment completed successfully
- `payment_has_been_refunded_to_customer` - **Terminal**: Payment refunded

### State Transitions

| From State | Event | Actor | To State | Guards | Events Emitted |
|------------|-------|-------|----------|--------|----------------|
| payment_pending_for_customer | customer_completes_payment_successfully | Customer | payment_successfully_received_and_verified_for_order | payment_amount_valid, payment_method_supported | PAYMENT_SUCCESSFUL |
| payment_pending_for_customer | payment_attempt_failed_or_timed_out | System | payment_attempt_failed_for_order | - | PAYMENT_FAILED |
| payment_successfully_received_and_verified_for_order | admin_or_system_requests_refund | Admin/System | payment_has_been_refunded_to_customer | refund_reason_provided, refund_not_already_processed | PAYMENT_REFUNDED |
| payment_attempt_failed_for_order | customer_retries_payment | Customer | payment_pending_for_customer | retry_attempts_remaining, order_still_valid | PAYMENT_RETRY_INITIATED |

**Terminal States**: `payment_successfully_received_and_verified_for_order`, `payment_has_been_refunded_to_customer`, `payment_attempt_failed_for_order`

---

## 3. Delivery FSM - Courier Logistics

### States (Verbose Naming)
- `delivery_request_created_waiting_for_courier_acceptance` - Waiting for courier assignment
- `courier_has_been_assigned_to_deliver_the_order` - Courier assigned to order
- `courier_has_arrived_at_vendor_pickup_location` - Courier at vendor location
- `courier_confirms_receipt_of_order_from_vendor` - Order picked up from vendor
- `courier_is_actively_transporting_order_to_customer` - Order in transit
- `courier_has_arrived_at_customer_drop_off_location` - Courier at customer location
- `courier_marks_order_as_delivered_to_customer` - Courier marked as delivered
- `awaiting_customer_confirmation_of_order_delivery` - Waiting for customer confirmation
- `order_delivery_successfully_completed_and_confirmed_by_customer` - **Terminal**: Order completed
- `delivery_disputed_by_customer_and_requires_resolution` - **Terminal**: Customer dispute

### State Transitions

| From State | Event | Actor | To State | Guards | Events Emitted |
|------------|-------|-------|----------|--------|----------------|
| delivery_request_created_waiting_for_courier_acceptance | courier_accepts_delivery_request | Driver | courier_has_been_assigned_to_deliver_the_order | courier_available, courier_in_delivery_zone | COURIER_ASSIGNED |
| courier_has_been_assigned_to_deliver_the_order | courier_arrives_at_vendor_pickup_location | Driver | courier_has_arrived_at_vendor_pickup_location | courier_assigned_to_order | COURIER_AT_VENDOR |
| courier_has_arrived_at_vendor_pickup_location | courier_confirms_receipt_of_order_from_vendor | Driver | courier_is_actively_transporting_order_to_customer | courier_assigned_to_order, order_prepared_by_vendor | ORDER_PICKED_UP |
| courier_is_actively_transporting_order_to_customer | courier_arrives_at_customer_drop_off_location | Driver | courier_has_arrived_at_customer_drop_off_location | courier_assigned_to_order | COURIER_AT_CUSTOMER |
| courier_has_arrived_at_customer_drop_off_location | courier_marks_order_as_delivered_to_customer | Driver | awaiting_customer_confirmation_of_order_delivery | courier_assigned_to_order, customer_location_reachable | ORDER_DELIVERED_TO_CUSTOMER |
| awaiting_customer_confirmation_of_order_delivery | customer_confirms_receipt_of_order | Customer | order_delivery_successfully_completed_and_confirmed_by_customer | order_delivered_by_courier, no_prior_dispute | DELIVERY_CONFIRMED |
| awaiting_customer_confirmation_of_order_delivery | customer_reports_problem_with_delivery | Customer | delivery_disputed_by_customer_and_requires_resolution | dispute_reason_provided | DELIVERY_DISPUTED |

**Terminal States**: `order_delivery_successfully_completed_and_confirmed_by_customer`, `delivery_disputed_by_customer_and_requires_resolution`

---
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

## 4. RECOMMENDED SOLUTION (UPDATED BASED ON ARCHITECTURE REVIEW) ✅

### Architecture Review Summary

**Key Insight**: Avoid status namespacing. Instead use `order_type + status` combination.

**Benefits**:
- Preserves domain semantics
- Avoids redundant state names
- Scales better for future order types
- Keeps database schema clean

### Preferred Database Schema

```sql
-- Clean schema without namespacing
orders
- id
- order_type  -- 'marketplace' or 'delivery'
- status      -- Clean status names like 'accepted', 'delivered'
```

**Example Records**:
```
 id   order_type    status
 ---- ------------- ----------
 1    marketplace   accepted    -- Vendor accepted marketplace order
 2    delivery      accepted    -- Driver bid accepted for delivery
```

**Correct Query Pattern**:
```sql
-- Instead of: WHERE status = 'marketplace_accepted'
-- Use:        WHERE order_type = 'marketplace' AND status = 'accepted'
SELECT * FROM orders
WHERE order_type = 'marketplace'
AND status = 'accepted'
```

---

## 5. IMPLEMENTATION PLAN

### FSM Registry Architecture

```javascript
// fsm/OrderFSMRegistry.js
class OrderFSMRegistry {
  constructor() {
    this.fsms = {
      marketplace: new MarketplaceOrderFSM(),
      delivery: new DeliveryOrderFSM()
    };
  }

  getFSM(orderType) {
    const fsm = this.fsms[orderType];
    if (!fsm) {
      throw new Error(`No FSM found for order type: ${orderType}`);
    }
    return fsm;
  }
}

// Usage
const registry = new OrderFSMRegistry();
const fsm = registry.getFSM(order.order_type);
const canTransition = fsm.validateTransition(currentStatus, event);
```

### Separate FSM Classes

Each FSM handles its own transitions, guards, and terminal states.

**Benefits**:
- Clear separation of business logic
- Easier testing and maintenance
- Prevents cross-FSM status misuse
- Scales for future order types

---

## 6. UPDATED STATUS CONSTANTS

### Clean Status Definitions (No Namespacing)

```javascript
// config/constants.js - UPDATED
const ORDER_STATUS = {
  // Shared statuses (different meanings by context)
  PENDING: 'pending',
  ACCEPTED: 'accepted',      // marketplace: vendor accepted, delivery: driver bid accepted
  PICKED_UP: 'picked_up',    // marketplace: from vendor, delivery: from customer
  DELIVERED: 'delivered',    // marketplace: to customer, delivery: to destination
  CANCELED: 'canceled',      // Standardized spelling
  COMPLETED: 'completed',

  // Marketplace-specific statuses
  PAID: 'paid',
  ASSIGNED: 'assigned',
  REJECTED: 'rejected',
  DISPUTED: 'disputed',
  REFUNDED: 'refunded',
  FAILED: 'failed',

  // Delivery-specific statuses
  PENDING_BIDS: 'pending_bids',
  IN_TRANSIT: 'in_transit',
  DELIVERED_PENDING: 'delivered_pending'
};
```

### Order Type Constants

```javascript
const ORDER_TYPES = {
  MARKETPLACE: 'marketplace',
  DELIVERY: 'delivery'
};
```
