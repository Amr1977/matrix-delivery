const marketplaceOrderController = require('../../../backend/controllers/marketplaceOrderController');
const marketplaceOrderService = require('../../../backend/services/marketplaceOrderService');
const pool = require('../../../backend/config/db');

jest.mock('../../../backend/services/marketplaceOrderService');
jest.mock('../../../backend/config/db');

describe('MarketplaceOrderController', () => {
  let mockService;
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      createOrder: jest.fn(),
      getOrder: jest.fn(),
      getOrdersForUser: jest.fn(),
      updateOrderStatus: jest.fn(),
      cancelOrder: jest.fn(),
      getOrderStats: jest.fn(),
      vendorAcceptOrder: jest.fn(),
      vendorRejectOrder: jest.fn()
    };

    marketplaceOrderService.mockImplementation(() => mockService);

    mockReq = {
      user: { userId: 1 },
      params: {},
      query: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent')
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const orderData = {
        deliveryAddress: '123 Test St',
        deliveryFee: 5.00,
        customerNotes: 'Test order'
      };

      const mockOrder = {
        id: 1,
        order_number: 'MO-123-456',
        total_amount: 25.00
      };

      mockReq.body = orderData;
      mockService.createOrder.mockResolvedValue(mockOrder);

      await marketplaceOrderController.createOrder(mockReq, mockRes);

      expect(mockService.createOrder).toHaveBeenCalledWith(1, orderData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order created successfully',
        data: mockOrder
      });
    });

    it('should return 400 for missing delivery address', async () => {
      mockReq.body = { deliveryFee: 5.00 };

      await marketplaceOrderController.createOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Delivery address is required'
      });
    });

    it('should handle service errors', async () => {
      const orderData = { deliveryAddress: '123 Test St' };
      mockReq.body = orderData;

      mockService.createOrder.mockRejectedValue(new Error('Cart validation failed'));

      await marketplaceOrderController.createOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cart validation failed'
      });
    });
  });

  describe('getOrder', () => {
    it('should return order successfully', async () => {
      const mockOrder = { id: 1, order_number: 'MO-123-456' };
      mockReq.params.id = '1';

      mockService.getOrder.mockResolvedValue(mockOrder);

      await marketplaceOrderController.getOrder(mockReq, mockRes);

      expect(mockService.getOrder).toHaveBeenCalledWith(1, 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrder
      });
    });

    it('should return 404 for not found order', async () => {
      mockReq.params.id = '999';
      mockService.getOrder.mockRejectedValue(new Error('Order not found'));

      await marketplaceOrderController.getOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      mockReq.params.id = '1';
      mockService.getOrder.mockRejectedValue(new Error('Access denied'));

      await marketplaceOrderController.getOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied'
      });
    });
  });

  describe('getOrders', () => {
    it('should return user orders', async () => {
      const mockOrders = [{ id: 1, order_number: 'MO-123-456' }];
      mockReq.query = { status: 'delivered', limit: '10' };

      mockService.getOrdersForUser.mockResolvedValue(mockOrders);

      await marketplaceOrderController.getOrders(mockReq, mockRes);

      expect(mockService.getOrdersForUser).toHaveBeenCalledWith(1, {
        status: 'delivered',
        limit: 10,
        offset: undefined
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockOrders
      });
    });

    it('should handle service errors', async () => {
      mockService.getOrdersForUser.mockRejectedValue(new Error('Database error'));

      await marketplaceOrderController.getOrders(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });

  describe('updateOrderStatus', () => {
    it('should accept order successfully', async () => {
      const mockOrder = { id: 1, status: 'accepted' };
      mockReq.params.id = '1';
      mockReq.body = { action: 'accept', vendorNotes: 'Ready for pickup' };

      // Mock vendor ID lookup
      pool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      mockService.vendorAcceptOrder.mockResolvedValue(mockOrder);

      await marketplaceOrderController.updateOrderStatus(mockReq, mockRes);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id FROM vendors WHERE user_id = $1',
        [1]
      );
      expect(mockService.vendorAcceptOrder).toHaveBeenCalledWith(1, 2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order accepted successfully',
        data: mockOrder
      });
    });

    it('should reject order successfully', async () => {
      const mockOrder = { id: 1, status: 'rejected' };
      mockReq.params.id = '1';
      mockReq.body = { action: 'reject', vendorNotes: 'Out of stock' };

      // Mock vendor ID lookup
      pool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      mockService.vendorRejectOrder.mockResolvedValue(mockOrder);

      await marketplaceOrderController.updateOrderStatus(mockReq, mockRes);

      expect(mockService.vendorRejectOrder).toHaveBeenCalledWith(1, 2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order rejected successfully',
        data: mockOrder
      });
    });

    it('should return 400 for missing action', async () => {
      mockReq.params.id = '1';
      mockReq.body = {};

      await marketplaceOrderController.updateOrderStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Action is required'
      });
    });

    it('should return 400 for invalid action', async () => {
      mockReq.params.id = '1';
      mockReq.body = { action: 'invalid_action' };

      // Mock vendor ID lookup
      pool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      await marketplaceOrderController.updateOrderStatus(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid action. Supported actions: accept, reject'
      });
    });

  describe('cancelOrder', () => {
    it('should cancel order successfully', async () => {
      const mockOrder = { id: 1, status: 'cancelled' };
      mockReq.params.id = '1';
      mockReq.body = { reason: 'Changed my mind' };

      mockService.cancelOrder.mockResolvedValue(mockOrder);

      await marketplaceOrderController.cancelOrder(mockReq, mockRes);

      expect(mockService.cancelOrder).toHaveBeenCalledWith(1, 1, 'Changed my mind');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Order cancelled successfully',
        data: mockOrder
      });
    });

    it('should return 400 for missing reason', async () => {
      mockReq.params.id = '1';
      mockReq.body = {};

      await marketplaceOrderController.cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cancellation reason is required'
      });
    });

    it('should handle service errors', async () => {
      mockReq.params.id = '1';
      mockReq.body = { reason: 'Test' };

      mockService.cancelOrder.mockRejectedValue(new Error('Order cannot be cancelled at this stage'));

      await marketplaceOrderController.cancelOrder(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Order cannot be cancelled at this stage'
      });
    });
  });

  describe('getVendorStats', () => {
    it('should return vendor statistics', async () => {
      const mockStats = {
        total_orders: 10,
        completed_orders: 8,
        total_revenue: 500.00
      };

      // Mock vendor ID lookup
      pool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });

      mockService.getOrderStats.mockResolvedValue(mockStats);

      await marketplaceOrderController.getVendorStats(mockReq, mockRes);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id FROM vendors WHERE user_id = $1',
        [1]
      );
      expect(mockService.getOrderStats).toHaveBeenCalledWith(2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockStats
      });
    });

    it('should handle service errors', async () => {
      pool.query = jest.fn().mockResolvedValue({ rows: [{ id: 2 }] });
      mockService.getOrderStats.mockRejectedValue(new Error('Database error'));

      await marketplaceOrderController.getVendorStats(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database error'
      });
    });
  });
});
