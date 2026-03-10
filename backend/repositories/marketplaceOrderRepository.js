const pool = require('../config/db');

/**
 * Marketplace Order Repository
 * Handles database operations for marketplace orders
 */
class MarketplaceOrderRepository {
  /**
   * Create a new marketplace order from cart
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order with items
   */
  async createOrder(orderData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate unique order number
      const orderNumber = await this.generateOrderNumber();

      // Create order
      const orderQuery = `
        INSERT INTO marketplace_orders (
          user_id, cart_id, store_id, vendor_id, order_number,
          total_amount, delivery_fee, delivery_address, delivery_lat,
          delivery_lng, delivery_instructions, commission_rate,
          commission_amount, customer_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;

      const commissionAmount = (orderData.totalAmount * orderData.commissionRate) / 100;

      const orderValues = [
        orderData.userId,
        orderData.cartId,
        orderData.storeId,
        orderData.vendorId,
        orderNumber,
        orderData.totalAmount,
        orderData.deliveryFee || 0,
        orderData.deliveryAddress,
        orderData.deliveryLat,
        orderData.deliveryLng,
        orderData.deliveryInstructions,
        orderData.commissionRate,
        commissionAmount,
        orderData.customerNotes
      ];

      const orderResult = await client.query(orderQuery, orderValues);
      const order = orderResult.rows[0];

      // Get cart items and create order items
      const cartItems = await client.query(`
        SELECT ci.*, i.name, i.description, i.price
        FROM cart_items ci
        JOIN items i ON ci.item_id = i.id
        WHERE ci.cart_id = $1
      `, [orderData.cartId]);

      // Create order items
      for (const cartItem of cartItems.rows) {
        await client.query(`
          INSERT INTO marketplace_order_items (
            order_id, item_id, item_name, item_description,
            unit_price, quantity, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          order.id,
          cartItem.item_id,
          cartItem.name,
          cartItem.description,
          cartItem.unit_price,
          cartItem.quantity,
          cartItem.quantity * cartItem.unit_price
        ]);
      }

      // Deduct inventory
      for (const cartItem of cartItems.rows) {
        await client.query(`
          UPDATE items
          SET inventory_quantity = inventory_quantity - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND inventory_quantity >= $1
        `, [cartItem.quantity, cartItem.item_id]);
      }

      // Clear cart
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [orderData.cartId]);
      await client.query('DELETE FROM shopping_carts WHERE id = $1', [orderData.cartId]);

      await client.query('COMMIT');

      // Return order with items
      return await this.getOrderById(order.id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get order by ID with items
   * @param {number} orderId - Order ID
   * @returns {Promise<Object|null>} Order with items or null
   */
  async getOrderById(orderId) {
    const orderQuery = `
      SELECT mo.*, u.name as customer_name, s.name as store_name, v.name as vendor_name
      FROM marketplace_orders mo
      JOIN users u ON mo.user_id = u.id
      JOIN stores s ON mo.store_id = s.id
      JOIN vendors v ON mo.vendor_id = v.id
      WHERE mo.id = $1
    `;

    const orderResult = await pool.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsQuery = `
      SELECT * FROM marketplace_order_items
      WHERE order_id = $1
      ORDER BY created_at
    `;

    const itemsResult = await pool.query(itemsQuery, [orderId]);
    order.items = itemsResult.rows;

    return order;
  }

  /**
   * Get orders for user
   * @param {number} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of orders
   */
  async getOrdersByUser(userId, filters = {}) {
    let query = `
      SELECT mo.*, s.name as store_name, v.name as vendor_name
      FROM marketplace_orders mo
      JOIN stores s ON mo.store_id = s.id
      JOIN vendors v ON mo.vendor_id = v.id
      WHERE mo.user_id = $1
    `;

    const params = [userId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND mo.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY mo.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);

    // Add items to each order
    for (const order of result.rows) {
      const itemsResult = await pool.query(
        'SELECT * FROM marketplace_order_items WHERE order_id = $1 ORDER BY created_at',
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    return result.rows;
  }

  /**
   * Get orders for vendor
   * @param {number} vendorId - Vendor ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of orders
   */
  async getOrdersByVendor(vendorId, filters = {}) {
    let query = `
      SELECT mo.*, u.name as customer_name, s.name as store_name
      FROM marketplace_orders mo
      JOIN users u ON mo.user_id = u.id
      JOIN stores s ON mo.store_id = s.id
      WHERE mo.vendor_id = $1
    `;

    const params = [vendorId];
    let paramIndex = 2;

    if (filters.status) {
      query += ` AND mo.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    query += ' ORDER BY mo.created_at DESC';

    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(filters.offset);
    }

    const result = await pool.query(query, params);

    // Add items to each order
    for (const order of result.rows) {
      const itemsResult = await pool.query(
        'SELECT * FROM marketplace_order_items WHERE order_id = $1 ORDER BY created_at',
        [order.id]
      );
      order.items = itemsResult.rows;
    }

    return result.rows;
  }

  /**
   * Update order status
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional status data
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, status, additionalData = {}) {
    const updateFields = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
    const params = [status];
    let paramIndex = 2;

    // Add timestamp fields based on status
    const statusTimestampMap = {
      'confirmed': 'confirmed_at',
      'prepared': 'prepared_at',
      'picked_up': 'picked_up_at',
      'delivered': 'delivered_at',
      'cancelled': 'cancelled_at'
    };

    if (statusTimestampMap[status]) {
      updateFields.push(`${statusTimestampMap[status]} = CURRENT_TIMESTAMP`);
    }

    // Add additional data
    if (additionalData.vendorNotes) {
      updateFields.push(`vendor_notes = $${paramIndex}`);
      params.push(additionalData.vendorNotes);
      paramIndex++;
    }

    if (additionalData.cancellationReason) {
      updateFields.push(`cancellation_reason = $${paramIndex}`);
      params.push(additionalData.cancellationReason);
      paramIndex++;
    }

    params.push(orderId);

    const query = `
      UPDATE marketplace_orders
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Order not found');
    }

    return result.rows[0];
  }

  /**
   * Generate unique order number
   * @returns {Promise<string>} Unique order number
   */
  async generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `MO-${timestamp}-${random}`;

    // Check if order number already exists (very unlikely but safe)
    const existing = await pool.query(
      'SELECT id FROM marketplace_orders WHERE order_number = $1',
      [orderNumber]
    );

    if (existing.rows.length > 0) {
      // Recursively generate new number if collision
      return this.generateOrderNumber();
    }

    return orderNumber;
  }

  /**
   * Create vendor payout for order
   * @param {number} vendorId - Vendor ID
   * @param {number} orderId - Order ID
   * @param {number} amount - Payout amount
   * @param {number} commissionAmount - Commission amount
   * @returns {Promise<Object>} Created payout
   */
  async createVendorPayout(vendorId, orderId, amount, commissionAmount) {
    const netAmount = amount - commissionAmount;

    const query = `
      INSERT INTO vendor_payouts (
        vendor_id, order_id, amount, commission_amount, net_amount
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await pool.query(query, [vendorId, orderId, amount, commissionAmount, netAmount]);
    return result.rows[0];
  }

  /**
   * Log audit event
   * @param {Object} auditData - Audit data
   * @returns {Promise<Object>} Created audit log
   */
  async logAuditEvent(auditData) {
    const query = `
      INSERT INTO marketplace_audit_logs (
        user_id, vendor_id, order_id, action, entity_type,
        entity_id, old_values, new_values, changes, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await pool.query(query, [
      auditData.userId,
      auditData.vendorId,
      auditData.orderId,
      auditData.action,
      auditData.entityType,
      auditData.entityId,
      JSON.stringify(auditData.oldValues),
      JSON.stringify(auditData.newValues),
      JSON.stringify(auditData.changes),
      auditData.ipAddress,
      auditData.userAgent
    ]);

    return result.rows[0];
  }
}

module.exports = MarketplaceOrderRepository;
