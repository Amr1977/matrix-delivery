# Complete Unified Test Structure

**All tests now in `tests/` folder:**

```
tests/
├── features/                    # BDD Gherkin features
│   ├── backend/ (15)           # API features
│   ├── frontend/ (31)          # UI features  
│   └── core/ (1)               # Core flows
│
├── step_definitions/            # BDD step implementations
│   ├── api/ (33)               # Backend API steps
│   └── ui/ (2)                 # Frontend UI steps
│
├── unit/                        # Jest unit tests (12 dirs)
├── integration/                 # Jest integration (19 files)
├── blockchain/                  # Smart contract tests
│   └── contracts/
│
├── support/                     # Test helpers
├── utils/                       # Test utilities
└── reports/                     # Test reports
```

**Test Types Supported:**
- ✅ BDD (Cucumber) - API & UI
- ✅ Unit (Jest)
- ✅ Integration (Jest)
- ✅ Blockchain (Hardhat)
- 🔜 Performance
- 🔜 Load
- 🔜 E2E

**Run Commands:**
```bash
# BDD tests
npx cucumber-js --profile backend-api
npx cucumber-js --profile frontend-ui

# Jest tests
jest tests/unit
jest tests/integration
jest tests/blockchain
```

**Old folders (can be removed):**
- `backend/features/` → moved
- `backend/tests/` → moved
- `backend/test/` → moved
