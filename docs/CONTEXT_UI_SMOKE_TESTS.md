# Matrix Delivery - Context for New Conversation

**Date**: 2026-01-02  
**Last Task**: Implementing UI Smoke Tests

---

## Project Overview

Matrix Delivery is a P2P delivery platform with:

- **Backend**: Node.js/Express, PostgreSQL, Redis, Socket.IO
- **Frontend**: React (CRA), Leaflet maps, TypeScript migration in progress
- **Testing**: Polymorphic BDD with Cucumber, Playwright for UI

---

## Current State

### ✅ What's Working

| Component          | Status                                              |
| ------------------ | --------------------------------------------------- |
| QA Safety Net      | Implemented (Husky, lint-staged, GitHub Actions CI) |
| BDD Test Framework | 48 feature files, API tests passing                 |
| Playwright Config  | `frontend/playwright.config.js` configured          |
| Build Smoke Tests  | `frontend/smoke-tests/build-smoke.test.js`          |
| Login-Logout Flow  | `frontend/smoke-tests/login-logout-flow.test.js`    |
| Admin Health Tab   | Fixed and pushed to master                          |

### ❌ Pending Work

1. **Add `data-testid` to auth forms** in `App.js` for Playwright selectors
2. **Create map rendering smoke test** - verifies Leaflet loads
3. **Create signup smoke test** - tests registration flow
4. **Add UI smoke tests to CI pipeline** in `.github/workflows/ci.yml`

---

## Key Files

### Testing Infrastructure

```
tests/
├── features/           # 48 BDD feature files
│   ├── backend/        # 16 API features (auth, admin, payments)
│   ├── frontend/       # 31 UI features (maps, orders, drivers)
│   └── core/           # 1 order lifecycle feature
├── step_definitions/   # Cucumber step implementations
└── cucumber.config.js  # BDD configuration

frontend/
├── smoke-tests/        # Playwright tests
│   ├── build-smoke.test.js
│   └── login-logout-flow.test.js
└── playwright.config.js
```

### Documentation

- `DOCS/TESTING_STRATEGY.md` - Polymorphic BDD explained
- `DOCS/TESTING/` - 8 testing docs
- `DOCS/QA_AND_TESTING.md` - QA system documentation

---

## Implementation Plan (Pending)

### 1. Add Test IDs to Auth Forms

**File**: `frontend/src/App.js`

- `data-testid="email-input"`
- `data-testid="password-input"`
- `data-testid="login-submit-btn"`
- `data-testid="register-submit-btn"`

### 2. Create Map Smoke Test

**File**: `frontend/smoke-tests/map-rendering.test.js`

```javascript
test("should render Leaflet map", async ({ page }) => {
  await page.goto("/");
  await page.waitForSelector(".leaflet-container");
});
```

### 3. Create Signup Smoke Test

**File**: `frontend/smoke-tests/signup-flow.test.js`

### 4. Update CI Pipeline

**File**: `.github/workflows/ci.yml`
Add job for UI smoke tests

---

## Commands Reference

```bash
# Run BDD API tests
npm run test:bdd:api

# Run Playwright smoke tests (requires built frontend)
cd frontend && npx playwright test

# Run backend tests
npm run test:backend

# Commit with pre-commit hooks
git add . && git commit -m "message"
```

---

## Recent Commits

- `fix(admin): Add System Health tab and save prettier dependency`
- `feat(qa): Implement robust QA safety net (Husky, lint-staged, CI)`

---

## Next Steps

1. Add test IDs to login/signup forms
2. Create `map-rendering.test.js`
3. Create `signup-flow.test.js`
4. Add UI smoke tests job to CI
5. Commit and push
