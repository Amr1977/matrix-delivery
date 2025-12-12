const express = require('express');
const paymentService = require('../services/paymentService');
const paymobService = require('../services/paymobService.ts');
const { verifyToken } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../config/logger');

const router = express.Router();

// Create payment intent for an order
router.post('/create-intent', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.payment(`Payment intent creation request`, {
    ip: clientIP,
    userId: req.user.userId,
    category: 'payment'
  });

  try {
    const { orderId, amount, currency = 'usd' } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        error: 'Order ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    const paymentIntent = await paymentService.createPaymentIntent(
      orderId,
      req.user.userId,
      amount,
      currency
    );

    const duration = Date.now() - startTime;
    logger.performance(`Payment intent created`, {
      userId: req.user.userId,
      orderId: orderId,
      amount: amount,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      paymentIntent: paymentIntent
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Payment intent creation failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'Payment service not configured') {
      res.status(503).json({
        error: 'Payment service is currently unavailable'
      });
    } else if (error.message.includes('Order not found')) {
      res.status(404).json({
        error: 'Order not found or access denied'
      });
    } else if (error.message.includes('Payment already exists')) {
      res.status(409).json({
        error: 'Payment already exists for this order'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create payment intent'
      });
    }
  }
});

// Get payment details for an order
router.get('/order/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const payment = await paymentService.getPaymentDetails(orderId, req.user.userId);

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment: payment
    });

  } catch (error) {
    logger.error(`Get payment failed: ${error.message}`, {
      userId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to get payment details'
    });
  }
});

// Process refund
router.post('/refund/:paymentId', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.payment(`Refund request`, {
    ip: clientIP,
    userId: req.user.userId,
    paymentId: req.params.paymentId,
    category: 'payment'
  });

  try {
    const { paymentId } = req.params;
    const { amount, reason = 'requested_by_customer' } = req.body;

    const refund = await paymentService.processRefund(
      paymentId,
      req.user.userId,
      amount,
      reason
    );

    const duration = Date.now() - startTime;
    logger.performance(`Refund processed`, {
      userId: req.user.userId,
      paymentId: paymentId,
      amount: amount,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      refund: refund
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Refund processing failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      paymentId: req.params.paymentId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'Payment service not configured') {
      res.status(503).json({
        error: 'Payment service is currently unavailable'
      });
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Payment not found or access denied'
      });
    } else if (error.message.includes('Can only refund')) {
      res.status(400).json({
        error: 'Can only refund completed payments'
      });
    } else {
      res.status(500).json({
        error: 'Failed to process refund'
      });
    }
  }
});

// Get user's saved payment methods
router.get('/methods', verifyToken, async (req, res) => {
  try {
    const paymentMethods = await paymentService.getPaymentMethods(req.user.userId);

    res.json({
      success: true,
      paymentMethods: paymentMethods
    });

  } catch (error) {
    logger.error(`Get payment methods failed: ${error.message}`, {
      userId: req.user.userId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to get payment methods'
    });
  }
});

// Add payment method
router.post('/methods', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.payment(`Add payment method request`, {
    ip: clientIP,
    userId: req.user.userId,
    category: 'payment'
  });

  try {
    const { paymentMethodId } = req.body;

    if (!paymentMethodId) {
      return res.status(400).json({
        error: 'Payment method ID is required'
      });
    }

    const paymentMethod = await paymentService.addPaymentMethod(
      req.user.userId,
      { paymentMethodId }
    );

    const duration = Date.now() - startTime;
    logger.performance(`Payment method added`, {
      userId: req.user.userId,
      methodId: paymentMethod.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      paymentMethod: paymentMethod
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Add payment method failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'Payment service not configured') {
      res.status(503).json({
        error: 'Payment service is currently unavailable'
      });
    } else {
      res.status(500).json({
        error: 'Failed to add payment method'
      });
    }
  }
});

// Delete payment method
router.delete('/methods/:methodId', verifyToken, async (req, res) => {
  try {
    const { methodId } = req.params;

    // Check if payment method belongs to user and delete it
    const result = await require('../services/paymentService').pool.query(
      'DELETE FROM user_payment_methods WHERE id = $1 AND user_id = $2 RETURNING *',
      [methodId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Payment method not found'
      });
    }

    logger.info('Payment method deleted', {
      userId: req.user.userId,
      methodId: methodId,
      category: 'payment'
    });

    res.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete payment method failed: ${error.message}`, {
      userId: req.user.userId,
      methodId: req.params.methodId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to delete payment method'
    });
  }
});

// PayPal Routes

// Create PayPal order
router.post('/paypal/create-order', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.payment(`PayPal order creation request`, {
    ip: clientIP,
    userId: req.user.userId,
    category: 'payment'
  });

  try {
    const { orderId, amount, currency = 'USD' } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        error: 'Order ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    const paypalOrder = await paymentService.createPayPalOrder(
      orderId,
      req.user.userId,
      amount,
      currency
    );

    const duration = Date.now() - startTime;
    logger.performance(`PayPal order created`, {
      userId: req.user.userId,
      orderId: orderId,
      amount: amount,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      ...paypalOrder
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`PayPal order creation failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'PayPal not configured') {
      res.status(503).json({
        error: 'PayPal is currently unavailable'
      });
    } else if (error.message.includes('Order not found')) {
      res.status(404).json({
        error: 'Order not found or access denied'
      });
    } else if (error.message.includes('Payment already exists')) {
      res.status(409).json({
        error: 'Payment already exists for this order'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create PayPal order'
      });
    }
  }
});

// Capture PayPal payment
router.post('/paypal/capture', verifyToken, async (req, res) => {
  const startTime = Date.now();

  try {
    const { paypalOrderId } = req.body;

    if (!paypalOrderId) {
      return res.status(400).json({
        error: 'PayPal order ID is required'
      });
    }

    const result = await paymentService.capturePayPalPayment(paypalOrderId);

    const duration = Date.now() - startTime;
    logger.performance(`PayPal payment captured`, {
      userId: req.user.userId,
      paypalOrderId: paypalOrderId,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`PayPal capture failed: ${error.message}`, {
      error: error.stack,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'PayPal not configured') {
      res.status(503).json({
        error: 'PayPal is currently unavailable'
      });
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Payment not found'
      });
    } else {
      res.status(500).json({
        error: 'Failed to capture PayPal payment'
      });
    }
  }
});

// Process PayPal refund
router.post('/paypal/refund/:paymentId', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.payment(`PayPal refund request`, {
    ip: clientIP,
    userId: req.user.userId,
    paymentId: req.params.paymentId,
    category: 'payment'
  });

  try {
    const { paymentId } = req.params;
    const { amount, reason = 'Customer requested refund' } = req.body;

    const refund = await paymentService.processPayPalRefund(
      paymentId,
      req.user.userId,
      amount,
      reason
    );

    const duration = Date.now() - startTime;
    logger.performance(`PayPal refund processed`, {
      userId: req.user.userId,
      paymentId: paymentId,
      amount: amount,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      ...refund
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`PayPal refund failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      paymentId: req.params.paymentId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'PayPal not configured') {
      res.status(503).json({
        error: 'PayPal is currently unavailable'
      });
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        error: 'Payment not found or access denied'
      });
    } else if (error.message.includes('Can only refund')) {
      res.status(400).json({
        error: 'Can only refund completed payments'
      });
    } else if (error.message.includes('capture ID not found')) {
      res.status(400).json({
        error: 'Payment has not been captured yet'
      });
    } else {
      res.status(500).json({
        error: 'Failed to process PayPal refund'
      });
    }
  }
});

// ========================================
// Paymob Routes (Cards + Mobile Wallets)
// ========================================

// Create Paymob payment (cards or wallets)
router.post('/paymob/create', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.payment(`Paymob payment creation request`, {
    ip: clientIP,
    userId: req.user.userId,
    category: 'payment'
  });

  try {
    const { orderId, amount, paymentMethod = 'card' } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        error: 'Order ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be greater than 0'
      });
    }

    if (!['card', 'wallet'].includes(paymentMethod)) {
      return res.status(400).json({
        error: 'Payment method must be either "card" or "wallet"'
      });
    }

    // Initialize Paymob service
    paymobService.initialize();

    // Get order and user details
    const pool = require('../config/db');
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, req.user.userId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Order not found or access denied'
      });
    }

    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.userId]
    );

    const user = userResult.rows[0];

    // Create Paymob order
    const paymobOrder = await paymobService.createOrder(orderId, amount, 'EGP');

    // Prepare billing data
    const billingData = {
      email: user.email,
      firstName: user.full_name?.split(' ')[0] || 'Customer',
      lastName: user.full_name?.split(' ').slice(1).join(' ') || 'User',
      phone: user.phone_number || '01000000000',
      city: 'Cairo',
      apartment: 'NA',
      floor: 'NA',
      street: 'NA',
      building: 'NA',
      postalCode: 'NA',
      state: 'NA'
    };

    // Create payment key
    const paymentToken = await paymobService.createPaymentKey(
      paymobOrder.id,
      amount,
      billingData,
      paymentMethod
    );

    const iframeId = process.env.PAYMOB_IFRAME_ID;
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentToken}`;

    const duration = Date.now() - startTime;
    logger.performance(`Paymob payment created`, {
      userId: req.user.userId,
      orderId,
      amount,
      paymentMethod,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      paymentToken,
      iframeUrl,
      paymobOrderId: paymobOrder.id
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Paymob payment creation failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message.includes('not configured')) {
      res.status(503).json({
        error: 'Paymob payment service is currently unavailable'
      });
    } else if (error.message.includes('Order not found')) {
      res.status(404).json({
        error: 'Order not found or access denied'
      });
    } else {
      res.status(500).json({
        error: 'Failed to create Paymob payment'
      });
    }
  }
});

// Paymob webhook callback (transaction processed)
router.post('/paymob/callback', async (req, res) => {
  const startTime = Date.now();

  logger.payment(`Paymob callback received`, {
    category: 'payment'
  });

  try {
    const result = await paymobService.processCallback(req.body);

    const duration = Date.now() - startTime;
    logger.performance(`Paymob callback processed`, {
      orderId: result.orderId,
      success: result.success,
      duration: `${duration}ms`,
      category: 'performance'
    });

    // Always return 200 to Paymob
    res.json({ success: true });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Paymob callback processing failed: ${error.message}`, {
      error: error.stack,
      duration: `${duration}ms`,
      category: 'error'
    });

    // Still return 200 to prevent Paymob retries
    res.json({ success: false });
  }
});

// Paymob response page (user redirect after payment)
router.get('/paymob/response', async (req, res) => {
  try {
    const { success, order_id, id } = req.query;

    logger.info('Paymob response page accessed', {
      success,
      orderId: order_id,
      transactionId: id,
      category: 'payment'
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://matrix-delivery.web.app';

    if (success === 'true') {
      res.redirect(`${frontendUrl}/orders/${order_id}?payment=success&method=paymob`);
    } else {
      res.redirect(`${frontendUrl}/orders/${order_id}?payment=failed&method=paymob`);
    }

  } catch (error) {
    logger.error(`Paymob response redirect failed: ${error.message}`, {
      error: error.stack,
      category: 'error'
    });

    const frontendUrl = process.env.FRONTEND_URL || 'https://matrix-delivery.web.app';
    res.redirect(`${frontendUrl}?payment=error`);
  }
});

// Get Paymob transaction status
router.get('/paymob/transaction/:transactionId', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await paymobService.getTransactionStatus(transactionId);

    res.json({
      success: true,
      transaction
    });

  } catch (error) {
    logger.error(`Get Paymob transaction failed: ${error.message}`, {
      transactionId: req.params.transactionId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to get transaction status'
    });
  }
});

module.exports = router;

