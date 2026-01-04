/**
 * Emergency Transfer API Routes
 * Handles emergency order transfers between drivers
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { EmergencyTransferService } = require('../services/emergencyTransferService');
const { verifyToken } = require('../middleware/auth');
const logger = require('../config/logger');

const emergencyService = new EmergencyTransferService(pool);

// ============================================
// Driver Endpoints
// ============================================

/**
 * POST /api/emergency/trigger
 * Trigger emergency transfer for current order
 */
router.post('/trigger', verifyToken, async (req, res) => {
    try {
        const { orderId, reason, location, distanceTraveled } = req.body;

        if (!orderId) {
            return res.status(400).json({ error: 'Order ID is required' });
        }

        const transfer = await emergencyService.triggerEmergency(
            orderId,
            req.user.id,
            { reason, location, distanceTraveled }
        );

        res.status(201).json({
            message: 'Emergency transfer initiated',
            transfer,
            timeoutMinutes: 30,
            nextSteps: 'Wait at your location. Nearby couriers have been notified.'
        });
    } catch (error) {
        logger.error('Error triggering emergency', { userId: req.user.id, error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/emergency/available
 * Get available emergency transfers for driver
 */
router.get('/available', verifyToken, async (req, res) => {
    try {
        // Get driver's cash
        const driverResult = await pool.query(
            'SELECT available_cash, last_lat, last_lng FROM users WHERE id = $1',
            [req.user.id]
        );
        const driver = driverResult.rows[0];
        const driverCash = parseFloat(driver?.available_cash) || 0;

        const transfers = await emergencyService.getPendingTransfers(
            req.user.id,
            driverCash,
            { lat: driver?.last_lat, lng: driver?.last_lng }
        );

        res.json({
            transfers,
            count: transfers.length,
            yourCash: driverCash
        });
    } catch (error) {
        logger.error('Error getting available transfers', { error: error.message });
        res.status(500).json({ error: 'Failed to get transfers' });
    }
});

/**
 * POST /api/emergency/:id/accept
 * Accept an emergency transfer (FCFS)
 */
router.post('/:id/accept', verifyToken, async (req, res) => {
    try {
        const { location } = req.body;

        const transfer = await emergencyService.acceptTransfer(
            parseInt(req.params.id),
            req.user.id,
            location
        );

        res.json({
            message: 'Transfer accepted! Head to the original driver location.',
            transfer,
            nextSteps: 'Meet the original driver, confirm handoff, then complete the delivery.'
        });
    } catch (error) {
        logger.error('Error accepting transfer', { transferId: req.params.id, error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/emergency/:id/confirm-handoff
 * Confirm package handoff
 */
router.post('/:id/confirm-handoff', verifyToken, async (req, res) => {
    try {
        const { location } = req.body;

        const transfer = await emergencyService.confirmHandoff(
            parseInt(req.params.id),
            req.user.id,
            location
        );

        const isComplete = transfer.original_driver_confirmed && transfer.new_driver_confirmed;

        res.json({
            message: isComplete ? 'Handoff complete!' : 'Confirmation recorded. Waiting for other driver.',
            transfer,
            handoffComplete: isComplete
        });
    } catch (error) {
        logger.error('Error confirming handoff', { transferId: req.params.id, error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/emergency/:id
 * Get transfer details
 */
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const transfer = await emergencyService.getTransferById(parseInt(req.params.id));

        if (!transfer) {
            return res.status(404).json({ error: 'Transfer not found' });
        }

        // Only involved parties can see details
        if (transfer.original_driver_id !== req.user.id &&
            transfer.new_driver_id !== req.user.id &&
            !req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(transfer);
    } catch (error) {
        logger.error('Error getting transfer', { error: error.message });
        res.status(500).json({ error: 'Failed to get transfer' });
    }
});

// ============================================
// Admin Endpoints
// ============================================

/**
 * GET /api/emergency/admin/pending
 * Get all pending/escalated transfers (admin)
 */
router.get('/admin/pending', verifyToken, async (req, res) => {
    try {
        if (!req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const result = await pool.query(
            `SELECT et.*, o.title as order_title, 
              u1.name as original_driver_name,
              u2.name as new_driver_name
       FROM emergency_transfers et
       JOIN orders o ON et.order_id = o.id
       LEFT JOIN users u1 ON et.original_driver_id = u1.id
       LEFT JOIN users u2 ON et.new_driver_id = u2.id
       WHERE et.status IN ('pending', 'escalated', 'accepted')
       ORDER BY et.created_at DESC`
        );

        res.json(result.rows);
    } catch (error) {
        logger.error('Error getting pending transfers', { error: error.message });
        res.status(500).json({ error: 'Failed to get transfers' });
    }
});

/**
 * POST /api/emergency/admin/check-timeouts
 * Manually trigger timeout check (admin)
 */
router.post('/admin/check-timeouts', verifyToken, async (req, res) => {
    try {
        if (!req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const escalated = await emergencyService.checkTimeouts();

        res.json({
            message: `${escalated.length} transfers escalated`,
            escalated
        });
    } catch (error) {
        logger.error('Error checking timeouts', { error: error.message });
        res.status(500).json({ error: 'Failed to check timeouts' });
    }
});

module.exports = router;
