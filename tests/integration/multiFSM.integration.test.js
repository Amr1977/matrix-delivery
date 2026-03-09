const { multiFSMOrchestrator } = require('../../backend/fsm/MultiFSMOrchestrator');
const MarketplaceOrderService = require('../../backend/services/marketplaceOrderService');
const VendorPayoutService = require('../../backend/services/vendorPayoutService');

describe('Multi-FSM Integration', () => {
  let marketplaceOrderService;
  let vendorPayoutService;

  beforeEach(() => {
    // Clear any existing event listeners
    multiFSMOrchestrator.eventEmitter.removeAllListeners();

    marketplaceOrderService = new MarketplaceOrderService();
    vendorPayoutService = new VendorPayoutService();
  });

  describe('End-to-End Order Flow', () => {
    test('should handle complete marketplace order flow', async () => {
      const orderId = 999; // Test order ID
      const userId = 1;
      const vendorId = 2;

      // Step 1: Initialize FSM states for new order
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('awaiting_order_availability_vendor_confirmation');
      expect(fsmStates.payment).toBeNull(); // Not started yet
      expect(fsmStates.delivery).toBeNull(); // Not started yet

      // Step 2: Vendor confirms order (should trigger Payment & Delivery FSM initialization)
      const acceptResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_confirms_order_is_available', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(acceptResult.valid).toBe(true);
      expect(acceptResult.nextStatus).toBe('awaiting_vendor_start_preparation');

      // Check that Payment and Delivery FSMs were initialized
      fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('awaiting_vendor_start_preparation');
      expect(fsmStates.payment).toBe('payment_pending_for_customer');
      expect(fsmStates.delivery).toBe('delivery_request_created_waiting_for_courier_acceptance');

      // Step 3: Customer confirms payment
      const paymentResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment_successfully', {
        userId,
        userRole: 'customer',
        order: { id: orderId },
        payment: { amount: 100, method: 'card' }
      });

      expect(paymentResult.valid).toBe(true);
      expect(paymentResult.nextStatus).toBe('payment_successfully_received_and_verified_for_order');

      // Step 4: Vendor starts preparation
      const prepResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_starts_preparing_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(prepResult.valid).toBe(true);
      expect(prepResult.nextStatus).toBe('vendor_is_actively_preparing_order');

      // Step 5: Vendor completes preparation
      const completeResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_order_as_fully_prepared', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(completeResult.valid).toBe(true);
      expect(completeResult.nextStatus).toBe('order_is_fully_prepared_and_ready_for_delivery');

      // Step 6: Courier accepts delivery
      const courierResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_accepts_delivery_request', {
        userId: 3, // Courier ID
        userRole: 'driver',
        order: { id: orderId },
        courier: { id: 3, is_available: true, service_zone: 'zone1' }
      });

      expect(courierResult.valid).toBe(true);
      expect(courierResult.nextStatus).toBe('courier_has_been_assigned_to_deliver_the_order');

      // Step 7: Courier picks up order
      const pickupResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_confirms_receipt_of_order_from_vendor', {
        userId: 3,
        userRole: 'driver',
        order: { id: orderId, vendor_state: 'order_is_fully_prepared_and_ready_for_delivery' },
        courier: { id: 3 }
      });

      expect(pickupResult.valid).toBe(true);
      expect(pickupResult.nextStatus).toBe('courier_is_actively_transporting_order_to_customer');

      // Step 8: Courier delivers order
      const deliverResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_marks_order_as_delivered_to_customer', {
        userId: 3,
        userRole: 'driver',
        order: { id: orderId },
        courier: { id: 3 }
      });

      expect(deliverResult.valid).toBe(true);
      expect(deliverResult.nextStatus).toBe('awaiting_customer_confirmation_of_order_delivery');

      // Step 9: Customer confirms receipt (completes order)
      const confirmResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'customer_confirms_receipt_of_order', {
        userId,
        userRole: 'customer',
        order: { id: orderId, delivery_state: 'awaiting_customer_confirmation_of_order_delivery' }
      });

      expect(confirmResult.valid).toBe(true);
      expect(confirmResult.nextStatus).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');

      // Verify final states
      const finalStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(finalStates.vendor).toBe('order_is_fully_prepared_and_ready_for_delivery');
      expect(finalStates.payment).toBe('payment_successfully_received_and_verified_for_order');
      expect(finalStates.delivery).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');
    });
  });

  describe('Event-Driven Orchestration', () => {
    test('should emit and handle cross-FSM events', async () => {
      const orderId = 1000;
      const vendorId = 2;

      // Initialize FSMs
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Spy on event emissions
      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      // Vendor confirms order - should emit VENDOR_CONFIRMED
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_confirms_order_is_available', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(eventSpy).toHaveBeenCalledWith('VENDOR_CONFIRMED', expect.objectContaining({
        orderId,
        fromState: 'awaiting_order_availability_vendor_confirmation',
        toState: 'awaiting_vendor_start_preparation'
      }));

      // Vendor starts preparation - should emit PREPARATION_STARTED
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_starts_preparing_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(eventSpy).toHaveBeenCalledWith('PREPARATION_STARTED', expect.any(Object));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid transitions gracefully', async () => {
      const orderId = 1001;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Try invalid transition
      const result = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'invalid_action', {
        userId: 1,
        userRole: 'vendor',
        order: { id: orderId }
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    test('should handle guard failures', async () => {
      const orderId = 1002;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Try transition with failing guard (vendor not active)
      const result = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_confirms_order_is_available', {
        userId: 1,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: 1 },
        vendor: { is_active: false } // Guard should fail
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });
  });

  describe('Service Layer Integration', () => {
    test('should integrate marketplace order service with multi-FSM', async () => {
      // This would require mocking the database and other dependencies
      // For now, just verify the service has the expected methods
      expect(typeof marketplaceOrderService.updateOrderStatus).toBe('function');
      expect(typeof marketplaceOrderService.mapActionToFSMType).toBe('function');
      expect(typeof marketplaceOrderService.handleLateVendorRejection).toBe('function');
    });

    test('should integrate vendor payout service with Payment FSM', async () => {
      // Verify the service has event listeners registered
      expect(multiFSMOrchestrator.eventEmitter.listenerCount('PAYMENT_SUCCESSFUL')).toBeGreaterThan(0);
      expect(multiFSMOrchestrator.eventEmitter.listenerCount('PAYMENT_REFUNDED')).toBeGreaterThan(0);
      expect(multiFSMOrchestrator.eventEmitter.listenerCount('PAYMENT_FAILED')).toBeGreaterThan(0);
    });
  });
});
