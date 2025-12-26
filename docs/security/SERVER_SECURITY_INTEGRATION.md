# Server.js Security Integration - Quick Reference

## Changes Made to server.js

### 1. Security Imports Added (Lines 37-46)
```javascript
const {
  helmetConfig,
  cookieParserMiddleware,
  httpsRedirect,
  strictCorsConfig,
  additionalSecurityHeaders,
  sanitizeRequest,
  validateSecurityConfig
} = require('./middleware/security');
const { initAuditLogger } = require('./middleware/auditLogger');
```

### 2. Security Validation on Startup (Lines 53-61)
- Validates JWT_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
- Validates CORS_ORIGIN doesn't contain localhost in production
- Exits with error if validation fails

### 3. Security Middleware Stack (Lines 84-109)
**Order matters! Applied in this sequence:**
1. HTTPS redirect (must be first)
2. Helmet.js security headers
3. Additional security headers
4. Cookie parser (for CSRF)
5. Request sanitization
6. Strict CORS validation

### 4. Database Security (Lines 111-147)
**Removed:**
- Weak fallback credentials (`|| 'postgres'`)

**Added:**
- Environment variable validation
- Password length check (min 12 chars in production)
- SSL/TLS support for production
- CA certificate support

### 5. Audit Logging (Line 584)
- Initialized after database tables are created
- Creates `audit_logs` table automatically
- Ready for use throughout application

### 6. Enhanced JWT Validation (Lines 675-728)
**Improvements:**
- Validates JWT_SECRET and JWT_REFRESH_SECRET length (min 64 chars)
- Added issuer and audience claims
- Specific error codes for expired vs invalid tokens
- Better error messages for frontend handling

## Security Headers Now Active

When you start the server, these headers will be automatically added to all responses:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: [configured for your domains]
Permissions-Policy: geolocation=(self), microphone=(), camera=()
```

## CORS Configuration

**Before:** Wildcard in development, Apache handles in production
**After:** Strict validation in all environments

Only these origins are allowed (from CORS_ORIGIN env var):
- https://matrix-delivery.web.app
- https://matrix-delivery.firebaseapp.com

## Database Connection

**Before:**
```javascript
password: process.env.DB_PASSWORD || 'postgres'  // Weak fallback
```

**After:**
```javascript
password: process.env.DB_PASSWORD  // No fallback, validated on startup
ssl: IS_PRODUCTION && process.env.DB_SSL === 'true' ? {
  rejectUnauthorized: true,
  ca: fs.readFileSync(process.env.DB_CA_CERT)
} : false
```

## JWT Token Validation

**Before:**
```javascript
jwt.verify(token, JWT_SECRET)
```

**After:**
```javascript
jwt.verify(token, JWT_SECRET, {
  algorithms: ['HS256'],
  issuer: 'matrix-delivery',
  audience: 'matrix-delivery-api'
})
```

## Testing the Integration

### 1. Compile TypeScript Files
```bash
cd backend
npx tsc utils/tokenManager.ts utils/encryption.ts middleware/security.ts middleware/auditLogger.ts --outDir . --module commonjs --target es2020 --esModuleInterop --skipLibCheck
```

### 2. Install Required Packages
```bash
npm install helmet cookie-parser csurf
```

### 3. Update Environment Variables
Add to `backend/.env`:
```bash
JWT_REFRESH_SECRET=<64_char_hex_string>
ENCRYPTION_KEY=<64_char_hex_string>
CORS_ORIGIN=https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com
```

### 4. Start Server
```bash
npm run dev
```

### 5. Verify Security Headers
```bash
curl -I http://localhost:5000/api/health
```

Should see all security headers listed above.

## Troubleshooting

### Error: "Security configuration validation failed"
- Check that JWT_SECRET is at least 64 characters
- Check that JWT_REFRESH_SECRET is at least 64 characters
- Check that ENCRYPTION_KEY is exactly 64 hex characters
- Check that CORS_ORIGIN doesn't contain localhost in production

### Error: "Missing required database environment variables"
- Ensure DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD are all set
- No fallback values are used anymore

### Error: "Cannot find module './middleware/security'"
- Run the TypeScript compilation command above
- Ensure .js files are generated in the same directories as .ts files

## Next Steps

1. ✅ Server.js integration complete
2. ⏭️ Update `backend/routes/auth.js` with input validation
3. ⏭️ Add token refresh endpoint to auth routes
4. ⏭️ Test all security features
5. ⏭️ Deploy to VPS with rotated secrets
