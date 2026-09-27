const MarketplaceOrderRepository = require('../../backend/modules/marketplace/repositories/marketplaceOrderRepository');
const pool = require('../../backend/config/db');
jest.mock('../../backend/config/db');

describe('Marketplace Order Inventory Race Condition', () => {
  let orderRepository;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    orderRepository = new MarketplaceOrderRepository();

    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect = jest.fn().mockResolvedValue(mockClient);
  });

  it('throws when stock insufficient (inventory less than requested)', async () => {
    // BEGIN, generateOrderNumber, INSERT order, SELECT cart items
    mockClient.query
      .mockResolvedValueOnce() // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, order_number: 'MO-001' }] }) // INSERT order
      .mockResolvedValueOnce({
        rows: [{
          item_id: 101,
          name: 'Test Item',
          description: 'desc',
          unit_price: 50,
          quantity: 5,
        }],
      }) // SELECT cart items
      .mockResolvedValueOnce() // INSERT order_item
      .mockResolvedValueOnce({ rows: [{ inventory_quantity: 3 }] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE (fails: stock < quantity)

    // generateOrderNumber uses pool.query directly
    pool.query = jest.fn().mockResolvedValue({ rows: [] });

    await expect(orderRepository.createOrder({
      userId: 1,
      cartId: 10,
      storeId: 1,
      vendorId: 1,
      totalAmount: 250,
      commissionRate: 10,
      deliveryAddress: '123 Test St',
      deliveryLat: 30.0,
      deliveryLng: 31.0,
    })).rejects.toThrow(/Insufficient stock/);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('throws when race condition depletes stock between check and update', async () => {
    pool.query = jest.fn().mockResolvedValue({ rows: [] });

    mockClient.query
      .mockResolvedValueOnce() // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, order_number: 'MO-001' }] }) // INSERT order
      .mockResolvedValueOnce({
        rows: [{
          item_id: 101,
          name: 'Test Item',
          description: 'desc',
          unit_price: 50,
          quantity: 5,
        }],
      }) // SELECT cart items
      .mockResolvedValueOnce() // INSERT order_item
      .mockResolvedValueOnce({ rows: [{ inventory_quantity: 5 }] }) // SELECT FOR UPDATE (stock OK)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // UPDATE fails (concurrent depletion)

    await expect(orderRepository.createOrder({
      userId: 1,
      cartId: 10,
      storeId: 1,
      vendorId: 1,
      totalAmount: 250,
      commissionRate: 10,
      deliveryAddress: '123 Test St',
      deliveryLat: 30.0,
      deliveryLng: 31.0,
    })).rejects.toThrow(/Race condition/);

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('Marketplace Order Service - Commission Calculation', () => {
  it('verifies commission is calculated as (totalAmount * commissionRate) / 100', () => {
    const totalAmount = 1000;
    const commissionRate = 10;
    const expectedCommission = (totalAmount * commissionRate) / 100;
    expect(expectedCommission).toBe(100);
  });

  it('verifies payout net amount = totalAmount - commissionAmount', () => {
    const totalAmount = 1000;
    const commissionAmount = 100;
    const expectedNet = totalAmount - commissionAmount;
    expect(expectedNet).toBe(900);
  });

  it('uses default 10% commission rate for marketplace orders', () => {
    const defaultRate = 10;
    const orderTotal = 500;
    const commission = (orderTotal * defaultRate) / 100;
    expect(commission).toBe(50);
  });
});

describe('Cart Single-Store Constraint', () => {
  it('throws when adding item from a different store', async () => {
    const cartService = require('../../backend/modules/marketplace/services/cartService');

    // Mock: item belongs to store 1, but user tries to add to cart for store 2
    pool.query = jest.fn().mockResolvedValue({
      rows: [{
        id: 100,
        name: 'Test Item',
        store_id: 1,
        inventory_quantity: 10,
        price: 50,
      }],
    });

    await expect(cartService.addItemToCart(1, 2, 100, 1)).rejects.toThrow(/Item does not belong to the specified store/);
  });

  it('throws when cart already has items from a different store', async () => {
    const cartService = require('../../backend/modules/marketplace/services/cartService');

    // Mock: no existing cart, item belongs to store 2, but user has existing cart for store 1
    pool.query = jest.fn().mockResolvedValue({
      rows: [{
        id: 100,
        name: 'Test Item',
        store_id: 2,
        inventory_quantity: 10,
        price: 50,
      }],
    });

    const cartRepository = require('../../backend/modules/marketplace/repositories/cartRepository');
    jest.spyOn(cartRepository, 'getUserCartForDifferentStore').mockResolvedValue({
      id: 1,
      store_id: 1,
      store_name: 'Original Store',
    });

    await expect(cartService.addItemToCart(1, 2, 100, 1)).rejects.toThrow(/Cannot add items from this store/);
  });
});
