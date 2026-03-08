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

// Customer confirms payment
router.post('/:id/confirm-payment', verifyToken, marketplaceOrderController.confirmPayment);

// Admin assigns driver to order
router.post('/:id/assign-driver', verifyToken, marketplaceOrderController.assignDriver);

// Driver picks up order
router.post('/:id/pickup', verifyToken, marketplaceOrderController.pickupOrder);

// Driver delivers order
router.post('/:id/deliver', verifyToken, marketplaceOrderController.deliverOrder);

// Customer confirms receipt
router.post('/:id/confirm-receipt', verifyToken, marketplaceOrderController.confirmReceipt);

// Get vendor statistics (vendor only)
router.get('/vendor/stats', verifyToken, marketplaceOrderController.getVendorStats);

module.exports = router;
