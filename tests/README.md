# Matrix Delivery Tests

This directory contains automated tests for the Matrix Delivery application.

## Test Structure

> [!TIP]
> **New to E2E testing in this project?** Read the [E2E Testing Model Guide](./E2E_MODEL_GUIDE.md) to understand our Adapter pattern, locator strategy, and how we handle complex multi-user workflows.

```
tests/
├── features/                 # Cucumber feature files (BDD scenarios)
│   ├── cod-commission.feature   # COD commission & debt management
│   ├── translation.feature      # Translation testing scenarios
│   └── ...
├── step_definitions/         # Step definitions for Cucumber tests
│   ├── backend/              # 🆕 Backend integration test steps
│   │   └── cod_commission_steps.js  # Direct service calls, fast tests
│   ├── frontend/             # 🆕 Frontend UI test steps
│   │   └── cod_commission_steps.js  # Browser automation, UI tests
│   ├── translation_steps.js  # Translation-specific steps
│   └── ...
├── support/                  # Test support files
│   ├── hooks.js             # Test setup and teardown
│   └── browser_hooks.js     # 🆕 Playwright browser automation hooks
├── utils/                    # Test utilities
│   └── serverManager.js     # Server management for tests
├── test-translations.js      # Simple translation validation script
├── cucumber.js              # Cucumber configuration with profiles
└── package.json             # Test dependencies
```

## Running Tests

### Translation Tests

The translation tests verify that all UI text is properly translated across all supported languages.

#### Simple Translation Validation

```bash
cd tests
npm run test:translation
# or
node test-translations.js
```

This runs a fast validation script that checks:

- Translation keys exist for all languages
- Translations are not empty
- Key translation mappings are correct

#### Full E2E Translation Tests (Advanced)

The Cucumber-based E2E tests require a running application and browser automation.

**Note:** The Cucumber tests have configuration issues and may need additional setup. The simple translation validation script is recommended for most use cases.

## BDD Tests (Dual-Mode)

The BDD tests use **Cucumber** and support both backend integration tests and frontend UI tests using the **same feature files**.

### COD Commission Tests

#### Backend Tests (Fast Integration Tests)

Test balance service, commission deduction, and debt management directly:

```bash
cd tests
npx cucumber-js -p cod-backend
# or use alias:
npx cucumber-js -p cod-commission
```

**Features**:

- ✅ Direct service calls to `BalanceService`
- ✅ Database operations
- ✅ No browser required
- ✅ Fast execution (~3-4 seconds)
- **Status**: 28/31 scenarios passing

#### Frontend Tests (UI Tests)

Test the same scenarios through the browser UI:

```bash
cd tests
npx cucumber-js -p cod-frontend
```

**Features**:

- 🌐 Playwright browser automation
- 🎨 Tests dashboard UI, warnings, error boxes
- 🔍 Validates user-facing notifications
- 📊 Slower execution (~15-20 seconds)
- **Status**: Skeleton implemented, ready for full implementation

### Directory Structure

```
step_definitions/
├── backend/
│   └── cod_commission_steps.js   # Integration tests (no UI)
└── frontend/
    └── cod_commission_steps.js   # Browser automation tests
```

**Same feature file, different implementations!**

### Prerequisites for Frontend Tests

Install Playwright if not already installed:

```bash
npm install -D playwright
npx playwright install chromium
```

### Adding Test Data Attributes

For frontend tests to work, add `data-testid` attributes to UI components:

```jsx
// Balance Dashboard
<div data-testid="balance-dashboard">
  <span data-testid="cash-collected">{cashCollected}</span>
  <span data-testid="platform-commission">{commission}</span>
  <span data-testid="net-earnings">{netEarnings}</span>
  <span data-testid="current-balance">{balance}</span>
</div>

// Warning Box
<div data-testid="warning-box">
  <p data-testid="warning-message">{warning}</p>
</div>

// Error Box
<div data-testid="error-box">
  <p data-testid="error-message">{error}</p>
</div>
```

### Test Profiles

Available Cucumber profiles in `cucumber.js`:

- `cod-backend` - Backend integration tests only
- `cod-frontend` - Frontend UI tests only
- `cod-commission` - Alias for `cod-backend` (default)

## Supported Languages

The application supports translations in 12 languages:

- **English (en)** - Default language
- **العربية (ar)** - Arabic
- **Español (es)** - Spanish
- **Français (fr)** - French
- **中文 (zh)** - Chinese
- **Deutsch (de)** - German
- **Português (pt)** - Portuguese
- **Русский (ru)** - Russian
- **日本語 (ja)** - Japanese
- **Türkçe (tr)** - Turkish
- **اردو (ur)** - Urdu
- **हिंदी (hi)** - Hindi

## Test Results

The translation validation script provides:

- ✅ Pass/fail status for each translation key
- 📊 Summary statistics
- 🌍 Coverage across all languages

Example output:

```
🧪 Testing Translation Keys

🌍 Testing EN translations:
  ✅ Review submitted message: "Review submitted successfully!"
  ✅ Create order button: "Create New Order"
  ...

📊 Test Results:
  Total tests: 60
  Passed: 60
  Failed: 0
  Success rate: 100.0%

🎉 All translation tests passed!
```

## Adding New Translations

When adding new UI text:

1. Add the translation key to all language objects in `frontend/src/i18n/locales.js`
2. Use the translation function `t('key.path')` in React components
3. Run the translation tests to verify completeness
4. Test the UI in different languages to ensure proper display

## Troubleshooting

### Common Issues

1. **Missing translation keys**: Add the key to all language objects
2. **Empty translations**: Provide meaningful translations for all languages
3. **Test failures**: Check that the locales.js file is properly formatted

### Test Setup Issues

If the Cucumber tests fail to run:

- The simple `test-translations.js` script is recommended for validation
- Cucumber requires proper server setup and browser automation
- Check that all dependencies are installed: `npm install`

## CI/CD Integration

The translation validation script can be integrated into CI/CD pipelines:

```yaml
# In your CI configuration
- name: Validate Translations
  run: |
    cd tests
    npm run test:translation
```
