const MarketplaceOrderRepository = require('../../../backend/repositories/marketplaceOrderRepository');
const pool = require('../../../backend/config/db');

jest.mock('../../../backend/config/db');

describe('MarketplaceOrderRepository', () => {
  let repository;
  let mockQuery;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new MarketplaceOrderRepository();

    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Mock pool
    mockQuery = jest.fn();
    const mockPool = {
      query: mockQuery,
      connect: jest.fn().mockResolvedValue(mockClient)
    };

    // Replace the pool import
    require('../../../backend/config/db').query = mockQuery;
    require('../../../backend/config/db').connect = mockPool.connect;

    // Reset mock implementation
    mockQuery.mockReset();
    mockClient.query.mockReset();
    mockQuery.mockImplementation(() => ({ rows: [] }));
    mockClient.query.mockImplementation(() => ({ rows: [] }));
  });

  describe('createOrder', () => {
    it('should create order successfully with inventory deduction', async () => {
      // Mock cart items query
      mockQuery
        .mockImplementationOnce(() => ({
          rows: [
            { item_id: 1, quantity: 2, unit_price: 10.00, name: 'Test Item', description: 'Test' }
          ]
        }))
        // Mock order creation
        .mockImplementationOnce(() => ({
          rows: [{ id: 1, order_number: 'MO-123-456' }]
        }))
        // Mock order items creation (2 times for 2 items)
        .mockImplementationOnce(() => ({ rows: [{ id: 1 }] }))
        // Mock inventory update
        .mockImplementationOnce(() => ({ rowCount: 1 }))
        // Mock cart clearing (2 queries)
        .mockImplementationOnce(() => ({ rowCount: 1 }))
        .mockImplementationOnce(() => ({ rowCount: 1 }))
        // Mock final order retrieval
        .mockImplementationOnce(() => ({
          rows: [{
            id: 1,
            order_number: 'MO-123-456',
            total_amount: 20.00,
            items: [{ item_id: 1, quantity: 2 }]
          }]
        }));

      const orderData = {
        userId: 1,
        cartId: 1,
        storeId: 1,
        vendorId: 1,
        totalAmount: 20.00,
        deliveryFee: 5.00,
        deliveryAddress: '123 Test St',
        commissionRate: 10.00,
        customerNotes: 'Test order'
      };

      const result = await repository.createOrder(orderData);

      expect(result).toBeDefined();
      expect(result.order_number).toBe('MO-123-456');
      expect(mockQuery).toHaveBeenCalledTimes(7); // All queries executed
    });

    it('should rollback transaction on error', async () => {
      // Mock transaction begin
      mockClient.query.mockImplementationOnce(() => Promise.resolve());

      // Mock error on cart items query
      mockClient.query.mockImplementationOnce(() => Promise.reject(new Error('Database error')));

      // Mock rollback
      mockClient.query.mockImplementationOnce(() => Promise.resolve());

      const orderData = {
        userId: 1,
        cartId: 1,
        storeId: 1,
        vendorId: 1,
        totalAmount: 20.00
      };

      await expect(repository.createOrder(orderData)).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getOrderById', () => {
    it('should return order with items', async () => {
      const mockOrder = {
        id: 1,
        order_number: 'MO-123-456',
        user_id: 1,
        store_id: 1,
        vendor_id: 1,
        total_amount: 20.00,
        status: 'pending',
        customer_name: 'John Doe',
        store_name: 'Test Store',
        vendor_name: 'Test Vendor'
      };

      const mockItems = [
        { id: 1, item_id: 1, item_name: 'Test Item', quantity: 2, unit_price: 10.00 }
      ];

      mockQuery
        .mockImplementationOnce(() => ({ rows: [mockOrder] }))
        .mockImplementationOnce(() => ({ rows: mockItems }));

      const result = await repository.getOrderById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(result.order_number).toBe('MO-123-456');
      expect(result.items).toEqual(mockItems);
    });

    it('should return null if order not found', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [] }));

      const result = await repository.getOrderById(999);

      expect(result).toBeNull();
    });
  });

  describe('getOrdersByUser', () => {
    it('should return user orders with items', async () => {
      const mockOrders = [
        { id: 1, order_number: 'MO-123-456', status: 'delivered', total_amount: 20.00 }
      ];

      mockQuery
        .mockImplementationOnce(() => ({ rows: mockOrders }))
        .mockImplementationOnce(() => ({ rows: [] }));

      const result = await repository.getOrdersByUser(1);

      expect(result).toEqual(mockOrders);
      expect(result[0].items).toEqual([]);
    });

    it('should apply status filter', async () => {
      const filters = { status: 'delivered' };

      mockQuery.mockImplementationOnce(() => ({ rows: [] }));

      await repository.getOrdersByUser(1, filters);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('status = $2'),
        [1, 'delivered']
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status successfully', async () => {
      mockQuery.mockImplementationOnce(() => ({
        rows: [{ id: 1, status: 'confirmed' }]
      }));

      const result = await repository.updateOrderStatus(1, 'confirmed');

      expect(result).toBeDefined();
      expect(result.status).toBe('confirmed');
    });

    it('should throw error if order not found', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [] }));

      await expect(repository.updateOrderStatus(999, 'confirmed')).rejects.toThrow('Order not found');
    });

    it('should include vendor notes when provided', async () => {
      mockQuery.mockImplementationOnce(() => ({ rows: [{ id: 1 }] }));

      await repository.updateOrderStatus(1, 'confirmed', { vendorNotes: 'Ready for pickup' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('vendor_notes = $2'),
        ['confirmed', 'Ready for pickup', 1]
      );
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate unique order number', async () => {
      // Mock no existing order number
      mockQuery.mockImplementation(() => ({ rows: [] }));

      const result = await repository.generateOrderNumber();

      expect(result).toMatch(/^MO-\d+-\d{3}$/);
    });

    it('should handle collisions and retry', async () => {
      // Mock collision on first attempt
      mockQuery
        .mockImplementationOnce(() => ({ rows: [{ id: 1 }] }))
        .mockImplementationOnce(() => ({ rows: [] }));

      const result = await repository.generateOrderNumber();

      expect(result).toMatch(/^MO-\d+-\d{3}$/);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('createVendorPayout', () => {
    it('should create vendor payout successfully', async () => {
      mockQuery.mockImplementationOnce(() => ({
        rows: [{ id: 1, vendor_id: 1, amount: 20.00, commission_amount: 2.00 }]
      }));

      const result = await repository.createVendorPayout(1, 1, 20.00, 2.00);

      expect(result).toBeDefined();
      expect(result.vendor_id).toBe(1);
      expect(result.amount).toBe(20.00);
    });
  });

  describe('logAuditEvent', () => {
    it('should log audit event successfully', async () => {
      mockQuery.mockImplementationOnce(() => ({
        rows: [{ id: 1, action: 'order_created' }]
      }));

      const auditData = {
        userId: 1,
        vendorId: 1,
        orderId: 1,
        action: 'order_created',
        entityType: 'marketplace_order',
        entityId: 1
      };

      const result = await repository.logAuditEvent(auditData);

      expect(result).toBeDefined();
      expect(result.action).toBe('order_created');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        [
          1, 1, 1, 'order_created', 'marketplace_order', 1,
          null, null, null, undefined, undefined
        ]
      );
    });
  });
});
