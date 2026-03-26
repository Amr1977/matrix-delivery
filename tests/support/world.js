const { setWorldConstructor, World } = require("@cucumber/cucumber");
const E2eAdapter = require("../steps/core/e2e/order_lifecycle.e2e");

class CustomWorld extends World {
  constructor(options) {
    super(options);
  }

  get adapter() {
    console.log(
      "[DEBUG] Accessing adapter. TEST_MODE:",
      process.env.TEST_MODE,
      "Page exists:",
      !!this.page,
    );
    if (!this._adapter) {
      if (process.env.TEST_MODE === "e2e") {
        this._adapter = new E2eAdapter(this.page);
      }
      // For API mode with core profile, we don't use the adapter pattern
      // The core_order_lifecycle_steps.js has its own implementation
    }
    return this._adapter;
  }
}

setWorldConstructor(CustomWorld);
