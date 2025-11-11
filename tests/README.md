# Matrix Delivery Tests

This directory contains automated tests for the Matrix Delivery application.

## Test Structure

```
tests/
├── features/                 # Cucumber feature files
│   ├── translation.feature   # Translation testing scenarios
│   └── ...
├── step_definitions/         # Step definitions for Cucumber tests
│   ├── translation_steps.js  # Translation-specific steps
│   └── ...
├── support/                  # Test support files
│   └── hooks.js             # Test setup and teardown
├── utils/                    # Test utilities
│   └── serverManager.js     # Server management for tests
├── test-translations.js      # Simple translation validation script
├── cucumber.js              # Cucumber configuration
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
