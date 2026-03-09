const { VendorFSM } = require('../../backend/fsm/VendorFSM');

describe('VendorFSM', () => {
  let vendorFSM;
  let mockEventEmitter;

  beforeEach(() => {
    mockEventEmitter = {
      emit: jest.fn()
    };
    vendorFSM = new VendorFSM(mockEventEmitter);
  });

  describe('Initial State', () => {
    test('should have correct initial state', () => {
      expect(vendorFSM.getInitialState()).toBe('awaiting_order_availability_vendor_confirmation');
    });
  });

  describe('Terminal States', () => {
    test('should identify terminal states correctly', () => {
      expect(vendorFSM.isTerminalState('awaiting_order_availability_vendor_confirmation')).toBe(false);
      expect(vendorFSM.isTerminalState('order_rejected_by_vendor')).toBe(true);
      expect(vendorFSM.isTerminalState('order_is_fully_prepared_and_ready_for_delivery')).toBe(false);
    });
  });

  describe('State Transitions', () => {
    test('should allow vendor confirmation transition', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_confirms_order_is_available',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('awaiting_vendor_start_preparation');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('VENDOR_CONFIRMED', expect.any(Object));
    });

    test('should allow vendor rejection transition', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_rejects_order_due_to_unavailability',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('order_rejected_by_vendor');
      expect(vendorFSM.isTerminalState(result.nextStatus)).toBe(true);
    });

    test('should allow preparation start transition', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'awaiting_vendor_start_preparation',
        'vendor_starts_preparing_order',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('vendor_is_actively_preparing_order');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PREPARATION_STARTED', expect.any(Object));
    });

    test('should allow preparation complete transition', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'vendor_is_actively_preparing_order',
        'vendor_marks_order_as_fully_prepared',
        context
      );

      expect(result.valid).toBe(true);
      expect(result.nextStatus).toBe('order_is_fully_prepared_and_ready_for_delivery');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PREPARATION_COMPLETE', expect.any(Object));
    });

    test('should reject invalid transitions', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_marks_order_as_fully_prepared',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid transition');
    });
  });

  describe('Guard Conditions', () => {
    test('should enforce vendor active guard', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        vendor: { is_active: false } // Vendor not active
      };

      const result = await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_confirms_order_is_available',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });

    test('should enforce order not expired guard', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days ago

      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1, created_at: oldDate.toISOString() },
        vendor: { is_active: true }
      };

      const result = await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_confirms_order_is_available',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Guard failed');
    });
  });

  describe('Possible Events', () => {
    test('should return possible events for current state', () => {
      const events = vendorFSM.getPossibleEvents('awaiting_order_availability_vendor_confirmation');

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'vendor_confirms_order_is_available',
          nextStatus: 'awaiting_vendor_start_preparation'
        })
      );

      expect(events).toContainEqual(
        expect.objectContaining({
          event: 'vendor_rejects_order_due_to_unavailability',
          nextStatus: 'order_rejected_by_vendor'
        })
      );
    });
  });
});
