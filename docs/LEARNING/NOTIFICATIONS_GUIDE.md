# Notifications System Implementation Guide

This guide details the implementation of the real-time notification system in the Matrix Delivery application.

## 1. Overview

The notification system works by combining database persistence (PostgreSQL) with real-time delivery (Socket.IO). This ensures that:
- **Offline Users**: Receive notifications when they next log in (via database fetch).
- **Online Users**: Receive instant alerts (via WebSocket).

## 2. Architecture

### Backend Components

1.  **Server Initialization (`server.js`)**:
    - Initializes `socket.io` with the HTTP server.
    - Configures CORS for WebSocket connections.
    - Initializes the `NotificationService` singleton with the `io` instance.

2.  **Notification Service (`backend/services/notificationService.ts`)**:
    - **Purpose**: Central handler for creating and sending notifications.
    - **Methods**:
        - `createNotification(params)`: Inserts record into DB AND emits socket event.
    - **Socket Emission**: Emits to room `user_{userId}`.

3.  **Socket Configuration (`backend/config/socket.js`)**:
    - **Authentication**: Middleware verifies JWT token from cookies.
    - **Setup**: Handles connection events, error logging, and room management.

4.  **Integration Points**:
    - **Order Service (`orderService.js`)**: Calls `createNotification` on key events (e.g., `bid_withdrawn`, `bid_placed`, `order_picked_up`, `bid_accepted`).
    - **Note**: All notification logic is centralized in `OrderService`. Legacy direct calls in `app.js` have been removed.

### Frontend Components

1.  **Notification Hook (`useNotifications.js`)**:
    - Manages the WebSocket connection.
    - Listens for `notification` events.
    - Updates local state/UI toasts when alerts arrive.

2.  **Socket Client**:
    - Connects to `/socket.io/`.
    - Sends authentication cookies automatically.

## 3. Database Schema

**Table: `notifications`**

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | SERIAL PK | Unique ID |
| `user_id` | UUID | Recipient user ID |
| `order_id` | UUID | Related order (optional) |
| `type` | VARCHAR | Event type (e.g., 'bid_withdrawn') |
| `title` | VARCHAR | Alert title |
| `message` | TEXT | Alert body |
| `is_read` | BOOLEAN | Read status |
| `created_at` | TIMESTAMPTZ | Creation time |

## 4. Implementation Details

### How to Send a Notification

In any backend service or route:

```javascript
const { createNotification } = require('../services/notificationService');

await createNotification(
  targetUserId,      // Recipient ID
  relevantOrderId,   // Order ID (or null)
  'event_type',      // e.g., 'system_alert'
  'Title',           // User-facing title
  'Message body'     // User-facing message
);
```

### How it Works (Under the Hood)

1.  **Call**: `createNotification` is called locally.
2.  **Singleton**: It retrieves the initialized `NotificationService` instance.
3.  **DB Insert**: INSERTs the notification into PostgreSQL.
4.  **Socket Check**: Checks if `this.io` is set (it should be from `server.js`).
5.  **Emit**: Calls `this.io.to('user_' + userId).emit('notification', payload)`.
6.  **Receive**: Frontend `socket.on('notification')` listener fires, showing the toast.

## 5. Troubleshooting

**Issue: "Notifications not showing in real-time"**
- **Check 1**: Is `NotificationService` initialized in `server.js`? It must be called *after* `io` is created.
- **Check 2**: Is the user's socket connection authenticated? Check `socket.userId` logs.
- **Check 3**: Is the frontend listening to the `notification` event?

**Issue: "Socket Connection Failed"**
- **Check**: Ensure the `cookie` package is installed and cookies are being sent with the request (`withCredentials: true` on client).

## 6. Future Improvements

- **Push Notifications**: Integrate Firebase (FCM) or Expo Push Notifications for mobile devices when the app is backgrounded.
- **Preferences**: Allow users to toggle specific notification types.
