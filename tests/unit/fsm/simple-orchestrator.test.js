const { multiFSMOrchestrator } = require('../../backend/fsm/MultiFSMOrchestrator');

// Test the orchestrator directly without complex mocks
describe('MultiFSMOrchestrator Basic Tests', () => {
  test('should initialize orchestrator', () => {
    expect(multiFSMOrchestrator).toBeDefined();
    expect(multiFSMOrchestrator.eventEmitter).toBeDefined();
    expect(multiFSMOrchestrator.fsms).toBeDefined();
  });

  test('should have all three FSMs', () => {
    expect(multiFSMOrchestrator.fsms.vendor).toBeDefined();
    expect(multiFSMOrchestrator.fsms.payment).toBeDefined();
    expect(multiFSMOrchestrator.fsms.delivery).toBeDefined();
  });

  test('should have correct initial states', () => {
    const vendorState = multiFSMOrchestrator.fsms.vendor.getInitialState();
    const paymentState = multiFSMOrchestrator.fsms.payment.getInitialState();
    const deliveryState = multiFSMOrchestrator.fsms.delivery.getInitialState();

    expect(vendorState).toBe('awaiting_order_availability_vendor_confirmation');
    expect(paymentState).toBe('payment_pending_for_customer');
    expect(deliveryState).toBe('delivery_request_created_waiting_for_courier_acceptance');
  });
});
