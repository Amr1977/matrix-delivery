const MarketplaceOrderService = require('../../../backend/modules/marketplace/services/marketplaceOrderService');
const { multiFSMOrchestrator } = require('../../../backend/fsm/MultiFSMOrchestrator');

jest.mock('../../../backend/config/db', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] })
}));
const pool = require('../../../backend/config/db');

// Mock the repository
jest.mock('../../../backend/modules/marketplace/repositories/marketplaceOrderRepository');

const MarketplaceOrderRepository = require('../../../backend/modules/marketplace/repositories/marketplaceOrderRepository');

// Mock cart service - import after jest.mock
jest.mock('../../../backend/modules/marketplace/services/cartService');
const cartService = require('../../../backend/modules/marketplace/services/cartService');

jest.mock('../../../backend/services/timeoutScheduler', () => ({
  timeoutScheduler: {
    cancelTimeout: jest.fn().mockResolvedValue(undefined),
    scheduleTimeout: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('MarketplaceOrderService', () => {
  let service;
  let mockRepository;
  let mockCartService;

  beforeEach(() => {
    jest.resetAllMocks();

    // Create fresh mocks
    mockRepository = {
      createOrder: jest.fn(),
      getOrderById: jest.fn(),
      getOrdersByUser: jest.fn(),
      getOrdersByVendor: jest.fn(),
      updateOrderStatus: jest.fn(),
      createVendorPayout: jest.fn(),
      logAuditEvent: jest.fn()
    };

    mockCartService = cartService;
    mockCartService.validateCartForCheckout.mockReset();
    mockCartService.getUserCart.mockReset();
    multiFSMOrchestrator.initializeOrderFSMs(null);
    multiFSMOrchestrator.getOrderFSMStates = jest.fn().mockResolvedValue({
      vendor: null,
      payment: null,
      delivery: null
    });
    pool.query.mockReset().mockResolvedValue({ rows: [] });

    // Mock the constructor and methods
    MarketplaceOrderRepository.mockImplementation(() => mockRepository);
    service = new MarketplaceOrderService();
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const userId = 1;
      const orderData = {
        deliveryAddress: '123 Test St',
        deliveryFee: 5.00,
        customerNotes: 'Test order'
      };

      const mockCart = {
        id: 1,
        store_id: 1,
        total_amount: 20.00,
        items: []
      };

      const mockOrder = {
        id: 1,
        order_number: 'MO-123-456',
        total_amount: 25.00
      };

      // Mock cart validation
      mockCartService.validateCartForCheckout.mockResolvedValue({
        isValid: true,
        cartId: 1,
        totalAmount: 20.00
      });

      // Mock cart retrieval
      mockCartService.getUserCart.mockResolvedValue(mockCart);

      pool.query.mockResolvedValueOnce({ rows: [{ vendor_id: 1 }] });

      // Mock order creation
      mockRepository.createOrder.mockResolvedValue(mockOrder);
      jest.spyOn(service, 'initializeFSMOrchestrator').mockResolvedValue(undefined);

      // Mock payout creation
      mockRepository.createVendorPayout.mockResolvedValue({ id: 1 });

      // Mock audit logging
      mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

      const result = await service.createOrder(userId, orderData);

      expect(result).toEqual({
        ...mockOrder,
        fsm_states: { vendor: null, payment: null, delivery: null }
      });
      expect(mockCartService.validateCartForCheckout).toHaveBeenCalledWith(userId);
      expect(mockRepository.createOrder).toHaveBeenCalled();
      expect(mockRepository.createVendorPayout).not.toHaveBeenCalled();
      expect(mockRepository.logAuditEvent).toHaveBeenCalled();
    });

    it('should throw error if cart validation fails', async () => {
      const userId = 1;
      const orderData = { deliveryAddress: '123 Test St' };

      mockCartService.validateCartForCheckout.mockResolvedValue({
        isValid: false,
        stockValidation: { issues: [{ itemName: 'Test Item', requestedQuantity: 5, availableQuantity: 2 }] }
      });

      await expect(service.createOrder(userId, orderData)).rejects.toThrow(
        'Cart validation failed: Test Item: requested 5, available 2'
      );
    });

    it('should throw error if no active cart is available', async () => {
      const userId = 1;
      const orderData = {};

      mockCartService.validateCartForCheckout.mockResolvedValue({ isValid: true });
      mockCartService.getUserCart.mockResolvedValue(null);

      await expect(service.createOrder(userId, orderData)).rejects.toThrow('No active cart found');
    });
  });

  describe('getOrder', () => {
    it('should return order for customer', async () => {
      const orderId = 1;
      const userId = 1;
      const mockOrder = { id: 1, user_id: 1, order_number: 'MO-123-456' };

      mockRepository.getOrderById.mockResolvedValue(mockOrder);

      const result = await service.getOrder(orderId, userId);

      expect(result).toEqual(mockOrder);
      expect(mockRepository.getOrderById).toHaveBeenCalledWith(orderId);
    });

    it('should return order for vendor', async () => {
      const orderId = 1;
      const userId = 2; // Different user (vendor)
      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, order_number: 'MO-123-456' };

      // Mock vendor lookup
      const mockPool = require('../../../backend/config/db');
      mockPool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      mockRepository.getOrderById.mockResolvedValue(mockOrder);

      const result = await service.getOrder(orderId, userId);

      expect(result).toEqual(mockOrder);
    });

    it('should throw error for unauthorized access', async () => {
      const orderId = 1;
      const userId = 3; // Unauthorized user
      const mockOrder = { id: 1, user_id: 1, vendor_id: 2 };

      // Mock vendor lookup (user is not a vendor)
      const mockPool = require('../../../backend/config/db');
      mockPool.query = jest.fn().mockResolvedValue({ rows: [] });

      mockRepository.getOrderById.mockResolvedValue(mockOrder);

      await expect(service.getOrder(orderId, userId)).rejects.toThrow('Access denied');
    });

    it('should throw error if order not found', async () => {
      const orderId = 999;
      const userId = 1;

      mockRepository.getOrderById.mockResolvedValue(null);

      await expect(service.getOrder(orderId, userId)).rejects.toThrow('Order not found');
    });
  });

  describe('getOrdersForUser', () => {
    it('should return user orders', async () => {
      const userId = 1;
      const mockOrders = [{ id: 1, order_number: 'MO-123-456' }];

      mockRepository.getOrdersByUser.mockResolvedValue(mockOrders);

      const result = await service.getOrdersForUser(userId);

      expect(result).toEqual(mockOrders);
      expect(mockRepository.getOrdersByUser).toHaveBeenCalledWith(userId, {});
    });

    it('should apply filters', async () => {
      const userId = 1;
      const filters = { status: 'delivered', limit: 10 };

      mockRepository.getOrdersByUser.mockResolvedValue([]);

      await service.getOrdersForUser(userId, filters);

      expect(mockRepository.getOrdersByUser).toHaveBeenCalledWith(userId, filters);
    });
  });

  describe('State Machine Actions', () => {
    describe('vendorAcceptOrder', () => {
      it('should accept order successfully', async () => {
        const orderId = 1;
        const vendorId = 2;
        const mockOrder = { id: 1, vendor_id: 2, status: 'paid' };
        const acceptedOrder = { id: 1, vendor_id: 2, status: 'accepted' };

        mockRepository.getOrderById
          .mockResolvedValueOnce(mockOrder)
          .mockResolvedValueOnce(acceptedOrder);
        mockRepository.updateOrderStatus.mockResolvedValue(acceptedOrder);
        mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

        const result = await service.vendorAcceptOrder(orderId, vendorId);

        expect(result).toEqual({
          ...acceptedOrder,
          fsm_states: { vendor: null, payment: null, delivery: null }
        });
        expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, 'accepted', {});
      });

      it('should throw error for unauthorized vendor', async () => {
        const orderId = 1;
        const vendorId = 3; // Wrong vendor
        const mockOrder = { id: 1, vendor_id: 2, status: 'paid' };

        mockRepository.getOrderById.mockResolvedValue(mockOrder);

        await expect(service.vendorAcceptOrder(orderId, vendorId)).rejects.toThrow(
          'Only the assigned vendor can manage this order'
        );
      });
    });

    describe('customerConfirmReceipt', () => {
      it('should confirm receipt and complete order', async () => {
        const orderId = 1;
        const customerId = 1;
        const mockOrder = { id: 1, user_id: 1, status: 'delivered' };
        const completedOrder = { id: 1, user_id: 1, status: 'completed' };

        multiFSMOrchestrator.initializeOrderFSMs(orderId);
        multiFSMOrchestrator.fsms.delivery.setCurrentState(
          'awaiting_customer_confirmation_of_order_delivery'
        );
        mockRepository.getOrderById
          .mockResolvedValueOnce(mockOrder)
          .mockResolvedValueOnce(completedOrder);
        mockRepository.updateOrderStatus.mockResolvedValue(completedOrder);
        mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

        const result = await service.customerConfirmReceipt(orderId, customerId);

        expect(result).toEqual({
          ...completedOrder,
          fsm_states: { vendor: null, payment: null, delivery: null }
        });
        expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, 'completed', {});
      });

      it('should throw error for unauthorized customer', async () => {
        const orderId = 1;
        const customerId = 2; // Wrong customer
        const mockOrder = { id: 1, user_id: 1, status: 'delivered' };

        mockRepository.getOrderById.mockResolvedValue(mockOrder);

        await expect(service.customerConfirmReceipt(orderId, customerId)).rejects.toThrow(
          'Only the customer can perform this action'
        );
      });
    });

    describe('driverDeliverOrder', () => {
      it('should mark order as delivered', async () => {
        const orderId = 1;
        const driverId = 1;
        const mockOrder = { id: 1, status: 'picked_up' };
        const deliveredOrder = { id: 1, status: 'delivered' };

        multiFSMOrchestrator.initializeOrderFSMs(orderId);
        multiFSMOrchestrator.fsms.delivery.setCurrentState(
          'courier_has_arrived_at_customer_drop_off_location'
        );
        mockRepository.getOrderById
          .mockResolvedValueOnce(mockOrder)
          .mockResolvedValueOnce(deliveredOrder);
        mockRepository.updateOrderStatus.mockResolvedValue(deliveredOrder);
        mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

        const result = await service.driverDeliverOrder(orderId, driverId);

        expect(result).toEqual({
          ...deliveredOrder,
          fsm_states: { vendor: null, payment: null, delivery: null }
        });
        expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, 'delivered', {});
      });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order by customer', async () => {
      const orderId = 1;
      const userId = 1;
      const reason = 'Changed my mind';

      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'pending', items: [] };
      const cancelledOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'cancelled' };

      mockRepository.getOrderById
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValue(cancelledOrder);
      mockRepository.updateOrderStatus.mockResolvedValue(cancelledOrder);
      mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

      const result = await service.cancelOrder(orderId, userId, reason);

      expect(result).toEqual(cancelledOrder);
      expect(multiFSMOrchestrator.fsms.vendor.getCurrentState()).toBe(
        'order_cancelled_by_customer'
      );
    });

    it('should cancel order by vendor', async () => {
      const orderId = 1;
      const userId = 2; // Vendor user
      const reason = 'Item out of stock';

      // Mock vendor lookup
      const mockPool = require('../../../backend/config/db');
      mockPool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'accepted', items: [] };
      const cancelledOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'cancelled' };

      multiFSMOrchestrator.initializeOrderFSMs(orderId);
      multiFSMOrchestrator.fsms.vendor.setCurrentState('awaiting_vendor_start_preparation');
      mockRepository.getOrderById
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValueOnce(mockOrder)
        .mockResolvedValue(cancelledOrder);
      mockRepository.updateOrderStatus.mockResolvedValue(cancelledOrder);
      mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

      const result = await service.cancelOrder(orderId, userId, reason);

      expect(result).toEqual(cancelledOrder);
      expect(multiFSMOrchestrator.fsms.vendor.getCurrentState()).toBe(
        'order_cancelled_by_vendor'
      );
    });

    it('should throw error for orders that cannot be cancelled', async () => {
      const orderId = 1;
      const userId = 1;
      const reason = 'Too late';

      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'delivered' };

      mockRepository.getOrderById.mockResolvedValue(mockOrder);

      await expect(service.cancelOrder(orderId, userId, reason)).rejects.toThrow(
        'Order can only be cancelled before preparation starts'
      );
    });

    it('refunds a paid order through the Payment FSM', async () => {
      const orderId = 1;
      const order = { id: orderId, user_id: 1, vendor_id: 2, status: 'accepted', items: [] };
      const cancelledOrder = { ...order, status: 'cancelled' };

      multiFSMOrchestrator.initializeOrderFSMs(orderId);
      multiFSMOrchestrator.fsms.vendor.setCurrentState('awaiting_vendor_start_preparation');
      multiFSMOrchestrator.fsms.payment.setCurrentState(
        'payment_successfully_received_and_verified_for_order'
      );
      multiFSMOrchestrator.getOrderFSMStates.mockResolvedValue({
        vendor: 'order_cancelled_by_customer',
        payment: 'payment_successfully_received_and_verified_for_order',
        delivery: 'delivery_request_created_waiting_for_courier_acceptance'
      });
      mockRepository.getOrderById
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(order)
        .mockResolvedValue(cancelledOrder);

      const result = await service.cancelOrder(orderId, 1, 'Changed my mind');

      expect(result).toEqual(cancelledOrder);
      expect(multiFSMOrchestrator.fsms.payment.getCurrentState()).toBe(
        'payment_has_been_refunded_to_customer'
      );
      expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        'cancelled',
        { cancellationReason: 'Changed my mind' }
      );
    });
  });

  describe('getOrdersForVendor', () => {
    it('should return orders for the vendor', async () => {
      const vendorId = 1;
      const mockOrders = [{ id: 1, vendor_id: vendorId }];
      mockRepository.getOrdersByVendor.mockResolvedValue(mockOrders);

      const result = await service.getOrdersForVendor(vendorId);

      expect(result).toEqual(mockOrders);
      expect(mockRepository.getOrdersByVendor).toHaveBeenCalledWith(vendorId, {});
    });

    it('does not allow further transitions after an order is cancelled', async () => {
      mockRepository.getOrderById.mockResolvedValue({
        id: 1,
        user_id: 1,
        vendor_id: 2,
        status: 'cancelled'
      });

      await expect(
        service.vendorAcceptOrder(1, 2)
      ).rejects.toThrow('Cannot perform actions on a cancelled order');
    });
  });
});
