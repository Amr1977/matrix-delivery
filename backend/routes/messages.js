const express = require('express');
const messagingService = require('../services/messagingService');
const { verifyToken } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../config/logger');

const router = express.Router();

// Send a message
router.post('/', verifyToken, apiRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.messaging(`Send message request`, {
    ip: clientIP,
    userId: req.user.userId,
    category: 'messaging'
  });

  try {
    const { orderId, recipientId, content, messageType = 'text', mediaData } = req.body;

    if (!orderId || !recipientId) {
      return res.status(400).json({
        error: 'Order ID and recipient ID are required'
      });
    }

    // For text messages, content is required
    if (!mediaData && (!content || content.trim().length === 0)) {
      return res.status(400).json({
        error: 'Message content cannot be empty'
      });
    }

    if (content && content.length > 1000) {
      return res.status(400).json({
        error: 'Message content cannot exceed 1000 characters'
      });
    }

    const message = await messagingService.sendMessage(
      orderId,
      req.user.userId,
      recipientId,
      content || '',
      messageType,
      mediaData
    );

    const duration = Date.now() - startTime;
    logger.performance(`Message sent`, {
      userId: req.user.userId,
      messageId: message.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.status(201).json({
      success: true,
      message: message
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Send message failed: ${error.message}`, {
      error: error.stack,
      ip: clientIP,
      userId: req.user.userId,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message.includes('cannot message each other')) {
      res.status(403).json({
        error: 'You can only message participants of the same order'
      });
    } else if (error.message.includes('Order not found')) {
      res.status(404).json({
        error: 'Order not found'
      });
    } else {
      res.status(500).json({
        error: 'Failed to send message'
      });
    }
  }
});

// Get messages for an order
router.get('/order/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 100); // Max 100 messages per page

    const result = await messagingService.getOrderMessages(
      orderId,
      req.user.userId,
      pageNum,
      limitNum
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error(`Get order messages failed: ${error.message}`, {
      userId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });

    if (error.message.includes('Access denied')) {
      res.status(403).json({
        error: 'Access denied to order messages'
      });
    } else if (error.message.includes('Order not found')) {
      res.status(404).json({
        error: 'Order not found'
      });
    } else {
      res.status(500).json({
        error: 'Failed to get messages'
      });
    }
  }
});

// Get user's conversations
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 50); // Max 50 conversations per page

    const result = await messagingService.getUserConversations(
      req.user.userId,
      pageNum,
      limitNum
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error(`Get conversations failed: ${error.message}`, {
      userId: req.user.userId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to get conversations'
    });
  }
});

// Mark messages as read for an order
router.post('/order/:orderId/read', verifyToken, async (req, res) => {
  const startTime = Date.now();

  try {
    const { orderId } = req.params;

    const result = await messagingService.markMessagesRead(orderId, req.user.userId);

    const duration = Date.now() - startTime;
    logger.performance(`Messages marked as read`, {
      userId: req.user.userId,
      orderId: orderId,
      count: result.updatedCount,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.json({
      success: true,
      updatedCount: result.updatedCount
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Mark messages as read failed: ${error.message}`, {
      userId: req.user.userId,
      orderId: req.params.orderId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to mark messages as read'
    });
  }
});

// Get unread message count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const unreadCount = await messagingService.getUnreadMessageCount(req.user.userId);

    res.json({
      success: true,
      unreadCount: unreadCount
    });

  } catch (error) {
    logger.error(`Get unread count failed: ${error.message}`, {
      userId: req.user.userId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to get unread message count'
    });
  }
});

// Delete a message
router.delete('/:messageId', verifyToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    await messagingService.deleteMessage(messageId, req.user.userId);

    logger.info('Message deleted via API', {
      messageId: messageId,
      userId: req.user.userId,
      category: 'messaging'
    });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    logger.error(`Delete message failed: ${error.message}`, {
      userId: req.user.userId,
      messageId: req.params.messageId,
      category: 'error'
    });

    if (error.message.includes('cannot be deleted')) {
      res.status(403).json({
        error: 'Message cannot be deleted (too old or not your message)'
      });
    } else {
      res.status(404).json({
        error: 'Message not found'
      });
    }
  }
});

// Report a message
router.post('/:messageId/report', verifyToken, apiRateLimit, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Report reason is required'
      });
    }

    const result = await messagingService.reportMessage(messageId, req.user.userId, reason);

    logger.warn('Message reported via API', {
      messageId: messageId,
      userId: req.user.userId,
      reason: reason,
      category: 'moderation'
    });

    res.json(result);

  } catch (error) {
    logger.error(`Report message failed: ${error.message}`, {
      userId: req.user.userId,
      messageId: req.params.messageId,
      category: 'error'
    });

    res.status(500).json({
      error: 'Failed to report message'
    });
  }
});

module.exports = router;
