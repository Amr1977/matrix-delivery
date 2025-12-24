const { setWorldConstructor, World } = require('@cucumber/cucumber');
const ApiAdapter = require('../steps/core/api/order_lifecycle.api');

class CustomWorld extends World {
  constructor(options) {
    super(options);

    if (process.env.TEST_MODE === 'e2e') {
      // Lazy load E2E adapter
      const E2eAdapter = require('../steps/core/e2e/order_lifecycle.e2e');
      // For Playwright, we might need to handle page injection differently in a real runner
      // But for now, we assume standard instantiation
      this.adapter = new E2eAdapter(this.page);
    } else {
      this.adapter = new ApiAdapter();
    }
  }
}

setWorldConstructor(CustomWorld);
