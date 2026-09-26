const { MultiFSMOrchestrator } = require('../../../backend/fsm/MultiFSMOrchestrator');

describe('MultiFSMOrchestrator FSM transitions', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new MultiFSMOrchestrator();
  });

  it('executes an action from the FSM current state and returns the transition contract', async () => {
    const result = await orchestrator.executeFSMTransition(
      1,
      'vendor',
      'customer_cancels_order',
      {
        orderId: 1,
        userId: 10,
        userRole: 'customer',
        order: { id: 1, user_id: 10 }
      }
    );

    expect(result).toMatchObject({
      valid: true,
      success: true,
      fromState: 'awaiting_order_availability_vendor_confirmation',
      toState: 'order_cancelled_by_customer',
      nextStatus: 'order_cancelled_by_customer'
    });
  });

  it('returns an explicit invalid result when no transition exists', async () => {
    const result = await orchestrator.executeFSMTransition(
      1,
      'vendor',
      'not_a_transition',
      {}
    );

    expect(result).toMatchObject({
      valid: false,
      error: expect.stringContaining('Invalid transition')
    });
  });
});
