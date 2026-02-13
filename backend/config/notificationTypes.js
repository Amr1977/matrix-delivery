module.exports = {
    // Push notification configuration per type
    pushEnabled: {
        ORDER_PLACED: { customer: true, driver: false, admin: true },
        ORDER_ASSIGNED: { customer: false, driver: true, admin: false },
        ORDER_STATUS_UPDATE: { customer: true, driver: true, admin: false },
        COURIER_ARRIVED: { customer: true, driver: false, admin: false },
        ORDER_COMPLETED: { customer: true, driver: true, admin: false },
        NEW_MESSAGE: { customer: true, driver: true, admin: false },
        EMERGENCY_ALERT: { customer: false, driver: true, admin: true },
        PAYMENT_RECEIVED: { customer: true, driver: false, admin: false },
        BALANCE_LOW: { customer: true, driver: true, admin: false }
    }
};