# Marketplace Order API Documentation

## Overview

The Marketplace Order API provides comprehensive order management functionality for the Matrix Delivery platform's marketplace feature. This API implements a sophisticated state machine that handles the complete order lifecycle from creation to completion, including payment processing, vendor fulfillment, driver delivery, and customer confirmation.

## Base URL
```
/api/marketplace/orders
```

## Authentication
All endpoints require JWT authentication with appropriate user roles.

## Order State Machine

The marketplace order system implements a comprehensive state machine with the following statuses:

| Status | Description |
|--------|-------------|
| `pending` | Order created, awaiting payment confirmation |
| `paid` | Payment received, awaiting vendor acceptance |
| `accepted` | Vendor accepted, awaiting driver assignment |
| `assigned` | Driver assigned, awaiting pickup |
| `picked_up` | Driver picked up, en route to delivery |
| `delivered` | Delivered to customer, awaiting confirmation |
| `completed` | Customer confirmed receipt - final state |
| `cancelled` | Order cancelled before completion |
| `rejected` | Vendor rejected after payment |
| `disputed` | Customer disputed after delivery |
| `refunded` | Refund processed - final state |
| `failed` | System failure or timeout - final state |

## Endpoints

### 1. Create Order
**POST** `/api/marketplace/orders`

Creates a new marketplace order from the user's shopping cart.

#### Request Body
```json
{
  "deliveryAddress": "string (required)",
  "deliveryFee": "number (optional, default: 0)",
  "customerNotes": "string (optional)"
}
```

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 123,
    "order_number": "MO-1640995200000-ABC123",
    "status": "pending",
    "total_amount": 125.00,
    "delivery_fee": 5.00,
    "created_at": "2023-12-31T12:00:00Z",
    "user_id": 1,
    "vendor_id": 2,
    "store_id": 3,
    "cart_id": 456,
    "items": [
      {
        "id": 1,
        "item_id": 789,
        "name": "Test Product",
        "quantity": 2,
        "unit_price": 50.00,
        "total_price": 100.00
      }
    ]
  }
}
```

#### Error Responses
- `400 Bad Request`: Missing delivery address or cart validation failed
- `401 Unauthorized`: User not authenticated

### 2. Get Order Details
**GET** `/api/marketplace/orders/:id`

Retrieves detailed information about a specific order.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 123,
    "order_number": "MO-1640995200000-ABC123",
    "status": "paid",
    "total_amount": 125.00,
    "delivery_fee": 5.00,
    "created_at": "2023-12-31T12:00:00Z",
    "paid_at": "2023-12-31T12:05:00Z",
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    },
    "vendor": {
      "id": 2,
      "store_name": "Test Store",
      "owner_name": "Jane Smith"
    },
    "items": [...],
    "delivery_address": "123 Test Street, Cairo, Egypt",
    "customer_notes": "Handle with care"
  }
}
```

#### Error Responses
- `404 Not Found`: Order not found
- `403 Forbidden`: Access denied

### 3. Get User Orders
**GET** `/api/marketplace/orders`

Retrieves orders for the authenticated user (customer view).

#### Query Parameters
- `status` (optional): Filter by order status
- `limit` (optional): Number of orders to return (default: 20)
- `offset` (optional): Pagination offset (default: 0)

#### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "order_number": "MO-1640995200000-ABC123",
      "status": "completed",
      "total_amount": 125.00,
      "created_at": "2023-12-31T12:00:00Z",
      "vendor": {
        "store_name": "Test Store"
      }
    }
  ]
}
```

### 4. Update Order Status (Vendor Actions)
**PATCH** `/api/marketplace/orders/:id/status`

Allows vendors to accept or reject orders. This endpoint uses action-based status updates.

#### Request Body (Accept Order)
```json
{
  "action": "accept",
  "vendorNotes": "Order will be ready in 30 minutes"
}
```

#### Request Body (Reject Order)
```json
{
  "action": "reject",
  "vendorNotes": "Item currently out of stock"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "id": 123,
    "status": "accepted",
    "accepted_at": "2023-12-31T12:10:00Z"
  }
}
```

#### Error Responses
- `400 Bad Request`: Invalid action or missing required fields
- `403 Forbidden`: User is not associated with a vendor account or not the assigned vendor

### 5. Cancel Order
**POST** `/api/marketplace/orders/:id/cancel`

Allows customers or vendors to cancel orders before pickup.

#### Request Body
```json
{
  "reason": "Changed my mind"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": 123,
    "status": "cancelled",
    "cancelled_at": "2023-12-31T12:15:00Z",
    "cancellation_reason": "Changed my mind"
  }
}
```

#### Error Responses
- `400 Bad Request`: Missing cancellation reason or order cannot be cancelled at current status
- `403 Forbidden`: Access denied

### 6. Get Vendor Statistics
**GET** `/api/marketplace/vendor/stats`

Retrieves order statistics for the authenticated vendor.

#### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "total_orders": 25,
    "completed_orders": 22,
    "cancelled_orders": 2,
    "rejected_orders": 1,
    "total_revenue": 2750.00,
    "avg_order_value": 125.50,
    "pending_orders": 3
  }
}
```

#### Error Responses
- `403 Forbidden`: User is not associated with a vendor account

## State Machine Actions

The API supports the following actions through various endpoints:

### Customer Actions
- **Confirm Payment**: Transition `pending` → `paid`
- **Confirm Receipt**: Transition `delivered` → `completed`
- **Dispute Order**: Transition `delivered` → `disputed`
- **Cancel Order**: Transition various states → `cancelled`

### Vendor Actions
- **Accept Order**: Transition `paid` → `accepted`
- **Reject Order**: Transition `paid` → `rejected`
- **Cancel Order**: Transition various states → `cancelled`

### Admin Actions
- **Assign Driver**: Transition `accepted` → `assigned`
- **Cancel Order**: Transition any non-final state → `cancelled`
- **Resolve Dispute (Complete)**: Transition `disputed` → `completed`
- **Resolve Dispute (Refund)**: Transition `disputed` → `refunded`

### Driver Actions
- **Pickup Order**: Transition `assigned` → `picked_up`
- **Deliver Order**: Transition `picked_up` → `delivered`

### System Actions
- **System Failure**: Transition any state → `failed`

## Error Handling

All endpoints return standardized error responses:

```json
{
  "success": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400 Bad Request`: Invalid request data or business rule violation
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions or access denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server-side error

## Rate Limiting

All endpoints are subject to rate limiting to prevent abuse. Rate limits vary by endpoint complexity and user role.

## Audit Logging

All order status changes are automatically logged with:
- User ID and role performing the action
- Action performed
- Old and new status values
- Timestamp
- Additional context data

## Webhooks (Future Enhancement)

The system is designed to support webhooks for real-time notifications of order status changes to external systems.
