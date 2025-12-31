# Security Remediation Implementation Plan
**Matrix Delivery Application - Complete Security Fix Roadmap**

**Created**: December 31, 2025  
**Timeline**: 4-5 weeks  
**Priority**: CRITICAL - Production Blocker

---

## Overview

This plan addresses all 18 vulnerabilities identified in the OWASP Top 10 security audit:
- **6 High Severity** (Week 1 - CRITICAL)
- **8 Medium Severity** (Weeks 2-3)
- **4 Low Severity** (Week 4 + Post-Launch)

**Team Requirements**:
- 1 Senior Backend Developer (full-time, 4 weeks)
- 1 DevOps Engineer (part-time, 2 weeks)
- 1 Security Consultant (part-time, 1 week for testing)

**Budget Estimate**: 
- Infrastructure: $200-300/month ongoing
- One-time setup: ~$2,000-3,000 (consulting, tools)

---

## Sprint Breakdown

### 🔴 Sprint 1: Critical Security Fixes (Week 1)
**Goal**: Fix production-blocking vulnerabilities  
**Effort**: 42 hours  
**Status**: 🚨 URGENT - Do Not Deploy Without These Fixes

#### Day 1-2: Infrastructure Setup
- [ ] Set up Redis instance (production + staging)
- [ ] Configure AWS Secrets Manager / Azure Key Vault
- [ ] Set up centralized logging (CloudWatch/ELK)

#### Day 3-4: Rate Limiting & Authentication
- [ ] Migrate to Redis-based rate limiting
- [ ] Remove test bypass code
- [ ] Implement token revocation system
- [ ] Add refresh token mechanism

#### Day 5: Secrets & Session Management
- [ ] Migrate secrets to secrets manager
- [ ] Implement short-lived access tokens (15 min)
- [ ] Add refresh token rotation
- [ ] Update deployment scripts

---

### 🟡 Sprint 2: Authorization & Access Control (Week 2)
**Goal**: Fix broken access control vulnerabilities  
**Effort**: 32 hours

#### Tasks
- [ ] Audit all route authorization checks
- [ ] Standardize role field usage (remove legacy fields)
- [ ] Implement consistent ownership verification
- [ ] Add authorization unit tests
- [ ] Fix admin bypass inconsistencies

---

### 🟡 Sprint 3: Security Configuration & Monitoring (Week 3)
**Goal**: Improve security posture and visibility  
**Effort**: 28 hours

#### Tasks
- [ ] Harden CORS configuration
- [ ] Improve error message handling
- [ ] Set up security alerting
- [ ] Implement log sanitization
- [ ] Database migration integrity checks
- [ ] Dependency scanning automation

---

### 🟢 Sprint 4: Testing & Validation (Week 4)
**Goal**: Comprehensive security testing  
**Effort**: 24 hours

#### Tasks
- [ ] Automated security test suite
- [ ] Manual penetration testing
- [ ] Dependency updates
- [ ] Production deployment checklist
- [ ] Security documentation finalization

---

## Detailed Implementation Guides

### TASK 1: Redis Rate Limiting Migration
**Priority**: 🔴 CRITICAL  
**Effort**: 4 hours  
**Owner**: Backend Developer

#### Step 1: Install Dependencies
```bash
npm install redis rate-limit-redis
```

#### Step 2: Create Redis Client (`backend/config/redis.js`)
```javascript
const Redis = require('redis');
const logger = require('./logger');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis connection refused');
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
});

redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

module.exports = redisClient;
```

#### Step 3: Update Rate Limiting Middleware
```javascript
// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redisClient = require('../config/redis');
const logger = require('../config/logger');

/**
 * Redis-based rate limiting middleware
 */
const createRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    maxRequests = 100,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req) => req.ip
  } = options;

  return rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:',
      sendCommand: (...args) => redisClient.sendCommand(args)
    }),
    windowMs,
    max: maxRequests,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator,
    handler: (req, res) => {
      logger.security('Rate limit exceeded', {
        key: keyGenerator(req),
        path: req.path,
        ip: req.ip,
        category: 'security'
      });
      res.status(429).json({ error: message });
    }
  });
};

// Specific rate limiters
const authRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many authentication attempts',
  skipSuccessfulRequests: true
});

const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 100
});

const orderCreationRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: 'Order creation limit exceeded'
});

module.exports = {
  createRateLimiter,
  authRateLimit,
  apiRateLimit,
  orderCreationRateLimit
};
```

#### Step 4: Update Environment Variables
```env
# .env.production
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password
```

#### Step 5: Testing
```javascript
// backend/tests/integration/rateLimit.test.js
describe('Redis Rate Limiting', () => {
  it('should enforce rate limits across server restarts', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' });
    }
    
    // 6th request should be rate limited
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' });
    
    expect(res.status).toBe(429);
  });
});
```

**Success Criteria**:
- ✅ Rate limits persist across server restarts
- ✅ Works in multi-server environment
- ✅ Redis connection handles failures gracefully
- ✅ All tests pass

---

### TASK 2: Remove Test Bypass Code
**Priority**: 🔴 CRITICAL  
**Effort**: 2 hours  
**Owner**: Backend Developer

#### Step 1: Delete Test Bypass Function
```javascript
// backend/middleware/auth.js
// ❌ DELETE THIS ENTIRE SECTION (lines 260-266)
const verifyTokenOrTestBypass = (req, res, next) => {
  if (IS_TEST && req.headers['x-test-admin'] === '1') {
    req.user = { role: 'admin', userId: req.headers['x-test-user-id'] };
    return next();
  }
  return verifyToken(req, res, next);
};

// ❌ REMOVE FROM EXPORTS
module.exports = {
  // ... other exports
  verifyTokenOrTestBypass,  // DELETE THIS LINE
};
```

#### Step 2: Find and Replace All Usages
```bash
# Search for all usages
grep -r "verifyTokenOrTestBypass" backend/

# Replace with verifyToken in all files
```

#### Step 3: Create Proper Test Utilities
```javascript
// backend/tests/utils/testAuth.js
const jwt = require('jsonwebtoken');

const createTestToken = (userId, role = 'customer', options = {}) => {
  return jwt.sign(
    {
      userId,
      role,
      primary_role: role,
      granted_roles: [role],
      ...options
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
  );
};

const createAdminToken = (userId = 'test-admin-id') => {
  return createTestToken(userId, 'admin');
};

module.exports = { createTestToken, createAdminToken };
```

#### Step 4: Update All Tests
```javascript
// Example test update
const { createAdminToken } = require('../utils/testAuth');

describe('Admin Routes', () => {
  it('should allow admin access', async () => {
    const token = createAdminToken();
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Cookie', `token=${token}`);
    
    expect(res.status).toBe(200);
  });
});
```

**Success Criteria**:
- ✅ No `verifyTokenOrTestBypass` references in codebase
- ✅ All tests still pass with proper tokens
- ✅ No security bypass possible

---

### TASK 3: Secrets Management Setup
**Priority**: 🔴 CRITICAL  
**Effort**: 8 hours  
**Owner**: DevOps Engineer + Backend Developer

#### Option A: AWS Secrets Manager

##### Step 1: Create Secrets in AWS Console
```bash
# Using AWS CLI
aws secretsmanager create-secret \
  --name matrix-delivery/production \
  --secret-string '{
    "JWT_SECRET": "your-64-char-secret-here",
    "JWT_REFRESH_SECRET": "your-64-char-refresh-secret-here",
    "ENCRYPTION_KEY": "your-64-char-encryption-key-here",
    "DB_PASSWORD": "your-db-password",
    "PLATFORM_WALLET_PRIVATE_KEY": "0xyour-private-key",
    "REDIS_PASSWORD": "your-redis-password"
  }'
```

##### Step 2: Install AWS SDK
```bash
npm install @aws-sdk/client-secrets-manager
```

##### Step 3: Create Secrets Loader
```javascript
// backend/config/secrets.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const logger = require('./logger');

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function loadSecrets() {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    logger.info('Development mode: using .env file');
    return;
  }

  try {
    const secretName = process.env.SECRET_NAME || 'matrix-delivery/production';
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const data = await client.send(command);
    
    const secrets = JSON.parse(data.SecretString);
    
    // Inject into process.env
    Object.keys(secrets).forEach(key => {
      process.env[key] = secrets[key];
    });
    
    logger.info('✅ Secrets loaded successfully from AWS Secrets Manager');
  } catch (error) {
    logger.error('Failed to load secrets:', error);
    throw new Error('Secrets loading failed - cannot start server');
  }
}

module.exports = { loadSecrets };
```

##### Step 4: Update server.js
```javascript
// backend/server.js
const { loadSecrets } = require('./config/secrets');

async function startServer() {
  try {
    // Load secrets first
    await loadSecrets();
    
    // Then initialize app
    const app = require('./app');
    const port = process.env.PORT || 5000;
    
    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();
```

##### Step 5: Update IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:matrix-delivery/*"
    }
  ]
}
```

**Success Criteria**:
- ✅ No secrets in `.env` files (only references like `SECRET_NAME`)
- ✅ Application starts successfully with loaded secrets
- ✅ Secrets can be rotated without code changes
- ✅ Development still works with local `.env`

---

### TASK 4: Token Revocation System
**Priority**: 🔴 CRITICAL  
**Effort**: 16 hours  
**Owner**: Backend Developer

#### Step 1: Create Token Revocation Service
```javascript
// backend/services/tokenRevocationService.js
const redisClient = require('../config/redis');
const logger = require('../config/logger');

class TokenRevocationService {
  /**
   * Revoke a JWT token by adding it to Redis blacklist
   */
  static async revokeToken(token, expiresInSeconds) {
    try {
      const key = `blacklist:${token}`;
      await redisClient.setex(key, expiresInSeconds, '1');
      logger.security('Token revoked', { tokenPrefix: token.substring(0, 10), category: 'security' });
      return true;
    } catch (error) {
      logger.error('Token revocation failed:', error);
      throw error;
    }
  }

  /**
   * Check if token is revoked
   */
  static async isTokenRevoked(token) {
    try {
      const key = `blacklist:${token}`;
      const exists = await redisClient.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error('Token revocation check failed:', error);
      // Fail closed - if Redis is down, reject the token
      return true;
    }
  }

  /**
   * Revoke all tokens for a user
   */
  static async revokeAllUserTokens(userId) {
    try {
      const key = `user:${userId}:token_invalidated_at`;
      const timestamp = Date.now();
      await redisClient.set(key, timestamp.toString());
      logger.security('All user tokens revoked', { userId, category: 'security' });
      return timestamp;
    } catch (error) {
      logger.error('User token revocation failed:', error);
      throw error;
    }
  }

  /**
   * Check if user tokens were invalidated after token was issued
   */
  static async isUserTokenInvalidated(userId, tokenIssuedAt) {
    try {
      const key = `user:${userId}:token_invalidated_at`;
      const invalidatedAt = await redisClient.get(key);
      
      if (!invalidatedAt) return false;
      
      const tokenIssuedTimestamp = tokenIssuedAt * 1000; // JWT uses seconds
      return parseInt(invalidatedAt) > tokenIssuedTimestamp;
    } catch (error) {
      logger.error('User token invalidation check failed:', error);
      return false;
    }
  }
}

module.exports = TokenRevocationService;
```

#### Step 2: Update Auth Middleware
```javascript
// backend/middleware/auth.js
const TokenRevocationService = require('../services/tokenRevocationService');

const verifyToken = async (req, res, next) => {
  let token = req.cookies?.token;
  
  if (!token) {
    token = req.headers['authorization']?.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      audience: 'matrix-delivery-api',
      issuer: 'matrix-delivery'
    });

    // Check if token is individually revoked
    const isRevoked = await TokenRevocationService.isTokenRevoked(token);
    if (isRevoked) {
      logger.security('Revoked token used', {
        userId: decoded.userId,
        ip: req.ip,
        category: 'security'
      });
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    // Check if all user tokens were invalidated
    const isInvalidated = await TokenRevocationService.isUserTokenInvalidated(
      decoded.userId,
      decoded.iat
    );
    if (isInvalidated) {
      logger.security('Invalidated token used', {
        userId: decoded.userId,
        ip: req.ip,
        category: 'security'
      });
      return res.status(401).json({ error: 'Token has been invalidated' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    logger.security('Invalid token', { error: error.message, category: 'security' });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

#### Step 3: Update Logout Endpoint
```javascript
// backend/controllers/authController.js
const TokenRevocationService = require('../services/tokenRevocationService');

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.decode(token);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expiresIn > 0) {
        await TokenRevocationService.revokeToken(token, expiresIn);
      }
    }
    
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};
```

#### Step 4: Add to Password Change
```javascript
// When user changes password, invalidate all tokens
await TokenRevocationService.revokeAllUserTokens(userId);
```

**Success Criteria**:
- ✅ Logout immediately invalidates tokens
- ✅ Password change revokes all existing tokens
- ✅ Revoked tokens cannot be used
- ✅ Redis failure doesn't break application (fails closed)

---

## Continue to Next Tasks...

*This document continues with Tasks 5-18 in the same detailed format. Due to length, see separate sprint implementation guides.*

---

## Testing & Validation

### Security Test Suite
```javascript
// backend/tests/security/comprehensive.test.js
describe('Security Comprehensive Tests', () => {
  describe('Rate Limiting', () => {
    it('persists across restarts', async () => { /* ... */ });
    it('works in cluster mode', async () => { /* ... */ });
  });

  describe('Token Revocation', () => {
    it('revokes on logout', async () => { /* ... */ });
    it('revokes all on password change', async () => { /* ... */ });
  });

  describe('Authorization', () => {
    it('prevents horizontal privilege escalation', async () => { /* ... */ });
    it('prevents vertical privilege escalation', async () => { /* ... */ });
  });
});
```

---

## Success Metrics

### Week 1 Completion Criteria
- [ ] All tests pass
- [ ] Redis connected in production
- [ ] Secrets loaded from vault
- [ ] No test bypass code in main branch
- [ ] Token revocation working

### Week 2-4 Completion Criteria
- [ ] Zero high-severity vulnerabilities
- [ ] <5 medium-severity issues remain
- [ ] Security test coverage >80%
- [ ] Penetration test passed
- [ ] Production deployment successful

---

**Next**: See `SPRINT_1_IMPLEMENTATION_GUIDE.md` for detailed day-by-day tasks.
