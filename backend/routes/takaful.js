/**
 * Takaful API Routes
 * Handles courier Takaful summary, claims, and loans
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { TakafulService } = require('../services/takafulService');
const { verifyToken } = require('../middleware/auth');
const logger = require('../config/logger');

const takafulService = new TakafulService(pool);

// ============================================
// Courier Endpoints
// ============================================

/**
 * GET /api/takaful/summary
 * Get courier's Takaful summary (contributions, claims, loans)
 */
router.get('/summary', verifyToken, async (req, res) => {
    try {
        const summary = await takafulService.getCourierSummary(req.user.id);
        res.json(summary);
    } catch (error) {
        logger.error('Error getting Takaful summary', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to get Takaful summary' });
    }
});

/**
 * GET /api/takaful/contributions
 * Get courier's contribution history
 */
router.get('/contributions', verifyToken, async (req, res) => {
    try {
        const contributions = await takafulService.getCourierContributions(req.user.id);
        res.json(contributions);
    } catch (error) {
        logger.error('Error getting contributions', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to get contributions' });
    }
});

/**
 * POST /api/takaful/claims
 * Submit a new claim
 */
router.post('/claims', verifyToken, async (req, res) => {
    try {
        const { claimType, amount, description, evidenceUrls, eventDate, beneficiaryName } = req.body;

        if (!claimType || !amount) {
            return res.status(400).json({ error: 'Claim type and amount are required' });
        }

        const claim = await takafulService.submitClaim({
            courierId: req.user.id,
            claimType,
            amount: parseFloat(amount),
            description,
            evidenceUrls,
            eventDate,
            beneficiaryName
        });

        res.status(201).json({
            message: 'Claim submitted successfully',
            claim,
            estimatedReviewTime: '24 hours'
        });
    } catch (error) {
        logger.error('Error submitting claim', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to submit claim' });
    }
});

/**
 * GET /api/takaful/claims
 * Get courier's claims history
 */
router.get('/claims', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM takaful_claims WHERE courier_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        logger.error('Error getting claims', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to get claims' });
    }
});

/**
 * POST /api/takaful/loans
 * Request a new loan
 */
router.post('/loans', verifyToken, async (req, res) => {
    try {
        const { amount, purpose, loanType } = req.body;

        if (!amount || !purpose) {
            return res.status(400).json({ error: 'Amount and purpose are required' });
        }

        const loan = await takafulService.requestLoan({
            courierId: req.user.id,
            amountEgp: parseFloat(amount),
            purpose,
            loanType: loanType || 'personal'
        });

        res.status(201).json({
            message: 'Loan request submitted',
            loan,
            status: 'pending'
        });
    } catch (error) {
        logger.error('Error requesting loan', { userId: req.user.id, error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/takaful/loans
 * Get courier's loan history
 */
router.get('/loans', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM takaful_loans WHERE courier_id = $1 ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (error) {
        logger.error('Error getting loans', { userId: req.user.id, error: error.message });
        res.status(500).json({ error: 'Failed to get loans' });
    }
});

// ============================================
// Admin Endpoints
// ============================================

/**
 * GET /api/takaful/fund
 * Get Takaful fund balance (admin only)
 */
router.get('/fund', verifyToken, async (req, res) => {
    try {
        // Check admin role
        if (!req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const fundBalance = await takafulService.getFundBalance();
        res.json(fundBalance);
    } catch (error) {
        logger.error('Error getting fund balance', { error: error.message });
        res.status(500).json({ error: 'Failed to get fund balance' });
    }
});

/**
 * POST /api/takaful/claims/:id/approve
 * Approve a claim (admin only)
 */
router.post('/claims/:id/approve', verifyToken, async (req, res) => {
    try {
        if (!req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const result = await takafulService.approveClaim(req.params.id, req.user.id);
        res.json({
            message: 'Claim approved and paid',
            ...result
        });
    } catch (error) {
        logger.error('Error approving claim', { claimId: req.params.id, error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/takaful/claims/:id/reject
 * Reject a claim (admin only)
 */
router.post('/claims/:id/reject', verifyToken, async (req, res) => {
    try {
        if (!req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ error: 'Rejection reason is required' });
        }

        const claim = await takafulService.rejectClaim(req.params.id, req.user.id, reason);
        res.json({
            message: 'Claim rejected',
            claim
        });
    } catch (error) {
        logger.error('Error rejecting claim', { claimId: req.params.id, error: error.message });
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/takaful/gold-price
 * Set daily gold price (admin only)
 */
router.post('/gold-price', verifyToken, async (req, res) => {
    try {
        if (!req.user.roles?.includes('admin')) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { pricePerGram, source } = req.body;
        if (!pricePerGram) {
            return res.status(400).json({ error: 'Price per gram is required' });
        }

        const price = await takafulService.setGoldPrice(parseFloat(pricePerGram), source || 'manual');
        res.json({
            message: 'Gold price updated',
            price
        });
    } catch (error) {
        logger.error('Error setting gold price', { error: error.message });
        res.status(500).json({ error: 'Failed to set gold price' });
    }
});

/**
 * GET /api/takaful/gold-price
 * Get current gold price
 */
router.get('/gold-price', verifyToken, async (req, res) => {
    try {
        const price = await takafulService.getCurrentGoldPrice();
        res.json({ pricePerGram: price, currency: 'EGP', karat: 24 });
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

module.exports = router;
