const { setWorldConstructor, setDefaultTimeout } = require('@cucumber/cucumber');
const { expect } = require('chai');
const puppeteer = require('puppeteer');

class CustomWorld {
  constructor({ parameters }) {
    this.context = {};
    this.variables = {};
    this.expect = expect;
    this.baseUrl = parameters.baseUrl;
    this.apiUrl = parameters.apiUrl;
  }

  async launchBrowser() {
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      slowMo: process.env.SLOWMO ? parseInt(process.env.SLOWMO) : 0,
      defaultViewport: { width: 1200, height: 800 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async visit(path = '/') {
    await this.page.goto(`${this.baseUrl}${path}`, {
      waitUntil: 'networkidle0'
    });
  }

  async waitForSelector(selector, options = {}) {
    return this.page.waitForSelector(selector, {
      timeout: 30000,
      ...options
    });
  }

  async click(selector) {
    await this.waitForSelector(selector);
    await this.page.click(selector);
  }

  async type(selector, text) {
    await this.waitForSelector(selector);
    await this.page.type(selector, text);
  }

  async getText(selector) {
    await this.waitForSelector(selector);
    return this.page.$eval(selector, el => el.textContent.trim());
  }
}

setWorldConstructor(CustomWorld);
setDefaultTimeout(30 * 1000); // 30 seconds
