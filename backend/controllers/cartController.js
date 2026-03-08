const cartService = require('../services/cartService');
const logger = require('../config/logger');

/**
 * Add item to cart
 * POST /api/cart/items
 */
const addItemToCart = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { item_id, quantity, store_id } = req.body;

    if (!item_id || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'item_id and quantity are required'
      });
    }

    if (quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be greater than 0'
      });
    }

    const cart = await cartService.addItemToCart(userId, store_id, item_id, quantity);

    logger.info(`Item added to cart: user ${userId}, item ${item_id}, quantity ${quantity}`, {
      userId,
      itemId: item_id,
      quantity,
      category: 'cart'
    });

    res.status(200).json({
      success: true,
      message: 'Item added to cart successfully',
      data: cart
    });
  } catch (error) {
    logger.error('Error adding item to cart:', {
      error: error.message,
      userId: req.user?.userId,
      body: req.body,
      category: 'cart'
    });

    let statusCode = 400;
    if (error.message.includes('not found')) {
      statusCode = 404;
    } else if (error.message.includes('Cannot add items') || error.message.includes('already have items')) {
      statusCode = 409; // Conflict
    } else if (error.message.includes('Insufficient stock')) {
      statusCode = 400; // Bad request
    }

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update cart item quantity
 * PUT /api/cart/items/:itemId
 */
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        error: 'quantity is required'
      });
    }

    const cart = await cartService.updateCartItem(userId, parseInt(itemId), parseInt(quantity));

    logger.info(`Cart item updated: user ${userId}, item ${itemId}, quantity ${quantity}`, {
      userId,
      itemId,
      quantity,
      category: 'cart'
    });

    res.status(200).json({
      success: true,
      message: 'Cart item updated successfully',
      data: cart
    });
  } catch (error) {
    logger.error('Error updating cart item:', {
      error: error.message,
      userId: req.user?.userId,
      itemId: req.params.itemId,
      body: req.body,
      category: 'cart'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Remove item from cart
 * DELETE /api/cart/items/:itemId
 */
const removeCartItem = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const cart = await cartService.removeItemFromCart(userId, parseInt(itemId));

    logger.info(`Cart item removed: user ${userId}, item ${itemId}`, {
      userId,
      itemId,
      category: 'cart'
    });

    res.status(200).json({
      success: true,
      message: 'Item removed from cart successfully',
      data: cart
    });
  } catch (error) {
    logger.error('Error removing cart item:', {
      error: error.message,
      userId: req.user?.userId,
      itemId: req.params.itemId,
      category: 'cart'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get user's cart
 * GET /api/cart
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await cartService.getUserCart(userId);

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'No active cart found',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    logger.error('Error getting cart:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'cart'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Clear entire cart
 * DELETE /api/cart
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await cartService.clearCart(userId);

    logger.info(`Cart cleared: user ${userId}`, {
      userId,
      category: 'cart'
    });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: cart
    });
  } catch (error) {
    logger.error('Error clearing cart:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'cart'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Validate cart for checkout
 * GET /api/cart/validate
 */
const validateCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const validation = await cartService.validateCartForCheckout(userId);

    res.status(200).json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('Error validating cart:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'cart'
    });

    const statusCode = error.message.includes('not found') ? 404 : 400;

    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Check if user can add item from store
 * GET /api/cart/can-add-from-store/:storeId
 */
const canAddFromStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { storeId } = req.params;

    const result = await cartService.canAddItemFromStore(userId, parseInt(storeId));

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error checking if can add from store:', {
      error: error.message,
      userId: req.user?.userId,
      storeId: req.params.storeId,
      category: 'cart'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get cart statistics
 * GET /api/cart/stats
 */
const getCartStats = async (req, res) => {
  try {
    const userId = req.user.userId;

    const stats = await cartService.getCartStats(userId);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting cart stats:', {
      error: error.message,
      userId: req.user?.userId,
      category: 'cart'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Change cart store (clears current cart)
 * POST /api/cart/change-store
 */
const changeCartStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { store_id } = req.body;

    if (!store_id) {
      return res.status(400).json({
        success: false,
        error: 'store_id is required'
      });
    }

    const cart = await cartService.changeCartStore(userId, parseInt(store_id));

    logger.info(`Cart store changed: user ${userId}, new store ${store_id}`, {
      userId,
      storeId: store_id,
      category: 'cart'
    });

    res.status(200).json({
      success: true,
      message: 'Cart store changed successfully',
      data: cart
    });
  } catch (error) {
    logger.error('Error changing cart store:', {
      error: error.message,
      userId: req.user?.userId,
      body: req.body,
      category: 'cart'
    });

    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  addItemToCart,
  updateCartItem,
  removeCartItem,
  getCart,
  clearCart,
  validateCart,
  canAddFromStore,
  getCartStats,
  changeCartStore
};
