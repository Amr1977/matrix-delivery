const cartController = require('../../../backend/controllers/cartController');
const cartService = require('../../../backend/services/cartService');

// Mock cartService
jest.mock('../../../backend/services/cartService');

describe('CartController - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request object
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: {
        userId: 'user-123',
        primary_role: 'customer',
        granted_roles: []
      }
    };

    // Mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('addItemToCart', () => {
    it('should add item to cart successfully and return 200', async () => {
      const cartData = {
        id: 1,
        items: [{ item_id: 1, quantity: 2 }],
        total_amount: 100.00
      };

      mockReq.body = { item_id: 1, quantity: 2 };
      cartService.addItemToCart.mockResolvedValue(cartData);

      await cartController.addItemToCart(mockReq, mockRes);

      expect(cartService.addItemToCart).toHaveBeenCalledWith('user-123', undefined, 1, 2);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item added to cart successfully',
        data: cartData
      });
    });

    it('should use store_id from body when provided', async () => {
      const cartData = { id: 1, items: [] };
      mockReq.body = { item_id: 1, quantity: 1, store_id: 5 };
      cartService.addItemToCart.mockResolvedValue(cartData);

      await cartController.addItemToCart(mockReq, mockRes);

      expect(cartService.addItemToCart).toHaveBeenCalledWith('user-123', 5, 1, 1);
    });

    it('should handle validation errors and return 400', async () => {
      const error = new Error('item_id and quantity are required');
      mockReq.body = {}; // Missing both item_id and quantity

      // Mock the service to not be called due to validation failure
      cartService.addItemToCart.mockResolvedValue({});

      await cartController.addItemToCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'item_id and quantity are required'
      });
      expect(cartService.addItemToCart).not.toHaveBeenCalled();
    });

    it('should handle missing required fields', async () => {
      mockReq.body = { quantity: 2 }; // Missing item_id

      await cartController.addItemToCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'item_id and quantity are required'
      });
    });

    it('should handle single-store constraint violations', async () => {
      const error = new Error('Cannot add items from this store. You already have items from "Other Store" in your cart.');
      mockReq.body = { item_id: 1, quantity: 2 };
      cartService.addItemToCart.mockRejectedValue(error);

      await cartController.addItemToCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot add items from this store. You already have items from "Other Store" in your cart.'
      });
    });
  });

  describe('updateCartItem', () => {
    it('should update cart item successfully and return 200', async () => {
      const updatedCart = {
        id: 1,
        items: [{ item_id: 1, quantity: 5 }],
        total_amount: 250.00
      };

      mockReq.params.itemId = '1';
      mockReq.body = { quantity: 5 };
      cartService.updateCartItem.mockResolvedValue(updatedCart);

      await cartController.updateCartItem(mockReq, mockRes);

      expect(cartService.updateCartItem).toHaveBeenCalledWith('user-123', 1, 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cart item updated successfully',
        data: updatedCart
      });
    });

    it('should handle missing quantity parameter', async () => {
      mockReq.params.itemId = '1';
      mockReq.body = {}; // Missing quantity

      await cartController.updateCartItem(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'quantity is required'
      });
    });

    it('should handle stock validation errors', async () => {
      const error = new Error('Insufficient stock. Only 3 items available.');
      mockReq.params.itemId = '1';
      mockReq.body = { quantity: 10 };
      cartService.updateCartItem.mockRejectedValue(error);

      await cartController.updateCartItem(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('removeCartItem', () => {
    it('should remove cart item successfully and return 200', async () => {
      const updatedCart = { id: 1, items: [], total_amount: 0 };

      mockReq.params.itemId = '1';
      cartService.removeItemFromCart.mockResolvedValue(updatedCart);

      await cartController.removeCartItem(mockReq, mockRes);

      expect(cartService.removeItemFromCart).toHaveBeenCalledWith('user-123', 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Item removed from cart successfully',
        data: updatedCart
      });
    });

    it('should handle item not found errors', async () => {
      const error = new Error('Item not found in cart');
      mockReq.params.itemId = '999';
      cartService.removeItemFromCart.mockRejectedValue(error);

      await cartController.removeCartItem(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('getCart', () => {
    it('should return user cart successfully and return 200', async () => {
      const cartData = {
        id: 1,
        items: [{ item_id: 1, quantity: 2 }],
        total_amount: 100.00,
        store_name: 'Test Store'
      };

      cartService.getUserCart.mockResolvedValue(cartData);

      await cartController.getCart(mockReq, mockRes);

      expect(cartService.getUserCart).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: cartData
      });
    });

    it('should return null when no active cart exists', async () => {
      cartService.getUserCart.mockResolvedValue(null);

      await cartController.getCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'No active cart found',
        data: null
      });
    });
  });

  describe('clearCart', () => {
    it('should clear cart successfully and return 200', async () => {
      const emptyCart = { id: 1, items: [], total_amount: 0 };

      cartService.clearCart.mockResolvedValue(emptyCart);

      await cartController.clearCart(mockReq, mockRes);

      expect(cartService.clearCart).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cart cleared successfully',
        data: emptyCart
      });
    });
  });

  describe('validateCart', () => {
    it('should validate cart successfully and return 200', async () => {
      const validationResult = {
        isValid: true,
        cart: { id: 1, items: [{ item_id: 1, quantity: 2, item_name: 'Test Item' }], total_amount: 100.00 },
        totalAmount: 100.00
      };

      cartService.validateCartForCheckout.mockResolvedValue(validationResult);

      await cartController.validateCart(mockReq, mockRes);

      expect(cartService.validateCartForCheckout).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: validationResult
      });
    });

    it('should handle validation failures', async () => {
      const error = new Error('Cart is empty');
      cartService.validateCartForCheckout.mockRejectedValue(error);

      await cartController.validateCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Cart is empty'
      });
    });
  });

  describe('canAddFromStore', () => {
    it('should check store compatibility successfully and return 200', async () => {
      const result = {
        canAdd: true,
        conflictingStore: null
      };

      mockReq.params.storeId = '1';
      cartService.canAddItemFromStore.mockResolvedValue(result);

      await cartController.canAddFromStore(mockReq, mockRes);

      expect(cartService.canAddItemFromStore).toHaveBeenCalledWith('user-123', 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: result
      });
    });

    it('should return false when store conflicts exist', async () => {
      const result = {
        canAdd: false,
        conflictingStore: { id: 2, name: 'Other Store' }
      };

      mockReq.params.storeId = '3';
      cartService.canAddItemFromStore.mockResolvedValue(result);

      await cartController.canAddFromStore(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: result
      });
    });
  });

  describe('getCartStats', () => {
    it('should return cart statistics successfully and return 200', async () => {
      const stats = {
        total_carts: 1,
        total_items: 3,
        total_value: 150.00
      };

      cartService.getCartStats.mockResolvedValue(stats);

      await cartController.getCartStats(mockReq, mockRes);

      expect(cartService.getCartStats).toHaveBeenCalledWith('user-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: stats
      });
    });
  });

  describe('changeCartStore', () => {
    it('should change cart store successfully and return 200', async () => {
      const newCart = {
        id: 2,
        store_id: 3,
        store_name: 'New Store',
        items: []
      };

      mockReq.body = { store_id: 3 };
      cartService.changeCartStore.mockResolvedValue(newCart);

      await cartController.changeCartStore(mockReq, mockRes);

      expect(cartService.changeCartStore).toHaveBeenCalledWith('user-123', 3);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Cart store changed successfully',
        data: newCart
      });
    });

    it('should handle missing store_id parameter', async () => {
      mockReq.body = {}; // Missing store_id

      await cartController.changeCartStore(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'store_id is required'
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockReq.body = { item_id: 1, quantity: 1 };
      cartService.addItemToCart.mockRejectedValue(dbError);

      await cartController.addItemToCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection failed'
      });
    });

    it('should handle unexpected errors', async () => {
      const unexpectedError = new Error('Unexpected error occurred');
      cartService.getUserCart.mockRejectedValue(unexpectedError);

      await cartController.getCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unexpected error occurred'
      });
    });

    it('should handle authentication context properly', async () => {
      // Test with different user roles
      mockReq.user.primary_role = 'vendor';

      const cartData = { id: 1, items: [] };
      cartService.getUserCart.mockResolvedValue(cartData);

      await cartController.getCart(mockReq, mockRes);

      expect(cartService.getUserCart).toHaveBeenCalledWith('user-123');
    });
  });

  describe('HTTP status code mapping', () => {
    it('should return 404 for not found errors', async () => {
      const error = new Error('Item not found');
      cartService.removeItemFromCart.mockRejectedValue(error);

      mockReq.params.itemId = '999';
      await cartController.removeCartItem(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 409 for conflict errors', async () => {
      const error = new Error('Cannot add items from this store');
      mockReq.body = { item_id: 1, quantity: 1 };
      cartService.addItemToCart.mockRejectedValue(error);

      await cartController.addItemToCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it('should return 400 for validation errors', async () => {
      const error = new Error('Quantity must be greater than 0');
      mockReq.body = { item_id: 1, quantity: 0 };
      cartService.addItemToCart.mockRejectedValue(error);

      await cartController.addItemToCart(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });
});
