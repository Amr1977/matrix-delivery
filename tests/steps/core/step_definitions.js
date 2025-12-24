const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

// The 'adapter' is injected via the World context, determined by the test runner (API vs E2E)

Given('the platform is ready', async function () {
    await this.adapter.cleanup();
    await this.adapter.init();
});

Given('a customer {string} exists', async function (name) {
    await this.adapter.createCustomer(name);
});

Given('a driver {string} exists', async function (name) {
    await this.adapter.createDriver(name);
});

When('{string} publishes an order for {string} priced at {string}', async function (user, title, price) {
    await this.adapter.publishOrder(user, title, parseFloat(price));
});

Then('the order {string} should be available in the marketplace', async function (title) {
    const isAvailable = await this.adapter.checkOrderAvailable(title);
    expect(isAvailable).to.be.true;
});

When('{string} places a bid of {string} on order {string}', async function (driver, amount, orderTitle) {
    await this.adapter.placeBid(driver, orderTitle, parseFloat(amount));
});

Then('{string} should see a bid of {string} from {string}', async function (customer, amount, driver) {
    const hasBid = await this.adapter.checkBidExists(customer, driver, parseFloat(amount));
    expect(hasBid).to.be.true;
});

When('{string} accepts the bid from {string}', async function (customer, driver) {
    await this.adapter.acceptBid(customer, driver);
});

Then('the order status should be {string}', async function (status) {
    const actualStatus = await this.adapter.getOrderStatus();
    expect(actualStatus.toUpperCase()).to.equal(status);
});

Then('{string} should see the order in their {string} list', async function (user, listType) {
    const hasOrder = await this.adapter.checkOrderInList(user, listType);
    expect(hasOrder).to.be.true;
});

When('{string} picks up the order', async function (driver) {
    await this.adapter.markOrderPickedUp(driver);
});

When('{string} delivers the order', async function (driver) {
    await this.adapter.markOrderDelivered(driver);
});

Then('{string} wallet should be credited with {string} less commission', async function (user, amount) {
    // This might be tricky for E2E if we don't have exact wallet UI, but API can check it easily.
    // We'll let the adapter handle the verification method (UI text vs DB value).
    await this.adapter.verifyWalletBalance(user, parseFloat(amount));
});
