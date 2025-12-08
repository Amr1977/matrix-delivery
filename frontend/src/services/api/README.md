# API Services

Centralized TypeScript API service layer for Matrix Delivery frontend.

## Usage

```typescript
import { AuthApi, OrdersApi, DriversApi, UsersApi, NotificationsApi } from '@/services/api';

// Login
const { user } = await AuthApi.login({ email, password });

// Get orders
const orders = await OrdersApi.getOrders({ city: 'Cairo' });

// Place bid
const order = await OrdersApi.placeBid(orderId, { bidPrice: 50 });

// Update driver location
await DriversApi.updateLocation({ latitude: 30.0, longitude: 31.0 });

// Update profile
await UsersApi.updateProfile({ name: 'John Doe' });
```

## Features

- ✅ **Type-safe** - Full TypeScript support
- ✅ **Cookie-based auth** - Automatic authentication via httpOnly cookies
- ✅ **Error handling** - Centralized error handling
- ✅ **Clean API** - Simple, intuitive methods
- ✅ **Single source of truth** - All API calls in one place

## Services

- **AuthApi** - Authentication (login, register, logout, switch role)
- **OrdersApi** - Orders management (CRUD, bids, status updates)
- **DriversApi** - Driver operations (location, status, earnings)
- **UsersApi** - User profile and preferences
- **NotificationsApi** - Notifications management
