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

      // Initialize FSM orchestrator for this order
      await this.initializeFSMOrchestrator(order.id, orderPayload.vendorId, orderPayload.userId);

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
      // Initialize the shared orchestrator with this order context.
      multiFSMOrchestrator.initializeOrderFSMs(orderId);

      // Get order details for context
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);

      // Set up event handlers for FSM orchestration
      this.setupFSMEventHandlers(multiFSMOrchestrator, orderId, order, vendorId, customerId);

      // Start vendor confirmation timeout
      await this.scheduleVendorTimeout(multiFSMOrchestrator, orderId, order);

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
    if (orchestrator.__marketplaceHandlersRegistered?.has(orderId)) {
      return;
    }

    if (!orchestrator.__marketplaceHandlersRegistered) {
      orchestrator.__marketplaceHandlersRegistered = new Set();
    }

    orchestrator.__marketplaceHandlersRegistered.add(orderId);

    // When vendor confirms, enable payment
    orchestrator.on('VENDOR_CONFIRMED', async (eventData) => {
      if (eventData.orderId !== orderId) return;

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

    // When payment succeeds, enable delivery and create vendor payout
    orchestrator.on('PAYMENT_SUCCESSFUL', async (eventData) => {
      if (eventData.orderId !== orderId) return;

      logger.info(`Payment successful for order ${orderId}, creating payout and enabling delivery`, {
        orderId,
        amount: eventData.amount,
        category: 'fsm_orchestration'
      });

      try {
        // Create vendor payout once payment is confirmed
        const commissionAmount = (order.total_amount * order.commission_rate) / 100;
        await this.marketplaceOrderRepository.createVendorPayout(
          order.vendor_id,
          orderId,
          order.total_amount,
          commissionAmount
        );

        logger.info(`Vendor payout created for order ${orderId}`, {
          orderId,
          vendorId: order.vendor_id,
          category: 'payout'
        });
      } catch (error) {
        logger.error(`Error creating vendor payout for order ${orderId}:`, error);
      }
    });

    // When delivery is completed, finalize order
    orchestrator.on('ORDER_COMPLETED', async (eventData) => {
      if (eventData.orderId !== orderId) return;

      logger.info(`Order ${orderId} completed successfully`, {
        orderId,
        completionTime: eventData.completionTime,
        category: 'fsm_orchestration'
      });

      // Update final order status
      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);
    });

    // Handle timeouts and failures
    orchestrator.on('VENDOR_TIMEOUT', async (eventData) => {
      if (eventData.orderId !== orderId) return;

      logger.warn(`Vendor timeout for order ${orderId}`, { orderId, category: 'fsm_orchestration' });

      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.CANCELED);
      await this.restoreOrderInventory(orderId);

      // Send notification to customer
      await this.sendNotification(customerId, 'vendor_timeout', { orderId });
    });

    orchestrator.on('PAYMENT_TIMEOUT', async (eventData) => {
      if (eventData.orderId !== orderId) return;

      logger.warn(`Payment timeout for order ${orderId}`, { orderId, category: 'fsm_orchestration' });

      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.FAILED);
      await this.restoreOrderInventory(orderId);

      await this.sendNotification(customerId, 'payment_timeout', { orderId });
    });

    orchestrator.on('DELIVERY_AUTO_CONFIRMED', async (eventData) => {
      if (eventData.orderId !== orderId) return;

      logger.info(`Delivery auto-confirmed for order ${orderId}`, { orderId, category: 'fsm_orchestration' });

      await this.marketplaceOrderRepository.updateOrderStatus(orderId, ORDER_STATUS.COMPLETED);
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
      action = this.normalizeAction(action);

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
      // Validate action-specific authorization
      await this.validateActionAuthorization(order, action, userId, userRole, additionalData);

      const context = this.buildFSMContext(order, action, userId, userRole, additionalData);

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
      const nextFSMState = transitionResult.nextStatus || transitionResult.toState;
      const newStatus = this.mapFSMStateToOrderStatus(fsmType, nextFSMState, order);
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
          [`${fsmType}_fsm_state`]: nextFSMState
        },
        changes: {
          status: { from: order.status, to: newStatus },
          fsm_transition: {
            fsm_type: fsmType,
            from_state: transitionResult.fromState || order[`${fsmType}_state`] || 'unknown',
            to_state: nextFSMState
          }
        }
      });

      logger.info(`Order ${order.order_number}: ${action} by ${userRole} - ${fsmType} FSM: ${transitionResult.nextStatus}`, {
        orderId,
        action,
        userRole,
        fsmType,
        newFSMState: nextFSMState,
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
      'payment_chargeback': 'payment',

      // Delivery FSM actions
      'courier_accepts_delivery_request': 'delivery',
      'courier_cancels': 'delivery',
      'courier_arrives_at_vendor': 'delivery',
      'courier_confirms_receipt': 'delivery',
      'courier_arrives_at_customer': 'delivery',
      'courier_marks_delivered': 'delivery',
      'customer_confirms_receipt': 'delivery',
      'customer_reports_problem': 'delivery',
      'courier_cancels_after_assignment': 'delivery',
      'customer_timeout': 'delivery',

      // Timeout actions
      'timeout': 'vendor', // Context-dependent, but vendor timeout is most common

      // Admin actions (can affect multiple FSMs)
      'cancel_by_admin': 'vendor', // Primarily affects vendor FSM
      'resolve_dispute_completed': 'delivery',
      'resolve_dispute_refund': 'payment'
    };

    return actionToFSMMap[action] || null;
  }

  normalizeAction(action) {
    const aliases = {
      vendor_starts_preparing_order: 'vendor_starts_preparing',
      vendor_marks_order_as_fully_prepared: 'vendor_marks_prepared',
      courier_arrives_at_vendor_pickup_location: 'courier_arrives_at_vendor',
      courier_arrives_at_customer_drop_off_location: 'courier_arrives_at_customer',
      customer_reports_problem_with_delivery: 'customer_reports_problem'
    };

    return aliases[action] || action;
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
        if (fsmState === 'awaiting_vendor_start_preparation') return ORDER_STATUS.ACCEPTED;
        if (fsmState === 'vendor_is_actively_preparing_order') return ORDER_STATUS.ACCEPTED;
        if (fsmState === 'order_rejected_by_vendor') return ORDER_STATUS.REJECTED;
        if (fsmState === 'order_cancelled_vendor_unresponsive') return ORDER_STATUS.CANCELED;
        break;

      case 'payment':
        if (fsmState === 'payment_successfully_received_and_verified_for_order') {
          return order.status === ORDER_STATUS.PENDING ? ORDER_STATUS.PAID : order.status;
        }
        if (fsmState === 'payment_attempt_failed_for_order') return ORDER_STATUS.FAILED;
        if (fsmState === 'payment_has_been_refunded_to_customer') return ORDER_STATUS.REFUNDED;
        break;

      case 'delivery':
        if (fsmState === 'courier_has_been_assigned_to_deliver_the_order') return ORDER_STATUS.ASSIGNED;
        if (fsmState === 'courier_is_actively_transporting_order_to_customer') return ORDER_STATUS.PICKED_UP;
        if (fsmState === 'awaiting_customer_confirmation_of_order_delivery') return ORDER_STATUS.DELIVERED;
        if (fsmState === 'order_delivery_successfully_completed_and_confirmed_by_customer') return ORDER_STATUS.COMPLETED;
        if (fsmState === 'order_delivery_auto_confirmed_due_to_timeout') return ORDER_STATUS.COMPLETED;
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
      case 'vendor_accepts_order':
      case 'vendor_rejects_order':
      case 'vendor_starts_preparing':
      case 'vendor_marks_prepared':
        if (userRole !== 'vendor') {
          throw new Error('Only vendors can perform this action');
        }
        if (order.vendor_id !== userId) {
          throw new Error('Only the assigned vendor can manage this order');
        }
        break;

      case 'customer_completes_payment':
      case 'customer_confirms_receipt':
      case 'customer_reports_problem':
      case 'initiate_refund':
      case 'payment_fails':
      case 'payment_chargeback':
        if (!['customer', 'system', 'admin'].includes(userRole)) {
          throw new Error('Only the customer or system can perform this action');
        }
        if (order.user_id !== userId) {
          if (userRole !== 'system' && userRole !== 'admin') {
            throw new Error('Only the customer can perform this action');
          }
        }
        break;

      case 'courier_accepts_delivery_request':
        if (!['admin', 'driver'].includes(userRole)) {
          throw new Error('Only an admin or driver can assign delivery');
        }
        break;

      case 'courier_cancels':
      case 'courier_arrives_at_vendor':
      case 'courier_confirms_receipt':
      case 'courier_arrives_at_customer':
      case 'courier_marks_delivered':
      case 'courier_cancels_after_assignment':
        if (userRole !== 'driver') {
          throw new Error('Only the assigned driver can perform this action');
        }
        break;

      // Admin actions don't need additional validation beyond role
      case 'cancel_by_admin':
      case 'resolve_dispute_completed':
      case 'resolve_dispute_refund':
        if (userRole !== 'admin') {
          throw new Error('Only admins can perform this action');
        }
        break;

      case 'timeout':
      case 'customer_timeout':
        if (userRole !== 'system') {
          throw new Error('Only system workflows can perform timeout actions');
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  buildFSMContext(order, action, userId, userRole, additionalData = {}) {
    const paymentData = additionalData.paymentData || {};
    const deliveryAddress = this.normalizeDeliveryAddress(order, additionalData);
    const deliveryZone = order.delivery_zone || additionalData.deliveryZone || 'default-zone';
    const contextOrder = {
      ...order,
      id: order.id,
      delivery_zone: deliveryZone,
      delivery_address: deliveryAddress,
      pickup_confirmed: action === 'courier_confirms_receipt',
      status: order.status
    };

    const context = {
      orderId: order.id,
      userId,
      userRole,
      order: contextOrder,
      metadata: additionalData
    };

    if (userRole === 'vendor') {
      context.vendor = {
        id: order.vendor_id,
        is_active: true,
        preparation_status: additionalData.preparationStatus || 'completed'
      };
      context.store = {
        vendor_id: order.vendor_id
      };
    }

    if (userRole === 'customer') {
      context.customer = {
        id: order.user_id,
        can_receive_deliveries: true
      };
    }

    if (['customer_completes_payment', 'initiate_refund', 'payment_fails', 'payment_attempt_failed_or_timed_out'].includes(action)) {
      context.payment = {
        method: paymentData.method || additionalData.paymentMethod || 'card',
        completed_at: additionalData.completedAt || new Date().toISOString(),
        settled: false
      };
      context.paymentId = additionalData.paymentId || paymentData.transactionId || `payment-${order.id}`;
      context.amount = Number(paymentData.amount || additionalData.amount || order.total_amount);
      context.customer_balance = Number(paymentData.amount || additionalData.amount || order.total_amount);
    }

    if (['admin', 'driver'].includes(userRole)) {
      context.courier = {
        id: additionalData.assignedDriverId || additionalData.driverId || userId,
        status: this.getCourierStatusForAction(action),
        delivery_zone: deliveryZone,
        assigned_order_id: order.id
      };
    }

    if (action === 'courier_arrives_at_vendor') {
      context.location_update = { type: 'arrived_at_vendor' };
    }

    if (action === 'courier_arrives_at_customer') {
      context.location_update = { type: 'arrived_at_customer' };
    }

    if (action === 'courier_marks_delivered') {
      context.delivery_attempt = { success: true };
    }

    if (action === 'customer_reports_problem') {
      context.delivery_time = additionalData.deliveryTime || new Date().toISOString();
    }

    return context;
  }

  normalizeDeliveryAddress(order, additionalData = {}) {
    const lat = order.delivery_lat || order.deliveryLat || additionalData.deliveryLat || 30.0444;
    const lng = order.delivery_lng || order.deliveryLng || additionalData.deliveryLng || 31.2357;
    const rawAddress = order.delivery_address || additionalData.deliveryAddress || 'Unknown address';

    if (typeof rawAddress === 'object' && rawAddress.coordinates) {
      return rawAddress;
    }

    return {
      text: rawAddress,
      coordinates: {
        lat,
        lng
      }
    };
  }

  getCourierStatusForAction(action) {
    switch (action) {
      case 'courier_accepts_delivery_request':
        return 'available';
      case 'courier_arrives_at_vendor':
      case 'courier_confirms_receipt':
      case 'courier_arrives_at_customer':
      case 'courier_marks_delivered':
      case 'courier_cancels_after_assignment':
        return 'in_transit';
      default:
        return 'available';
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

      case ORDER_STATUS.CANCELED:
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
   * Restore inventory for cancelled/rejected orders
   * @param {number} orderId - Order ID
   */
  async restoreOrderInventory(orderId) {
    try {
      const order = await this.marketplaceOrderRepository.getOrderById(orderId);
      if (!order || !order.items) return;

      const pool = require('../config/db');
      for (const item of order.items) {
        await pool.query(`
          UPDATE items
          SET inventory_quantity = inventory_quantity + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [item.quantity, item.item_id]);
      }
      logger.info(`Inventory restored for order ${orderId}`);
    } catch (error) {
      logger.error(`Error restoring inventory for order ${orderId}:`, error);
    }
  }

  /**
   * Process order delivery side-effects
   * @param {number} orderId - Order ID
   */
  async processOrderDelivery(orderId) {
    try {
      // Delivery confirmation side-effects (e.g., unlocking payouts)
      logger.info(`Processing delivery side-effects for order ${orderId}`);
    } catch (error) {
      logger.error(`Error processing delivery for order ${orderId}:`, error);
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



