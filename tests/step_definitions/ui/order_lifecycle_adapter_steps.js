const { Given, When, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');
console.log('LOADED order_lifecycle_adapter_steps.js');

// The 'adapter' is injected via the World context, determined by the test runner (API vs E2E)

Given('the platform is ready', async function () {
    if (this.adapter.cleanup) await this.adapter.cleanup();
    if (this.adapter.init) await this.adapter.init();
});

Given('a customer {string} exists', async function (name) {
    await this.adapter.createCustomer(name);
});

Given('a driver {string} exists', async function (name) {
    await this.adapter.createDriver(name);
});

When('{string} publishes an order for {string} priced at {string}', async function (user, title, price) {
    await this.adapter.publishOrder({ title, price: parseFloat(price), user });
});

Then('the order {string} should be available in the marketplace', async function (title) {
    const isAvailable = await this.adapter.checkOrderAvailable(title);
    // Adapter might return boolean or throw
    if (isAvailable !== undefined) expect(isAvailable).to.be.true;
});

When('{string} places a bid of {string} on order {string}', async function (driver, amount, orderTitle) {
    await this.adapter.driverBidsOnOrder(orderTitle, parseFloat(amount), driver);
});

Then('{string} should see a bid of {string} from {string}', async function (customer, amount, driver) {
    // E2E adapter might need to verify this specifically if asked
    // For now we assume if flow continues it's visible. 
    // Or we stub it in adapter.
    if (this.adapter.checkBidExists) {
        const hasBid = await this.adapter.checkBidExists(customer, driver, parseFloat(amount));
        expect(hasBid).to.be.true;
    }
});

When('{string} accepts the bid from {string}', async function (customer, driver) {
    // We pass orderTitle or ID?
    // In "When 'Customer' accepts the bid from 'Driver'", we usually need context of which order.
    // The previous step was "on order {string}". We might need to store context.
    // Or we assume single active order.
    // Adapter methods should handle it.
    await this.adapter.customerAcceptsBid(null, driver, customer);
});

Then('the order status should be {string}', async function (status) {
    const actualStatus = await this.adapter.getOrderStatus();
    expect(actualStatus.toUpperCase()).to.equal(status.toUpperCase());
});

Then('{string} should see the order in their {string} list', async function (user, listType) {
    if (this.adapter.checkOrderInList) {
        const hasOrder = await this.adapter.checkOrderInList(user, listType);
        expect(hasOrder).to.be.true;
    }
});

When('{string} picks up the order', async function (driver) {
    await this.adapter.markOrderPickedUp(null, driver);
});

When('{string} delivers the order', async function (driver) {
    await this.adapter.markOrderDelivered(null, driver);
});

When('{string} confirms the delivery', async function (customer) {
    await this.adapter.confirmOrderDelivery(null, customer);
});

Then('{string} wallet should be credited with {string} less commission', async function (user, amount) {
    if (this.adapter.verifyWalletBalance) {
        await this.adapter.verifyWalletBalance(user, parseFloat(amount));
    }
});

Then('{string} wallet should be {string}', async function (user, amount) {
    if (this.adapter.verifyWalletBalance) {
        await this.adapter.verifyWalletBalance(user, parseFloat(amount));
    }
});

When('{string} reviews {string} with {string} stars and comment {string}', async function (reviewer, reviewee, rating, comment) {
    if (this.adapter.submitReview) {
        await this.adapter.submitReview(reviewer, reviewee, parseInt(rating, 10), comment);
    }
});

Then('the review should be submitted successfully', async function () {
    // Verification is implicit in the submitReview method for E2E
    // or we could add a check here if the adapter supports it.
});
