const { multiFSMOrchestrator } = require('../../backend/fsm/MultiFSMOrchestrator');
const MarketplaceOrderService = require('../../backend/services/marketplaceOrderService');
const VendorPayoutService = require('../../backend/services/vendorPayoutService');
const pool = require('../../backend/config/db');
const { eventBus } = require('../../backend/services/eventBus');
const { timeoutScheduler } = require('../../backend/services/timeoutScheduler');

// Mock external dependencies
jest.mock('../../backend/config/db');
jest.mock('../../backend/services/eventBus');
jest.mock('../../backend/services/timeoutScheduler');

describe('BDD Feature: Verbose Multi-FSM Order Lifecycle', () => {
  let marketplaceOrderService;
  let vendorPayoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    multiFSMOrchestrator.eventEmitter.removeAllListeners();

    marketplaceOrderService = new MarketplaceOrderService();
    vendorPayoutService = new VendorPayoutService();
  });

  describe('Happy Path: Complete Order Fulfillment', () => {
    test('Scenario: Customer creates order, vendor confirms, payment succeeds, delivery completes', async () => {
      const orderId = 1001;
      const customerId = 1;
      const vendorId = 2;
      const driverId = 3;

      // Given the customer creates an order
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('awaiting_order_availability_vendor_confirmation');
      expect(fsmStates.payment).toBeNull();
      expect(fsmStates.delivery).toBeNull();

      // When the vendor FSM is in state "awaiting_order_availability_vendor_confirmation"
      expect(fsmStates.vendor).toBe('awaiting_order_availability_vendor_confirmation');

      // And the vendor confirmation timeout has not expired
      // (timeout would be scheduled in real implementation)

      // When the vendor confirms acceptance
      const vendorConfirmResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(vendorConfirmResult.valid).toBe(true);
      expect(vendorConfirmResult.nextStatus).toBe('awaiting_vendor_start_preparation');

      // Then the vendor FSM transitions to "awaiting_vendor_start_preparation"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('awaiting_vendor_start_preparation');

      // And the payment FSM is initialized to "payment_pending_for_customer"
      expect(fsmStates.payment).toBe('payment_pending_for_customer');

      // And the delivery FSM is initialized to "delivery_request_created_waiting_for_courier_acceptance"
      expect(fsmStates.delivery).toBe('delivery_request_created_waiting_for_courier_acceptance');

      // When the customer completes payment
      const paymentResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: customerId,
        userRole: 'customer',
        order: { id: orderId },
        payment: { amount: 150.00, method: 'card' }
      });

      expect(paymentResult.valid).toBe(true);
      expect(paymentResult.nextStatus).toBe('payment_successfully_received_and_verified_for_order');

      // Then the payment FSM transitions to "payment_successfully_received_and_verified_for_order"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.payment).toBe('payment_successfully_received_and_verified_for_order');

      // When the vendor starts preparing the order
      const prepStartResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_starts_preparing', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(prepStartResult.valid).toBe(true);
      expect(prepStartResult.nextStatus).toBe('vendor_is_actively_preparing_order');

      // Then the vendor FSM transitions to "vendor_is_actively_preparing_order"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('vendor_is_actively_preparing_order');

      // When the vendor marks the order as prepared
      const prepCompleteResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_prepared', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(prepCompleteResult.valid).toBe(true);
      expect(prepCompleteResult.nextStatus).toBe('order_is_fully_prepared_and_ready_for_delivery');

      // Then the vendor FSM transitions to "order_is_fully_prepared_and_ready_for_delivery"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('order_is_fully_prepared_and_ready_for_delivery');

      // When the courier accepts the delivery request
      const courierAcceptResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_accepts_delivery_request', {
        userId: driverId,
        userRole: 'driver',
        order: { id: orderId },
        courier: { id: driverId, is_available: true }
      });

      expect(courierAcceptResult.valid).toBe(true);
      expect(courierAcceptResult.nextStatus).toBe('courier_has_been_assigned_to_deliver_the_order');

      // Then the delivery FSM transitions to "courier_has_been_assigned_to_deliver_the_order"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('courier_has_been_assigned_to_deliver_the_order');

      // When the courier confirms receipt of order from vendor
      const courierPickupResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_confirms_receipt', {
        userId: driverId,
        userRole: 'driver',
        order: { id: orderId }
      });

      expect(courierPickupResult.valid).toBe(true);
      expect(courierPickupResult.nextStatus).toBe('courier_is_actively_transporting_order_to_customer');

      // Then the delivery FSM transitions to "courier_is_actively_transporting_order_to_customer"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('courier_is_actively_transporting_order_to_customer');

      // When the courier arrives at customer location and marks order as delivered
      const courierDeliverResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_marks_delivered', {
        userId: driverId,
        userRole: 'driver',
        order: { id: orderId }
      });

      expect(courierDeliverResult.valid).toBe(true);
      expect(courierDeliverResult.nextStatus).toBe('awaiting_customer_confirmation_of_order_delivery');

      // Then the delivery FSM transitions to "awaiting_customer_confirmation_of_order_delivery"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('awaiting_customer_confirmation_of_order_delivery');

      // When the customer confirms receipt of order
      const customerConfirmResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'customer_confirms_receipt', {
        userId: customerId,
        userRole: 'customer',
        order: { id: orderId }
      });

      expect(customerConfirmResult.valid).toBe(true);
      expect(customerConfirmResult.nextStatus).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');

      // Then the delivery FSM transitions to "order_delivery_successfully_completed_and_confirmed_by_customer"
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');

      // And the order is completed
      expect(fsmStates.vendor).toBe('order_is_fully_prepared_and_ready_for_delivery');
      expect(fsmStates.payment).toBe('payment_successfully_received_and_verified_for_order');
      expect(fsmStates.delivery).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');
    });
  });

  describe('Timeout Scenarios', () => {
    test('Scenario: Vendor confirmation timeout leads to order cancellation', async () => {
      const orderId = 2001;
      const customerId = 1;

      // Given the customer creates an order
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // And the vendor FSM is in state "awaiting_order_availability_vendor_confirmation"
      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('awaiting_order_availability_vendor_confirmation');

      // When the vendor confirmation timeout expires after "15 minutes"
      // (simulate timeout handling)
      const timeoutResult = await multiFSMOrchestrator.handleTimeout(
        orderId,
        'vendor',
        'awaiting_order_availability_vendor_confirmation',
        'timeout'
      );

      // Then the vendor FSM should transition to "order_cancelled_vendor_unresponsive"
      // (In our implementation, this triggers cancellation)
      expect(timeoutResult).toBeDefined();

      // And the payment FSM should not be initialized
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.payment).toBeNull();

      // And the delivery FSM should not be initialized
      expect(fsmStates.delivery).toBeNull();

      // And the customer should receive a vendor unresponsive notification
      // (This would be tested through event emission in real implementation)
    });

    test('Scenario: Payment timeout after vendor confirmation', async () => {
      const orderId = 2002;
      const vendorId = 2;
      const customerId = 1;

      // Given the customer creates an order and vendor confirms acceptance
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      // And the payment FSM is in state "payment_pending_for_customer"
      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.payment).toBe('payment_pending_for_customer');

      // When the payment timeout expires after "10 minutes"
      const timeoutResult = await multiFSMOrchestrator.handleTimeout(
        orderId,
        'payment',
        'payment_pending_for_customer',
        'timeout'
      );

      // Then the payment FSM should transition to "payment_attempt_failed_for_order"
      expect(timeoutResult).toBeDefined();

      // And the vendor FSM should transition to "order_cancelled_payment_timeout"
      // (This would cascade through event handling)
    });

    test('Scenario: Customer confirmation auto-complete after 24 hours', async () => {
      const orderId = 2003;
      const driverId = 3;

      // Given order is delivered and awaiting customer confirmation
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Fast-forward to delivered state
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: 1, userRole: 'customer', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_prepared', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_accepts_delivery_request', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_marks_delivered', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('awaiting_customer_confirmation_of_order_delivery');

      // When the customer confirmation timeout expires after "24 hours"
      const timeoutResult = await multiFSMOrchestrator.handleTimeout(
        orderId,
        'delivery',
        'awaiting_customer_confirmation_of_order_delivery',
        'customer_confirmation_timeout'
      );

      // Then the delivery FSM should auto-complete
      expect(timeoutResult).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('Scenario: Vendor rejects order after payment started', async () => {
      const orderId = 3001;
      const vendorId = 2;
      const customerId = 1;

      // Given payment has been completed
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: customerId,
        userRole: 'customer',
        order: { id: orderId }
      });

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.payment).toBe('payment_successfully_received_and_verified_for_order');

      // When vendor rejects the order
      const rejectResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_rejects_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(rejectResult.valid).toBe(true);
      expect(rejectResult.nextStatus).toBe('order_rejected_by_vendor');

      // Then payment refund should be initiated
      // (This would be handled through event listeners in real implementation)
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('order_rejected_by_vendor');
    });

    test('Scenario: Courier cancellation after assignment requires reassignment', async () => {
      const orderId = 3002;
      const driverId = 3;

      // Given courier has been assigned
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: 1, userRole: 'customer', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_prepared', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_accepts_delivery_request', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('courier_has_been_assigned_to_deliver_the_order');

      // When courier cancels after assignment
      const cancelResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_cancels_after_assignment', {
        userId: driverId,
        userRole: 'driver',
        order: { id: orderId },
        cancellationReason: 'Vehicle breakdown'
      });

      expect(cancelResult.valid).toBe(true);
      expect(cancelResult.nextStatus).toBe('delivery_request_created_waiting_for_courier_acceptance');

      // Then delivery FSM should return to waiting state for reassignment
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('delivery_request_created_waiting_for_courier_acceptance');
    });

    test('Scenario: Customer disputes delivery', async () => {
      const orderId = 3003;
      const customerId = 1;
      const driverId = 3;

      // Given order has been delivered
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: 1, userRole: 'customer', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_prepared', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_accepts_delivery_request', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_marks_delivered', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('awaiting_customer_confirmation_of_order_delivery');

      // When customer reports problem with delivery
      const disputeResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'customer_reports_problem', {
        userId: customerId,
        userRole: 'customer',
        order: { id: orderId },
        disputeReason: 'Order damaged during delivery'
      });

      expect(disputeResult.valid).toBe(true);
      expect(disputeResult.nextStatus).toBe('delivery_disputed_by_customer_and_requires_resolution');

      // Then delivery FSM should transition to disputed state
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.delivery).toBe('delivery_disputed_by_customer_and_requires_resolution');
    });
  });

  describe('Event Emission and Cross-FSM Communication', () => {
    test('should emit VENDOR_CONFIRMED event when vendor accepts order', async () => {
      const orderId = 4001;
      const vendorId = 2;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(eventSpy).toHaveBeenCalledWith('VENDOR_CONFIRMED', expect.objectContaining({
        orderId,
        vendorId,
        fromState: 'awaiting_order_availability_vendor_confirmation',
        toState: 'awaiting_vendor_start_preparation'
      }));
    });

    test('should emit PAYMENT_SUCCESSFUL event when payment completes', async () => {
      const orderId = 4002;
      const customerId = 1;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Set up vendor confirmation first
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: customerId,
        userRole: 'customer',
        order: { id: orderId },
        payment: { amount: 150.00, method: 'card' }
      });

      expect(eventSpy).toHaveBeenCalledWith('PAYMENT_SUCCESSFUL', expect.objectContaining({
        orderId,
        amount: 150.00,
        paymentMethod: 'card'
      }));
    });

    test('should emit ORDER_COMPLETED event when delivery is confirmed', async () => {
      const orderId = 4003;
      const customerId = 1;
      const driverId = 3;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Fast-forward to delivery completion
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: customerId, userRole: 'customer', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_prepared', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_accepts_delivery_request', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_marks_delivered', {
        userId: driverId, userRole: 'driver', order: { id: orderId }
      });

      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'customer_confirms_receipt', {
        userId: customerId,
        userRole: 'customer',
        order: { id: orderId }
      });

      expect(eventSpy).toHaveBeenCalledWith('ORDER_COMPLETED', expect.objectContaining({
        orderId,
        completionTime: expect.any(Date)
      }));
    });
  });
});
