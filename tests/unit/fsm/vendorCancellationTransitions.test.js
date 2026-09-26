const EventEmitter = require('events');
const VendorFSM = require('../../../backend/fsm/VendorFSM');

describe('VendorFSM cancellation transitions', () => {
  let fsm;
  const vendorContext = {
    orderId: 1,
    userId: 10,
    userRole: 'vendor',
    order: { id: 1, vendor_id: 2 },
    vendor: { id: 2, is_active: true },
    store: { vendor_id: 2 },
    metadata: {}
  };

  beforeEach(() => {
    fsm = new VendorFSM(new EventEmitter(), 1);
  });

  it('allows the customer to cancel before vendor acceptance', async () => {
    const result = await fsm.executeTransition(
      fsm.getCurrentState(),
      'customer_cancels_order',
      { ...vendorContext, userId: 10, userRole: 'customer' }
    );

    expect(result).toMatchObject({
      success: true,
      toState: 'order_cancelled_by_customer'
    });
    expect(fsm.isTerminalState(result.toState)).toBe(true);
  });

  it('allows the vendor to cancel after acceptance but before preparation', async () => {
    await fsm.executeTransition(
      fsm.getCurrentState(),
      'vendor_accepts_order',
      vendorContext
    );

    const result = await fsm.executeTransition(
      fsm.getCurrentState(),
      'vendor_cancels_order',
      vendorContext
    );

    expect(result).toMatchObject({
      success: true,
      toState: 'order_cancelled_by_vendor'
    });
  });

  it('does not allow cancellation once preparation has started', async () => {
    await fsm.executeTransition(
      fsm.getCurrentState(),
      'vendor_accepts_order',
      vendorContext
    );
    await fsm.executeTransition(
      fsm.getCurrentState(),
      'vendor_starts_preparing',
      vendorContext
    );

    await expect(
      fsm.executeTransition(
        fsm.getCurrentState(),
        'customer_cancels_order',
        { ...vendorContext, userRole: 'customer' }
      )
    ).rejects.toThrow('Invalid transition');
  });
});
