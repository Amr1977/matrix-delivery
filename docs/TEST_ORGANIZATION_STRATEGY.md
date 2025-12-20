# Test Organization Strategy

## Test Categories by Execution Speed

### 🚀 **Fast Tests (Parallel Execution)**
Can run concurrently with `--maxWorkers=50%` (uses half of CPU cores)

#### Unit Tests (`tests/unit/`)
- **Characteristics**: Fully mocked, no I/O, isolated
- **Speed**: <100ms per test
- **Parallelization**: ✅ Safe
- **Current**: 10 tests
- **Location**: `tests/unit/database/startup.test.js`

#### Integration Tests - API Endpoints (`tests/integration/auth/`, `tests/integration/health/`)
- **Characteristics**: Mock database, use supertest, isolated
- **Speed**: <500ms per test
- **Parallelization**: ✅ Safe (mocked DB)
- **Current**: 49 tests (37 auth + 12 health)
- **Locations**:
  - `tests/integration/auth/login.test.js`
  - `tests/integration/auth/register.test.js`
  - `tests/integration/health/health.test.js`

**Total Fast Tests**: 59 tests (~30 seconds with parallel execution)

---

### 🐢 **Slow Tests (Serial Execution)**
Must run sequentially with `--runInBand --maxWorkers=1`

#### Integration Tests - Real Database (`tests/integration/database/`)
- **Characteristics**: Hit real test database, shared state, schema modifications
- **Speed**: 1-5 seconds per test
- **Parallelization**: ❌ Unsafe (shared database)
- **Current**: 11 tests
- **Location**: `tests/integration/database/startup.integration.test.js`
- **Why Serial**: 
  - Drops/creates tables
  - Modifies shared schema
  - Closes connection pool

**Total Slow Tests**: 11 tests (~15 seconds with serial execution)

---

## NPM Scripts

### Development (Fast Feedback)
```bash
# Default: Run fast tests only (unit + mocked integration)
npm test
# Runs: 59 tests in ~30 seconds (parallel)

# Watch mode for TDD
npm run test:watch
# Runs: Fast tests only, re-runs on file changes
```

### Specific Test Suites
```bash
# Unit tests only (fastest)
npm run test:unit
# Runs: 10 tests in ~5 seconds

# Fast integration tests (auth + health)
npm run test:integration:fast
# Runs: 49 tests in ~25 seconds (parallel)

# Slow database integration tests
npm run test:integration:db
# Runs: 11 tests in ~15 seconds (serial)
```

### CI/CD (Complete Coverage)
```bash
# All tests (optimized order)
npm run test:all
# Runs: Unit → Fast Integration → DB Integration
# Total: 70 tests in ~50 seconds

# Full coverage report
npm run test:coverage
# Runs: All tests with coverage report
```

---

## Performance Targets

| Test Type | Count | Time | Workers | Target Time |
|-----------|-------|------|---------|-------------|
| Unit | 10 | ~5s | 50% | <10s |
| Integration (Fast) | 49 | ~25s | 50% | <30s |
| Integration (DB) | 11 | ~15s | 1 | <20s |
| **Total** | **70** | **~45s** | Mixed | **<60s** |

---

## Adding New Tests - Decision Tree

```
┌─────────────────────────────────┐
│   Does test hit real database?  │
└────────┬────────────────────────┘
         │
    ┌────▼────┐
    │   NO    │
    └────┬────┘
         │
    ┌────▼──────────────────────────┐
    │ Does test modify shared state? │
    └────┬───────────────────────────┘
         │
    ┌────▼────┐
    │   NO    │
    └────┬────┘
         │
    ┌────▼────────────────────────┐
    │ ✅ FAST TEST (Parallel)     │
    │ Location: tests/unit/       │
    │ or tests/integration/       │
    │ (with mocked DB)            │
    └─────────────────────────────┘

┌─────────────────────────────────┐
│   Does test hit real database?  │
└────────┬────────────────────────┘
         │
    ┌────▼────┐
    │   YES   │
    └────┬────┘
         │
    ┌────▼────────────────────────┐
    │ 🐢 SLOW TEST (Serial)       │
    │ Location:                   │
    │ tests/integration/database/ │
    │                             │
    │ Must use --runInBand        │
    └─────────────────────────────┘
```

---

## Guidelines for New Tests

### ✅ **Fast Test Checklist**
- [ ] Uses mocked database (`jest.mock`)
- [ ] No shared state between tests
- [ ] No file system modifications
- [ ] No external API calls
- [ ] Execution time <500ms
- [ ] Can run in parallel safely

**→ Place in**: `tests/unit/` or `tests/integration/(auth|health|orders)/`

### 🐢 **Slow Test Checklist**
- [ ] Hits real test database
- [ ] Modifies database schema
- [ ] Requires transaction isolation
- [ ] Execution time >500ms
- [ ] Cannot run in parallel

**→ Place in**: `tests/integration/database/`

---

## Future Optimization Strategies

### 1. **Transaction-Based Isolation** (When we have many DB tests)
```javascript
// Wrap each test in transaction
beforeEach(async () => {
  client = await pool.connect();
  await client.query('BEGIN');
});

afterEach(async () => {
  await client.query('ROLLBACK');
  client.release();
});
```
**Benefit**: Can run DB tests in parallel again

### 2. **Test Database per Worker**
```javascript
// jest.config.js
const workerId = process.env.JEST_WORKER_ID || '1';
process.env.DB_NAME_TEST = `matrix_delivery_test_${workerId}`;
```
**Benefit**: True parallel DB tests

### 3. **Test Sharding for CI/CD**
```bash
# Split tests across multiple CI jobs
npm test -- --shard=1/4  # Job 1
npm test -- --shard=2/4  # Job 2
npm test -- --shard=3/4  # Job 3
npm test -- --shard=4/4  # Job 4
```
**Benefit**: Faster CI/CD pipeline

---

## Current Test Distribution

```
tests/
├── unit/                          [FAST - Parallel]
│   └── database/
│       └── startup.test.js        (10 tests, ~5s)
│
├── integration/
│   ├── auth/                      [FAST - Parallel]
│   │   ├── login.test.js          (15 tests, ~12s)
│   │   └── register.test.js       (22 tests, ~13s)
│   │
│   ├── health/                    [FAST - Parallel]
│   │   └── health.test.js         (12 tests, ~8s)
│   │
│   └── database/                  [SLOW - Serial]
│       └── startup.integration.test.js  (11 tests, ~15s)
│
└── e2e/                           [FUTURE - Serial]
    └── (not yet implemented)
```

---

## Monitoring Test Performance

### Track Slow Tests
```bash
# Find tests taking >1 second
npm test -- --verbose 2>&1 | grep -E '\([0-9]{4,} ms\)'
```

### Coverage by Speed
- **Fast Tests**: 59/70 (84%) - Optimized for quick feedback
- **Slow Tests**: 11/70 (16%) - Necessary for real DB validation

**Goal**: Keep slow tests <20% of total test suite

---

## Summary

✅ **Fast Tests (59)**: Run by default, parallel, <30s  
🐢 **Slow Tests (11)**: Run separately, serial, <20s  
🎯 **Total Time**: ~50s for all 70 tests  
📈 **Scalability**: Can add 100+ fast tests without major slowdown
