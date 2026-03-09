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

describe('DeliveryFSM', () => {
  let deliveryFSM;
  let mockEventEmitter;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    mockEventEmitter = {
      emit: jest.fn()
    };
    deliveryFSM = new DeliveryFSM(mockEventEmitter);
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      expect(deliveryFSM.getInitialState()).toBe('delivery_request_created_waiting_for_courier_acceptance');
    });
  });

  describe('Terminal States', () => {
    test('should identify terminal states correctly', () => {
      expect(deliveryFSM.isTerminalState('delivery_request_created_waiting_for_courier_acceptance')).toBe(false);
      expect(deliveryFSM.isTerminalState('order_delivery_successfully_completed_and_confirmed_by_customer')).toBe(true);
      expect(deliveryFSM.isTerminalState('delivery_disputed_by_customer_and_requires_resolution')).toBe(true);
    });
  });

  describe('State Transitions', () => {
    test('should allow courier assignment transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1, is_available: true, service_zone: 'zone1' },
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'delivery_request_created_waiting_for_courier_acceptance',
        'courier_accepts_delivery_request',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('courier_has_been_assigned_to_deliver_the_order');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('COURIER_ASSIGNED', expect.any(Object));
    });

    test('should allow arrival at vendor transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1 },
        metadata: { location: { lat: 30.0444, lng: 31.2357 } }
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_has_been_assigned_to_deliver_the_order',
        'courier_arrives_at_vendor_pickup_location',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('courier_has_arrived_at_vendor_pickup_location');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('COURIER_AT_VENDOR', expect.any(Object));
    });

    test('should allow pickup transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123, vendor_state: 'order_is_fully_prepared_and_ready_for_delivery' },
        courier: { id: 1 },
        metadata: { pickupNotes: 'Package ready for pickup' }
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_has_arrived_at_vendor_pickup_location',
        'courier_confirms_receipt_of_order_from_vendor',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('courier_is_actively_transporting_order_to_customer');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ORDER_PICKED_UP', expect.any(Object));
    });

    test('should allow arrival at customer transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1 },
        metadata: { eta: '5 minutes' }
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_is_actively_transporting_order_to_customer',
        'courier_arrives_at_customer_drop_off_location',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('courier_has_arrived_at_customer_drop_off_location');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('COURIER_AT_CUSTOMER', expect.any(Object));
    });

    test('should allow delivery transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1 },
        metadata: { deliveryNotes: 'Delivered to reception' }
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_has_arrived_at_customer_drop_off_location',
        'courier_marks_order_as_delivered_to_customer',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('awaiting_customer_confirmation_of_order_delivery');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ORDER_DELIVERED_TO_CUSTOMER', expect.any(Object));
    });

    test('should allow customer confirmation transition', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123, delivery_state: 'awaiting_customer_confirmation_of_order_delivery' },
        metadata: { rating: 5, feedback: 'Great service!' }
      };

      const result = await deliveryFSM.validateAndTransition(
        'awaiting_customer_confirmation_of_order_delivery',
        'customer_confirms_receipt_of_order',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');
      expect(deliveryFSM.isTerminalState(result.nextStatus)).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('DELIVERY_CONFIRMED', expect.any(Object));
    });

    test('should allow customer dispute transition', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        metadata: { dispute_reason: 'Wrong item received', dispute_details: 'Ordered pizza, got burger' }
      };

      const result = await deliveryFSM.validateAndTransition(
        'awaiting_customer_confirmation_of_order_delivery',
        'customer_reports_problem_with_delivery',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('delivery_disputed_by_customer_and_requires_resolution');
      expect(deliveryFSM.isTerminalState(result.nextStatus)).toBe(true);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('DELIVERY_DISPUTED', expect.any(Object));
    });

    test('should reject invalid transitions', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1 },
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'delivery_request_created_waiting_for_courier_acceptance',
        'courier_marks_order_as_delivered_to_customer',
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

      const result = await deliveryFSM.validateAndTransition(
        'order_delivery_successfully_completed_and_confirmed_by_customer',
        'customer_confirms_receipt_of_order',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Terminal state');
    });
  });

  describe('Guard Conditions', () => {
    test('should enforce courier availability guard', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1, is_available: false }, // Courier not available
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'delivery_request_created_waiting_for_courier_acceptance',
        'courier_accepts_delivery_request',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce actor role guard for courier actions', async () => {
      const context = {
        userId: 1,
        userRole: 'customer', // Wrong role
        order: { id: 123 },
        courier: { id: 1 },
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_has_been_assigned_to_deliver_the_order',
        'courier_arrives_at_vendor_pickup_location',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce actor role guard for customer actions', async () => {
      const context = {
        userId: 1,
        userRole: 'driver', // Wrong role
        order: { id: 123 },
        metadata: { dispute_reason: 'Wrong order' }
      };

      const result = await deliveryFSM.validateAndTransition(
        'awaiting_customer_confirmation_of_order_delivery',
        'customer_reports_problem_with_delivery',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });
  });

  describe('Delivery Initiation Check', () => {
    test('should allow delivery initiation when vendor confirmed', () => {
      const order = {
        vendor_state: 'awaiting_vendor_start_preparation'
      };

      expect(deliveryFSM.canInitiateDelivery(order)).toBe(true);
    });

    test('should prevent delivery initiation when vendor not confirmed', () => {
      const order = {
        vendor_state: 'awaiting_order_availability_vendor_confirmation'
      };

      expect(deliveryFSM.canInitiateDelivery(order)).toBe(false);
    });

    test('should prevent delivery initiation when vendor rejected', () => {
      const order = {
        vendor_state: 'order_rejected_by_vendor'
      };

      expect(deliveryFSM.canInitiateDelivery(order)).toBe(false);
    });
  });

  describe('Delivery Tracking Info', () => {
    test('should provide tracking information for initial state', () => {
      const order = {
        delivery_state: 'delivery_request_created_waiting_for_courier_acceptance'
      };

      const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

      expect(trackingInfo.currentState).toBe('delivery_request_created_waiting_for_courier_acceptance');
      expect(trackingInfo.description).toBe('Delivery request created, waiting for courier');
      expect(trackingInfo.isTerminal).toBe(false);
    });

    test('should provide tracking information for assigned state', () => {
      const order = {
        delivery_state: 'courier_has_been_assigned_to_deliver_the_order',
        assigned_courier: {
          id: 1,
          name: 'John Driver',
          phone: '+1234567890'
        }
      };

      const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

      expect(trackingInfo.currentState).toBe('courier_has_been_assigned_to_deliver_the_order');
      expect(trackingInfo.description).toBe('Courier assigned to deliver your order');
      expect(trackingInfo.isTerminal).toBe(false);
      expect(trackingInfo.courierInfo).toEqual({
        id: 1,
        name: 'John Driver',
        phone: '+1234567890'
      });
    });

    test('should provide tracking information for in transit state', () => {
      const order = {
        delivery_state: 'courier_is_actively_transporting_order_to_customer',
        estimated_delivery_time: '2024-01-15T10:00:00Z',
        assigned_courier: {
          id: 1,
          name: 'John Driver',
          phone: '+1234567890'
        }
      };

      const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

      expect(trackingInfo.currentState).toBe('courier_is_actively_transporting_order_to_customer');
      expect(trackingInfo.description).toBe('Order in transit to customer');
      expect(trackingInfo.isTerminal).toBe(false);
      expect(trackingInfo.estimatedDeliveryTime).toBe('2024-01-15T10:00:00Z');
      expect(trackingInfo.courierInfo).toEqual({
        id: 1,
        name: 'John Driver',
        phone: '+1234567890'
      });
    });

    test('should provide tracking information for disputed delivery state', () => {
      const order = {
        delivery_state: 'delivery_disputed_by_customer_and_requires_resolution'
      };

      const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

      expect(trackingInfo.currentState).toBe('delivery_disputed_by_customer_and_requires_resolution');
      expect(trackingInfo.description).toBe('Delivery disputed, under review');
      expect(trackingInfo.isTerminal).toBe(true);
    });

    test('should provide tracking information for completed delivery state', () => {
      const order = {
        delivery_state: 'order_delivery_successfully_completed_and_confirmed_by_customer',
        delivered_at: '2024-01-15T09:30:00Z'
      };

      const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

      expect(trackingInfo.currentState).toBe('order_delivery_successfully_completed_and_confirmed_by_customer');
      expect(trackingInfo.description).toBe('Order delivered and confirmed');
      expect(trackingInfo.isTerminal).toBe(true);
    });
  });

  describe('Event Emission', () => {
    test('should emit correct event data for courier assignment', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1, is_available: true, service_zone: 'zone1' },
        metadata: { assignmentNotes: 'Courier assigned via system' }
      };

      await deliveryFSM.validateAndTransition(
        'delivery_request_created_waiting_for_courier_acceptance',
        'courier_accepts_delivery_request',
        context
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('COURIER_ASSIGNED', {
        orderId: 123,
        fromState: 'delivery_request_created_waiting_for_courier_acceptance',
        toState: 'courier_has_been_assigned_to_deliver_the_order',
        actor: { userId: 1, role: 'driver' },
        metadata: { assignmentNotes: 'Courier assigned via system' },
        courier: { id: 1, is_available: true, service_zone: 'zone1' }
      });
    });

    test('should emit correct event data for order pickup', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123, vendor_state: 'order_is_fully_prepared_and_ready_for_delivery' },
        courier: { id: 1 },
        metadata: { pickupNotes: 'Package collected successfully' }
      };

      await deliveryFSM.validateAndTransition(
        'courier_has_arrived_at_vendor_pickup_location',
        'courier_confirms_receipt_of_order_from_vendor',
        context
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('ORDER_PICKED_UP', {
        orderId: 123,
        fromState: 'courier_has_arrived_at_vendor_pickup_location',
        toState: 'courier_is_actively_transporting_order_to_customer',
        actor: { userId: 1, role: 'driver' },
        metadata: { pickupNotes: 'Package collected successfully' }
      });
    });
  });

  describe('Possible Events', () => {
    test('should return possible events for initial state', () => {
      const events = deliveryFSM.getPossibleEvents('delivery_request_created_waiting_for_courier_acceptance');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'courier_accepts_delivery_request',
          nextStatus: 'courier_has_been_assigned_to_deliver_the_order'
        })
      );
    });

    test('should return possible events for assigned state', () => {
      const events = deliveryFSM.getPossibleEvents('courier_has_been_assigned_to_deliver_the_order');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'courier_arrives_at_vendor_pickup_location',
          nextStatus: 'courier_has_arrived_at_vendor_pickup_location'
        })
      );
    });

    test('should return possible events for awaiting confirmation state', () => {
      const events = deliveryFSM.getPossibleEvents('awaiting_customer_confirmation_of_order_delivery');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'customer_confirms_receipt_of_order',
          nextStatus: 'order_delivery_successfully_completed_and_confirmed_by_customer'
        })
      );

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'customer_reports_problem_with_delivery',
          nextStatus: 'delivery_disputed_by_customer_and_requires_resolution'
        })
      );
    });

    test('should return empty array for terminal states', () => {
      const events1 = deliveryFSM.getPossibleEvents('order_delivery_successfully_completed_and_confirmed_by_customer');
      const events2 = deliveryFSM.getPossibleEvents('delivery_disputed_by_customer_and_requires_resolution');

      expect(events1).toEqual([]);
      expect(events2).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing courier data gracefully', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        // Missing courier data
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'delivery_request_created_waiting_for_courier_acceptance',
        'courier_accepts_delivery_request',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should handle invalid courier gracefully', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1, is_available: false, service_zone: null },
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'delivery_request_created_waiting_for_courier_acceptance',
        'courier_accepts_delivery_request',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });
  });
});
