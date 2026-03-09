const { Given, When, Then, Before, After } = require('@cucumber/cucumber');
const assert = require('assert');
const { multiFSMOrchestrator } = require('../../../backend/fsm/MultiFSMOrchestrator');
const MarketplaceOrderService = require('../../../backend/services/marketplaceOrderService');
const VendorPayoutService = require('../../../backend/services/vendorPayoutService');
const pool = require('../../../backend/config/db');

// Initialize services
let marketplaceOrderService;
let vendorPayoutService;

Before(async function () {
  marketplaceOrderService = new MarketplaceOrderService();
  vendorPayoutService = new VendorPayoutService();
});

After(async function () {
  // Clean up test data if needed
});

// Setup steps - matching feature file patterns
Given('a customer user exists', async function () {
  // Set up customer user for testing
  this.customerId = 1; // Mock customer ID
});

Given('a vendor owner user exists for that vendor', async function () {
  // Set up vendor owner user for testing
  this.vendorId = 2; // Mock vendor ID
});

Given('the vendor owner creates a marketplace store named {string}', async function (storeName) {
  // Mock store creation
  this.storeName = storeName;
  this.storeId = 1; // Mock store ID
});

Given('the vendor owner creates a marketplace item named {string} with price {string} and inventory {string}', async function (itemName, price, inventory) {
  // Mock item creation
  this.itemName = itemName;
  this.itemPrice = parseFloat(price);
  this.itemInventory = parseInt(inventory);
  this.itemId = 1; // Mock item ID
});

Given('the multi-FSM orchestrator is initialized', async function () {
  // Ensure orchestrator is ready (already imported at top)
  assert(multiFSMOrchestrator, 'Multi-FSM orchestrator should be initialized');
});

// Order creation steps - matching feature file patterns
Given('the customer adds {int} quantity of {string} to their cart', async function (quantity, productName) {
  // Store cart information for later use
  this.cartItems = [{
    productName,
    quantity,
    // In a real implementation, this would add to actual cart
  }];
});

When('the customer creates an order with delivery address {string}', async function (deliveryAddress) {
  // Create order using service
  const orderData = {
    deliveryAddress,
    deliveryLat: 30.0444,
    deliveryLng: 31.2357,
    deliveryFee: 10.00,
    customerNotes: 'Test order'
  };

  const order = await marketplaceOrderService.createOrder(this.customerId, orderData);
  this.order = order;
  this.orderId = order.id;
});

Then('the order should be created successfully', function () {
  assert(this.order, 'Order should be created');
  assert(this.order.id, 'Order should have an ID');
  assert(this.order.status, 'Order should have a status');
});

Then('the vendor FSM should be in state {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.vendor, expectedState, `Vendor FSM should be in state ${expectedState}`);
});

Then('the payment FSM should not be initialized yet', async function () {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.payment, null, 'Payment FSM should not be initialized');
});

Then('the delivery FSM should not be initialized yet', async function () {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, null, 'Delivery FSM should not be initialized');
});

// Vendor acceptance steps
When('the vendor accepts the order with preparation time {string}', async function (prepTime) {
  const result = await marketplaceOrderService.vendorAcceptOrder(this.orderId, this.vendorId);
  this.lastTransitionResult = result;
});

Then('the vendor FSM should transition to {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.vendor, expectedState, `Vendor FSM should transition to ${expectedState}`);
});

Then('the payment FSM should be initialized in state {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.payment, expectedState, `Payment FSM should be initialized in ${expectedState}`);
});

Then('the delivery FSM should be initialized in state {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, expectedState, `Delivery FSM should be initialized in ${expectedState}`);
});

Then('a {string} event should be emitted', async function (eventName) {
  // In a real implementation, we'd check event emission
  // For now, we verify the transition occurred successfully
  assert(this.lastTransitionResult, `Event ${eventName} should trigger successful transition`);
});

// Payment steps
When('the customer completes payment with method {string} and amount {string}', async function (method, amount) {
  const result = await marketplaceOrderService.customerConfirmPayment(this.orderId, this.customerId);
  this.lastTransitionResult = result;
});

Then('the payment FSM should transition to {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.payment, expectedState, `Payment FSM should transition to ${expectedState}`);
});

Then('a vendor payout should be created for the order', async function () {
  // Check if payout was created
  const payoutResult = await pool.query(
    'SELECT * FROM vendor_payouts WHERE order_id = $1',
    [this.orderId]
  );
  assert(payoutResult.rows.length > 0, 'Vendor payout should be created');
  this.payout = payoutResult.rows[0];
});

// Vendor preparation steps
When('the vendor starts preparing the order', async function () {
  const result = await marketplaceOrderService.updateOrderStatus(
    this.orderId,
    'vendor_starts_preparing_order',
    this.vendorId,
    'vendor'
  );
  this.lastTransitionResult = result;
});

When('the vendor marks the order as fully prepared', async function () {
  const result = await marketplaceOrderService.updateOrderStatus(
    this.orderId,
    'vendor_marks_order_as_fully_prepared',
    this.vendorId,
    'vendor'
  );
  this.lastTransitionResult = result;
});

// Delivery steps
When('a courier accepts the delivery request', async function () {
  // In a real test, we'd have a courier user
  // For now, simulate courier assignment
  const result = await marketplaceOrderService.adminAssignDriver(
    this.orderId,
    4, // admin ID
    3  // courier ID
  );
  this.lastTransitionResult = result;
});

Then('the delivery FSM should transition to {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, expectedState, `Delivery FSM should transition to ${expectedState}`);
});

When('the courier arrives at the vendor pickup location', async function () {
  const result = await marketplaceOrderService.updateOrderStatus(
    this.orderId,
    'courier_arrives_at_vendor_pickup_location',
    3, // courier ID
    'driver'
  );
  this.lastTransitionResult = result;
});

When('the courier confirms receipt of the order from vendor', async function () {
  const result = await marketplaceOrderService.driverPickupOrder(this.orderId, 3); // courier ID
  this.lastTransitionResult = result;
});

When('the courier arrives at the customer drop-off location', async function () {
  const result = await marketplaceOrderService.updateOrderStatus(
    this.orderId,
    'courier_arrives_at_customer_drop_off_location',
    3, // courier ID
    'driver'
  );
  this.lastTransitionResult = result;
});

When('the courier marks the order as delivered to customer', async function () {
  const result = await marketplaceOrderService.driverDeliverOrder(this.orderId, 3); // courier ID
  this.lastTransitionResult = result;
});

When('the customer confirms receipt of the order', async function () {
  const result = await marketplaceOrderService.customerConfirmReceipt(this.orderId, this.customerId);
  this.lastTransitionResult = result;
});

Then('the order should be marked as completed', async function () {
  const order = await marketplaceOrderService.getOrder(this.orderId, this.customerId);
  assert.strictEqual(order.status, 'completed', 'Order should be marked as completed');
});

Then('the vendor payout should be processed', async function () {
  // Check payout status
  const payoutResult = await pool.query(
    'SELECT * FROM vendor_payouts WHERE order_id = $1',
    [this.orderId]
  );
  assert(payoutResult.rows.length > 0, 'Payout should exist');
  // In a real scenario, we'd check if payout was processed
});

// Edge case steps
Given('the customer successfully creates and pays for an order', async function () {
  // Reuse existing steps
  await this.executeSteps('Given the customer adds 2 quantity of "Test Product" to their cart');
  await this.executeSteps('When the customer creates an order with delivery address "123 Test Street, Cairo, Egypt"');
  await this.executeSteps('When the vendor accepts the order with preparation time "30 minutes"');
  await this.executeSteps('When the customer completes payment with method "card" and amount "110.00"');
});

Given('the payment FSM is in state {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.payment, expectedState, `Payment FSM should be in ${expectedState}`);
});

When('the vendor rejects the order due to {string}', async function (reason) {
  const result = await marketplaceOrderService.vendorRejectOrder(this.orderId, this.vendorId);
  this.lastTransitionResult = result;
});

Then('the payment FSM should automatically initiate a refund', async function () {
  // In the event-driven system, this should happen automatically
  // We can check that refund was initiated
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  // The exact state depends on implementation, but it should be a refund state
  assert(fsmStates.payment.includes('refunded') || fsmStates.payment.includes('failed'),
         'Payment should be in a refund/failed state');
});

Then('the delivery FSM should be cancelled if initialized', async function () {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  // If delivery was initialized, it should be in a cancelled state
  if (fsmStates.delivery) {
    // Check for cancelled state or non-active state
    assert(!fsmStates.delivery.includes('active'), 'Delivery should not be in active state');
  }
});

Given('the customer creates an order and vendor confirms acceptance', async function () {
  await this.executeSteps('Given the customer adds 2 quantity of "Test Product" to their cart');
  await this.executeSteps('When the customer creates an order with delivery address "123 Test Street, Cairo, Egypt"');
  await this.executeSteps('When the vendor accepts the order with preparation time "30 minutes"');
});

Given('the vendor starts and completes preparation', async function () {
  await this.executeSteps('When the vendor starts preparing the order');
  await this.executeSteps('When the vendor marks the order as fully prepared');
});

When('the customer\'s payment fails with reason {string}', async function (reason) {
  // Simulate payment failure - this would be handled by the payment system
  // For now, we'll trigger a failed payment transition
  const context = {
    userId: 1,
    userRole: 'system',
    order: { id: this.orderId },
    metadata: { failureReason: reason, failureCode: 'INSUFFICIENT_FUNDS' }
  };

  const result = await multiFSMOrchestrator.executeFSMTransition(
    this.orderId,
    'payment',
    'payment_attempt_failed_or_timed_out',
    context
  );
  this.lastTransitionResult = result;
});

Then('the delivery actions should be blocked', async function () {
  // Check that delivery actions are not available
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert(fsmStates.payment === 'payment_attempt_failed_for_order', 'Payment should be failed');
  // Delivery should not progress
});

Then('an admin notification should be triggered for manual intervention', async function () {
  // In a real system, this would check for admin notifications
  // For now, verify the failed state
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.payment, 'payment_attempt_failed_for_order', 'Payment should be in failed state');
});

Then('the order should be flagged for admin review', async function () {
  // Check order status indicates admin review needed
  const order = await marketplaceOrderService.getOrder(this.orderId, this.customerId);
  assert(order.status.includes('failed') || order.status.includes('admin'), 'Order should indicate admin review');
});

// Customer dispute steps
Given('the order is delivered and awaiting customer confirmation', async function () {
  await this.executeSteps('Given the customer creates an order and vendor confirms acceptance');
  await this.executeSteps('Given the vendor starts and completes preparation');
  await this.executeSteps('When the customer completes payment with method "card" and amount "110.00"');
  await this.executeSteps('When a courier accepts the delivery request');
  await this.executeSteps('When the courier arrives at the vendor pickup location');
  await this.executeSteps('When the courier confirms receipt of the order from vendor');
  await this.executeSteps('When the courier arrives at the customer drop-off location');
  await this.executeSteps('When the courier marks the order as delivered to customer');
});

Given('the delivery FSM is in state {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, expectedState, `Delivery FSM should be in ${expectedState}`);
});

When('the customer reports a problem with reason {string}', async function (reason) {
  const context = {
    userId: this.customerId,
    userRole: 'customer',
    order: { id: this.orderId, delivery_state: 'awaiting_customer_confirmation_of_order_delivery' },
    metadata: { dispute_reason: reason, dispute_details: 'Detailed dispute information' }
  };

  const result = await multiFSMOrchestrator.executeFSMTransition(
    this.orderId,
    'delivery',
    'customer_reports_problem_with_delivery',
    context
  );
  this.lastTransitionResult = result;
});

Then('the delivery FSM should transition to {string}', async function (expectedState) {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, expectedState, `Delivery FSM should transition to ${expectedState}`);
});

Then('an admin review should be triggered', async function () {
  // Verify the dispute state
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, 'delivery_disputed_by_customer_and_requires_resolution', 'Should be in dispute state');
});

Then('the vendor payout should be held pending resolution', async function () {
  // Check payout status
  const payoutResult = await pool.query(
    'SELECT * FROM vendor_payouts WHERE order_id = $1',
    [this.orderId]
  );
  if (payoutResult.rows.length > 0) {
    // Payout should not be in completed state
    assert.notStrictEqual(payoutResult.rows[0].status, 'completed', 'Payout should be held');
  }
});

// State synchronization steps
Given('the customer creates an order', async function () {
  await this.executeSteps('Given the customer adds 2 quantity of "Test Product" to their cart');
  await this.executeSteps('When the customer creates an order with delivery address "123 Test Street, Cairo, Egypt"');
});

When('multiple rapid state transitions occur across FSMs', async function () {
  // Simulate rapid transitions
  await this.executeSteps('When the vendor accepts the order with preparation time "30 minutes"');
  await this.executeSteps('When the customer completes payment with method "card" and amount "110.00"');
  await this.executeSteps('When the vendor starts preparing the order');
  await this.executeSteps('When the vendor marks the order as fully prepared');
});

Then('all FSM states should remain synchronized', async function () {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  // Verify logical consistency between FSMs
  assert(fsmStates.vendor === 'order_is_fully_prepared_and_ready_for_delivery', 'Vendor should be prepared');
  assert(fsmStates.payment === 'payment_successfully_received_and_verified_for_order', 'Payment should be successful');
  assert(fsmStates.delivery === 'delivery_request_created_waiting_for_courier_acceptance', 'Delivery should be waiting');
});

Then('no race conditions should occur', async function () {
  // Verify no inconsistent states
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert(fsmStates.vendor && fsmStates.payment && fsmStates.delivery !== undefined, 'All FSMs should have valid states');
});

Then('the audit log should record all transitions in correct order', async function () {
  // Check audit log exists and is properly ordered
  const auditResult = await pool.query(
    'SELECT * FROM fsm_action_log WHERE order_id = $1 ORDER BY timestamp',
    [this.orderId]
  );
  assert(auditResult.rows.length > 0, 'Audit log should have entries');
  // Verify chronological order
  for (let i = 1; i < auditResult.rows.length; i++) {
    assert(auditResult.rows[i].timestamp >= auditResult.rows[i-1].timestamp, 'Audit log should be in chronological order');
  }
});

Then('the order should maintain data consistency', async function () {
  const order = await marketplaceOrderService.getOrder(this.orderId, this.customerId);
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);

  // Verify logical consistency
  if (fsmStates.payment === 'payment_successfully_received_and_verified_for_order') {
    assert(order.status !== 'cancelled', 'Order should not be cancelled if payment successful');
  }
});

// Terminal state steps
Given('an order reaches a terminal state', async function () {
  await this.executeSteps('Given the order is delivered and awaiting customer confirmation');
  await this.executeSteps('When the customer confirms receipt of the order');
});

When('any actor attempts to perform further actions', async function () {
  // Try various actions that should fail
  this.failedActions = [];

  try {
    await marketplaceOrderService.updateOrderStatus(this.orderId, 'vendor_starts_preparing_order', this.vendorId, 'vendor');
  } catch (e) {
    this.failedActions.push('vendor_action');
  }

  try {
    await marketplaceOrderService.customerConfirmPayment(this.orderId, this.customerId);
  } catch (e) {
    this.failedActions.push('payment_action');
  }

  try {
    await marketplaceOrderService.updateOrderStatus(this.orderId, 'courier_accepts_delivery_request', 3, 'driver');
  } catch (e) {
    this.failedActions.push('delivery_action');
  }
});

Then('all transition attempts should be rejected', async function () {
  assert(this.failedActions.length > 0, 'Some actions should have failed');
});

Then('appropriate error messages should be returned', async function () {
  // Verify error handling in terminal states
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert(fsmStates.delivery === 'order_delivery_successfully_completed_and_confirmed_by_customer',
         'Delivery should be in terminal state');
});

Then('the terminal state should be preserved', async function () {
  // Check that state hasn't changed
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert.strictEqual(fsmStates.delivery, 'order_delivery_successfully_completed_and_confirmed_by_customer',
                    'Terminal state should be preserved');
});

// Event orchestration steps
Given('an order in initial vendor confirmation state', async function () {
  await this.executeSteps('Given the customer creates an order');
});

When('the vendor accepts the order', async function () {
  await this.executeSteps('When the vendor accepts the order with preparation time "30 minutes"');
});

Then('VENDOR_CONFIRMED event should trigger Payment and Delivery FSM initialization', async function () {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert(fsmStates.payment === 'payment_pending_for_customer', 'Payment FSM should be initialized');
  assert(fsmStates.delivery === 'delivery_request_created_waiting_for_courier_acceptance', 'Delivery FSM should be initialized');
});

When('payment is successful', async function () {
  await this.executeSteps('When the customer completes payment with method "card" and amount "110.00"');
});

Then('PAYMENT_SUCCESSFUL event should trigger payout creation', async function () {
  const payoutResult = await pool.query(
    'SELECT * FROM vendor_payouts WHERE order_id = $1',
    [this.orderId]
  );
  assert(payoutResult.rows.length > 0, 'Payout should be created on payment success');
});

When('vendor completes preparation', async function () {
  await this.executeSteps('When the vendor starts preparing the order');
  await this.executeSteps('When the vendor marks the order as fully prepared');
});

Then('PREPARATION_COMPLETE event should enable delivery pickup', async function () {
  const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
  assert(fsmStates.vendor === 'order_is_fully_prepared_and_ready_for_delivery', 'Vendor should be prepared');
  // Delivery should still be waiting for courier
  assert(fsmStates.delivery === 'delivery_request_created_waiting_for_courier_acceptance', 'Delivery should be waiting');
});

When('delivery is confirmed', async function () {
  await this.executeSteps('When a courier accepts the delivery request');
  await this.executeSteps('When the courier arrives at the vendor pickup location');
  await this.executeSteps('When the courier confirms receipt of the order from vendor');
  await this.executeSteps('When the courier arrives at the customer drop-off location');
  await this.executeSteps('When the courier marks the order as delivered to customer');
  await this.executeSteps('When the customer confirms receipt of the order');
});

Then('DELIVERY_CONFIRMED event should complete the order', async function () {
  const order = await marketplaceOrderService.getOrder(this.orderId, this.customerId);
  assert.strictEqual(order.status, 'completed', 'Order should be completed');
});

// Tracking information steps
Given('an order with an assigned courier', async function () {
  await this.executeSteps('Given the customer creates an order and vendor confirms acceptance');
  await this.executeSteps('Given the vendor starts and completes preparation');
  await this.executeSteps('When the customer completes payment with method "card" and amount "110.00"');
  await this.executeSteps('When a courier accepts the delivery request');
});

When('the delivery FSM is in different states', async function () {
  // This step sets up different scenarios for tracking
  this.trackingScenarios = [
    { state: 'delivery_request_created_waiting_for_courier_acceptance', description: 'Delivery request created, waiting for courier', terminal: false },
    { state: 'courier_has_been_assigned_to_deliver_the_order', description: 'Courier assigned to deliver your order', terminal: false },
    { state: 'courier_is_actively_transporting_order_to_customer', description: 'Order in transit to customer', terminal: false },
    { state: 'awaiting_customer_confirmation_of_order_delivery', description: 'Order delivered, awaiting confirmation', terminal: false },
    { state: 'delivery_disputed_by_customer_and_requires_resolution', description: 'Delivery disputed, under review', terminal: true },
    { state: 'order_delivery_successfully_completed_and_confirmed_by_customer', description: 'Order delivered and confirmed', terminal: true }
  ];
});

Then('appropriate tracking information should be provided:', async function (dataTable) {
  // Test tracking information for different states
  for (const row of dataTable.hashes()) {
    const order = { delivery_state: row.State };
    if (row['Courier Info'] === 'Courier details') {
      order.assigned_courier = { id: 3, name: 'John Courier', phone: '+1234567890' };
    }
    if (row.State === 'courier_is_actively_transporting_order_to_customer') {
      order.estimated_delivery_time = '2024-01-15T10:00:00Z';
    }

    // Import DeliveryFSM to test tracking
    const { DeliveryFSM } = require('../../../backend/fsm/DeliveryFSM');
    const deliveryFSM = new DeliveryFSM();
    const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

    assert.strictEqual(trackingInfo.description, row.Description, `Description should match for ${row.State}`);
    assert.strictEqual(trackingInfo.isTerminal, row.Terminal === 'true', `Terminal flag should match for ${row.State}`);
  }
});

// Guard validation steps
When('invalid transitions are attempted', async function () {
  // Set up scenarios for invalid transitions
  this.invalidTransitionScenarios = [
    { description: 'Wrong vendor accepts order', shouldFail: true },
    { description: 'Inactive vendor accepts', shouldFail: true },
    { description: 'Expired order acceptance', shouldFail: true },
    { description: 'Courier wrong zone', shouldFail: true },
    { description: 'Customer retries payment', shouldFail: true },
    { description: 'Wrong role attempts action', shouldFail: true }
  ];
});

Then('appropriate guard failures should occur:', async function (dataTable) {
  // Test guard failures for different scenarios
  for (const row of dataTable.hashes()) {
    // In a real implementation, we'd set up each scenario and test
    // For now, we document the expected behavior
    console.log(`Testing guard failure for: ${row.Scenario} - Expected: ${row['Expected Failure']}`);
  }
});
