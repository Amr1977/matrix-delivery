const pool = require('../config/db');
const logger = require('../config/logger');
const { PAYMENT_CONFIG, calculateCommission } = require('../config/paymentConfig');
const smsParser = require('./smsParserService');

/**
 * Wallet Payment Service
 * Handles manual wallet payment confirmations (Vodafone Cash, InstaPay, etc.)
 * Supports SMS automation for instant verification
 */
class WalletPaymentService {
    /**
     * Create a new wallet payment request
     */
    async createWalletPayment(paymentData) {
        const {
            orderId,
            walletType,
            amount,
            senderPhone,
            senderName,
            transactionReference,
            transferTimestamp,
            screenshotUrl,
            notes
        } = paymentData;

        try {
            // Get platform wallet details
            const walletResult = await pool.query(
                'SELECT phone_number, wallet_name FROM platform_wallets WHERE wallet_type = $1 AND is_active = TRUE',
                [walletType]
            );

            if (walletResult.rows.length === 0) {
                throw new Error(`Wallet type ${walletType} is not active`);
            }

            const platformWallet = walletResult.rows[0];

            // Create wallet payment record
            const result = await pool.query(
                `INSERT INTO wallet_payments (
          order_id, wallet_type, amount, sender_phone, sender_name,
          transaction_reference, transfer_timestamp, recipient_phone,
          recipient_name, screenshot_url, notes, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
        RETURNING *`,
                [
                    orderId,
                    walletType,
                    amount,
                    senderPhone,
                    senderName,
                    transactionReference,
                    transferTimestamp,
                    platformWallet.phone_number,
                    platformWallet.wallet_name,
                    screenshotUrl,
                    notes
                ]
            );

            logger.info('Wallet payment created', {
                walletPaymentId: result.rows[0].id,
                orderId,
                walletType,
                amount
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error creating wallet payment', { error: error.message, orderId });
            throw error;
        }
    }

    /**
     * Confirm a wallet payment (admin action or auto-confirmation)
     */
    async confirmWalletPayment(walletPaymentId, adminId = null, notes = null) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Get wallet payment details
            const paymentResult = await client.query(
                'SELECT * FROM wallet_payments WHERE id = $1',
                [walletPaymentId]
            );

            if (paymentResult.rows.length === 0) {
                throw new Error('Wallet payment not found');
            }

            const walletPayment = paymentResult.rows[0];

            if (walletPayment.status !== 'pending') {
                throw new Error(`Wallet payment is already ${walletPayment.status}`);
            }

            // Calculate commission
            const { commission, payout } = calculateCommission(walletPayment.amount);

            // Update wallet payment status
            await client.query(
                `UPDATE wallet_payments 
         SET status = 'confirmed', 
             confirmed_by = $1, 
             confirmed_at = CURRENT_TIMESTAMP,
             notes = COALESCE($2, notes)
         WHERE id = $3`,
                [adminId, notes, walletPaymentId]
            );

            // Update order status and commission
            await client.query(
                `UPDATE orders 
         SET payment_status = 'paid',
             payment_method = $1,
             platform_commission = $2,
             driver_payout = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
                [walletPayment.wallet_type, commission, payout, walletPayment.order_id]
            );

            // Record platform revenue
            await client.query(
                `INSERT INTO platform_revenue (order_id, commission_amount, commission_rate, payment_method)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (order_id) DO NOTHING`,
                [walletPayment.order_id, commission, PAYMENT_CONFIG.COMMISSION_RATE, walletPayment.wallet_type]
            );

            await client.query('COMMIT');

            logger.info('Wallet payment confirmed', {
                walletPaymentId,
                orderId: walletPayment.order_id,
                adminId: adminId || 'auto',
                commission,
                payout
            });

            return { success: true, walletPayment, commission, payout };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Error confirming wallet payment', { error: error.message, walletPaymentId });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Reject a wallet payment (admin action)
     */
    async rejectWalletPayment(walletPaymentId, adminId, reason) {
        try {
            const result = await pool.query(
                `UPDATE wallet_payments 
         SET status = 'rejected',
             confirmed_by = $1,
             confirmed_at = CURRENT_TIMESTAMP,
             rejection_reason = $2
         WHERE id = $3 AND status = 'pending'
         RETURNING *`,
                [adminId, reason, walletPaymentId]
            );

            if (result.rows.length === 0) {
                throw new Error('Wallet payment not found or already processed');
            }

            logger.info('Wallet payment rejected', {
                walletPaymentId,
                adminId,
                reason
            });

            return result.rows[0];
        } catch (error) {
            logger.error('Error rejecting wallet payment', { error: error.message, walletPaymentId });
            throw error;
        }
    }

    /**
     * Get pending wallet payments for admin review
     */
    async getPendingPayments(limit = 50) {
        try {
            const result = await pool.query(
                `SELECT wp.*, o.customer_id, o.driver_id, o.total_amount as order_amount,
                u.full_name as customer_name, u.phone as customer_phone
         FROM wallet_payments wp
         JOIN orders o ON wp.order_id = o.id
         LEFT JOIN users u ON o.customer_id = u.id
         WHERE wp.status = 'pending'
         ORDER BY wp.created_at ASC
         LIMIT $1`,
                [limit]
            );

            return result.rows;
        } catch (error) {
            logger.error('Error getting pending wallet payments', { error: error.message });
            throw error;
        }
    }

    /**
     * Get wallet payment by ID
     */
    async getWalletPaymentById(walletPaymentId) {
        try {
            const result = await pool.query(
                `SELECT wp.*, o.customer_id, o.driver_id, o.total_amount as order_amount,
                u.full_name as customer_name, u.phone as customer_phone,
                admin.full_name as confirmed_by_name
         FROM wallet_payments wp
         JOIN orders o ON wp.order_id = o.id
         LEFT JOIN users u ON o.customer_id = u.id
         LEFT JOIN users admin ON wp.confirmed_by = admin.id
         WHERE wp.id = $1`,
                [walletPaymentId]
            );

            return result.rows[0] || null;
        } catch (error) {
            logger.error('Error getting wallet payment', { error: error.message, walletPaymentId });
            throw error;
        }
    }

    /**
     * Process forwarded SMS for auto-verification
     * Called when SMS is forwarded from platform mobile to backend
     */
    async processSMS(smsData) {
        const { smsContent, senderNumber, receivedAt } = smsData;

        try {
            logger.info('Processing forwarded SMS', { senderNumber, receivedAt });

            // Parse SMS content
            const parsedData = smsParser.parseIncomingSMS(smsContent, senderNumber);

            if (!parsedData) {
                logger.warn('Could not parse SMS content', { smsContent });
                return {
                    success: false,
                    message: 'Unable to parse SMS content',
                    smsContent
                };
            }

            if (!smsParser.validateParsedData(parsedData)) {
                logger.warn('Invalid parsed SMS data', { parsedData });
                return {
                    success: false,
                    message: 'Invalid SMS data',
                    parsedData
                };
            }

            logger.info('SMS parsed successfully', { parsedData });

            // Find matching pending wallet payment
            const matchResult = await pool.query(
                `SELECT wp.*, o.customer_id, o.total_amount as order_amount
         FROM wallet_payments wp
         JOIN orders o ON wp.order_id = o.id
         WHERE wp.status = 'pending'
           AND wp.wallet_type = $1
           AND wp.sender_phone = $2
           AND ABS(wp.amount - $3) < 0.01
           AND wp.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY wp.created_at DESC
         LIMIT 1`,
                [parsedData.walletType, parsedData.senderPhone, parsedData.amount]
            );

            if (matchResult.rows.length === 0) {
                logger.warn('No matching pending payment found', {
                    walletType: parsedData.walletType,
                    senderPhone: parsedData.senderPhone,
                    amount: parsedData.amount
                });

                return {
                    success: false,
                    message: 'No matching payment found - may need manual review',
                    parsedData
                };
            }

            const walletPayment = matchResult.rows[0];

            // Update wallet payment with SMS data
            await pool.query(
                `UPDATE wallet_payments
         SET sms_content = $1,
             sms_forwarded = TRUE,
             transaction_reference = COALESCE(transaction_reference, $2),
             transfer_timestamp = COALESCE(transfer_timestamp, $3)
         WHERE id = $4`,
                [
                    smsContent,
                    parsedData.transactionReference,
                    parsedData.transferTimestamp,
                    walletPayment.id
                ]
            );

            // Auto-confirm the payment
            const confirmResult = await this.confirmWalletPayment(
                walletPayment.id,
                null, // No admin - auto-confirmed
                'Auto-confirmed via SMS verification'
            );

            // Mark as auto-verified
            await pool.query(
                'UPDATE wallet_payments SET auto_verified = TRUE WHERE id = $1',
                [walletPayment.id]
            );

            logger.info('Payment auto-confirmed via SMS', {
                walletPaymentId: walletPayment.id,
                orderId: walletPayment.order_id,
                amount: parsedData.amount
            });

            return {
                success: true,
                message: 'Payment auto-confirmed',
                walletPaymentId: walletPayment.id,
                orderId: walletPayment.order_id,
                parsedData,
                confirmResult
            };

        } catch (error) {
            logger.error('Error processing SMS', { error: error.message, smsData });
            return {
                success: false,
                message: 'SMS processing error',
                error: error.message
            };
        }
    }

    /**
     * Get active platform wallets
     */
    async getActivePlatformWallets() {
        try {
            const result = await pool.query(
                'SELECT * FROM platform_wallets WHERE is_active = TRUE ORDER BY wallet_type'
            );

            return result.rows;
        } catch (error) {
            logger.error('Error getting platform wallets', { error: error.message });
            throw error;
        }
    }
}

module.exports = new WalletPaymentService();
