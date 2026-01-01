# Stale Cookie Token Fix

## Issue Summary

**Date Discovered**: 2026-01-01  
**Severity**: High  
**Environment**: Production

## Symptoms

After logging out and logging back in, users receive:
```
error: "Token has been revoked. Please log in again."
```

This occurs immediately after successful login, on the first API call (typically `/api/auth/me`).

## Root Cause

When a user logs out, their JWT token is added to a Redis blacklist to prevent reuse. However, when they log back in:

1. The backend generates a **new** token and sets it via `Set-Cookie`
2. The browser still sends the **old** (blacklisted) cookie on the next request
3. The middleware checks the token against Redis, finds it blacklisted, and rejects the request

The issue was that the new cookie wasn't properly replacing the old one in the browser. This is especially problematic in cross-origin setups where:
- Frontend: `matrix-delivery.web.app` (Firebase Hosting)
- API: `matrix-api.oldantique50.com` (VPS)

## Fix Applied

Added `res.clearCookie()` before `res.cookie()` in both `login` and `register` endpoints in `authController.js`:

```javascript
// Clear any existing cookie first to prevent stale token issues
res.clearCookie('token', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    path: '/'
});

res.cookie('token', token, cookieOptions);
```

## Redis Blacklist Management

### View Blacklisted Tokens
```bash
# Connect to Redis with authentication
redis-cli -a YOUR_REDIS_PASSWORD

# List all blacklisted tokens
KEYS blacklist:token:*
```

### Clear All Blacklisted Tokens
```bash
# From bash shell (with auth)
redis-cli -a YOUR_REDIS_PASSWORD --scan --pattern "blacklist:token:*" | xargs -L 1 redis-cli -a YOUR_REDIS_PASSWORD DEL

# Or from inside redis-cli
KEYS blacklist:token:*
# Then DEL each key individually
DEL "blacklist:token:eyJhbG..."
```

### Clear ALL Redis Data (Nuclear Option)
```bash
redis-cli -a YOUR_REDIS_PASSWORD FLUSHDB
```

## Files Modified

- `backend/controllers/authController.js` - Added `clearCookie` before `cookie` in login/register

## Testing

See `tests/integration/cookieAuth.test.ts` for the test case:
- `should allow login after logout (no stale token)`

## Prevention

The fix ensures that every login/register clears any existing token cookie before setting the new one, preventing the browser from holding onto stale blacklisted tokens.
