/**
 * Test Data Factory
 * Generates unique, timestamped test data for reliable test isolation
 */

// Unique identifier for this test run - ensures no collisions between parallel runs
const TEST_RUN_ID = Date.now();

/**
 * Generate a unique email address for testing
 * @param {string} name - Base name for the email (e.g., 'alice', 'bob')
 * @returns {string} Unique email like 'alice_1767600000@test.com'
 */
function generateUniqueEmail(name) {
    return `${name.toLowerCase()}_${TEST_RUN_ID}@test.com`;
}

/**
 * Generate a unique email with a custom suffix (for per-scenario uniqueness)
 * @param {string} name - Base name for the email
 * @param {string} suffix - Additional suffix for uniqueness
 * @returns {string} Unique email like 'alice_1767600000_abc123@test.com'
 */
function generateUniqueEmailWithSuffix(name, suffix) {
    return `${name.toLowerCase()}_${TEST_RUN_ID}_${suffix}@test.com`;
}

/**
 * Generate a test user object with unique identifiers
 * @param {string} name - User's display name
 * @param {string} role - User role: 'customer', 'driver', or 'admin'
 * @returns {Object} User object ready for registration
 */
function generateTestUser(name, role = 'customer') {
    const email = generateUniqueEmail(name);
    return {
        name,
        email,
        password: 'TestPassword123!',
        primary_role: role,
        phone: `+1555${String(Date.now()).slice(-7)}`,
        country: 'Egypt',
        city: 'Cairo',
        area: 'Maadi',
        vehicle_type: role === 'driver' ? 'car' : undefined
    };
}

/**
 * Generate a test order object
 * @param {Object} options - Order options
 * @returns {Object} Order object ready for creation
 */
function generateTestOrder(options = {}) {
    const {
        title = `Test Order ${Date.now()}`,
        price = 50.00,
        description = 'Test order description',
        paymentMethod = 'cash'
    } = options;

    return {
        title,
        price,
        description,
        pickupLocation: {
            coordinates: { lat: 30.0444, lng: 31.2357 },
            address: 'Cairo Test Pickup Address'
        },
        dropoffLocation: {
            coordinates: { lat: 30.0510, lng: 31.2380 },
            address: 'Giza Test Dropoff Address'
        },
        package_description: 'Test package',
        paymentMethod
    };
}

/**
 * Generate a unique order number
 * @returns {string} Order number like 'ORD-1767600000-123'
 */
function generateOrderNumber() {
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${TEST_RUN_ID}-${random}`;
}

module.exports = {
    TEST_RUN_ID,
    generateUniqueEmail,
    generateUniqueEmailWithSuffix,
    generateTestUser,
    generateTestOrder,
    generateOrderNumber
};
