const express = require('express');
const paymentService = require('../services/paymentService');
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

module.exports = router;
