import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { Pool } from 'pg';
import { PAYMENT_CONFIG, calculateCommission } from '../config/paymentConfig';

// Types
interface PaymobConfig {
    apiKey: string;
    baseUrl: string;
    integrationIdCard?: string;
    integrationIdWallet?: string;
    iframeId?: string;
    hmacSecret?: string;
}

interface PaymobOrder {
    id: number;
    created_at: string;
    delivery_needed: boolean;
    merchant: any;
    collector: any;
    amount_cents: number;
    shipping_data: any;
    currency: string;
    is_payment_locked: boolean;
    merchant_order_id: string;
    wallet_notification: any;
    paid_amount_cents: number;
    notify_user_with_email: boolean;
    items: any[];
    order_url: string;
    commission_fees: number;
    delivery_fees_cents: number;
    delivery_vat_cents: number;
    payment_method: string;
    merchant_staff_tag: any;
    api_source: string;
    data: any;
}

interface BillingData {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    city: string;
    apartment?: string;
    floor?: string;
    street?: string;
    building?: string;
    postalCode?: string;
    state?: string;
}

interface PaymobCallbackData {
    obj: {
        id: number;
        pending: boolean;
        amount_cents: number;
        success: boolean | string;
        is_auth: boolean;
        is_capture: boolean;
        is_standalone_payment: boolean;
        is_voided: boolean;
        is_refunded: boolean;
        is_3d_secure: boolean;
        integration_id: number;
        profile_id: number;
        has_parent_transaction: boolean;
        order: {
            id: number;
            created_at: string;
            delivery_needed: boolean;
            merchant: any;
            collector: any;
            amount_cents: number;
            shipping_data: any;
            currency: string;
            is_payment_locked: boolean;
            merchant_order_id: string;
            wallet_notification: any;
            paid_amount_cents: number;
            notify_user_with_email: boolean;
            items: any[];
            order_url: string;
            commission_fees: number;
            delivery_fees_cents: number;
            delivery_vat_cents: number;
            payment_method: string;
            merchant_staff_tag: any;
            api_source: string;
            data: any;
        };
        created_at: string;
        currency: string;
        source_data: {
            type: string;
            pan: string;
            sub_type: string;
        };
        api_source: string;
        terminal_id: any;
        merchant_commission: number;
        installment: any;
        discount_details: any[];
        is_void: boolean;
        is_refund: boolean;
        data: any;
        is_hidden: boolean;
        payment_key_claims: any;
        error_occured: boolean;
        is_live: boolean;
        other_endpoint_reference: any;
        refunded_amount_cents: number;
        source_id: number;
        is_captured: boolean;
        captured_amount: number;
        merchant_staff_tag: any;
        owner: number;
        parent_transaction: any;
        pending_2fa: boolean;
        hmac: string;
    };
    type: string;
}

interface PaymentResult {
    success: boolean;
    orderId: string;
    transactionId: number;
    amount: number;
    paymentMethod: string;
}

/**
 * Paymob Payment Service
 * Handles all Paymob payment operations including:
 * - Credit/Debit card payments
 * - Mobile wallet payments (Vodafone Cash, Orange Cash, Etisalat Cash)
 * - Payment verification and callbacks
 */
class PaymobService {
    private config: PaymobConfig;
    private authToken: string | null = null;
    private tokenExpiry: number | null = null;
    private isInitialized: boolean = false;
    private pool: Pool;
    private logger: any;

    constructor() {
        this.config = {
            apiKey: process.env.PAYMOB_API_KEY || '',
            baseUrl: 'https://accept.paymob.com/api',
            integrationIdCard: process.env.PAYMOB_INTEGRATION_ID_CARD,
            integrationIdWallet: process.env.PAYMOB_INTEGRATION_ID_WALLET,
            iframeId: process.env.PAYMOB_IFRAME_ID,
            hmacSecret: process.env.PAYMOB_HMAC_SECRET
        };

        // Import pool and logger dynamically to avoid circular dependencies
        this.pool = require('../config/db');
        this.logger = require('../config/logger');
    }

    /**
     * Initialize Paymob service
     */
    initialize(): void {
        if (this.isInitialized) return;

        if (!this.config.apiKey) {
            this.logger.warn('PAYMOB_API_KEY not configured - Paymob payments will be disabled', {
                category: 'payment'
            });
            return;
        }

        this.isInitialized = true;
        this.logger.info('Paymob service initialized', { category: 'payment' });
    }

    /**
     * Authenticate with Paymob and get auth token
     * Token is cached for 1 hour
     */
    async authenticate(): Promise<string> {
        // Check if token is still valid (with 5 min buffer)
        if (this.authToken && this.tokenExpiry && this.tokenExpiry > Date.now() + (5 * 60 * 1000)) {
            return this.authToken;
        }

        try {
            const response = await axios.post(`${this.config.baseUrl}/auth/tokens`, {
                api_key: this.config.apiKey
            });

            this.authToken = response.data.token;
            this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour

            this.logger.info('Paymob authenticated successfully', { category: 'payment' });
            return this.authToken;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error('Paymob authentication failed', {
                category: 'payment',
                error: axiosError.message,
                response: axiosError.response?.data
            });
            throw new Error('Paymob authentication failed');
        }
    }

    /**
     * Create payment order in Paymob
     */
    async createOrder(orderId: string, amount: number, currency: string = 'EGP'): Promise<PaymobOrder> {
        if (!this.isInitialized) {
            this.initialize();
        }

        const authToken = await this.authenticate();

        try {
            const response = await axios.post<PaymobOrder>(`${this.config.baseUrl}/ecommerce/orders`, {
                auth_token: authToken,
                delivery_needed: false,
                amount_cents: Math.round(amount * 100), // Convert to cents
                currency: currency,
                merchant_order_id: orderId,
                items: []
            });

            this.logger.info('Paymob order created', {
                orderId,
                paymobOrderId: response.data.id,
                amount,
                currency,
                category: 'payment'
            });

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error('Paymob order creation failed', {
                orderId,
                amount,
                error: axiosError.message,
                response: axiosError.response?.data,
                category: 'payment'
            });
            throw new Error(`Paymob order creation failed: ${axiosError.message}`);
        }
    }

    /**
     * Create payment key for checkout
     */
    async createPaymentKey(
        paymobOrderId: number,
        amount: number,
        billingData: BillingData,
        paymentMethod: 'card' | 'wallet' = 'card'
    ): Promise<string> {
        const authToken = await this.authenticate();

        // Select integration ID based on payment method
        const integrationId = paymentMethod === 'wallet'
            ? this.config.integrationIdWallet
            : this.config.integrationIdCard;

        if (!integrationId) {
            throw new Error(`Paymob integration ID not configured for ${paymentMethod}`);
        }

        try {
            const response = await axios.post<{ token: string }>(`${this.config.baseUrl}/acceptance/payment_keys`, {
                auth_token: authToken,
                amount_cents: Math.round(amount * 100),
                expiration: 3600, // 1 hour
                order_id: paymobOrderId,
                billing_data: {
                    apartment: billingData.apartment || 'NA',
                    email: billingData.email,
                    floor: billingData.floor || 'NA',
                    first_name: billingData.firstName,
                    street: billingData.street || 'NA',
                    building: billingData.building || 'NA',
                    phone_number: billingData.phone,
                    shipping_method: 'NA',
                    postal_code: billingData.postalCode || 'NA',
                    city: billingData.city,
                    country: 'EG',
                    last_name: billingData.lastName,
                    state: billingData.state || 'NA'
                },
                currency: 'EGP',
                integration_id: parseInt(integrationId)
            });

            this.logger.info('Paymob payment key created', {
                paymobOrderId,
                paymentMethod,
                category: 'payment'
            });

            return response.data.token;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error('Paymob payment key creation failed', {
                paymobOrderId,
                paymentMethod,
                error: axiosError.message,
                response: axiosError.response?.data,
                category: 'payment'
            });
            throw new Error(`Payment key creation failed: ${axiosError.message}`);
        }
    }

    /**
     * Verify webhook callback HMAC signature
     */
    verifyCallback(data: PaymobCallbackData['obj']): boolean {
        const hmacSecret = this.config.hmacSecret;

        if (!hmacSecret) {
            this.logger.warn('PAYMOB_HMAC_SECRET not configured - skipping signature verification', {
                category: 'payment'
            });
            return true; // Allow in development, but log warning
        }

        try {
            // Concatenate values in specific order as per Paymob docs
            const concatenatedString = [
                data.amount_cents,
                data.created_at,
                data.currency,
                data.error_occured,
                data.has_parent_transaction,
                data.id,
                data.integration_id,
                data.is_3d_secure,
                data.is_auth,
                data.is_capture,
                data.is_refunded,
                data.is_standalone_payment,
                data.is_voided,
                data.order.id,
                data.owner,
                data.pending,
                data.source_data.pan,
                data.source_data.sub_type,
                data.source_data.type,
                data.success
            ].join('');

            const hash = crypto
                .createHmac('sha512', hmacSecret)
                .update(concatenatedString)
                .digest('hex');

            const isValid = hash === data.hmac;

            if (!isValid) {
                this.logger.error('Paymob HMAC verification failed', {
                    category: 'payment',
                    transactionId: data.id
                });
            }

            return isValid;
        } catch (error) {
            const err = error as Error;
            this.logger.error('Paymob HMAC verification error', {
                category: 'payment',
                error: err.message
            });
            return false;
        }
    }

    /**
     * Process payment callback from Paymob
     */
    async processCallback(callbackData: PaymobCallbackData): Promise<PaymentResult> {
        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Verify HMAC signature
            if (!this.verifyCallback(callbackData.obj)) {
                throw new Error('Invalid HMAC signature');
            }

            const txnData = callbackData.obj;
            const orderId = txnData.order.merchant_order_id;
            const success = txnData.success === 'true' || txnData.success === true;
            const amountEGP = txnData.amount_cents / 100;

            // Determine payment method details
            const paymentMethodType = txnData.source_data.type; // 'card' or 'wallet'
            const paymentMethodSubType = txnData.source_data.sub_type; // e.g., 'vodafone', 'orange'

            // Create or update payment record
            const paymentId = `paymob_${txnData.id}`;

            await client.query(`
        INSERT INTO payments (
          id, order_id, payer_id, amount, currency, payment_method,
          paymob_transaction_id, paymob_order_id, status, created_at
        )
        SELECT $1, $2, o.customer_id, $3, $4, $5, $6, $7, $8, NOW()
        FROM orders o WHERE o.id = $2
        ON CONFLICT (order_id) DO UPDATE SET
          paymob_transaction_id = $6,
          status = $8,
          updated_at = NOW()
      `, [
                paymentId,
                orderId,
                amountEGP,
                txnData.currency,
                `${paymentMethodType}_${paymentMethodSubType}`,
                txnData.id,
                txnData.order.id,
                success ? 'completed' : 'failed'
            ]);

            // Update order status if payment successful
            if (success) {
                // Calculate commission (15%)
                const platformCommission = amountEGP * 0.15;
                const driverPayout = amountEGP - platformCommission;

                await client.query(`
          UPDATE orders 
          SET 
            payment_status = 'paid',
            payment_method = $1,
            platform_commission = $2,
            driver_payout = $3
          WHERE id = $4
        `, [
                    `${paymentMethodType}_${paymentMethodSubType}`,
                    platformCommission,
                    driverPayout,
                    orderId
                ]);

                // Record platform revenue
                await client.query(`
          INSERT INTO platform_revenue (order_id, commission_amount, commission_rate, payment_method)
          VALUES ($1, $2, 0.15, $3)
          ON CONFLICT (order_id) DO NOTHING
        `, [orderId, platformCommission, `${paymentMethodType}_${paymentMethodSubType}`]);

                this.logger.info('Payment completed successfully', {
                    orderId,
                    transactionId: txnData.id,
                    amount: amountEGP,
                    method: `${paymentMethodType}_${paymentMethodSubType}`,
                    commission: platformCommission,
                    category: 'payment'
                });
            } else {
                this.logger.warn('Payment failed', {
                    orderId,
                    transactionId: txnData.id,
                    amount: amountEGP,
                    errorOccured: txnData.error_occured,
                    category: 'payment'
                });
            }

            await client.query('COMMIT');

            return {
                success,
                orderId,
                transactionId: txnData.id,
                amount: amountEGP,
                paymentMethod: `${paymentMethodType}_${paymentMethodSubType}`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            const err = error as Error;
            this.logger.error('Payment callback processing failed', {
                error: err.message,
                stack: err.stack,
                category: 'payment'
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get payment status from Paymob
     */
    async getTransactionStatus(transactionId: number): Promise<any> {
        const authToken = await this.authenticate();

        try {
            const response = await axios.get(
                `${this.config.baseUrl}/acceptance/transactions/${transactionId}`,
                {
                    params: { token: authToken }
                }
            );

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            this.logger.error('Failed to get transaction status', {
                transactionId,
                error: axiosError.message,
                category: 'payment'
            });
            throw error;
        }
    }
}

export default new PaymobService();
