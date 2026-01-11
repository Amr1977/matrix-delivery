# 🚗 Flexible Order Types & Complex Delivery Flows

This document outlines the planned features for increasing the flexibility of the Matrix Delivery Platform, specifically focusing on new order types and varied delivery scenarios.

## 🎯 Core Concepts

### 1. Order Types

The system will evolve to support distinct primary order types:

#### 📦 Delivery

- **Description**: The classic transport of goods from Point A to Point B (or multiple points).
- **Actors**: Sender, Courier, Recipient.
- **Key Attributes**: Package details (size, weight), proof of delivery, cargo insurance (optional).

#### 🚖 Ride Request

- **Description**: Passenger transport service.
- **Actors**: Passenger, Driver.
- **Key Attributes**: Passenger count, vehicle type preferences, safety protocols.
- **Differences from Delivery**: No physical package handling, emphasis on passenger safety and comfort, different pricing models (time + distance vs. weight + distance).

---

## 🔄 Delivery Order Flows

To support diverse logistical needs, the delivery system will support the following permutations of pickup and drop-off:

### 1. Single Pickup, Single Delivery (1:1)

- **Scenario**: A user sends a package from their home to a friend's house.
- **Flow**: `Pickup -> Dropoff`
- **Current Support**: ✅ Fully Supported (MVP)

### 2. Single Pickup, Multi Delivery (1:N)

- **Scenario**: A restaurant dispatching orders to 3 distinct customers in a single run; A business sending holiday gifts to multiple clients.
- **Flow**: `Pickup (Location A) -> Dropoff (Location B) -> Dropoff (Location C) -> Dropoff (Location D)`
- **Tech Implications**:
  - Route optimization needed to determine efficient drop-off order.
  - Partial completion tracking (e.g., delivered to B and C, but failed at D).

### 3. Multi-Pickup, Single Delivery (N:1)

- **Scenario**: A user ordering items from a pharmacy, a grocery store, and a laundry shop to be brought to their home.
- **Flow**: `Pickup (Location A) -> Pickup (Location B) -> Pickup (Location C) -> Dropoff (Location User)`
- **Tech Implications**:
  - Courier capacity management (ensure space for all items).
  - Time window coordination (so food doesn't get cold while picking up laundry).

### 4. Multi-Pickup, Multi Delivery (N:M)

- **Scenario**: A courier acting as a consolidated logistics provider, picking up returns from multiple users and delivering new items to others in a optimized route.
- **Flow**: `Pickup (A) -> Dropoff (B) -> Pickup (C) -> Dropoff (D)` (Interleaved)
- **Tech Implications**:
  - Complex "Traveling Salesman" style route optimization.
  - Dynamic route updates (inserting a new pickup mid-route).
  - Advanced inventory management for the courier app (what is currently on board?).

---

## 📝 Implementation Considerations

### Database Schema Updates

- **Orders Table**: Add `type` enum (`delivery`, `ride`).
- **Waypoints Table**: Enhance to support sequence numbers and type (`pickup`, `dropoff`, `intermediate`).
- **Pricing Engine**: Different formulas for rides vs. deliveries vs. multi-stop routes.

### UI/UX Updates

- **Customer App**: Selection screen for "Ride" vs "Delivery". Multi-stop route builder.
- **Driver App**: Clear visual itinerary. "Next Stop" logic updates. Verification steps for each stop.

### Validation

- Ensure pickup/dropoff pairings are valid.
- Geofencing checks for each individual stop.
