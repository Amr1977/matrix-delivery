# 🧪 Complete Test Structure Overview

**Project**: Matrix Delivery  
**Standard**: Polymorphic BDD (Critical Rule)

---

## 🏗️ The 3 Pillars of Testing

### 1. `tests/features/shared/` (NEW STANDARD - Polymorphic BDD)

**Purpose**: Single source of truth for business logic and flows.

- **Feature Files**: Located here. Environment-agnostic.
- **Execution**: Can be run against **API** (fast) or **E2E** (real browser).
- **Structure**:
  ```
  tests/features/shared/
    └── my_feature.feature      <-- The standard
  tests/step_definitions/
    ├── api/                    <-- HTTP implementation (backend logic)
    └── e2e/                    <-- Playwright implementation (UI logic)
  ```

### 2. `tests/features/frontend/` (Legacy E2E)

**Purpose**: Browser-only tests specific to UI interactions (e.g. map clicks, complex animations).

- **Status**: Maintain, but move logic to `shared/` if it involves business rules.
- **Execution**: Runs in browser via Puppeteer/Playwright.

### 3. `backend/tests/` (Legacy Unit/Integration)

**Purpose**: Low-level code verification using Jest.

- **Structure**:
  - `backend/tests/unit/`: Logic isolation (e.g. utility functions)
  - `backend/tests/integration/`: API endpoint tests (non-BDD)

---

## 🗺️ Extended Directory Map

I have verified all nested levels. Here is the complete map:

### Special Purpose Tests

- **`tests/blockchain/`**: Smart contract tests (`contracts/fixtures`)
- **`tests/features/core/`**: Legacy polymorphic prototype (contains `order_lifecycle.feature`)
- **`tests/steps/core/`**: Adapter logic for core features (`api`, `e2e` subfolders)
- **`tests/unit/`**: Frontend unit tests (Jest)
- **`tests/integration/`**: Frontend integration tests

### Ignored / Artifacts

- `tests/tests/`: Misplaced reports folder (safe to ignore/delete)

---

## 🖥️ Test Dashboard

**Location**: `test-dashboard/` (running on port 4002)
**Config**: `test-suites.json` (Project Root)

The dashboard allows running test suites via a web UI. It executes `cucumber-js` processes.

- **Critical**: When moving features to `shared/`, you MUST update `test-suites.json` to point to the new path.

---

## 🚀 How to Run Tests (Command Line)

### Polymorphic BDD (The New Way)

```bash
# Run API layer (Fast)
npx cucumber-js tests/features/shared/my_feature.feature -p backend-api

# Run E2E layer (Browser)
npx cucumber-js tests/features/shared/my_feature.feature -p frontend-ui
```

### Full Test Suite

```bash
npm run test:all
```
