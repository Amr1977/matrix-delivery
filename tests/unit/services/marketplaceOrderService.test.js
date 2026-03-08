const MarketplaceOrderService = require('../../../backend/services/marketplaceOrderService');

// Mock the repository
jest.mock('../../../backend/repositories/marketplaceOrderRepository');

const MarketplaceOrderRepository = require('../../../backend/repositories/marketplaceOrderRepository');
const CartService = require('../../../backend/services/cartService');

// Mock cart service
jest.mock('../../../backend/services/cartService');

describe('MarketplaceOrderService', () => {
  let service;
  let mockRepository;
  let mockCartService;

  beforeEach(() => {
    jest.clearAllMocks();

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

    mockCartService = {
      validateCartForCheckout: jest.fn(),
      getUserCart: jest.fn()
    };

    // Mock the constructor and methods
    MarketplaceOrderRepository.mockImplementation(() => mockRepository);
    CartService.mockImplementation(() => mockCartService);

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

      // Mock vendor ID query
      const mockPool = require('../../../backend/config/db');
      mockPool.query = jest.fn().mockResolvedValue({
        rows: [{ vendor_id: 1 }]
      });

      // Mock order creation
      mockRepository.createOrder.mockResolvedValue(mockOrder);

      // Mock payout creation
      mockRepository.createVendorPayout.mockResolvedValue({ id: 1 });

      // Mock audit logging
      mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

      const result = await service.createOrder(userId, orderData);

      expect(result).toEqual(mockOrder);
      expect(mockCartService.validateCartForCheckout).toHaveBeenCalledWith(userId);
      expect(mockRepository.createOrder).toHaveBeenCalled();
      expect(mockRepository.createVendorPayout).toHaveBeenCalled();
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

    it('should throw error if no delivery address provided', async () => {
      const userId = 1;
      const orderData = {};

      await expect(service.createOrder(userId, orderData)).rejects.toThrow('Delivery address is required');
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

        mockRepository.getOrderById.mockResolvedValue(mockOrder);
        mockRepository.updateOrderStatus.mockResolvedValue(acceptedOrder);
        mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

        const result = await service.vendorAcceptOrder(orderId, vendorId);

        expect(result).toEqual(acceptedOrder);
        expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, 'accepted', {});
      });

      it('should throw error for unauthorized vendor', async () => {
        const orderId = 1;
        const vendorId = 3; // Wrong vendor
        const mockOrder = { id: 1, vendor_id: 2, status: 'paid' };

        mockRepository.getOrderById.mockResolvedValue(mockOrder);

        await expect(service.vendorAcceptOrder(orderId, vendorId)).rejects.toThrow(
          'Only the assigned vendor can accept/reject this order'
        );
      });
    });

    describe('customerConfirmReceipt', () => {
      it('should confirm receipt and complete order', async () => {
        const orderId = 1;
        const customerId = 1;
        const mockOrder = { id: 1, user_id: 1, status: 'delivered' };
        const completedOrder = { id: 1, user_id: 1, status: 'completed' };

        mockRepository.getOrderById.mockResolvedValue(mockOrder);
        mockRepository.updateOrderStatus.mockResolvedValue(completedOrder);
        mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

        const result = await service.customerConfirmReceipt(orderId, customerId);

        expect(result).toEqual(completedOrder);
        expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, 'completed', {});
      });

      it('should throw error for unauthorized customer', async () => {
        const orderId = 1;
        const customerId = 2; // Wrong customer
        const mockOrder = { id: 1, user_id: 1, status: 'delivered' };

        mockRepository.getOrderById.mockResolvedValue(mockOrder);

        await expect(service.customerConfirmReceipt(orderId, customerId)).rejects.toThrow(
          'Only the customer can confirm receipt or dispute'
        );
      });
    });

    describe('driverDeliverOrder', () => {
      it('should mark order as delivered', async () => {
        const orderId = 1;
        const driverId = 1;
        const mockOrder = { id: 1, status: 'picked_up' };
        const deliveredOrder = { id: 1, status: 'delivered' };

        mockRepository.getOrderById.mockResolvedValue(mockOrder);
        mockRepository.updateOrderStatus.mockResolvedValue(deliveredOrder);
        mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

        const result = await service.driverDeliverOrder(orderId, driverId);

        expect(result).toEqual(deliveredOrder);
        expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(orderId, 'delivered', {});
      });
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order by customer', async () => {
      const orderId = 1;
      const userId = 1;
      const reason = 'Changed my mind';

      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'pending' };
      const cancelledOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'cancelled' };

      mockRepository.getOrderById.mockResolvedValue(mockOrder);
      mockRepository.updateOrderStatus.mockResolvedValue(cancelledOrder);
      mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

      const result = await service.cancelOrder(orderId, userId, reason);

      expect(result).toEqual(cancelledOrder);
      expect(mockRepository.updateOrderStatus).toHaveBeenCalledWith(
        orderId,
        'cancelled',
        { cancellationReason: reason }
      );
    });

    it('should cancel order by vendor', async () => {
      const orderId = 1;
      const userId = 2; // Vendor user
      const reason = 'Item out of stock';

      // Mock vendor lookup
      const mockPool = require('../../../backend/config/db');
      mockPool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'confirmed' };
      const cancelledOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'cancelled' };

      mockRepository.getOrderById.mockResolvedValue(mockOrder);
      mockRepository.updateOrderStatus.mockResolvedValue(cancelledOrder);
      mockRepository.logAuditEvent.mockResolvedValue({ id: 1 });

      const result = await service.cancelOrder(orderId, userId, reason);

      expect(result).toEqual(cancelledOrder);
    });

    it('should throw error for orders that cannot be cancelled', async () => {
      const orderId = 1;
      const userId = 1;
      const reason = 'Too late';

      const mockOrder = { id: 1, user_id: 1, vendor_id: 2, status: 'delivered' };

      mockRepository.getOrderById.mockResolvedValue(mockOrder);

      await expect(service.cancelOrder(orderId, userId, reason)).rejects.toThrow(
        'Order cannot be cancelled at this stage'
      );
    });
  });

  describe('getOrderStats', () => {
    it('should return order statistics for vendor', async () => {
      const vendorId = 1;
      const mockStats = {
        total_orders: 10,
        completed_orders: 8,
        cancelled_orders: 1,
        total_revenue: 500.00,
        avg_order_value: 50.00
      };

      const mockPool = require('../../../backend/config/db');
      mockPool.query = jest.fn().mockResolvedValue({ rows: [mockStats] });

      const result = await service.getOrderStats(vendorId);

      expect(result).toEqual(mockStats);
    });
  });
});
