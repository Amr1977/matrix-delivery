# Complete Test Structure Overview

**Project**: Matrix Delivery  
**Test Strategy**: Polymorphic BDD + Traditional Testing

---

## 🗂️ Three Test Folders

### 1. `tests/` (Frontend BDD - Cucumber)
**Location**: `D:\matrix-delivery\tests`  
**Purpose**: UI/Frontend end-to-end testing  
**Framework**: Cucumber (Gherkin)  
**Runs**: Browser-based tests

```
tests/
├── features/               # Frontend Gherkin feature files (32 files)
├── step_definitions/       # Frontend step implementations (23 files)
├── steps/                  # Additional step helpers
├── support/                # Test helpers and hooks
├── utils/                  # Test utilities
└── reports/                # Test reports
```

### 2. `backend/features/` (Backend BDD - Cucumber)
**Location**: `D:\matrix-delivery\backend\features`  
**Purpose**: Backend API testing (polymorphic BDD)  
**Framework**: Cucumber (Gherkin)  
**Runs**: API-level tests via supertest

```
backend/features/
├── *.feature               # Backend Gherkin files (15 files)
│   ├── authentication.feature
│   ├── authorization-security.feature ← NEW!
│   ├── payment-methods.feature
│   └── ...
├── step_definitions/       # Backend step implementations
│   ├── authorization_api_steps.js ← NEW!
│   ├── authorization_ui_steps.js  ← NEW!
│   ├── auth_steps.js
│   └── ...
└── support/                # Hooks and helpers
```

### 3. `backend/tests/` (Backend Traditional - Jest)
**Location**: `D:\matrix-delivery\backend\tests`  
**Purpose**: Unit and integration testing  
**Framework**: Jest + Supertest  
**Runs**: Fast unit/integration tests

```
backend/tests/
├── unit/                   # Unit tests (12 subdirs)
│   ├── database/
│   ├── middleware/
│   ├── services/
│   └── utils/
├── integration/            # Integration tests (19 subdirs)
│   ├── auth/
│   ├── admin/
│   ├── payment/
│   └── ...
├── utils/                  # Test utilities
│   └── testAuth.js ← Created for security tests
└── *.test.js               # Standalone test files
```

---

## 📊 Test Strategy Breakdown

### When to Use Each Folder

| Test Type | Folder | Framework | Use For |
|-----------|--------|-----------|---------|
| **Frontend E2E** | `tests/` | Cucumber | User flows in browser |
| **Backend BDD** | `backend/features/` | Cucumber | API behavior testing |
| **Backend Unit** | `backend/tests/unit/` | Jest | Function-level tests |
| **Backend Integration** | `backend/tests/integration/` | Jest | API endpoint tests |

### Polymorphic BDD Strategy

**NEW Authorization Tests** follow this pattern:

```
Feature File (ONE):
  backend/features/authorization-security.feature

Step Definitions (TWO):
  backend/features/step_definitions/authorization_api_steps.js  → Tests API
  backend/features/step_definitions/authorization_ui_steps.js   → Tests UI

Frontend Step Definitions (FUTURE):
  tests/step_definitions/authorization_ui_steps.js → Same feature, frontend impl
```

---

## 🔄 How They Work Together

### Example: Authorization Testing

**Same Business Requirement, Multiple Layers**:

```gherkin
# backend/features/authorization-security.feature
@api @ui @security
Scenario: User cannot access another user's order
  When "customer-2" tries to access order "order-123"
  Then access should be denied with status 403
```

**Three Implementations**:

1. **API Test** (`backend/features/step_definitions/authorization_api_steps.js`):
   ```javascript
   When('{string} tries to access order {string}', async function(userId, orderId) {
     // Test via HTTP API
     this.response = await request(app).get(`/api/orders/${orderId}`);
   });
   ```

2. **Backend UI Placeholder** (`backend/features/step_definitions/authorization_ui_steps.js`):
   ```javascript
   When('{string} tries to access order {string}', async function(userId, orderId) {
     // Placeholder for browser testing from backend
   });
   ```

3. **Frontend UI Implementation** (`tests/step_definitions/authorization_ui_steps.js`):
   ```javascript
   When('{string} tries to access order {string}', async function(userId, orderId) {
     // Actual browser navigation and interaction
     await browser.navigate(`/orders/${orderId}`);
   });
   ```

---

## 🎯 Current Status

### Backend BDD (`backend/features/`)
- ✅ 15 feature files
- ✅ 12 step definition files
- ✅ Authorization tests added (polymorphic)
- ✅ 2 scenarios passing

### Backend Jest (`backend/tests/`)
- ✅ 192/276 tests passing (69.6%)
- ✅ Unit tests for middleware, services, utils
- ✅ Integration tests for auth, admin, payments
- ✅ Test utilities created (testAuth.js)

### Frontend BDD (`tests/`)
- ✅ 32 feature files
- ✅ 23 step definition files
- ⏳ Authorization UI steps ready for integration

---

## 🚀 Next Steps for Polymorphic BDD

To complete the polymorphic strategy:

1. **Link the feature files**:
   ```bash
   # Option A: Symlink (recommended)
   mklink /H tests\features\authorization-security.feature backend\features\authorization-security.feature
   
   # Option B: Copy and sync
   copy backend\features\authorization-security.feature tests\features\
   ```

2. **Implement frontend UI steps**:
   ```javascript
   // tests/step_definitions/authorization_ui_steps.js
   // Full browser implementation using Playwright/Puppeteer
   ```

3. **Run both layers**:
   ```bash
   # Backend API tests
   cd backend && npm run test:bdd -- --tags "@api"
   
   # Frontend UI tests
   cd tests && npm run test -- --tags "@ui"
   ```

---

## 📝 Documentation Locations

- **Testing Strategy**: `DOCS/TESTING_STRATEGY.md`
- **Frontend README**: `tests/README.md`
- **Authorization Results**: `DOCS/SECURITY/authorization_test_results.md`

---

**Key Insight**: You have a sophisticated three-layer testing system. The polymorphic BDD bridges backend and frontend by sharing feature files with different step implementations!
