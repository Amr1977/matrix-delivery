import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';

const useMessaging = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_INTERVAL = 3000;

  // WebSocket connection management
  const connectWebSocket = useCallback((token) => {
    if (socket?.readyState === WebSocket.OPEN) return;

    try {
      const wsUrl = process.env.REACT_APP_WS_URL ||
        (window.location.protocol === 'https:' ? 'wss:' : 'ws:') +
        '//' + window.location.host;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setSocket(ws);
        reconnectAttemptsRef.current = 0;

        // Join user's messaging rooms
        if (token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            token: token
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case 'new_message':
              handleNewMessage(data);
              break;
            case 'messages_read':
              handleMessagesRead(data);
              break;
            case 'conversation_updated':
              handleConversationUpdate(data);
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setSocket(null);

        // Attempt to reconnect if not intentionally closed
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket(token);
          }, RECONNECT_INTERVAL);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, [socket]);

  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (socket) {
      socket.close();
      setSocket(null);
    }
    reconnectAttemptsRef.current = 0;
  }, [socket]);

  // Message handlers
  const handleNewMessage = useCallback((data) => {
    const { message } = data;

    // Update messages if it's the current conversation
    if (currentConversation && message.orderId === currentConversation.orderId) {
      setMessages(prev => [...prev, message]);
    }

    // Update conversations list
    setConversations(prev => prev.map(conv =>
      conv.orderId === message.orderId
        ? {
            ...conv,
            unreadCount: conv.unreadCount + (message.recipientId === getCurrentUserId() ? 1 : 0),
            lastMessageAt: message.createdAt,
            lastMessageContent: message.content
          }
        : conv
    ));

    // Update unread count
    setUnreadCount(prev => prev + (message.recipientId === getCurrentUserId() ? 1 : 0));
  }, [currentConversation]);

  const handleMessagesRead = useCallback((data) => {
    const { orderId, userId } = data;

    // Update messages read status
    if (currentConversation && currentConversation.orderId === orderId) {
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
  }, [currentConversation]);

  const handleConversationUpdate = useCallback((data) => {
    // Handle conversation updates (new conversations, etc.)
    fetchConversations();
  }, []);

  // Helper to get current user ID (would be from auth context)
  const getCurrentUserId = () => {
    // This would typically come from auth context
    // For now, return a placeholder
    return 'current-user-id';
  };

  // API methods
  const sendMessage = useCallback(async (orderId, recipientId, content, messageType = 'text') => {
    setLoading(true);
    setError('');

    try {
      const result = await api.sendMessage(orderId, recipientId, content, messageType);

      // Send via WebSocket if connected
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'send_message',
          orderId,
          recipientId,
          content,
          messageType
        }));
      }

      return result.message;
    } catch (err) {
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [socket]);

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

  const fetchOrderMessages = useCallback(async (orderId, page = 1, limit = 50) => {
    setLoading(true);
    setError('');

    try {
      const result = await api.getOrderMessages(orderId, page, limit);
      if (currentConversation && currentConversation.orderId === orderId) {
        setMessages(result.messages);
      }
      return result.messages;
    } catch (err) {
      const errorMessage = err.message || 'Failed to fetch messages';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [currentConversation]);

  const markMessagesRead = useCallback(async (orderId) => {
    try {
      await api.markMessagesRead(orderId);

      // Send via WebSocket if connected
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'mark_messages_read',
          orderId
        }));
      }
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [socket]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await api.getUnreadMessageCount();
      setUnreadCount(result.unreadCount);
      return result.unreadCount;
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
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
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'join_conversation',
        orderId
      }));
    }
  }, [socket]);

  const leaveConversation = useCallback((orderId) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'leave_conversation',
        orderId
      }));
    }
  }, [socket]);

  const selectConversation = useCallback((conversation) => {
    setCurrentConversation(conversation);
    // Mark messages as read when selecting conversation
    if (conversation.unreadCount > 0) {
      markMessagesRead(conversation.orderId);
    }
  }, [markMessagesRead]);

  // Initialize WebSocket connection when token is available
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      connectWebSocket(token);
    }

    return () => {
      disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

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
      connected: socket?.readyState === WebSocket.OPEN,
      connect: connectWebSocket,
      disconnect: disconnectWebSocket
    },
    sendMessage,
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
