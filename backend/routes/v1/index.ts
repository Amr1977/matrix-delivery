/**
 * API v1 Router
 * 
 * Aggregates all v1 API routes
 */

import express from 'express';
import balanceRoutes from './balance';

const router = express.Router();

// Mount balance routes
router.use('/balance', balanceRoutes);

// Health check endpoint for v1 API
router.get('/health', (req, res) => {
    res.json({
        success: true,
        version: 'v1',
        status: 'healthy',
        timestamp: new Date().toISOString()
    });
});

// API version info
router.get('/version', (req, res) => {
    res.json({
        success: true,
        apiVersion: 'v1',
        releaseDate: '2025-12-16',
        features: [
            'Balance Management',
            'Transaction History',
            'Balance Holds (Escrow)',
            'Admin Operations'
        ],
        timestamp: new Date().toISOString()
    });
});

export default router;
