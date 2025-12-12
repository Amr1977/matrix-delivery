import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import usePageVisibility from './usePageVisibility';

const useNotifications = (token, currentUser) => {
  const [notifications, setNotifications] = useState([]);
  const [spokenNotifications, setSpokenNotifications] = useState(new Set());
  const socketRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL;
  const isPageVisible = usePageVisibility();

  // Sound and Text-to-Speech Notifications
  const playNotificationSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  // Extract city from address string
  const extractCityFromAddress = (address) => {
    if (!address) return '';
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 2] || '';
    }
    return '';
  };

  const speakNotification = useCallback((notification) => {
    if ('speechSynthesis' in window) {
      try {
        let message = notification.message;

        // Extract and shorten order numbers to last 3 digits only
        const orderNumberRegex = /order\s+(\w+)/gi;
        message = message.replace(orderNumberRegex, (match, orderNum) => {
          const lastThree = orderNum.replace(/\D/g, '').slice(-3);
          return `order ${lastThree}`;
        });

        const utterance = new SpeechSynthesisUtterance();
        utterance.text = `New notification: ${notification.title}. ${message}`;
        utterance.volume = 0.8;
        utterance.rate = 1;
        utterance.pitch = 0.7;

        // Prefer male voices
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice =>
          voice.name.includes('David') || voice.name.includes('Microsoft David') ||
          voice.name.includes('Alex') || voice.name.includes('James') ||
          voice.name.includes('Daniel') || voice.name.includes('Paul') ||
          (voice.lang.includes('en-US') && !voice.name.toLowerCase().includes('female') && !voice.name.toLowerCase().includes('zira'))
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Could not speak notification:', error);
      }
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        credentials: 'include'
      });
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data);

      // Enhanced notifications with sound and TTS
      const newUnreadCount = data.filter(n => !n.isRead).length;
      const previousUnreadCount = notifications.filter(n => !n.isRead).length;

      if (newUnreadCount > previousUnreadCount && data.length > 0) {
        playNotificationSound();

        const unreadNotifications = data.filter(n => !n.isRead && !spokenNotifications.has(n.id));
        if (unreadNotifications.length > 0) {
          const latestUnspoken = unreadNotifications[0];
          speakNotification(latestUnspoken);
          setSpokenNotifications(prev => new Set(prev.add(latestUnspoken.id)));
        }
      }
    } catch (err) {
      console.error('fetchNotifications error:', err);
    }
  }, [token, API_URL, notifications, spokenNotifications, playNotificationSound, speakNotification]);

  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      const response = await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        console.error(`Failed to mark notification as read: ${response.status} ${response.statusText}`);
        return;
      }

      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('markNotificationRead error:', err);
    }
  }, [token, API_URL]);

  // Real-time notifications via WebSocket
  useEffect(() => {
    if (token && currentUser) {
      const apiUrl = API_URL.replace('/api', '');

      console.log('🔌 Initializing Socket.IO connection to:', apiUrl);

      const socket = io(apiUrl, {
        auth: { token },
        query: { token }, // Also pass as query for better compatibility
        transports: ['polling', 'websocket'], // Try polling first, then upgrade
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        path: '/socket.io/'
      });

      socket.on('connect', () => {
        console.log('✅ Socket.IO connected successfully', {
          socketId: socket.id,
          transport: socket.io.engine.transport.name
        });
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Socket.IO connection error:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type
        });

        // Handle authentication errors
        if (error.message === 'Authentication required' ||
          error.message === 'Token expired' ||
          error.message === 'Invalid token') {
          console.warn('⚠️ Socket.IO authentication failed - token may be invalid or expired');
        }
      });

      socket.on('error', (error) => {
        console.error('❌ Socket.IO error event:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('📡 Socket.IO disconnected:', reason);

        if (reason === 'io server disconnect') {
          // Server disconnected the socket, try to reconnect manually
          console.log('🔄 Server disconnected socket, attempting reconnection...');
          socket.connect();
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`🔄 Socket.IO reconnected after ${attemptNumber} attempts`);
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket.IO reconnection attempt ${attemptNumber}...`);
      });

      socket.on('reconnect_error', (error) => {
        console.error('❌ Socket.IO reconnection error:', error.message);
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ Socket.IO reconnection failed after all attempts');
      });

      // Handle transport upgrade
      socket.io.engine.on('upgrade', (transport) => {
        console.log('⬆️ Socket.IO transport upgraded to:', transport.name);
      });

      socket.on('notification', (notification) => {
        console.log('📡 Real-time notification received:', notification);

        // Add to notifications list
        setNotifications(prev => [notification, ...prev]);

        // Play notification sound
        playNotificationSound();

        // Speak notification (only for new unread ones)
        if (!notification.isRead) {
          speakNotification(notification);
        }
      });

      socketRef.current = socket;

      return () => {
        console.log('🔌 Cleaning up Socket.IO connection');
        socket.disconnect();
      };
    }
  }, [token, currentUser, API_URL, playNotificationSound, speakNotification]);

  // Setup periodic polling
  useEffect(() => {
    if (token) {
      // Initial fetch if visible
      if (isPageVisible) {
        fetchNotifications();
      }

      // Adaptive polling: 60s visible, 5m hidden
      const intervalTime = isPageVisible ? 60000 : 300000;
      const interval = setInterval(() => {
        if (isPageVisible || !document.hidden) {
          fetchNotifications();
        }
      }, intervalTime);

      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications, isPageVisible]);

  return {
    notifications,
    markNotificationRead,
    refetchNotifications: fetchNotifications
  };
};

export default useNotifications;
