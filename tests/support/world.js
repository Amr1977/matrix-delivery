const { setWorldConstructor, World } = require('@cucumber/cucumber');
const OrderLifecycleAdapter = require('../steps/core/api/order_lifecycle.api');
const E2eAdapter = require('../steps/core/e2e/order_lifecycle.e2e');

class CustomWorld extends World {
  constructor(options) {
    super(options);
  }

  get adapter() {
    console.log('[DEBUG] Accessing adapter. TEST_MODE:', process.env.TEST_MODE, 'Page exists:', !!this.page);
    if (!this._adapter) {
      if (process.env.TEST_MODE === 'e2e') {
        this._adapter = new E2eAdapter(this.page);
      } else {
        this._adapter = new OrderLifecycleAdapter();
      }
    }
    return this._adapter;
  }
}

setWorldConstructor(CustomWorld);
