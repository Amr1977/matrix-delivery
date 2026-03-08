const pool = require('../config/db');
const logger = require('../config/logger');

class CartRepository {
  /**
   * Get or create cart for user and store
   * Enforces single-store constraint per cart
   */
  async getOrCreateCart(userId, storeId) {
    try {
      // First try to find existing active cart for this user and store
      const existingCart = await pool.query(`
        SELECT sc.*, s.name as store_name, s.vendor_id
        FROM shopping_carts sc
        JOIN stores s ON sc.store_id = s.id
        WHERE sc.user_id = $1
        AND sc.store_id = $2
        AND sc.expires_at > CURRENT_TIMESTAMP
        ORDER BY sc.updated_at DESC
        LIMIT 1
      `, [userId, storeId]);

      if (existingCart.rows.length > 0) {
        return existingCart.rows[0];
      }

      // Create new cart if none exists
      const newCart = await pool.query(`
        INSERT INTO shopping_carts (user_id, store_id, expires_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
        RETURNING *
      `, [userId, storeId]);

      // Get the cart with store info
      const cartWithStore = await pool.query(`
        SELECT sc.*, s.name as store_name, s.vendor_id
        FROM shopping_carts sc
        JOIN stores s ON sc.store_id = s.id
        WHERE sc.id = $1
      `, [newCart.rows[0].id]);

      return cartWithStore.rows[0];
    } catch (error) {
      logger.error('Error getting or creating cart:', error);
      throw error;
    }
  }

  /**
   * Get cart by ID with all items
   */
  async getCartById(cartId) {
    try {
      // Get cart details
      const cartResult = await pool.query(`
        SELECT sc.*, s.name as store_name, s.vendor_id
        FROM shopping_carts sc
        JOIN stores s ON sc.store_id = s.id
        WHERE sc.id = $1 AND sc.expires_at > CURRENT_TIMESTAMP
      `, [cartId]);

      if (cartResult.rows.length === 0) {
        return null;
      }

      const cart = cartResult.rows[0];

      // Get cart items with current prices and stock
      const itemsResult = await pool.query(`
        SELECT ci.*,
               i.name as item_name,
               i.price as current_price,
               i.inventory_quantity as available_stock,
               st.name as store_name,
               (ci.unit_price * ci.quantity) as total_price
        FROM cart_items ci
        JOIN items i ON ci.item_id = i.id
        JOIN stores st ON i.store_id = st.id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC
      `, [cartId]);

      cart.items = itemsResult.rows;
      cart.total_items = itemsResult.rows.reduce((sum, item) => sum + item.quantity, 0);
      cart.total_amount = itemsResult.rows.reduce((sum, item) => sum + parseFloat(item.total_price), 0);

      return cart;
    } catch (error) {
      logger.error('Error getting cart by ID:', error);
      throw error;
    }
  }

  /**
   * Get user's active cart (any store)
   */
  async getUserActiveCart(userId) {
    try {
      const result = await pool.query(`
        SELECT sc.*, s.name as store_name, s.vendor_id
        FROM shopping_carts sc
        JOIN stores s ON sc.store_id = s.id
        WHERE sc.user_id = $1
        AND sc.expires_at > CURRENT_TIMESTAMP
        ORDER BY sc.updated_at DESC
        LIMIT 1
      `, [userId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting user active cart:', error);
      throw error;
    }
  }

  /**
   * Add item to cart
   */
  async addItemToCart(cartId, itemId, quantity, unitPrice = null) {
    try {
      // Get current price if not provided
      let finalPrice = unitPrice;
      if (!finalPrice) {
        const priceResult = await pool.query('SELECT price FROM items WHERE id = $1', [itemId]);
        if (priceResult.rows.length === 0) {
          throw new Error('Item not found');
        }
        finalPrice = priceResult.rows[0].price;
      }

      // Check if item already exists in cart
      const existingItem = await pool.query(`
        SELECT * FROM cart_items WHERE cart_id = $1 AND item_id = $2
      `, [cartId, itemId]);

      if (existingItem.rows.length > 0) {
        // Update quantity
        const newQuantity = existingItem.rows[0].quantity + quantity;
        const result = await pool.query(`
          UPDATE cart_items
          SET quantity = $1, unit_price = $2, updated_at = CURRENT_TIMESTAMP
          WHERE cart_id = $3 AND item_id = $4
          RETURNING *
        `, [newQuantity, finalPrice, cartId, itemId]);
        return result.rows[0];
      } else {
        // Add new item
        const result = await pool.query(`
          INSERT INTO cart_items (cart_id, item_id, quantity, unit_price)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [cartId, itemId, quantity, finalPrice]);
        return result.rows[0];
      }
    } catch (error) {
      logger.error('Error adding item to cart:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(cartId, itemId, quantity) {
    try {
      if (quantity <= 0) {
        // Remove item if quantity is 0 or negative
        return await this.removeItemFromCart(cartId, itemId);
      }

      const result = await pool.query(`
        UPDATE cart_items
        SET quantity = $1, updated_at = CURRENT_TIMESTAMP
        WHERE cart_id = $2 AND item_id = $3
        RETURNING *
      `, [quantity, cartId, itemId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error updating cart item:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeItemFromCart(cartId, itemId) {
    try {
      const result = await pool.query(`
        DELETE FROM cart_items
        WHERE cart_id = $1 AND item_id = $2
        RETURNING *
      `, [cartId, itemId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error removing item from cart:', error);
      throw error;
    }
  }

  /**
   * Clear all items from cart
   */
  async clearCart(cartId) {
    try {
      const result = await pool.query(`
        DELETE FROM cart_items WHERE cart_id = $1
        RETURNING *
      `, [cartId]);

      return result.rows;
    } catch (error) {
      logger.error('Error clearing cart:', error);
      throw error;
    }
  }

  /**
   * Delete cart entirely
   */
  async deleteCart(cartId) {
    try {
      // Cart items will be deleted automatically due to CASCADE constraint
      const result = await pool.query(`
        DELETE FROM shopping_carts WHERE id = $1
        RETURNING *
      `, [cartId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error deleting cart:', error);
      throw error;
    }
  }

  /**
   * Check if user has cart for different store (for single-store validation)
   */
  async getUserCartForDifferentStore(userId, storeId) {
    try {
      const result = await pool.query(`
        SELECT sc.*, s.name as store_name
        FROM shopping_carts sc
        JOIN stores s ON sc.store_id = s.id
        WHERE sc.user_id = $1
        AND sc.store_id != $2
        AND sc.expires_at > CURRENT_TIMESTAMP
      `, [userId, storeId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error checking user cart for different store:', error);
      throw error;
    }
  }

  /**
   * Validate stock availability for cart items
   */
  async validateCartStock(cartId) {
    try {
      const result = await pool.query(`
        SELECT ci.item_id, ci.quantity, i.inventory_quantity, i.name as item_name
        FROM cart_items ci
        JOIN items i ON ci.item_id = i.id
        WHERE ci.cart_id = $1
      `, [cartId]);

      const stockIssues = result.rows.filter(item =>
        item.quantity > item.inventory_quantity
      );

      return {
        isValid: stockIssues.length === 0,
        stockIssues: stockIssues.map(issue => ({
          item_id: issue.item_id,
          item_name: issue.item_name,
          requested: issue.quantity,
          available: issue.inventory_quantity
        }))
      };
    } catch (error) {
      logger.error('Error validating cart stock:', error);
      throw error;
    }
  }

  /**
   * Clean up expired carts
   */
  async cleanupExpiredCarts() {
    try {
      const result = await pool.query(`
        DELETE FROM shopping_carts
        WHERE expires_at <= CURRENT_TIMESTAMP
        RETURNING id
      `);

      return result.rows.length;
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
      const result = await pool.query(`
        SELECT
          COUNT(DISTINCT sc.id) as total_carts,
          COUNT(ci.id) as total_items,
          COALESCE(SUM(ci.quantity * ci.unit_price), 0) as total_value,
          COUNT(DISTINCT sc.store_id) as stores_count
        FROM shopping_carts sc
        LEFT JOIN cart_items ci ON sc.id = ci.cart_id
        WHERE sc.user_id = $1 AND sc.expires_at > CURRENT_TIMESTAMP
      `, [userId]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting cart stats:', error);
      throw error;
    }
  }

  /**
   * Transfer cart items to a different cart (for store changes)
   */
  async transferCartItems(fromCartId, toCartId) {
    try {
      // Update cart_id for all items
      const result = await pool.query(`
        UPDATE cart_items
        SET cart_id = $1, updated_at = CURRENT_TIMESTAMP
        WHERE cart_id = $2
        RETURNING *
      `, [toCartId, fromCartId]);

      // Delete the old empty cart
      if (result.rows.length > 0) {
        await pool.query('DELETE FROM shopping_carts WHERE id = $1', [fromCartId]);
      }

      return result.rows;
    } catch (error) {
      logger.error('Error transferring cart items:', error);
      throw error;
    }
  }
}

module.exports = new CartRepository();
