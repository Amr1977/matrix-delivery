const pool = require('../config/db');
const logger = require('../logger');

// Environment is already loaded by server.js or jest.setup.js
// No need to call dotenv.config() here

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

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
      'SELECT customer_id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const order = result.rows[0];
    const participants = [order.customer_id, order.assigned_driver_user_id].filter(Boolean);

    return participants.includes(userId1) && participants.includes(userId2);
  }

  /**
   * Send a message
   */
  async sendMessage(orderId, senderId, recipientId, content, messageType = 'text', mediaData = null) {
    // Validate that users can message each other
    const canMessage = await this.canUsersMessage(orderId, senderId, recipientId);
    if (!canMessage) {
      throw new Error('Users cannot message each other for this order');
    }

    const messageId = this.generateId();
    const sanitizedContent = this.sanitizeContent(content);

    // For media messages, content can be empty
    if (!mediaData && !sanitizedContent.trim()) {
      throw new Error('Message content cannot be empty');
    }

    // Build query based on whether media is included
    let query, values;
    if (mediaData) {
      query = `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type, media_url, media_type, media_size, media_duration, thumbnail_url)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`;
      values = [
        messageId,
        orderId,
        senderId,
        recipientId,
        sanitizedContent || '',
        messageType,
        mediaData.mediaUrl,
        mediaData.mediaType,
        mediaData.mediaSize,
        mediaData.mediaDuration || null,
        mediaData.thumbnailUrl || null
      ];
    } else {
      query = `INSERT INTO messages (id, order_id, sender_id, recipient_id, content, message_type)
               VALUES ($1, $2, $3, $4, $5, $6)`;
      values = [messageId, orderId, senderId, recipientId, sanitizedContent, messageType];
    }

    await pool.query(query, values);

    logger.info('Message sent', {
      messageId: messageId,
      orderId: orderId,
      senderId: senderId,
      recipientId: recipientId,
      messageType: messageType,
      hasMedia: !!mediaData,
      category: 'messaging'
    });

    return {
      id: messageId,
      orderId: orderId,
      senderId: senderId,
      recipientId: recipientId,
      content: sanitizedContent,
      messageType: messageType,
      mediaUrl: mediaData?.mediaUrl || null,
      mediaType: mediaData?.mediaType || null,
      mediaSize: mediaData?.mediaSize || null,
      mediaDuration: mediaData?.mediaDuration || null,
      thumbnailUrl: mediaData?.thumbnailUrl || null,
      isRead: false,
      createdAt: new Date()
    };
  }

  /**
   * Get a single message by ID
   */
  async getMessage(messageId) {
    const result = await pool.query(
      `SELECT
        m.id,
        m.order_id,
        m.sender_id,
        m.recipient_id,
        m.content,
        m.message_type,
        m.media_url,
        m.media_type,
        m.media_size,
        m.media_duration,
        m.thumbnail_url,
        m.is_read,
        m.read_at,
        m.created_at
       FROM messages m
       WHERE m.id = $1`,
      [messageId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const msg = result.rows[0];
    return {
      id: msg.id,
      orderId: msg.order_id,
      senderId: msg.sender_id,
      recipientId: msg.recipient_id,
      content: msg.content,
      messageType: msg.message_type,
      mediaUrl: msg.media_url,
      mediaType: msg.media_type,
      mediaSize: msg.media_size,
      mediaDuration: msg.media_duration,
      thumbnailUrl: msg.thumbnail_url,
      isRead: msg.is_read,
      readAt: msg.read_at,
      createdAt: msg.created_at
    };
  }

  /**
   * Get messages for an order (both directions)
   */
  async getOrderMessages(orderId, userId, page = 1, limit = 50) {
    // Verify user has access to this order
    const orderResult = await pool.query(
      'SELECT customer_id, assigned_driver_user_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderResult.rows[0];
    const participants = [order.customer_id, order.assigned_driver_user_id].filter(Boolean);

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
        m.media_url,
        m.media_type,
        m.media_size,
        m.media_duration,
        m.thumbnail_url,
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
        mediaUrl: msg.media_url,
        mediaType: msg.media_type,
        mediaSize: msg.media_size,
        mediaDuration: msg.media_duration,
        thumbnailUrl: msg.thumbnail_url,
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
       WHERE (o.customer_id = $1 OR o.assigned_driver_user_id = $1)
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
       WHERE (o.customer_id = $1 OR o.assigned_driver_user_id = $1)`,
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
  async markMessagesRead(orderId, userId) {
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
