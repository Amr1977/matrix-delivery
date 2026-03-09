const VendorFSM = require('../../backend/fsm/VendorFSM');

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

describe('VendorFSM', () => {
  let vendorFSM;
  let mockEventEmitter;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

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
        vendor: { is_active: true },
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
        metadata: { rejectionReason: 'Out of stock' }
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

    test('should reject transitions from terminal states', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'order_rejected_by_vendor',
        'vendor_confirms_order_is_available',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Terminal state');
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

    test('should enforce vendor ownership guard', async () => {
      const context = {
        userId: 2, // Wrong vendor user
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 }, // Order belongs to vendor 1
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

    test('should enforce actor role guard', async () => {
      const context = {
        userId: 1,
        userRole: 'customer', // Wrong role
        order: { id: 123, vendor_id: 1 },
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

    test('should return empty array for terminal state', () => {
      const events = vendorFSM.getPossibleEvents('order_rejected_by_vendor');
      expect(events).toEqual([]);
    });
  });

  describe('Event Emission', () => {
    test('should emit correct event data for vendor confirmation', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        vendor: { is_active: true },
        metadata: {}
      };

      await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_confirms_order_is_available',
        context
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('VENDOR_CONFIRMED', {
        orderId: 123,
        fromState: 'awaiting_order_availability_vendor_confirmation',
        toState: 'awaiting_vendor_start_preparation',
        actor: { userId: 1, role: 'vendor' },
        metadata: {}
      });
    });

    test('should emit correct event data for preparation completion', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: { preparationNotes: 'Ready for pickup' }
      };

      await vendorFSM.validateAndTransition(
        'vendor_is_actively_preparing_order',
        'vendor_marks_order_as_fully_prepared',
        context
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('PREPARATION_COMPLETE', {
        orderId: 123,
        fromState: 'vendor_is_actively_preparing_order',
        toState: 'order_is_fully_prepared_and_ready_for_delivery',
        actor: { userId: 1, role: 'vendor' },
        metadata: { preparationNotes: 'Ready for pickup' }
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle missing context gracefully', async () => {
      const result = await vendorFSM.validateAndTransition(
        'awaiting_order_availability_vendor_confirmation',
        'vendor_confirms_order_is_available',
        null
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid context');
    });

    test('should handle invalid state gracefully', async () => {
      const context = {
        userId: 1,
        userRole: 'vendor',
        order: { id: 123, vendor_id: 1 },
        metadata: {}
      };

      const result = await vendorFSM.validateAndTransition(
        'invalid_state',
        'vendor_confirms_order_is_available',
        context
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid current state');
    });
  });
});
