const { Before, After, BeforeAll, AfterAll, setDefaultTimeout } = require('@cucumber/cucumber');
const { chromium } = require('playwright');
const serverManager = require('../utils/serverManager');
const path = require('path');
const fs = require('fs');

// Set default timeout to 60 seconds
setDefaultTimeout(60 * 1000);

// Start servers before all tests
BeforeAll(async function() {
  console.log('\n🎬 Starting test suite...\n');
  
  try {
    await serverManager.startBackend();
    // Wait a bit for backend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await serverManager.startFrontend();
    // Wait a bit for frontend to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n✅ All servers ready for testing\n');
  } catch (error) {
    console.error('❌ Failed to start servers:', error.message);
    throw error;
  }
});

// Stop servers after all tests
AfterAll(async function() {
  await serverManager.stop();
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
  
  // Set base URLs
  this.baseUrl = 'http://localhost:3000';
  this.apiUrl = 'http://localhost:5000/api';
  
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
