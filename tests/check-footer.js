const puppeteer = require('playwright');

async function checkFooter() {
  console.log('🔍 Checking if footer is visible on Matrix Delivery...');

  const browser = await puppeteer.chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the production site
    console.log('📡 Testing on production: https://matrix-delivery.web.app...');
    await page.goto('https://matrix-delivery.web.app', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for React app to load - look for the login form
    console.log('⏳ Waiting for React app to load...');
    await page.waitForSelector('h2:has-text("Sign In")', { timeout: 15000 });
    console.log('✅ React app loaded!');

    // Wait a bit more for any remaining dynamic content
    await page.waitForTimeout(2000);

    // Debug: Check page structure
    console.log('🔍 Checking page structure...');
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('📄 Body HTML length:', bodyHTML.length);
    console.log('📄 Contains footer tag:', bodyHTML.includes('<footer'));

    // Check if footer exists
    const footerExists = await page.locator('footer').count() > 0;

    if (!footerExists) {
      console.log('❌ Footer not found!');
      // Debug: get all text content to see what's on the page
      const allText = await page.locator('body').textContent();
      console.log('📄 Page content preview:', allText.substring(0, 500) + '...');
      return false;
    }

    console.log('✅ Footer found!');

    // Get footer text
    const footerText = await page.locator('footer').textContent();
    console.log('📝 Footer content:', footerText);

    // Check for expected content
    const hasVersion = footerText.includes('Matrix Delivery v1.0.0');
    const hasCommit = footerText.includes('0cc5c8d');
    const hasDate = footerText.includes(new Date().toLocaleDateString());

    console.log('🔍 Content checks:');
    console.log(`  - Version text: ${hasVersion ? '✅' : '❌'}`);
    console.log(`  - Commit hash: ${hasCommit ? '✅' : '❌'}`);
    console.log(`  - Today's date: ${hasDate ? '✅' : '❌'}`);

    if (hasVersion && hasCommit && hasDate) {
      console.log('🎉 All footer checks passed!');
      return true;
    } else {
      console.log('⚠️ Some footer content is missing');
      return false;
    }

  } catch (error) {
    console.error('❌ Error checking footer:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the check
checkFooter().then(success => {
  process.exit(success ? 0 : 1);
});
