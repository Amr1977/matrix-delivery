# Testing Documentation

> All testing-related documentation for Matrix Delivery

## 📁 Structure

```
TESTING/
├── GUIDES/           # How-to guides for running tests
├── ANALYSIS/         # Test analysis and strategy docs
├── ARCHIVED/         # Outdated documentation
└── README.md         # This file
```

---

## 🚀 Quick Start

### Run Unit Tests
```bash
npm run test:backend    # 205 unit tests
```

### Run API Tests
```bash
npm run test:api       # Map location API tests
```

### Run BDD Tests
```bash
npm run test:e2e       # Full E2E with Cucumber
```

### Test Dashboard (Visual)
```bash
cd test-dashboard && npm start           # Backend: :4002
cd test-dashboard/client && npm run dev  # Frontend: :3002
```

---

## 📋 Test Suites (test-suites.json)

| Suite | Description | Features |
|-------|-------------|----------|
| 🚑 Critical Path | Essential flows | 4 |
| 🔐 Authentication | Login, security | 5 |
| 💰 Payments | Wallet, commissions | 17 |
| 🔒 Escrow & Takaful | Escrow, insurance | 5 |
| 📦 Orders | Order lifecycle | 5 |
| 🗺️ Maps & Drivers | Location, tracking | 10 |
| 🛡️ Admin | User management | 7 |
| ⭐ Reviews | Ratings system | 4 |
| 🔧 API | API-level tests | 1 |

**Total: 57 BDD feature files**

---

## 📄 Documentation Files

### Guides
- [TESTING_GUIDE.md](GUIDES/TESTING_GUIDE.md) - Complete testing guide
- [MOBILE_TESTING.md](GUIDES/MOBILE_TESTING.md) - Mobile testing setup
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Overall strategy

### Analysis
- [TEST_ANALYSIS.md](ANALYSIS/TEST_ANALYSIS.md) - Test coverage analysis
- [TEST_ORGANIZATION_STRATEGY.md](ANALYSIS/TEST_ORGANIZATION_STRATEGY.md) - Organization plan

### Infrastructure
- [TESTNET_DEPLOYMENT_GUIDE.md](TESTNET_DEPLOYMENT_GUIDE.md) - Test environment setup
- [WALLET_CONNECTION_TEST.md](WALLET_CONNECTION_TEST.md) - Crypto wallet testing

---

## 🔗 Related

- [Test Dashboard](/test-dashboard) - Visual test runner
- [test-suites.json](/test-suites.json) - BDD suite configuration
- [cucumber.config.js](/tests/cucumber.config.js) - Cucumber settings
