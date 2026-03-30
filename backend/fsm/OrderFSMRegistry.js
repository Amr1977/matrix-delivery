const { ORDER_STATUS } = require("../config/constants");
const EventEmitter = require("events");

/**
 * Enhanced Base FSM class with event emission and timeout support
 */
class BaseOrderFSM extends EventEmitter {
  constructor(eventEmitter, orderId = null) {
    super();
    this.eventEmitter = eventEmitter;
    this.orderId = orderId;
    this.terminalStates = new Set();
    this.transitions = new Map();
    this.guards = new Map();
    this.timeouts = new Map(); // Store timeout handlers
    this.currentState = null;
    this.lastTransition = null;
  }

  /**
   * Set the current state (used for state tracking)
   */
  setCurrentState(state) {
    this.currentState = state;
  }

  /**
   * Get the current state
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * Get the initial state (must be implemented by subclasses)
   */
  getInitialState() {
    throw new Error("getInitialState() must be implemented by subclass");
  }

  /**
   * Check if a state is terminal
   */
  isTerminalState(status) {
    return this.terminalStates.has(status);
  }

  /**
   * Validate a transition with enhanced context
   */
  validateTransition(currentStatus, event, context = {}) {
    if (this.isTerminalState(currentStatus)) {
      return {
        valid: false,
        error: `Cannot transition from terminal state: ${currentStatus}`,
      };
    }

    const transitionKey = `${currentStatus}:${event}`;
    const transition = this.transitions.get(transitionKey);

    if (!transition) {
      return {
        valid: false,
        error: `Invalid transition: ${currentStatus} -> ${event}`,
      };
    }

    // Check guards if present
    if (transition.guards) {
      for (const guard of transition.guards) {
        if (!this.checkGuard(guard, context)) {
          return {
            valid: false,
            error: `Guard failed: ${guard}`,
          };
        }
      }
    }

    return {
      valid: true,
      nextStatus: transition.nextStatus,
      transition,
      event: transition.event || event,
    };
  }

  /**
   * Execute a transition with event emission and audit logging
   */
  async executeTransition(currentStatus, event, context = {}) {
    const validation = this.validateTransition(currentStatus, event, context);

    if (!validation.valid) {
      // Emit failure event
      this.emitEvent("FSM_TRANSITION_FAILED", {
        orderId: this.orderId,
        fsm: this.constructor.name,
        fromState: currentStatus,
        event: event,
        error: validation.error,
        context: context,
      });

      throw new Error(validation.error);
    }

    const previousState = currentStatus;
    const newState = validation.nextStatus;

    // Update current state
    this.setCurrentState(newState);
    this.lastTransition = {
      fromState: previousState,
      toState: newState,
      event: event,
      timestamp: new Date(),
      context: context,
    };

    // Emit transition event
    this.emitEvent("FSM_TRANSITION_COMPLETED", {
      orderId: this.orderId,
      fsm: this.constructor.name,
      fromState: previousState,
      toState: newState,
      event: event,
      transition: validation.transition,
      context: context,
    });

    // Emit specific event if defined in transition
    if (validation.transition.emitEvent) {
      this.emitEvent(validation.transition.emitEvent, {
        orderId: this.orderId,
        fsm: this.constructor.name,
        fromState: previousState,
        toState: newState,
        context: context,
      });
    }

    // Handle timeouts if configured
    this.handleTimeoutConfigurations(newState, context);

    return {
      success: true,
      fromState: previousState,
      toState: newState,
      event: event,
    };
  }

  /**
   * Emit event through the event bus
   */
  emitEvent(eventType, payload) {
    if (this.eventEmitter) {
      this.eventEmitter.emit(eventType, {
        ...payload,
        timestamp: new Date(),
        fsm: this.constructor.name,
      });
    } else {
      // Fallback to local emission
      this.emit(eventType, payload);
    }
  }

  /**
   * Handle timeout configurations for the new state
   */
  handleTimeoutConfigurations(newState, context) {
    // Clear any existing timeouts for this state
    this.clearTimeoutsForState(this.currentState);

    // Set up new timeouts if configured
    const timeoutConfig = this.getTimeoutConfig(newState);
    if (timeoutConfig) {
      this.scheduleTimeout(newState, timeoutConfig, context);
    }
  }

  /**
   * Get timeout configuration for a state (must be implemented by subclasses)
   */
  getTimeoutConfig(state) {
    return null; // Override in subclasses
  }

  /**
   * Schedule a timeout for a state
   */
  scheduleTimeout(state, timeoutConfig, context) {
    const timeoutKey = `${this.orderId}:${state}`;

    const timeoutId = setTimeout(async () => {
      try {
        await this.handleTimeout(state, timeoutConfig, context);
      } catch (error) {
        console.error(
          `Timeout handling failed for ${this.constructor.name}:${state}:`,
          error,
        );
      }
    }, timeoutConfig.duration);

    this.timeouts.set(timeoutKey, timeoutId);
  }

  /**
   * Handle timeout expiration (must be implemented by subclasses)
   */
  async handleTimeout(state, timeoutConfig, context) {
    throw new Error("handleTimeout() must be implemented by subclass");
  }

  /**
   * Clear timeouts for a specific state
   */
  clearTimeoutsForState(state) {
    const timeoutKey = `${this.orderId}:${state}`;
    const timeoutId = this.timeouts.get(timeoutKey);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeouts.delete(timeoutKey);
    }
  }

  /**
   * Clear all timeouts
   */
  clearAllTimeouts() {
    for (const [key, timeoutId] of this.timeouts) {
      clearTimeout(timeoutId);
    }
    this.timeouts.clear();
  }

  /**
   * Check a guard condition
   */
  checkGuard(guardName, context) {
    const guardFn = this.guards.get(guardName);
    return guardFn ? guardFn(context) : true;
  }

  /**
   * Get all possible events from current status
   */
  getPossibleEvents(currentStatus) {
    const events = [];
    for (const [key, transition] of this.transitions) {
      const [fromStatus, event] = key.split(":");
      if (fromStatus === currentStatus) {
        events.push(event);
      }
    }
    return events;
  }

  /**
   * Get transition metadata
   */
  getTransition(currentStatus, event) {
    const key = `${currentStatus}:${event}`;
    return this.transitions.get(key);
  }

  /**
   * Destroy the FSM and clean up resources
   */
  destroy() {
    this.clearAllTimeouts();
    this.removeAllListeners();
  }
}

/**
 * Marketplace Order FSM
 */
class MarketplaceOrderFSM extends BaseOrderFSM {
  constructor() {
    super();

    // Define terminal states
    this.terminalStates = new Set([
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.REFUNDED,
      ORDER_STATUS.FAILED,
    ]);

    // Define transitions
    this.defineTransitions();

    // Define guards
    this.defineGuards();
  }

  defineTransitions() {
    const T = ORDER_STATUS;

    // pending -> paid
    this.transitions.set("pending:confirm_payment", {
      nextStatus: T.PAID,
      allowedRoles: ["customer", "system"],
      description: "Payment verified by gateway",
    });

    // pending -> canceled
    this.transitions.set("pending:cancel_order", {
      nextStatus: T.CANCELED,
      allowedRoles: ["admin"],
      description: "Admin cancels before processing",
    });

    // pending -> failed
    this.transitions.set("pending:payment_failed", {
      nextStatus: T.FAILED,
      allowedRoles: ["system"],
      description: "Payment error or timeout",
    });

    // paid -> accepted
    this.transitions.set("paid:accept_order", {
      nextStatus: T.ACCEPTED,
      allowedRoles: ["vendor"],
      guards: ["vendor_is_active", "vendor_has_inventory", "payment_captured"],
      description: "Vendor confirms order",
    });

    // paid -> rejected
    this.transitions.set("paid:reject_order", {
      nextStatus: T.REJECTED,
      allowedRoles: ["vendor"],
      description: "Vendor cannot fulfill",
    });

    // paid -> canceled
    this.transitions.set("paid:cancel_order", {
      nextStatus: T.CANCELED,
      allowedRoles: ["admin"],
      description: "Admin intervention",
    });

    // accepted -> assigned
    this.transitions.set("accepted:assign_driver", {
      nextStatus: T.ASSIGNED,
      allowedRoles: ["system", "admin"],
      guards: ["driver_available", "delivery_zone_supported"],
      description: "Delivery driver assigned",
    });

    // accepted -> picked_up (direct pickup without explicit assignment)
    this.transitions.set("accepted:pickup_order", {
      nextStatus: T.PICKED_UP,
      allowedRoles: ["driver"],
      guards: ["driver_assigned_to_order"],
      description: "Driver picks up order directly from accepted state",
    });

    // assigned -> picked_up
    this.transitions.set("assigned:pickup_order", {
      nextStatus: T.PICKED_UP,
      allowedRoles: ["driver"],
      description: "Driver collects order",
    });

    // picked_up -> delivered
    this.transitions.set("picked_up:deliver_order", {
      nextStatus: T.DELIVERED,
      allowedRoles: ["driver"],
      description: "Package delivered",
    });

    // delivered -> completed
    this.transitions.set("delivered:confirm_receipt", {
      nextStatus: T.COMPLETED,
      allowedRoles: ["customer"],
      description: "Order finished successfully",
    });

    // delivered -> disputed
    this.transitions.set("delivered:report_issue", {
      nextStatus: T.DISPUTED,
      allowedRoles: ["customer"],
      description: "Customer dispute",
    });

    // disputed -> completed
    this.transitions.set("disputed:resolve_complete", {
      nextStatus: T.COMPLETED,
      allowedRoles: ["admin"],
      description: "Admin resolves dispute",
    });

    // disputed -> refunded
    this.transitions.set("disputed:approve_refund", {
      nextStatus: T.REFUNDED,
      allowedRoles: ["admin"],
      description: "Refund issued",
    });

    // rejected -> refunded
    this.transitions.set("rejected:process_refund", {
      nextStatus: T.REFUNDED,
      allowedRoles: ["system"],
      description: "Automatic refund",
    });

    // assigned -> canceled
    this.transitions.set("assigned:cancel_order", {
      nextStatus: T.CANCELED,
      allowedRoles: ["admin"],
      description: "Emergency cancel",
    });

    // picked_up -> failed
    this.transitions.set("picked_up:delivery_failed", {
      nextStatus: T.FAILED,
      allowedRoles: ["system"],
      description: "Delivery issue",
    });
  }

  defineGuards() {
    this.guards.set("vendor_is_active", (context) => {
      return context.vendor && context.vendor.is_active === true;
    });

    this.guards.set("vendor_has_inventory", (context) => {
      return context.order && context.order.has_inventory !== false;
    });

    this.guards.set("payment_captured", (context) => {
      return context.payment && context.payment.captured === true;
    });

    this.guards.set("driver_available", (context) => {
      return context.driver && context.driver.available === true;
    });

    this.guards.set("delivery_zone_supported", (context) => {
      return context.delivery_zone && context.delivery_zone.supported === true;
    });

    this.guards.set("driver_assigned_to_order", (context) => {
      return context.order && context.order.assigned_driver_user_id != null;
    });
  }
}

/**
 * Traditional Delivery Order FSM
 */
class DeliveryOrderFSM extends BaseOrderFSM {
  constructor() {
    super();

    // Define terminal states
    this.terminalStates = new Set([
      ORDER_STATUS.COMPLETED,
      ORDER_STATUS.CANCELED,
      ORDER_STATUS.DISPUTED,
    ]);

    // Define transitions
    this.defineTransitions();

    // Define guards
    this.defineGuards();
  }

  defineTransitions() {
    const T = ORDER_STATUS;

    // pending_bids -> accepted
    this.transitions.set("pending_bids:accept_bid", {
      nextStatus: T.ACCEPTED,
      allowedRoles: ["customer"],
      description: "Customer accepts driver bid",
    });

    // pending_bids -> canceled
    this.transitions.set("pending_bids:cancel_order", {
      nextStatus: T.CANCELED,
      allowedRoles: ["customer", "admin"],
      description: "Order cancelled before acceptance",
    });

    // accepted -> picked_up
    this.transitions.set("accepted:pickup_package", {
      nextStatus: T.PICKED_UP,
      allowedRoles: ["driver"],
      description: "Driver confirms pickup",
    });

    // accepted -> canceled
    this.transitions.set("accepted:cancel_order", {
      nextStatus: T.CANCELED,
      allowedRoles: ["customer", "driver"],
      description: "Cancellation after acceptance",
    });

    // picked_up -> in_transit
    this.transitions.set("picked_up:start_transit", {
      nextStatus: T.IN_TRANSIT,
      allowedRoles: ["driver"],
      description: "Driver begins delivery",
    });

    // picked_up -> canceled
    this.transitions.set("picked_up:cancel_order", {
      nextStatus: T.CANCELED,
      allowedRoles: ["customer", "admin"],
      description: "Emergency cancellation",
    });

    // in_transit -> delivered
    this.transitions.set("in_transit:complete_delivery", {
      nextStatus: T.DELIVERED,
      allowedRoles: ["driver"],
      description: "Package delivered",
    });

    // in_transit -> canceled
    this.transitions.set("in_transit:delivery_issue", {
      nextStatus: T.CANCELED,
      allowedRoles: ["driver"],
      description: "Cannot complete delivery",
    });

    // delivered -> delivered_pending
    this.transitions.set("delivered:confirm_delivery", {
      nextStatus: T.DELIVERED_PENDING,
      allowedRoles: ["customer"],
      description: "Customer confirms receipt",
    });

    // delivered_pending -> completed
    this.transitions.set("delivered_pending:finalize_order", {
      nextStatus: T.COMPLETED,
      allowedRoles: ["system", "customer", "driver"],
      description: "Order completion confirmed",
    });

    // delivered_pending -> disputed
    this.transitions.set("delivered_pending:dispute_delivery", {
      nextStatus: T.DISPUTED,
      allowedRoles: ["customer"],
      description: "Customer reports issue",
    });
  }

  defineGuards() {
    this.guards.set("bid_exists", (context) => {
      return context.accepted_bid && context.accepted_bid.id;
    });

    this.guards.set("driver_assigned", (context) => {
      return (
        context.driver_id && context.driver_id === context.accepted_bid.user_id
      );
    });

    this.guards.set("payment_sufficient", (context) => {
      return context.customer_balance >= context.order_price;
    });
  }
}

/**
 * Order FSM Registry - manages FSM instances by order type
 */
class OrderFSMRegistry {
  constructor() {
    this.fsms = new Map();
    this.initializeFSMs();
  }

  initializeFSMs() {
    this.fsms.set("marketplace", new MarketplaceOrderFSM());
    this.fsms.set("delivery", new DeliveryOrderFSM());
  }

  /**
   * Get FSM for order type
   */
  getFSM(orderType) {
    const fsm = this.fsms.get(orderType);
    if (!fsm) {
      throw new Error(
        `No FSM found for order type: ${orderType}. Supported types: ${Array.from(this.fsms.keys()).join(", ")}`,
      );
    }
    return fsm;
  }

  /**
   * Validate transition for order
   */
  validateTransition(order, event, context = {}) {
    const fsm = this.getFSM(order.order_type);
    return fsm.validateTransition(order.status, event, { ...context, order });
  }

  /**
   * Check if order is in terminal state
   */
  isTerminalState(order) {
    const fsm = this.getFSM(order.order_type);
    return fsm.isTerminalState(order.status);
  }

  /**
   * Get possible events for order
   */
  getPossibleEvents(order) {
    const fsm = this.getFSM(order.order_type);
    return fsm.getPossibleEvents(order.status);
  }

  /**
   * Get transition metadata
   */
  getTransition(order, event) {
    const fsm = this.getFSM(order.order_type);
    return fsm.getTransition(order.status, event);
  }
}

// Export singleton instance
const orderFSMRegistry = new OrderFSMRegistry();

module.exports = {
  BaseOrderFSM,
  MarketplaceOrderFSM,
  DeliveryOrderFSM,
  OrderFSMRegistry,
  orderFSMRegistry,
};
