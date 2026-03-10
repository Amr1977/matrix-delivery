const { BaseOrderFSM } = require('./OrderFSMRegistry');

/**
 * Payment FSM - Handles payment processing and lifecycle
 */
class PaymentFSM extends BaseOrderFSM {
  constructor(eventEmitter, orderId = null) {
    super(eventEmitter, orderId);

    // Define terminal states
    this.terminalStates = new Set([
      'payment_attempt_failed_for_order',
      'payment_has_been_refunded_to_customer'
    ]);

    // Define transitions
    this.defineTransitions();

    // Define guards
    this.defineGuards();

    // Set initial state
    this.setCurrentState(this.getInitialState());
  }

  getInitialState() {
    return 'payment_pending_for_customer';
  }

  defineTransitions() {
    // Payment processing transitions
    this.transitions.set('payment_pending_for_customer:customer_completes_payment', {
      nextStatus: 'payment_successfully_received_and_verified_for_order',
      guards: ['payment_method_valid', 'sufficient_funds', 'payment_gateway_available'],
      emitEvent: 'PAYMENT_SUCCESSFUL',
      description: 'Customer successfully completes payment'
    });

    this.transitions.set('payment_pending_for_customer:payment_fails', {
      nextStatus: 'payment_attempt_failed_for_order',
      description: 'Payment processing failed'
    });

    // Timeout transitions
    this.transitions.set('payment_pending_for_customer:timeout', {
      nextStatus: 'payment_attempt_failed_for_order',
      emitEvent: 'PAYMENT_TIMEOUT',
      description: 'Payment not completed within timeout period'
    });

    // Refund transitions
    this.transitions.set('payment_successfully_received_and_verified_for_order:initiate_refund', {
      nextStatus: 'payment_has_been_refunded_to_customer',
      guards: ['refund_eligible', 'payment_not_settled'],
      emitEvent: 'PAYMENT_REFUNDED',
      description: 'Payment is being refunded to customer'
    });

    // Additional failure transitions for edge cases
    this.transitions.set('payment_successfully_received_and_verified_for_order:payment_chargeback', {
      nextStatus: 'payment_has_been_refunded_to_customer',
      emitEvent: 'PAYMENT_CHARGEBACK',
      description: 'Customer initiated chargeback'
    });
  }

  defineGuards() {
    this.guards.set('payment_method_valid', (context) => {
      return context.payment && context.payment.method &&
             ['card', 'wallet', 'bank_transfer'].includes(context.payment.method);
    });

    this.guards.set('sufficient_funds', (context) => {
      if (!context.payment || !context.order) return false;
      return context.customer_balance >= context.order.total_amount;
    });

    this.guards.set('payment_gateway_available', (context) => {
      // In real implementation, this would check gateway status
      return true; // Assume gateway is available for testing
    });

    this.guards.set('refund_eligible', (context) => {
      // Refund window (e.g., within 30 days)
      if (!context.payment || !context.payment.completed_at) return false;
      const paymentAge = Date.now() - new Date(context.payment.completed_at).getTime();
      const refundWindow = 30 * 24 * 60 * 60 * 1000; // 30 days
      return paymentAge < refundWindow;
    });

    this.guards.set('payment_not_settled', (context) => {
      // Check if payment has been settled to vendor (can't refund after settlement)
      return context.payment && context.payment.settled === false;
    });
  }

  getTimeoutConfig(state) {
    switch (state) {
      case 'payment_pending_for_customer':
        return {
          duration: 10 * 60 * 1000, // 10 minutes
          event: 'timeout',
          description: 'Payment completion timeout'
        };
      default:
        return null;
    }
  }

  async handleTimeout(state, timeoutConfig, context) {
    console.log(`Handling timeout for PaymentFSM state: ${state}`);

    switch (state) {
      case 'payment_pending_for_customer':
        await this.executeTransition(state, 'timeout', context);
        break;
      default:
        console.warn(`Unhandled timeout for PaymentFSM state: ${state}`);
    }
  }

  /**
   * Validate and execute transition with payment-specific logic
   */
  async validateAndTransition(currentStatus, event, context = {}) {
    const transitionResult = this.validateTransition(currentStatus, event, context);

    if (!transitionResult.valid) {
      return transitionResult;
    }

    const transition = transitionResult.transition;

    // Payment-specific logic
    if (event === 'customer_completes_payment' && transitionResult.valid) {
      // Additional payment processing logic could go here
      console.log('Payment validation successful, processing payment...');
    }

    // Emit event if specified in transition
    if (transition.emitEvent && this.eventEmitter) {
      this.eventEmitter.emit(transition.emitEvent, {
        orderId: context.orderId,
        paymentId: context.paymentId,
        amount: context.amount,
        fromState: currentStatus,
        toState: transitionResult.nextStatus,
        event,
        actor: context.userId,
        actorRole: context.userRole,
        timestamp: new Date(),
        metadata: context.metadata || {}
      });
    }

    return transitionResult;
  }

  /**
   * Get payment retry attempts (for future retry logic)
   */
  getRetryAttempts() {
    return this.retryAttempts || 0;
  }

  /**
   * Increment retry attempts
   */
  incrementRetryAttempts() {
    this.retryAttempts = (this.retryAttempts || 0) + 1;
  }

  /**
   * Check if payment can be retried
   */
  canRetryPayment() {
    const maxRetries = 3;
    return this.getRetryAttempts() < maxRetries;
  }
}

module.exports = PaymentFSM;
