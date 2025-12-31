# Sprint 1 Implementation Guide
**Week 1: Critical Security Fixes**

**Goal**: Fix all production-blocking vulnerabilities  
**Team**: 1 Senior Backend + 1 DevOps (part-time)  
**Hours**: 42 hours total

---

## Day-by-Day Breakdown

### Monday: Infrastructure Setup (8 hours)

#### Morning (4 hours): Redis Setup
**DevOps Engineer**

1. **Provision Redis Instance** (2 hours)
   - AWS ElastiCache or Azure Cache for Redis
   - Configure security groups (allow only backend servers)
   - Enable encryption in transit and at rest
   - Set up automatic backups
   - Configure monitoring and alerts

2. **Test Redis Connection** (1 hour)
   ```bash
   # Test from backend server
   redis-cli -h your-redis-host.cache.amazonaws.com -a your-password ping
   # Should return: PONG
   ```

3. **Document Configuration** (1 hour)
   - Connection strings
   - Backup procedures
   - Failover process

#### Afternoon (4 hours): Secrets Manager Setup
**DevOps Engineer + Backend Developer**

1. **Set Up Secrets Manager** (2 hours)
   ```bash
   # Create production secret
   aws secretsmanager create-secret \
     --name matrix-delivery/production \
     --description "Production secrets for Matrix Delivery" \
     --secret-string file://secrets.json
   ```

2. **Configure IAM Roles** (1 hour)
   - Create role for EC2/Lambda
   - Attach secretsmanager:GetSecretValue permission
   - Test access from backend server

3. **Migrate First Secrets** (1 hour)
   - Start with JWT_SECRET
   - Test application startup
   - Verify secrets loading

**Deliverables**:
- ✅ Redis instance running and accessible
- ✅ Secrets Manager configured
- ✅ Access tested and documented

---

### Tuesday: Rate Limiting Migration (8 hours)

#### Morning (4 hours): Code Implementation
**Backend Developer**

1. **Install Dependencies** (0.5 hours)
   ```bash
   npm install redis rate-limit-redis
   npm install --save-dev @types/redis
   ```

2. **Create Redis Client** (1 hour)
   - Copy code from TASK 1 in main plan
   - Add error handling
   - Add reconnection logic
   - Test connection

3. **Update Rate Limit Middleware** (2 hours)
   - Replace in-memory Map with RedisStore
   - Update all rate limiter instances
   - Add logging for rate limit hits
   - Test locally

4. **Code Review** (0.5 hours)
   - Self-review changes
   - Check for edge cases
   - Verify error handling

#### Afternoon (4 hours): Testing & Deployment
**Backend Developer**

1. **Write Tests** (2 hours)
   ```javascript
   describe('Redis Rate Limiting', () => {
     it('should enforce limits across restarts', async () => {
       // Make requests until limit
       for (let i = 0; i < 5; i++) {
         await request(app).post('/api/auth/login').send({...});
       }
       
       // Restart server simulation
       await redisClient.quit();
       await redisClient.connect();
       
       // 6th request should still be blocked
       const res = await request(app).post('/api/auth/login');
       expect(res.status).toBe(429);
     });
   });
   ```

2. **Run Full Test Suite** (1 hour)
   ```bash
   npm test
   npm run test:integration
   ```

3. **Deploy to Staging** (1 hour)
   - Update environment variables
   - Deploy code
   - Monitor logs
   - Test rate limiting in staging

**Deliverables**:
- ✅ Redis-based rate limiting implemented
- ✅ All tests passing
- ✅ Deployed to staging

---

### Wednesday: Remove Test Bypass & Token Revocation (8 hours)

#### Morning (2 hours): Remove Test Bypass
**Backend Developer**

1. **Delete Test Bypass Code** (0.5 hours)
   ```bash
   # Find all usages
   grep -r "verifyTokenOrTestBypass" backend/
   
   # Delete function from auth.js
   # Remove from module.exports
   ```

2. **Create Test Utilities** (1 hour)
   - Create `tests/utils/testAuth.js`
   - Implement `createTestToken()` helper
   - Implement `createAdminToken()` helper

3. **Update All Tests** (0.5 hours)
   - Replace test headers with proper tokens
   - Run test suite
   - Fix any failures

#### Afternoon (6 hours): Token Revocation
**Backend Developer**

1. **Create Revocation Service** (2 hours)
   - Copy TokenRevocationService from plan
   - Add comprehensive error handling
   - Add logging
   - Write unit tests

2. **Update Auth Middleware** (2 hours)
   - Add revocation checks to verifyToken
   - Handle Redis failures gracefully
   - Add performance monitoring
   - Test with revoked tokens

3. **Update Logout Endpoint** (1 hour)
   - Implement token revocation on logout
   - Clear cookies
   - Add logging
   - Test logout flow

4. **Add to Password Change** (1 hour)
   - Find password change endpoint
   - Add `revokeAllUserTokens()` call
   - Test password change flow
   - Verify old tokens don't work

**Deliverables**:
- ✅ Test bypass code removed
- ✅ All tests use proper authentication
- ✅ Token revocation fully implemented
- ✅ Logout invalidates tokens
- ✅ Password change revokes all tokens

---

### Thursday: Session Management & Refresh Tokens (8 hours)

#### Full Day: Implement Refresh Token Flow
**Backend Developer**

1. **Database Schema** (1 hour)
   ```sql
   CREATE TABLE refresh_tokens (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id VARCHAR(255) NOT NULL,
     token_family UUID NOT NULL,
     token_hash VARCHAR(255) NOT NULL,
     expires_at TIMESTAMP NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     revoked_at TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
   );
   
   CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
   CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(token_family);
   ```

2. **Create Refresh Token Service** (3 hours)
   ```javascript
   // backend/services/refreshTokenService.js
   const crypto = require('crypto');
   const pool = require('../config/db');
   
   class RefreshTokenService {
     static async generateRefreshToken(userId) {
       const tokenFamily = crypto.randomUUID();
       const token = crypto.randomBytes(40).toString('hex');
       const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
       const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
       
       await pool.query(
         `INSERT INTO refresh_tokens (user_id, token_family, token_hash, expires_at)
          VALUES ($1, $2, $3, $4)`,
         [userId, tokenFamily, tokenHash, expiresAt]
       );
       
       return { token, tokenFamily };
     }
     
     static async validateAndRotate(token) {
       const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
       
       const result = await pool.query(
         `SELECT * FROM refresh_tokens 
          WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`,
         [tokenHash]
       );
       
       if (result.rows.length === 0) {
         // Possible token reuse attack - revoke entire family
         await this.revokeTokenFamily(tokenFamily);
         throw new Error('Invalid or expired refresh token');
       }
       
       const oldToken = result.rows[0];
       
       // Revoke old token
       await pool.query(
         `UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`,
         [oldToken.id]
       );
       
       // Generate new refresh token
       return await this.generateRefreshToken(oldToken.user_id);
     }
     
     static async revokeTokenFamily(tokenFamily) {
       await pool.query(
         `UPDATE refresh_tokens SET revoked_at = NOW() 
          WHERE token_family = $1 AND revoked_at IS NULL`,
         [tokenFamily]
       );
     }
   }
   
   module.exports = RefreshTokenService;
   ```

3. **Update Login Endpoint** (2 hours)
   - Generate both access and refresh tokens
   - Set short expiry for access token (15 min)
   - Store refresh token in httpOnly cookie
   - Return both tokens

4. **Create Refresh Endpoint** (1 hour)
   ```javascript
   router.post('/refresh', async (req, res) => {
     try {
       const refreshToken = req.cookies.refresh_token;
       
       if (!refreshToken) {
         return res.status(401).json({ error: 'No refresh token' });
       }
       
       const { token, tokenFamily } = await RefreshTokenService.validateAndRotate(refreshToken);
       
       // Get user details
       const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
       const user = userResult.rows[0];
       
       // Generate new access token
       const accessToken = jwt.sign(
         { userId: user.id, role: user.primary_role, /* ... */ },
         JWT_SECRET,
         { expiresIn: '15m', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
       );
       
       // Set new refresh token cookie
       res.cookie('refresh_token', token, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'strict',
         maxAge: 7 * 24 * 60 * 60 * 1000
       });
       
       // Set new access token
       res.cookie('token', accessToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax',
         maxAge: 15 * 60 * 1000 // 15 minutes
       });
       
       res.json({ accessToken, expiresIn: 900 });
     } catch (error) {
       logger.error('Token refresh error:', error);
       res.status(401).json({ error: 'Token refresh failed' });
     }
   });
   ```

5. **Testing** (1 hour)
   - Test login with new tokens
   - Test refresh flow
   - Test token reuse detection
   - Test token expiration

**Deliverables**:
- ✅ Refresh token system implemented
- ✅ Access tokens expire in 15 minutes
- ✅ Refresh tokens rotate on use
- ✅ Token reuse detection works
- ✅ All auth flows tested

---

### Friday: Secrets Migration & Final Testing (8 hours)

#### Morning (4 hours): Complete Secrets Migration
**Backend Developer + DevOps**

1. **Migrate All Secrets** (2 hours)
   - Move all secrets from .env to Secrets Manager
   - Update secrets loading code
   - Test application startup
   - Verify all features work

   **Secrets to migrate**:
   ```json
   {
     "JWT_SECRET": "...",
     "JWT_REFRESH_SECRET": "...",
     "ENCRYPTION_KEY": "...",
     "DB_PASSWORD": "...",
     "REDIS_PASSWORD": "...",
     "PLATFORM_WALLET_PRIVATE_KEY": "...",
     "STRIPE_SECRET_KEY": "...",
     "PAYMOB_API_KEY": "...",
     "SMTP_PASSWORD": "..."
   }
   ```

2. **Update Deployment Scripts** (1 hour)
   - Add Secret ARN to deployment config
   - Update IAM permissions
   - Document deployment process
   - Test deployment

3. **Security Audit** (1 hour)
   - Verify no secrets in code
   - Check all .env files
   - Scan for accidentally committed secrets
   - Update .gitignore if needed

#### Afternoon (4 hours): Integration Testing
**Backend Developer**

1. **Full Integration Test Suite** (2 hours)
   ```bash
   # Run all tests
   npm run test:all
   
   # Run security-specific tests
   npm run test:security
   
   # Run E2E tests
   npm run test:bdd
   ```

2. **Manual Testing** (1.5 hours)
   - Test login/logout flow
   - Test token refresh
   - Test rate limiting (trigger limits)
   - Test with revoked tokens
   - Test password change flow
   - Verify secrets loading

3. **Performance Testing** (0.5 hours)
   - Check Redis latency
   - Monitor token validation speed
   - Verify no memory leaks
   - Load test authentication endpoints

**Deliverables**:
- ✅ All secrets migrated to Secrets Manager
- ✅ No secrets in source code
- ✅ All integration tests passing
- ✅ Performance acceptable
- ✅ Ready for staging deployment

---

## Friday EOD: Sprint Review

### Checklist
```markdown
## Sprint 1 Completion Criteria

### Infrastructure
- [ ] Redis instance running in production
- [ ] Secrets Manager configured
- [ ] Centralized logging set up
- [ ] Monitoring and alerts configured

### Code Changes
- [ ] Redis rate limiting implemented
- [ ] Test bypass code removed
- [ ] Token revocation system working
- [ ] Refresh token flow implemented
- [ ] Secrets loading from vault

### Testing
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Security tests passing
- [ ] Manual testing completed
- [ ] Performance acceptable

### Deployment
- [ ] Deployed to staging
- [ ] Staging tests passed
- [ ] Production deployment plan ready
- [ ] Rollback plan documented

### Documentation
- [ ] Code commented
- [ ] README updated
- [ ] Deployment guide updated
- [ ] Secrets rotation procedure documented
```

---

## Common Issues & Solutions

### Issue: Redis Connection Timeouts
**Solution**:
```javascript
// Increase timeout in redis client config
const redisClient = Redis.createClient({
  socket: {
    connectTimeout: 10000,
    reconnectStrategy: (retries) => Math.min(retries * 50, 500)
  }
});
```

### Issue: Secrets Manager API Limits
**Solution**:
- Cache secrets in memory for 5 minutes
- Don't call on every request
- Use environment variables as fallback

### Issue: Token Refresh Race Conditions
**Solution**:
- Use database transactions
- Implement token family concept
- Add retry logic with exponential backoff

---

## Week 1 Success Metrics

- ✅ Zero high-severity auth vulnerabilities
- ✅ Redis uptime > 99.9%
- ✅ Token revocation latency < 100ms
- ✅ No secrets in source control
- ✅ All tests green
- ✅ Ready for Week 2

---

**Next**: [Sprint 2 Implementation Guide](./SPRINT_2_IMPLEMENTATION_GUIDE.md)
