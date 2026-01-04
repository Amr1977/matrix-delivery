# Testing Strategy: Polymorphic BDD

**Last Updated**: December 31, 2025  
**For**: Future AI Agents & Development Team

---

## What is Polymorphic BDD?

**Polymorphic BDD** is our testing strategy where:
1. **One Gherkin feature file** defines business requirements
2. **Multiple step definition implementations** test at different layers
3. **Same scenarios** run against API (backend) and UI (frontend)

This ensures complete test coverage from business logic to user interface.

---

## Core Principle

```
ONE Business Requirement
  ↓
ONE Gherkin Scenario
  ↓
TWO Implementations:
  • API Step Definitions → Test backend
  • UI Step Definitions → Test browser
```

---

## Example

### Feature File (Shared)
```gherkin
# features/authorization-security.feature

@api @ui @security
Scenario: User cannot access another user's orders
  Given "customer-1" has an order "order-123"
  When "customer-2" tries to access order "order-123"
  Then access should be denied with status 403
```

### API Step Definitions
```javascript
// features/step_definitions/authorization_api_steps.js

When('{string} tries to access order {string}', async function(userId, orderId) {
  const token = this.authWorld.tokens[userId];
  this.authWorld.response = await request(app)
    .get(`/api/orders/${orderId}`)
    .set('Cookie', `token=${token}`);
});

Then('access should be denied with status {int}', function(statusCode) {
  expect(this.authWorld.response.status).to.equal(403);
});
```

### UI Step Definitions
```javascript
// features/step_definitions/authorization_ui_steps.js

When('{string} tries to access order {string}', async function(userId, orderId) {
  // Login as userId in browser
  await loginAs(userId);
  // Navigate to order page
  await this.page.goto(`/orders/${orderId}`);
});

Then('access should be denied with status {int}', async function(statusCode) {
  // Check for error message in UI
  const error = await this.page.$eval('.error', el => el.textContent);
  expect(error).to.include('Access Denied');
});
```

---

## Folder Structure

```
backend/
├── features/                          # Gherkin feature files
│   ├── authentication.feature         # Shared scenarios
│   ├── authorization-security.feature # Shared scenarios
│   ├── payment-methods.feature        # Shared scenarios
│   └── step_definitions/              # Implementations
│       ├── auth_steps.js              # Mixed API/UI steps
│       ├── authorization_api_steps.js # API-only steps
│       ├── authorization_ui_steps.js  # UI-only steps
│       └── payment_method_steps.ts    # Mixed steps
└── cucumber.js                        # Cucumber config
```

---

## Tagging Strategy

Use tags to control which tests run where:

| Tag | Purpose | Example |
|-----|---------|---------|
| `@api` | Run in API tests only | Backend integration tests |
| `@ui` | Run in UI tests only | Browser e2e tests |
| `@security` | Security-critical tests | Authorization scenarios |
| `@smoke` | Quick smoke tests | Core functionality |

### Running Tests

```bash
# Run only API tests
npm run test:bdd -- --tags "@api"

# Run only UI tests
npm run test:bdd -- --tags "@ui"

# Run security tests (both layers)
npm run test:bdd -- --tags "@security"

# Run specific scenario
npm run test:bdd -- features/authorization-security.feature:12
```

---

## Benefits

### ✅ Unified Business Requirements
- One source of truth for requirements
- Business stakeholders can read Gherkin
- No duplication between API and UI test specs

### ✅ Complete Coverage
- Backend logic tested via API
- User experience tested via UI
- Both layers verified for same requirement

### ✅ Maintainability
- Change requirement once
- Update relevant step definitions
- No scattered test files

### ✅ Flexibility
- Tag scenarios for different test suites
- Skip UI tests in CI if needed
- Run comprehensive tests before release

---

## Rules for AI Agents

When asked to create tests:

### ❌ DON'T Do This
```javascript
// Scattered Jest tests
describe('Authorization', () => {
  it('should deny access', () => { ... });
});

// Separate file for UI
describe('UI Authorization', () => {
  it('should show error', () => { ... });
});
```

### ✅ DO This Instead
```gherkin
# One feature file
@api @ui
Scenario: User denied access
  When user tries to access protected resource
  Then access should be denied
```

```javascript
// authorization_api_steps.js - API implementation
// authorization_ui_steps.js - UI implementation
```

---

## Step Definition Guidelines

### 1. Use Descriptive Step Patterns
```javascript
// ✅ GOOD - Generic, reusable
When('{string} tries to access {string}', ...)

// ❌ BAD - Too specific
When('customer tries to access order 123', ...)
```

### 2. Share Common Steps
```javascript
// Reuse these across features:
Then('access should be denied with status {int}', ...)
Then('I should see {string}', ...)
Given('test users exist:', ...)
```

### 3. Keep World Context Clean
```javascript
class AuthorizationWorld {
  constructor() {
    this.response = null;   // API response
    this.testUsers = {};    // Created users
    this.tokens = {};       // User tokens
  }
}
```

### 4. Clean Up After Tests
```javascript
After({ tags: '@api' }, async function() {
  // Delete test data
  for (const orderId of Object.keys(this.authWorld.testOrders)) {
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
  }
});
```

---

## When to Create New Step Definitions

### Create new file when:
- Testing a completely new domain (e.g., `payment_steps.js`)
- Need separate API vs UI implementations
- Steps are numerous and domain-specific

### Extend existing file when:
- Adding a few reusable steps
- Steps fit existing domain
- Can reuse existing world context

---

## Integration with CI/CD

```yaml
# .github/workflows/test.yml

# Quick CI - API only (fast)
test-api:
  run: npm run test:bdd -- --tags "@api and not @slow"

# Full CI - Both layers (before merge)
test-full:
  run: npm run test:bdd -- --tags "@api or @ui"

# Release - All tests including slow
test-release:
  run: npm run test:bdd
```

---

## Migration from Existing Tests

If you find scattered Jest/Mocha tests:

1. **Create Gherkin scenario** from test description
2. **Move test logic** to API step definitions
3. **Add UI step definitions** (placeholder initially)
4. **Tag appropriately** (@api, @ui)
5. **Delete old test file**
6. **Update documentation**

---

## Current Test Files

Existing polymorphic BDD features:
- ✅ `authentication.feature` - Login, registration, password reset
- ✅ `authorization-security.feature` - Access control, privilege escalation
- ✅ `payment-methods.feature` - Payment processing
- ✅ `admin-dashboard.feature` - Admin functions
- ✅ `crypto-payments.feature` - Blockchain payments

---

## Quick Reference

```bash
# Create new feature
touch backend/features/my-feature.feature

# Create API steps
touch backend/features/step_definitions/my_feature_api_steps.js

# Create UI steps
touch backend/features/step_definitions/my_feature_ui_steps.js

# Run new tests
npm run test:bdd -- features/my-feature.feature
```

---

## Questions for AI Agents

Before creating tests, ask yourself:

1. **Does this test belong in an existing feature file?**
   - If yes, extend it
   - If no, create new feature file

2. **Does this need both API and UI testing?**
   - Tag with `@api @ui` if yes
   - Tag with one if specialized

3. **Can I reuse existing step definitions?**
   - Check `step_definitions/` folder first
   - Extend if steps are too specific

4. **Is this a security-critical scenario?**
   - Add `@security` tag
   - Ensure both API and UI coverage

---

**Remember**: One business requirement = One Gherkin scenario = Multiple layer implementations

This is not optional - it's the established testing strategy. Maintain it!
