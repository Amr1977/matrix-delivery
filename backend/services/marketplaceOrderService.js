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
      'accept_order': 'vendor',
      'reject_order': 'vendor',
      'start_preparing_order': 'vendor',
      'mark_prepared': 'vendor',

      // Payment FSM actions
      'confirm_payment': 'payment',
      'payment_failed': 'payment',
      'request_refund': 'payment',
      'retry_payment': 'payment',

      // Delivery FSM actions
      'assign_driver': 'delivery',
      'pickup_order': 'delivery',
      'deliver_order': 'delivery',
      'confirm_receipt': 'delivery',
      'dispute_order': 'delivery',

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
    return this.updateOrderStatus(orderId, 'vendor_confirms_order_is_available', vendorId, 'vendor');
  }

  /**
   * Convenience method: Vendor rejects order
   * @param {number} orderId - Order ID
   * @param {number} vendorId - Vendor ID
   * @returns {Promise<Object>} Updated order
   */
  async vendorRejectOrder(orderId, vendorId) {
    return this.updateOrderStatus(orderId, 'vendor_rejects_order_due_to_unavailability', vendorId, 'vendor');
  }

  /**
   * Convenience method: Customer confirms payment
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Updated order
   */
  async customerConfirmPayment(orderId, customerId) {
    return this.updateOrderStatus(orderId, 'customer_completes_payment_successfully', customerId, 'customer');
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
    return this.updateOrderStatus(orderId, 'courier_confirms_receipt_of_order_from_vendor', driverId, 'driver');
  }

  /**
   * Convenience method: Driver delivers order
   * @param {number} orderId - Order ID
   * @param {number} driverId - Driver ID
   * @returns {Promise<Object>} Updated order
   */
  async driverDeliverOrder(orderId, driverId) {
    return this.updateOrderStatus(orderId, 'courier_marks_order_as_delivered_to_customer', driverId, 'driver');
  }

  /**
   * Convenience method: Customer confirms receipt
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @returns {Promise<Object>} Updated order
   */
  async customerConfirmReceipt(orderId, customerId) {
    return this.updateOrderStatus(orderId, 'customer_confirms_receipt_of_order', customerId, 'customer');
  }

  /**
   * Convenience method: Customer disputes order
   * @param {number} orderId - Order ID
   * @param {number} customerId - Customer ID
   * @param {string} disputeReason - Reason for dispute
   * @returns {Promise<Object>} Updated order
   */
  async customerDisputeOrder(orderId, customerId, disputeReason) {
    return this.updateOrderStatus(orderId, 'customer_reports_problem_with_delivery', customerId, 'customer', { disputeReason });
  }

  /**
   * Handle vendor rejection after payment started (edge case)
   * @param {number} orderId - Order ID
   * @param {number} vendorId - Vendor ID
   * @param {string} reason - Rejection reason
   * @returns {Promise<Object>} Updated order
   */
  async handleLateVendorRejection(orderId, vendorId, reason) {
    try {
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if payment has already been processed
      const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      const paymentState = fsmStates.payment;

      if (paymentState === 'payment_successfully_received_and_verified_for_order') {
        // Payment processed - need to handle refund
        logger.warn(`Late vendor rejection for order ${orderId} - payment already processed, initiating refund`);

        // First, reject the order in vendor FSM
        await this.vendorRejectOrder(orderId, vendorId);

        // Then trigger automatic refund
        await this.updateOrderStatus(orderId, 'admin_or_system_requests_refund', vendorId, 'system', {
          refundReason: `Vendor rejection: ${reason}`,
          isLateRejection: true
        });

        return await this.marketplaceOrderRepository.getOrderById(orderId);
      } else {
        // Payment not processed - normal rejection
        return await this.vendorRejectOrder(orderId, vendorId);
      }
    } catch (error) {
      logger.error('Error handling late vendor rejection:', error);
      throw error;
    }
  }

  /**
   * Handle payment failure after vendor preparation started (edge case)
   * @param {number} orderId - Order ID
   * @param {string} failureReason - Payment failure reason
   * @returns {Promise<Object>} Updated order
   */
  async handlePaymentFailureAfterPreparation(orderId, failureReason) {
    try {
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check vendor FSM state
      const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);
      const vendorState = fsmStates.vendor;

      if (vendorState === 'order_is_fully_prepared_and_ready_for_delivery') {
        // Vendor already prepared - this is a complex case
        logger.warn(`Payment failure after vendor preparation for order ${orderId} - requiring admin intervention`);

        // Block delivery actions
        await this.updateOrderStatus(orderId, 'payment_attempt_failed_or_timed_out', null, 'system', {
          failureReason,
          vendorAlreadyPrepared: true,
          requiresAdminIntervention: true
        });

        // Could trigger admin notification here
        return await this.marketplaceOrderRepository.getOrderById(orderId);
      } else {
        // Normal payment failure handling
        return this.updateOrderStatus(orderId, 'payment_attempt_failed_or_timed_out', null, 'system', {
          failureReason
        });
      }
    } catch (error) {
      logger.error('Error handling payment failure after preparation:', error);
      throw error;
    }
  }

  /**
   * Force cancel order across all FSMs (admin emergency action)
   * @param {number} orderId - Order ID
   * @param {number} adminId - Admin ID
   * @param {string} reason - Cancellation reason
   * @returns {Promise<Object>} Updated order
   */
  async forceCancelOrder(orderId, adminId, reason) {
    try {
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Check current FSM states
      const fsmStates = await multiFSMOrchestrator.getOrderFSMStates(orderId);

      // Force cancel in appropriate FSM based on current state
      if (fsmStates.vendor && !this.isTerminalFSMState('vendor', fsmStates.vendor)) {
        // Cancel in vendor FSM if not terminal
        await this.updateOrderStatus(orderId, 'cancel_by_admin', adminId, 'admin', {
          cancellationReason: reason,
          forceCancel: true,
          cancelledBy: 'admin'
        });
      } else if (fsmStates.payment && !this.isTerminalFSMState('payment', fsmStates.payment)) {
        // Cancel in payment FSM if vendor FSM is terminal
        await this.updateOrderStatus(orderId, 'admin_or_system_requests_refund', adminId, 'admin', {
          refundReason: `Force cancel: ${reason}`,
          forceCancel: true
        });
      }

      // Restore inventory regardless of which FSM was cancelled
      await this.restoreOrderInventory(orderId);

      logger.info(`Force cancelled order ${orderId} by admin ${adminId}: ${reason}`);
      return await this.marketplaceOrderRepository.getOrderById(orderId);
    } catch (error) {
      logger.error('Error force cancelling order:', error);
      throw error;
    }
  }

  /**
   * Check if FSM state is terminal
   * @param {string} fsmType - FSM type
   * @param {string} state - Current state
   * @returns {boolean} True if terminal
   */
  isTerminalFSMState(fsmType, state) {
    const terminalStates = {
      vendor: ['order_rejected_by_vendor'],
      payment: ['payment_successfully_received_and_verified_for_order', 'payment_has_been_refunded_to_customer', 'payment_attempt_failed_for_order'],
      delivery: ['order_delivery_successfully_completed_and_confirmed_by_customer', 'delivery_disputed_by_customer_and_requires_resolution']
    };

    return terminalStates[fsmType]?.includes(state) || false;
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
