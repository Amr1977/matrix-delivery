# Matrix Delivery Platform - Backend API Documentation

## Overview

This document provides comprehensive documentation for all backend API routes supported by the Matrix Delivery Platform. The API serves both customer-facing and courier-facing applications, along with administrative functionality.

**Base URL:** `https://matrix-api.oldantique50.com/api` (production) or `http://localhost:5000/api` (development)

**Authentication:** Bearer token in Authorization header for protected routes

---

## 1. Authentication Routes (`/auth`)

### POST `/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "string",
  "email": "string",
  "password": "string",
  "phone": "string",
  "role": "customer|driver|admin"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "isVerified": false
  },
  "token": "string"
}
```

**Status Codes:** 201 (Created), 400 (Bad Request), 409 (Conflict)

---

### POST `/auth/login`
Authenticate user credentials.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "isVerified": true
  },
  "token": "string"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 400 (Bad Request)

---

### GET `/auth/me`
Get current authenticated user information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string",
    "isVerified": true,
    "phone": "string"
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### POST `/auth/switch-role`
Switch user role (for multi-role users).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "role": "customer|driver|admin"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  },
  "token": "string"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden)

---

## 2. User Management Routes (`/users`)

### GET `/users/me/profile`
Get current user's profile information.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string",
    "language": "string",
    "theme": "string",
    "vehicle_type": "string",
    "license_number": "string",
    "service_area_zone": "string",
    "is_available": true
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### PUT `/users/me/profile`
Update current user's profile information.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body (partial updates allowed):**
```json
{
  "name": "string",
  "phone": "string",
  "language": "string",
  "theme": "string",
  "vehicle_type": "string",
  "license_number": "string",
  "service_area_zone": "string"
}
```

**Response:**
```json
{
  "user": {
    "id": "string",
    "name": "string",
    // ... updated user object
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 400 (Bad Request)

---

### POST `/users/me/profile-picture`
Upload user profile picture.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: Image file (JPG, PNG, etc.)

**Response:**
```json
{
  "profilePictureUrl": "string"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 400 (Bad Request)

---

### PUT `/users/me/profile-picture`
Update user profile picture.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: multipart/form-data`

**Form Data:**
- `file`: Image file

**Response:**
```json
{
  "profilePictureUrl": "string"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 400 (Bad Request)

---

### GET `/users/me/preferences`
Get user preferences and settings.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "preferences": {},
  "notification_prefs": {}
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### PUT `/users/me/preferences`
Update user preferences.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "preferences": {},
  "notification_prefs": {}
}
```

**Response:**
```json
{
  "preferences": {},
  "notification_prefs": {}
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 400 (Bad Request)

---

### GET `/users/me/payment-methods`
Get user's saved payment methods.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "paymentMethods": []
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### GET `/users/me/favorites`
Get user's favorite locations.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "favorites": []
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### GET `/users/me/activity`
Get user's activity history.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "activity": []
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### POST `/users/me/availability`
Update driver availability status.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "is_available": true
}
```

**Response:**
```json
{
  "isAvailable": true
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden - non-drivers)

---

### GET `/users/{userId}/reviews/received`
Get reviews received by a user.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "reviews": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 50,
    "totalPages": 3
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

### GET `/users/{userId}/reviews/given`
Get reviews given by a user.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:** Same as above

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

## 3. Order Management Routes (`/orders`)

### POST `/orders`
Create a new delivery order.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "pickupAddress": "string",
  "deliveryAddress": "string",
  "pickupLat": number,
  "pickupLng": number,
  "deliveryLat": number,
  "deliveryLng": number,
  "packageDetails": "string",
  "estimatedValue": number,
  "specialInstructions": "string"
}
```

**Response:**
```json
{
  "order": {
    "id": "string",
    "status": "pending_bids",
    "pickupAddress": "string",
    "deliveryAddress": "string",
    // ... order details
  }
}
```

**Status Codes:** 201 (Created), 401 (Unauthorized), 400 (Bad Request)

---

### GET `/orders`
Get orders based on user role and filters.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status
- `role`: User role context

**Response:**
```json
{
  "orders": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### GET `/orders/{orderId}`
Get specific order details.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "order": {
    "id": "string",
    "status": "string",
    "pickupAddress": "string",
    "deliveryAddress": "string",
    "assignedDriver": {
      "userId": "string",
      "name": "string"
    },
    // ... full order details
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

### DELETE `/orders/{orderId}`
Cancel/delete an order.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Order cancelled successfully"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### POST `/orders/{orderId}/bid`
Place a bid on an order (drivers only).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "amount": number,
  "estimatedTime": number
}
```

**Response:**
```json
{
  "bid": {
    "id": "string",
    "amount": number,
    "estimatedTime": number,
    "status": "pending"
  }
}
```

**Status Codes:** 201 (Created), 401 (Unauthorized), 403 (Forbidden), 400 (Bad Request)

---

### PUT `/orders/{orderId}/bid`
Update an existing bid.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "amount": number,
  "estimatedTime": number
}
```

**Response:**
```json
{
  "bid": {
    "id": "string",
    // ... updated bid details
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### DELETE `/orders/{orderId}/bid`
Withdraw a bid.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Bid withdrawn successfully"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### POST `/orders/{orderId}/accept-bid`
Accept a bid and assign driver to order (customers only).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "bidId": "string"
}
```

**Response:**
```json
{
  "order": {
    "id": "string",
    "status": "accepted",
    "assignedDriver": {
      "userId": "string",
      "name": "string"
    }
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### POST `/orders/{orderId}/pickup`
Mark order as picked up (drivers only).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "order": {
    "id": "string",
    "status": "picked_up",
    // ... updated order details
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### POST `/orders/{orderId}/in-transit`
Mark order as in transit (drivers only).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "order": {
    "id": "string",
    "status": "in_transit",
    // ... updated order details
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### POST `/orders/{orderId}/complete`
Mark order as completed/delivered (drivers only).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "order": {
    "id": "string",
    "status": "delivered",
    // ... updated order details
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

### GET `/orders/{orderId}/review-status`
Check if order can be reviewed.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "canReview": true,
  "hasReviewed": false,
  "orderId": "string"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

### GET `/orders/{orderId}/reviews`
Get reviews for a specific order.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "reviews": []
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

### POST `/orders/{orderId}/review`
Submit a review for an order.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "rating": number, // 1-5
  "comment": "string",
  "reviewType": "driver|customer"
}
```

**Response:**
```json
{
  "review": {
    "id": "string",
    "rating": 5,
    "comment": "string",
    "reviewerId": "string",
    "revieweeId": "string"
  }
}
```

**Status Codes:** 201 (Created), 401 (Unauthorized), 404 (Not Found), 400 (Bad Request)

---

### GET `/orders/{orderId}/tracking`
Get order location tracking history.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "locationHistory": [
    {
      "timestamp": "2024-01-01T12:00:00Z",
      "latitude": number,
      "longitude": number,
      "status": "string"
    }
  ]
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

### POST `/orders/{orderId}/location`
Update order location (for active deliveries).

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "latitude": number,
  "longitude": number
}
```

**Response:**
```json
{
  "success": true
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found), 403 (Forbidden)

---

## 4. Driver Routes (`/drivers`)

### POST `/drivers/location`
Update driver location.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "latitude": number,
  "longitude": number
}
```

**Response:**
```json
{
  "success": true,
  "location": {
    "latitude": number,
    "longitude": number,
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden - non-drivers)

---

### GET `/drivers/location`
Get current driver location.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "location": {
    "latitude": number,
    "longitude": number,
    "lastUpdated": "2024-01-01T12:00:00Z"
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden - non-drivers)

---

### POST `/drivers/status`
Update driver online/offline status.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "isOnline": true
}
```

**Response:**
```json
{
  "success": true,
  "isOnline": true
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden - non-drivers)

---

## 5. Location Services Routes (`/locations`)

### GET `/locations/countries`
Get list of available countries.

**Query Parameters:**
- `t`: Timestamp (cache buster)

**Response:**
```json
{
  "countries": ["Country1", "Country2"]
}
```

**Status Codes:** 200 (OK)

---

### GET `/locations/reverse-geocode`
Convert coordinates to address.

**Query Parameters:**
- `lat`: Latitude (required)
- `lng`: Longitude (required)

**Response:**
```json
{
  "address": {
    "formatted": "string",
    "country": "string",
    "city": "string",
    "area": "string",
    "street": "string"
  }
}
```

**Status Codes:** 200 (OK), 400 (Bad Request)

---

### POST `/locations/calculate-route`
Calculate route between two points.

**Headers:**
- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "pickup": {
    "lat": number,
    "lng": number
  },
  "delivery": {
    "lat": number,
    "lng": number
  }
}
```

**Response:**
```json
{
  "route": {
    "distance": number, // in kilometers
    "duration": number, // in minutes
    "polyline": "string", // encoded polyline
    "steps": []
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 400 (Bad Request)

---

### POST `/locations/cache/clear`
Clear location cache (admin utility).

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "message": "Cache cleared successfully"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden)

---

## 6. Notification Routes (`/notifications`)

### GET `/notifications`
Get user notifications.

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "notifications": [
    {
      "id": "string",
      "type": "string",
      "title": "string",
      "message": "string",
      "isRead": false,
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 50,
    "totalPages": 3
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized)

---

### PUT `/notifications/{notificationId}/read`
Mark notification as read.

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 404 (Not Found)

---

## 7. Admin Routes (`/admin`)

### GET `/admin/stats`
Get platform statistics.

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `range`: Time range (7d, 30d, 90d, etc.)

**Response:**
```json
{
  "totalOrders": number,
  "activeOrders": number,
  "totalUsers": number,
  "activeDrivers": number,
  "revenue": number,
  "averageDeliveryTime": number,
  // ... more stats
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden)

---

### GET `/admin/users`
Get users with admin controls.

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `search`: Search query
- `role`: Filter by role
- `status`: Filter by verification status

**Response:**
```json
{
  "users": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 100,
    "totalPages": 5
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden)

---

### GET `/admin/orders`
Get orders with admin controls.

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

**Response:**
```json
{
  "orders": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 500,
    "totalPages": 25
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden)

---

### POST `/admin/users/{userId}/{action}`
Perform admin action on user.

**Headers:**
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Actions:** verify, suspend, activate, delete

**Request Body (for some actions):**
```json
{
  "reason": "string",
  "data": {}
}
```

**Response:**
```json
{
  "success": true,
  "message": "Action completed successfully"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)

---

### POST `/admin/users/{userId}/roles`
Update user roles.

**Headers:**
- `Authorization: Bearer <admin_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "add": ["role1", "role2"],
  "remove": ["role3"]
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "string",
    "roles": []
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)

---

### GET `/admin/logs`
Get system logs.

**Headers:**
- `Authorization: Bearer <admin_token>`

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50)
- `type`: Log type filter (all, error, info, warn)

**Response:**
```json
{
  "logs": [
    {
      "id": "string",
      "timestamp": "2024-01-01T12:00:00Z",
      "level": "info",
      "message": "string",
      "metadata": {}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalCount": 1000,
    "totalPages": 20
  }
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden)

---

### POST `/admin/deploy`
Trigger deployment (admin utility).

**Headers:**
- `Authorization: Bearer <admin_token>`

**Response:**
```json
{
  "exitCode": 0,
  "output": "string"
}
```

**Status Codes:** 200 (OK), 401 (Unauthorized), 403 (Forbidden), 500 (Deployment Failed)

---

## 8. Utility Routes (`/footer`)

### GET `/footer/stats`
Get public platform statistics.

**Response:**
```json
{
  "totalDeliveries": number,
  "activeCouriers": number,
  "averageRating": number,
  "citiesCovered": number
}
```

**Status Codes:** 200 (OK)

---

## Error Response Format

All endpoints return errors in the following format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {} // Optional additional error details
}
```

## Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict (e.g., email already exists)
- `500 Internal Server Error` - Server error

## Rate Limiting

The API implements rate limiting based on endpoint type and user role:
- Public endpoints: 100 requests per minute
- Authenticated endpoints: 1000 requests per minute
- Admin endpoints: 500 requests per minute

## WebSocket Events

The platform also supports real-time updates via WebSocket for:
- Order status changes
- Driver location updates
- New notifications
- Live tracking updates

WebSocket URL: `wss://matrix-api.oldantique50.com` or `ws://localhost:5000`

## Notes

- All monetary values are in USD
- All coordinates use WGS84 format (latitude, longitude)
- Timestamps are in ISO 8601 format (UTC)
- Pagination starts from page 1
- Authentication tokens expire after 24 hours
- File uploads are limited to 5MB per file
- Image uploads support JPG, PNG, and GIF formats
