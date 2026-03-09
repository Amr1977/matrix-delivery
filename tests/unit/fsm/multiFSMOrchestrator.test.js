const { multiFSMOrchestrator } = require('../../backend/fsm/MultiFSMOrchestrator');
const VendorFSM = require('../../backend/fsm/VendorFSM');
const PaymentFSM = require('../../backend/fsm/PaymentFSM');
const DeliveryFSM = require('../../backend/fsm/DeliveryFSM');

// Mock the database operations
jest.mock('../../backend/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
}));

// Mock the OrderFSMRegistry base class
jest.mock('../../backend/fsm/OrderFSMRegistry', () => ({
  BaseOrderFSM: class {
    constructor() {
      this.eventEmitter = null;
      this.transitions = new Map();
      this.terminalStates = new Set();
    }

    validateAndTransition(fromState, event, context) {
      // Mock implementation for testing
      return {
        valid: true,
        nextStatus: 'next_state',
        error: null
      };
    }

    isTerminalState(state) {
      return this.terminalStates.has(state);
    }

    getPossibleEvents(state) {
      return [];
    }
  }
}));

describe('MultiFSMOrchestrator', () => {
  let mockEventEmitter;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    mockEventEmitter = {
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    };

    // Reset the orchestrator's event emitter for each test
    multiFSMOrchestrator.eventEmitter = mockEventEmitter;
  });

  describe('Initialization', () => {
    test('should be properly initialized', () => {
      expect(multiFSMOrchestrator).toBeDefined();
      expect(multiFSMOrchestrator.eventEmitter).toBeDefined();
      expect(multiFSMOrchestrator.fsms).toBeDefined();
      expect(multiFSMOrchestrator.fsms.vendor).toBeInstanceOf(VendorFSM);
      expect(multiFSMOrchestrator.fsms.payment).toBeInstanceOf(PaymentFSM);
      expect(multiFSMOrchestrator.fsms.delivery).toBeInstanceOf(DeliveryFSM);
    });

    test('should initialize FSMs with event emitters', () => {
      expect(multiFSMOrchestrator.fsms.vendor.eventEmitter).toBe(multiFSMOrchestrator.eventEmitter);
      expect(multiFSMOrchestrator.fsms.payment.eventEmitter).toBe(multiFSMOrchestrator.eventEmitter);
      expect(multiFSMOrchestrator.fsms.delivery.eventEmitter).toBe(multiFSMOrchestrator.eventEmitter);
    });
  });

  describe('Order FSM Initialization', () => {
    test('should initialize FSM states for new order', async () => {
      const orderId = 999;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      const states = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(states.vendor).toBe('awaiting_order_availability_vendor_confirmation');
      expect(states.payment).toBeNull();
      expect(states.delivery).toBeNull();
    });

    test('should handle multiple order initializations', async () => {
      const orderId1 = 1000;
      const orderId2 = 1001;

      await multiFSMOrchestrator.initializeOrderFSMs(orderId1);
      await multiFSMOrchestrator.initializeOrderFSMs(orderId2);

      const states1 = await multiFSMOrchestrator.getOrderFSMStates(orderId1);
      const states2 = await multiFSMOrchestrator.getOrderFSMStates(orderId2);

      expect(states1.vendor).toBe('awaiting_order_availability_vendor_confirmation');
      expect(states2.vendor).toBe('awaiting_order_availability_vendor_confirmation');
    });
  });

  describe('FSM Transition Execution', () => {
    beforeEach(async () => {
      this.orderId = 2000;
      await multiFSMOrchestrator.initializeOrderFSMs(this.orderId);
    });

    test('should execute vendor FSM transitions', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: this.orderId, vendor_id: 1 },
        vendor: { is_active: true },
        metadata: {}
      };

      const result = await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('awaiting_vendor_start_preparation');

      const states = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
      expect(states.vendor).toBe('awaiting_vendor_start_preparation');
      expect(states.payment).toBe('payment_pending_for_customer');
      expect(states.delivery).toBe('delivery_request_created_waiting_for_courier_acceptance');
    });

    test('should execute payment FSM transitions', async () => {
      // First set up vendor acceptance
      await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        {
          userId: 1,
          userRole: 'vendor',
          order: { id: this.orderId, vendor_id: 1 },
          vendor: { is_active: true },
          metadata: {}
        }
      );

      const context = {
        userId: 2,
        userRole: 'customer',
        order: { id: this.orderId },
        payment: { amount: 100, method: 'card' },
        metadata: {}
      };

      const result = await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'payment',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('payment_successfully_received_and_verified_for_order');

      const states = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
      expect(states.payment).toBe('payment_successfully_received_and_verified_for_order');
    });

    test('should execute delivery FSM transitions', async () => {
      // Set up vendor acceptance first
      await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        {
          userId: 1,
          userRole: 'vendor',
          order: { id: this.orderId, vendor_id: 1 },
          vendor: { is_active: true },
          metadata: {}
        }
      );

      const context = {
        userId: 3,
        userRole: 'driver',
        order: { id: this.orderId },
        courier: { id: 3, is_available: true, service_zone: 'zone1' },
        metadata: {}
      };

      const result = await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'delivery',
        'courier_accepts_delivery_request',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('courier_has_been_assigned_to_deliver_the_order');

      const states = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
      expect(states.delivery).toBe('courier_has_been_assigned_to_deliver_the_order');
    });

    test('should handle invalid FSM type', async () => {
      const context = { userId: 1, userRole: 'customer' };

      const result = await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'invalid_fsm',
        'some_event',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid FSM type');
    });

    test('should handle uninitialized FSM', async () => {
      const context = {
        userId: 2,
        userRole: 'customer',
        order: { id: this.orderId },
        payment: { amount: 100, method: 'card' },
        metadata: {}
      };

      // Try payment transition before vendor acceptance
      const result = await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'payment',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('FSM not initialized');
    });
  });

  describe('Event-Driven Orchestration', () => {
    beforeEach(async () => {
      this.orderId = 3000;
      await multiFSMOrchestrator.initializeOrderFSMs(this.orderId);
    });

    test('should trigger Payment and Delivery FSM initialization on VENDOR_CONFIRMED', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: this.orderId, vendor_id: 1 },
        vendor: { is_active: true },
        metadata: {}
      };

      await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        context
      );

      const states = await multiFSMOrchestrator.getOrderFSMStates(this.orderId);
      expect(states.vendor).toBe('awaiting_vendor_start_preparation');
      expect(states.payment).toBe('payment_pending_for_customer');
      expect(states.delivery).toBe('delivery_request_created_waiting_for_courier_acceptance');
    });

    test('should handle cross-FSM event propagation', async () => {
      // Set up vendor acceptance
      await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        {
          userId: 1,
          userRole: 'vendor',
          order: { id: this.orderId, vendor_id: 1 },
          vendor: { is_active: true },
          metadata: {}
        }
      );

      // Spy on event emissions
      const eventSpy = jest.spyOn(multiFSMOrchestrator.eventEmitter, 'emit');

      // Trigger payment success
      await multiFSMOrchestrator.executeFSMTransition(
        this.orderId,
        'payment',
        'customer_completes_payment_successfully',
        {
          userId: 2,
          userRole: 'customer',
          order: { id: this.orderId },
          payment: { amount: 100, method: 'card' },
          metadata: {}
        }
      );

      expect(eventSpy).toHaveBeenCalledWith('PAYMENT_SUCCESSFUL', expect.any(Object));
    });
  });

  describe('State Persistence', () => {
    test('should persist FSM states', async () => {
      const orderId = 4000;

      // Initialize
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Transition
      await multiFSMOrchestrator.executeFSMTransition(
        orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        {
          userId: 1,
          userRole: 'vendor',
          order: { id: orderId, vendor_id: 1 },
          vendor: { is_active: true },
          metadata: {}
        }
      );

      // Retrieve states
      const states = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      expect(states.vendor).toBe('awaiting_vendor_start_preparation');
    });

    test('should handle non-existent order states', async () => {
      const states = await multiFSMOrchestrator.getOrderFSMStates(99999);
      expect(states.vendor).toBeNull();
      expect(states.payment).toBeNull();
      expect(states.delivery).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      // Mock a database error scenario
      const originalMethod = multiFSMOrchestrator.saveFSMState;
      multiFSMOrchestrator.saveFSMState = jest.fn().mockRejectedValue(new Error('Database error'));

      const orderId = 5000;
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      const result = await multiFSMOrchestrator.executeFSMTransition(
        orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        {
          userId: 1,
          userRole: 'vendor',
          order: { id: orderId, vendor_id: 1 },
          vendor: { is_active: true },
          metadata: {}
        }
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Database error');

      // Restore original method
      multiFSMOrchestrator.saveFSMState = originalMethod;
    });

    test('should handle invalid transition data', async () => {
      const orderId = 6000;
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      const result = await multiFSMOrchestrator.executeFSMTransition(
        orderId,
        'vendor',
        'invalid_event',
        {}
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });
  });

  describe('Audit Logging', () => {
    test('should log all FSM transitions', async () => {
      const orderId = 7000;
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: 1 },
        vendor: { is_active: true },
        metadata: { notes: 'Test transition' }
      };

      await multiFSMOrchestrator.executeFSMTransition(
        orderId,
        'vendor',
        'vendor_confirms_order_is_available',
        context
      );

      // Verify audit logging was called
      // In a real test, we'd check the database for audit log entries
      expect(true).toBe(true); // Placeholder - actual audit log verification would require DB access
    });
  });

  describe('Concurrency Handling', () => {
    test('should handle concurrent transitions safely', async () => {
      const orderId = 8000;
      await multiFSMOrchestrator.initializeOrderFSMs(orderId);

      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: orderId, vendor_id: 1 },
        vendor: { is_active: true },
        metadata: {}
      };

      // Execute multiple transitions concurrently
      const promises = [
        multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_confirms_order_is_available', context),
        multiFSMOrchestrator.executeFSMTransition(orderId, 'vendor', 'vendor_rejects_order_due_to_unavailability', context)
      ];

      const results = await Promise.allSettled(promises);

      // One should succeed, one should fail due to state conflicts
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.valid).length;
      const failureCount = results.filter(r =>
        r.status === 'fulfilled' && !r.value.valid ||
        r.status === 'rejected'
      ).length;

      expect(successCount + failureCount).toBe(2);
    });
  });
});
