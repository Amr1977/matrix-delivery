const cartRepository = require('./cartRepository');
const pool = require('../config/db');
const logger = require('../config/logger');

class CartService {
  /**
   * Get or create cart for user
   * If storeId provided, enforces single-store constraint
   */
  async getOrCreateCart(userId, storeId = null) {
    try {
      if (!storeId) {
        // Get user's existing cart (any store)
        const existingCart = await cartRepository.getUserActiveCart(userId);
        if (existingCart) {
          return await this.getCartWithItems(existingCart.id);
        }
        throw new Error('Store ID required to create new cart');
      }

      // Check if user has cart for different store
      const conflictingCart = await cartRepository.getUserCartForDifferentStore(userId, storeId);
      if (conflictingCart) {
        throw new Error(`Cannot add items from this store. You already have items from "${conflictingCart.store_name}" in your cart. Please clear your cart or complete your current order first.`);
      }

      // Get or create cart for this store
      const cart = await cartRepository.getOrCreateCart(userId, storeId);
      return await this.getCartWithItems(cart.id);
    } catch (error) {
      logger.error('Error getting or creating cart:', error);
      throw error;
    }
  }

  /**
   * Get cart with all items and validation
   */
  async getCartWithItems(cartId) {
    try {
      const cart = await cartRepository.getCartById(cartId);
      if (!cart) {
        throw new Error('Cart not found or expired');
      }

      // Validate stock for all items
      const stockValidation = await cartRepository.validateCartStock(cartId);
      cart.stockValidation = stockValidation;

      // Check if cart is expired
      cart.isExpired = new Date(cart.expires_at) <= new Date();

      return cart;
    } catch (error) {
      logger.error('Error getting cart with items:', error);
      throw error;
    }
  }

  /**
   * Add item to cart with validation
   */
  async addItemToCart(userId, storeId, itemId, quantity) {
    try {
      // Validate quantity
      if (!quantity || quantity <= 0) {
        throw new Error('Quantity must be greater than 0');
      }

      // Verify item exists and belongs to the store
      const itemCheck = await pool.query(`
        SELECT i.*, s.id as store_id, s.name as store_name
        FROM items i
        JOIN stores s ON i.store_id = s.id
        WHERE i.id = $1
      `, [itemId]);

      if (itemCheck.rows.length === 0) {
        throw new Error('Item not found');
      }

      const item = itemCheck.rows[0];

      // If storeId provided, ensure item belongs to that store
      if (storeId && item.store_id !== storeId) {
        throw new Error('Item does not belong to the specified store');
      }

      // Use the item's store if no store specified
      const targetStoreId = storeId || item.store_id;

      // Get or create cart (this enforces single-store constraint)
      const cart = await this.getOrCreateCart(userId, targetStoreId);

      // Check stock availability
      if (quantity > item.inventory_quantity) {
        throw new Error(`Insufficient stock. Only ${item.inventory_quantity} items available.`);
      }

      // Check if adding this quantity would exceed available stock
      const existingItemInCart = cart.items.find(cartItem => cartItem.item_id === itemId);
      const totalQuantity = (existingItemInCart ? existingItemInCart.quantity : 0) + quantity;

      if (totalQuantity > item.inventory_quantity) {
        throw new Error(`Cannot add ${quantity} more items. Cart would have ${totalQuantity} but only ${item.inventory_quantity} available.`);
      }

      // Add item to cart
      const cartItem = await cartRepository.addItemToCart(cart.id, itemId, quantity, item.price);

      // Return updated cart
      return await this.getCartWithItems(cart.id);
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(userId, itemId, quantity) {
    try {
      // Validate quantity
      if (quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      // Get user's active cart
      const cart = await cartRepository.getUserActiveCart(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }

      // Verify item belongs to cart's store
      const itemCheck = await pool.query(`
        SELECT i.*, s.id as store_id
        FROM items i
        JOIN stores s ON i.store_id = s.id
        WHERE i.id = $1
      `, [itemId]);

      if (itemCheck.rows.length === 0) {
        throw new Error('Item not found');
      }

      const item = itemCheck.rows[0];
      if (item.store_id !== cart.store_id) {
        throw new Error('Item does not belong to your cart\'s store');
      }

      // Check stock availability for new quantity
      if (quantity > 0 && quantity > item.inventory_quantity) {
        throw new Error(`Insufficient stock. Only ${item.inventory_quantity} items available.`);
      }

      // Update or remove item
      const updatedItem = await cartRepository.updateCartItem(cart.id, itemId, quantity);

      // Return updated cart
      return await this.getCartWithItems(cart.id);
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItemFromCart(userId, itemId) {
    try {
      // Get user's active cart
      const cart = await cartRepository.getUserActiveCart(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }

      // Remove item
      const removedItem = await cartRepository.removeItemFromCart(cart.id, itemId);
      if (!removedItem) {
        throw new Error('Item not found in cart');
      }

      // Return updated cart
      return await this.getCartWithItems(cart.id);
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(userId) {
    try {
      // Get user's active cart
      const cart = await cartRepository.getUserActiveCart(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }

      // Clear all items
      await cartRepository.clearCart(cart.id);

      // Return empty cart
      return await this.getCartWithItems(cart.id);
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Get user's cart
   */
  async getUserCart(userId) {
    try {
      const cart = await cartRepository.getUserActiveCart(userId);
      if (!cart) {
        return null; // No active cart
      }

      return await this.getCartWithItems(cart.id);
    } catch (error) {
      logger.error('Error getting user cart:', error);
      throw error;
    }
  }

  /**
   * Validate cart for checkout
   */
  async validateCartForCheckout(userId) {
    try {
      const cart = await this.getUserCart(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }

      // Check if cart is expired
      if (cart.isExpired) {
        throw new Error('Cart has expired. Please refresh and try again.');
      }

      // Validate stock
      if (!cart.stockValidation.isValid) {
        const issues = cart.stockValidation.stockIssues;
        throw new Error(`Stock issues found: ${issues.map(issue =>
          `${issue.item_name}: requested ${issue.requested}, available ${issue.available}`
        ).join('; ')}`);
      }

      // Check if cart has items
      if (cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      return {
        isValid: true,
        cart: cart,
        totalAmount: cart.total_amount,
        totalItems: cart.total_items
      };
    } catch (error) {
      logger.error('Error validating cart for checkout:', error);
      throw error;
    }
  }

  /**
   * Transfer cart to different store (clears current cart)
   */
  async changeCartStore(userId, newStoreId) {
    try {
      // Get current cart
      const currentCart = await cartRepository.getUserActiveCart(userId);
      if (!currentCart) {
        // No current cart, just create new one
        return await this.getOrCreateCart(userId, newStoreId);
      }

      // Check if new store is different
      if (currentCart.store_id === newStoreId) {
        return await this.getCartWithItems(currentCart.id);
      }

      // Create new cart for new store
      const newCart = await cartRepository.getOrCreateCart(userId, newStoreId);

      // Transfer items if requested (for now, just clear and start fresh)
      if (currentCart.items && currentCart.items.length > 0) {
        await cartRepository.clearCart(currentCart.id);
        logger.info(`Cleared cart for user ${userId} when changing stores`);
      }

      return await this.getCartWithItems(newCart.id);
    } catch (error) {
      logger.error('Error changing cart store:', error);
      throw error;
    }
  }

  /**
   * Clean up expired carts (background job)
   */
  async cleanupExpiredCarts() {
    try {
      const deletedCount = await cartRepository.cleanupExpiredCarts();

      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired carts`);
      }

      return deletedCount;
    } catch (error) {
      logger.error('Error cleaning up expired carts:', error);
      throw error;
    }
  }

  /**
   * Get cart statistics for user
   */
  async getCartStats(userId) {
    try {
      return await cartRepository.getCartStats(userId);
    } catch (error) {
      logger.error('Error getting cart stats:', error);
      throw error;
    }
  }

  /**
   * Check if user can add item from store
   */
  async canAddItemFromStore(userId, storeId) {
    try {
      const conflictingCart = await cartRepository.getUserCartForDifferentStore(userId, storeId);
      return {
        canAdd: !conflictingCart,
        conflictingStore: conflictingCart ? {
          id: conflictingCart.store_id,
          name: conflictingCart.store_name
        } : null
      };
    } catch (error) {
      logger.error('Error checking if can add item from store:', error);
      throw error;
    }
  }
}

module.exports = new CartService();
