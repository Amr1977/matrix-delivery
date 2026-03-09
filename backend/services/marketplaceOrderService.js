const MarketplaceOrderRepository = require('../repositories/marketplaceOrderRepository');
const VendorPayoutService = require('./vendorPayoutService');
const cartService = require('./cartService');
const { ORDER_STATUS } = require('../config/constants');
const { multiFSMOrchestrator } = require('../fsm/MultiFSMOrchestrator');
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

      // Initialize FSM orchestrator for this order
      await this.initializeFSMOrchestrator(order.id, orderPayload.vendorId, orderPayload.userId);

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

      // Return order with FSM states
      const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(order.id);
      return {
        ...order,
        fsm_states: fsmStates
      };
    } catch (error) {
      logger.error('Error creating marketplace order:', error);
      throw error;
    }
  }

  /**
   * Initialize FSM orchestrator for new order
   * @param {number} orderId - Order ID
   * @param {number} vendorId - Vendor ID
   * @param {number} customerId - Customer ID
   */
  async initializeFSMOrchestrator(orderId, vendorId, customerId) {
    try {
      // Create a new orchestrator instance for this order
      const { MultiFSMOrchestrator } = require('../fsm/MultiFSMOrchestrator');
      const orchestrator = new MultiFSMOrchestrator(orderId);

      // Get order details for context
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);

      // Set up event handlers for FSM orchestration
      this.setupFSMEventHandlers(orchestrator, orderId, order, vendorId, customerId);

      // Start vendor confirmation timeout
      await this.scheduleVendorTimeout(orchestrator, orderId, order);

      logger.info(`FSM orchestrator initialized for order ${orderId}`, {
        orderId,
        vendorId,
        customerId,
        category: 'fsm_orchestration'
      });

    } catch (error) {
      logger.error('Error initializing FSM orchestrator:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers for FSM orchestration
   */
  setupFSMEventHandlers(orchestrator, orderId, order, vendorId, customerId) {
    // When vendor confirms, enable payment
    orchestrator.on('VENDOR_CONFIRMED', async (eventData) => {
      logger.info(`Vendor confirmed for order ${orderId}, payment can now proceed`, {
        orderId,
        vendorId: eventData.vendorId,
        category: 'fsm_orchestration'
      });

      // Payment FSM is already initialized, just log that it's ready
      await this.marketplaceOrderRepository.logAuditEvent({
        userId: vendorId,
        vendorId,
        orderId,
        action: 'vendor_confirmed_payment_enabled',
        entityType: 'marketplace_order',
        entityId: orderId,
        changes: { payment_enabled: true }
      });
    });

    // When payment succeeds, enable delivery
    orchestrator.on('PAYMENT_SUCCESSFUL', async (eventData) => {
      logger.info(`Payment successful for order ${orderId}, delivery can now be assigned`, {
        orderId,
        amount: eventData.amount,
        category: 'fsm_orchestration'
      });

      // Create vendor payout since payment is confirmed
      await this.vendorPayoutService.createPayout(orderId, {
        vendor_id: vendorId,
        total_amount: order.total_amount,
        commission_amount: order.commission_amount,
        currency: order.currency || 'EGP'
      });

      await this.marketplaceOrderRepository.logAuditEvent({
        userId: customerId,
        vendorId,
        orderId,
        action: 'payment_confirmed_payout_created',
        entityType: 'marketplace_order',
        entityId: orderId,
        changes: { payout_created: true, delivery_enabled: true }
      });
    });

    // When delivery is completed, finalize order
    orchestrator.on('ORDER_COMPLETED', async (eventData) => {
      logger.info(`Order ${orderId} completed successfully`, {
        orderId,
        completionTime: eventData.completionTime,
        category: 'fsm_orchestration'
      });

      // Update final order status
      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);

      await this.marketplaceOrderRepository.logAuditEvent({
        userId: customerId,
        vendorId,
        orderId,
        action: 'order_completed',
        entityType: 'marketplace_order',
        entityId: orderId,
        changes: { final_status: 'completed' }
      });
    });

    // Handle timeouts and failures
    orchestrator.on('VENDOR_TIMEOUT', async (eventData) => {
      logger.warn(`Vendor timeout for order ${orderId}`, { orderId, category: 'fsm_orchestration' });

      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
      await this.restoreOrderInventory(orderId);

      // Send notification to customer
      await this.sendNotification(customerId, 'vendor_timeout', { orderId });
    });

    orchestrator.on('PAYMENT_TIMEOUT', async (eventData) => {
      logger.warn(`Payment timeout for order ${orderId}`, { orderId, category: 'fsm_orchestration' });

      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
      await this.restoreOrderInventory(orderId);

      await this.sendNotification(customerId, 'payment_timeout', { orderId });
    });

    orchestrator.on('DELIVERY_AUTO_CONFIRMED', async (eventData) => {
      logger.info(`Delivery auto-confirmed for order ${orderId}`, { orderId, category: 'fsm_orchestration' });

      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);

      await this.marketplaceOrderRepository.logAuditEvent({
        userId: customerId,
        vendorId,
        orderId,
        action: 'delivery_auto_confirmed',
        entityType: 'marketplace_order',
        entityId: orderId,
        changes: { auto_confirmed: true }
      });
    });
  }

  /**
   * Schedule vendor confirmation timeout
   */
  async scheduleVendorTimeout(orchestrator, orderId, order) {
    const { timeoutScheduler } = require('../services/timeoutScheduler');

    await timeoutScheduler.scheduleTimeout(
      orderId,
      'vendor',
      'awaiting_order_availability_vendor_confirmation',
      15 * 60 * 1000, // 15 minutes
      'timeout',
      {
        orderId,
        vendorId: order.vendor_id,
        customerId: order.user_id,
        orderNumber: order.order_number
      }
    );

    logger.info(`Vendor confirmation timeout scheduled for order ${orderId}`, {
      orderId,
      timeoutMs: 15 * 60 * 1000,
      category: 'fsm_orchestration'
    });
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
   * Update order status using multi-FSM orchestration
   * @param {number} orderId - Order ID
   * @param {string} action - Action name (e.g., 'accept_order', 'confirm_payment')
   * @param {number} userId - User ID performing action
   * @param {string} userRole - User role ('vendor', 'customer', 'driver', 'admin')
   * @param {Object} additionalData - Additional context data
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, action, userId, userRole, additionalData = {}) {
    try {
      // Get order details
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Map action to FSM type
      const fsmType = this.mapActionToFSMType(action);
      if (!fsmType) {
        throw new Error(`Unknown action: ${action}`);
      }

      // Prepare context for FSM transition
      const context = {
        userId,
        userRole,
        order,
        metadata: additionalData
      };

      // Validate action-specific authorization
      await this.validateActionAuthorization(order, action, userId, userRole, additionalData);

      // Execute FSM transition through orchestrator
      const transitionResult = await multiFSMOrchestrator.executeFSMTransition(
        orderId,
        fsmType,
        action,
        context
      );

      if (!transitionResult.valid) {
        throw new Error(transitionResult.error);
      }

      // Update order status in main orders table (legacy compatibility)
      const newStatus = this.mapFSMStateToOrderStatus(fsmType, transitionResult.nextStatus, order);
      if (newStatus) {
        await this.marketplaceOrderRepository.updateOrderStatus(orderId, newStatus, additionalData);
      }

      // Handle status-specific side effects
      await this.handleStatusTransition(orderId, newStatus, additionalData);

      // Log comprehensive audit event
      await this.marketplaceOrderRepository.logAuditEvent({
        userId: userRole !== 'system' ? userId : null,
        vendorId: order.vendor_id,
        orderId,
        action: action,
        entityType: 'marketplace_order',
        entityId: orderId,
        oldValues: { status: order.status },
        newValues: {
          status: newStatus,
          [`${fsmType}_fsm_state`]: transitionResult.nextStatus
        },
        changes: {
          status: { from: order.status, to: newStatus },
          fsm_transition: {
            fsm_type: fsmType,
            from_state: transitionResult.transition ? 'unknown' : null,
            to_state: transitionResult.nextStatus
          }
        }
      });

      logger.info(`Order ${order.order_number}: ${action} by ${userRole} - ${fsmType} FSM: ${transitionResult.nextStatus}`, {
        orderId,
        action,
        userRole,
        fsmType,
        newFSMState: transitionResult.nextStatus,
        newOrderStatus: newStatus,
        category: 'marketplace_order'
      });

      // Return updated order with FSM states
      const updatedOrder = await this.marketplaceOrderRepository.getOrderById(orderId);
      const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);

      return {
        ...updatedOrder,
        fsm_states: fsmStates
      };
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  /**
   * Map action to FSM type
   * @param {string} action - Action name
   * @returns {string|null} FSM type ('vendor', 'payment', 'delivery') or null if unknown
   */
  mapActionToFSMType(action) {
    const actionToFSMMap = {
      // Vendor FSM actions
      'vendor_accepts_order': 'vendor',
      'vendor_rejects_order': 'vendor',
      'vendor_starts_preparing': 'vendor',
      'vendor_marks_prepared': 'vendor',

      // Payment FSM actions
      'customer_completes_payment': 'payment',
      'payment_fails': 'payment',
      'initiate_refund': 'payment',

      // Delivery FSM actions
      'courier_accepts_delivery_request': 'delivery',
      'courier_arrives_at_vendor': 'delivery',
      'courier_confirms_receipt': 'delivery',
      'courier_arrives_at_customer': 'delivery',
      'courier_marks_delivered': 'delivery',
      'customer_confirms_receipt': 'delivery',
      'customer_reports_problem': 'delivery',
      'courier_cancels_after_assignment': 'delivery',

      // Timeout actions
      'timeout': 'vendor', // Context-dependent, but vendor timeout is most common

      // Admin actions (can affect multiple FSMs)
      'cancel_by_admin': 'vendor', // Primarily affects vendor FSM
      'resolve_dispute_completed': 'delivery',
      'resolve_dispute_refund': 'payment'
    };

    return actionToFSMMap[action] || null;
  }

  /**
   * Map FSM state to legacy order status for backward compatibility
   * @param {string} fsmType - FSM type
   * @param {string} fsmState - FSM state
   * @param {Object} order - Order object
   * @returns {string|null} Order status or null if no mapping needed
   */
  mapFSMStateToOrderStatus(fsmType, fsmState, order) {
    // For now, maintain some backward compatibility with key states
    // This can be refined based on business requirements
    switch (fsmType) {
      case 'vendor':
        if (fsmState === 'order_rejected_by_vendor') return ORDER_STATUS.REJECTED;
        if (fsmState === 'order_is_fully_prepared_and_ready_for_delivery') return ORDER_STATUS.PICKED_UP;
        break;

      case 'payment':
        if (fsmState === 'payment_successfully_received_and_verified_for_order') return ORDER_STATUS.PAID;
        if (fsmState === 'payment_has_been_refunded_to_customer') return ORDER_STATUS.REFUNDED;
        break;

      case 'delivery':
        if (fsmState === 'courier_has_been_assigned_to_deliver_the_order') return ORDER_STATUS.ASSIGNED;
        if (fsmState === 'courier_marks_order_as_delivered_to_customer') return ORDER_STATUS.DELIVERED;
        if (fsmState === 'order_delivery_successfully_completed_and_confirmed_by_customer') return ORDER_STATUS.COMPLETED;
        if (fsmState === 'delivery_disputed_by_customer_and_requires_resolution') return ORDER_STATUS.DISPUTED;
        break;
    }

    return null; // No change to main order status
  }

  /**
   * Validate action-specific authorization
   * @param {Object} order - Order object
   * @param {string} action - Action name
   * @param {number} userId - User ID
   * @param {string} userRole - User role
   * @param {Object} additionalData - Additional context data
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
    return this.updateOrderStatus(orderId, 'vendor_accepts_order', vendorId, 'vendor');
  }

  /**
   * Convenience method: Vendor rejects order
   * @param {number} orderId - Order ID
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Object>} Updated order
   */
  async vendorRejectOrder(orderId, vendorId) {
    return this.updateOrderStatus(orderId, 'vendor_rejects_order', vendorId, 'vendor');
  }

  /**
   * Convenience method: Customer confirms payment
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Updated order
   */
  async customerConfirmPayment(orderId, customerId) {
    return this.updateOrderStatus(orderId, 'customer_completes_payment', customerId, 'customer');
  }

  /**
   * Convenience method: Admin assigns driver
   * @param {number} orderId - Order ID
   * @param {number} adminId - Admin ID
   * @param {number} driverId - Driver ID being assigned
   * @returns {Promise<Object>} Updated order
   */
  async adminAssignDriver(orderId, adminId, driverId) {
    return this.updateOrderStatus(orderId, 'courier_accepts_delivery_request', adminId, 'admin', { assignedDriverId: driverId });
  }

  /**
   * Convenience method: Driver picks up order
   * @param {number} orderId - Order ID
   * @param {number} driverId - Driver ID
   * @returns {Promise<Object>} Updated order
   */
  async driverPickupOrder(orderId, driverId) {
    return this.updateOrderStatus(orderId, 'courier_confirms_receipt', driverId, 'driver');
  }

  /**
   * Convenience method: Driver delivers order
   * @param {number} orderId - Order ID
   * @param {number} driverId - Driver ID
   * @returns {Promise<Object>} Updated order
   */
  async driverDeliverOrder(orderId, driverId) {
    return this.updateOrderStatus(orderId, 'courier_marks_delivered', driverId, 'driver');
  }

  /**
   * Convenience method: Customer confirms receipt
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Updated order
   */
  async customerConfirmReceipt(orderId, customerId) {
    return this.updateOrderStatus(orderId, 'customer_confirms_receipt', customerId, 'customer');
  }

  /**
   * Convenience method: Customer disputes order
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @param {string} disputeReason - Reason for dispute
   * @returns {Promise<Object>} Updated order
   */
  async customerDisputeOrder(orderId, customerId, disputeReason) {
    return this.updateOrderStatus(orderId, 'customer_reports_problem', customerId, 'customer', { disputeReason });
  }

  /**
   * Send notification to user
   * @param {number} userId - User ID
   * @param {string} notificationType - Type of notification
   * @param {Object} data - Notification data
   */
  async sendNotification(userId, notificationType, data) {
    try {
      // Import notification service dynamically to avoid circular dependencies
      const notificationService = require('./notificationService.ts');

      const notificationData = {
        userId,
        type: notificationType,
        title: this.getNotificationTitle(notificationType),
        message: this.getNotificationMessage(notificationType, data),
        data,
        priority: this.getNotificationPriority(notificationType)
      };

      await notificationService.createNotification(notificationData);

      logger.info(`Notification sent to user ${userId}: ${notificationType}`, {
        userId,
        notificationType,
        category: 'notifications'
      });
    } catch (error) {
      logger.error('Error sending notification:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Get notification title
   */
  getNotificationTitle(type) {
    const titles = {
      'vendor_timeout': 'Order Cancelled - Vendor Unresponsive',
      'payment_timeout': 'Payment Timeout',
      'order_completed': 'Order Completed Successfully',
      'order_cancelled': 'Order Cancelled',
      'vendor_confirmed': 'Vendor Confirmed Your Order'
    };
    return titles[type] || 'Order Update';
  }

  /**
   * Get notification message
   */
  getNotificationMessage(type, data) {
    const messages = {
      'vendor_timeout': `Your order #${data.orderId} has been cancelled because the vendor didn't respond within 15 minutes.`,
      'payment_timeout': `Your payment for order #${data.orderId} timed out. Please try again.`,
      'order_completed': `Your order #${data.orderId} has been delivered successfully!`,
      'order_cancelled': `Your order #${data.orderId} has been cancelled.`,
      'vendor_confirmed': `Great news! The vendor has confirmed your order #${data.orderId} and preparation will begin soon.`
    };
    return messages[type] || 'Your order status has been updated.';
  }

  /**
   * Get notification priority
   */
  getNotificationPriority(type) {
    const priorities = {
      'vendor_timeout': 'high',
      'payment_timeout': 'high',
      'order_completed': 'normal',
      'order_cancelled': 'high',
      'vendor_confirmed': 'normal'
    };
    return priorities[type] || 'normal';
  }
}

module.exports = MarketplaceOrderService;
