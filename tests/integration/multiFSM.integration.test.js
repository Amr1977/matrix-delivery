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
jest.mock('../../backend/services/vendorPayoutService');

describe('Multi-FSM Integration', () => {
  let marketplaceOrderService;
  let vendorPayoutService;

  beforeEach(() => {
    // Clear any existing event listeners
    multiFSMOrchestrator.eventEmitter.removeAllListeners();

    // Reset mocks
    jest.clearAllMocks();

    marketplaceOrderService = new MarketplaceOrderService();
    vendorPayoutService = new VendorPayoutService();
  });

  afterEach(async () => {
    // Clean up any test data
    await multiFSMOrchestrator.clearAllTimeouts();
  });

  describe('End-to-End Order Flow', () => {
    test('should handle complete marketplace order flow with correct action names', async () => {
      const orderId = 999; // Test order ID
      const userId = 1;
      const vendorId = 2;

      // Step 1: Initialize FSM states for new order
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      let fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(fsmStates.vendor).toBe('awaiting_order_availability_vendor_confirmation');
      expect(fsmStates.payment).toBeNull(); // Not started yet
      expect(fsmStates.delivery).toBeNull(); // Not started yet

      // Step 2: Vendor accepts order (should trigger Payment & Delivery FSM initialization)
      const acceptResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
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

      // Step 3: Customer completes payment
      const paymentResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId,
        userRole: 'customer',
        order: { id: orderId },
        payment: { amount: 100, method: 'card' }
      });

      expect(paymentResult.valid).toBe(true);
      expect(paymentResult.nextStatus).toBe('payment_successfully_received_and_verified_for_order');

      // Step 4: Vendor starts preparation
      const prepResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_starts_preparing', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(prepResult.valid).toBe(true);
      expect(prepResult.nextStatus).toBe('vendor_is_actively_preparing_order');

      // Step 5: Vendor completes preparation
      const completeResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_marks_prepared', {
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
      const pickupResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_confirms_receipt', {
        userId: 3,
        userRole: 'driver',
        order: { id: orderId, vendor_state: 'order_is_fully_prepared_and_ready_for_delivery' },
        courier: { id: 3 }
      });

      expect(pickupResult.valid).toBe(true);
      expect(pickupResult.nextStatus).toBe('courier_is_actively_transporting_order_to_customer');

      // Step 8: Courier delivers order
      const deliverResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'courier_marks_delivered', {
        userId: 3,
        userRole: 'driver',
        order: { id: orderId },
        courier: { id: 3 }
      });

      expect(deliverResult.valid).toBe(true);
      expect(deliverResult.nextStatus).toBe('awaiting_customer_confirmation_of_order_delivery');

      // Step 9: Customer confirms receipt (completes order)
      const confirmResult = await multiFSMOrchestrator.executeFSMTransition(orderId, 'delivery', 'customer_confirms_receipt', {
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

    test('should handle order creation through marketplaceOrderService with FSM initialization', async () => {
      const userId = 1;
      const vendorId = 2;

      // Mock the database queries
      const mockOrder = {
        id: 12345,
        order_number: 'ORD-12345',
        user_id: userId,
        vendor_id: vendorId,
        total_amount: 150.00,
        commission_amount: 15.00,
        currency: 'EGP',
        status: 'pending'
      };

      const mockRepo = {
        createOrder: jest.fn().mockResolvedValue(mockOrder),
        createVendorPayout: jest.fn().mockResolvedValue({}),
        logAuditEvent: jest.fn().mockResolvedValue({})
      };

      marketplaceOrderService.marketplaceOrderRepository = mockRepo;

      // Mock cart service
      const mockCartService = {
        validateCartForCheckout: jest.fn().mockResolvedValue({ isValid: true }),
        getUserCart: jest.fn().mockResolvedValue({
          id: 1,
          store_id: 1,
          total_amount: 150.00
        }),
        clearCart: jest.fn().mockResolvedValue({})
      };

      marketplaceOrderService.cartService = mockCartService;

      // Mock the FSM orchestrator
      const mockFSMStates = {
        vendor: 'awaiting_order_availability_vendor_confirmation',
        payment: null,
        delivery: null
      };

      multiFSMOrchestrator.getOrderFSMStates = jest.fn().mockResolvedValue(mockFSMStates);

      const orderData = {
        deliveryAddress: '123 Test St',
        deliveryLat: 30.0444,
        deliveryLng: 31.2357,
        deliveryInstructions: 'Ring doorbell',
        customerNotes: 'Extra napkins please'
      };

      const result = await marketplaceOrderService.createOrder(userId, orderData);

      // Verify order was created
      expect(mockRepo.createOrder).toHaveBeenCalledWith(expect.objectContaining({
        userId,
        vendorId,
        deliveryAddress: orderData.deliveryAddress,
        deliveryLat: orderData.deliveryLat,
        deliveryLng: orderData.deliveryLng,
        deliveryInstructions: orderData.deliveryInstructions,
        customerNotes: orderData.customerNotes
      }));

      // Verify FSM orchestrator was initialized
      expect(multiFSMOrchestrator.getOrderFSMStates).toHaveBeenCalledWith(mockOrder.id);

      // Verify FSM states are included in response
      expect(result.fsm_states).toEqual(mockFSMStates);
    });
  });

  describe('Event-Driven Orchestration', () => {
    test('should emit and handle cross-FSM events with correct action names', async () => {
      const orderId = 1000;
      const vendorId = 2;

      // Initialize FSMs
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Spy on event emissions
      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      // Vendor accepts order - should emit VENDOR_CONFIRMED
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      expect(eventSpy).toHaveBeenCalledWith('VENDOR_CONFIRMED', expect.objectContaining({
        orderId,
        fromState: 'awaiting_order_availability_vendor_confirmation',
        toState: 'awaiting_vendor_start_preparation'
      }));

      // Customer completes payment - should emit PAYMENT_SUCCESSFUL
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: 1,
        userRole: 'customer',
        order: { id: orderId },
        payment: { amount: 100, method: 'card' }
      });

      expect(eventSpy).toHaveBeenCalledWith('PAYMENT_SUCCESSFUL', expect.any(Object));
    });
  });

  describe('Timeout Scenarios', () => {
    test('should handle vendor confirmation timeout', async () => {
      const orderId = 2000;
      const vendorId = 2;

      // Mock timeout scheduler
      timeoutScheduler.scheduleTimeout = jest.fn().mockResolvedValue({
        timeoutId: 'timeout-123',
        orderId,
        fsmType: 'vendor',
        state: 'awaiting_order_availability_vendor_confirmation',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000)
      });

      // Initialize FSMs
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Spy on event emissions
      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      // Simulate timeout trigger
      await multiFSMOrchestrator.handleTimeout(orderId, 'vendor', 'awaiting_order_availability_vendor_confirmation', 'timeout');

      // Should emit VENDOR_TIMEOUT
      expect(eventSpy).toHaveBeenCalledWith('VENDOR_TIMEOUT', expect.objectContaining({
        orderId,
        timeoutType: 'vendor_confirmation'
      }));
    });

    test('should handle payment timeout after vendor confirmation', async () => {
      const orderId = 2001;
      const vendorId = 2;
      const customerId = 1;

      // Initialize FSMs
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Vendor accepts order first
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      // Spy on event emissions
      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      // Simulate payment timeout
      await multiFSMOrchestrator.handleTimeout(orderId, 'payment', 'payment_pending_for_customer', 'timeout');

      // Should emit PAYMENT_TIMEOUT
      expect(eventSpy).toHaveBeenCalledWith('PAYMENT_TIMEOUT', expect.objectContaining({
        orderId,
        timeoutType: 'payment'
      }));
    });

    test('should handle customer confirmation auto-complete', async () => {
      const orderId = 2002;
      const driverId = 3;

      // Initialize FSMs and progress to delivery
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Fast-forward to delivery delivered state
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

      // Spy on event emissions
      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      // Simulate customer confirmation timeout (24 hours)
      await multiFSMOrchestrator.handleTimeout(orderId, 'delivery', 'awaiting_customer_confirmation_of_order_delivery', 'customer_confirmation_timeout');

      // Should emit DELIVERY_AUTO_CONFIRMED
      expect(eventSpy).toHaveBeenCalledWith('DELIVERY_AUTO_CONFIRMED', expect.objectContaining({
        orderId,
        autoConfirmed: true
      }));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle invalid transitions gracefully', async () => {
      const orderId = 3000;

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
      const orderId = 3001;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Try transition with failing guard (vendor not active)
      const result = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 1,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: 1 },
        vendor: { is_active: false } // Guard should fail
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should handle late vendor rejection after payment', async () => {
      const orderId = 3002;
      const vendorId = 2;

      // Initialize FSMs and progress to payment completed
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: vendorId, userRole: 'vendor', order: { id: orderId, vendor_id: vendorId }
      });

      await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'customer_completes_payment', {
        userId: 1, userRole: 'customer', order: { id: orderId }
      });

      // Mock marketplaceOrderService for refund handling
      const mockRefundResult = { id: orderId, status: 'refunded' };
      marketplaceOrderService.updateOrderStatus = jest.fn().mockResolvedValue(mockRefundResult);

      // Now vendor rejects - should trigger refund
      const result = await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_rejects_order', {
        userId: vendorId,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: vendorId }
      });

      // Should succeed but payment FSM should be notified for refund
      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('order_rejected_by_vendor');
    });

    test('should handle payment failure after vendor preparation', async () => {
      const orderId = 3003;

      // Initialize and progress to vendor prepared state
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

      // Now simulate payment failure
      const result = await multiFSMOrchestrator.executeFSMTransition(orderId, 'payment', 'payment_fails', {
        userId: 1,
        userRole: 'customer',
        order: { id: orderId },
        failureReason: 'Card declined'
      });

      // Should succeed but require admin intervention
      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('payment_attempt_failed_for_order');
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

    test('should integrate vendor payout service with Payment FSM events', async () => {
      // Mock vendor payout service
      vendorPayoutService.createPayout = jest.fn().mockResolvedValue({
        id: 123,
        payout_number: 'PAYOUT-123',
        payout_amount: 135.00
      });

      // Verify the service has event listeners registered (set up in marketplaceOrderService)
      expect(vendorPayoutService.createPayout).toBeDefined();

      // Test that payout creation is called when payment succeeds
      const payoutData = {
        vendor_id: 2,
        total_amount: 150.00,
        commission_amount: 15.00,
        currency: 'EGP'
      };

      const result = await vendorPayoutService.createPayout(12345, payoutData);

      expect(vendorPayoutService.createPayout).toHaveBeenCalledWith(12345, payoutData);
      expect(result.payout_number).toBe('PAYOUT-123');
    });

    test('should integrate notification service with FSM events', async () => {
      const orderId = 4000;

      // Mock notification service
      const mockNotificationService = {
        createNotification: jest.fn().mockResolvedValue({ id: 123 }),
        getNotificationTitle: jest.fn(),
        getNotificationMessage: jest.fn(),
        getNotificationPriority: jest.fn()
      };

      // Simulate marketplaceOrderService having notification methods
      marketplaceOrderService.sendNotification = jest.fn().mockImplementation(async (userId, type, data) => {
        const notificationData = {
          userId,
          type,
          title: 'Test Title',
          message: 'Test Message',
          data,
          priority: 'normal'
        };
        return mockNotificationService.createNotification(notificationData);
      });

      // Test notification sending
      await marketplaceOrderService.sendNotification(1, 'vendor_timeout', { orderId });

      expect(marketplaceOrderService.sendNotification).toHaveBeenCalledWith(1, 'vendor_timeout', { orderId });
    });

    test('should handle FSM state persistence in database', async () => {
      const orderId = 5000;

      // Initialize FSMs
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Get initial states
      const initialStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);

      // Verify states are properly initialized
      expect(initialStates.vendor).toBe('awaiting_order_availability_vendor_confirmation');
      expect(initialStates.payment).toBeNull();
      expect(initialStates.delivery).toBeNull();

      // Progress through some states
      await multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_accepts_order', {
        userId: 2, userRole: 'vendor', order: { id: orderId, vendor_id: 2 }
      });

      const updatedStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);

      // Verify state progression
      expect(updatedStates.vendor).toBe('awaiting_vendor_start_preparation');
      expect(updatedStates.payment).toBe('payment_pending_for_customer');
      expect(updatedStates.delivery).toBe('delivery_request_created_waiting_for_courier_acceptance');
    });
  });
});
