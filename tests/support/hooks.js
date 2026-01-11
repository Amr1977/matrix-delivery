const { Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const serverManager = require('../utils/serverManager');
const path = require('path');
const fs = require('fs');
const { cleanTestUsers } = require('./dbCleanup');
const { TEST_RUN_ID, generateUniqueEmail, generateTestUser } = require('./testDataFactory');

// Set default timeout to 180 seconds
setDefaultTimeout(180 * 1000);

// Check if port is already in use
const checkPortInUse = (port) => {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // Port is in use
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false); // Port is free
    });
    server.listen(port, 'localhost');
  });
};

// Start servers before all tests
BeforeAll(async function () {
  console.log('\n🎬 Starting test suite...\n');
  
  const isApiMode = process.env.TEST_MODE === 'api';
  const isE2eMode = process.env.TEST_MODE === 'e2e';
  
  console.log(`   Test Mode: ${process.env.TEST_MODE || 'default'}`);

  // Clean up stale test data from previous runs
  try {
    await cleanTestUsers();
  } catch (e) {
    console.log('   ⚠️  Pre-test cleanup skipped (DB may not be ready yet)');
  }

  try {
    // Check if backend is already running
    let backendRunning = false;
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const health = await response.json();
        if (health.status === 'healthy') {
          backendRunning = true;
        }
      }
    } catch (err) {
      // Backend not available
    }

    // Start backend if not running
    if (backendRunning) {
      console.log('   ✅ Backend already running (using existing instance)');
      global.skipBackendStop = true;
    } else {
      console.log('   🚀 Starting backend server...');
      await serverManager.startBackend();
      // Wait for backend to fully initialize
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log('   ✅ Backend server ready');
    }

    // Only check/start frontend for E2E mode
    if (isE2eMode) {
      let frontendRunning = false;
      try {
        const response = await fetch('http://localhost:3000');
        if (response.ok) {
          frontendRunning = true;
        }
      } catch (err) {
        // Frontend not available
      }

      if (frontendRunning) {
        console.log('   ✅ Frontend already running (using existing instance)');
        global.skipFrontendStop = true;
      } else {
        console.log('   🚀 Starting frontend server...');
        console.log('   ⚠️  Frontend startup may take 30-60 seconds...');
        
        // Start frontend with increased timeout
        const frontendStartPromise = serverManager.startFrontend();
        const timeoutPromise = new Promise((resolve, reject) => 
          setTimeout(() => reject(new Error('Frontend startup timed out after 120 seconds')), 120000)
        );
        
        try {
          await Promise.race([frontendStartPromise, timeoutPromise]);
          // Give frontend extra time to stabilize
          await new Promise(resolve => setTimeout(resolve, 5000));
          console.log('   ✅ Frontend server ready');
        } catch (error) {
          console.log('   ⚠️  Frontend startup failed or timed out');
          console.log('   💡  Try starting frontend manually: cd frontend && npm start');
          throw error;
        }
      }
    } else if (isApiMode) {
      console.log('   ℹ️  Skipping frontend (API mode only needs backend)');
    }

    // Set global flag for cleanup
    global.skipServerStop = global.skipBackendStop && global.skipFrontendStop;
    
    console.log('\n✅ Test environment ready\n');
  } catch (error) {
    console.error('❌ Failed to start servers:', error.message);
    throw error;
  }
});

// Stop servers after all tests
AfterAll(async function () {
  if (!global.skipServerStop) {
    await serverManager.stop();
  } else {
    console.log('Skipping server stop (using external servers)');
  }
});

// Ensure cleanup on process exit
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  if (!global.skipServerStop) {
    await serverManager.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  if (!global.skipServerStop) {
    await serverManager.stop();
  }
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('\n❌ Uncaught Exception:', error);
  if (!global.skipServerStop) {
    await serverManager.stop();
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (!global.skipServerStop) {
    await serverManager.stop();
  }
  process.exit(1);
});

// Setup before each scenario
Before(async function ({ pickle }) {
  console.log('[DEBUG] Before Hook Started for scenario:', pickle.name);

  // Set base URLs
  this.baseUrl = 'http://localhost:3000';
  this.apiUrl = 'http://localhost:5000/api';

  // Initialize test data storage
  this.testData = {};

  // Bind test data factory helpers to scenario context
  this.testRunId = TEST_RUN_ID;
  this.generateUniqueEmail = generateUniqueEmail;
  this.generateTestUser = generateTestUser;
  this.createdUserIds = []; // Track users for cleanup

  // Skip browser launch for API mode
  if (process.env.TEST_MODE === 'api') {
    console.log(`\n▶️  Running (API MODE): ${pickle.name}`);
    return;
  }

  // Launch browser for E2E mode
  const headless = process.env.HEADLESS !== 'false';
  console.log(`[DEBUG] Launching browser (headless: ${headless})`);

  this.browser = await chromium.launch({
    headless: headless,
    slowMo: parseInt(process.env.SLOWMO || '0'),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true,
    // Grant geolocation permission to prevent browser blocking on location requests
    permissions: ['geolocation'],
    // Provide a default geolocation (Cairo, Egypt - center of service area)
    geolocation: { latitude: 30.0444, longitude: 31.2357 },
    recordVideo: process.env.VIDEO === 'true' ? {
      dir: path.join(__dirname, '../../reports/videos'),
      size: { width: 1280, height: 720 }
    } : undefined
  });

  this.page = await this.context.newPage();
  console.log(`\n▶️  Running (E2E MODE): ${pickle.name}`);
});

// Cleanup after each scenario
After(async function ({ pickle, result }) {
  const scenarioName = pickle.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

  // Take screenshot if scenario failed AND page exists
  if (result.status === 'FAILED' && this.page) {
    console.log(`   ❌ FAILED: ${pickle.name}`);

    try {
      const screenshotPath = path.join(
        __dirname,
        '../../reports/screenshots',
        `${scenarioName}_${Date.now()}.png`
      );

      // Ensure directory exists
      const screenshotDir = path.dirname(screenshotPath);
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      if (!fs.existsSync(screenshotDir)) {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        fs.mkdirSync(screenshotDir, { recursive: true });
      }

      const screenshot = await this.page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      // Attach screenshot to report
      this.attach(screenshot, 'image/png');
      console.log(`   📸 Screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error('   ⚠️  Failed to capture screenshot:', error.message);
    }
  } else if (result.status === 'PASSED') {
    console.log(`   ✅ PASSED: ${pickle.name}`);
  }

  // Close browser elements if they exist
  if (this.context) {
    await this.context.close();
  }
  if (this.browser) {
    await this.browser.close();
  }
});
