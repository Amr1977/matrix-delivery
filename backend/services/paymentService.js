const stripe = require('stripe');
const logger = require('../logger');
const { Pool } = require('pg');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class PaymentService {
  constructor() {
    this.stripe = null;
    this.isInitialized = false;
  }

  /**
   * Initialize Stripe
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecretKey) {
        logger.warn('STRIPE_SECRET_KEY not configured - payment processing will be disabled', {
          category: 'payment'
        });
        return;
      }

      this.stripe = stripe(stripeSecretKey);
      this.isInitialized = true;

      logger.info('Payment service initialized successfully', {
        category: 'payment'
      });
    } catch (error) {
      logger.error(`Payment service initialization failed: ${error.message}`, {
        category: 'payment',
        error: error.message
      });
      // Don't throw - payment service should fail gracefully
    }
  }

  /**
   * Create payment intent for an order
   */
  async createPaymentIntent(orderId, userId, amount, currency = 'usd') {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Payment service not configured');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get order details
      const orderResult = await client.query(
        'SELECT * FROM orders WHERE id = $1 AND customer_user_id = $2',
        [orderId, userId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Order not found or access denied');
      }

      const order = orderResult.rows[0];

      // Check if order already has a payment
      const existingPayment = await client.query(
        'SELECT * FROM payments WHERE order_id = $1',
        [orderId]
      );

      if (existingPayment.rows.length > 0) {
        throw new Error('Payment already exists for this order');
      }

      // Create Stripe payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        metadata: {
          orderId: orderId,
          userId: userId,
          integration_check: 'accept_a_payment'
        },
        description: `Matrix Delivery - Order ${orderId}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store payment record in database
      const paymentId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await client.query(
        `INSERT INTO payments (id, order_id, user_id, amount, currency, payment_method, stripe_payment_intent_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          paymentId,
          orderId,
          userId,
          amount,
          currency,
          'credit_card',
          paymentIntent.id,
          'pending'
        ]
      );

      await client.query('COMMIT');

      logger.info('Payment intent created', {
        paymentId: paymentId,
        orderId: orderId,
        userId: userId,
        amount: amount,
        currency: currency,
        stripePaymentIntentId: paymentIntent.id,
        category: 'payment'
      });

      return {
        paymentId: paymentId,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        currency: currency
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Payment intent creation failed: ${error.message}`, {
        orderId: orderId,
        userId: userId,
        amount: amount,
        category: 'payment',
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm payment (webhook handler)
   */
  async confirmPayment(stripePaymentIntentId) {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Payment service not configured');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Find payment record
      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE stripe_payment_intent_id = $1',
        [stripePaymentIntentId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment record not found');
      }

      const payment = paymentResult.rows[0];

      // Get payment intent from Stripe
      const paymentIntent = await this.stripe.paymentIntents.retrieve(stripePaymentIntentId);

      let newStatus = 'pending';
      if (paymentIntent.status === 'succeeded') {
        newStatus = 'completed';
      } else if (paymentIntent.status === 'canceled') {
        newStatus = 'cancelled';
      } else if (paymentIntent.status === 'processing') {
        newStatus = 'processing';
      }

      // Update payment status
      await client.query(
        `UPDATE payments
         SET status = $1, stripe_charge_id = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          newStatus,
          paymentIntent.latest_charge || null,
          payment.id
        ]
      );

      // If payment succeeded, mark order as paid
      if (newStatus === 'completed') {
        await client.query(
          'UPDATE orders SET payment_status = $1 WHERE id = $2',
          ['paid', payment.order_id]
        );
      }

      await client.query('COMMIT');

      logger.info('Payment confirmed', {
        paymentId: payment.id,
        orderId: payment.order_id,
        userId: payment.user_id,
        status: newStatus,
        stripePaymentIntentId: stripePaymentIntentId,
        category: 'payment'
      });

      return {
        paymentId: payment.id,
        orderId: payment.order_id,
        status: newStatus,
        amount: payment.amount,
        currency: payment.currency
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Payment confirmation failed: ${error.message}`, {
        stripePaymentIntentId: stripePaymentIntentId,
        category: 'payment',
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(orderId, userId) {
    const result = await pool.query(
      `SELECT p.*, o.pickup_address, o.delivery_address
       FROM payments p
       JOIN orders o ON p.order_id = o.id
       WHERE p.order_id = $1 AND (p.user_id = $2 OR o.customer_user_id = $2)`,
      [orderId, userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const payment = result.rows[0];
    return {
      id: payment.id,
      orderId: payment.order_id,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      paymentMethod: payment.payment_method,
      status: payment.status,
      stripePaymentIntentId: payment.stripe_payment_intent_id,
      stripeChargeId: payment.stripe_charge_id,
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
      order: {
        pickupAddress: payment.pickup_address,
        deliveryAddress: payment.delivery_address
      }
    };
  }

  /**
   * Process refund
   */
  async processRefund(paymentId, userId, amount = null, reason = 'requested_by_customer') {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Payment service not configured');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get payment details
      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE id = $1 AND user_id = $2',
        [paymentId, userId]
      );

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found or access denied');
      }

      const payment = paymentResult.rows[0];

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      // Process refund with Stripe
      const refundAmount = amount ? Math.round(amount * 100) : undefined;
      const refund = await this.stripe.refunds.create({
        payment_intent: payment.stripe_payment_intent_id,
        amount: refundAmount,
        reason: reason,
        metadata: {
          paymentId: paymentId,
          userId: userId
        }
      });

      // Update payment status
      await client.query(
        `UPDATE payments
         SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [paymentId]
      );

      await client.query('COMMIT');

      logger.info('Refund processed', {
        paymentId: paymentId,
        orderId: payment.order_id,
        userId: userId,
        refundAmount: refundAmount || payment.amount,
        stripeRefundId: refund.id,
        category: 'payment'
      });

      return {
        refundId: refund.id,
        amount: refundAmount ? refundAmount / 100 : payment.amount,
        currency: payment.currency,
        status: 'processed'
      };

    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`Refund processing failed: ${error.message}`, {
        paymentId: paymentId,
        userId: userId,
        category: 'payment',
        error: error.message
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payment methods for user
   */
  async getPaymentMethods(userId) {
    const result = await pool.query(
      'SELECT * FROM user_payment_methods WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return result.rows.map(method => ({
      id: method.id,
      type: method.payment_method_type,
      provider: method.provider,
      lastFour: method.last_four,
      expiryMonth: method.expiry_month,
      expiryYear: method.expiry_year,
      isDefault: method.is_default,
      createdAt: method.created_at
    }));
  }

  /**
   * Add payment method for user
   */
  async addPaymentMethod(userId, paymentMethodData) {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (!this.stripe) {
      throw new Error('Payment service not configured');
    }

    const { paymentMethodId } = paymentMethodData;

    try {
      // Attach payment method to customer (create customer if needed)
      let customer;
      const existingCustomerResult = await pool.query(
        'SELECT stripe_customer_id FROM users WHERE id = $1',
        [userId]
      );

      if (existingCustomerResult.rows[0]?.stripe_customer_id) {
        customer = { id: existingCustomerResult.rows[0].stripe_customer_id };
      } else {
        // Create Stripe customer
        customer = await this.stripe.customers.create({
          email: existingCustomerResult.rows[0]?.email,
          metadata: {
            userId: userId
          }
        });

        // Store customer ID
        await pool.query(
          'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
          [customer.id, userId]
        );
      }

      // Attach payment method to customer
      await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Get payment method details
      const paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // Store in database
      const methodId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      await pool.query(
        `INSERT INTO user_payment_methods (id, user_id, payment_method_type, provider, provider_token, last_four, expiry_month, expiry_year, is_default)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          methodId,
          userId,
          paymentMethod.type,
          'stripe',
          paymentMethodId,
          paymentMethod.card?.last4 || null,
          paymentMethod.card?.exp_month || null,
          paymentMethod.card?.exp_year || null,
          false // Not default initially
        ]
      );

      logger.info('Payment method added', {
        methodId: methodId,
        userId: userId,
        type: paymentMethod.type,
        category: 'payment'
      });

      return {
        id: methodId,
        type: paymentMethod.type,
        lastFour: paymentMethod.card?.last4,
        expiryMonth: paymentMethod.card?.exp_month,
        expiryYear: paymentMethod.card?.exp_year,
        isDefault: false,
        createdAt: new Date()
      };

    } catch (error) {
      logger.error(`Payment method addition failed: ${error.message}`, {
        userId: userId,
        category: 'payment',
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new PaymentService();
