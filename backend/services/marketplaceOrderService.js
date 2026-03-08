const MarketplaceOrderRepository = require('../repositories/marketplaceOrderRepository');
const CartService = require('./cartService');
const logger = require('../config/logger');

/**
 * Marketplace Order Service
 * Handles business logic for marketplace orders
 */
class MarketplaceOrderService {
  constructor() {
    this.marketplaceOrderRepository = new MarketplaceOrderRepository();
    this.cartService = new CartService();
  }

  /**
   * Create order from validated cart
   * @param {number} userId - User ID
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async createOrder(userId, orderData) {
    try {
      // Validate cart for checkout
      const cartValidation = await this.cartService.validateCartForCheckout(userId);

      if (!cartValidation.isValid) {
        throw new Error(`Cart validation failed: ${cartValidation.stockValidation.issues.map(issue =>
          `${issue.itemName}: requested ${issue.requestedQuantity}, available ${issue.availableQuantity}`
        ).join('; ')}`);
      }

      // Get cart details
      const cart = await this.cartService.getUserCart(userId);
      if (!cart) {
        throw new Error('No active cart found');
      }

      // Prepare order data
      const orderPayload = {
        userId,
        cartId: cart.id,
        storeId: cart.store_id,
        vendorId: orderData.vendorId, // Will be determined from store
        totalAmount: cart.total_amount,
        deliveryFee: orderData.deliveryFee || 0,
        deliveryAddress: orderData.deliveryAddress,
        deliveryLat: orderData.deliveryLat,
        deliveryLng: orderData.deliveryLng,
        deliveryInstructions: orderData.deliveryInstructions,
        commissionRate: 10.00, // 10% default commission
        customerNotes: orderData.customerNotes
      };

      // Get vendor ID from store
      const vendorQuery = await require('../config/db').query(
        'SELECT vendor_id FROM stores WHERE id = $1',
        [cart.store_id]
      );

      if (vendorQuery.rows.length === 0) {
        throw new Error('Store not found');
      }

      orderPayload.vendorId = vendorQuery.rows[0].vendor_id;

      // Create order (this handles inventory deduction and cart clearing)
      const order = await this.marketplaceOrderRepository.createOrder(orderPayload);

      // Create vendor payout
      await this.marketplaceOrderRepository.createVendorPayout(
        orderPayload.vendorId,
        order.id,
        order.total_amount,
        order.commission_amount
      );

      // Log audit event
      await this.marketplaceOrderRepository.logAuditEvent({
        userId,
        vendorId: orderPayload.vendorId,
        orderId: order.id,
        action: 'order_created',
        entityType: 'marketplace_order',
        entityId: order.id,
        newValues: { status: 'pending', totalAmount: order.total_amount },
        ipAddress: orderData.ipAddress,
        userAgent: orderData.userAgent
      });

      logger.info(`Marketplace order created: ${order.order_number}`, {
        orderId: order.id,
        userId,
        vendorId: orderPayload.vendorId,
        totalAmount: order.total_amount,
        category: 'marketplace_order'
      });

      return order;
    } catch (error) {
      logger.error('Error creating marketplace order:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID (for authorization)
   * @returns {Promise<Object>} Order details
   */
  async getOrder(orderId, userId) {
    try {
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if user can access this order (customer or vendor)
      if (order.user_id !== userId) {
        // Check if user is vendor of this order
        const vendorCheck = await require('../config/db').query(
          'SELECT id FROM vendors WHERE id = $1',
          [order.vendor_id]
        );

        if (vendorCheck.rows.length === 0) {
          throw new Error('Access denied');
        }
      }

      return order;
    } catch (error) {
      logger.error('Error getting marketplace order:', error);
      throw error;
    }
  }

  /**
   * Get orders for user (customer view)
   * @param {number} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of orders
   */
  async getOrdersForUser(userId, filters = {}) {
    try {
      return await this.marketplaceOrderRepository.getOrdersByUser(userId, filters);
    } catch (error) {
      logger.error('Error getting orders for user:', error);
      throw error;
    }
  }

  /**
   * Get orders for vendor
   * @param {number} vendorId - Vendor ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of orders
   */
  async getOrdersForVendor(vendorId, filters = {}) {
    try {
      return await this.marketplaceOrderRepository.getOrdersByVendor(vendorId, filters);
    } catch (error) {
      logger.error('Error getting orders for vendor:', error);
      throw error;
    }
  }

  /**
   * Update order status (vendor only)
   * @param {number} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {number} vendorId - Vendor ID (for authorization)
   * @param {Object} additionalData - Additional status data
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, newStatus, vendorId, additionalData = {}) {
    try {
      // Validate status transition
      const validStatuses = ['pending', 'confirmed', 'prepared', 'picked_up', 'delivered', 'cancelled'];
      if (!validStatuses.includes(newStatus)) {
        throw new Error('Invalid order status');
      }

      // Get order and verify vendor ownership
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.vendor_id !== vendorId) {
        throw new Error('Access denied: not your order');
      }

      // Validate status transition logic
      const currentStatus = order.status;
      const validTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['prepared', 'cancelled'],
        'prepared': ['picked_up', 'cancelled'],
        'picked_up': ['delivered'],
        'delivered': [], // Final state
        'cancelled': []  // Final state
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }

      // Update order status
      const updatedOrder = await this.marketplaceOrderRepository.updateOrderStatus(
        orderId,
        newStatus,
        additionalData
      );

      // If order is delivered, trigger payout processing
      if (newStatus === 'delivered') {
        await this.processOrderDelivery(orderId);
      }

      // Log audit event
      await this.marketplaceOrderRepository.logAuditEvent({
        vendorId,
        orderId,
        action: 'order_status_updated',
        entityType: 'marketplace_order',
        entityId: orderId,
        oldValues: { status: currentStatus },
        newValues: { status: newStatus },
        changes: { status: { from: currentStatus, to: newStatus } }
      });

      logger.info(`Order status updated: ${order.order_number} from ${currentStatus} to ${newStatus}`, {
        orderId,
        vendorId,
        oldStatus: currentStatus,
        newStatus,
        category: 'marketplace_order'
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Process order delivery (trigger payout)
   * @param {number} orderId - Order ID
   * @returns {Promise<void>}
   */
  async processOrderDelivery(orderId) {
    try {
      // Update payout status to 'processing'
      await require('../config/db').query(`
        UPDATE vendor_payouts
        SET status = 'processing', processed_at = CURRENT_TIMESTAMP
        WHERE order_id = $1 AND status = 'pending'
      `, [orderId]);

      logger.info(`Payout processing triggered for order ${orderId}`, {
        orderId,
        category: 'marketplace_order'
      });

      // In a real implementation, this would trigger payout processing
      // via payment gateway integration (Instapay, etc.)
    } catch (error) {
      logger.error('Error processing order delivery:', error);
      throw error;
    }
  }

  /**
   * Cancel order
   * @param {number} orderId - Order ID
   * @param {number} userId - User ID (customer or vendor)
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated order
   */
  async cancelOrder(orderId, userId, reason) {
    try {
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check authorization (customer can cancel their own orders, vendor can cancel their orders)
      const isCustomer = order.user_id === userId;
      const isVendor = order.vendor_id === userId;

      if (!isCustomer && !isVendor) {
        throw new Error('Access denied');
      }

      // Check if order can be cancelled
      const nonCancellableStatuses = ['picked_up', 'delivered'];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Update order status to cancelled
      const updatedOrder = await this.marketplaceOrderRepository.updateOrderStatus(
        orderId,
        'cancelled',
        { cancellationReason: reason }
      );

      // Restore inventory for cancelled orders
      await this.restoreOrderInventory(orderId);

      // Log audit event
      await this.marketplaceOrderRepository.logAuditEvent({
        userId: isCustomer ? userId : null,
        vendorId: isVendor ? userId : null,
        orderId,
        action: 'order_cancelled',
        entityType: 'marketplace_order',
        entityId: orderId,
        oldValues: { status: order.status },
        newValues: { status: 'cancelled', cancellation_reason: reason },
        changes: { status: { from: order.status, to: 'cancelled' } }
      });

      logger.info(`Order cancelled: ${order.order_number}`, {
        orderId,
        cancelledBy: isCustomer ? 'customer' : 'vendor',
        reason,
        category: 'marketplace_order'
      });

      return updatedOrder;
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  /**
   * Restore inventory for cancelled order
   * @param {number} orderId - Order ID
   * @returns {Promise<void>}
   */
  async restoreOrderInventory(orderId) {
    try {
      const orderItems = await require('../config/db').query(`
        SELECT item_id, quantity FROM marketplace_order_items WHERE order_id = $1
      `, [orderId]);

      // Restore inventory for each item
      for (const item of orderItems.rows) {
        await require('../config/db').query(`
          UPDATE items
          SET inventory_quantity = inventory_quantity + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.quantity, item.item_id]);
      }

      logger.info(`Inventory restored for cancelled order ${orderId}`, {
        orderId,
        itemsRestored: orderItems.rows.length,
        category: 'marketplace_order'
      });
    } catch (error) {
      logger.error('Error restoring order inventory:', error);
      throw error;
    }
  }

  /**
   * Get order statistics for vendor
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Object>} Order statistics
   */
  async getOrderStats(vendorId) {
    try {
      const statsQuery = await require('../config/db').query(`
        SELECT
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount END), 0) as total_revenue,
          COALESCE(AVG(CASE WHEN status = 'delivered' THEN total_amount END), 0) as avg_order_value
        FROM marketplace_orders
        WHERE vendor_id = $1
      `, [vendorId]);

      return statsQuery.rows[0];
    } catch (error) {
      logger.error('Error getting order stats:', error);
      throw error;
    }
  }
}

module.exports = new MarketplaceOrderService();
