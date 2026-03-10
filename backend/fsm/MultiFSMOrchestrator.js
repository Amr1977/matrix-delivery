const EventEmitter = require('events');
const VendorFSM = require('./VendorFSM');
const PaymentFSM = require('./PaymentFSM');
const DeliveryFSM = require('./DeliveryFSM');

/**
 * MultiFSMOrchestrator - Coordinates event-driven orchestration between
 * Vendor, Payment, and Delivery FSMs for complete order lifecycle management
 */
class MultiFSMOrchestrator extends EventEmitter {
  constructor(orderId = null) {
    super();
    this.orderId = orderId;
    this.fsms = {};
    this.eventSubscriptions = new Map();
    this.auditLog = [];
    this.stateSnapshot = {};

    // Initialize FSMs
    this.initializeFSMs();

    // Set up event orchestration
    this.setupEventOrchestration();

    // Take initial state snapshot
    this.takeStateSnapshot();
  }

  /**
   * Initialize the three FSMs
   */
  initializeFSMs() {
    // Create FSMs with this orchestrator as the event emitter
    this.fsms.vendor = new VendorFSM(this, this.orderId);
    this.fsms.payment = new PaymentFSM(this, this.orderId);
    this.fsms.delivery = new DeliveryFSM(this, this.orderId);

    console.log(`MultiFSMOrchestrator initialized for order ${this.orderId}`);
  }

  /**
   * Set up event-driven orchestration between FSMs
   */
  setupEventOrchestration() {
    // Vendor FSM events that trigger other FSMs
    this.setupVendorEventHandlers();

    // Payment FSM events that trigger other FSMs
    this.setupPaymentEventHandlers();

    // Delivery FSM events that complete the order
    this.setupDeliveryEventHandlers();

    // Cross-FSM coordination events
    this.setupCrossFSMCoordination();
  }

  /**
   * Set up Vendor FSM event handlers
   */
  setupVendorEventHandlers() {
    // When vendor confirms order, initialize Payment and Delivery FSMs
    this.on('VENDOR_CONFIRMED', async (eventData) => {
      console.log('VENDOR_CONFIRMED: Initializing Payment and Delivery FSMs');

      try {
        // Payment FSM should already be initialized when vendor accepts
        // But ensure Delivery FSM is initialized
        if (this.fsms.delivery.getCurrentState() === this.fsms.delivery.getInitialState()) {
          // Delivery FSM is already initialized in constructor, just log
          console.log('Delivery FSM ready for courier assignment');
        }

        // Log orchestration event
        this.logAuditEvent('ORCHESTRATION', 'VENDOR_CONFIRMED → Payment+Delivery FSMs initialized', eventData);

      } catch (error) {
        console.error('Error in VENDOR_CONFIRMED orchestration:', error);
        this.emit('ORCHESTRATION_ERROR', { error: error.message, event: 'VENDOR_CONFIRMED' });
      }
    });

    // When vendor completes preparation, enable delivery pickup
    this.on('PREPARATION_COMPLETE', async (eventData) => {
      console.log('PREPARATION_COMPLETE: Enabling delivery pickup');

      // Delivery pickup can now proceed (guards will check vendor preparation status)
      this.logAuditEvent('ORCHESTRATION', 'PREPARATION_COMPLETE → Delivery pickup enabled', eventData);
    });
  }

  /**
   * Set up Payment FSM event handlers
   */
  setupPaymentEventHandlers() {
    // When payment is successful, create payout and enable vendor preparation
    this.on('PAYMENT_SUCCESSFUL', async (eventData) => {
      console.log('PAYMENT_SUCCESSFUL: Creating vendor payout and enabling preparation');

      try {
        // Vendor can now start preparation
        if (this.fsms.vendor.getCurrentState() === 'awaiting_vendor_start_preparation') {
          console.log('Vendor preparation can now begin');
        }

        // Payout will be created by payment service (handled in step definitions)
        this.logAuditEvent('ORCHESTRATION', 'PAYMENT_SUCCESSFUL → Payout created, vendor preparation enabled', eventData);

      } catch (error) {
        console.error('Error in PAYMENT_SUCCESSFUL orchestration:', error);
        this.emit('ORCHESTRATION_ERROR', { error: error.message, event: 'PAYMENT_SUCCESSFUL' });
      }
    });
  }

  /**
   * Set up Delivery FSM event handlers
   */
  setupDeliveryEventHandlers() {
    // When delivery is confirmed, complete the order
    this.on('DELIVERY_CONFIRMED', async (eventData) => {
      console.log('DELIVERY_CONFIRMED: Order completed successfully');

      // Order is now complete - all FSMs should be in terminal states
      this.logAuditEvent('ORCHESTRATION', 'DELIVERY_CONFIRMED → Order completed', eventData);

      // Emit final order completion event
      this.emit('ORDER_COMPLETED', {
        orderId: this.orderId,
        completionTime: new Date(),
        finalStates: this.getAllFSMStates()
      });
    });

    // When delivery is auto-confirmed due to timeout
    this.on('DELIVERY_AUTO_CONFIRMED', async (eventData) => {
      console.log('DELIVERY_AUTO_CONFIRMED: Order auto-completed due to timeout');

      this.logAuditEvent('ORCHESTRATION', 'DELIVERY_AUTO_CONFIRMED → Order auto-completed', eventData);

      this.emit('ORDER_AUTO_COMPLETED', {
        orderId: this.orderId,
        completionTime: new Date(),
        reason: 'customer_confirmation_timeout',
        finalStates: this.getAllFSMStates()
      });
    });
  }

  /**
   * Set up cross-FSM coordination
   */
  setupCrossFSMCoordination() {
    // Handle FSM transition events for state synchronization
    this.on('FSM_TRANSITION_COMPLETED', (eventData) => {
      this.takeStateSnapshot();
      this.checkForDeadlocks();
    });

    // Handle FSM errors
    this.on('FSM_TRANSITION_FAILED', (eventData) => {
      console.error('FSM Transition Failed:', eventData);
      this.logAuditEvent('ERROR', `FSM transition failed: ${eventData.error}`, eventData);
    });
  }

  /**
   * Take a snapshot of current FSM states
   */
  takeStateSnapshot() {
    if (!this.orderId) return;

    this.stateSnapshot = {
      timestamp: new Date(),
      orderId: this.orderId,
      vendor: this.fsms.vendor ? this.fsms.vendor.getCurrentState() : null,
      payment: this.fsms.payment ? this.fsms.payment.getCurrentState() : null,
      delivery: this.fsms.delivery ? this.fsms.delivery.getCurrentState() : null
    };

    console.log('State snapshot taken:', this.stateSnapshot);
  }

  /**
   * Check for potential deadlocks between FSMs
   */
  checkForDeadlocks() {
    // Basic deadlock detection - check if any FSM is stuck waiting for another
    const states = this.getAllFSMStates();

    // Example deadlock scenarios:
    // - Payment FSM in failed state while vendor is preparing
    // - Delivery FSM waiting for pickup while vendor is still preparing
    // - etc.

    const potentialDeadlocks = [];

    // Check if payment failed but vendor is preparing
    if (states.payment === 'payment_attempt_failed_for_order' &&
        ['vendor_is_actively_preparing_order', 'order_is_fully_prepared_and_ready_for_delivery'].includes(states.vendor)) {
      potentialDeadlocks.push('Payment failed but vendor continues preparing');
    }

    // Check if delivery is assigned but vendor not ready
    if (states.delivery === 'courier_has_been_assigned_to_deliver_the_order' &&
        states.vendor === 'awaiting_order_availability_vendor_confirmation') {
      potentialDeadlocks.push('Courier assigned before vendor confirmation');
    }

    if (potentialDeadlocks.length > 0) {
      console.warn('Potential deadlock detected:', potentialDeadlocks);
      this.emit('DEADLOCK_DETECTED', {
        orderId: this.orderId,
        deadlocks: potentialDeadlocks,
        states: states
      });
    }
  }

  /**
   * Get all current FSM states
   */
  getAllFSMStates() {
    return {
      vendor: this.fsms.vendor ? this.fsms.vendor.getCurrentState() : null,
      payment: this.fsms.payment ? this.fsms.payment.getCurrentState() : null,
      delivery: this.fsms.delivery ? this.fsms.delivery.getCurrentState() : null
    };
  }

  /**
   * Log audit events for orchestration tracking
   */
  logAuditEvent(type, message, data = {}) {
    const auditEntry = {
      timestamp: new Date(),
      type,
      message,
      data,
      orderId: this.orderId
    };

    this.auditLog.push(auditEntry);
    console.log(`AUDIT [${type}]: ${message}`, data);
  }

  /**
   * Initialize FSMs for a specific order
   */
  initializeOrderFSMs(orderId) {
    this.orderId = orderId;
    this.initializeFSMs();
    this.takeStateSnapshot();
    return this;
  }

  /**
   * Get current FSM states for an order
   */
  async getOrderFSMStates(orderId) {
    if (this.orderId !== orderId) {
      // For different orders, we'd need to load from database
      // For now, return null states for uninitialized orders
      return {
        vendor: null,
        payment: null,
        delivery: null
      };
    }

    return this.getAllFSMStates();
  }

  /**
   * Execute FSM transition with orchestration
   */
  async executeFSMTransition(orderId, fsmType, action, context = {}) {
    if (this.orderId !== orderId) {
      this.initializeOrderFSMs(orderId);
    }

    const fsm = this.fsms[fsmType];
    if (!fsm) {
      return {
        valid: false,
        error: `Unknown FSM type: ${fsmType}`
      };
    }

    try {
      const result = await fsm.executeTransition(action, context);

      if (result.valid) {
        // Emit transition completed event for orchestration
        this.emit('FSM_TRANSITION_COMPLETED', {
          orderId,
          fsmType,
          action,
          fromState: result.fromState,
          toState: result.toState,
          context
        });

        // Take state snapshot after successful transition
        this.takeStateSnapshot();
      } else {
        // Emit transition failed event
        this.emit('FSM_TRANSITION_FAILED', {
          orderId,
          fsmType,
          action,
          error: result.error,
          context
        });
      }

      return result;
    } catch (error) {
      console.error(`Error executing ${fsmType} transition:`, error);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Handle timeout events
   */
  async handleTimeout(orderId, fsmType, state, timeoutType) {
    console.log(`Handling timeout for order ${orderId}, FSM ${fsmType}, state ${state}, type ${timeoutType}`);

    // Emit timeout event for orchestration
    this.emit(`${fsmType.toUpperCase()}_TIMEOUT`, {
      orderId,
      timeoutType,
      state,
      timestamp: new Date()
    });

    // Log audit event
    this.logAuditEvent('TIMEOUT', `${fsmType} timeout in state ${state}`, {
      orderId,
      timeoutType,
      state
    });

    // Return timeout handling result
    return {
      orderId,
      fsmType,
      state,
      timeoutType,
      handled: true
    };
  }

  /**
   * Clear all timeouts for an order
   */
  async clearAllTimeouts() {
    // This would interact with the timeout scheduler
    // For now, just log
    console.log(`Clearing all timeouts for order ${this.orderId}`);
    this.emit('TIMEOUTS_CLEARED', { orderId: this.orderId });
  }
}

// Export singleton instance
const multiFSMOrchestrator = new MultiFSMOrchestrator();

module.exports = {
  MultiFSMOrchestrator,
  multiFSMOrchestrator
};
