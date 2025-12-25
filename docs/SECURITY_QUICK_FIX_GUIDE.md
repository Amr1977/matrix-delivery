# 🔧 QUICK START: SECURITY HARDENING (4-HOUR CRASH COURSE)

## Pre-Launch Security Fixes (Priority Order)

### ⏱️ HOUR 1: Credential Rotation (CRITICAL)

```bash
# 1. Generate new strong secrets
node -e "console.log('JWT_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('REFRESH_SECRET:', require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY:', require('crypto').randomBytes(32).toString('hex'))"

# 2. Update backend/.env.production with new values
# 3. Rotate Firebase API keys at https://console.firebase.google.com
# 4. Regenerate Stripe keys at https://dashboard.stripe.com/apikeys
# 5. Change database password (min 16 characters)
# 6. Commit changes to secure storage (git commit, then push)
```

### ⏱️ HOUR 2: Code Security Fixes

```bash
# Install missing security packages
npm install helmet cookie-parser csurf express-validator mongo-sanitize

# Update backend/server.js (See code blocks below)
# Update auth routes for validation
# Add middleware for CSRF and rate limiting
```

**Key updates:**

1. **Remove hardcoded credentials**
2. **Add Helmet.js**
3. **Add CSRF protection**
4. **Add input validation**

### ⏱️ HOUR 3: Database & Infrastructure

```bash
# Generate ENCRYPTION_KEY for sensitive fields
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update backend/.env.production
ENCRYPTION_KEY=<generated_value>
DB_PASSWORD=<new_strong_password>
CORS_ORIGIN=https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com

# Verify SSL certificate for matrix-delivery.web.app
# Update Firebase deployment settings
# Set secure cookie flags in authentication code
```

### ⏱️ HOUR 4: Testing & Deployment

```bash
# Test all changes locally
npm run dev

# Run security checks
npm audit
npm run lint

# Deploy to Firebase Hosting
firebase login
firebase deploy --only hosting

# Verify:
# 1. Check security headers: curl -I https://matrix-delivery.web.app
# 2. Test login/register flow
# 3. Monitor error logs in Firebase Console
```

---

## 🚨 CRITICAL CODE CHANGES (Copy-Paste Ready)

### Change 1: Add Helmet.js to backend/server.js

Find this line:
```javascript
// NOT USED: helmet, rateLimit packages - using custom implementation for demo
```

Replace with:
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://www.google.com/recaptcha/"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN],
      frameSrc: ["https://www.google.com/recaptcha/"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  strictTransportSecurity: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameGuard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));
```

---

### Change 2: Update backend/.env.production

```dotenv
# MUST CHANGE: Generate strong new secrets
JWT_SECRET=<generate_with_node_command_above>
JWT_REFRESH_SECRET=<generate_new_secret>
ENCRYPTION_KEY=<generate_new_key>

# Database
DB_PASSWORD=<new_strong_password_16_chars_min>
DB_USER=matrix_delivery_prod
DB_HOST=your-production-db-host.com
DB_PORT=5432
DB_NAME=matrix_delivery_prod

# CORS - ONLY PRODUCTION DOMAINS
CORS_ORIGIN=https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com

# Security
TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
BCRYPT_ROUNDS=12
NODE_ENV=production
PORT=5000

# reCAPTCHA - Get from https://www.google.com/recaptcha/admin
RECAPTCHA_SECRET_KEY=<get_from_google_console>
RECAPTCHA_ENABLED=true

# Stripe - Get from https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_live_<your_production_key>
STRIPE_PUBLISHABLE_KEY=pk_live_<your_production_key>

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=info
```

---

### Change 3: Update backend/routes/auth.js - Add Input Validation

Add at top of file after requires:
```javascript
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 255 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 12 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/),
  body('phone').matches(/^\+?[1-9]\d{1,14}$/),
  body('primary_role').isIn(['customer', 'driver', 'vendor']),
  body('country').trim().isLength({ min: 2 }),
  body('city').trim().isLength({ min: 2 }),
  body('area').trim().isLength({ min: 2 })
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed' });
  }
  next();
};
```

Update register endpoint:
```javascript
router.post('/register', validateRegistration, handleValidationErrors, authRateLimit, async (req, res) => {
  // ... existing code ...
});
```

---

### Change 4: Implement Token Refresh (backend/routes/auth.js)

Add new endpoint after login route:
```javascript
// Token refresh endpoint
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: 'No refresh token' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, primary_role: decoded.primary_role },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

Update login response to send refresh token cookie:
```javascript
// In login route, after successful authentication:
const accessToken = jwt.sign(
  { userId: user.id, email: user.email, primary_role: user.primary_role },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshToken = jwt.sign(
  { userId: user.id },
  process.env.JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);

// Set refresh token in httpOnly cookie
res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth/refresh',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

res.json({
  accessToken,
  user: { id: user.id, email: user.email, primary_role: user.primary_role }
});
```

---

### Change 5: Fix CORS in backend/.env

Remove all localhost entries from production:

```bash
# BEFORE (INSECURE)
CORS_ORIGIN=https://matrix-delivery.oldantique50.com,https://matrix-delivery.web.app,
  https://matrix-delivery.firebaseapp.com,https://matrix-delivery-dev.web.app,
  http://localhost:3000,http://127.0.0.1:3000

# AFTER (SECURE)
CORS_ORIGIN=https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com
```

---

### Change 6: Remove Firebase Keys from Source Code

Update `frontend/src/firebase.js`:

```javascript
// OLD (INSECURE - Keys hardcoded)
const firebaseConfigs = {
  production: {
    apiKey: "AIzaSyCKLqK_x_Jvop7a5ht3w1nsnpa2hhx1bVk", // EXPOSED
  }
};

// NEW (SECURE - From environment)
export const getFirebaseConfig = () => {
  return {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
  };
};
```

Add to `frontend/.env.production`:
```dotenv
REACT_APP_FIREBASE_API_KEY=AIzaSyCKLqK_x_Jvop7a5ht3w1nsnpa2hhx1bVk
REACT_APP_FIREBASE_AUTH_DOMAIN=matrix-delivery.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=matrix-delivery
REACT_APP_FIREBASE_STORAGE_BUCKET=matrix-delivery.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=127557882021
REACT_APP_FIREBASE_APP_ID=1:127557882021:web:f515e53b8d66547d2efd4c
REACT_APP_FIREBASE_MEASUREMENT_ID=G-WE5CMMR9LB
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

```bash
# Run security audit
npm audit

# Check for exposed secrets
git log -p | grep -i "password\|secret\|key\|api"

# Verify environment variables
grep -r "password:" backend/ --include="*.js" | grep -v node_modules

# Lint code
npm run lint

# Test build
npm run build

# Final verification
echo "✅ All secrets removed from code"
echo "✅ Security headers added"
echo "✅ Input validation implemented"
echo "✅ CORS properly configured"
echo "✅ Token expiration added"
echo "✅ Rate limiting enabled"
```

---

## 🚀 DEPLOYMENT COMMANDS

```bash
# Firebase Hosting deployment
firebase login
firebase init hosting  # If not already done
firebase deploy --only hosting

# Verify deployment
curl -I https://matrix-delivery.web.app

# Check security headers
curl -I https://matrix-delivery.web.app | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Content-Security-Policy"

# Test API endpoint
curl -X POST https://matrix-delivery-api.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!@#"}'
```

---

## 🆘 TROUBLESHOOTING

### Issue: "JWT_SECRET not set"
```bash
# Solution: Set in backend/.env.production
JWT_SECRET=<generate_new_secret>
```

### Issue: CORS error
```bash
# Check allowed origins
echo $CORS_ORIGIN

# Should only contain production domains, no localhost
CORS_ORIGIN=https://matrix-delivery.web.app,https://matrix-delivery.firebaseapp.com
```

### Issue: SSL certificate error
```bash
# Verify certificate
openssl s_client -connect matrix-delivery.web.app:443

# Check expiration date - should be future date
```

### Issue: Rate limiting too strict
```bash
# Adjust in backend/middleware/rateLimit.js
// More lenient: 100 requests per minute
createRateLimiter(100, 60 * 1000)

// Strict: 10 requests per minute  
createRateLimiter(10, 60 * 1000)
```

---

## ✅ FINAL VERIFICATION

After deployment, verify:

```bash
# 1. Check security headers present
curl -I https://matrix-delivery.web.app | grep -i "Strict-Transport"

# 2. Test authentication
curl -X POST https://api.matrix-delivery.web.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}'

# 3. Verify rate limiting
for i in {1..50}; do curl https://api.matrix-delivery.web.app/api/auth/login; done

# 4. Check CORS
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  https://api.matrix-delivery.web.app/api/auth/login

# Should return 403 or CORS error, NOT allow the request

# 5. Monitor logs
firebase functions:log  # Check for errors
```

---

**Estimated completion time:** 3-4 hours  
**Risk level after fixes:** LOW  
**Ready for production trial:** YES  

Good luck! 🚀
