const cartService = require('../../../backend/services/cartService');
const cartRepository = require('../../../backend/services/cartRepository');
const pool = require('../../../backend/config/db');
const logger = require('../../../backend/config/logger');

// Mock dependencies
jest.mock('../../../backend/services/cartRepository');
jest.mock('../../../backend/config/db');
jest.mock('../../../backend/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('CartService - Unit Tests', () => {
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
    items: [],
    total_items: 0,
    total_amount: 0,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isExpired: false
  };

  const mockItem = {
    id: mockItemId,
    name: 'Test Item',
    price: 50.00,
    inventory_quantity: 20,
    store_id: mockStoreId
  };

  const mockCartItem = {
    id: 1,
    cart_id: mockCartId,
    item_id: mockItemId,
    quantity: 2,
    unit_price: 50.00,
    item_name: 'Test Item'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset pool.query mock to default behavior
    pool.query.mockReset();
    pool.query.mockImplementation(() => {
      throw new Error('Unexpected database query - mock not set up for this test');
    });
  });

  describe('getOrCreateCart', () => {
    it('should return existing cart when user has active cart', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      cartRepository.getCartById.mockResolvedValue(mockCart);

      const result = await cartService.getOrCreateCart(mockUserId);

      expect(result).toEqual(mockCart);
      expect(cartRepository.getUserActiveCart).toHaveBeenCalledWith(mockUserId);
      expect(cartRepository.getCartById).toHaveBeenCalledWith(mockCart.id);
    });

    it('should create new cart when no active cart exists', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(null);
      cartRepository.getOrCreateCart.mockResolvedValue(mockCart);
      cartRepository.getCartById.mockResolvedValue(mockCart);

      const result = await cartService.getOrCreateCart(mockUserId, mockStoreId);

      expect(result).toEqual(mockCart);
      expect(cartRepository.getOrCreateCart).toHaveBeenCalledWith(mockUserId, mockStoreId);
    });

    it('should throw error when trying to create cart without storeId', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(null);

      await expect(cartService.getOrCreateCart(mockUserId))
        .rejects.toThrow('Store ID required to create new cart');
    });

    it('should enforce single-store constraint', async () => {
      const conflictingCart = { ...mockCart, store_name: 'Different Store' };
      cartRepository.getUserCartForDifferentStore.mockResolvedValue(conflictingCart);

      await expect(cartService.getOrCreateCart(mockUserId, 999))
        .rejects.toThrow('Cannot add items from this store. You already have items from');
    });
  });

  describe('addItemToCart', () => {
    it('should add item to cart successfully', async () => {
      // Mock item lookup
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem, vendor_id: 'vendor-123' }]
      });

      // Ensure no conflicting cart
      cartRepository.getUserCartForDifferentStore.mockResolvedValue(null);

      // Mock cart creation/get
      cartRepository.getOrCreateCart.mockResolvedValue(mockCart);
      cartRepository.getCartById.mockResolvedValue(mockCart);
      cartRepository.getActiveOffersByItem = jest.fn().mockResolvedValue([]);
      cartRepository.addItemToCart.mockResolvedValue(mockCartItem);

      const result = await cartService.addItemToCart(mockUserId, mockStoreId, mockItemId, 2);

      expect(result.items).toHaveLength(0); // Empty cart initially
      expect(cartRepository.addItemToCart).toHaveBeenCalledWith(mockCart.id, mockItemId, 2, 50.00);
    });

    it('should validate item exists and belongs to store', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(cartService.addItemToCart(mockUserId, mockStoreId, 999, 1))
        .rejects.toThrow('Item not found');
    });

    it('should validate quantity is positive', async () => {
      // Mock item lookup
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem }]
      });

      await expect(cartService.addItemToCart(mockUserId, mockStoreId, mockItemId, 0))
        .rejects.toThrow('Quantity must be greater than 0');
    });

    it('should validate sufficient stock', async () => {
      // Mock item lookup
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem, inventory_quantity: 5 }]
      });

      // Ensure no conflicting cart
      cartRepository.getUserCartForDifferentStore.mockResolvedValue(null);

      cartRepository.getOrCreateCart.mockResolvedValue(mockCart);
      cartRepository.getCartById.mockResolvedValue(mockCart);

      await expect(cartService.addItemToCart(mockUserId, mockStoreId, mockItemId, 10))
        .rejects.toThrow('Insufficient stock. Only 5 items available');
    });

    it('should enforce single-store constraint when adding items', async () => {
      const conflictingCart = { store_name: 'Other Store' };
      cartRepository.getUserCartForDifferentStore.mockResolvedValue(conflictingCart);

      // Mock item lookup for the different store item
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem, store_id: 999 }]
      });

      await expect(cartService.addItemToCart(mockUserId, 999, mockItemId, 1))
        .rejects.toThrow('Cannot add items from this store');
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item quantity successfully', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      cartRepository.updateCartItem.mockResolvedValue(mockCartItem);
      cartRepository.getCartById.mockResolvedValue({
        ...mockCart,
        items: [mockCartItem]
      });

      // Mock the item validation query
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem, store_id: mockStoreId }]
      });

      const result = await cartService.updateCartItem(mockUserId, mockItemId, 5);

      expect(result.items).toHaveLength(1);
      expect(cartRepository.updateCartItem).toHaveBeenCalledWith(mockCart.id, mockItemId, 5);
    });

    it('should remove item when quantity is 0', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      cartRepository.updateCartItem.mockResolvedValue(null); // Repository returns null when item is removed
      cartRepository.getCartById.mockResolvedValue(mockCart);

      // Mock the item validation query
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem, store_id: mockStoreId }]
      });

      const result = await cartService.updateCartItem(mockUserId, mockItemId, 0);

      expect(cartRepository.updateCartItem).toHaveBeenCalledWith(mockCart.id, mockItemId, 0);
    });

    it('should throw error when no active cart', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(null);

      await expect(cartService.updateCartItem(mockUserId, mockItemId, 3))
        .rejects.toThrow('No active cart found');
    });

    it('should validate item belongs to cart store', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      // Mock the item validation query - item belongs to different store
      pool.query.mockResolvedValueOnce({
        rows: [{ ...mockItem, store_id: 999 }] // Different store
      });

      await expect(cartService.updateCartItem(mockUserId, mockItemId, 3))
        .rejects.toThrow('Item does not belong to your cart\'s store');
    });
  });

  describe('removeItemFromCart', () => {
    it('should remove item from cart successfully', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      cartRepository.removeItemFromCart.mockResolvedValue(mockCartItem);
      cartRepository.getCartById.mockResolvedValue(mockCart);

      const result = await cartService.removeItemFromCart(mockUserId, mockItemId);

      expect(result).toEqual(mockCart);
      expect(cartRepository.removeItemFromCart).toHaveBeenCalledWith(mockCart.id, mockItemId);
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      cartRepository.clearCart.mockResolvedValue([mockCartItem]);
      cartRepository.getCartById.mockResolvedValue({ ...mockCart, items: [] });

      const result = await cartService.clearCart(mockUserId);

      expect(result.items).toHaveLength(0);
      expect(cartRepository.clearCart).toHaveBeenCalledWith(mockCart.id);
    });
  });

  describe('getCartWithItems', () => {
    it('should return cart with stock validation', async () => {
      const cartWithItems = { ...mockCart, items: [mockCartItem] };
      cartRepository.getCartById.mockResolvedValue(cartWithItems);
      cartRepository.validateCartStock.mockResolvedValue({
        isValid: true,
        stockIssues: []
      });

      const result = await cartService.getCartWithItems(mockCartId);

      expect(result.stockValidation.isValid).toBe(true);
      expect(cartRepository.validateCartStock).toHaveBeenCalledWith(mockCartId);
    });

    it('should mark cart as expired when past expiry date', async () => {
      const expiredCart = { ...mockCart, expires_at: new Date(Date.now() - 1000) };
      cartRepository.getCartById.mockResolvedValue(expiredCart);
      cartRepository.validateCartStock.mockResolvedValue({
        isValid: true,
        stockIssues: []
      });

      const result = await cartService.getCartWithItems(mockCartId);

      expect(result.isExpired).toBe(true);
    });

    it('should throw error when cart not found', async () => {
      cartRepository.getCartById.mockResolvedValue(null);

      await expect(cartService.getCartWithItems(mockCartId))
        .rejects.toThrow('Cart not found or expired');
    });
  });

  describe('validateCartForCheckout', () => {
    it('should validate cart successfully for checkout', async () => {
      const validCart = {
        ...mockCart,
        items: [mockCartItem],
        total_amount: 100.00, // Add total_amount
        stockValidation: { isValid: true },
        isExpired: false
      };

      cartService.getUserCart = jest.fn().mockResolvedValue(validCart);

      const result = await cartService.validateCartForCheckout(mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.totalAmount).toBeGreaterThan(0);
    });

    it('should fail validation for empty cart', async () => {
      const emptyCart = {
        ...mockCart,
        items: [],
        stockValidation: { isValid: true } // Add stockValidation
      };
      cartService.getUserCart = jest.fn().mockResolvedValue(emptyCart);

      await expect(cartService.validateCartForCheckout(mockUserId))
        .rejects.toThrow('Cart is empty');
    });

    it('should fail validation for expired cart', async () => {
      const expiredCart = {
        ...mockCart,
        items: [mockCartItem],
        isExpired: true
      };
      cartService.getUserCart = jest.fn().mockResolvedValue(expiredCart);

      await expect(cartService.validateCartForCheckout(mockUserId))
        .rejects.toThrow('Cart has expired');
    });

    it('should fail validation for insufficient stock', async () => {
      const invalidCart = {
        ...mockCart,
        items: [mockCartItem],
        stockValidation: {
          isValid: false,
          stockIssues: [{ item_name: 'Test Item', requested: 5, available: 2 }]
        }
      };
      cartService.getUserCart = jest.fn().mockResolvedValue(invalidCart);

      await expect(cartService.validateCartForCheckout(mockUserId))
        .rejects.toThrow('Stock issues found');
    });
  });

  describe('changeCartStore', () => {
    it('should change cart store and clear items', async () => {
      const currentCart = { ...mockCart, items: [mockCartItem] };
      const newCart = { ...mockCart, store_id: 999, items: [] };

      cartRepository.getUserActiveCart.mockResolvedValue(currentCart);
      cartRepository.clearCart.mockResolvedValue([mockCartItem]);
      cartRepository.getOrCreateCart.mockResolvedValue(newCart);
      cartRepository.getCartById.mockResolvedValue(newCart);

      const result = await cartService.changeCartStore(mockUserId, 999);

      expect(cartRepository.clearCart).toHaveBeenCalledWith(currentCart.id);
      expect(cartRepository.getOrCreateCart).toHaveBeenCalledWith(mockUserId, 999);
      expect(result.store_id).toBe(999);
    });

    it('should return same cart if store unchanged', async () => {
      cartRepository.getUserActiveCart.mockResolvedValue(mockCart);
      cartRepository.getCartById.mockResolvedValue(mockCart);

      const result = await cartService.changeCartStore(mockUserId, mockStoreId);

      expect(result).toEqual(mockCart);
      expect(cartRepository.clearCart).not.toHaveBeenCalled();
    });
  });

  describe('canAddItemFromStore', () => {
    it('should return true when no conflicting cart', async () => {
      cartRepository.getUserCartForDifferentStore.mockResolvedValue(null);

      const result = await cartService.canAddItemFromStore(mockUserId, mockStoreId);

      expect(result.canAdd).toBe(true);
      expect(result.conflictingStore).toBe(null);
    });

    it('should return false with conflicting store info', async () => {
      const conflictingCart = { store_id: 999, store_name: 'Other Store' };
      cartRepository.getUserCartForDifferentStore.mockResolvedValue(conflictingCart);

      const result = await cartService.canAddItemFromStore(mockUserId, mockStoreId);

      expect(result.canAdd).toBe(false);
      expect(result.conflictingStore.name).toBe('Other Store');
    });
  });

  describe('cleanupExpiredCarts', () => {
    it('should cleanup expired carts and return count', async () => {
      cartRepository.cleanupExpiredCarts.mockResolvedValue(5);

      const result = await cartService.cleanupExpiredCarts();

      expect(result).toBe(5);
      expect(cartRepository.cleanupExpiredCarts).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Cleaned up 5 expired carts');
    });
  });

  describe('getCartStats', () => {
    it('should return cart statistics for user', async () => {
      const stats = { total_carts: 1, total_items: 3, total_value: 150.00 };
      cartRepository.getCartStats.mockResolvedValue(stats);

      const result = await cartService.getCartStats(mockUserId);

      expect(result).toEqual(stats);
      expect(cartRepository.getCartStats).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('Error handling', () => {
    it('should log errors in getOrCreateCart', async () => {
      cartRepository.getUserActiveCart.mockRejectedValue(new Error('DB Error'));

      await expect(cartService.getOrCreateCart(mockUserId))
        .rejects.toThrow('DB Error');

      expect(logger.error).toHaveBeenCalledWith('Error getting or creating cart:', expect.any(Error));
    });

    it('should log errors in addItemToCart', async () => {
      // Mock item lookup to fail
      pool.query.mockRejectedValueOnce(new Error('Query failed'));

      await expect(cartService.addItemToCart(mockUserId, mockStoreId, mockItemId, 1))
        .rejects.toThrow('Query failed');

      expect(logger.error).toHaveBeenCalledWith('Error adding item to cart:', expect.any(Error));
    });
  });
});
