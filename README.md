# 🛍️ Matrix Delivery Platform

A comprehensive peer-to-peer marketplace application where customers can post delivery requests and drivers can bid to complete deliveries. Built with React, Node.js, PostgreSQL, and powered by a robust test suite.

## 🌟 Open Source Project

This is an open source project released under the MIT License. We welcome contributions from developers of all skill levels! Whether you're interested in fixing bugs, implementing new features, improving documentation, or enhancing our test suite, your contributions are highly appreciated.

### How to Contribute
- **🐛 Report Issues**: Found a bug? [Create an issue](https://github.com/Amr1977/matrix-delivery/issues) with detailed steps to reproduce
- **💡 Suggest Features**: Have an idea? Open a feature request in our issues section
- **🚀 Submit Pull Requests**: Ready to code? Check out our [Contributing Guidelines](#contributing) below
- **📝 Improve Documentation**: Help make our docs clearer and more comprehensive
- **🧪 Add Tests**: Enhance our test coverage by writing new test scenarios

### Development Setup
Get started quickly with our automated setup scripts. See the [Quick Start](#-quick-start) section below for detailed instructions.

## 💡 Motive & Ethics

The Matrix Delivery Platform was created to challenge unfair working conditions in today's delivery industry. Many couriers face instability, lack of transparency, and unfair treatment from corporate platforms that prioritize profit over people.

This project was born from a belief that technology should empower workers, not exploit them. By making this platform open source, we aim to build a fair, transparent, and community-driven ecosystem where both couriers and customers benefit from mutual respect and accountability.

### Core Ethical Principles

**🟢 Fairness**: Every courier deserves equal opportunity, transparent pay calculation, and respect for their time and effort.

**🕊️ Freedom**: No forced algorithms, manipulative gamification, or hidden penalties — couriers retain control over their choices and schedules.

**🔍 Transparency**: All system logic, from delivery matching to earnings, is open source and verifiable by anyone.

**⚖️ Justice**: The platform enforces community rules with clarity and fairness, protecting both couriers and customers.

**🌍 Open Collaboration**: By keeping the project public, we invite developers, riders, and ethical businesses to contribute toward a better delivery model.

### Vision

Our vision is a world where couriers are treated as professionals, not disposable assets — where software works for the people who use it. Matrix Delivery stands as a declaration that open collaboration and ethics-driven design can replace exploitation with empowerment.

### About the Founder

This project was founded by **Amr Lotfy**, a software engineer and advocate for ethical technology. You can connect with Amr on [LinkedIn](https://www.linkedin.com/in/amr-lotfy).

## ✨ Key Features

### 🔐 User Management
- **Role-Based Access**: Separate registration for customers and drivers
- **Secure Authentication**: JWT-based login with proper validation
- **Profile Management**: User profiles with ratings and delivery history
- **Account Types**: Separate registration for customers and drivers

### 📦 Order & Bidding System
- **Location-Based Filtering**: Orders filtered by 5km radius for drivers
- **Real-Time Bidding**: Competitive bidding system between multiple drivers
- **Order Tracking**: Complete order lifecycle from posting to delivery
- **Flexible Pricing**: Customer-defined pricing with driver bidding

### 💳 Payment Processing
- **Cash on Delivery**: COD payment confirmation system for completed deliveries
- **Transaction Records**: Complete payment history and records

### 🎁 Promotions & Rewards
- **Referral Program**: Earn credits by inviting new users *(Planned)*
- **Loyalty Points**: Reward system for completed deliveries *(Planned)*
- **Promotional Campaigns**: Seasonal specials and first-time user bonuses *(Planned)*
- **Driver Incentives**: Weekend bonuses and performance rewards *(Planned)*

### 🔔 Notifications System
- **Real-Time Notifications**: Status updates and alerts for all stakeholders
- **Duplicate Prevention**: Smart notification filtering to avoid spam
- **Event-Driven Alerts**: Notifications triggered by order status changes

### 🧪 Comprehensive Testing
- **320+ BDD Test Scenarios**: Complete coverage with Cucumber.js featuring 400+ step definitions
- **API-First Testing**: Focused testing with database state management and API utilities
- **Automated Reporting**: HTML reports, JSON output, and comprehensive test profiles
- **Parallel Execution**: Optimized test execution with multiple profiles for different needs

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with client-server architecture
- **Authentication**: JWT with bcrypt hashing
- **Validation**: Input sanitization and rate limiting
- **File Storage**: Local file system for logs and uploads

### Frontend
- **Framework**: React.js with modern hooks
- **State Management**: Context API and local state
- **Styling**: CSS with responsive design
- **Accessibility**: Screen reader support and responsive design
- **Browser Support**: Modern browsers (Chrome, Firefox, Edge)

### Testing Infrastructure
- **BDD Framework**: Cucumber.js with Gherkin syntax
- **Browser Automation**: Playwright (Chrome/Chromium/Edge)
- **API Testing**: Native Node.js fetch API
- **Assertions**: Chai with comprehensive test utilities
- **Reporting**: HTML reports, JSON output, and video recording

### DevOps & Scripts
- **Process Management**: Windows/PowerShell and Unix shell scripts
- **Server Control**: Individual and combined server startup scripts
- **Process Monitoring**: Job tracking and automatic cleanup
- **Health Checks**: API endpoints for server status monitoring

## 📁 Project Structure

```
matrix-delivery/
├── backend/                           # Node.js API Server
│   ├── server.js                      # Main application server
│   ├── database/                      # PostgreSQL schemas and migrations
│   ├── logs/                         # Application logs
│   ├── ecosystem.config.js            # PM2 configuration
│   ├── package.json                   # Backend dependencies
│   └── ...more files
├── frontend/                          # React.js Frontend
│   ├── public/                        # Static assets
│   │   └── index.html                 # Main HTML template
│   ├── src/                          # Source code
│   │   ├── App.js                    # Main React component
│   │   ├── index.css                 # Global styles
│   │   └── ...React components        # UI components
│   ├── build/                        # Production build
│   ├── package.json                   # Frontend dependencies
│   └── ...more files
├── tests/                            # Comprehensive BDD Test Suite
│   ├── cucumber.js                   # Test runner configuration with profiles
│   ├── package.json                  # Test dependencies
│   ├── features/                     # 10 Numbered Gherkin feature files
│   │   ├── 01_user_authentication.feature      # Authentication workflows
│   │   ├── 02_order_management.feature        # Order creation and management
│   │   ├── 03_driver_location_tracking.feature # GPS tracking features
│   │   ├── 04_driver_bidding_workflow.feature  # Competitive bidding system
│   │   ├── 05_delivery_workflow.feature       # Delivery execution flow
│   │   ├── 06_payment_cod_system.feature      # Cash on delivery processing
│   │   ├── 07_review_rating_system.feature    # User feedback and ratings
│   │   ├── 08_notifications_system.feature    # Real-time notifications
│   │   ├── 09_order_tracking.feature          # Order status tracking
│   │   ├── 10_end_to_end_integration.feature  # Complete user journeys
│   │   ├── step_definitions/                  # 5 Consolidated step definition files
│   │   │   ├── auth_steps.js                      # Authentication (60+ steps)
│   │   │   ├── order_steps.js                    # Orders (70+ steps)
│   │   │   ├── bidding_delivery_steps.js         # Bidding & delivery (100+ steps)
│   │   │   ├── common_steps.js                   # Reusable utilities (80+ steps)
│   │   │   └── notifications_reviews_payment_steps.js # Notifications & payments (90+ steps)
│   │   └── support/                           # Test context and utilities
│   │       └── world.js                        # CustomWorld class with API utilities
│   ├── scripts/                        # Test environment management
│   │   └── setup-test-environment.js   # Database and test setup
│   └── reports/                        # Generated test reports
└── scripts/                           # Deployment utilities
    └── update_ddns.sh                # DNS update script
```

## ⚡ Quick Start

### Prerequisites
- **Node.js** (v14+ recommended)
- **npm** or **yarn**
- **Windows 10+**, **macOS**, or **Linux**
- **Port 3000** and **5000** available

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Amr1977/matrix-delivery.git
   cd matrix-delivery
   ```

2. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   cd ..
   ```

3. **Install frontend dependencies**:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

4. **Install test dependencies**:
   ```bash
   cd tests
   npm install
   cd ..
   ```

### Running the Application

#### Option 1: Quick Start (Windows PowerShell)
```bash
# Run both backend and frontend servers
.\start-servers.ps1
```
This script will automatically:
- Kill any existing processes on ports 3000/5000
- Start backend server (port 5000)
- Start frontend server (port 3000)
- Monitor both services and provide status

#### Option 2: Linux/Mac OS
```bash
# Start all servers
./start_all.sh

# Stop all servers
./stop_all.sh

# Start backend only
cd backend && npm start

# Start frontend only
cd frontend && npm start
```

#### Option 3: Individual Components
```bash
# Backend only (Windows)
.\start-backend.ps1

# Backend only (Linux/Mac)
cd backend && node server.js

# Frontend only
cd frontend && npm start
```

### 🌐 Access the Application
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **API Documentation**: /api/health (health check)

### 🔄 Development Workflow

```bash
# Start development servers
.\start-servers.ps1

# In another terminal, run tests
cd tests
npm test

# Or run specific test profiles
npm run test:smoke        # Fast critical tests (~2 min)
npm run test:critical     # Critical path tests (~10 min)
npm run test:auth         # Authentication features only
npm run test:orders       # Order management features only
npm run test:bidding      # Driver bidding features only
npm run test:delivery     # Delivery workflow features only
npm run test:ci           # CI/CD optimized profile with retries
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

### Run Test Profiles
```bash
# Quick smoke tests (critical features, ~2 minutes)
npm run test:smoke

# Critical path tests (~10 minutes)
npm run test:critical

# Feature-specific tests
npm run test:auth         # Authentication and user management
npm run test:orders       # Order creation and management
npm run test:bidding      # Driver bidding system
npm run test:delivery     # Delivery workflow execution
npm run test:payments     # Payment and COD system
npm run test:reviews      # Review and rating system
npm run test:notifications # Notification system

# Specialized test runs
npm run test:api          # API-only tests (headless)
npm run test:ui           # UI interaction tests (if implemented)
npm run test:integration  # End-to-end integration scenarios
npm run test:implemented  # Only implemented features

# CI/CD optimized (with retries)
npm run test:ci
```

## Test Configuration

### Environment Variables
```bash
# Database Configuration (required)
DB_HOST=localhost
DB_PORT=5432
DB_NAME_TEST=matrix_delivery_test
DB_USER=postgres
DB_PASSWORD=postgres

# API Configuration (required)
API_BASE_URL=http://localhost:5000/api
NODE_ENV=test

# Optional: Custom test ports
TEST_API_PORT=5000  # If running backend on different port

# Optional: Test execution settings
CUCUMBER_PARALLEL=2  # Number of parallel processes
CUCUMBER_RETRY=1     # Number of retries for failed scenarios
```

### Custom Test Data
```bash
# Override default test user credentials
TEST_CUSTOMER_EMAIL=custom@example.com
TEST_DRIVER_EMAIL=driver@example.com
```

### Debug Configuration
```bash
# Enable verbose logging
DEBUG=cucumber:*

# Single scenario execution
npx cucumber-js features/01_user_authentication.feature:5

# Filter by tags
npx cucumber-js --tags "@smoke and @critical"
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

2. **Database Connection Errors**
   - Verify PostgreSQL is running: `pg_isready -h localhost -p 5432`
   - Check database credentials in environment variables
   - Ensure `matrix_delivery_test` database exists: `createdb matrix_delivery_test`
   - Reset test database if corrupted: `dropdb matrix_delivery_test && createdb matrix_delivery_test`

3. **API Connection Failures**
   - Verify backend API is running on the expected port
   - Check `API_BASE_URL` environment variable
   - Test API health: `curl http://localhost:5000/api/health`

4. **Authentication Failures**
   - Verify backend JWT_SECRET is set correctly
   - Check if backend database is accessible
   - Ensure test users are created properly in `world.js`

5. **Timeout Errors**
   - Increase timeout in `cucumber.js` or individual steps
   - Check database query performance
   - Verify API endpoints are responding promptly

### Debug Mode
Enable debug mode to see what's happening:
```bash
# Verbose logging
DEBUG=cucumber:* npm test

# Test single scenario
npx cucumber-js features/01_user_authentication.feature:5

# Debug API calls
DEBUG=api npm run test:auth
```

### Database Debugging
```bash
# Check test database contents
psql -d matrix_delivery_test -c "SELECT * FROM users LIMIT 5;"

# View active connections
psql -d matrix_delivery_test -c "SELECT * FROM pg_stat_activity;"

# Reset test database
psql -d postgres -c "DROP DATABASE matrix_delivery_test;"
psql -d postgres -c "CREATE DATABASE matrix_delivery_test;"
```

## Contributing

1. Add new feature files in `tests/features/` with numbered naming (e.g., `11_new_feature.feature`)
2. Implement steps in the appropriate `tests/features/step_definitions/` file:
   - `auth_steps.js` - for authentication/user management features
   - `order_steps.js` - for order creation and lifecycle features
   - `bidding_delivery_steps.js` - for bidding and delivery workflow features
   - `common_steps.js` - for reusable utility steps
   - `notifications_reviews_payment_steps.js` - for notifications, reviews, and payments
3. Follow existing Gherkin syntax and naming conventions
4. Add proper assertions using Chai and verify API responses
5. Test on Windows platform and ensure all profiles pass
6. Update documentation in `tests/STEP_DEFINITIONS_README.md`

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

## 🔌 API Documentation

### Auth Endpoints
```bash
POST /api/auth/register              # User registration
POST /api/auth/login                 # User login
GET  /api/auth/verify                # Verify JWT token
```

### Order Endpoints
```bash
POST /api/orders/create              # Create new order
GET  /api/orders/list               # List user orders
GET  /api/orders/:id                # Get order details
PUT  /api/orders/:id/status         # Update order status
```

### Bidding Endpoints
```bash
POST /api/bids/place                # Place bid on order
GET  /api/bids/order/:orderId       # Get bids for order
POST /api/bids/accept               # Accept a bid
```

### User Profile Endpoints
```bash
GET  /api/users/profile             # Get current user profile
PUT  /api/users/profile             # Update user profile
GET  /api/users/ratings             # Get user ratings
```

### System Health
```bash
GET  /api/health                    # System health check
GET  /api/stats                     # Platform statistics
```

### Database Schema
The application uses PostgreSQL with the following main tables:
- `users` - User accounts and profiles
- `orders` - Delivery orders
- `bids` - Driver bids on orders
- `payments` - Payment records
- `notifications` - User notifications
- `reviews` - Customer/driver reviews

## 🔧 System Requirements

### Minimum Requirements
- **OS**: Windows 10+, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: v14.0.0 or higher
- **RAM**: 2GB minimum, 4GB recommended
- **Disk Space**: 500MB for installation + 1GB for database/logs
- **Network**: Stable internet connection for external dependencies

### Ports Required
- **3000**: Frontend React development server
- **5000**: Backend API server
- **9000-9999**: Optional for test recording/playback

## 📊 Database & Permissions

### PostgreSQL Database
- **Default Location**: Local PostgreSQL server (localhost:5432)
- **Database Name**: matrix_delivery (development) / matrix_delivery_test (testing)
- **Automatic Creation**: Database schema created on first run
- **Backup**: pg_dump recommended for production backups
- **Migrations**: Handle manually via SQL scripts for schema changes

### File System Permissions
```bash
# Ensure write permissions for:
backend/logs/                     # Application logs
reports/                          # Test reports and screenshots
frontend/public/uploads/          # File uploads (if enabled)
```

## 🔒 Security Considerations

### Environment Variables
Create `.env` file in backend root:
```bash
JWT_SECRET=your-super-secure-jwt-secret-here
NODE_ENV=production  # development | production | test
PORT=5000

# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres  # Your PostgreSQL username
DB_PASSWORD=your_postgres_password
DB_NAME=matrix_delivery  # Development database
DB_NAME_TEST=matrix_delivery_test  # Test database

# Email configuration (for verification)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Payment gateway keys (for production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Rate Limiting
- Authentication endpoints: 5 requests per hour per IP
- Order endpoints: 100 requests per hour per user
- Bidding endpoints: 50 bids per hour per driver

## 🚀 Deployment

### Production Deployment

1. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Configure Backend**:
   ```bash
   cd backend
   npm install --production
   export NODE_ENV=production
   export JWT_SECRET=your-production-secret
   ```

3. **Use PM2 for Production**:
   ```bash
   # Install PM2 globally
   npm install -g pm2

   # Start backend with PM2
   cd backend
   pm2 start ecosystem.config.js
   ```

4. **Reverse Proxy (Nginx example)**:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_cache_bypass $http_upgrade;
       }

       location /api {
           proxy_pass http://localhost:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🧪 Performance Monitoring

### Key Metrics
- **Response Time**: API endpoints <500ms average
- **Error Rate**: <1% for critical operations
- **Database Queries**: <100ms average
- **Page Load Time**: Frontend <2 seconds
- **Test Execution**: Complete in <15 minutes

### Monitoring Tools
- **Application Logs**: `tail -f backend/logs/app.log`
- **Error Tracking**: Console output and error logs
- **Database Health**: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';` for schema check
- **Memory Usage**: `pm2 monit` for production monitoring

## 🐛 Common Issues & Troubleshooting

### 🔍 Debug Mode
```bash
# Frontend debug
cd frontend && npm run build:dev

# Backend debug with verbose logging
DEBUG=* npm start

# Test debug mode
cd tests && npm run test:debug
```

### ⚠️ Error Resolution

**Issue: "Port already in use"**
```bash
# Find process using port
netstat -ano | findstr :3000
# Kill process
taskkill /PID <PID> /F
```

**Issue: "PostgreSQL connection errors"**
```sql
-- Check connection and active queries
SELECT pid, state, query FROM pg_stat_activity WHERE state = 'active';
-- Check if PostgreSQL service is running
sudo service postgresql status  -- Linux
-- Windows: Check PostgreSQL service in Services panel
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/your-feature`
3. **Add tests for new functionality**
4. **Ensure all tests pass**: `npm test`
5. **Commit changes**: `git commit -m "Add: your feature description"`
6. **Push and create PR**

### 📝 Commit Guidelines
- **Type**: feat | fix | docs | refactor | test | chore
- **Format**: `type: lowercase description`
- **Examples**:
  - `feat: add user notification system`
  - `fix: resolve login timeout issue`
  - `docs: update API documentation`

### 🧪 Testing Requirements
- New features must include corresponding tests
- All tests must pass on CI
- Code coverage should not decrease
- Integration tests required for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React & Node.js** communities for excellent documentation
- **Cucumber.js** team for the powerful BDD testing framework
- **Playwright** team for browser automation tools
- **Open-source** contributors and maintainers

## 📞 Support & Contact

- **Issues**: [Create an issue](https://github.com/your-username/matrix-delivery/issues)
- **Documentation**: See this README and inline code comments
- **Community**: Join discussions in GitHub Discussions section

---

## 🎉 Getting Started Summary

```bash
# 1. Install dependencies
cd matrix-delivery
npm install  # Root dependencies for scripts

cd frontend && npm install && cd ..
cd backend && npm install && cd ..
cd tests && npm install && cd ..

# 2. Start development
# Windows
.\start-servers.ps1

# Linux/Mac
./start_all.sh

# 3. Access app at http://localhost:3000

# 4. Run tests
cd tests && npm test

# 5. View reports
npm run test:report  # Opens HTML report
