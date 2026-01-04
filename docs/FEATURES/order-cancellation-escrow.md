# Order Cancellation & Escrow System

> Complete technical specification for order cancellation, driver withdrawal, emergency transfers, and balance escrow management.

## Table of Contents

1. [Overview](#overview)
2. [Order Lifecycle](#order-lifecycle)
3. [Escrow System](#escrow-system)
4. [Courier Cash Registry](#courier-cash-registry)
5. [Cancellation Rules](#cancellation-rules)
6. [Emergency Transfer System](#emergency-transfer-system)
7. [Anti-Fraud Measures](#anti-fraud-measures)
8. [Database Schema](#database-schema)
9. [API Endpoints](#api-endpoints)
10. [Compensation Calculation](#compensation-calculation)

---

## Overview

This document defines the complete order cancellation and escrow system for Matrix Delivery. The system ensures:

- **Customer protection**: Clear cancellation rules, transparent fees
- **Driver protection**: Guaranteed compensation for work done
- **Takaful fund**: Emergency costs covered by cooperative insurance (see [Takaful Documentation](takaful-cooperative-insurance.md))
- **Courier cash filtering**: Only see orders matching available cash
- **Platform security**: Anti-fraud measures for both roles
- **Emergency handling**: Seamless order transfer (30-min timer)

---

## Order Lifecycle

### Status Flow

```
pending_bids → accepted → picked_up → in_transit → delivered_pending → delivered
                                                                          ↓
                                        ← ← ← cancelled ← ← ← ← ← ← ← ← ←
```

### Status Definitions

| Status | Description | Customer Cancel | Driver Withdraw |
|--------|-------------|-----------------|-----------------|
| `pending_bids` | Order awaiting bids | ✅ Full refund | N/A |
| `accepted` | Bid accepted, driver assigned | 🟡 Distance fee | 🟡 Partial pay |
| `picked_up` | Driver has package | ❌ Blocked | 🔴 Emergency only |
| `in_transit` | Driver delivering | ❌ Blocked | 🔴 Emergency only |
| `delivered_pending` | Driver marked complete | ❌ Blocked | ❌ N/A |
| `delivered` | Customer confirmed | ❌ Closed | ❌ Closed |
| `cancelled` | Order cancelled | N/A | N/A |

---

## Escrow System

### Core Principle

> **All orders have upfront_payment field (default 0). Customer hold = upfront_payment + delivery_fee.**

### Order Fields

| Field | Description | Required | Default |
|-------|-------------|----------|---------|
| `upfront_payment` | Cash courier needs to pay for purchases | Yes | 0 |
| `estimated_delivery_fee` | Customer's expected delivery cost | Yes | - |
| `delivery_fee` | Actual accepted bid amount | Set on accept | - |

### Balance Rules

| Action | Check | Hold |
|--------|-------|------|
| Order Creation | `balance >= upfront + estimated_fee` | None |
| Bid Acceptance | `balance >= upfront + bid_amount` | `upfront + bid_amount` |

### Standard Order Flow (upfront = 0)

```javascript
// 1. Customer creates order
const upfrontPayment = 0; // No purchase needed
const estimatedFee = 50;

if (customer.balance < (upfrontPayment + estimatedFee)) {
  throw new Error('Insufficient balance');
}

// 2. Customer accepts bid (45 EGP)
const bidAmount = 45;
const holdAmount = upfrontPayment + bidAmount; // 0 + 45 = 45

await balanceService.holdFunds(customerId, orderId, holdAmount);
```

### Order with Upfront Payment

```javascript
// 1. Customer creates order needing purchase
const upfrontPayment = 100; // Courier will buy items
const estimatedFee = 50;
const requiredBalance = upfrontPayment + estimatedFee; // 150

if (customer.balance < requiredBalance) {
  throw new Error(`Need ${requiredBalance} EGP. Your balance: ${customer.balance}`);
}

// 2. Customer accepts bid (45 EGP)
const bidAmount = 45;
const holdAmount = upfrontPayment + bidAmount; // 100 + 45 = 145

await balanceService.holdFunds(customerId, orderId, holdAmount);
```

#### 3. Delivery Complete
```javascript
// Customer confirms delivery
await orderService.updateOrderStatus(orderId, customerId, 'confirm_delivery');

// System releases escrow
const driverPayout = acceptedBidAmount - platformCommission;
await balanceService.releaseHold(customerId, orderId);
await balanceService.creditEarnings(driverId, orderId, driverPayout);
```

### COD Order Flow

#### Balance Requirement for COD
```
required_balance = upfront_payment + estimated_delivery_fee
hold_amount = upfront_payment + accepted_bid_amount
```

#### 1. Order Creation
```javascript
const upfrontPayment = 100; // Driver will purchase items
const estimatedFee = 50;
const requiredBalance = upfrontPayment + estimatedFee; // 150 EGP

if (customer.available_balance < requiredBalance) {
  throw new Error(`COD orders require ${requiredBalance} EGP. Your balance: ${customer.available_balance}`);
}
```

#### 2. Bid Acceptance
```javascript
const acceptedBid = 45;
const holdAmount = upfrontPayment + acceptedBid; // 145 EGP

if (customer.available_balance < holdAmount) {
  throw new Error('Insufficient balance for this bid');
}

await balanceService.holdFunds(customerId, orderId, holdAmount);
```

#### 3. Driver Makes Purchase
```javascript
// Driver pays for items and uploads receipt
await orderService.updateCODStatus(orderId, {
  cod_purchase_amount: 100,
  cod_receipt_url: 'https://storage.../receipt.jpg',
  cod_paid_by_driver: true
});
```

#### 4. Delivery Complete
```javascript
// Customer pays CASH to driver: upfront + delivery = 145 EGP
// Driver confirms cash received
await orderService.confirmCashReceived(orderId, driverId);

// System RELEASES hold back to customer (they paid cash)
await balanceService.releaseHold(customerId, orderId);
```

#### 5. Cancellation After Driver Paid
```javascript
if (order.cod_paid_by_driver) {
  // Driver must be reimbursed for purchase
  const reimbursement = order.cod_purchase_amount;
  const distanceCompensation = calculateDistanceCompensation(order);
  
  // Forfeit from customer hold → driver
  await balanceService.forfeitHold(customerId, orderId, reimbursement + distanceCompensation, driverId);
}
```

---

## Courier Cash Registry

> Couriers register their available cash so they only see orders they can afford.

### Purpose

Couriers need to know upfront payment requirements before bidding. They should:
1. Register their available cash amount in profile
2. Only see orders where `upfront_payment <= available_cash`

### Database Changes

```sql
-- Courier cash availability
ALTER TABLE users ADD COLUMN available_cash DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN cash_currency TEXT DEFAULT 'EGP';

-- Courier-specific compensation rates
ALTER TABLE users ADD COLUMN cancellation_base_fee DECIMAL(10,2) DEFAULT 10;
ALTER TABLE users ADD COLUMN cancellation_per_km_rate DECIMAL(10,2) DEFAULT 3;
ALTER TABLE users ADD COLUMN compensation_currency TEXT DEFAULT 'EGP';
```

### Order Visibility Filter (Backend)

> **Combined filter**: Distance proximity + Courier cash capacity

```sql
-- In orderService.getAvailableOrders(driverId)
-- Orders visible to courier must satisfy BOTH conditions:
SELECT o.* FROM orders o
WHERE o.status = 'pending_bids'
  -- 1. Distance filter (existing)
  AND ST_DWithin(
    o.pickup_location::geography,
    ST_SetSRID(ST_MakePoint(:driverLon, :driverLat), 4326)::geography,
    :maxDistanceMeters
  )
  -- 2. Cash filter (NEW)
  AND o.upfront_payment <= :courierAvailableCash
ORDER BY ST_Distance(
  o.pickup_location::geography,
  ST_SetSRID(ST_MakePoint(:driverLon, :driverLat), 4326)::geography
) ASC;
```

### UI: Driver Profile

```
┌─────────────────────────────────────┐
│ 💰 Available Cash for Purchases    │
│ ┌─────────────────────────────────┐ │
│ │ 500                         EGP │ │
│ └─────────────────────────────────┘ │
│ Orders requiring more cash will    │
│ not appear in your order list.     │
└─────────────────────────────────────┘
```

---

## Cancellation Rules

### Customer Cancellation

| Order Status | Can Cancel? | Penalty |
|--------------|-------------|---------|
| `pending_bids` | ✅ Yes | None - full refund |
| `accepted` (driver not moved) | ✅ Yes | Minimal or none |
| `accepted` (driver traveled > 500m) | ✅ Yes | Distance fee |
| `picked_up` | ❌ No | Must contact admin |
| `in_transit` | ❌ No | Must contact admin |

### Driver Withdrawal

| Order Status | Can Withdraw? | Compensation |
|--------------|---------------|--------------|
| `accepted` (not moved) | ✅ Yes | None |
| `accepted` (traveled > 500m) | ✅ Yes | Partial pay for distance |
| `picked_up` | 🔴 Emergency only | Partial pay + transfer |
| `in_transit` | 🔴 Emergency only | Partial pay + transfer |

### Admin Cancellation

- Can cancel/reassign at any status
- Can override fees
- Required for post-pickup cancellations

---

## Emergency Transfer System

### When Driver Cannot Continue

Triggers: Accident, vehicle breakdown, medical emergency, arrest, etc.

### Fee Structure for New Courier

```
Original Order:
  - upfront_payment: 100 EGP (what original courier paid)
  - delivery_fee: 50 EGP (original bid)
  - original_courier_distance: 3 km traveled

New Courier Assignment:
  - pickup_location: Original courier's current GPS
  - dropoff_location: Original destination
  - new_delivery_distance: ~7 km remaining
  
New Courier Earns:
  ┌─────────────────────────────────────────────────┐
  │ Base: Original delivery fee          = 50 EGP  │
  │ + Emergency bonus (20%)              = 10 EGP  │
  │ = Total delivery fee for new courier = 60 EGP  │
  └─────────────────────────────────────────────────┘

New Courier Pays to Original:
  ┌─────────────────────────────────────────────────┐
  │ Upfront reimbursement                = 100 EGP │
  │ (New courier takes over upfront liability)     │
  └─────────────────────────────────────────────────┘

Original Courier Receives:
  ┌─────────────────────────────────────────────────┐
  │ Upfront reimbursement from new       = 100 EGP │
  │ + Distance compensation (3km × 3)    =   9 EGP │
  │ + Base compensation                  =  10 EGP │
  │ = Total payout                       = 119 EGP │
  └─────────────────────────────────────────────────┘
```

### Assignment Mechanism: First-Come-First-Served

```javascript
// Find eligible couriers for emergency
const nearbyCouriers = await pool.query(`
  SELECT u.* FROM users u
  WHERE u.primary_role = 'driver'
    AND u.is_available = true
    AND u.available_cash >= $1  -- Can cover upfront
    AND ST_DWithin(
      u.current_location,
      $2,  -- Original driver location
      5000 -- 5km radius
    )
    AND u.id != $3  -- Not the original driver
  ORDER BY ST_Distance(u.current_location, $2) ASC
  LIMIT 20
`, [order.upfront_payment, originalDriverLocation, originalDriverId]);

// First courier to tap "Accept" wins
```

### Flow

```
1. Driver triggers "Emergency Transfer"
   ├─ Selects reason (accident, breakdown, medical, other)
   ├─ System captures GPS location
   └─ Order status → 'emergency_transfer'

2. System finds eligible couriers
   ├─ Within 5km radius
   ├─ available_cash >= upfront_payment
   └─ Push notification to all

3. First-Come-First-Served acceptance
   ├─ First to tap "Accept" gets assignment
   ├─ Others see "Already taken" if late
   └─ Lock mechanism prevents double-accept

4. New courier accepts
   ├─ Navigates to original courier
   ├─ Pays upfront reimbursement (cash handoff)
   └─ Takes possession of package

5. Handoff confirmation
   ├─ Both couriers confirm in app
   ├─ Original courier receives distance compensation
   ├─ New courier continues delivery
   └─ New courier collects from customer + earns fee

6. Timeout (15 min) → Admin escalation
   ├─ Admin manually assigns
   └─ Or contacts customer for pickup option
```

### What New Courier Sees

```
┌──────────────────────────────────────────┐
│ 🚨 EMERGENCY TRANSFER                    │
├──────────────────────────────────────────┤
│ 📍 Pickup: Current courier location      │
│    2.3 km away                           │
│                                          │
│ 🏁 Deliver: [Destination Address]        │
│    7.1 km from pickup                    │
│                                          │
│ 💵 Upfront to Pay: 100 EGP               │
│    (Reimburse to original courier)       │
│                                          │
│ 💰 You Earn: 60 EGP (+20% bonus)         │
│                                          │
│ ⏱️ Expires in: 13:45                     │
├──────────────────────────────────────────┤
│        [ACCEPT]        [PASS]            │
└──────────────────────────────────────────┘
```

### Upfront Handling During Transfer

When original driver already paid for purchase:
- New driver pays original driver: `upfront_payment` (cash at handoff)
- New driver collects from customer: `upfront_payment + delivery_fee`
- New driver net profit: `delivery_fee + bonus`

---

## Anti-Fraud Measures

### Customer Fraud Prevention

| Risk | Mitigation |
|------|------------|
| Create order without funds | Balance check blocks creation |
| Accept bid beyond balance | Bid acceptance validates balance |
| Cancel after driver works | Escrow guarantees compensation |
| Refuse COD payment | Escrow covers purchase + distance |
| Claim non-delivery | Require photo + GPS evidence |

### Driver Fraud Prevention

| Risk | Mitigation |
|------|------------|
| Fake emergency to steal | GPS tracking, police report option |
| Inflated COD receipts | Photo verification, merchant lookup |
| Fake delivery confirmation | Customer confirmation required |
| Abandon after acceptance | Reputation penalty, possible suspension |

### Evidence Requirements

**Pickup:**
- Driver photo of package
- GPS at pickup location (±50m)
- COD receipt photo (if applicable)

**Delivery:**
- Driver photo at delivery location
- GPS at dropoff (±50m)
- Customer in-app confirmation OR photo of handoff

---

## Database Schema

### Orders Table Updates

```sql
-- Escrow tracking
ALTER TABLE orders ADD COLUMN escrow_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN escrow_status TEXT DEFAULT 'none';
  -- Values: 'none', 'held', 'released', 'forfeited'

-- Cancellation tracking
ALTER TABLE orders ADD COLUMN cancellation_reason TEXT;
ALTER TABLE orders ADD COLUMN cancellation_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN cancelled_by TEXT;
  -- Values: 'customer', 'driver', 'admin', 'system'
ALTER TABLE orders ADD COLUMN driver_distance_traveled_km DECIMAL(10,3);

-- COD tracking
ALTER TABLE orders ADD COLUMN upfront_payment DECIMAL(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN cod_purchase_amount DECIMAL(10,2);
ALTER TABLE orders ADD COLUMN cod_receipt_url TEXT;
ALTER TABLE orders ADD COLUMN cod_paid_by_driver BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN cod_collected BOOLEAN DEFAULT FALSE;
```

### Emergency Transfers Table

```sql
CREATE TABLE emergency_transfers (
  id SERIAL PRIMARY KEY,
  original_order_id TEXT REFERENCES orders(id),
  internal_order_id TEXT,
  
  -- Original driver
  original_driver_id TEXT REFERENCES users(id),
  original_driver_distance_km DECIMAL(10,3),
  original_driver_payout DECIMAL(10,2),
  
  -- New driver
  new_driver_id TEXT REFERENCES users(id),
  new_driver_bonus DECIMAL(10,2),
  
  -- Transfer details
  transfer_reason TEXT NOT NULL,
  transfer_location GEOGRAPHY(POINT, 4326),
  cod_reimbursement DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending',
    -- Values: 'pending', 'accepted', 'in_progress', 'completed', 'escalated'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  escalated_at TIMESTAMPTZ
);
```

### Balance Service Methods

```javascript
// balanceService.js additions

async holdFunds(userId, orderId, amount) {
  const client = await this.pool.connect();
  try {
    await client.query('BEGIN');
    
    const balance = await this.getBalanceForUpdate(client, userId);
    if (balance.availableBalance < amount) {
      throw new Error('Insufficient balance');
    }
    
    // Update balances
    await client.query(`
      UPDATE user_balances 
      SET available_balance = available_balance - $1,
          held_balance = held_balance + $1
      WHERE user_id = $2
    `, [amount, userId]);
    
    // Create transaction record
    await this.createTransaction(client, {
      userId,
      type: 'ORDER_HOLD',
      amount: -amount,
      orderId,
      description: `Escrow hold for order #${orderId}`
    });
    
    // Update order escrow status
    await client.query(`
      UPDATE orders 
      SET escrow_amount = $1, escrow_status = 'held'
      WHERE id = $2
    `, [amount, orderId]);
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async releaseHold(userId, orderId) {
  // Move from held_balance, no destination (COD was paid in cash)
  // Or credit to driver for non-COD
}

async forfeitHold(customerId, orderId, penaltyAmount, driverId) {
  // Deduct penalty from customer's held_balance
  // Credit to driver's available_balance
  // Return remainder to customer's available_balance
}
```

---

## API Endpoints

### Order Cancellation

```
POST /api/orders/:orderId/cancel
Authorization: Bearer <token>
Body: { reason?: string }

Response:
{
  success: true,
  cancellationFee: 15.50,
  refundAmount: 34.50,
  message: "Order cancelled. Driver compensated 15.50 EGP."
}
```

### Driver Withdrawal

```
POST /api/orders/:orderId/withdraw
Authorization: Bearer <token>
Body: { reason?: string }

Response:
{
  success: true,
  compensation: 8.00,
  message: "Withdrawal confirmed. Partial payment: 8.00 EGP."
}
```

### Emergency Transfer

```
POST /api/orders/:orderId/emergency
Authorization: Bearer <token>
Body: { 
  reason: "vehicle_breakdown" | "accident" | "medical" | "other",
  notes?: string 
}

Response:
{
  success: true,
  transferId: "transfer-123",
  status: "pending",
  message: "Emergency transfer initiated. Nearby drivers notified."
}
```

---

## Compensation Calculation

```javascript
// Compensation rates are courier-specific from their profile
async function calculateCancellationCompensation(order, driver) {
  // Get rates from driver profile (or use defaults)
  const baseFee = driver.cancellation_base_fee || 10;
  const perKmRate = driver.cancellation_per_km_rate || 3;
  const currency = driver.compensation_currency || 'EGP';
  const MIN_DISTANCE_THRESHOLD = 0.5; // km (500m)
  
  let compensation = 0;
  
  // Distance compensation
  if (order.driver_distance_traveled_km >= MIN_DISTANCE_THRESHOLD) {
    compensation = baseFee + (order.driver_distance_traveled_km * perKmRate);
  }
  
  // Add upfront reimbursement if driver paid
  if (order.upfront_paid_by_driver && order.upfront_payment > 0) {
    compensation += order.upfront_payment;
  }
  
  // Cap at escrow amount
  return {
    amount: Math.min(compensation, order.escrow_amount),
    currency
  };
}
```

### Configuration

```javascript
const CANCELLATION_CONFIG = {
  // Defaults (can be overridden per courier)
  DEFAULT_BASE_FEE: 10,     // EGP
  DEFAULT_PER_KM_RATE: 3,   // EGP per km
  MIN_DISTANCE_KM: 0.5,     // 500m threshold
  EMERGENCY_TIMEOUT_MIN: 15,        // 15 minutes
  EMERGENCY_BONUS_PERCENT: 20       // 20% bonus for accepting transfers
};
```

---

## Implementation Checklist

### Phase 1: Escrow Foundation
- [ ] Add `upfront_payment` field to orders (default 0)
- [ ] Add `holdFunds()`, `releaseHold()`, `forfeitHold()` to balanceService.js
- [ ] Balance check on order creation: `>= upfront + estimated_fee`
- [ ] Balance check on bid acceptance: `>= upfront + bid_amount`
- [ ] Hold on acceptance: `upfront + bid_amount`
- [ ] UI: Show upfront payment field on order form
- [ ] UI: Show balance requirement clearly

### Phase 2: Courier Cash Registry
- [ ] Add `available_cash` column to users
- [ ] Add courier compensation rate columns
- [ ] Filter orders by courier cash capacity
- [ ] UI: Driver profile cash input
- [ ] UI: Hide orders exceeding cash

### Phase 2: Cancellation with Compensation
- [ ] Track driver distance from acceptance
- [ ] Implement compensation calculation
- [ ] Update cancel flow to use forfeit
- [ ] UI: Show estimated fee before cancel

### Phase 3: COD Enhancement
- [ ] Add COD fields to orders table
- [ ] Receipt upload in order chat
- [ ] COD confirmation flow
- [ ] Include COD in cancellation compensation

### Phase 4: Emergency Transfer
- [ ] Create emergency_transfers table
- [ ] Driver emergency trigger UI
- [ ] Internal order creation
- [ ] Nearby driver notification
- [ ] Handoff + COD handover flow
- [ ] Admin escalation after timeout

---

*Last Updated: 2026-01-04*
*Author: System*
