# Matrix Delivery - Comprehensive Test Suite

This repository contains a comprehensive test suite for the Matrix Delivery P2P marketplace application using Cucumber.js, Playwright, and Chai.

## Features Tested

### ✅ Authentication System
- User registration (Customer & Driver roles)
- User login with validation
- Duplicate email prevention
- Form validation and error handling
- Logout functionality
- Role-based dashboard access

### ✅ Order Management
- Create delivery orders
- View order details and status
- Edit orders (if supported)
- Delete orders
- Order history and filtering
- Location and pricing management

### ✅ Driver Bidding System
- View available delivery orders
- Place competitive bids
- Customer bid acceptance
- Order assignment and status updates
- Delivery completion and driver crediting
- Multiple driver bidding scenarios
- Bid withdrawal functionality

## Tech Stack

- **Framework**: Cucumber.js with BDD
- **Browser Automation**: Playwright (Chrome/Chromium)
- **Assertions**: Chai
- **API Testing**: Native fetch (Node.js)
- **OS Compatibility**: Windows 10+ (with Windows-specific process management)

## Project Structure

```
tests/
├── features/                          # Gherkin feature files
│   ├── authentication.feature         # Auth-related scenarios
│   ├── order_management.feature       # Order CRUD operations
│   └── driver_bidding.feature         # Bidding and delivery flow
├── step_definitions/                  # Step implementation files
│   ├── authentication_steps.js        # Auth step definitions
│   ├── order_steps.js                 # Order step definitions
│   └── bidding_steps.js               # Bidding step definitions
├── support/                           # Test support files
│   ├── hooks.js                       # Before/After hooks & setup
│   └── world.js                       # (Not used - using hooks approach)
└── utils/                             # Test utilities
    ├── cleanup.js                     # Pre-test cleanup
    ├── serverManager.js               # Backend/frontend server management
    └── generate-report.js             # Test report generation
```

## Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Verify Backend & Frontend**:
   Ensure backend and frontend applications are properly configured and can start:
   - Backend: Node.js application on port 5000
   - Frontend: React application on port 3000

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Feature Tests
```bash
# Authentication tests only
npm run test:auth

# Order management tests only
npm run test:orders

# Driver bidding tests only
npm run test:bidding
```

### Run Smoke Tests Only
```bash
npm run test:smoke
```

### Debug Mode (Visible browser, slow motion)
```bash
npm run test:debug
```

### Headed Mode (Browser visible)
```bash
npm run test:headed
```

## Test Configuration

### Browser Options
- **Headless**: Set `HEADLESS=false` environment variable for visible browser
- **Slow Motion**: Set `SLOWMO=100` (milliseconds) for debugging
- **Videos**: Set `VIDEO=true` to record test session videos

### Custom Base URLs
```bash
# Custom frontend URL
set BASE_URL=http://localhost:3001

# Custom API URL
set API_URL=http://localhost:5001/api
```

## Generated Reports

Tests generate multiple report formats:

- **HTML Report**: `reports/cucumber-report.html` - Interactive web report
- **JSON Report**: `reports/cucumber-report.json` - Machine-readable data
- **Console Output**: Real-time progress with scenario status
- **Screenshots**: Failed scenario screenshots in `reports/screenshots/`
- **Videos**: Optional video recordings in `reports/videos/`

View the HTML report:
```bash
npm run test:report
# Then open reports/cucumber-report.html in your browser
```

## Test Data Management

### Isolated Test Accounts
- All tests create unique test accounts via API calls
- No shared test data between scenarios
- Automatic cleanup between test runs

### Database Cleanup
- Pre-test cleanup removes all database files
- Fresh database state for each test run
- No persistent data between test sessions

## Windows Compatibility

This test suite is specifically designed for Windows 10:

- Uses `taskkill /f /t` for process termination
- Emulator-based command execution
- PowerShell-compatible path handling
- Windows-style environment variables

## Troubleshooting

### Common Issues

1. **Server Won't Start**
   - Ensure ports 3000 (frontend) and 5000 (backend) are available
   - Check if another application is using these ports
   - Verify backend dependencies are installed

2. **Browser Launch Failures**
   - Ensure Playwright browsers are installed: `npx playwright install`
   - Try running in headed mode: `npm run test:headed`

3. **Authentication Failures**
   - Verify backend JWT_SECRET is set correctly
   - Check if backend database is accessible

4. **Timeout Errors**
   - Increase timeout in `cucumber.js` or individual steps
   - Check if frontend/backend is responding slowly

### Debug Mode
Use debug mode to see what's happening:
```bash
# Headed + slow motion
set HEADLESS=false
set SLOWMO=500
npm test
```

## Contributing

1. Add new feature files in `tests/features/`
2. Implement steps in `tests/step_definitions/`
3. Follow existing naming conventions
4. Add proper assertions and error handling
5. Test on Windows platform

## Test Coverage

### ✅ High Coverage Scenarios
- End-to-end user journeys (registration → login → order creation → bidding → delivery)
- Error scenarios and edge cases
- Form validation and error messages
- Role-based access control
- Real-time UI updates

### 🔄 Pending Enhancements
- Parallel test execution
- Cross-browser testing (Firefox, Safari)
- API-only test scenarios
- Performance/load testing
- Mobile responsiveness testing

## CI/CD Integration

Configure your CI pipeline:
```yaml
# Example GitHub Actions
- name: Run Tests
  run: |
    npm install
    npm run test:smoke
    npm run test:report
```

## Support

For issues with the test suite:
1. Check existing issues in the repository
2. Verify your Windows environment setup
3. Review the generated HTML report for failure details
4. Enable debug mode and capture screenshots/videos
