const pool = require('../config/db');

/**
 * Cart Repository
 * Handles database operations for shopping carts and cart items
 */
class CartRepository {
  /**
   * Get user's cart for a specific store
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<Object|null>} Cart object or null
   */
  async getUserCartForStore(userId, storeId) {
    const query = `
      SELECT sc.*, COUNT(ci.id) as item_count, SUM(ci.quantity * ci.unit_price) as total_amount
      FROM shopping_carts sc
      LEFT JOIN cart_items ci ON sc.id = ci.cart_id
      WHERE sc.user_id = $1 AND sc.store_id = $2 AND sc.expires_at > CURRENT_TIMESTAMP
      GROUP BY sc.id
    `;

    const result = await pool.query(query, [userId, storeId]);
    return result.rows[0] || null;
  }

  /**
   * Get user's cart for different store (to check single-store constraint)
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID to exclude
   * @returns {Promise<Object|null>} Cart object or null
   */
  async getUserCartForDifferentStore(userId, storeId) {
    const query = `
      SELECT sc.*
      FROM shopping_carts sc
      WHERE sc.user_id = $1 AND sc.store_id != $2 AND sc.expires_at > CURRENT_TIMESTAMP
    `;

    const result = await pool.query(query, [userId, storeId]);
    return result.rows[0] || null;
  }

  /**
   * Create a new cart
   * @param {number} userId - User ID
   * @param {number} storeId - Store ID
   * @returns {Promise<Object>} Created cart
   */
  async createCart(userId, storeId) {
    const query = `
      INSERT INTO shopping_carts (user_id, store_id, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')
      RETURNING *
    `;

    const result = await pool.query(query, [userId, storeId]);
    return result.rows[0];
  }

  /**
   * Get cart by ID
   * @param {number} cartId - Cart ID
   * @returns {Promise<Object|null>} Cart object or null
   */
  async getCartById(cartId) {
    const query = `
      SELECT sc.*, COUNT(ci.id) as item_count, SUM(ci.quantity * ci.unit_price) as total_amount
      FROM shopping_carts sc
      LEFT JOIN cart_items ci ON sc.id = ci.cart_id
      WHERE sc.id = $1 AND sc.expires_at > CURRENT_TIMESTAMP
      GROUP BY sc.id
    `;

    const result = await pool.query(query, [cartId]);
    return result.rows[0] || null;
  }

  /**
   * Get cart items
   * @param {number} cartId - Cart ID
   * @returns {Promise<Array>} Array of cart items
   */
  async getCartItems(cartId) {
    const query = `
      SELECT ci.*, i.name, i.description, i.inventory_quantity, i.status as item_status
      FROM cart_items ci
      JOIN items i ON ci.item_id = i.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at
    `;

    const result = await pool.query(query, [cartId]);
    return result.rows;
  }

  /**
   * Add item to cart
   * @param {number} cartId - Cart ID
   * @param {number} itemId - Item ID
   * @param {number} quantity - Quantity
   * @param {number} unitPrice - Unit price
   * @returns {Promise<Object>} Created/updated cart item
   */
  async addItemToCart(cartId, itemId, quantity, unitPrice) {
    const query = `
      INSERT INTO cart_items (cart_id, item_id, quantity, unit_price)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (cart_id, item_id)
      DO UPDATE SET
        quantity = cart_items.quantity + EXCLUDED.quantity,
        unit_price = EXCLUDED.unit_price,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await pool.query(query, [cartId, itemId, quantity, unitPrice]);
    return result.rows[0];
  }

  /**
   * Update cart item quantity
   * @param {number} cartId - Cart ID
   * @param {number} itemId - Item ID
   * @param {number} quantity - New quantity
   * @returns {Promise<Object|null>} Updated cart item or null if not found
   */
  async updateCartItem(cartId, itemId, quantity) {
    const query = `
      UPDATE cart_items
      SET quantity = $3, updated_at = CURRENT_TIMESTAMP
      WHERE cart_id = $1 AND item_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [cartId, itemId, quantity]);
    return result.rows[0] || null;
  }

  /**
   * Remove item from cart
   * @param {number} cartId - Cart ID
   * @param {number} itemId - Item ID
   * @returns {Promise<boolean>} True if item was removed
   */
  async removeItemFromCart(cartId, itemId) {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND item_id = $2',
      [cartId, itemId]
    );
    return result.rowCount > 0;
  }

  /**
   * Clear all items from cart
   * @param {number} cartId - Cart ID
   * @returns {Promise<number>} Number of items removed
   */
  async clearCart(cartId) {
    const result = await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    return result.rowCount;
  }

  /**
   * Delete cart
   * @param {number} cartId - Cart ID
   * @returns {Promise<boolean>} True if cart was deleted
   */
  async deleteCart(cartId) {
    const result = await pool.query('DELETE FROM shopping_carts WHERE id = $1', [cartId]);
    return result.rowCount > 0;
  }

  /**
   * Get item details by ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Object|null>} Item details or null
   */
  async getItemById(itemId) {
    const query = `
      SELECT i.*, s.id as store_id, s.name as store_name
      FROM items i
      JOIN stores s ON i.store_id = s.id
      WHERE i.id = $1 AND i.status = 'active'
    `;

    const result = await pool.query(query, [itemId]);
    return result.rows[0] || null;
  }

  /**
   * Clean up expired carts
   * @returns {Promise<number>} Number of expired carts cleaned up
   */
  async cleanupExpiredCarts() {
    const result = await pool.query(
      'DELETE FROM shopping_carts WHERE expires_at <= CURRENT_TIMESTAMP'
    );
    return result.rowCount;
  }
}

module.exports = CartRepository;
