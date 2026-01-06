# 🧪 Matrix Delivery - Comprehensive Testing Documentation

## Overview

This document outlines the comprehensive testing strategy implemented to ensure code quality, prevent regressions, and enforce best practices for the Matrix Delivery application.

## Testing Architecture

### Test Types

1. **API Tests** (`tests/map-location-api-tests.js`)
   - Backend API endpoint testing using Jest and Supertest
   - Tests reverse geocoding, route calculation, and location management
   - Coverage: 100+ test cases for map location picker functionality

2. **E2E Tests** (`tests/features/map_location_picker.feature`)
   - End-to-end user journey testing using Cucumber and Puppeteer
   - Covers complete user workflows from UI interaction to backend response
   - Includes accessibility, performance, and cross-browser testing scenarios

3. **Smoke Tests**
   - Basic health checks for critical API endpoints
   - Code linting and dependency auditing
   - Ensures basic functionality works after deployment

4. **Performance Tests**
   - Build time validation
   - Basic performance benchmarks
   - Can be extended with full performance testing suites

5. **Security Tests**
   - Dependency vulnerability scanning
   - Basic security checks
   - Foundation for more comprehensive security testing

### Test Coverage Requirements

- **Minimum Pass Rate**: 85% for all test suites combined
- **Smoke Tests**: Must pass 100% for deployment
- **Critical Path**: Map location picker functionality must have 95% API test coverage

## Quality Gates

### Pre-commit Hooks

**`pre-commit`** (`.git/hooks/pre-commit`)

- Triggers comprehensive test suite before every commit
- **Blocks commits** if tests fail or coverage is below threshold
- Ensures no broken code enters the repository

**`pre-push`** (`.git/hooks/pre-push`)

- Triggers comprehensive testing before pushes to master/main/production branches
- **Blocks direct master pushes** without passing tests
- Enforces quality standards for production deployments

### CI/CD Integration

**GitHub Actions** (`.github/workflows/deploy-backend.yml`)

- Runs full test suite on every push to master/main
- **Blocks deployment** if tests don't meet minimum pass rate (85%)
- Uploads test results as artifacts for review
- Ensures deployment quality

## Running Tests

### Prerequisites

```bash
# Install dependencies
npm ci

# Setup test database (PostgreSQL)
createdb matrix_delivery_test
# Or use Docker: docker run -d --name postgres-test -e POSTGRES_PASSWORD=test_pass postgres:14
```

### Test Commands

```bash
# Run all tests (comprehensive suite)
npm test

# Run specific test suites
npm run test:api          # API tests only
npm run test:e2e          # E2E tests only
npm run test:smoke        # Smoke tests only
npm run test:map          # Map location picker tests only

# Development testing
npm run test:debug        # Run E2E tests in headed mode
npm run test:headed       # Run E2E tests with browser visible
```

### Test Configuration

```bash
# Environment variables for testing
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TEST=matrix_delivery_test
DB_USER=postgres
DB_PASSWORD=test_password
NODE_ENV=test
```

## Test Structure

### API Tests (`tests/map-location-api-tests.js`)

```javascript
describe("Map Location Picker API Tests", () => {
  // 20+ test suites covering:
  // - Reverse geocoding for various locations
  // - Google Maps URL parsing
  // - Route calculation between coordinates
  // - Driver preferences management
  // - Enhanced order creation with location data
  // - Error handling and edge cases
});
```

### E2E Tests (`tests/features/map_location_picker.feature`)

`````gherkin
Feature: Map Location Picker
  @smoke @map-location-picker
  Scenario: Successfully reverse geocode coordinates on map click
    Given I am logged in as a customer
    When I click on a location on the map at coordinates (30.0131, 31.2089)
    Then the reverse geocoding API should be called
    # 15+ comprehensive scenarios covering:
    # - Smoke tests for core functionality
    # - Regression tests for existing features
    # - Edge cases and error conditions
    # - Performance and accessibility
    # - Mobile and localization testing

3. **Core Order Lifecycle** (`tests/features/core/order_lifecycle.feature`)
   - Complete verification of the delivery flow (Create -> Bid -> Accept -> Deliver)
   - Verifies Wallet/Escrow balance updates (Platform + Takaful commission)
   - Validates status transitions (`DELIVERED_PENDING` -> `DELIVERED`)
   - **Command**: `npm run test:bdd:e2e -- --tags "@order_lifecycle"````

### Test Runner (`scripts/run-tests.js`)

A comprehensive test orchestrator that:
- Sets up test environments automatically
- Runs tests in optimal order (API → E2E → Smoke)
- Generates detailed reports with pass/fail analysis
- Enforces minimum quality thresholds
- Provides colored output and clear error messages

## Quality Assurance Process

### Development Workflow

1. **Local Development**
   ```bash
   # Run tests during development
   npm run test:api     # Quick API feedback
   npm run test:smoke   # Basic checks
`````

2. **Before Commit**

   ```bash
   # Pre-commit hook runs automatically
   npm run test:pre-commit  # Comprehensive validation
   ```

3. **Before Push/Merge**
   ```bash
   # Pre-push hook (for master branches)
   npm run test:all  # Full validation
   ```

### Production Deployment

1. **CI/CD Pipeline**
   - GitHub Actions runs full test suite
   - Database migration validation
   - Performance and security checks

2. **Quality Gates**
   - 85% minimum pass rate required for deployment
   - Smoke tests must pass 100%
   - Vulnerability scan must pass

3. **Rollback Protection**
   - Failed deployment triggers automatic rollback
   - Test results archived for post-mortem analysis

## Test Data Management

### Test Database

- **Schema**: Mirrors production database with test data
- **Isolation**: Separate database (`matrix_delivery_test`)
- **Cleanup**: Automatic teardown after test runs
- **Seeding**: Realistic test data for comprehensive coverage

### Mock Services

- **External APIs**: Nominatim geocoding service (mocked for offline testing)
- **Browser Testing**: Puppeteer handles browser automation
- **Network**: Request interception for controlled API responses

## Performance Testing

### Build Performance

```bash
# Tests build times remain within acceptable limits
npm run build  # Must complete in < 5 minutes
```

### API Performance

```javascript
// Response times monitored in API tests
expect(responseTime).toBeLessThan(2000); // 2 second limit
```

### Memory Usage

- Automated monitoring for memory leaks
- Baseline performance comparisons

## Security Testing

### Vulnerability Scanning

```bash
npm audit --audit-level high  # High severity only
```

### Code Security

- ESLint security plugins
- Dependency vulnerability monitoring
- Input validation testing

## Accessibility Testing

### Automated Accessibility

```gherkin
Then all interactive elements should have proper ARIA labels
And keyboard navigation should be supported
And color contrast should meet accessibility standards
```

### Manual Accessibility Review

- Screen reader compatibility
- Keyboard-only navigation
- Mobile accessibility check

## Reporting and Monitoring

### Test Reports

- **Console Output**: Real-time colored output during test runs
- **File Reports**: `test-report-YYYY-MM-DD.txt` detailed reports
- **CI Artifacts**: Uploaded test results and coverage reports

### Metrics Tracked

- Test pass rates
- Build times
- Deployment success rates
- Most failing tests

### Alerting

- Slack notifications for test failures
- Email alerts for deployment blocks
- Dashboard monitoring for test trends

## Best Practices

### Writing Tests

1. **Test Isolation**: Each test should be independent
2. **Realistic Data**: Use realistic test data that matches production
3. **Error Scenarios**: Test both success and failure paths
4. **Performance Baseline**: Include performance assertions
5. **Accessibility**: Test for accessibility compliance

### Test Maintenance

1. **Regular Updates**: Update tests when features change
2. **Flaky Test Detection**: Monitor and fix flaky tests
3. **Test Coverage**: Aim for >95% coverage on critical paths
4. **Documentation**: Keep test documentation current

### Test Environment

1. **Consistent Setup**: Use Docker for consistent test environments
2. **Parallel Execution**: Run tests in parallel where possible
3. **Resource Management**: Clean up resources after tests
4. **Database State**: Ensure clean database state between tests

## Troubleshooting

### Common Issues

**Tests Timeout**

```bash
# Increase timeout for slow tests
jest.setTimeout(30000);
```

**Database Connection Issues**

```bash
# Check database is running
pg_isready -h localhost -p 5432

# Reset test database
npm run pretest
```

**Flaky Tests**

- Use `waitFor` functions for async operations
- Add retry logic for network-dependent tests
- Use proper selectors for UI elements

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Single test debugging
jest --testNamePattern="specific test name" --verbose
```

## Conclusion

This comprehensive testing strategy ensures:

- **Reliable deployments** with enforced quality gates
- **No direct master pushes** without proper testing
- **Coverage of critical paths** including the new map location picker
- **Automation of repetitive testing** while allowing manual testing when needed
- **Performance and security validation** throughout the development lifecycle

The testing infrastructure prevents the "tragedy of 0 tests before commit" by making testing a required part of the development workflow rather than an optional step.
