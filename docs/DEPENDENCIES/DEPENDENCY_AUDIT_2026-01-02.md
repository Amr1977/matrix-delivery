# Dependency Audit & Cleanup Plan

*Date: 2026-01-02*

## Audit Results

**Vulnerabilities:** 18 total (4 HIGH, 14 LOW)

| Severity | Count | Fixable |
|----------|-------|---------|
| HIGH | 4 | 3 (express, qs, jws) |
| LOW | 14 | 0 (hardhat ecosystem - dev only) |

---

## Fixes Applied

### 1. Express + qs (HIGH Severity)
- **Issue:** DoS via memory exhaustion
- **Fix:** `npm install express@4.22.1`

### 2. jws (HIGH Severity)
- **Issue:** Improper HMAC signature verification
- **Fix:** `npm audit fix`

### 3. Unused Dependencies Removed
- `sequelize` - Not used (raw `pg` is used instead)
- `pg-hstore` - Sequelize companion, unused

---

## Unfixable (Dev Only)

14 LOW severity vulnerabilities in hardhat ecosystem:
- Pending hardhat v4 release
- Dev/test dependencies only, no production impact

---

## Architecture Decision: Raw pg vs Sequelize

**Decision:** Keep raw `pg` (node-postgres)

| Raw pg (Current) | Sequelize ORM |
|------------------|---------------|
| ✅ Faster (2-5x) | ❌ Slower |
| ✅ Full SQL control | ❌ Abstraction layer |
| ✅ PostGIS friendly | ❌ PostGIS awkward |
| ✅ Already working | ❌ Requires rewrite |

---

## Commands Executed

```bash
npm audit fix
npm install express@4.22.1
npm uninstall sequelize pg-hstore
```
