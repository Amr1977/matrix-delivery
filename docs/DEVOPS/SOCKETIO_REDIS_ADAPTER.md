# Socket.IO Redis Adapter for PM2 Cluster Mode

**Date Implemented**: 2026-01-02  
**Related Issue**: WebSocket 400 Bad Request / NS_ERROR_WEBSOCKET_CONNECTION_REFUSED

## Problem

When running PM2 in cluster mode with multiple Node.js instances, Socket.IO sessions were failing with:
- `HTTP 400 Bad Request` on polling requests
- `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED` on WebSocket upgrade
- Session IDs (`sid`) invalid on different instances

### Root Cause

Socket.IO stores session data in-memory by default. In cluster mode:
1. Client connects to Instance A → gets session ID
2. Next request hits Instance B → doesn't recognize the session → **400 Bad Request**

## Solution

Implemented the **Socket.IO Redis Adapter** which uses Redis pub/sub to share session state across all instances.

```
┌─────────────────────────────────────────────────────────┐
│                  With Redis Adapter                      │
├─────────────────────────────────────────────────────────┤
│   Instance A              Instance B                     │
│   ┌─────────────┐         ┌─────────────┐               │
│   │ Node.js     │         │ Node.js     │               │
│   │ + Socket.IO │         │ + Socket.IO │               │
│   └──────┬──────┘         └──────┬──────┘               │
│          │    pub/sub            │                       │
│          └───────┬───────────────┘                       │
│                  ▼                                       │
│          ┌─────────────┐                                │
│          │    Redis    │  ← Shared session state        │
│          └─────────────┘                                │
└─────────────────────────────────────────────────────────┘
```

## Files Modified

### [server.js](file:///d:/matrix-delivery/backend/server.js)

Added Redis adapter configuration:

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

// Create pub/sub clients for Socket.IO adapter
if (process.env.REDIS_URL && !IS_TEST) {
  const pubClient = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true
  });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('✅ Socket.IO Redis adapter connected');
    });
}
```

### [ecosystem.config.js](file:///d:/matrix-delivery/backend/ecosystem.config.js)

Updated to cluster mode:

```javascript
instances: 2,
exec_mode: 'cluster',
```

## Dependencies Added

```bash
npm install @socket.io/redis-adapter
```

## Configuration Requirements

Ensure `REDIS_URL` is set in `.env`:
```
REDIS_URL=redis://localhost:6379
# or with auth:
REDIS_URL=redis://:password@localhost:6379
```

## Verification

After deployment, check logs for:
```
✅ Socket.IO Redis adapter connected - cluster mode enabled
```

And verify both instances handle connections:
```bash
pm2 logs matrix-delivery-backend
```

## Fallback Behavior

- If `REDIS_URL` is not set: Falls back to in-memory (single instance only)
- If Redis connection fails: Logs error, continues with in-memory adapter
- In test environment: Always uses in-memory adapter

## Related Documentation

- [Socket.IO Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)
- [Apache WebSocket Fix](file:///d:/matrix-delivery/DOCS/DEVOPS/APACHE_WEBSOCKET_FIX.md)
