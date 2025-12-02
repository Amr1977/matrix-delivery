# ☑️ SECURITY REMEDIATION CHECKLIST
## Matrix Delivery - Pre-Launch Security Hardening

**Project:** Matrix Delivery  
**Target:** https://matrix-delivery.web.app (Trial Launch)  
**Date Started:** December 2, 2025  
**Target Completion:** December 2, 2025 (same day)  

---

## 🔴 PHASE 1: CRITICAL (3-4 HOURS) - MUST COMPLETE BEFORE LAUNCH

### Credential & Secrets Management
- [ ] **Generate new JWT_SECRET**
  - Command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Store in: `backend/.env.production`
  - Time: 5 min

- [ ] **Generate new JWT_REFRESH_SECRET**
  - Command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Store in: `backend/.env.production`
  - Time: 5 min

- [ ] **Generate ENCRYPTION_KEY**
  - Command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  - Store in: `backend/.env.production`
  - Time: 5 min

- [ ] **Rotate Firebase API keys**
  - Go to: https://console.firebase.google.com
  - Project: matrix-delivery
  - Delete old keys, generate new ones
  - Update: `frontend/.env.production`
  - Time: 15 min

- [ ] **Regenerate Stripe keys**
  - Go to: https://dashboard.stripe.com/apikeys
  - Archive old keys, activate new ones
  - Update: `backend/.env.production`
  - Time: 10 min

- [ ] **Change database password**
  - Minimum: 16 characters
  - Include: uppercase, lowercase, numbers, special chars
  - Store in: `backend/.env.production` (DB_PASSWORD)
  - Time: 10 min

- [ ] **Remove .env files from git history**
  - Command: `git filter-branch --tree-filter 'rm -f .env backend/.env' HEAD`
  - Command: `git push --force-all`
  - Time: 10 min

- [ ] **Update .gitignore**
  - Add: `.env`, `.env.local`, `.env.*.local`, `backend/.env*` (except .example)
  - Time: 5 min

### Backend Security Hardening
- [ ] **Install security packages**
  - Command: `npm install helmet cookie-parser csurf express-validator mongo-sanitize`
  - Location: root or `backend/`
  - Time: 5 min

- [ ] **Add Helmet.js middleware** (See FIX #3 in quick guide)
  - File: `backend/server.js`
  - Line: ~68 (replace the "NOT USED" comment)
  - Time: 15 min

- [ ] **Implement JWT token expiration** (See FIX #2 in quick guide)
  - File: `backend/routes/auth.js`
  - Add: Token expiry: 15 minutes
  - Add: Refresh endpoint
  - Time: 30 min

- [ ] **Fix CORS configuration** (See FIX #4 in quick guide)
  - File: `backend/server.js`
  - Remove: All localhost entries from production
  - File: `backend/.env.production`
  - Time: 15 min

- [ ] **Add input validation** (See FIX #6 in quick guide)
  - File: `backend/routes/auth.js`
  - Add: express-validator middleware
  - Time: 30 min

- [ ] **Add rate limiting** (See FIX #7 in quick guide)
  - File: `backend/middleware/rateLimit.js` (create new)
  - Apply to: `/auth/login`, `/auth/register`
  - Time: 30 min

- [ ] **Implement HTTPS redirect** (See FIX #8 in quick guide)
  - File: `backend/server.js`
  - Add: Redirect HTTP to HTTPS for production
  - Time: 10 min

- [ ] **Add CSRF protection** (See FIX #9 in quick guide)
  - File: `backend/server.js`
  - Add: CSRF middleware
  - Time: 20 min

### Frontend Security Updates
- [ ] **Update Firebase config** (See FIX #1 in quick guide)
  - File: `frontend/src/firebase.js`
  - Move: API keys to environment variables
  - File: `frontend/.env.production`
  - Add: All Firebase config variables
  - Time: 20 min

- [ ] **Remove localStorage tokens** (See FIX #5 in quick guide)
  - File: `frontend/src/App.js`
  - Remove: localStorage.getItem('token')
  - Time: 15 min

### Testing & Verification
- [ ] **Run npm audit**
  - Command: `npm audit`
  - Location: root, backend/, frontend/
  - Fix: Any critical vulnerabilities
  - Time: 15 min

- [ ] **Run linter**
  - Command: `npm run lint`
  - Location: root or frontend/
  - Time: 10 min

- [ ] **Build locally**
  - Backend: `npm run dev`
  - Frontend: `npm start`
  - Verify: No errors
  - Time: 15 min

- [ ] **Test authentication**
  - Test register endpoint with validation
  - Test login with rate limiting
  - Verify: JWT tokens work
  - Time: 15 min

- [ ] **Test security headers**
  - Command: `curl -I http://localhost:5000`
  - Verify: Helmet headers present
  - Time: 5 min

- [ ] **Verify no console logs with secrets**
  - Grep for: password, token, secret, key
  - Location: backend/ and frontend/src/
  - Time: 10 min

### Deployment Preparation
- [ ] **Backup current database**
  - Command: `pg_dump matrix_delivery > backup_$(date +%Y%m%d_%H%M%S).sql`
  - Verify: Backup file exists and is not empty
  - Time: 10 min

- [ ] **Verify SSL certificate**
  - Domain: matrix-delivery.web.app
  - Check: Valid, not self-signed, not expired
  - Time: 5 min

- [ ] **Update backend/.env.production**
  - All new secrets added
  - NODE_ENV=production
  - CORS_ORIGIN set correctly
  - Time: 10 min

- [ ] **Update frontend/.env.production**
  - All Firebase config variables
  - API_URL pointing to production
  - Environment set to production
  - Time: 10 min

- [ ] **Verify deployment pipeline**
  - Firebase hosting configured
  - Backend deployment path ready
  - Database connection string tested
  - Time: 10 min

### Deployment
- [ ] **Deploy backend changes**
  - Pull latest code
  - Verify environment variables
  - Restart backend service
  - Health check: Verify /api/health returns 200
  - Time: 10 min

- [ ] **Deploy frontend to Firebase**
  - Command: `firebase deploy --only hosting`
  - Verify: Deployment successful
  - Check: https://matrix-delivery.web.app loads
  - Time: 10 min

- [ ] **Verify production deployment**
  - Test: https://matrix-delivery.web.app loads
  - Test: Login/register works
  - Test: Security headers present
  - Time: 15 min

- [ ] **Monitor for errors**
  - Check: Firebase console for errors
  - Check: Backend logs for issues
  - Watch: For next 30 minutes
  - Time: 30 min

**Phase 1 Total Time: 3-4 hours**  
**Estimated Completion: 11:45 PM UTC (if started at 7:45 PM UTC)**

---

## 🟠 PHASE 2: HIGH-PRIORITY (4-6 HOURS) - WITHIN 1 WEEK

### Authentication Improvements
- [ ] **Implement token refresh cookies** (See FIX #5 in detailed guide)
  - File: `backend/routes/auth.js`
  - Add: httpOnly refresh token cookie
  - Time: 1 hour

- [ ] **Add token expiration enforcement**
  - File: `backend/middleware/auth.js`
  - Verify: Every token has expiration
  - Time: 30 min

### Advanced Security Features
- [ ] **Implement audit logging** (See FIX #11 in detailed guide)
  - Create: `audit_logs` table in database
  - Log: All logins, password changes, payments
  - Time: 2 hours

- [ ] **Enable reCAPTCHA v3**
  - Setup: https://www.google.com/recaptcha/admin
  - Update: backend/.env.production (RECAPTCHA_SECRET_KEY)
  - Update: frontend/.env.production (RECAPTCHA_SITE_KEY)
  - Time: 30 min

- [ ] **Add encryption for sensitive fields** (See FIX #10 in detailed guide)
  - Create: `encryption.js` utility
  - Encrypt: Phone, license, payment info
  - Time: 1.5 hours

### Database Security
- [ ] **Enable database SSL/TLS**
  - Get: CA certificate from database provider
  - Update: `backend/server.js` connection config
  - Time: 1 hour

- [ ] **Implement database user permissions**
  - Create: Separate read-only user for app queries
  - Restrict: Direct database access
  - Time: 30 min

### Testing & Monitoring
- [ ] **Set up monitoring alerts**
  - Setup: Failed login threshold alerts
  - Setup: Rate limit violation alerts
  - Setup: Error rate alerts
  - Time: 1 hour

- [ ] **Create security testing suite**
  - Test: Input validation on all endpoints
  - Test: CSRF token validation
  - Test: Rate limiting enforcement
  - Time: 2 hours

**Phase 2 Total Time: 4-6 hours**  
**Target Completion: Within 1 week of launch**

---

## 🟡 PHASE 3: ENHANCEMENT (6-8 HOURS) - WITHIN 1 MONTH

### Data Protection
- [ ] **Full database encryption**
  - Implement: Column-level encryption for all sensitive data
  - Time: 2-3 hours

- [ ] **Backup encryption**
  - Setup: Encrypted backup storage
  - Test: Backup restoration
  - Time: 1-2 hours

### Advanced Monitoring
- [ ] **Implement WAF (Web Application Firewall)**
  - Options: Cloudflare, AWS WAF, or other
  - Setup: Rate limiting, bot detection, DDoS protection
  - Time: 2 hours

- [ ] **Add security event dashboards**
  - Create: Real-time security monitoring dashboard
  - Include: Failed logins, rate limits, suspicious activity
  - Time: 2 hours

### Compliance & Documentation
- [ ] **Create incident response plan**
  - Document: Procedures for security incidents
  - Assign: On-call security team
  - Time: 1-2 hours

- [ ] **Implement GDPR compliance**
  - Add: Data export functionality
  - Add: Data deletion functionality
  - Update: Privacy policy
  - Time: 2-3 hours

**Phase 3 Total Time: 6-8 hours**  
**Target Completion: Within 1 month of launch**

---

## 📊 DAILY LAUNCH DAY CHECKLIST

### Morning (Before Launch)
- [ ] Team sync meeting (10 min)
- [ ] Database backup created (5 min)
- [ ] All environment variables set (5 min)
- [ ] SSL certificate verified (5 min)
- [ ] Final code review (30 min)
- [ ] Run security tests (15 min)
- [ ] Deploy to staging (15 min)
- [ ] Smoke tests on staging (15 min)

### Launch Time
- [ ] Deploy to production (20 min)
- [ ] Verify deployment (10 min)
- [ ] Check security headers (5 min)
- [ ] Test key functionality (15 min)
- [ ] Monitor initial traffic (30 min)

### Post-Launch (First 24 Hours)
- [ ] Monitor error logs (ongoing)
- [ ] Watch rate limiting stats (ongoing)
- [ ] Check failed login attempts (ongoing)
- [ ] Monitor CPU/memory/database (ongoing)
- [ ] Be ready for rollback (on-call)

---

## 🔒 ONGOING MAINTENANCE CHECKLIST

### Weekly
- [ ] Review security logs
- [ ] Check failed login attempts
- [ ] Monitor rate limiting stats
- [ ] Check certificate expiration (due this month?)

### Monthly
- [ ] Run `npm audit` all packages
- [ ] Review access logs
- [ ] Test backup restoration
- [ ] Rotate non-critical secrets

### Quarterly
- [ ] Penetration testing
- [ ] OWASP Top 10 review
- [ ] Dependency security updates
- [ ] Security team training

### Annually
- [ ] Full security audit
- [ ] Compliance review (GDPR, etc.)
- [ ] Infrastructure security review
- [ ] Update security policies

---

## 📋 CHECKLIST LEGEND

- [ ] = Not started
- [x] = Completed
- [!] = In progress / Blocked
- [?] = Need clarification

**Use this format for status updates:**
```
- [x] Item name (Completed by: Name, Time: 15 min)
- [!] Item name (Blocked by: Issue, ETA: tomorrow)
- [?] Item name (Question: Details needed)
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete When:
- ✅ All 5 critical issues fixed
- ✅ npm audit shows no critical vulnerabilities
- ✅ Security headers present on all responses
- ✅ JWT tokens have expiration
- ✅ CORS configured for production only
- ✅ All secrets rotated
- ✅ HTTPS enforced
- ✅ Rate limiting active

### Phase 1 Verification:
```bash
# 1. Security headers check
curl -I https://matrix-delivery.web.app | grep -i "Strict-Transport-Security"

# 2. Test authentication
curl -X POST https://api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@1234"}'

# 3. npm audit
npm audit  # Should show 0 critical

# 4. Deployment successful
curl https://matrix-delivery.web.app  # Should load without errors
```

---

## 📞 CONTACTS & ESCALATION

### Technical Support
- **Backend Lead:** [Name] (phone/email)
- **Frontend Lead:** [Name] (phone/email)
- **DevOps/Infra:** [Name] (phone/email)

### Escalation Path
1. Technical Lead
2. CTO
3. Security Officer
4. Vendor Support (Firebase, etc.)

### Emergency Contacts
- **Incident Commander:** [On-call rotation]
- **Security:** [On-call rotation]
- **Database Admin:** [On-call rotation]

---

## 📝 NOTES & COMMENTS

```
[Space for daily notes, blockers, decisions, etc.]

Day 1 (Dec 2):
- Started Phase 1 at 7:45 PM UTC
- [Add progress updates here]
- [Add blockers here]
- [Add decisions here]
```

---

## ✅ FINAL VERIFICATION CHECKLIST

Before considering security remediation complete:

- [ ] All Phase 1 items completed
- [ ] All tests passing
- [ ] No security warnings in logs
- [ ] Security headers verified
- [ ] HTTPS working
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] Rate limiting working
- [ ] No exposed secrets
- [ ] Team agrees: Ready for launch

**Sign-off:**
- [ ] Technical Lead: _________________ Date: _______
- [ ] CTO: _________________ Date: _______
- [ ] Security Lead: _________________ Date: _______

---

**Checklist Version:** 1.0  
**Last Updated:** December 2, 2025  
**Next Review:** December 9, 2025 (post-launch)

