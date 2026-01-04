# Unified Test Structure - Complete

**Date**: December 31, 2025  
**Migration**: Complete

---

## ✅ Unified Test Folder Structure

All tests now consolidated into `tests/` folder:

```
tests/
├── features/                           # ALL Gherkin features
│   ├── backend/ (15 files)            # Backend API features
│   │   ├── authentication.feature
│   │   ├── authorization-security.feature ✨ NEW
│   │   ├── payment-methods.feature
│   │   └── ...
│   ├── frontend/ (31 files)           # Frontend UI features  
│   │   ├── order_creation.feature
│   │   ├── customer_browsing.feature
│   │   └── ...
│   └── core/                          # Core lifecycle features
│       └── order_lifecycle.feature
│
├── step_definitions/                   # ALL step implementations
│   ├── api/ (33 files)                # Backend API steps
│   │   ├── authorization_api_steps.js ✨
│   │   ├── auth_steps.js
│   │   └── ...
│   └── ui/ (2 files)                  # Frontend UI steps
│       ├── authorization_ui_steps.js ✨
│       └── cod_commission_steps.js
│
├── unit/ (12 subdirs)                 # Jest unit tests
│   ├── database/
│   ├── middleware/
│   ├── services/
│   └── ...
│
├── integration/ (19 test files)       # Jest integration tests
│   ├── auth/
│   ├── admin/
│   ├── payment/
│   └── ...
│
├── support/                            # Test helpers
├── utils/                              # Test utilities
├── reports/                            # Test reports
│
├── cucumber.config.js                  # Cucumber configuration ✨ NEW
└── jest.config.js                      # Jest configuration ✨ NEW
```

---

## 🎯 Test Organization Strategy

### By Test Type

| Type | Location | Run Command |
|------|----------|-------------|
| **BDD Features** | `tests/features/` | `npm run test:bdd` |
| **Unit Tests** | `tests/unit/` | `npm run test:unit` |
| **Integration Tests** | `tests/integration/` | `npm run test:integration` |
| **Performance** | `tests/performance/` (future) | `npm run test:perf` |
| **Load** | `tests/load/` (future) | `npm run test:load` |

### By Layer

| Layer | Features | Steps | Tags |
|-------|----------|-------|------|
| **Backend API** | `tests/features/backend/` | `tests/step_definitions/api/` | `@api` |
| **Frontend UI** | `tests/features/frontend/` | `tests/step_definitions/ui/` | `@ui` |

---

## 📜 Running Tests

### BDD Tests (Cucumber)

```bash
# All BDD tests
cd tests
npx cucumber-js --config cucumber.config.js

# Backend API tests only
npx cucumber-js --profile backend-api

# Frontend UI tests only
npx cucumber-js --profile frontend-ui

# Security tests
npx cucumber-js --profile security
```

### Unit/Integration Tests (Jest)

```bash
# All Jest tests
cd tests
jest --config jest.config.js

# Unit tests only
jest tests/unit

# Integration tests only
jest tests/integration

# Specific test file
jest tests/integration/auth/auth.test.js
```

---

## 🔧 Configuration Files

### cucumber.config.js

Profiles defined:
- `default` - All features
- `backend-api` - Backend API tests (`@api` tag)
- `frontend-ui` - Frontend UI tests (`@ui` tag)
- `security` - Security-specific tests

### jest.config.js

Points to:
- Test files: `tests/unit/**/*.test.{js,ts}` and `tests/integration/**/*.test.{js,ts}`
- Setup: `tests/setup.js`
- Coverage: Excludes test folders

---

## 🚀 Benefits

✅ **Single source of truth** - All tests in one place  
✅ **Clear organization** - By type (BDD, unit, integration) and layer (API, UI)  
✅ **Easier navigation** - Logical folder structure  
✅ **Future-proof** - Ready for performance, load, e2e tests  
✅ **CI/CD friendly** - Simple paths  
✅ **Polymorphic BDD maintained** - Same features, multiple implementations  

---

## 🎉 Migration Complete

**Files moved**:
- 15 backend BDD features
- 31 frontend BDD features
- 33 API step definitions
- 2 UI step definitions
- 12 unit test directories
- 19 integration test files

**Old locations** (for reference, can be removed):
- ~~`backend/features/`~~ → moved to `tests/features/backend/`
- ~~`backend/tests/`~~ → moved to `tests/unit/` and `tests/integration/`

---

**Status**: ✅ ALL TESTS UNIFIED IN `tests/` FOLDER
