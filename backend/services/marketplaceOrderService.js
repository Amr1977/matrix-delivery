const MarketplaceOrderRepository = require('../repositories/marketplaceOrderRepository');
const VendorPayoutService = require('./vendorPayoutService');
const cartService = require('./cartService');
const { ORDER_STATUS } = require('../config/constants');
const logger = require('../config/logger');

/**
 * Marketplace Order Service
 * Handles business logic for marketplace orders
 */
class MarketplaceOrderService {
  constructor() {
    this.marketplaceOrderRepository = new MarketplaceOrderRepository();
    this.vendorPayoutService = new VendorPayoutService();
    this.cartService = cartService;
  }

  /**
   * Comprehensive marketplace order state machine
   * Defines valid transitions for each status
   */
  getStateMachine() {
    return {
      [ORDER_STATUS.PENDING]: {
        'confirm_payment': {
          nextStatus: ORDER_STATUS.PAID,
          allowedRoles: ['customer', 'system'],
          description: 'Payment confirmed by customer or gateway'
        },
        'cancel_by_admin': {
          nextStatus: ORDER_STATUS.CANCELLED,
          allowedRoles: ['admin'],
          description: 'Admin cancels order before vendor acceptance'
        },
        'system_failure': {
          nextStatus: ORDER_STATUS.FAILED,
          allowedRoles: ['system'],
          description: 'Payment timeout or system error'
        }
      },
      [ORDER_STATUS.PAID]: {
        'accept_order': {
          nextStatus: ORDER_STATUS.ACCEPTED,
          allowedRoles: ['vendor'],
          description: 'Vendor accepts and confirms order fulfillment'
        },
        'reject_order': {
          nextStatus: ORDER_STATUS.REJECTED,
          allowedRoles: ['vendor'],
          description: 'Vendor rejects order, refund initiated'
        },
        'cancel_by_admin': {
          nextStatus: ORDER_STATUS.CANCELLED,
          allowedRoles: ['admin'],
          description: 'Admin emergency cancellation'
        }
      },
      [ORDER_STATUS.ACCEPTED]: {
        'assign_driver': {
          nextStatus: ORDER_STATUS.ASSIGNED,
          allowedRoles: ['admin', 'system'],
          description: 'Driver assigned for delivery'
        },
        'cancel_by_admin': {
          nextStatus: ORDER_STATUS.CANCELLED,
          allowedRoles: ['admin'],
          description: 'Admin emergency cancellation'
        }
      },
      [ORDER_STATUS.ASSIGNED]: {
        'pickup_order': {
          nextStatus: ORDER_STATUS.PICKED_UP,
          allowedRoles: ['driver'],
          description: 'Driver picked up order from vendor'
        },
        'cancel_by_admin': {
          nextStatus: ORDER_STATUS.CANCELLED,
          allowedRoles: ['admin'],
          description: 'Admin emergency cancellation'
        }
      },
      [ORDER_STATUS.PICKED_UP]: {
        'deliver_order': {
          nextStatus: ORDER_STATUS.DELIVERED,
          allowedRoles: ['driver'],
          description: 'Order delivered to customer'
        },
        'cancel_by_admin': {
          nextStatus: ORDER_STATUS.CANCELLED,
          allowedRoles: ['admin'],
          description: 'Admin emergency cancellation'
        }
      },
      [ORDER_STATUS.DELIVERED]: {
        'confirm_receipt': {
          nextStatus: ORDER_STATUS.COMPLETED,
          allowedRoles: ['customer'],
          description: 'Customer confirms order receipt'
        },
        'dispute_order': {
          nextStatus: ORDER_STATUS.DISPUTED,
          allowedRoles: ['customer'],
          description: 'Customer reports issue with delivery'
        }
      },
      [ORDER_STATUS.DISPUTED]: {
        'resolve_dispute_completed': {
          nextStatus: ORDER_STATUS.COMPLETED,
          allowedRoles: ['admin'],
          description: 'Admin resolves dispute in favor of completion'
        },
        'resolve_dispute_refund': {
          nextStatus: ORDER_STATUS.REFUNDED,
          allowedRoles: ['admin'],
          description: 'Admin resolves dispute with refund'
        }
      },
      // Final states - no transitions allowed
      [ORDER_STATUS.COMPLETED]: {},
      [ORDER_STATUS.CANCELLED]: {},
      [ORDER_STATUS.REJECTED]: {},
      [ORDER_STATUS.REFUNDED]: {},
      [ORDER_STATUS.FAILED]: {}
    };
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
   * Update order status using comprehensive state machine
   * @param {number} orderId - Order ID
   * @param {string} action - Action name (e.g., 'confirm_payment', 'accept_order')
   * @param {number} userId - User ID performing the action
   * @param {string} userRole - Role of user performing action ('customer', 'vendor', 'admin', 'driver', 'system')
   * @param {Object} additionalData - Additional data for the transition
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, action, userId, userRole, additionalData = {}) {
    try {
      // Get order details
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      const currentStatus = order.status;
      const stateMachine = this.getStateMachine();

      // Validate current status exists in state machine
      if (!stateMachine[currentStatus]) {
        throw new Error(`Invalid current status: ${currentStatus}`);
      }

      // Validate action exists for current status
      if (!stateMachine[currentStatus][action]) {
        throw new Error(`Invalid action '${action}' for status '${currentStatus}'`);
      }

      const transition = stateMachine[currentStatus][action];

      // Validate user role is allowed for this action
      if (!transition.allowedRoles.includes(userRole)) {
        throw new Error(`Role '${userRole}' not authorized for action '${action}'`);
      }

      // Additional authorization checks based on action
      await this.validateActionAuthorization(order, action, userId, userRole);

      const newStatus = transition.nextStatus;

      // Update order status
      const updatedOrder = await this.marketplaceOrderRepository.updateOrderStatus(
        orderId,
        newStatus,
        additionalData
      );

      // Handle status-specific side effects
      await this.handleStatusTransition(orderId, newStatus, additionalData);

      // Log audit event
      await this.marketplaceOrderRepository.logAuditEvent({
        userId: userRole !== 'system' ? userId : null,
        vendorId: order.vendor_id,
        orderId,
        action: action,
        entityType: 'marketplace_order',
        entityId: orderId,
        oldValues: { status: currentStatus },
        newValues: { status: newStatus },
        changes: { status: { from: currentStatus, to: newStatus } }
      });

      logger.info(`Order ${order.order_number}: ${action} by ${userRole} - ${currentStatus} → ${newStatus}`, {
        orderId,
        action,
        userRole,
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
   * Validate action-specific authorization
   * @param {Object} order - Order object
   * @param {string} action - Action name
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   */
  async validateActionAuthorization(order, action, userId, userRole) {
    switch (action) {
      case 'accept_order':
      case 'reject_order':
        if (order.vendor_id !== userId) {
          throw new Error('Only the assigned vendor can accept/reject this order');
        }
        break;

      case 'confirm_payment':
        if (order.user_id !== userId) {
          throw new Error('Only the customer can confirm payment');
        }
        break;

      case 'pickup_order':
      case 'deliver_order':
        // Driver authorization would be checked via assignment
        // For now, assume proper driver assignment validation
        break;

      case 'confirm_receipt':
      case 'dispute_order':
        if (order.user_id !== userId) {
          throw new Error('Only the customer can confirm receipt or dispute');
        }
        break;

      // Admin actions don't need additional validation beyond role
      case 'cancel_by_admin':
      case 'assign_driver':
      case 'resolve_dispute_completed':
      case 'resolve_dispute_refund':
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Handle status transition side effects
   * @param {number} orderId - Order ID
   * @param {string} newStatus - New status
   * @param {Object} additionalData - Additional data
   */
  async handleStatusTransition(orderId, newStatus, additionalData) {
    switch (newStatus) {
      case ORDER_STATUS.DELIVERED:
        await this.processOrderDelivery(orderId);
        break;

      case ORDER_STATUS.CANCELLED:
      case ORDER_STATUS.REJECTED:
        await this.restoreOrderInventory(orderId);
        break;

      case ORDER_STATUS.REFUNDED:
        await this.processRefund(orderId, additionalData);
        break;

      // Other statuses may not need side effects
      default:
        break;
    }
  }

  /**
   * Process refund for rejected/disputed orders
   * @param {number} orderId - Order ID
   * @param {Object} additionalData - Refund details
   */
  async processRefund(orderId, additionalData) {
    try {
      // Update payout status to refunded
      await require('../config/db').query(`
        UPDATE vendor_payouts
        SET status = 'refunded', processed_at = CURRENT_TIMESTAMP
        WHERE order_id = $1
      `, [orderId]);

      logger.info(`Refund processed for order ${orderId}`, {
        orderId,
        reason: additionalData.refundReason,
        category: 'marketplace_order'
      });

      // In a real implementation, this would trigger refund via payment gateway
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  /**
   * Convenience method: Vendor accepts order
   * @param {number} orderId - Order ID
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Object>} Updated order
   */
  async vendorAcceptOrder(orderId, vendorId) {
    return this.updateOrderStatus(orderId, 'accept_order', vendorId, 'vendor');
  }

  /**
   * Convenience method: Vendor rejects order
   * @param {number} orderId - Order ID
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Object>} Updated order
   */
  async vendorRejectOrder(orderId, vendorId) {
    return this.updateOrderStatus(orderId, 'reject_order', vendorId, 'vendor');
  }

  /**
   * Convenience method: Customer confirms payment
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Updated order
   */
  async customerConfirmPayment(orderId, customerId) {
    return this.updateOrderStatus(orderId, 'confirm_payment', customerId, 'customer');
  }

  /**
   * Convenience method: Admin assigns driver
   * @param {number} orderId - Order ID
   * @param {number} adminId - Admin ID
   * @param {number} driverId - Driver ID being assigned
   * @returns {Promise<Object>} Updated order
   */
  async adminAssignDriver(orderId, adminId, driverId) {
    return this.updateOrderStatus(orderId, 'assign_driver', adminId, 'admin', { assignedDriverId: driverId });
  }

  /**
   * Convenience method: Driver picks up order
   * @param {number} orderId - Order ID
   * @param {number} driverId - Driver ID
   * @returns {Promise<Object>} Updated order
   */
  async driverPickupOrder(orderId, driverId) {
    return this.updateOrderStatus(orderId, 'pickup_order', driverId, 'driver');
  }

  /**
   * Convenience method: Driver delivers order
   * @param {number} orderId - Order ID
   * @param {number} driverId - Driver ID
   * @returns {Promise<Object>} Updated order
   */
  async driverDeliverOrder(orderId, driverId) {
    return this.updateOrderStatus(orderId, 'deliver_order', driverId, 'driver');
  }

  /**
   * Convenience method: Customer confirms receipt
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Updated order
   */
  async customerConfirmReceipt(orderId, customerId) {
    return this.updateOrderStatus(orderId, 'confirm_receipt', customerId, 'customer');
  }

  /**
   * Convenience method: Customer disputes order
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @param {string} disputeReason - Reason for dispute
   * @returns {Promise<Object>} Updated order
   */
  async customerDisputeOrder(orderId, customerId, disputeReason) {
    return this.updateOrderStatus(orderId, 'dispute_order', customerId, 'customer', { disputeReason });
  }

  /**
   * Convenience method: Admin resolves dispute (complete)
   * @param {number} orderId - Order ID
   * @param {number} adminId - Admin ID
   * @returns {Promise<Object>} Updated order
   */
  async adminResolveDisputeCompleted(orderId, adminId) {
    return this.updateOrderStatus(orderId, 'resolve_dispute_completed', adminId, 'admin');
  }

  /**
   * Convenience method: Admin resolves dispute (refund)
   * @param {number} orderId - Order ID
   * @param {number} adminId - Admin ID
   * @param {string} refundReason - Reason for refund
   * @returns {Promise<Object>} Updated order
   */
  async adminResolveDisputeRefund(orderId, adminId, refundReason) {
    return this.updateOrderStatus(orderId, 'resolve_dispute_refund', adminId, 'admin', { refundReason });
  }

  /**
   * Convenience method: Admin cancels order
   * @param {number} orderId - Order ID
   * @param {number} adminId - Admin ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated order
   */
  async adminCancelOrder(orderId, adminId, reason) {
    return this.updateOrderStatus(orderId, 'cancel_by_admin', adminId, 'admin', { cancellationReason: reason });
  }

  /**
   * Process order delivery (create vendor payout)
   * @param {number} orderId - Order ID
   * @returns {Promise<void>}
   */
  async processOrderDelivery(orderId) {
    try {
      // Get order details to create payout
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if payout already exists
      const existingPayout = await require('../config/db').query(
        'SELECT id FROM vendor_payouts WHERE order_id = $1',
        [orderId]
      );

      if (existingPayout.rows.length > 0) {
        logger.info(`Payout already exists for order ${orderId}`, {
          orderId,
          payoutId: existingPayout.rows[0].id,
          category: 'marketplace_order'
        });
        return;
      }

      // Create payout for the vendor
      const payout = await this.vendorPayoutService.createPayout(orderId, {
        vendor_id: order.vendor_id,
        total_amount: order.total_amount,
        commission_amount: order.commission_amount,
        currency: order.currency || 'EGP'
      });

      logger.info(`Vendor payout created for delivered order: ${order.order_number}`, {
        orderId,
        payoutId: payout.id,
        payoutNumber: payout.payout_number,
        vendorId: order.vendor_id,
        payoutAmount: payout.payout_amount,
        category: 'marketplace_order'
      });

      // In a real implementation, this could trigger automatic payout processing
      // For now, payouts remain in 'pending' status until manually processed

    } catch (error) {
      logger.error('Error processing order delivery:', error);
      throw error;
    }
  }

  /**
   * Cancel order (customer or vendor)
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

      // Check if order can be cancelled (not in final states or after pickup)
      const nonCancellableStatuses = [ORDER_STATUS.PICKED_UP, ORDER_STATUS.DELIVERED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.REJECTED, ORDER_STATUS.REFUNDED, ORDER_STATUS.FAILED];
      if (nonCancellableStatuses.includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      // Use the state machine for cancellation
      let updatedOrder;
      if (isCustomer) {
        // Customer cancellation - use admin action since no direct customer cancel action exists
        // In a real system, this might need a different approach
        updatedOrder = await this.updateOrderStatus(orderId, 'cancel_by_admin', userId, 'admin', { cancellationReason: reason, cancelledBy: 'customer' });
      } else {
        // Vendor cancellation
        updatedOrder = await this.updateOrderStatus(orderId, 'cancel_by_admin', userId, 'admin', { cancellationReason: reason, cancelledBy: 'vendor' });
      }

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

module.exports = MarketplaceOrderService;
