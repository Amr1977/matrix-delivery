const { Pool } = require('pg');
const logger = require('../logger');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class MessagingService {
  /**
   * Generate a unique ID
   */
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sanitize message content
   */
  sanitizeContent(content) {
    if (typeof content !== 'string') return '';
    // Basic sanitization - remove potentially harmful content
    return content.trim().substring(0, 1000).replace(/[<>\"'&]/g, '');
  }

  /**
   * Check if users can message each other for a specific order
   */
  async canUsersMessage(orderId, userId1, userId2) {
    const result = await pool.query(
      'SELECT customer_user_id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const order = result.rows[0];
    const participants = [order.customer_user_id, order.assigned_driver_user_id].filter(Boolean);

    return participants.includes(userId1) && participants.includes(userId2);
  }

  /**
   * Send a message
   */
  async sendMessage(orderId, senderId, recipientId, content, messageType = 'text') {
    // Validate that users can message each other
    const canMessage = await this.canUsersMessage(orderId, senderId, recipientId);
    if (!canMessage) {
      throw new Error('Users cannot message each other for this order');
    }

    const messageId = this.generateId();
    const sanitizedContent = this.sanitizeContent(content);

    if (!sanitizedContent.trim()) {
      throw new Error('Message content cannot be empty');
    }

    await pool.query(
      `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [messageId, orderId, senderId, recipientId, sanitizedContent, messageType]
    );

    logger.info('Message sent', {
      messageId: messageId,
      orderId: orderId,
      senderId: senderId,
      recipientId: recipientId,
      messageType: messageType,
      category: 'messaging'
    });

    return {
      id: messageId,
      orderId: orderId,
      senderId: senderId,
      recipientId: recipientId,
      content: sanitizedContent,
      messageType: messageType,
      isRead: false,
      createdAt: new Date()
    };
  }

  /**
   * Get messages for an order (both directions)
   */
  async getOrderMessages(orderId, userId, page = 1, limit = 50) {
    // Verify user has access to this order
    const orderResult = await pool.query(
      'SELECT customer_user_id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderResult.rows[0];
    const participants = [order.customer_user_id, order.assigned_driver_user_id].filter(Boolean);

    if (!participants.includes(userId)) {
      throw new Error('Access denied to order messages');
    }

    const offset = (page - 1) * limit;

    const messagesResult = await pool.query(
      `SELECT
        m.id,
        m.order_id,
        m.sender_id,
        m.recipient_id,
        m.content,
        m.message_type,
        m.is_read,
        m.read_at,
        m.created_at,
        u_sender.name as sender_name,
        u_recipient.name as recipient_name
       FROM messages m
       JOIN users u_sender ON m.sender_id = u_sender.id
       JOIN users u_recipient ON m.recipient_id = u_recipient.id
       WHERE m.order_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [orderId, limit, offset]
    );

    // Get total count for pagination
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM messages WHERE order_id = $1',
      [orderId]
    );

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      messages: messagesResult.rows.map(msg => ({
        id: msg.id,
        orderId: msg.order_id,
        sender: {
          id: msg.sender_id,
          name: msg.sender_name
        },
        recipient: {
          id: msg.recipient_id,
          name: msg.recipient_name
        },
        content: msg.content,
        messageType: msg.message_type,
        isRead: msg.is_read,
        readAt: msg.read_at,
        createdAt: msg.created_at
      })),
      pagination: {
        page: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages
      }
    };
  }

  /**
   * Get user's conversations (orders with messages)
   */
  async getUserConversations(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const conversationsResult = await pool.query(
      `SELECT DISTINCT
        o.id as order_id,
        o.customer_name,
        o.pickup_address,
        o.delivery_address,
        o.status,
        o.created_at as order_created_at,
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.order_id = o.id AND m.recipient_id = $1 AND m.is_read = false
        ) as unread_count,
        (
          SELECT m.created_at FROM messages m
          WHERE m.order_id = o.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_at,
        (
          SELECT m.content FROM messages m
          WHERE m.order_id = o.id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) as last_message_content
       FROM orders o
       JOIN messages m ON o.id = m.order_id
       WHERE (o.customer_user_id = $1 OR o.assigned_driver_user_id = $1)
       GROUP BY o.id, o.customer_name, o.pickup_address, o.delivery_address, o.status, o.created_at
       ORDER BY last_message_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT o.id) as total
       FROM orders o
       JOIN messages m ON o.id = m.order_id
       WHERE (o.customer_user_id = $1 OR o.assigned_driver_user_id = $1)`,
      [userId]
    );

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      conversations: conversationsResult.rows.map(conv => ({
        orderId: conv.order_id,
        customerName: conv.customer_name,
        pickupAddress: conv.pickup_address,
        deliveryAddress: conv.delivery_address,
        orderStatus: conv.status,
        orderCreatedAt: conv.order_created_at,
        unreadCount: parseInt(conv.unread_count),
        lastMessageAt: conv.last_message_at,
        lastMessageContent: conv.last_message_content
      })),
      pagination: {
        page: page,
        limit: limit,
        totalCount: totalCount,
        totalPages: totalPages
      }
    };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(orderId, userId) {
    const result = await pool.query(
      `UPDATE messages
       SET is_read = true, read_at = CURRENT_TIMESTAMP
       WHERE order_id = $1 AND recipient_id = $2 AND is_read = false
       RETURNING id`,
      [orderId, userId]
    );

    const updatedCount = result.rows.length;

    if (updatedCount > 0) {
      logger.info('Messages marked as read', {
        orderId: orderId,
        userId: userId,
        messageCount: updatedCount,
        category: 'messaging'
      });
    }

    return { updatedCount: updatedCount };
  }

  /**
   * Get unread message count for user
   */
  async getUnreadMessageCount(userId) {
    const result = await pool.query(
      'SELECT COUNT(*) as unread_count FROM messages WHERE recipient_id = $1 AND is_read = false',
      [userId]
    );

    return parseInt(result.rows[0].unread_count);
  }

  /**
   * Delete a message (only by sender, within time limit)
   */
  async deleteMessage(messageId, userId) {
    // Check if user is the sender and message is recent (e.g., within 5 minutes)
    const result = await pool.query(
      `DELETE FROM messages
       WHERE id = $1 AND sender_id = $2 AND created_at > NOW() - INTERVAL '5 minutes'
       RETURNING id`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Message not found or cannot be deleted');
    }

    logger.info('Message deleted', {
      messageId: messageId,
      userId: userId,
      category: 'messaging'
    });

    return { success: true };
  }

  /**
   * Report inappropriate message
   */
  async reportMessage(messageId, reporterId, reason) {
    // For now, just log the report - in production, you'd want to store this
    logger.warn('Message reported', {
      messageId: messageId,
      reporterId: reporterId,
      reason: reason,
      category: 'moderation'
    });

    // You could add a reports table and store this information
    // For MVP, we'll just log it

    return { success: true, message: 'Message reported successfully' };
  }
}

module.exports = new MessagingService();
