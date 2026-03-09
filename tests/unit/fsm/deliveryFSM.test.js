const { DeliveryFSM } = require('../../backend/fsm/DeliveryFSM');

describe('DeliveryFSM', () => {
  let deliveryFSM;
  let mockEventEmitter;

  beforeEach(() => {
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

    test('should allow pickup transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123, vendor_state: 'order_is_fully_prepared_and_ready_for_delivery' },
        courier: { id: 1 },
        metadata: {}
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

    test('should allow delivery transition', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123 },
        courier: { id: 1 },
        metadata: {}
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
        metadata: {}
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
        metadata: { dispute_reason: 'Wrong order' }
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

    test('should enforce delivery zone guard', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123, delivery_zone: 'zone2' },
        courier: { id: 1, is_available: true, service_zone: 'zone1' }, // Wrong zone
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

    test('should enforce courier assignment guard', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123, assigned_courier_id: 2 }, // Different courier assigned
        courier: { id: 1 }, // Wrong courier
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_has_arrived_at_vendor_pickup_location',
        'courier_confirms_receipt_of_order_from_vendor',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce vendor preparation guard', async () => {
      const context = {
        userId: 1,
        userRole: 'driver',
        order: { id: 123, vendor_state: 'awaiting_vendor_start_preparation' }, // Not prepared
        courier: { id: 1 },
        metadata: {}
      };

      const result = await deliveryFSM.validateAndTransition(
        'courier_has_arrived_at_vendor_pickup_location',
        'courier_confirms_receipt_of_order_from_vendor',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce dispute reason guard', async () => {
      const context = {
        userId: 1,
        userRole: 'customer',
        order: { id: 123 },
        metadata: {} // Missing dispute reason
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
  });

  describe('Delivery Tracking Info', () => {
    test('should provide tracking information for current state', () => {
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

    test('should handle disputed delivery state', () => {
      const order = {
        delivery_state: 'delivery_disputed_by_customer_and_requires_resolution'
      };

      const trackingInfo = deliveryFSM.getDeliveryTrackingInfo(order);

      expect(trackingInfo.currentState).toBe('delivery_disputed_by_customer_and_requires_resolution');
      expect(trackingInfo.description).toBe('Delivery disputed, under review');
      expect(trackingInfo.isTerminal).toBe(true);
    });
  });
});
