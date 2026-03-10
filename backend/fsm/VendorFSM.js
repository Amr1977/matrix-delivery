const { BaseOrderFSM } = require('./OrderFSMRegistry');
const EventEmitter = require('events');

/**
 * Vendor FSM - Handles vendor-side order lifecycle
 */
class VendorFSM extends BaseOrderFSM {
  constructor(eventEmitter, orderId = null) {
    super(eventEmitter, orderId);

    // Define terminal states
    this.terminalStates = new Set([
      'order_rejected_by_vendor',
      'order_cancelled_vendor_unresponsive'
    ]);

    // Define transitions
    this.defineTransitions();

    // Define guards
    this.defineGuards();

    // Set initial state
    this.setCurrentState(this.getInitialState());
  }

  getInitialState() {
    return 'awaiting_order_availability_vendor_confirmation';
  }

  defineTransitions() {
    // Vendor confirmation state transitions
    this.transitions.set('awaiting_order_availability_vendor_confirmation:vendor_accepts_order', {
      nextStatus: 'awaiting_vendor_start_preparation',
      guards: ['vendor_is_active', 'vendor_owns_store', 'order_not_expired'],
      emitEvent: 'VENDOR_CONFIRMED',
      description: 'Vendor confirms they can fulfill the order'
    });

    this.transitions.set('awaiting_order_availability_vendor_confirmation:vendor_rejects_order', {
      nextStatus: 'order_rejected_by_vendor',
      allowedRoles: ['vendor'],
      description: 'Vendor cannot fulfill the order'
    });

    // Preparation state transitions
    this.transitions.set('awaiting_vendor_start_preparation:vendor_starts_preparing', {
      nextStatus: 'vendor_is_actively_preparing_order',
      guards: ['vendor_is_active', 'order_not_cancelled'],
      emitEvent: 'PREPARATION_STARTED',
      description: 'Vendor begins preparing the order'
    });

    this.transitions.set('vendor_is_actively_preparing_order:vendor_marks_prepared', {
      nextStatus: 'order_is_fully_prepared_and_ready_for_delivery',
      guards: ['vendor_is_active', 'order_not_cancelled'],
      emitEvent: 'PREPARATION_COMPLETE',
      description: 'Vendor completes preparation and order is ready for pickup'
    });

    // Timeout transitions
    this.transitions.set('awaiting_order_availability_vendor_confirmation:timeout', {
      nextStatus: 'order_cancelled_vendor_unresponsive',
      emitEvent: 'VENDOR_TIMEOUT',
      description: 'Vendor did not respond within timeout period'
    });
  }

  defineGuards() {
    this.guards.set('vendor_is_active', (context) => {
      return context.vendor && context.vendor.is_active === true;
    });

    this.guards.set('vendor_owns_store', (context) => {
      return context.vendor && context.store &&
             context.store.vendor_id === context.vendor.id;
    });

    this.guards.set('order_not_expired', (context) => {
      if (!context.order || !context.order.created_at) return true;
      const orderAge = Date.now() - new Date(context.order.created_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      return orderAge < maxAge;
    });

    this.guards.set('order_not_cancelled', (context) => {
      return context.order && context.order.status !== 'cancelled';
    });
  }

  getTimeoutConfig(state) {
    switch (state) {
      case 'awaiting_order_availability_vendor_confirmation':
        return {
          duration: 15 * 60 * 1000, // 15 minutes
          event: 'timeout',
          description: 'Vendor confirmation timeout'
        };
      default:
        return null;
    }
  }

  async handleTimeout(state, timeoutConfig, context) {
    console.log(`Handling timeout for VendorFSM state: ${state}`);

    switch (state) {
      case 'awaiting_order_availability_vendor_confirmation':
        await this.executeTransition(state, 'timeout', context);
        break;
      default:
        console.warn(`Unhandled timeout for VendorFSM state: ${state}`);
    }
  }

  /**
   * Validate and execute transition, emitting events as needed
   */
  async validateAndTransition(currentStatus, event, context = {}) {
    const transitionResult = this.validateTransition(currentStatus, event, context);

    if (!transitionResult.valid) {
      return transitionResult;
    }

    const transition = transitionResult.transition;

    // Emit event if specified in transition
    if (transition.emitEvent && this.eventEmitter) {
      this.eventEmitter.emit(transition.emitEvent, {
        orderId: context.orderId,
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
   * Get all possible events from current status
   */
  getPossibleEvents(currentStatus) {
    const events = [];
    for (const [key, transition] of this.transitions) {
      const [fromStatus, event] = key.split(':');
      if (fromStatus === currentStatus) {
        events.push({
          event,
          description: transition.description,
          nextStatus: transition.nextStatus,
          allowedRoles: transition.allowedRoles
        });
      }
    }
    return events;
  }

  /**
   * Check if state is terminal
   */
  isTerminalState(status) {
    return this.terminalStates.has(status);
  }
}

module.exports = VendorFSM;
