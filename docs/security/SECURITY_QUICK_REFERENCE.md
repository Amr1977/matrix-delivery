# Security Audit Quick Reference
**Critical Fixes Needed Before Production**

---

## 🔴 Top 5 Critical Issues

### 1️⃣ In-Memory Rate Limiting → Migrate to Redis
- **File**: `backend/middleware/rateLimit.js:4`
- **Risk**: Bypassed on restart, won't scale
- **Fix**: Install Redis, use `express-rate-limit` with Redis adapter
- **Effort**: 4 hours

### 2️⃣ Test Bypass Code → Remove Immediately  
- **File**: `backend/middleware/auth.js:260-266`
- **Risk**: Admin access with special header if `NODE_ENV=test`
- **Fix**: Delete `verifyTokenOrTestBypass` function
- **Effort**: 2 hours

### 3️⃣ No Token Revocation → Implement Blacklist
- **File**: `backend/middleware/auth.js`
- **Risk**: Stolen tokens valid for 7 days
- **Fix**: Add Redis-based token blacklist
- **Effort**: 16 hours

### 4️⃣ Unencrypted Secrets → Use Secrets Manager
- **Files**: All environment variables
- **Risk**: One file leak = total compromise
- **Fix**: AWS Secrets Manager / Azure Key Vault
- **Effort**: 8 hours

### 5️⃣ Long-Lived Sessions → Implement Refresh Tokens
- **File**: JWT cookie configuration  
- **Risk**: Large attack window
- **Fix**: 15-min access + 7-day refresh tokens
- **Effort**: 12 hours

---

## 📋 Implementation Checklist

### Redis Rate Limiting Setup
```bash
# Install Redis (production)
npm install express-rate-limit rate-limit-redis redis

# Update middleware
const Redis = require('redis');
const RedisStore = require('rate-limit-redis');

const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const limiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

### Token Revocation Implementation
```javascript
// Add to auth middleware
const isTokenRevoked = async (token) => {
  const exists = await redisClient.exists(`blacklist:${token}`);
  return exists === 1;
};

// In verifyToken middleware
if (await isTokenRevoked(token)) {
  return res.status(401).json({ error: 'Token has been revoked' });
}

// Add logout endpoint
router.post('/logout', verifyToken, async (req, res) => {
  const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
  const decoded = jwt.decode(token);
  const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
  
  await redisClient.setex(`blacklist:${token}`, expiresIn, '1');
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});
```

### Remove Test Bypass
```javascript
// DELETE THIS ENTIRE FUNCTION from backend/middleware/auth.js
❌ const verifyTokenOrTestBypass = (req, res, next) => {
❌   if (IS_TEST && req.headers['x-test-admin'] === '1') {
❌     req.user = { role: 'admin', userId: req.headers['x-test-user-id'] };
❌     return next();
❌   }
❌   return verifyToken(req, res, next);
❌ };

// Replace all usages with verifyToken directly
✅ app.use('/api/admin', verifyToken, requireAdmin, adminRoutes);
```

### Secrets Management (AWS Example)
```javascript
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName) {
  const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString);
}

// At startup
const secrets = await getSecret('matrix-delivery/production');
process.env.JWT_SECRET = secrets.JWT_SECRET;
process.env.DB_PASSWORD = secrets.DB_PASSWORD;
```

---

## 🧪 Security Testing Commands

### Run Security Tests
```bash
# SQL injection protection
npm test -- --testNamePattern="SQL Injection"

# Authentication tests  
npm test -- --testPathPattern=auth

# Authorization tests
npm test -- --testNamePattern="Authorization"

# Rate limiting tests
npm test -- --testNamePattern="Rate Limit"
```

### Manual Testing Checklist
```bash
# 1. Test rate limiting
for i in {1..10}; do 
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}';
done
# Should see 429 rate limit error

# 2. Test token expiration
# Get a token, wait for expiration, try to use it
# Should see 401 unauthorized

# 3. Test SQL injection
curl "http://localhost:5000/api/users?search=%27%20OR%20%271%27=%271"
# Should NOT return all users

# 4. Test CORS
curl -H "Origin: http://evil.com" http://localhost:5000/api/health
# Should be blocked by CORS
```

---

## 📊 Security Metrics to Monitor

### Daily Monitoring
- Failed login attempts (alert if >10 from single IP in 5 min)
- Rate limit hits (alert if >100/hour)
- 403 Forbidden responses (investigate if spike)
- Admin actions (email notification for each action)

### Weekly Review
- Dependency vulnerabilities (`npm audit`)
- Error rate trends
- Database performance (slow queries)
- Log file size and rotation

### Monthly Tasks
- Review and update dependencies
- Security patch review
- Access log analysis
- Backup testing

---

## 🚀 Deployment Security Checklist

```markdown
PRE-DEPLOYMENT
- [ ] All critical vulnerabilities fixed
- [ ] Redis configured and tested
- [ ] Secrets migrated to secrets manager
- [ ] Test bypass code removed
- [ ] Environment variables validated
- [ ] HTTPS enforced (HSTS enabled)
- [ ] Security headers verified
- [ ] Rate limiting tested
- [ ] Database backups configured
- [ ] Monitoring and alerting set up

DEPLOYMENT
- [ ] NODE_ENV=production verified
- [ ] All secrets rotated
- [ ] Firewall rules configured
- [ ] Load balancer SSL configured
- [ ] Database SSL enabled
- [ ] Backup restoration tested

POST-DEPLOYMENT
- [ ] Smoke tests passed
- [ ] Security headers confirmed
- [ ] Rate limiting working
- [ ] Logs flowing to central system
- [ ] Alerts configured and tested
- [ ] Incident response plan documented
```

---

## 📞 Emergency Contacts & Procedures

### If Security Breach Detected
1. **Immediately**: Isolate affected systems
2. **Within 1 hour**: Notify security team
3. **Within 2 hours**: Begin incident investigation  
4. **Within 24 hours**: Notify affected users (if PII compromised)
5. **Within 72 hours**: Report to authorities (GDPR requirement)

### Key Actions
- Rotate all secrets and credentials
- Revoke all active tokens
- Enable maintenance mode
- Capture system snapshots for forensics
- Review access logs

---

## 📚 Additional Resources

- Full Report: `DOCS/OWASP_TOP_10_SECURITY_AUDIT.md`
- Executive Summary: `DOCS/SECURITY_AUDIT_EXECUTIVE_SUMMARY.md`
- OWASP Top 10: https://owasp.org/Top10/
- Security Testing Guide: https://owasp.org/www-project-web-security-testing-guide/

---

**Last Updated**: December 30, 2025  
**Next Review**: Before production deployment
