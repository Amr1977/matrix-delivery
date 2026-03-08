const express = require('express');
const router = express.Router();
const marketplaceOrderController = require('../controllers/marketplaceOrderController');
const {
  verifyToken
} = require('../middleware/auth');

/**
 * Routes for marketplace orders
 * Base path: /api/marketplace/orders
 * All routes require authentication
 */

// Create new order from cart
router.post('/', verifyToken, marketplaceOrderController.createOrder);

// Get user's orders
router.get('/', verifyToken, marketplaceOrderController.getOrders);

// Get specific order
router.get('/:id', verifyToken, marketplaceOrderController.getOrder);

// Update order status (vendor only)
router.patch('/:id/status', verifyToken, marketplaceOrderController.updateOrderStatus);

// Cancel order (customer or vendor)
router.post('/:id/cancel', verifyToken, marketplaceOrderController.cancelOrder);

// Get vendor statistics (vendor only)
router.get('/vendor/stats', verifyToken, marketplaceOrderController.getVendorStats);

module.exports = router;
