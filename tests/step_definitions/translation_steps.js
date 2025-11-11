const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Translation Testing Steps

// Helper function to draw colored rectangles around elements for visual feedback
async function highlightElement(page, element, color = 'red', duration = 2000) {
  try {
    const boundingBox = await element.boundingBox();
    if (boundingBox) {
      // Draw rectangle around element
      await page.evaluate(({ x, y, width, height, color }) => {
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.left = x + 'px';
        overlay.style.top = y + 'px';
        overlay.style.width = width + 'px';
        overlay.style.height = height + 'px';
        overlay.style.border = `3px solid ${color}`;
        overlay.style.backgroundColor = 'transparent';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999999';
        overlay.id = 'test-highlight-' + Date.now();

        document.body.appendChild(overlay);

        // Remove after duration
        setTimeout(() => {
          const element = document.getElementById(overlay.id);
          if (element) element.remove();
        }, duration);
      }, { ...boundingBox, color });

      // Wait a bit to show the highlight
      await page.waitForTimeout(500);
    }
  } catch (error) {
    console.log('Could not highlight element:', error.message);
  }
}

// Helper function to assert element text with visual feedback
async function assertElementText(page, element, expectedText, language) {
  try {
    const actualText = await element.textContent();
    const trimmedActual = actualText.trim();
    const trimmedExpected = expectedText.trim();

    if (trimmedActual === trimmedExpected) {
      await highlightElement(page, element, 'green', 1500);
      console.log(`✓ PASS: "${trimmedExpected}" in ${language}`);
      return true;
    } else {
      await highlightElement(page, element, 'red', 3000);
      console.log(`✗ FAIL: Expected "${trimmedExpected}" but got "${trimmedActual}" in ${language}`);
      throw new Error(`Text assertion failed. Expected: "${trimmedExpected}", Got: "${trimmedActual}"`);
    }
  } catch (error) {
    await highlightElement(page, element, 'red', 3000);
    throw error;
  }
}

// Note: Common authentication steps are defined in authentication_steps.js
// This file focuses on translation-specific step definitions

When('I switch to {string} language', async function(language) {
  // Click on language selector
  const languageSelector = this.page.locator('[data-testid="language-selector"]').or(
    this.page.locator('select').or(
      this.page.locator('button').filter({ hasText: /Language|العربية|Español|Français|中文|Deutsch|Português|Русский|日本語|Türkçe|اردو|हिंदी/ })
    )
  );

  await languageSelector.click();

  // Wait for dropdown and select language
  const languageOption = this.page.locator(`[data-value="${language}"]`).or(
    this.page.locator(`option[value="${language}"]`).or(
      this.page.locator(`text=${this.getLanguageDisplayName(language)}`)
    )
  );

  await languageOption.click();

  // Wait for language change to take effect
  await this.page.waitForTimeout(1000);
  console.log(`Switched to ${language} language`);
});

When('I select customer role', async function() {
  const customerRadio = this.page.locator('input[value="customer"]').or(
    this.page.locator('label:has-text("Customer")').or(
      this.page.locator('[data-testid="customer-role"]')
    )
  );

  if (await customerRadio.isVisible()) {
    await customerRadio.click();
  }
});

When('I navigate to create order page', async function() {
  const createOrderButton = this.page.locator('button:has-text("Create New Order")').or(
    this.page.locator('a:has-text("Create New Order")').or(
      this.page.locator('[data-testid="create-order"]')
    )
  );

  await createOrderButton.click();
  await this.page.waitForLoadState('networkidle');
});

When('I try to submit an empty form', async function() {
  const submitButton = this.page.locator('button[type="submit"]').or(
    this.page.locator('button:has-text("Publish Order")').or(
      this.page.locator('button:has-text("Create Order")')
    )
  );

  await submitButton.click();
  // Wait for validation messages to appear
  await this.page.waitForTimeout(1000);
});

Then('the {string} button should display {string} in {string}', async function(elementName, expectedText, language) {
  const element = this.page.locator(`button:has-text("${expectedText}")`).or(
    this.page.locator(`button`).filter({ hasText: expectedText }).first()
  );

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the {string} field label should display {string} in {string}', async function(fieldName, expectedText, language) {
  const element = this.page.locator(`label:has-text("${expectedText}")`).or(
    this.page.locator(`label`).filter({ hasText: expectedText }).first()
  );

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the {string} text should display {string} in {string}', async function(elementName, expectedText, language) {
  const element = this.page.locator(`text=${expectedText}`).first();

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the {string} section should display {string} in {string}', async function(sectionName, expectedText, language) {
  const element = this.page.locator(`h1:has-text("${expectedText}")`).or(
    this.page.locator(`h2:has-text("${expectedText}")`).or(
      this.page.locator(`h3:has-text("${expectedText}")`).or(
        this.page.locator(`text=${expectedText}`).first()
      )
    )
  );

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the {string} role option should display {string} in {string}', async function(roleName, expectedText, language) {
  const element = this.page.locator(`label:has-text("${expectedText}")`).or(
    this.page.locator(`option:has-text("${expectedText}")`).or(
      this.page.locator(`text=${expectedText}`).first()
    )
  );

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the language selector should show current language as {string}', async function(expectedLanguage) {
  const languageSelector = this.page.locator('[data-testid="language-selector"]').or(
    this.page.locator('select').or(
      this.page.locator('button').filter({ hasText: /Language|العربية|Español|Français|中文|Deutsch|Português|Русский|日本語|Türkçe|اردو|हिंदी/ })
    )
  );

  await languageSelector.waitFor({ state: 'visible', timeout: 5000 });
  const currentText = await languageSelector.textContent();
  expect(currentText).to.include(expectedLanguage);
});

Then('the language dropdown should contain all supported languages', async function() {
  const supportedLanguages = ['English', 'العربية', 'Español', 'Français', '中文', 'Deutsch', 'Português', 'Русский', '日本語', 'Türkçe', 'اردو', 'हिंदी'];

  for (const lang of supportedLanguages) {
    const langOption = this.page.locator(`text=${lang}`);
    expect(await langOption.isVisible()).to.be.true;
  }
});

Then('the status {string} should display {string} in {string}', async function(statusName, expectedText, language) {
  const element = this.page.locator(`text=${expectedText}`).first();

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the {string} error should display {string} in {string}', async function(errorType, expectedText, language) {
  const element = this.page.locator(`text=${expectedText}`).or(
    this.page.locator('[class*="error"]').filter({ hasText: expectedText }).first()
  );

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Then('the {string} message should display {string} in {string}', async function(messageType, expectedText, language) {
  const element = this.page.locator(`text=${expectedText}`).first();

  await element.waitFor({ state: 'visible', timeout: 5000 });
  await assertElementText(this.page, element, expectedText, language);
});

Given('I am on any page', async function() {
  // This step is just for context, page should already be loaded
  console.log('On current page for language testing');
});

Given('I am on the order creation page', async function() {
  await this.page.goto(`${this.baseUrl}/create-order`);
  await this.page.waitForLoadState('networkidle');
});

// Helper method to get display name for language
Given.prototype.getLanguageDisplayName = function(language) {
  const languageNames = {
    'en': 'English',
    'ar': 'العربية',
    'es': 'Español',
    'fr': 'Français',
    'zh': '中文',
    'de': 'Deutsch',
    'pt': 'Português',
    'ru': 'Русский',
    'ja': '日本語',
    'tr': 'Türkçe',
    'ur': 'اردو',
    'hi': 'हिंदी'
  };
  return languageNames[language] || language;
};
