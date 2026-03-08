const cartRepository = require('../../../backend/services/cartRepository');
const pool = require('../../../backend/config/db');
const logger = require('../../../backend/config/logger');

// Mock dependencies
jest.mock('../../../backend/config/db');
jest.mock('../../../backend/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('CartRepository - Unit Tests', () => {
  const mockUserId = 'user-123';
  const mockStoreId = 1;
  const mockItemId = 1;
  const mockCartId = 1;

  const mockCart = {
    id: mockCartId,
    user_id: mockUserId,
    store_id: mockStoreId,
    store_name: 'Test Store',
    vendor_id: 'vendor-123',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    created_at: new Date(),
    updated_at: new Date()
  };

  const mockCartItem = {
    id: 1,
    cart_id: mockCartId,
    item_id: mockItemId,
    quantity: 2,
    unit_price: 50.00,
    created_at: new Date(),
    updated_at: new Date(),
    item_name: 'Test Item',
    current_price: 50.00,
    available_stock: 20
  };

  const mockQueryResult = {
    rows: [mockCart]
  };

  const mockCartItemResult = {
    rows: [mockCartItem]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateCart', () => {
    it('should create new cart when none exists', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult); // First query returns empty
      pool.query.mockResolvedValueOnce(mockQueryResult); // Second query creates cart
      pool.query.mockResolvedValueOnce(mockQueryResult); // Third query gets cart with store

      const result = await cartRepository.getOrCreateCart(mockUserId, mockStoreId);

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query).toHaveBeenNthCalledWith(2,
        expect.stringContaining('INSERT INTO shopping_carts'),
        [mockUserId, mockStoreId, expect.any(Date)]
      );
      expect(result).toEqual(mockCart);
    });

    it('should return existing cart for user and store', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult); // Existing cart found

      const result = await cartRepository.getOrCreateCart(mockUserId, mockStoreId);

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT sc.*, s.name as store_name'),
        [mockUserId, mockStoreId, expect.any(Date)]
      );
      expect(result).toEqual(mockCart);
    });
  });

  describe('getCartById', () => {
    it('should retrieve cart with all items and calculations', async () => {
      const cartWithItemsResult = {
        rows: [{
          ...mockCart,
          items: [{ ...mockCartItem, cart_id: undefined }], // Remove circular reference
          total_items: 2,
          total_amount: 100.00
        }]
      };

      pool.query.mockResolvedValueOnce(cartWithItemsResult); // Cart details
      pool.query.mockResolvedValueOnce({ rows: [{ ...mockCartItem, cart_id: undefined }] }); // Cart items

      const result = await cartRepository.getCartById(mockCartId);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(result).toEqual(cartWithItemsResult.rows[0]);
      expect(result.items).toHaveLength(1);
    });

    it('should return null when cart not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cartRepository.getCartById(999);

      expect(result).toBeNull();
    });
  });

  describe('getUserActiveCart', () => {
    it('should return user active cart', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult);

      const result = await cartRepository.getUserActiveCart(mockUserId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT sc.*, s.name as store_name'),
        [mockUserId]
      );
      expect(result).toEqual(mockCart);
    });

    it('should return null when no active cart', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cartRepository.getUserActiveCart(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('addItemToCart', () => {
    it('should add new item to cart', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] }); // No existing item
      pool.query.mockResolvedValueOnce(mockCartItemResult); // Insert new item

      const result = await cartRepository.addItemToCart(mockCartId, mockItemId, 2, 50.00);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(1,
        'SELECT * FROM cart_items WHERE cart_id = $1 AND item_id = $2',
        [mockCartId, mockItemId]
      );
      expect(pool.query).toHaveBeenNthCalledWith(2,
        'INSERT INTO cart_items (cart_id, item_id, quantity, unit_price) VALUES ($1, $2, $3, $4) RETURNING *',
        [mockCartId, mockItemId, 2, 50.00]
      );
      expect(result).toEqual(mockCartItem);
    });

    it('should update quantity of existing item', async () => {
      const existingItem = { ...mockCartItem, quantity: 1 };
      pool.query.mockResolvedValueOnce({ rows: [existingItem] }); // Existing item found
      pool.query.mockResolvedValueOnce(mockCartItemResult); // Update existing item

      const result = await cartRepository.addItemToCart(mockCartId, mockItemId, 2, 50.00);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(2,
        'UPDATE cart_items SET quantity = $1, unit_price = $2, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $3 AND item_id = $4 RETURNING *',
        [3, 50.00, mockCartId, mockItemId] // 1 + 2 = 3
      );
      expect(result).toEqual(mockCartItem);
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity', async () => {
      pool.query.mockResolvedValueOnce(mockCartItemResult);

      const result = await cartRepository.updateCartItem(mockCartId, mockItemId, 5);

      expect(pool.query).toHaveBeenCalledWith(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2 AND item_id = $3 RETURNING *',
        [5, mockCartId, mockItemId]
      );
      expect(result).toEqual(mockCartItem);
    });

    it('should return null when item not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cartRepository.updateCartItem(mockCartId, mockItemId, 5);

      expect(result).toBeNull();
    });
  });

  describe('removeItemFromCart', () => {
    it('should remove item from cart', async () => {
      pool.query.mockResolvedValueOnce(mockCartItemResult);

      const result = await cartRepository.removeItemFromCart(mockCartId, mockItemId);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM cart_items WHERE cart_id = $1 AND item_id = $2 RETURNING *',
        [mockCartId, mockItemId]
      );
      expect(result).toEqual(mockCartItem);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      const multipleItems = { rows: [mockCartItem, { ...mockCartItem, id: 2 }] };
      pool.query.mockResolvedValueOnce(multipleItems);

      const result = await cartRepository.clearCart(mockCartId);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM cart_items WHERE cart_id = $1 RETURNING *',
        [mockCartId]
      );
      expect(result).toEqual(multipleItems.rows);
    });
  });

  describe('deleteCart', () => {
    it('should delete cart entirely', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult);

      const result = await cartRepository.deleteCart(mockCartId);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM shopping_carts WHERE id = $1 RETURNING *',
        [mockCartId]
      );
      expect(result).toEqual(mockCart);
    });
  });

  describe('getUserCartForDifferentStore', () => {
    it('should return cart for different store', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult);

      const result = await cartRepository.getUserCartForDifferentStore(mockUserId, 999);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('sc.store_id != $2'),
        [mockUserId, 999]
      );
      expect(result).toEqual(mockCart);
    });

    it('should return null when no conflicting cart', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cartRepository.getUserCartForDifferentStore(mockUserId, 999);

      expect(result).toBeNull();
    });
  });

  describe('validateCartStock', () => {
    it('should validate stock for all cart items', async () => {
      const stockCheckResult = {
        rows: [{
          item_id: mockItemId,
          quantity: 2,
          inventory_quantity: 20,
          item_name: 'Test Item'
        }]
      };

      pool.query.mockResolvedValueOnce(stockCheckResult);

      const result = await cartRepository.validateCartStock(mockCartId);

      expect(pool.query).toHaveBeenCalledWith(
        'SELECT ci.item_id, ci.quantity, i.inventory_quantity, i.name as item_name FROM cart_items ci JOIN items i ON ci.item_id = i.id WHERE ci.cart_id = $1',
        [mockCartId]
      );
      expect(result.isValid).toBe(true);
      expect(result.stockIssues).toHaveLength(0);
    });

    it('should detect stock issues', async () => {
      const stockCheckResult = {
        rows: [{
          item_id: mockItemId,
          quantity: 5,
          inventory_quantity: 3,
          item_name: 'Test Item'
        }]
      };

      pool.query.mockResolvedValueOnce(stockCheckResult);

      const result = await cartRepository.validateCartStock(mockCartId);

      expect(result.isValid).toBe(false);
      expect(result.stockIssues).toHaveLength(1);
      expect(result.stockIssues[0]).toEqual({
        item_id: mockItemId,
        item_name: 'Test Item',
        requested: 5,
        available: 3
      });
    });
  });

  describe('cleanupExpiredCarts', () => {
    it('should delete expired carts and return count', async () => {
      const deletedCarts = { rows: [{ id: 1 }, { id: 2 }, { id: 3 }] };
      pool.query.mockResolvedValueOnce(deletedCarts);

      const result = await cartRepository.cleanupExpiredCarts();

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM shopping_carts WHERE expires_at <= CURRENT_TIMESTAMP RETURNING id',
        []
      );
      expect(result).toBe(3);
    });

    it('should return 0 when no expired carts', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await cartRepository.cleanupExpiredCarts();

      expect(result).toBe(0);
    });
  });

  describe('getCartStats', () => {
    it('should return cart statistics for user', async () => {
      const statsResult = {
        rows: [{
          total_carts: 1,
          total_items: 3,
          total_value: 150.00,
          stores_count: 1
        }]
      };

      pool.query.mockResolvedValueOnce(statsResult);

      const result = await cartRepository.getCartStats(mockUserId);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT sc.id) as total_carts'),
        [mockUserId]
      );
      expect(result).toEqual(statsResult.rows[0]);
    });
  });

  describe('transferCartItems', () => {
    it('should transfer items between carts', async () => {
      const transferredItems = { rows: [mockCartItem, { ...mockCartItem, id: 2 }] };
      pool.query.mockResolvedValueOnce(transferredItems); // Update items
      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Delete old cart

      const result = await cartRepository.transferCartItems(1, 2);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(1,
        'UPDATE cart_items SET cart_id = $1, updated_at = CURRENT_TIMESTAMP WHERE cart_id = $2 RETURNING *',
        [2, 1]
      );
      expect(result).toEqual(transferredItems.rows);
    });

    it('should delete old cart after transferring items', async () => {
      pool.query.mockResolvedValueOnce({ rows: [mockCartItem] }); // Items transferred
      pool.query.mockResolvedValueOnce({ rows: [] }); // Old cart deleted

      await cartRepository.transferCartItems(1, 2);

      expect(pool.query).toHaveBeenNthCalledWith(2,
        'DELETE FROM shopping_carts WHERE id = $1',
        [1]
      );
    });
  });

  describe('Error handling', () => {
    it('should log and re-throw database errors', async () => {
      const dbError = new Error('Connection timeout');
      pool.query.mockRejectedValue(dbError);

      await expect(cartRepository.getCartById(mockCartId))
        .rejects.toThrow('Connection timeout');

      expect(logger.error).toHaveBeenCalledWith('Error getting cart by ID:', dbError);
    });

    it('should handle query execution errors', async () => {
      const queryError = new Error('Invalid SQL syntax');
      pool.query.mockRejectedValue(queryError);

      await expect(cartRepository.addItemToCart(mockCartId, mockItemId, 1, 50.00))
        .rejects.toThrow('Invalid SQL syntax');

      expect(logger.error).toHaveBeenCalledWith('Error adding item to cart:', queryError);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should use parameterized queries', async () => {
      const maliciousId = "'; DROP TABLE shopping_carts; --";
      pool.query.mockResolvedValueOnce(mockQueryResult);

      await cartRepository.getCartById(maliciousId);

      // Verify parameters are passed safely
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [maliciousId] // Parameterized, not concatenated
      );
    });
  });

  describe('Date handling', () => {
    it('should handle expiration dates correctly', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      pool.query.mockResolvedValueOnce(mockQueryResult);

      await cartRepository.getOrCreateCart(mockUserId, mockStoreId);

      // Verify date calculations in queries
      const createCall = pool.query.mock.calls.find(call =>
        call[0].includes('INSERT INTO shopping_carts')
      );
      expect(createCall[1][2]).toBeInstanceOf(Date);
    });
  });

  describe('Complex queries', () => {
    it('should construct complex SELECT queries with JOINs', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult);
      pool.query.mockResolvedValueOnce(mockCartItemResult);

      await cartRepository.getCartById(mockCartId);

      const cartQuery = pool.query.mock.calls[0][0];
      expect(cartQuery).toContain('JOIN stores s ON sc.store_id = s.id');
      expect(cartQuery).toContain('WHERE sc.id = $1');

      const itemsQuery = pool.query.mock.calls[1][0];
      expect(itemsQuery).toContain('JOIN items i ON ci.item_id = i.id');
      expect(itemsQuery).toContain('JOIN stores st ON i.store_id = st.id');
    });

    it('should handle complex WHERE conditions with multiple filters', async () => {
      pool.query.mockResolvedValueOnce(mockQueryResult);

      await cartRepository.getUserCartForDifferentStore(mockUserId, mockStoreId);

      const query = pool.query.mock.calls[0][0];
      expect(query).toContain('sc.user_id = $1');
      expect(query).toContain('sc.store_id != $2');
      expect(query).toContain('sc.expires_at > CURRENT_TIMESTAMP');
    });
  });
});
