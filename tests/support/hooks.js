const { Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const serverManager = require('../utils/serverManager');
const path = require('path');
const fs = require('fs');

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
BeforeAll(async function() {
  console.log('\n🎬 Starting test suite...\n');

  try {
    // Check if servers are already running
    const backendPortInUse = await checkPortInUse(5000);
    const frontendPortInUse = await checkPortInUse(3000);

    // Also check if we can reach the backend API
    let serversAlreadyRunning = false;
    try {
      const response = await fetch('http://localhost:5000/api/health');
      if (response.ok) {
        const health = await response.json();
        if (health.status === 'healthy') {
          serversAlreadyRunning = true;
        }
      }
    } catch (err) {
      // API not available
    }

    if (serversAlreadyRunning) {
      console.log('   ✅ Servers already running (using existing instance)');
      // Don't start our own servers, use the existing ones
      // Mark that we shouldn't stop them at the end
      global.skipServerStop = true;
    } else {
      // Start servers normally
      await serverManager.startBackend();
      // Wait a bit for backend to fully initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      await serverManager.startFrontend();
      // Wait a bit for frontend to fully initialize
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('\n✅ All servers ready for testing\n');
    }
  } catch (error) {
    console.error('❌ Failed to start servers:', error.message);
    throw error;
  }
});

// Stop servers after all tests
AfterAll(async function() {
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
Before(async function({ pickle }) {
  // Launch browser for each scenario
  this.browser = await chromium.launch({
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOWMO || '0'),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 720 },
    acceptDownloads: true,
    recordVideo: process.env.VIDEO === 'true' ? {
      dir: path.join(__dirname, '../../reports/videos'),
      size: { width: 1280, height: 720 }
    } : undefined
  });
  
  this.page = await this.context.newPage();
  
  // Set base URLs - use Firebase for deployed tests, localhost for local development
  const useFirebase = process.env.TEST_ENV === 'firebase' || process.env.FIREBASE_TEST === 'true';
  this.baseUrl = useFirebase ? 'https://badr-delivery-dev.web.app' : 'http://localhost:3000';
  this.apiUrl = useFirebase ? 'https://matrix-api.oldantique50.com/api' : 'http://localhost:5000/api';
  
  // Initialize test data storage
  this.testData = {};
  
  console.log(`\n▶️  Running: ${pickle.name}`);
});

// Cleanup after each scenario
After(async function({ pickle, result }) {
  const scenarioName = pickle.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  
  // Take screenshot if scenario failed
  if (result.status === 'FAILED') {
    console.log(`   ❌ FAILED: ${pickle.name}`);
    
    try {
      const screenshotPath = path.join(
        __dirname,
        '../../reports/screenshots',
        `${scenarioName}_${Date.now()}.png`
      );
      
      // Ensure directory exists
      const screenshotDir = path.dirname(screenshotPath);
      if (!fs.existsSync(screenshotDir)) {
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
  
  // Close browser
  if (this.browser) {
    await this.context.close();
    await this.browser.close();
  }
});
