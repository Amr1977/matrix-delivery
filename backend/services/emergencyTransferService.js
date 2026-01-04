/**
 * Emergency Transfer Service
 * Handles order transfers when driver cannot complete after pickup
 */

const logger = require('../config/logger');
const { TakafulService } = require('./takafulService');

class EmergencyTransferService {
    constructor(pool) {
        this.pool = pool;
        this.takafulService = new TakafulService(pool);
        this.EMERGENCY_TIMEOUT_MINUTES = 30;
        this.EMERGENCY_BONUS_RATE = 0.20; // 20%
        this.BASE_COMPENSATION = 10; // EGP
        this.PER_KM_COMPENSATION = 3; // EGP
        this.MAX_DISTANCE_KM = 5; // Max distance for eligible couriers
    }

    // ============================================
    // Emergency Trigger
    // ============================================

    /**
     * Trigger emergency transfer for an order
     * @param {string} orderId - Order ID
     * @param {string} driverId - Current driver ID
     * @param {Object} options - Emergency details
     * @returns {Promise<Object>} Emergency transfer record
     */
    async triggerEmergency(orderId, driverId, options = {}) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get order details
            const orderResult = await client.query(
                `SELECT id, status, assigned_driver_user_id, price, upfront_payment,
                from_lat, from_lng, to_lat, to_lng
         FROM orders WHERE id = $1 FOR UPDATE`,
                [orderId]
            );

            if (orderResult.rows.length === 0) {
                throw new Error('Order not found');
            }

            const order = orderResult.rows[0];

            // Validate order status
            if (!['picked_up', 'in_transit'].includes(order.status)) {
                throw new Error('Emergency transfer only allowed after pickup. Use withdraw for accepted orders.');
            }

            // Validate driver ownership
            if (order.assigned_driver_user_id !== driverId) {
                throw new Error('Only assigned driver can trigger emergency');
            }

            // Get driver's current location
            const driverLocation = options.location || { lat: null, lng: null };
            const distanceTraveled = options.distanceTraveled || 0;

            // Calculate timeout (30 minutes from now)
            const timeoutAt = new Date(Date.now() + this.EMERGENCY_TIMEOUT_MINUTES * 60 * 1000);

            // Calculate bonus and compensation
            const deliveryFee = parseFloat(order.price) || 0;
            const emergencyBonus = deliveryFee * this.EMERGENCY_BONUS_RATE;
            const driverCompensation = this.BASE_COMPENSATION + (distanceTraveled * this.PER_KM_COMPENSATION);

            // Create emergency transfer
            const transferResult = await client.query(
                `INSERT INTO emergency_transfers (
          order_id, original_driver_id, original_driver_location,
          distance_traveled_km, emergency_reason,
          original_delivery_fee, emergency_bonus_rate, emergency_bonus,
          original_driver_compensation, upfront_amount, timeout_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
                [
                    orderId, driverId, JSON.stringify(driverLocation),
                    distanceTraveled, options.reason || 'other',
                    deliveryFee, this.EMERGENCY_BONUS_RATE, emergencyBonus,
                    driverCompensation, order.upfront_payment || 0, timeoutAt
                ]
            );

            const transfer = transferResult.rows[0];

            // Update order status
            await client.query(
                `UPDATE orders SET 
          status = 'emergency_transfer',
          is_emergency_transfer = TRUE,
          emergency_transfer_id = $1
         WHERE id = $2`,
                [transfer.id, orderId]
            );

            await client.query('COMMIT');

            logger.info('Emergency transfer triggered', {
                transferId: transfer.id,
                orderId,
                driverId,
                reason: options.reason,
                timeoutAt
            });

            // Notify nearby couriers (async, non-blocking)
            this.notifyNearbyCouriers(transfer).catch(err => {
                logger.error('Failed to notify couriers', { transferId: transfer.id, error: err.message });
            });

            return transfer;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to trigger emergency', { orderId, driverId, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================
    // Courier Notification & Filtering
    // ============================================

    /**
     * Find and notify nearby eligible couriers
     * @param {Object} transfer - Emergency transfer record
     * @returns {Promise<Array>} Notified couriers
     */
    async notifyNearbyCouriers(transfer) {
        const driverLocation = typeof transfer.original_driver_location === 'string'
            ? JSON.parse(transfer.original_driver_location)
            : transfer.original_driver_location;

        if (!driverLocation?.lat || !driverLocation?.lng) {
            logger.warn('No location for emergency transfer', { transferId: transfer.id });
            return [];
        }

        // Find eligible couriers: online, have sufficient cash, within 5km
        const upfrontRequired = parseFloat(transfer.upfront_amount) || 0;

        const couriersResult = await this.pool.query(
            `SELECT u.id, u.name, u.available_cash, u.last_lat, u.last_lng
       FROM users u
       WHERE u.primary_role = 'driver'
         AND u.is_verified = TRUE
         AND u.id != $1
         AND u.available_cash >= $2
         AND u.last_lat IS NOT NULL
         AND u.last_lng IS NOT NULL
       ORDER BY 
         SQRT(POWER(u.last_lat - $3, 2) + POWER(u.last_lng - $4, 2)) ASC
       LIMIT 20`,
            [transfer.original_driver_id, upfrontRequired, driverLocation.lat, driverLocation.lng]
        );

        const notifiedCouriers = [];

        for (const courier of couriersResult.rows) {
            // Calculate approximate distance (simplified)
            const distanceKm = this.calculateDistance(
                driverLocation.lat, driverLocation.lng,
                courier.last_lat, courier.last_lng
            );

            if (distanceKm <= this.MAX_DISTANCE_KM) {
                // Record notification
                await this.pool.query(
                    `INSERT INTO emergency_transfer_notifications 
           (transfer_id, driver_id, distance_to_transfer_km, has_sufficient_cash)
           VALUES ($1, $2, $3, $4)`,
                    [transfer.id, courier.id, distanceKm, true]
                );

                // Send notification (via notification service)
                try {
                    const { createNotification } = require('./notificationService');
                    await createNotification(
                        courier.id,
                        transfer.order_id,
                        'emergency_transfer_available',
                        '🚨 Emergency Order Available!',
                        `Driver needs help! ${distanceKm.toFixed(1)}km away. Bonus: +20%. Accept now!`
                    );
                } catch (notifyErr) {
                    logger.error('Failed to send emergency notification', { courierId: courier.id });
                }

                notifiedCouriers.push({ id: courier.id, distanceKm });
            }
        }

        logger.info('Notified nearby couriers', {
            transferId: transfer.id,
            count: notifiedCouriers.length
        });

        return notifiedCouriers;
    }

    /**
     * Calculate approximate distance between two points (km)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // ============================================
    // FCFS Acceptance
    // ============================================

    /**
     * Accept an emergency transfer (first-come-first-served)
     * @param {number} transferId - Emergency transfer ID
     * @param {string} driverId - Driver accepting the transfer
     * @param {Object} location - Driver's current location
     * @returns {Promise<Object>} Updated transfer
     */
    async acceptTransfer(transferId, driverId, location = {}) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Lock transfer for atomic update
            const transferResult = await client.query(
                `SELECT * FROM emergency_transfers WHERE id = $1 FOR UPDATE`,
                [transferId]
            );

            if (transferResult.rows.length === 0) {
                throw new Error('Transfer not found');
            }

            const transfer = transferResult.rows[0];

            // Check if already accepted
            if (transfer.status !== 'pending') {
                throw new Error(`Transfer already ${transfer.status}`);
            }

            // Check timeout
            if (new Date() > new Date(transfer.timeout_at)) {
                throw new Error('Transfer has timed out');
            }

            // Check driver has sufficient cash
            const driverResult = await client.query(
                `SELECT available_cash FROM users WHERE id = $1`,
                [driverId]
            );

            const driverCash = parseFloat(driverResult.rows[0]?.available_cash) || 0;
            if (driverCash < transfer.upfront_amount) {
                throw new Error(`Insufficient cash. Required: ${transfer.upfront_amount}, Available: ${driverCash}`);
            }

            // Accept transfer (FCFS)
            await client.query(
                `UPDATE emergency_transfers SET 
          status = 'accepted',
          new_driver_id = $1,
          new_driver_location = $2,
          accepted_at = NOW()
         WHERE id = $3`,
                [driverId, JSON.stringify(location), transferId]
            );

            // Update notification response
            await client.query(
                `UPDATE emergency_transfer_notifications SET response = 'accepted'
         WHERE transfer_id = $1 AND driver_id = $2`,
                [transferId, driverId]
            );

            // Mark other notifications as expired
            await client.query(
                `UPDATE emergency_transfer_notifications SET response = 'expired'
         WHERE transfer_id = $1 AND driver_id != $2 AND response = 'pending'`,
                [transferId, driverId]
            );

            await client.query('COMMIT');

            // Notify original driver
            try {
                const { createNotification } = require('./notificationService');
                await createNotification(
                    transfer.original_driver_id,
                    transfer.order_id,
                    'emergency_transfer_accepted',
                    'Transfer Accepted! 🤝',
                    'Another courier is on the way to take over. Wait at your location for handoff.'
                );
            } catch (notifyErr) {
                logger.error('Failed to notify original driver', { error: notifyErr.message });
            }

            logger.info('Emergency transfer accepted', { transferId, driverId });

            return { ...transfer, status: 'accepted', new_driver_id: driverId };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to accept transfer', { transferId, driverId, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================
    // Handoff Confirmation
    // ============================================

    /**
     * Confirm handoff (both drivers must confirm)
     * @param {number} transferId - Transfer ID
     * @param {string} driverId - Driver confirming
     * @param {Object} location - Handoff location
     * @returns {Promise<Object>} Updated transfer
     */
    async confirmHandoff(transferId, driverId, location = {}) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            const transferResult = await client.query(
                `SELECT * FROM emergency_transfers WHERE id = $1 FOR UPDATE`,
                [transferId]
            );

            if (transferResult.rows.length === 0) {
                throw new Error('Transfer not found');
            }

            const transfer = transferResult.rows[0];

            if (transfer.status !== 'accepted' && transfer.status !== 'handoff_pending') {
                throw new Error(`Cannot confirm handoff in ${transfer.status} status`);
            }

            // Determine which driver is confirming
            let updateField;
            if (driverId === transfer.original_driver_id) {
                updateField = 'original_driver_confirmed = TRUE';
            } else if (driverId === transfer.new_driver_id) {
                updateField = 'new_driver_confirmed = TRUE';
            } else {
                throw new Error('Only involved drivers can confirm handoff');
            }

            await client.query(
                `UPDATE emergency_transfers SET 
          ${updateField},
          handoff_location = COALESCE(handoff_location, $1),
          status = 'handoff_pending'
         WHERE id = $2`,
                [JSON.stringify(location), transferId]
            );

            // Check if both confirmed
            const updatedResult = await client.query(
                `SELECT * FROM emergency_transfers WHERE id = $1`,
                [transferId]
            );
            const updated = updatedResult.rows[0];

            if (updated.original_driver_confirmed && updated.new_driver_confirmed) {
                // Complete the handoff
                await this.completeHandoff(client, updated);
            }

            await client.query('COMMIT');

            return updated;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to confirm handoff', { transferId, driverId, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Complete handoff - transfer order, pay compensations
     */
    async completeHandoff(client, transfer) {
        // Update transfer status
        await client.query(
            `UPDATE emergency_transfers SET 
        status = 'completed',
        upfront_transferred = TRUE,
        handoff_at = NOW(),
        completed_at = NOW()
       WHERE id = $1`,
            [transfer.id]
        );

        // Update order with new driver
        await client.query(
            `UPDATE orders SET 
        assigned_driver_user_id = $1,
        status = 'in_transit',
        is_emergency_transfer = TRUE
       WHERE id = $2`,
            [transfer.new_driver_id, transfer.order_id]
        );

        // Pay original driver compensation from Takaful fund
        if (transfer.original_driver_compensation > 0) {
            try {
                await this.takafulService.deductFromFund(
                    transfer.original_driver_compensation,
                    `Emergency compensation for transfer #${transfer.id}`
                );

                // Credit original driver
                await client.query(
                    `UPDATE user_balances SET 
            available_balance = available_balance + $1,
            updated_at = NOW()
           WHERE user_id = $2`,
                    [transfer.original_driver_compensation, transfer.original_driver_id]
                );
            } catch (fundError) {
                logger.error('Failed to pay original driver compensation', { error: fundError.message });
            }
        }

        logger.info('Handoff completed', {
            transferId: transfer.id,
            orderId: transfer.order_id,
            originalDriver: transfer.original_driver_id,
            newDriver: transfer.new_driver_id,
            compensation: transfer.original_driver_compensation
        });

        // Notify both drivers
        try {
            const { createNotification } = require('./notificationService');
            await createNotification(
                transfer.original_driver_id,
                transfer.order_id,
                'handoff_complete',
                'Handoff Complete ✅',
                `Order transferred. You received ${transfer.original_driver_compensation} EGP compensation.`
            );
            await createNotification(
                transfer.new_driver_id,
                transfer.order_id,
                'handoff_complete',
                'Order Received ✅',
                'You now have the order. Complete the delivery to earn +20% bonus!'
            );
        } catch (notifyErr) {
            logger.error('Failed to send handoff notifications', { error: notifyErr.message });
        }
    }

    // ============================================
    // Timeout Handling
    // ============================================

    /**
     * Check for timed out transfers and escalate
     * Should be called by a cron job or scheduler
     */
    async checkTimeouts() {
        const result = await this.pool.query(
            `UPDATE emergency_transfers SET 
        status = 'escalated',
        escalated_at = NOW()
       WHERE status = 'pending' AND timeout_at < NOW()
       RETURNING *`
        );

        for (const transfer of result.rows) {
            logger.warn('Emergency transfer escalated due to timeout', {
                transferId: transfer.id,
                orderId: transfer.order_id
            });

            // Notify admin (could implement admin notification here)
        }

        return result.rows;
    }

    // ============================================
    // Get Transfer Details
    // ============================================

    /**
     * Get emergency transfer by ID
     */
    async getTransferById(transferId) {
        const result = await this.pool.query(
            `SELECT et.*, o.title as order_title, o.price as order_price
       FROM emergency_transfers et
       JOIN orders o ON et.order_id = o.id
       WHERE et.id = $1`,
            [transferId]
        );
        return result.rows[0];
    }

    /**
     * Get pending emergency transfers for a driver to see
     */
    async getPendingTransfers(driverId, driverCash, location) {
        const result = await this.pool.query(
            `SELECT et.*, o.title as order_title, o.pickup_address, o.delivery_address
       FROM emergency_transfers et
       JOIN orders o ON et.order_id = o.id
       WHERE et.status = 'pending'
         AND et.timeout_at > NOW()
         AND et.upfront_amount <= $1
         AND et.original_driver_id != $2
       ORDER BY et.created_at ASC`,
            [driverCash, driverId]
        );

        return result.rows;
    }
}

module.exports = { EmergencyTransferService };
