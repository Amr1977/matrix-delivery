const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const {
  verifyToken
} = require('../middleware/auth');

/**
 * Routes for cart management
 * Base path: /api/cart
 * All routes require authentication
 */

// Add item to cart
router.post('/items', verifyToken, cartController.addItemToCart);

// Update cart item quantity
router.put('/items/:itemId', verifyToken, cartController.updateCartItem);

// Remove item from cart
router.delete('/items/:itemId', verifyToken, cartController.removeCartItem);

// Get user's cart
router.get('/', verifyToken, cartController.getCart);

// Clear entire cart
router.delete('/', verifyToken, cartController.clearCart);

// Validate cart for checkout
router.get('/validate', verifyToken, cartController.validateCart);

// Check if user can add item from store
router.get('/can-add-from-store/:storeId', verifyToken, cartController.canAddFromStore);

// Get cart statistics
router.get('/stats', verifyToken, cartController.getCartStats);

// Change cart store (clears current cart)
router.post('/change-store', verifyToken, cartController.changeCartStore);

module.exports = router;
