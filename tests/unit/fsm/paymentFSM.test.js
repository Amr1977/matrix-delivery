const { PaymentFSM } = require('../../backend/fsm/PaymentFSM');

describe('PaymentFSM', () => {
  let paymentFSM;
  let mockEventEmitter;

  beforeEach(() => {
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
        payment: { amount: 100, method: 'card' },
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
        metadata: { failureReason: 'Card declined' }
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
        metadata: { refundReason: 'Customer request' }
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
        payment: { retryCount: 1 },
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
  });
});
