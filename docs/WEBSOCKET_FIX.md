# WebSocket Connection Fix

## Problem

Socket.IO connections failing with:
- `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED`
- `400 Bad Request` on polling upgrade

## Root Causes

### 1. Apache RewriteCond
**Issue:** Exact string match failed for header variations.
```diff
- RewriteCond %{HTTP:Upgrade} =websocket [NC]
+ RewriteCond %{HTTP:Upgrade} websocket [NC]
```

### 2. PM2 Cluster + Polling
**Issue:** Polling starts on instance A, upgrade goes to instance B → session unknown.
**Fix:** Force WebSocket-only transport:
```javascript
const socket = io(apiUrl, {
  transports: ['websocket'], // Skip polling phase
  withCredentials: true,
});
```

## Files Modified

| File | Change |
|------|--------|
| `frontend/src/App.js` | `transports: ['websocket']` |
| `frontend/src/hooks/useNotifications.js` | `transports: ['websocket']` |
| Apache config | RewriteCond regex match |

## Date Fixed
2026-01-02
