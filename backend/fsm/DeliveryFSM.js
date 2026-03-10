const { BaseOrderFSM } = require('./OrderFSMRegistry');
const EventEmitter = require('events');

/**
 * Delivery FSM - Handles courier logistics for marketplace orders
 * Manages states from courier assignment through customer confirmation
 */
class DeliveryFSM extends BaseOrderFSM {
  constructor(eventEmitter, orderId = null) {
    super(eventEmitter, orderId);

    // Define terminal states
    this.terminalStates = new Set([
      'order_delivery_successfully_completed_and_confirmed_by_customer',
      'delivery_disputed_by_customer_and_requires_resolution'
    ]);

    // Define transitions
    this.defineTransitions();

    // Define guards
    this.defineGuards();

    // Set initial state
    this.setCurrentState(this.getInitialState());
  }

  getInitialState() {
    return 'delivery_request_created_waiting_for_courier_acceptance';
  }

  defineTransitions() {
    // Courier assignment transitions
    this.transitions.set('delivery_request_created_waiting_for_courier_acceptance:courier_accepts_delivery_request', {
      nextStatus: 'courier_has_been_assigned_to_deliver_the_order',
      guards: ['courier_available', 'courier_in_delivery_zone', 'vendor_prepared'],
      emitEvent: 'COURIER_ASSIGNED',
      description: 'Courier accepts the delivery request'
    });

    this.transitions.set('delivery_request_created_waiting_for_courier_acceptance:courier_cancels', {
      nextStatus: 'delivery_request_created_waiting_for_courier_acceptance',
      emitEvent: 'COURIER_CANCELLED',
      description: 'Courier cancels assignment before pickup'
    });

    // Pickup phase transitions
    this.transitions.set('courier_has_been_assigned_to_deliver_the_order:courier_arrives_at_vendor', {
      nextStatus: 'courier_has_arrived_at_vendor_pickup_location',
      guards: ['courier_assigned_to_order'],
      emitEvent: 'COURIER_AT_VENDOR',
      description: 'Courier arrives at vendor pickup location'
    });

    this.transitions.set('courier_has_arrived_at_vendor_pickup_location:courier_confirms_receipt', {
      nextStatus: 'courier_is_actively_transporting_order_to_customer',
      guards: ['courier_at_vendor', 'order_picked_up'],
      emitEvent: 'ORDER_PICKED_UP',
      description: 'Courier confirms receipt of order from vendor'
    });

    // Transit phase transitions
    this.transitions.set('courier_is_actively_transporting_order_to_customer:courier_arrives_at_customer', {
      nextStatus: 'courier_has_arrived_at_customer_drop_off_location',
      guards: ['courier_in_transit', 'valid_delivery_address'],
      emitEvent: 'COURIER_AT_CUSTOMER',
      description: 'Courier arrives at customer drop-off location'
    });

    this.transitions.set('courier_has_arrived_at_customer_drop_off_location:courier_marks_delivered', {
      nextStatus: 'awaiting_customer_confirmation_of_order_delivery',
      guards: ['courier_at_customer', 'order_delivered'],
      emitEvent: 'ORDER_DELIVERED_TO_CUSTOMER',
      description: 'Courier marks order as delivered to customer'
    });

    // Customer confirmation transitions
    this.transitions.set('awaiting_customer_confirmation_of_order_delivery:customer_confirms_receipt', {
      nextStatus: 'order_delivery_successfully_completed_and_confirmed_by_customer',
      guards: ['customer_can_confirm'],
      emitEvent: 'DELIVERY_CONFIRMED',
      description: 'Customer confirms receipt of order'
    });

    // Timeout transitions
    this.transitions.set('awaiting_customer_confirmation_of_order_delivery:customer_timeout', {
      nextStatus: 'order_delivery_auto_confirmed_due_to_timeout',
      emitEvent: 'DELIVERY_AUTO_CONFIRMED',
      description: 'Customer confirmation timeout - auto-confirm delivery'
    });

    // Dispute transitions
    this.transitions.set('awaiting_customer_confirmation_of_order_delivery:customer_reports_problem', {
      nextStatus: 'delivery_disputed_by_customer_and_requires_resolution',
      guards: ['dispute_within_window'],
      emitEvent: 'DELIVERY_DISPUTED',
      description: 'Customer reports a problem with delivery'
    });

    // Cancellation transitions
    this.transitions.set('courier_has_been_assigned_to_deliver_the_order:courier_cancels_after_assignment', {
      nextStatus: 'delivery_request_created_waiting_for_courier_acceptance',
      emitEvent: 'COURIER_REASSIGNMENT_REQUIRED',
      description: 'Courier cancels after assignment, requires reassignment'
    });
  }

  defineGuards() {
    this.guards.set('courier_available', (context) => {
      return context.courier && context.courier.status === 'available';
    });

    this.guards.set('courier_in_delivery_zone', (context) => {
      if (!context.courier || !context.order) return false;
      // In real implementation, this would check courier zone vs order location
      return context.courier.delivery_zone === context.order.delivery_zone;
    });

    this.guards.set('vendor_prepared', (context) => {
      return context.vendor && context.vendor.preparation_status === 'completed';
    });

    this.guards.set('courier_assigned_to_order', (context) => {
      return context.courier && context.courier.assigned_order_id === context.orderId;
    });

    this.guards.set('courier_at_vendor', (context) => {
      return context.location_update &&
             context.location_update.type === 'arrived_at_vendor';
    });

    this.guards.set('order_picked_up', (context) => {
      return context.order && context.order.pickup_confirmed === true;
    });

    this.guards.set('courier_in_transit', (context) => {
      return context.courier && context.courier.status === 'in_transit';
    });

    this.guards.set('valid_delivery_address', (context) => {
      return context.order && context.order.delivery_address &&
             context.order.delivery_address.coordinates;
    });

    this.guards.set('courier_at_customer', (context) => {
      return context.location_update &&
             context.location_update.type === 'arrived_at_customer';
    });

    this.guards.set('order_delivered', (context) => {
      return context.delivery_attempt && context.delivery_attempt.success === true;
    });

    this.guards.set('customer_can_confirm', (context) => {
      return context.customer && context.customer.can_receive_deliveries === true;
    });

    this.guards.set('dispute_within_window', (context) => {
      // Dispute window (e.g., within 24 hours of delivery)
      if (!context.delivery_time) return false;
      const timeSinceDelivery = Date.now() - new Date(context.delivery_time).getTime();
      const disputeWindow = 24 * 60 * 60 * 1000; // 24 hours
      return timeSinceDelivery < disputeWindow;
    });
  }

  getTimeoutConfig(state) {
    switch (state) {
      case 'awaiting_customer_confirmation_of_order_delivery':
        return {
          duration: 24 * 60 * 60 * 1000, // 24 hours
          event: 'customer_timeout',
          description: 'Customer confirmation timeout'
        };
      default:
        return null;
    }
  }

  async handleTimeout(state, timeoutConfig, context) {
    console.log(`Handling timeout for DeliveryFSM state: ${state}`);

    switch (state) {
      case 'awaiting_customer_confirmation_of_order_delivery':
        await this.executeTransition(state, 'customer_timeout', context);
        break;
      default:
        console.warn(`Unhandled timeout for DeliveryFSM state: ${state}`);
    }
  }

  /**
   * Get delivery tracking information for current state
   */
  getTrackingInfo() {
    const state = this.getCurrentState();

    const trackingMap = {
      'delivery_request_created_waiting_for_courier_acceptance': {
        label: 'awaiting_courier',
        description: 'Waiting for courier assignment',
        terminal: false,
        courierInfo: 'Not assigned'
      },
      'courier_has_been_assigned_to_deliver_the_order': {
        label: 'courier_assigned',
        description: 'Courier assigned to deliver',
        terminal: false,
        courierInfo: 'Courier details available'
      },
      'courier_is_actively_transporting_order_to_customer': {
        label: 'in_transit',
        description: 'Order in transit to customer',
        terminal: false,
        courierInfo: 'Courier + ETA available'
      },
      'awaiting_customer_confirmation_of_order_delivery': {
        label: 'delivered',
        description: 'Order delivered, awaiting confirmation',
        terminal: false,
        courierInfo: 'Courier details available'
      },
      'order_delivery_successfully_completed_and_confirmed_by_customer': {
        label: 'completed',
        description: 'Order delivered and confirmed',
        terminal: true,
        courierInfo: 'Courier details available'
      },
      'delivery_disputed_by_customer_and_requires_resolution': {
        label: 'disputed',
        description: 'Delivery disputed, under review',
        terminal: true,
        courierInfo: 'Courier details available'
      }
    };

    return trackingMap[state] || {
      label: 'unknown',
      description: 'Unknown delivery status',
      terminal: false,
      courierInfo: 'Status unavailable'
    };
  }

  /**
   * Check if courier assignment is required
   */
  needsCourierAssignment() {
    return this.getCurrentState() === 'delivery_request_created_waiting_for_courier_acceptance';
  }

  /**
   * Check if delivery is in progress
   */
  isDeliveryInProgress() {
    const activeStates = [
      'courier_has_been_assigned_to_deliver_the_order',
      'courier_has_arrived_at_vendor_pickup_location',
      'courier_is_actively_transporting_order_to_customer',
      'courier_has_arrived_at_customer_drop_off_location'
    ];
    return activeStates.includes(this.getCurrentState());
  }

  /**
   * Check if delivery is completed
   */
  isDeliveryCompleted() {
    return this.getCurrentState() === 'order_delivery_successfully_completed_and_confirmed_by_customer';
  }

  /**
   * Backward-compatible tracking accessor used by existing step definitions.
   */
  getDeliveryTrackingInfo() {
    const tracking = this.getTrackingInfo();
    return {
      description: tracking.description,
      isTerminal: tracking.terminal,
      courierInfo: tracking.courierInfo,
      label: tracking.label
    };
  }
}

module.exports = DeliveryFSM;
