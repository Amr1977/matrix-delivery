import { useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

const useNotifications = (token, currentUser) => {
  const [notifications, setNotifications] = useState([]);
  const [spokenNotifications, setSpokenNotifications] = useState(new Set());
  const socketRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

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
        headers: { 'Authorization': `Bearer ${token}` }
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
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('markNotificationRead error:', err);
    }
  }, [token, API_URL]);

  // Real-time notifications via WebSocket
  useEffect(() => {
    if (token && currentUser) {
      const apiUrl = API_URL.replace('/api', '');
      const socket = io(apiUrl, {
        auth: { token }
      });

      socket.on('connect', () => {
        console.log('📡 Connected to real-time notifications');
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

      socket.on('disconnect', () => {
        console.log('📡 Disconnected from real-time notifications');
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    }
  }, [token, currentUser, playNotificationSound, speakNotification]);

  // Setup periodic polling
  useEffect(() => {
    if (token) {
      fetchNotifications();
      // Reduced polling interval to 60 seconds since we now have real-time notifications
      const interval = setInterval(() => {
        fetchNotifications();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [token, fetchNotifications]);

  return {
    notifications,
    markNotificationRead,
    refetchNotifications: fetchNotifications
  };
};

export default useNotifications;
