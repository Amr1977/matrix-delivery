# Running Tests

## Backend Tests

### Prerequisites

```bash
cd backend
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Logging API routes tests
npm test tests/routes/logs.test.js

# LoggingService unit tests
npm test tests/services/loggingService.test.js
```

### Test Coverage

```bash
npm run test:coverage
```

---

## Frontend Tests

### Prerequisites

```bash
cd frontend
npm install
```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Logger tests
npm test src/__tests__/logger.test.js

# LogBatcher tests
npm test src/__tests__/logBatcher.test.js
```

### Test Coverage

```bash
npm test -- --coverage
```

---

## BDD Tests (Behavior-Driven Development)

### Overview

BDD tests use **Cucumber** with **Gherkin** syntax to define test scenarios in plain English. The tests support **dual-mode execution**:
- **Backend mode**: Fast integration tests (direct service calls)
- **Frontend mode**: UI tests (browser automation with Playwright)

### COD Commission Tests

#### Run Backend Tests (Integration)
```bash
cd tests
npx cucumber-js -p cod-backend
# or use default alias:
npx cucumber-js -p cod-commission
```

**What it tests**:
- Direct calls to `BalanceService`
- Commission deduction logic
- Debt threshold enforcement  
- Balance warning notifications
- Transaction history

**Performance**: ~3-4 seconds  
**Status**: 28/31 scenarios passing

#### Run Frontend Tests (UI)
```bash
cd tests
npx cucumber-js -p cod-frontend
```

**What it tests**:
- Dashboard UI rendering
- Warning/error box display
- Button visibility
- User-facing notifications
- Balance display accuracy

**Performance**: ~15-20 seconds  
**Status**: Skeleton implemented (ready for full implementation)

### Directory Structure

```
tests/
├── features/
│   └── cod-commission.feature    # Shared scenarios
├── step_definitions/
│   ├── backend/
│   │   └── cod_commission_steps.js   # Integration tests
│   └── frontend/
│       └── cod_commission_steps.js   # UI tests
└── support/
    └── browser_hooks.js          # Playwright setup
```

### Prerequisites

**For Backend Tests**:
- PostgreSQL running
- Test database created (`matrix_delivery_test`)
- Backend dependencies installed

**For Frontend Tests**:
```bash
npm install -D playwright
npx playwright install chromium
```

### Configuration

Profiles are defined in `tests/cucumber.js`:

```javascript
'cod-backend': {
  require: ['step_definitions/backend/cod_commission_steps.js']
},
'cod-frontend': {
  require: [
    'step_definitions/frontend/cod_commission_steps.js',
    'support/browser_hooks.js'
  ]
}
```

### Adding UI Test Support

To enable frontend tests, add `data-testid` attributes to React components:

```jsx
// Balance Dashboard
<div data-testid="balance-dashboard">
  <span data-testid="cash-collected">{cashCollected}</span>
  <span data-testid="current-balance">{balance}</span>
</div>

// Warnings & Errors
<div data-testid="warning-box">
  <p data-testid="warning-message">{warningMessage}</p>
</div>
```

---

## Test Structure

### Backend Tests

#### `tests/routes/logs.test.js`
Tests for logging API endpoints:
- ✅ POST /api/logs/frontend (single and batch)
- ✅ GET /api/logs (with filtering, pagination, search)
- ✅ GET /api/logs/stats
- ✅ GET /api/logs/:id
- ✅ DELETE /api/logs/cleanup
- ✅ Authentication and authorization

#### `tests/services/loggingService.test.js`
Tests for LoggingService:
- ✅ createLog()
- ✅ getLogs() with various filters
- ✅ getLogById()
- ✅ getLogStats()
- ✅ cleanupOldLogs()
- ✅ logBackendEvent()
- ✅ logFrontendEvent()

### Frontend Tests

#### `src/__tests__/logger.test.js`
Tests for frontend logger:
- ✅ Log levels (error, warn, info, debug)
- ✅ Specialized methods (api, user, performance)
- ✅ Console override
- ✅ Global error handlers
- ✅ Log formatting

#### `src/__tests__/logBatcher.test.js`
Tests for LogBatcher:
- ✅ Log batching
- ✅ Automatic flushing
- ✅ Retry logic with exponential backoff
- ✅ Offline support
- ✅ localStorage persistence
- ✅ sendBeacon for page unload

---

## Expected Test Results

All tests should pass with the following coverage:

### Backend
- **Routes**: ~95% coverage
- **Services**: ~90% coverage

### Frontend
- **Logger**: ~85% coverage
- **LogBatcher**: ~90% coverage

---

## Troubleshooting

### Database Connection Issues

If tests fail with database connection errors:

1. Ensure PostgreSQL is running
2. Check database credentials in `.env`
3. Create test database:
   ```sql
   CREATE DATABASE matrix_delivery_test;
   ```

### Test Timeout Issues

If tests timeout:

1. Increase Jest timeout in `jest.config.js`:
   ```javascript
   testTimeout: 10000
   ```

2. Check if backend server is running (it shouldn't be for tests)

### Mock Issues

If frontend tests fail with mock errors:

1. Clear Jest cache:
   ```bash
   npm test -- --clearCache
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   ```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd backend && npm install
      - run: cd backend && npm test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
```

---

## Manual Testing

### Test Logging System End-to-End

1. **Start servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

2. **Trigger frontend errors**:
   - Open browser console
   - Run: `throw new Error("Test error")`
   - Run: `console.error("Test console error")`

3. **Check admin panel**:
   - Login as admin (see ADMIN_CREDENTIALS.md)
   - Navigate to Admin Panel → Logs tab
   - Verify logs appear with correct details

4. **Test filtering**:
   - Filter by level: "Error"
   - Filter by source: "Frontend"
   - Search: "Test"
   - Verify results are correct

5. **Test export**:
   - Click "Export JSON"
   - Click "Export CSV"
   - Verify files download correctly

---

## Performance Testing

### Load Testing Logs API

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test POST /api/logs/frontend
ab -n 1000 -c 10 -p log.json -T application/json \
   -H "Authorization: Bearer YOUR_TOKEN" \
   http://localhost:5000/api/logs/frontend

# Test GET /api/logs
ab -n 1000 -c 10 \
   -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
   http://localhost:5000/api/logs
```

Expected results:
- POST: ~500 requests/second
- GET: ~1000 requests/second

---

## Next Steps

1. ✅ Run all tests to ensure they pass
2. ✅ Review test coverage reports
3. ✅ Add tests to CI/CD pipeline
4. ✅ Set up automated testing on pull requests
5. ✅ Monitor test performance over time
