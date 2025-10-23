# 🛍️ Matrix Delivery Platform

A comprehensive peer-to-peer marketplace application where customers can post delivery requests and drivers can bid to complete deliveries. Built with React, Node.js, SQLite, and powered by Text-to-Speech notifications and a robust test suite.

## ✨ Key Features

### 🔐 User Management
- **Role-Based Access**: Separate registration for customers and drivers
- **Secure Authentication**: JWT-based login with proper validation
- **Profile Management**: User profiles with ratings and delivery history
- **Account Verification**: Email verification and account status tracking

### 📦 Order & Bidding System
- **Location-Based Filtering**: Orders filtered by 5km radius for drivers
- **Real-Time Bidding**: Competitive bidding system between multiple drivers
- **Order Tracking**: Complete order lifecycle from posting to delivery
- **Flexible Pricing**: Customer-defined pricing with driver bidding

### 💳 Payment Processing
- **Secure Transactions**: Full payment processing for completed deliveries
- **Automatic Refunds**: Cancellation handling with proper refund logic
- **Transaction Records**: Complete payment history and receipts

### 🎁 Promotions & Rewards
- **Referral Program**: Earn credits by inviting new users
- **Loyalty Points**: Reward system for completed deliveries
- **Promotional Campaigns**: Seasonal specials and first-time user bonuses
- **Driver Incentives**: Weekend bonuses and performance rewards

### 🔔 Accessibility Features
- **Text-to-Speech Notifications**: Audio announcements for visually impaired users
- **Duplicate Prevention**: Smart notification filtering to avoid spam
- **Real-Time Updates**: Live status updates and notifications

### 🧪 Comprehensive Testing
- **98 BDD Test Scenarios**: Complete coverage with Cucumber.js
- **Cross-Platform Testing**: E2E, API, and UI testing
- **Automated Reporting**: HTML reports, screenshots, and video recordings
- **Headless/Headed Modes**: Flexible testing configurations

## 🚀 Tech Stack

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: SQLite with file-based storage
- **Authentication**: JWT with bcrypt hashing
- **Validation**: Input sanitization and rate limiting
- **File Storage**: Local file system for logs and uploads

### Frontend
- **Framework**: React.js with modern hooks
- **State Management**: Context API and local state
- **Styling**: CSS with responsive design
- **Accessibility**: Screen reader support and TTS integration
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
│   ├── database/                      # SQLite database files
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
├── tests/                            # Comprehensive Test Suite
│   ├── features/                     # 11 Gherkin feature files
│   │   ├── user_management.feature   # UR-001 to UR-005
│   │   ├── detailed_order_management.feature # OM-001 to OM-003
│   │   ├── driver_operations.feature # DB-001 to DB-003
│   │   ├── payment_system.feature    # PP-001 to PP-002
│   │   ├── promotions_and_rewards.feature # PR-001 to PR-010
│   │   ├── driver_location.feature   # LOC-001 to LOC-011
│   │   ├── driver_bidding.feature    # BID-001 to BID-008
│   │   ├── and more...               # Total: 98 unique scenarios
│   ├── step_definitions/             # Step implementation files
│   ├── support/                      # Test support utilities
│   ├── utils/                        # Test helper functions
│   ├── package.json                  # Test dependencies
│   └── cucumber.js                   # Test runner configuration
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
   git clone https://github.com/your-username/matrix-delivery.git
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

# Or run specific test suites
npm run test:smoke        # Fast critical tests
npm run test:auth         # Authentication only
npm run test:debug        # With visible browser
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
The application uses SQLite with the following main tables:
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

### SQLite Database
- **Location**: `backend/database/matrix-delivery.db`
- **Automatic Creation**: Database created on first run
- **Backup**: Regular export recommended for production
- **Migrations**: Handle manually for schema changes

### File System Permissions
```bash
# Ensure write permissions for:
backend/database/                  # Database files
backend/logs/                     # Application logs
reports/                          # Test reports and screenshots
frontend/public/uploads/          # File uploads (if enabled)
```

## 🔒 Security Considerations

### Environment Variables
Create `.env` file in backend root:
```bash
JWT_SECRET=your-super-secure-jwt-secret-here
NODE_ENV=production  # development | production
PORT=5000

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
- **Database Health**: `SELECT name FROM sqlite_master` for schema check
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

**Issue: "Database locked"**
```sqlite
-- Check for long-running queries
SELECT * FROM sqlite_schema;
-- Database file may need unlocking
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
