class OrderLifecycleAdapter {
    async init() { }
    async cleanup() { }
    async createCustomer(name) { throw new Error('Not implemented'); }
    async createDriver(name) { throw new Error('Not implemented'); }
    async publishOrder(user, title, price) { throw new Error('Not implemented'); }
    async checkOrderAvailable(title) { throw new Error('Not implemented'); }
    async placeBid(driver, orderTitle, amount) { throw new Error('Not implemented'); }
    async checkBidExists(customer, driverName, amount) { throw new Error('Not implemented'); }
    async acceptBid(customer, driverName) { throw new Error('Not implemented'); }
    async getOrderStatus() { throw new Error('Not implemented'); }
    async checkOrderInList(user, listType) { throw new Error('Not implemented'); }
    async markOrderPickedUp(driver) { throw new Error('Not implemented'); }
    async markOrderDelivered(driver) { throw new Error('Not implemented'); }
    async verifyWalletBalance(user, amount) { throw new Error('Not implemented'); }
}

module.exports = OrderLifecycleAdapter;
