# Token Revocation & Rate Limiting Implementation
**Date**: December 31, 2025
**Status**: Implemented & Verified

## 1. Token Revocation (Blacklisting)
To solve OWASP A01 (Broken Access Control) and A07 (Identification Failures), we implemented a **Token Blacklist** mechanism using Redis.

### How it Works
1.  **Storage**: We use Redis to store revoked token signatures.
    *   **Key**: `blacklist:token:<jwt_signature>`
    *   **Value**: `revoked`
    *   **TTL**: Matches the remaining valid time of the token (e.g., if token expires in 1 hour, Redis key expires in 1 hour).
2.  **Logout Flow** (`POST /api/auth/logout`):
    *   Server extracts the token from the cookie/header.
    *   Key is added to Redis with specific TTL.
    *   Cookie is cleared.
3.  **Verification Flow** (`middleware/auth.js`):
    *   Standard JWT signature check runs first.
    *   **NEW**: Checks Redis `isTokenBlacklisted(token)`.
    *   If blacklisted -> Returns `401 Token Revoked`.

### Critical Components
*   `backend/services/authService.js`: `blacklistToken()`, `isTokenBlacklisted()`
*   `backend/middleware/auth.js`: Updated `verifyToken` (now async).
*   `backend/config/redis.js`: Redis connection (IOredis).

---

## 2. Advanced Rate Limiting (Fingerprinting)
To solve OWASP A04 (Insecure Design - Bots/Abuse), we implemented device-aware rate limiting.

### why "Effective"?
Standard IP rate limiting fails against VPNs, Proxies, and Carrier NATs (where one IP represents 1000 users).

**Our Approach**:
1.  **FingerprintJS**: Frontend generates a unique "Visitor ID" based on browser, OS, font lists, hardware concurrency, etc.
2.  **Header**: Passed as `x-device-fingerprint`.
3.  **Enforcement** (`backend/middleware/rateLimit.js`):
    *   The `keyGenerator` prioritizes `req.headers['x-device-fingerprint']`.
    *   IP is only used as a fallback.

**Benefit**:
*   **VPN Proof**: Attacker rotates IP → Fingerprint remains same → **Block persists**.
*   **Precision**: We ban the *device*, not the *network*.

---

## 3. Server Startup Critical Fix
**Issue Encountered**: Redis client yielded `null` during startup despite `REDIS_URL` being set.
**Root Cause**: `server.js` was importing `app.js` (which imported `redis.js`) **BEFORE** calling `dotenv.config()`.
**Fix**: Moved `dotenv.config()` to the very top of `server.js`.

> **Note**: Always ensure environment variables are loaded before *any* logic that relies on them begins import execution.
