import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import io from 'socket.io-client';

const useMessaging = (initialUserId = null) => {
  const [userId, setUserId] = useState(initialUserId);
  const userIdRef = useRef(initialUserId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const socketRef = useRef(null);
  const currentConversationRef = useRef(currentConversation);
  const activeOrderIdRef = useRef(null);

  useEffect(() => {
    currentConversationRef.current = currentConversation;
    if (currentConversation?.orderId) {
      activeOrderIdRef.current = currentConversation.orderId;
    }
  }, [currentConversation]);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000;

  // WebSocket connection management (Socket.IO)
  // Replaced with stable refs to prevent dependency loops
  const connectWebSocket = useCallback(() => {
    if (socketRef.current && socketRef.current.disconnected) {
      socketRef.current.connect();
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  // Helper to get current user ID (using ref for stable closures)
  const getCurrentUserId = useCallback(() => {
    return userIdRef.current;
  }, []);

  // Update userId and Ref if it changes
  useEffect(() => {
    if (initialUserId && initialUserId !== userIdRef.current) {
      setUserId(initialUserId);
      userIdRef.current = initialUserId;
    }
  }, [initialUserId]);

  // API methods (Defined BEFORE handlers to avoid ReferenceError/TDZ)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await api.getUnreadMessageCount();
      setUnreadCount(result.unreadCount);
      return result.unreadCount;
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const fetchConversations = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getConversations(page, limit);
      setConversations(result.conversations);
      return result.conversations;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch conversations';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (orderId, recipientId, content, messageType = 'text') => {
    setLoading(true);
    setError('');

    try {
      const result = await api.sendMessage(orderId, recipientId, content, messageType);
      const message = result.message;

      // Ensure active ref is set
      activeOrderIdRef.current = orderId;

      // Update local state if it's the active chat
      if (message && String(activeOrderIdRef.current) === String(orderId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          const newList = [...prev, message];
          console.log(`✅ Message added optimistically. New count: ${newList.length}`);
          return newList;
        });
      }

      // Send via WebSocket if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          orderId,
          recipientId,
          content,
          messageType
        });
      }

      return message;
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const sendMediaMessage = useCallback(async (orderId, recipientId, mediaData, caption = '') => {
    setLoading(true);
    setError('');

    try {
      const result = await api.sendMediaMessage(orderId, recipientId, mediaData, caption);
      const message = result.message;

      // Ensure active ref is set
      activeOrderIdRef.current = orderId;

      // Update local state if it's the active chat
      if (message && String(activeOrderIdRef.current) === String(orderId)) {
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          const newList = [...prev, message];
          console.log(`✅ Media message added optimistically. New count: ${newList.length}`);
          return newList;
        });
      }

      // Send via WebSocket if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          orderId,
          recipientId,
          content: caption,
          messageType: mediaData.mediaType
        });
      }

      return message;
    } catch (err) {
      const errorMessage = err.message || 'Failed to send media message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOrderMessages = useCallback(async (orderId, page = 1, limit = 50) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getOrderMessages(orderId, page, limit);

      // Reverse messages: Backend is DESC, Frontend expectation is ASC (Chronological)
      const sortedMessages = [...(result.messages || [])].reverse();

      activeOrderIdRef.current = orderId;
      console.log(`📥 Fetched ${sortedMessages.length} messages for order ${orderId}`);
      setMessages(sortedMessages);

      return sortedMessages;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch messages';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const markMessagesRead = useCallback(async (orderId) => {
    try {
      await api.markMessagesRead(orderId);

      // Send via WebSocket if connected
      if (socketRef.current?.connected) {
        socketRef.current.emit('mark_messages_read', { orderId });
      }
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, []);

  const deleteMessage = useCallback(async (messageId) => {
    try {
      await api.deleteMessage(messageId);
      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      const errorMessage = err.message || 'Failed to delete message';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const reportMessage = useCallback(async (messageId, reason) => {
    try {
      await api.reportMessage(messageId, reason);
    } catch (err) {
      const errorMessage = err.message || 'Failed to report message';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const joinConversation = useCallback((orderId) => {
    activeOrderIdRef.current = orderId;
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_order', { orderId });
    }
  }, []);

  const leaveConversation = useCallback((orderId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_order', { orderId });
    }
  }, []);

  const selectConversation = useCallback((conversation) => {
    setCurrentConversation(conversation);
    // Mark messages as read when selecting conversation
    if (conversation.unreadCount > 0) {
      markMessagesRead(conversation.orderId);
    }
  }, [markMessagesRead]);


  // Message handlers - STABLE (using refs)
  // Defined AFTER API methods to avoiding ReferenceError
  const handleNewMessage = useCallback((data) => {
    const { message } = data;
    if (!message) return;

    console.log('📨 Socket: new_message received', {
      id: message.id,
      orderId: message.orderId,
      activeOrder: activeOrderIdRef.current
    });

    // Update messages if it's the current active chat
    if (String(activeOrderIdRef.current) === String(message.orderId)) {
      setMessages(prev => {
        // Prevent duplicate messages in case API and Socket both trigger
        if (prev.some(m => m.id === message.id)) return prev;
        const newList = [...prev, message];
        console.log(`📨 Real-time message added. New count: ${newList.length}`);
        return newList;
      });
    }

    // Update conversations list
    const msgRecipientId = message.recipient?.id || message.recipientId;

    setConversations(prev => prev.map(conv =>
      conv.orderId === message.orderId
        ? {
          ...conv,
          unreadCount: conv.unreadCount + (msgRecipientId === getCurrentUserId() ? 1 : 0),
          lastMessageAt: message.createdAt,
          lastMessageContent: message.content
        }
        : conv
    ));

    // Update unread count
    if (msgRecipientId === getCurrentUserId()) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  const handleMessagesRead = useCallback((data) => {
    const { orderId, userId } = data;
    const currentConv = currentConversationRef.current;

    // Update messages read status
    if (currentConv && currentConv.orderId === orderId) {
      setMessages(prev => prev.map(msg =>
        msg.recipientId === userId ? { ...msg, isRead: true } : msg
      ));
    }

    // Update conversations
    setConversations(prev => prev.map(conv =>
      conv.orderId === orderId
        ? { ...conv, unreadCount: 0 }
        : conv
    ));

    // Recalculate total unread count
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleConversationUpdate = useCallback((data) => {
    // Handle conversation updates (new conversations, etc.)
    fetchConversations();
  }, [fetchConversations]);

  // Initialize WebSocket connection (Running ONCE on mount)
  useEffect(() => {
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
    console.log('🔌 Connecting Chat Socket.IO to:', apiUrl);

    const io = require('socket.io-client');
    const newSocket = io(apiUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'], // Polling + Websocket for reliability
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io/'
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Chat Socket connected');
      // Force update socket state to trigger re-renders
      setSocket(s => ({ ...newSocket, connected: true }));
    });

    // Use stable handlers
    newSocket.on('new_message', handleNewMessage);
    newSocket.on('messages_read', handleMessagesRead);
    newSocket.on('conversation_updated', handleConversationUpdate);

    newSocket.on('disconnect', (reason) => {
      console.log('Chat Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('Chat Socket connection error:', err);
    });

    return () => {
      console.log('🔌 Disconnecting Chat Socket');
      if (socketRef.current) socketRef.current.disconnect();
      socketRef.current = null;
    };
  }, [handleNewMessage, handleMessagesRead, handleConversationUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    error,
    conversations,
    currentConversation,
    messages,
    unreadCount,
    socket: {
      connected: socket?.connected,
      connect: connectWebSocket,
      disconnect: disconnectWebSocket,
      instance: socket // Raw socket instance
    },
    socketInstance: socket, // Direct access for simplicity
    sendMessage,
    sendMediaMessage,
    fetchConversations,
    fetchOrderMessages,
    markMessagesRead,
    fetchUnreadCount,
    deleteMessage,
    reportMessage,
    joinConversation,
    leaveConversation,
    selectConversation,
    setError
  };
};

export default useMessaging;
