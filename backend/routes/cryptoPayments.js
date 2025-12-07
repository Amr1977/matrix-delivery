const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const blockchainService = require('../services/blockchainService');

/**
 * GET /api/crypto/tokens
 * Get list of supported tokens
 */
router.get('/tokens', async (req, res) => {
    try {
        const tokens = blockchainService.getSupportedTokens();

        const network = await blockchainService.getNetworkInfo();

        res.json({
            success: true,
            tokens: tokens.map(t => ({
                symbol: t.symbol,
                address: t.address,
                decimals: t.decimals,
                network: network.name
            })),
            network: {
                name: network.name,
                chainId: network.chainId,
                blockNumber: network.blockNumber
            }
        });
    } catch (error) {
        logger.error(`Get tokens failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to get supported tokens' });
    }
});

/**
 * GET /api/crypto/balance/:address/:token
 * Check wallet balance
 */
router.get('/balance/:address/:token', async (req, res) => {
    try {
        const { address, token } = req.params;

        // Validate address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const tokenInfo = blockchainService.getToken(token);
        if (!tokenInfo) {
            return res.status(400).json({ error: 'Token not supported' });
        }

        const tokenContract = blockchainService.getTokenContract(tokenInfo.address);
        const balance = await tokenContract.balanceOf(address);

        res.json({
            success: true,
            address,
            token: token.toUpperCase(),
            balance: require('ethers').formatUnits(balance, tokenInfo.decimals),
            balanceRaw: balance.toString()
        });
    } catch (error) {
        logger.error(`Get balance failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

/**
 * GET /api/crypto/order/:orderId/status
 * Get order blockchain status
 */
router.get('/order/:orderId/status', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        const orderDetails = await blockchainService.getOrderDetails(orderId);

        res.json({
            success: true,
            order: orderDetails
        });
    } catch (error) {
        logger.error(`Get order status failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to get order status' });
    }
});

/**
 * POST /api/crypto/wallet/connect
 * Connect wallet to user account
 */
router.post('/wallet/connect', verifyToken, async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const userId = req.user.userId;

        // Validate address
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        // Check if wallet already connected to another user
        const existingResult = await pool.query(
            'SELECT id, name FROM users WHERE wallet_address = $1 AND id != $2',
            [walletAddress.toLowerCase(), userId]
        );

        if (existingResult.rows.length > 0) {
            return res.status(400).json({
                error: 'Wallet already connected to another account'
            });
        }

        // Update user wallet
        await pool.query(
            `UPDATE users 
       SET wallet_address = $1, 
           wallet_connected_at = NOW(),
           wallet_verified = true
       WHERE id = $2`,
            [walletAddress.toLowerCase(), userId]
        );

        logger.info(`Wallet connected: ${walletAddress} for user ${userId}`);

        res.json({
            success: true,
            message: 'Wallet connected successfully',
            walletAddress: walletAddress.toLowerCase()
        });
    } catch (error) {
        logger.error(`Wallet connect failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to connect wallet' });
    }
});

/**
 * POST /api/crypto/order/:orderId/complete
 * Complete order and release funds (admin/system only)
 */
router.post('/order/:orderId/complete', verifyToken, async (req, res) => {
    try {
        // Verify admin or system
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { orderId } = req.params;

        // Get order from database
        const orderResult = await pool.query(
            'SELECT * FROM orders WHERE id = $1',
            [orderId]
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orderResult.rows[0];

        // Complete on blockchain
        const result = await blockchainService.completeOrder(orderId);

        // Update database
        await pool.query(
            `UPDATE orders 
       SET payment_status = 'completed', 
           blockchain_tx_hash = $1,
           escrow_status = 'completed',
           completed_at = NOW()
       WHERE id = $2`,
            [result.txHash, orderId]
        );

        // Record transaction
        await pool.query(
            `INSERT INTO crypto_transactions 
       (id, order_id, user_id, transaction_type, token_address, token_symbol, amount, tx_hash, block_number, status, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
                uuidv4(),
                orderId,
                order.driver_id,
                'payout',
                order.crypto_token,
                order.crypto_token,
                result.driverAmount,
                result.txHash,
                result.blockNumber,
                'confirmed'
            ]
        );

        logger.info(`Order completed: ${orderId}, TX: ${result.txHash}`);

        res.json({
            success: true,
            txHash: result.txHash,
            blockNumber: result.blockNumber,
            driverAmount: result.driverAmount,
            platformFee: result.platformFee,
            message: 'Order completed and funds released'
        });
    } catch (error) {
        logger.error(`Complete order failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/crypto/order/:orderId/refund
 * Refund order
 */
router.post('/order/:orderId/refund', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Verify ownership or admin
        const orderResult = await pool.query(
            'SELECT * FROM orders WHERE id = $1 AND (customer_id = $2 OR $3 = true)',
            [orderId, req.user.userId, req.user.role === 'admin']
        );

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Order not found or access denied' });
        }

        const order = orderResult.rows[0];

        // Refund on blockchain
        const result = await blockchainService.refundOrder(orderId);

        // Update database
        await pool.query(
            `UPDATE orders 
       SET payment_status = 'refunded',
           blockchain_tx_hash = $1,
           escrow_status = 'refunded'
       WHERE id = $2`,
            [result.txHash, orderId]
        );

        // Record transaction
        await pool.query(
            `INSERT INTO crypto_transactions 
       (id, order_id, user_id, transaction_type, token_address, token_symbol, amount, tx_hash, status, confirmed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
                uuidv4(),
                orderId,
                order.customer_id,
                'refund',
                order.crypto_token,
                order.crypto_token,
                order.crypto_amount,
                result.txHash,
                'confirmed'
            ]
        );

        logger.info(`Order refunded: ${orderId}, TX: ${result.txHash}`);

        res.json({
            success: true,
            txHash: result.txHash,
            message: 'Order refunded successfully'
        });
    } catch (error) {
        logger.error(`Refund order failed: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/crypto/driver/earnings
 * Get driver earnings from blockchain
 */
router.get('/driver/earnings', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get driver wallet address
        const userResult = await pool.query(
            'SELECT wallet_address FROM users WHERE id = $1',
            [userId]
        );

        if (userResult.rows.length === 0 || !userResult.rows[0].wallet_address) {
            return res.status(400).json({ error: 'No wallet connected' });
        }

        const walletAddress = userResult.rows[0].wallet_address;

        // Get earnings from blockchain
        const earnings = await blockchainService.getDriverEarnings(walletAddress);

        // Get transaction history from database
        const txResult = await pool.query(
            `SELECT * FROM crypto_transactions 
       WHERE user_id = $1 AND transaction_type = 'payout' AND status = 'confirmed'
       ORDER BY confirmed_at DESC
       LIMIT 50`,
            [userId]
        );

        res.json({
            success: true,
            totalEarnings: earnings.totalEarnings,
            walletAddress: earnings.address,
            transactions: txResult.rows
        });
    } catch (error) {
        logger.error(`Get driver earnings failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to get earnings' });
    }
});

/**
 * GET /api/crypto/network/info
 * Get blockchain network information
 */
router.get('/network/info', async (req, res) => {
    try {
        const info = await blockchainService.getNetworkInfo();

        res.json({
            success: true,
            network: info
        });
    } catch (error) {
        logger.error(`Get network info failed: ${error.message}`);
        res.status(500).json({ error: 'Failed to get network info' });
    }
});

module.exports = router;
