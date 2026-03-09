const PaymentFSM = require('../../backend/fsm/PaymentFSM');

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

describe('PaymentFSM', () => {
  let paymentFSM;
  let mockEventEmitter;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    mockEventEmitter = {
      emit: jest.fn()
    };
    paymentFSM = new PaymentFSM(mockEventEmitter);
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      expect(paymentFSM.getInitialState()).toBe('payment_pending_for_customer');
    });
  });

  describe('Terminal States', () => {
    test('should identify terminal states correctly', () => {
      expect(paymentFSM.isTerminalState('payment_pending_for_customer')).toBe(false);
      expect(paymentFSM.isTerminalState('payment_successfully_received_and_verified_for_order')).toBe(true);
      expect(paymentFSM.isTerminalState('payment_has_been_refunded_to_customer')).toBe(true);
      expect(paymentFSM.isTerminalState('payment_attempt_failed_for_order')).toBe(true);
    });
  });

  describe('State Transitions', () => {
    test('should allow successful payment transition', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { amount: 100, method: 'card', currency: 'EGP' },
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('payment_successfully_received_and_verified_for_order');
      expect(paymentFSM.isTerminalState(result.nextStatus)).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PAYMENT_SUCCESSFUL', expect.any(Object));
    });

    test('should allow payment failure transition', async () => {
      const context = {
        userId: 1,
        userRole: 'system',
        order: { id: 123 },
        metadata: { failureReason: 'Card declined', failureCode: 'DECLINED' }
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'payment_attempt_failed_or_timed_out',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('payment_attempt_failed_for_order');
      expect(paymentFSM.isTerminalState(result.nextStatus)).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PAYMENT_FAILED', expect.any(Object));
    });

    test('should allow refund transition', async () => {
      const context = {
        userId: 1,
        userRole: 'admin',
        order: { id: 123 },
        metadata: { refundReason: 'Customer request', refundAmount: 100 }
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_successfully_received_and_verified_for_order',
        'admin_or_system_requests_refund',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('payment_has_been_refunded_to_customer');
      expect(paymentFSM.isTerminalState(result.nextStatus)).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PAYMENT_REFUNDED', expect.any(Object));
    });

    test('should allow payment retry transition', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { retryCount: 1, maxRetries: 3 },
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_attempt_failed_for_order',
        'customer_retries_payment',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('payment_pending_for_customer');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PAYMENT_RETRY_INITIATED', expect.any(Object));
    });

    test('should reject invalid transitions', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { amount: 100, method: 'card' },
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'admin_or_system_requests_refund',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });

    test('should reject transitions from terminal states', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_successfully_received_and_verified_for_order',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Terminal state');
    });
  });

  describe('Guard Conditions', () => {
    test('should enforce payment amount validation', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { amount: 0, method: 'card' } // Invalid amount
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce payment method validation', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { amount: 100, method: 'invalid_method' } // Invalid method
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce refund reason validation', async () => {
      const context = {
        userId: 1,
        userRole: 'admin',
        order: { id: 123 },
        metadata: {} // Missing refund reason
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_successfully_received_and_verified_for_order',
        'admin_or_system_requests_refund',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce retry attempts limit', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { retryCount: 5 }, // Exceeded retry limit
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_attempt_failed_for_order',
        'customer_retries_payment',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce order validity for retries', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 10); // 10 days ago - expired

      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123, created_at: oldDate.toISOString() },
        payment: { retryCount: 1 },
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_attempt_failed_for_order',
        'customer_retries_payment',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce actor role for refund', async () => {
      const context = {
        userId: 1,
        userRole: 'customer', // Wrong role for refund
        order: { id: 123 },
        metadata: { refundReason: 'Request refund' }
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_successfully_received_and_verified_for_order',
        'admin_or_system_requests_refund',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });
  });

  describe('Payment Initiation Check', () => {
    test('should allow payment initiation when vendor confirmed', () => {
      const order = {
        vendor_state: 'awaiting_vendor_start_preparation'
      };

      expect(paymentFSM.canInitiatePayment(order)).toBe(true);
    });

    test('should prevent payment initiation when vendor not confirmed', () => {
      const order = {
        vendor_state: 'awaiting_order_availability_vendor_confirmation'
      };

      expect(paymentFSM.canInitiatePayment(order)).toBe(false);
    });

    test('should prevent payment initiation when vendor rejected', () => {
      const order = {
        vendor_state: 'order_rejected_by_vendor'
      };

      expect(paymentFSM.canInitiatePayment(order)).toBe(false);
    });
  });

  describe('Event Emission', () => {
    test('should emit correct event data for successful payment', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { amount: 100, method: 'card', transactionId: 'TXN_123' },
        metadata: { gatewayResponse: 'success' }
      };

      await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'customer_completes_payment_successfully',
        context
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PAYMENT_SUCCESSFUL', {
        orderId: 123,
        fromState: 'payment_pending_for_customer',
        toState: 'payment_successfully_received_and_verified_for_order',
        actor: { userId: 1, role: 'customer' },
        metadata: { gatewayResponse: 'success' },
        payment: { amount: 100, method: 'card', transactionId: 'TXN_123' }
      });
    });

    test('should emit correct event data for payment failure', async () => {
      const context = {
        userId: 1,
        userRole: 'system',
        order: { id: 123 },
        metadata: { failureReason: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' }
      };

      await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'payment_attempt_failed_or_timed_out',
        context
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PAYMENT_FAILED', {
        orderId: 123,
        fromState: 'payment_pending_for_customer',
        toState: 'payment_attempt_failed_for_order',
        actor: { userId: 1, role: 'system' },
        metadata: { failureReason: 'Insufficient funds', errorCode: 'INSUFFICIENT_FUNDS' }
      });
    });
  });

  describe('Possible Events', () => {
    test('should return possible events for pending payment state', () => {
      const events = paymentFSM.getPossibleEvents('payment_pending_for_customer');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'customer_completes_payment_successfully',
          nextStatus: 'payment_successfully_received_and_verified_for_order'
        })
      );

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'payment_attempt_failed_or_timed_out',
          nextStatus: 'payment_attempt_failed_for_order'
        })
      );
    });

    test('should return possible events for successful payment state', () => {
      const events = paymentFSM.getPossibleEvents('payment_successfully_received_and_verified_for_order');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'admin_or_system_requests_refund',
          nextStatus: 'payment_has_been_refunded_to_customer'
        })
      );
    });

    test('should return possible events for failed payment state', () => {
      const events = paymentFSM.getPossibleEvents('payment_attempt_failed_for_order');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'customer_retries_payment',
          nextStatus: 'payment_pending_for_customer'
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle missing payment data gracefully', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        // Missing payment data
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should handle invalid payment method gracefully', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        payment: { amount: 100, method: null },
        metadata: {}
      };

      const result = await paymentFSM.validateAndTransition(
        'payment_pending_for_customer',
        'customer_completes_payment_successfully',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });
  });
});
