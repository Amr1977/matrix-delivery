// ============ COMPONENT IMPORTS ============
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from './i18n/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import AdminPanel from './AdminPanel';
import ErrorBoundary from './ErrorBoundary';
import OrderCreationForm from './components/OrderCreationForm';
import { useMap } from 'react-leaflet';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import ReCAPTCHA from 'react-google-recaptcha';
import logger from './logger';
import './Mobile.css';
import './MatrixTheme.css';



// Location data state and API functions
const DeliveryApp = () => {
   const { t, locale, changeLocale } = useI18n();
  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';






  // Live Tracking Map Component
  const LiveTrackingMap = React.memo(({ order, token }) => {
    const [driverLocation, setDriverLocation] = React.useState(null);
    const [locationHistory, setLocationHistory] = React.useState([]);
    const [isConnected, setIsConnected] = React.useState(false);
    const socketRef = React.useRef(null);
    const mapRef = React.useRef(null);

    React.useEffect(() => {
      const apiUrl = API_URL.replace('/api', '');
      const socket = io(apiUrl);
      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        socket.emit('join_order', { orderId: order._id, token: token });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('location_update', (data) => {
        const newLocation = { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp };
        setDriverLocation(newLocation);
        setLocationHistory(prev => [...prev, newLocation]);
        if (mapRef.current && mapRef.current.setView) {
          mapRef.current.setView([data.latitude, data.longitude], 15);
        }
      });

      let locationInterval;
      if (currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser.id) {
        locationInterval = setInterval(() => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                socket.emit('update_location', {
                  orderId: order._id,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  token: token
                });
              }
            );
          }
        }, 30000);
      }

      return () => {
        socket.emit('leave_order', order._id);
        socket.disconnect();
        if (locationInterval) clearInterval(locationInterval);
      };
    }, [order._id, token]);

    const MapUpdater = () => {
      const map = useMap();
      React.useEffect(() => { mapRef.current = map; }, [map]);
      return null;
    };

    return (
      <div style={{ height: '500px', width: '100%', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1rem' }}>
        <div style={{ background: isConnected ? '#10B981' : '#EF4444', color: 'white', padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>
          {isConnected ? t('tracking.liveTrackingActive') : t('tracking.connecting')}
        </div>
        <MapContainer center={driverLocation ? [driverLocation.lat, driverLocation.lng] : [order.from.lat, order.from.lng]} zoom={13} style={{ height: 'calc(100% - 40px)', width: '100%' }}>
          <MapUpdater />
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[order.from.lat, order.from.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>{t('tracking.pickup')}</strong></Popup></Marker>
          <Marker position={[order.to.lat, order.to.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>{t('tracking.delivery')}</strong></Popup></Marker>
          {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>{t('tracking.driver')}</strong></Popup></Marker>}
          {locationHistory.length > 1 && <Polyline positions={locationHistory.map(loc => [loc.lat, loc.lng])} color="#4F46E5" weight={3} opacity={0.7} />}
        </MapContainer>
      </div>
    );
  });
  // State variables
  const [authState, setAuthState] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewType, setReviewType] = useState('');
  const [reviewStatus, setReviewStatus] = useState(null);
  const [orderReviews, setOrderReviews] = useState([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showUserReviewsModal, setShowUserReviewsModal] = useState(false);
  const [userReviews, setUserReviews] = useState([]);
  const [userReviewsType, setUserReviewsType] = useState('');
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [footerStats, setFooterStats] = useState(null);


// Add viewport meta tag if not present
useEffect(() => {
  let metaTag = document.querySelector('meta[name="viewport"]');
  if (!metaTag) {
    metaTag = document.createElement('meta');
    metaTag.name = 'viewport';
    document.head.appendChild(metaTag);
  }
  metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
}, []);

// Hamburger menu handler
const toggleMobileMenu = () => {
  setShowMobileMenu(!showMobileMenu);
};

// Add effect to close menu when clicking backdrop
useEffect(() => {
  if (showMobileMenu) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }

  return () => {
    document.body.style.overflow = 'unset';
  };
}, [showMobileMenu]);

  // Mobile touch optimization
  const isMobile = () => window.innerWidth <= 768;
  const [mobileView, setMobileView] = useState(isMobile());

  useEffect(() => {
    const handleResize = () => setMobileView(isMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Enhanced location state
  const [locationPermission, setLocationPermission] = useState('unknown'); // 'unknown', 'granted', 'denied', 'prompt'


  // Enhanced UX states
  const [loadingStates, setLoadingStates] = useState({
    userFetch: false,
    ordersFetch: false,
    notificationsFetch: false,
    createOrder: false,
    placeBid: false,
    acceptBid: false,
    pickupOrder: false,
    updateInTransit: false,
    completeOrder: false,
    submitReview: false,
    trackOrder: false
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [spokenNotifications, setSpokenNotifications] = useState(new Set());

  // Driver location functionality
  const [viewType, setViewType] = useState('active'); // 'active', 'bidding', 'history'
  const [driverLocation, setDriverLocation] = useState({ latitude: null, longitude: null, lastUpdated: null });
  const [cityFilter, setCityFilter] = useState(''); // City filter for bidding orders

  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    professionalismRating: 0,
    communicationRating: 0,
    timelinessRating: 0,
    conditionRating: 0
  });

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    vehicle_type: '',
    country: '',
    city: '',
    area: ''
  });

  // Captcha refs
  const registerCaptchaRef = useRef(null);
  const loginCaptchaRef = useRef(null);



  const [bidInput, setBidInput] = useState({});
  const [bidDetails, setBidDetails] = useState({});







  // Effects
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchNotifications();
      // Reduced polling interval to 60 seconds since we now have real-time notifications
      const interval = setInterval(() => {
        fetchOrders();
        fetchNotifications();
      }, 60000); // Changed from 30000 to 60000
      return () => clearInterval(interval);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps



  // Driver location effect
  useEffect(() => {
    if (currentUser?.role === 'driver' && token) {
      getDriverLocation();
      // Update location every 5 minutes for drivers
      const locationInterval = setInterval(() => {
        updateDriverLocation();
      }, 5 * 60 * 1000); // 5 minutes

      return () => clearInterval(locationInterval);
    }
  }, [currentUser, token]); // eslint-disable-line react-hooks/exhaustive-deps

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

      return () => {
        socket.disconnect();
      };
    }
  }, [token, currentUser]);

  // Fetch footer statistics
  useEffect(() => {
    const fetchFooterStats = async () => {
      try {
        const response = await fetch(`${API_URL}/footer/stats`);
        if (response.ok) {
          const data = await response.json();
          setFooterStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch footer stats:', error);
      }
    };

    fetchFooterStats();

    // Refresh stats every 5 minutes
    const interval = setInterval(fetchFooterStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [API_URL]);

  // ============ END OF PART 1 ============
  // Continue with Part 2 for API Functions

  // ============ APP.JS PART 2: API Functions ============
// Add this after Part 1

  // Fetch Functions
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        // Only logout for authentication errors (401/403), not network/server errors
        if (response.status === 401 || response.status === 403) {
          logout();
          return;
        }
        throw new Error(`Failed to fetch user: ${response.status}`);
      }
      const data = await response.json();
      setCurrentUser(data);
      setError('');
      fetchOrders();


    } catch (err) {
      console.error('fetchCurrentUser error:', err);
      // Only show error for network/server issues, don't logout automatically
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError') || err.message.includes('500')) {
        setError('Connection issue: Failed to get user (500). Please try refreshing the page.');
      } else {
        // For other errors, still logout
        logout();
      }
    }
  };



  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('Fetch orders failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err.message);
      // Don't show error to user for failed orders fetch, just log it
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data);

      // Enhanced notifications with sound and TTS
      // Check for new notifications that haven't been spoken yet
      const newUnreadCount = data.filter(n => !n.isRead).length;
      const previousUnreadCount = notifications.filter(n => !n.isRead).length;

      if (newUnreadCount > previousUnreadCount && data.length > 0) {
        // Play notification sound
        playNotificationSound();

        // Get the latest unread notification that hasn't been spoken yet
        const unreadNotifications = data.filter(n => !n.isRead && !spokenNotifications.has(n.id));

        if (unreadNotifications.length > 0) {
          // Speak only the newest unplayed notification to avoid spam
          const latestUnspoken = unreadNotifications[0];
          speakNotification(latestUnspoken);
          setSpokenNotifications(prev => new Set(prev.add(latestUnspoken.id)));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API_URL}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };



  const fetchReviewStatus = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/review-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setReviewStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrderReviews = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setOrderReviews(data);
      setShowReviewsModal(true);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUserReviews = async (orderId, type, bid = null) => {
    try {
      let userId;
      let endpoint;

      if (type === 'view_customer_reviews') {
        // Get customer reviews received
        const order = orders.find(o => o._id === orderId);
        if (order) {
          userId = order.customerId;
          endpoint = `/users/${userId}/reviews/received`;
        }
      } else if (type === 'view_customer_given_reviews') {
        // Get customer reviews given
        const order = orders.find(o => o._id === orderId);
        if (order) {
          userId = order.customerId;
          endpoint = `/users/${userId}/reviews/given`;
        }
      } else if (type === 'view_driver_reviews') {
        // Get driver reviews received
        if (bid && bid.userId) {
          // For pending bids, use the bid's userId
          userId = bid.userId;
          endpoint = `/users/${userId}/reviews/received`;
        } else {
          // For assigned orders, use the assigned driver's userId
          const order = orders.find(o => o._id === orderId);
          if (order && order.assignedDriver) {
            userId = order.assignedDriver.userId;
            endpoint = `/users/${userId}/reviews/received`;
          }
        }
      } else if (type === 'view_driver_given_reviews') {
        // Get driver reviews given
        if (bid && bid.userId) {
          // For pending bids, use the bid's userId
          userId = bid.userId;
          endpoint = `/users/${userId}/reviews/given`;
        } else {
          // For assigned orders, use the assigned driver's userId
          const order = orders.find(o => o._id === orderId);
          if (order && order.assignedDriver) {
            userId = order.assignedDriver.userId;
            endpoint = `/users/${userId}/reviews/given`;
          }
        }
      }

      if (endpoint) {
        const response = await fetch(`${API_URL}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;
        const data = await response.json();
        setUserReviews(data.reviews);
        setUserReviewsType(type);
      }
    } catch (err) {
      console.error('fetchUserReviews error:', err);
    }
  };

  const openReviewModal = async (orderId, type, bid = null) => {
    setReviewOrderId(orderId);
    setReviewType(type);
    setReviewForm({
      rating: 0,
      comment: '',
      professionalismRating: 0,
      communicationRating: 0,
      timelinessRating: 0,
      conditionRating: 0
    });

    // Handle viewing user reviews
    if (type === 'view_customer_reviews' || type === 'view_customer_given_reviews' || type === 'view_driver_reviews' || type === 'view_driver_given_reviews') {
      setShowUserReviewsModal(true);
      await fetchUserReviews(orderId, type, bid);
    } else {
      await fetchReviewStatus(orderId);
      setShowReviewModal(true);
    }
  };

  const handleSubmitReview = async () => {
    if (reviewForm.rating === 0) {
      setError('Please provide an overall rating');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${reviewOrderId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reviewType: reviewType,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          professionalismRating: reviewForm.professionalismRating || null,
          communicationRating: reviewForm.communicationRating || null,
          timelinessRating: reviewForm.timelinessRating || null,
          conditionRating: reviewForm.conditionRating || null
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit review');
      }

      setShowReviewModal(false);
      setError('');
      alert(t('messages.reviewSubmitted'));
      fetchOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, onRate = null) => {
    return (
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => onRate && onRate(star)}
            style={{
              fontSize: '1.5rem',
              cursor: onRate ? 'pointer' : 'default',
              color: star <= rating ? '#FCD34D' : '#D1D5DB'
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Enhanced UX Helper Functions
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000); // Auto-hide after 5 seconds
  };

  const setLoadingState = (key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Sound and Text-to-Speech Notifications
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // Frequency of the beep
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1); // Drop to lower frequency

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  // Extract city from address string
  const extractCityFromAddress = (address) => {
    if (!address) return '';
    // Address format: "personName, street, buildingNumber, floor, apartmentNumber, area, city, country"
    const parts = address.split(',').map(part => part.trim());
    // City is typically the second last part before country
    if (parts.length >= 2) {
      return parts[parts.length - 2] || '';
    }
    return '';
  };

  // Get available cities from bidding orders
  const getAvailableCities = (orders) => {
    const cities = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupCity = extractCityFromAddress(order.pickupAddress);
        const deliveryCity = extractCityFromAddress(order.deliveryAddress);
        if (pickupCity) cities.add(pickupCity);
        if (deliveryCity) cities.add(deliveryCity);
      }
    });
    return Array.from(cities).sort();
  };

  // Filter orders based on driver view type and city filter
  const filterDriverOrders = (orders, viewType, cityFilter = '') => {
    if (currentUser?.role !== 'driver') return orders;

    let filteredOrders;
    switch (viewType) {
      case 'active':
        filteredOrders = orders.filter(order =>
          order.assignedDriver?.userId === currentUser.id &&
          ['accepted', 'picked_up', 'in_transit'].includes(order.status)
        );
        break;
      case 'bidding':
        filteredOrders = orders.filter(order =>
          order.status === 'pending_bids' &&
          !order.assignedDriver
        );
        // Apply city filter for bidding orders
        if (cityFilter) {
          filteredOrders = filteredOrders.filter(order => {
            const pickupCity = extractCityFromAddress(order.pickupAddress);
            const deliveryCity = extractCityFromAddress(order.deliveryAddress);
            return pickupCity === cityFilter || deliveryCity === cityFilter;
          });
        }
        break;
      case 'history':
        filteredOrders = orders.filter(order =>
          order.status === 'delivered' ||
          (order.assignedDriver?.userId === currentUser.id && order.status === 'cancelled')
        );
        break;
      default:
        filteredOrders = orders;
    }

    return filteredOrders;
  };

  // Get title for driver view
const getDriverViewTitle = (viewType) => {
  switch (viewType) {
    case 'active': return t('driver.activeOrders');
    case 'bidding': return t('driver.availableBids');
    case 'history': return t('driver.myHistory');
    default: return t('driver.availableBids');
  }
};

  const speakNotification = (notification) => {
    if ('speechSynthesis' in window) {
      try {
        let message = notification.message;

        // Extract and shorten order numbers to last 3 digits only
        const orderNumberRegex = /order\s+(\w+)/gi;
        message = message.replace(orderNumberRegex, (match, orderNum) => {
          // Extract last 3 digits/numbers from order number
          const lastThree = orderNum.replace(/\D/g, '').slice(-3);
          return `${t('tracking.orderNumber')} ${lastThree}`;
        });

        const utterance = new SpeechSynthesisUtterance();
        utterance.text = `${t('notifications.newNotification')}: ${notification.title}. ${message}`;
        utterance.volume = 0.8;
        utterance.rate = 1;
        utterance.pitch = 0.7; // Lower pitch for deeper, more authoritative male voice

        // Prefer male voices like Morpheus from The Matrix
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice =>
          // Try common male voice names
          voice.name.includes('David') || voice.name.includes('Microsoft David') ||
          voice.name.includes('Alex') || voice.name.includes('James') ||
          voice.name.includes('Daniel') || voice.name.includes('Paul') ||
          voice.name.includes('Mark') || voice.name.includes('George') ||
          voice.name.includes('Michael') || voice.name.includes('Steven') ||
          // Fallback to any male voice available
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
  };

  const countries = ['Egypt', 'Saudi Arabia', 'UAE', 'Jordan', 'Lebanon', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'Yemen', 'Iraq', 'Syria', 'Palestine'];

  // ============ END OF PART 3 ============
  // Continue with Part 4 for Event Handlers

// ============ APP.JS PART 3: Event Handlers ============
// Add this after Part 2

  const handleRegister = async (e) => {
    e.preventDefault();
    logger.user('Registration attempt', { role: authForm.role });

    if (!authForm.name || !authForm.email || !authForm.password || !authForm.phone || !authForm.country || !authForm.city) {
      logger.warn('Registration validation failed: missing required fields');
      setError('All required fields must be filled');
      return;
    }
    if (authForm.role === 'driver' && !authForm.vehicle_type) {
      logger.warn('Registration validation failed: missing vehicle type for driver');
      setError('Vehicle type is required for drivers');
      return;
    }

    const recaptchaToken = process.env.REACT_APP_RECAPTCHA_SITE_KEY ? registerCaptchaRef.current?.getValue() : null;
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      logger.warn('Registration validation failed: missing captcha');
      setError('Please complete the captcha');
      return;
    }

    setLoading(true);
    const startTime = Date.now();

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authForm,
          recaptchaToken
        })
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const data = await response.json();
        logger.error('Registration failed', {
          error: data.error || 'Registration failed',
          duration: `${duration}ms`
        });
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', phone: '', role: 'customer', vehicle_type: '', country: '', city: '', area: '' });
      setError('');

      logger.user('Registration successful', {
        userId: data.user.id,
        role: data.user.role,
        duration: `${duration}ms`
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      setError('Email and password required');
      return;
    }

    const recaptchaToken = process.env.REACT_APP_RECAPTCHA_SITE_KEY ? loginCaptchaRef.current?.getValue() : null;
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      setError('Please complete the captcha');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password,
          recaptchaToken
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser(data.user);
      setAuthForm({ name: '', email: '', password: '', phone: '', role: 'customer', vehicle_type: '' });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setNotifications([]);
    setAuthState('login');
    setError('');
  };

  // Add effect to close menu when clicking backdrop
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  const handlePublishOrder = useCallback(async (orderData) => { // eslint-disable-line react-hooks/exhaustive-deps
    // Simplified validation for structured addresses
    const requiredFieldsError = [];
    if (!orderData.title) requiredFieldsError.push('Order title');
    if (!orderData.price) requiredFieldsError.push('Price');

    // Check pickup location
    if (!orderData.pickup_country || !orderData.pickup_city || !orderData.pickup_personName) {
      requiredFieldsError.push('Pickup location (country, city, contact name)');
    }

    // Check dropoff location
    if (!orderData.dropoff_country || !orderData.dropoff_city || !orderData.dropoff_personName) {
      requiredFieldsError.push('Delivery location (country, city, contact name)');
    }

    if (requiredFieldsError.length > 0) {
      setError(`Please fill all required fields: ${requiredFieldsError.join(', ')}`);
      return;
    }

    setLoadingState('createOrder', true);
    setError('');

    try {
      // Build the new structured order data
      const newOrder = {
        title: orderData.title,
        description: orderData.description,
        // New structured location data for pickup
        pickupLocation: {
          coordinates: { lat: 40.7128, lng: -74.0060 }, // Default coordinates
          address: {
            country: orderData.pickup_country,
            city: orderData.pickup_city,
            area: orderData.pickup_area,
            street: orderData.pickup_street,
            buildingNumber: orderData.pickup_building || '',
            floor: orderData.pickup_floor || '',
            apartmentNumber: orderData.pickup_apartment || '',
            personName: orderData.pickup_personName
          }
        },
        // New structured location data for dropoff
        dropoffLocation: {
          coordinates: { lat: 40.7128, lng: -74.0060 }, // Default coordinates
          address: {
            country: orderData.dropoff_country,
            city: orderData.dropoff_city,
            area: orderData.dropoff_area,
            street: orderData.dropoff_street,
            buildingNumber: orderData.dropoff_building || '',
            floor: orderData.dropoff_floor || '',
            apartmentNumber: orderData.dropoff_apartment || '',
            personName: orderData.dropoff_personName
          }
        },
        package_description: orderData.package_description,
        package_weight: orderData.package_weight ? parseFloat(orderData.package_weight) : null,
        estimated_value: orderData.estimated_value ? parseFloat(orderData.estimated_value) : null,
        special_instructions: orderData.special_instructions,
        estimated_delivery_date: orderData.estimated_delivery_date || null,
        price: parseFloat(orderData.price)
      };

      const response = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOrder)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to publish order');
      }

      setShowOrderForm(false);
      // Add a small delay to ensure database consistency
      setTimeout(() => {
        fetchOrders();
      }, 500);
      showSuccess('Order published successfully! Waiting for drivers in your area.');
    } catch (err) {
      let errorMessage = 'Failed to publish order';
      if (err.message.includes('Service Unavailable')) {
        errorMessage = 'Server is temporarily unavailable. Please try again in a moment.';
      } else if (err.message.includes('Network')) {
        errorMessage = 'Network connection error. Please check your connection and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);

      // Retry mechanism for failed requests
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          handlePublishOrder(orderData);
        }, 2000);
      }
    } finally {
      setLoadingState('createOrder', false);
    }
  }, [token, retryCount]);

  const handleBidOnOrder = async (orderId) => {
    const bidPrice = bidInput[orderId];
    if (!bidPrice || parseFloat(bidPrice) <= 0) {
      setError('Enter a valid bid price');
      return;
    }

    setLoadingState('placeBid', true);
    setError('');

    try {
      const bidData = {
        bidPrice: parseFloat(bidPrice),
        estimatedPickupTime: bidDetails[orderId]?.pickupTime || null,
        estimatedDeliveryTime: bidDetails[orderId]?.deliveryTime || null,
        message: bidDetails[orderId]?.message || null
      };

      const response = await fetch(`${API_URL}/orders/${orderId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bidData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to place bid');
      }

      fetchOrders();
      setBidInput({ ...bidInput, [orderId]: '' });
      setBidDetails({ ...bidDetails, [orderId]: {} });
      showSuccess('Bid placed successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('placeBid', false);
    }
  };

  const handleAcceptBid = async (orderId, userId) => {
    setLoadingState('acceptBid', true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/accept-bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept bid');
      }

      fetchOrders();
      showSuccess('Bid accepted successfully! Driver notified.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('acceptBid', false);
    }
  };

  const handlePickupOrder = async (orderId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/pickup`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to mark as picked up');

      fetchOrders();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInTransit = async (orderId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/in-transit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to mark as in transit');

      fetchOrders();
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteOrder = async (orderId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to complete order');

      fetchOrders();
      setSelectedOrder(null);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Driver location functions
  const updateDriverLocation = async () => {
    if (currentUser?.role !== 'driver') return;

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            const response = await fetch(`${API_URL}/drivers/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ latitude, longitude })
            });

            if (!response.ok) throw new Error('Failed to update location');

            setDriverLocation({
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude),
              lastUpdated: new Date()
            });
            setLocationPermission('granted');
            fetchOrders(); // Refresh orders with new distance calculations
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLocationPermission('denied');
            setError('Location access denied. Please enable location services.');
          }
        );
      } else {
        setError('Geolocation is not supported by this browser.');
      }
    } catch (err) {
      console.error('Update location error:', err);
      setError('Failed to update location');
    }
  };

  const getDriverLocation = async () => {
    try {
      const response = await fetch(`${API_URL}/drivers/location`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to get location');
      const data = await response.json();
      setDriverLocation(data.location || { latitude: null, longitude: null, lastUpdated: null });
    } catch (err) {
      console.error('Get location error:', err);
    }
  };



  const getStatusLabel = (status) => {
    const statusKeyMap = {
      'pending_bids': 'status.pendingBids',
      'accepted': 'status.accepted',
      'picked_up': 'status.pickedUp',
      'in_transit': 'status.inTransit',
      'delivered': 'status.delivered',
      'cancelled': 'status.cancelled'
    };
    const translationKey = statusKeyMap[status];
    return translationKey ? t(translationKey) : status;
  };

// ============ END OF PART 3 ============
// Continue with Part 4 for Authentication UI

// ============ APP.JS PART 4: Authentication UI ============
// Add this after Part 3

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card-matrix" style={{ borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0, 48, 0, 0.2), inset 0 0 20px rgba(48, 255, 48, 0.1)', padding: '2rem', maxWidth: '28rem', width: '100%', background: 'linear-gradient(135deg, #000000 0%, #111111 100%)' }}>
            <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1.5rem' }}>📦</div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#30FF30', marginBottom: '0.5rem', textAlign: 'center', textShadow: '0 0 10px #30FF30' }}>{t('common.appName')}</h1>
            <p style={{ color: '#22BB22', marginBottom: '1.5rem', textAlign: 'center' }}>{t('common.subtitle')}</p>

            {error && (
              <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #FEE2E2' }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {authState === 'login' ? (
                <>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>{t('auth.signIn')}</h2>
                  <input
                    type="email"
                    placeholder={t('auth.email')}
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.password')}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                      <ReCAPTCHA
                        ref={loginCaptchaRef}
                        sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                      />
                    </div>
                  )}
                  <button
                    onClick={handleLogin}
                    disabled={loading}
                    style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                  >
                    {loading ? t('auth.loading') : t('auth.login')}
                  </button>
                  <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                    {t('auth.dontHaveAccount')}{' '}
                    <button
                      onClick={() => { setAuthState('register'); setError(''); }}
                      style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {t('auth.signUp')}
                    </button>
                  </p>
                </>
              ) : (
                <>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>{t('auth.createAccount')}</h2>
                  <input
                    type="text"
                    placeholder={t('auth.fullName')}
                    value={authForm.name}
                    onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  <input
                    type="email"
                    placeholder={t('auth.email')}
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  <input
                    type="tel"
                    placeholder={t('auth.phoneNumber')}
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.password')}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  <select
                    value={authForm.role}
                    onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  >
                    <option value="customer">{t('auth.customer')}</option>
                    <option value="driver">{t('auth.driver')}</option>
                  </select>
                  {authForm.role === 'driver' && (
                    <select
                      value={authForm.vehicle_type}
                      onChange={(e) => setAuthForm({ ...authForm, vehicle_type: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                    >
                      <option value="">{t('auth.selectVehicleType')}</option>
                      <option value="bike">{t('auth.bike')}</option>
                      <option value="car">{t('auth.car')}</option>
                      <option value="van">{t('auth.van')}</option>
                      <option value="truck">{t('auth.truck')}</option>
                    </select>
                  )}

                  {/* Location Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <select
                      value={authForm.country}
                      onChange={(e) => setAuthForm({ ...authForm, country: e.target.value, city: '', area: '' })}
                      style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                    >
                      <option value="">{t('orders.selectCountry')}</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder={t('orders.city')}
                      value={authForm.city}
                      onChange={(e) => setAuthForm({ ...authForm, city: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder={t('orders.area')}
                    value={authForm.area}
                    onChange={(e) => setAuthForm({ ...authForm, area: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  />
                  {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                      <ReCAPTCHA
                        ref={registerCaptchaRef}
                        sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                      />
                    </div>
                  )}
                  <button
                    onClick={handleRegister}
                    disabled={loading}
                    style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                  >
                    {loading ? t('auth.loading') : t('auth.register')}
                  </button>
                  <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                    {t('auth.alreadyHaveAccount')}{' '}
                    <button
                      onClick={() => { setAuthState('login'); setError(''); }}
                      style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      {t('auth.signIn')}
                    </button>
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Version Footer */}

        {showLiveTracking && selectedOrder && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Live Tracking - {selectedOrder.orderNumber}</h2>
                <button onClick={() => setShowLiveTracking(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <LiveTrackingMap order={selectedOrder} token={token} />
                <button onClick={() => setShowLiveTracking(false)} style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: '#F3F4F6', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>{t('common.close')}</button>
              </div>
            </div>
          </div>
        )}

      <footer style={{
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.75rem',
          color: '#6B7280',
          borderTop: '1px solid #E5E7EB',
          background: '#F9FAFB'
        }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
            <p style={{ margin: 0 }}>
              Matrix Delivery v1.0.0 | Commit: 0cc5c8d | {new Date().toLocaleDateString()}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

// ============ END OF PART 4 ============
// Continue with Part 5 for Main App UI (FINAL)

// ============ APP.JS PART 5A: Main UI - Header & Modals ============
// Add this after Part 4 (continues the return statement)

    return (
      <div style={{ minHeight: '100vh', background: '#090909' }}>
        <header className="glow">
          <div className="header-content">
            {/* Logo */}
            <div className="header-logo">
              <span className="pulse">📦</span>
              <h1>{t('common.appName')}</h1>
            </div>

            {/* Desktop Actions - Hidden on Mobile */}
            <div className="header-actions">
              <LanguageSwitcher locale={locale} changeLocale={changeLocale} />

              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`notification-bell ${unreadCount > 0 ? 'bell-notification' : ''}`}
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => setShowAdminPanel(!showAdminPanel)}
                  style={{
                    background: showAdminPanel ? '#DC2626' : '#7C3AED',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  ⚙️ {showAdminPanel ? 'Close Admin' : 'Admin Panel'}
                </button>
              )}

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <p style={{ fontWeight: '600', color: 'var(--matrix-bright-green)' }}>{currentUser?.name}</p>
                  {currentUser?.isVerified && (
                    <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                      ✓ Verified
                    </span>
                  )}
                  {!currentUser?.isVerified && (
                    <button
                      onClick={() => {
                        const message = `Hello, I would like to verify my account. My user ID is: ${currentUser?.id}`;
                        const whatsappUrl = `https://wa.me/${process.env.REACT_APP_WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(message)}`;
                        window.open(whatsappUrl, '_blank');
                        // Show message to refresh after verification
                        setTimeout(() => {
                          alert('After admin verifies your account, please refresh this page to see the verification badge.');
                        }, 1000);
                      }}
                      style={{ background: '#25D366', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Contact admin to verify account"
                    >
                      📱 Verify
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)', textTransform: 'capitalize' }}>
                  {currentUser?.role} {currentUser?.completedDeliveries > 0 && `• ${currentUser.completedDeliveries} deliveries`}
                </p>
              </div>

              <button onClick={logout} className="btn-danger">
                {t('auth.logout')}
              </button>
            </div>

            {/* Hamburger Menu Button - Mobile Only */}
            <button
              className={`hamburger-btn ${showMobileMenu ? 'open' : ''}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>

          {/* Desktop Notification Panel */}
          {showNotifications && (
            <div className="notification-panel">
              <div style={{ padding: 'var(--spacing-md)', borderBottom: '2px solid var(--matrix-border)' }}>
                <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--matrix-bright-green)' }}>Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <p style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--matrix-green)' }}>No notifications</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationRead(notif.id)}
                    className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                  >
                    <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem', color: 'var(--matrix-bright-green)' }}>{notif.title}</p>
                    <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)' }}>{notif.message}</p>
                    <p style={{ fontSize: '0.75rem', color: 'rgba(0, 255, 0, 0.6)', marginTop: '0.25rem' }}>
                      {new Date(notif.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Mobile Menu */}
          <>
            <div
              className={`mobile-menu-backdrop ${showMobileMenu ? 'open' : ''}`}
              onClick={toggleMobileMenu}
            />
            <nav className={`mobile-menu ${showMobileMenu ? 'open' : ''}`}>
              <div className="mobile-menu-items">
                {/* User Info Section */}
                <div className="mobile-menu-section">
                  <div className="mobile-user-info">
                    <div className="mobile-user-name">
                      {currentUser?.name}
                      {currentUser?.isVerified && (
                        <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                          ✓ Verified
                        </span>
                      )}
                    </div>
                    <div className="mobile-user-role">
                      {currentUser?.role}
                      {currentUser?.completedDeliveries > 0 && ` • ${currentUser.completedDeliveries} deliveries`}
                    </div>
                  </div>
                </div>

                {/* Language Selector */}
                <div className="mobile-menu-section">
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--matrix-bright-green)', marginBottom: 'var(--spacing-sm)' }}>
                    Language
                  </h4>
                  <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
                </div>

                {/* Notifications */}
                <div className="mobile-menu-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--matrix-bright-green)' }}>
                      Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span className="notification-badge">{unreadCount}</span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)' }}>No notifications</p>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {notifications.slice(0, 5).map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => {
                            markNotificationRead(notif.id);
                            setShowMobileMenu(false);
                          }}
                          className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                          style={{ padding: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}
                        >
                          <p style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--matrix-bright-green)' }}>{notif.title}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--matrix-green)' }}>{notif.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Logout Button */}
                <div className="mobile-menu-section">
                  <button
                    onClick={() => {
                      logout();
                      setShowMobileMenu(false);
                    }}
                    className="btn-danger"
                    style={{ width: '100%' }}
                  >
                    {t('auth.logout')}
                  </button>
                </div>
              </div>
            </nav>
          </>
        </header>
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '2rem 1rem' }}>
        {error && (
          <div className="error-matrix" style={{ padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Consolas, Monaco, monospace' }}>
            <span style={{ textShadow: '0 0 5px #FF3030' }}>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#FF3030' }}>×</button>
          </div>
        )}

        {successMessage && (
          <div className="success-message" style={{ background: 'linear-gradient(135deg, #003300 0%, #001100 100%)', color: '#30FF30', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #30FF30', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Consolas, Monaco, monospace', textShadow: '0 0 5px #30FF30' }}>
            <span>✅ {successMessage}</span>
            <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#30FF30' }}>×</button>
          </div>
        )}

        {(currentUser?.role === 'customer' || currentUser?.role === 'admin') && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={loading}
              className="btn-primary"
            >
              📦 {showOrderForm ? t('common.cancel') : t('orders.createOrder')}
            </button>
          </div>
        )}

        {currentUser?.role === 'driver' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              <button
                onClick={updateDriverLocation}
                disabled={loading}
                style={{
                  background: locationPermission === 'granted' ? '#10B981' : '#4F46E5',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📍 {loading ? t('common.updating') : locationPermission === 'granted' ? t('driver.locationUpdated') : t('driver.updateLocation')}
              </button>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                {locationPermission === 'granted' && driverLocation.latitude ? (
                  <span>📍 Lat: {driverLocation.latitude.toFixed(4)}, Lng: {driverLocation.longitude.toFixed(4)}</span>
                ) : locationPermission === 'denied' ? (
                  <span style={{ color: '#DC2626' }}>❌ Location access denied</span>
                ) : (
                  <span>⚠️ Enable location for better order visibility</span>
                )}
              </div>
            </div>

            <div className="driver-tabs" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setViewType('active')}
                style={{
                  padding: '0.5rem 1rem',
                  background: viewType === 'active' ? '#4F46E5' : '#F3F4F6',
                  color: viewType === 'active' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '0.375rem 0 0 0.375rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {t('driver.activeOrders')}
              </button>
              <button
                onClick={() => setViewType('bidding')}
                style={{
                  padding: '0.5rem 1rem',
                  background: viewType === 'bidding' ? '#4F46E5' : '#F3F4F6',
                  color: viewType === 'bidding' ? 'white' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {t('driver.availableBids')}
              </button>
              <button
                onClick={() => setViewType('history')}
                style={{
                  padding: '0.5rem 1rem',
                  background: viewType === 'history' ? '#4F46E5' : '#F3F4F6',
                  color: viewType === 'history' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '0 0.375rem 0.375rem 0',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                {t('driver.myHistory')}
              </button>
            </div>
          </div>
        )}



        {showOrderForm && (
          <OrderCreationForm
            onSubmit={handlePublishOrder}
            countries={countries}
            t={t}
          />
        )}



        {showReviewModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{t('reviews.submitReview')}</h2>
                <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{t('reviews.overallRating')} *</label>
                  <div style={{ marginBottom: '1rem' }}>
                    {renderStars(reviewForm.rating, (rating) => setReviewForm({ ...reviewForm, rating: rating }))}
                  </div>
                </div>

                {reviewType === 'customer_to_driver' && (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{t('reviews.professionalism')}</label>
                      {renderStars(reviewForm.professionalismRating, (rating) => setReviewForm({ ...reviewForm, professionalismRating: rating }))}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{t('reviews.communication')}</label>
                      {renderStars(reviewForm.communicationRating, (rating) => setReviewForm({ ...reviewForm, communicationRating: rating }))}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{t('reviews.timeliness')}</label>
                      {renderStars(reviewForm.timelinessRating, (rating) => setReviewForm({ ...reviewForm, timelinessRating: rating }))}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{t('reviews.packageCondition')}</label>
                      {renderStars(reviewForm.conditionRating, (rating) => setReviewForm({ ...reviewForm, conditionRating: rating }))}
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{t('reviews.commentOptional')}</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder={t('reviews.shareExperience')}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '100px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={loading || reviewForm.rating === 0}
                    style={{ flex: 1, padding: '0.75rem', background: '#4F46E5', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: reviewForm.rating === 0 || loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: reviewForm.rating === 0 || loading ? 0.5 : 1 }}
                  >
                    {loading ? t('reviews.submitting') : t('reviews.submitReview')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReviewsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{t('reviews.orderReviews')}</h2>
                <button onClick={() => setShowReviewsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {orderReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
                    <p>{t('reviews.noReviewsYet')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {orderReviews.map((review, idx) => (
                      <div key={idx} style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem', background: '#F9FAFB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            <p style={{ fontWeight: '600', color: '#1F2937' }}>{review.reviewerName}</p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>{review.reviewerRole}</p>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {renderStars(review.rating)}
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                            Review Type: {review.reviewType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          {review.revieweeName && (
                            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                              Reviewing: {review.revieweeName}
                            </p>
                          )}
                        </div>

                        {review.professionalismRating && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Professionalism</p>
                              {renderStars(review.professionalismRating)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Communication</p>
                              {renderStars(review.communicationRating)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Timeliness</p>
                              {renderStars(review.timelinessRating)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Condition</p>
                              {renderStars(review.conditionRating)}
                            </div>
                          </div>
                        )}

                        {review.comment && (
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
                            <p style={{ fontStyle: 'italic', color: '#374151' }}>"{review.comment}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showUserReviewsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                  {userReviewsType === 'view_customer_reviews' && 'Customer Reviews Received'}
                  {userReviewsType === 'view_customer_given_reviews' && 'Customer Reviews Given'}
                  {userReviewsType === 'view_driver_reviews' && 'Driver Reviews Received'}
                  {userReviewsType === 'view_driver_given_reviews' && 'Driver Reviews Given'}
                </h2>
                <button onClick={() => setShowUserReviewsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {userReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
                    <p>No reviews found</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {userReviews.map((review, idx) => (
                      <div key={idx} style={{ border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem', background: '#F9FAFB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                          <div>
                            <p style={{ fontWeight: '600', color: '#1F2937' }}>
                              {userReviewsType.includes('given') ? review.revieweeName : review.reviewerName}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', textTransform: 'capitalize' }}>
                              {userReviewsType.includes('given') ? review.revieweeRole : review.reviewerRole}
                            </p>
                            {review.orderTitle && (
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                Order: {review.orderTitle} ({review.orderNumber})
                              </p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {renderStars(review.rating)}
                            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                            Review Type: {review.reviewType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>

                        {review.professionalismRating && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Professionalism</p>
                              {renderStars(review.professionalismRating)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Communication</p>
                              {renderStars(review.communicationRating)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Timeliness</p>
                              {renderStars(review.timelinessRating)}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Condition</p>
                              {renderStars(review.conditionRating)}
                            </div>
                          </div>
                        )}

                        {review.comment && (
                          <div style={{ background: 'white', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
                            <p style={{ fontStyle: 'italic', color: '#374151' }}>"{review.comment}"</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {currentUser?.role === 'customer' ? t('orders.myOrders') : getDriverViewTitle(viewType)}
        </h2>

        {currentUser?.role === 'driver' && viewType === 'bidding' && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                {t('driver.filterByCity')}:
              </label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  background: 'white',
                  minWidth: '200px'
                }}
              >
                <option value="">{t('driver.allCities')}</option>
                {getAvailableCities(orders).map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              {cityFilter && (
                <button
                  onClick={() => setCityFilter('')}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#6B7280',
                    color: 'white',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}
                >
                  {t('orders.clearFilter')}
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(() => {
            const filteredOrders = currentUser?.role === 'driver' ? filterDriverOrders(orders, viewType, cityFilter) : orders;
            return filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</p>
                <p style={{ color: '#6B7280' }}>
                  {currentUser?.role === 'driver'
                    ? viewType === 'active' ? t('driver.noActiveOrders')
                      : viewType === 'bidding' ? t('orders.noAvailableBids')
                      : t('orders.noOrderHistory')
                    : t('orders.noOrdersAvailable')
                  }
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

                return (
                  <div key={order._id} className="order-card" style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{order.title}</h3>
                        {order.orderNumber && (
                          <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order #{order.orderNumber}</p>
                        )}
                      </div>
                      <span className={`status-badge status-${order.status}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    {order.description && (
                      <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>{order.description}</p>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', padding: '1rem', background: '#F9FAFB', borderRadius: '0.375rem' }}>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📤 Pickup</p>
                        <p style={{ fontSize: '0.875rem' }}>{order.pickupAddress || order.from?.name}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📥 Delivery</p>
                        <p style={{ fontSize: '0.875rem' }}>{order.deliveryAddress || order.to?.name}</p>
                      </div>
                      {order.packageDescription && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📦 {t('orders.package')}</p>
                          <p style={{ fontSize: '0.875rem' }}>{order.packageDescription}</p>
                        </div>
                      )}
                      {order.packageWeight && (
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>⚖️ Weight</p>
                          <p style={{ fontSize: '0.875rem' }}>{order.packageWeight} kg</p>
                        </div>
                      )}
                      {order.estimatedValue && (
                        <div>
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>💰 Value</p>
                          <p style={{ fontSize: '0.875rem' }}>${parseFloat(order.estimatedValue).toFixed(2)}</p>
                        </div>
                      )}
                      {order.specialInstructions && (
                        <div style={{ gridColumn: '1 / -1' }}>
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📝 Instructions</p>
                          <p style={{ fontSize: '0.875rem' }}>{order.specialInstructions}</p>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4F46E5' }}>
                        ${parseFloat(order.price).toFixed(2)}
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {order.status === 'delivered' && (
                          <>
                            {currentUser?.role === 'customer' && !reviewStatus?.reviews.toDriver && (
                              <button
                                onClick={() => openReviewModal(order._id, 'customer_to_driver')}
                                style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                              >
                                ⭐ {t('reviews.reviewDriver')}
                              </button>
                            )}
                            {currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser?.id && !reviewStatus?.reviews.toCustomer && (
                              <button
                                onClick={() => openReviewModal(order._id, 'driver_to_customer')}
                                style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                              >
                                ⭐ {t('reviews.reviewCustomer')}
                              </button>
                            )}
                            {!reviewStatus?.reviews.toPlatform && (
                              <button
                                onClick={() => openReviewModal(order._id, `${currentUser?.role}_to_platform`)}
                                style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                              >
                                🌟 {t('reviews.reviewPlatform')}
                              </button>
                            )}
                            <button
                              onClick={() => fetchOrderReviews(order._id)}
                              style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                            >
                              📝 {t('orders.viewReviews')}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { setSelectedOrder(order); setShowLiveTracking(true); }}
                          style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                        >
                          🗺️ {t('orders.trackOrder')}
                        </button>
                      </div>
                    </div>

                    {order.status === 'pending_bids' && currentUser?.role === 'driver' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        {/* Customer Reputation Section */}
                        <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #DBEAFE' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1E40AF' }}>
                              👤 Customer Reputation
                            </h4>
                            {order.customerIsVerified && (
                              <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                                ✓ Verified
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Rating</p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {renderStars(order.customerRating || 0)}
                                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                                  {order.customerRating ? order.customerRating.toFixed(1) : 'New'}
                                </span>
                              </div>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Deliveries</p>
                              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                                {order.customerCompletedOrders || 0}
                              </p>
                            </div>
                            <div>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Reviews</p>
                              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                                {order.customerReviewCount || 0}
                              </p>
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Member Since</p>
                              <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                {order.customerJoinedAt ? new Date(order.customerJoinedAt).toLocaleDateString() : 'Unknown'}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => openReviewModal(order._id, 'view_customer_reviews')}
                              style={{ padding: '0.25rem 0.75rem', background: '#3B82F6', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}
                            >
                              📝 View Reviews ({order.customerReviewCount || 0})
                            </button>
                            <button
                              onClick={() => openReviewModal(order._id, 'view_customer_given_reviews')}
                              style={{ padding: '0.25rem 0.75rem', background: '#6366F1', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}
                            >
                              ⭐ Reviews Given ({order.customerGivenReviewCount || 0})
                            </button>
                            {!order.customerIsVerified && (
                              <button
                                onClick={() => window.open(`https://wa.me/1234567890?text=Hello, I would like to verify my account for order ${order.orderNumber}`, '_blank')}
                                style={{ padding: '0.25rem 0.75rem', background: '#25D366', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              >
                                📱 Verify Account
                              </button>
                            )}
                          </div>
                        </div>

                        {order.distance && (
                          <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                            📍 Distance from pickup: {order.distance ? `${order.distance.toFixed(2)} km` : 'Unknown'}
                          </div>
                        )}
                        <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{t('orders.placeYourBid')}</p>
                        <div className="bid-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder={t('driver.bidAmount')}
                            value={bidInput[order._id] || ''}
                            onChange={(e) => setBidInput({ ...bidInput, [order._id]: e.target.value })}
                            style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                            step="0.01"
                          />
                          <input
                            type="datetime-local"
                            placeholder={t('orders.pickupTime')}
                            value={bidDetails[order._id]?.pickupTime || ''}
                            onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], pickupTime: e.target.value } })}
                            style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="text"
                            placeholder={t('orders.messageOptional')}
                            value={bidDetails[order._id]?.message || ''}
                            onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], message: e.target.value } })}
                            style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                          />
                          <button
                            onClick={() => handleBidOnOrder(order._id)}
                            disabled={loadingStates.placeBid}
                            style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
                          >
                            {loadingStates.placeBid ? t('driver.bidding') : t('driver.placeBid')}
                          </button>
                        </div>
                      </div>
                    )}

                    {order.status === 'pending_bids' && currentUser?.role === 'customer' && order.bids && order.bids.length > 0 && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>{t('driver.driverBids')} ({order.bids.length})</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {order.bids.map((bid, index) => (
                            <div key={index} style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                <div>
                                  <p style={{ fontWeight: '600', color: '#1E40AF', marginBottom: '0.25rem' }}>{bid.driverName}</p>
                                  <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                    Bid: <span style={{ fontWeight: '600', color: '#1E40AF' }}>${parseFloat(bid.bidPrice).toFixed(2)}</span>
                                  </p>
                                  {bid.estimatedPickupTime && (
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                      Pickup: {new Date(bid.estimatedPickupTime).toLocaleString()}
                                    </p>
                                  )}
                                  {bid.estimatedDeliveryTime && (
                                    <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                      Delivery: {new Date(bid.estimatedDeliveryTime).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button
                                    onClick={() => handleAcceptBid(order._id, bid.userId)}
                                    disabled={loadingStates.acceptBid}
                                    style={{
                                      padding: '0.5rem 1rem',
                                      background: '#10B981',
                                      color: 'white',
                                      borderRadius: '0.375rem',
                                      border: 'none',
                                      cursor: loadingStates.acceptBid ? 'not-allowed' : 'pointer',
                                      fontSize: '0.875rem',
                                      fontWeight: '600',
                                      opacity: loadingStates.acceptBid ? 0.5 : 1
                                    }}
                                  >
                                    {loadingStates.acceptBid ? t('orders.acceptingBid') : t('orders.acceptBid')}
                                  </button>
                                </div>
                              </div>

                              {/* Driver Reputation Section */}
                              <div style={{ background: '#E0F2FE', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '0.75rem', border: '1px solid #BAE6FD' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <h5 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0C4A6E' }}>
                                    👨‍🚗 Driver Reputation
                                  </h5>
                                  {bid.driverIsVerified && (
                                    <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                                      ✓ Verified
                                    </span>
                                  )}
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  <div>
                                    <p style={{ fontSize: '0.625rem', color: '#64748B', marginBottom: '0.125rem' }}>Rating</p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                                      {renderStars(bid.driverRating || 0)}
                                      <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1E293B' }}>
                                        {bid.driverRating ? bid.driverRating.toFixed(1) : 'New'}
                                      </span>
                                    </div>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: '0.625rem', color: '#64748B', marginBottom: '0.125rem' }}>Deliveries</p>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1E293B' }}>
                                      {bid.driverCompletedDeliveries || 0}
                                    </p>
                                  </div>
                                  <div>
                                    <p style={{ fontSize: '0.625rem', color: '#64748B', marginBottom: '0.125rem' }}>Reviews</p>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1E293B' }}>
                                      {bid.driverReviewCount || 0}
                                    </p>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                  <button
                                    onClick={() => openReviewModal(order._id, 'view_driver_reviews', bid)}
                                    style={{ padding: '0.25rem 0.5rem', background: '#3B82F6', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: '500' }}
                                  >
                                    📝 Reviews ({bid.driverReviewCount || 0})
                                  </button>
                                  <button
                                    onClick={() => openReviewModal(order._id, 'view_driver_given_reviews', bid)}
                                    style={{ padding: '0.25rem 0.5rem', background: '#6366F1', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: '500' }}
                                  >
                                    ⭐ Given ({bid.driverGivenReviewCount || 0})
                                  </button>
                                </div>
                              </div>

                              {bid.message && (
                                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.25rem', marginTop: '0.5rem' }}>
                                  <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#374151' }}>
                                    "{bid.message}"
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.status === 'accepted' && currentUser?.role === 'customer' && order.bids && order.bids.length > 0 && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>{t('orders.acceptedBid')}</h4>
                        <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <p style={{ fontWeight: '600', color: '#1E40AF' }}>{order.assignedDriver?.name || 'Driver'}</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1E40AF' }}>${order.acceptedBid?.bidPrice || order.price}</p>
                          </div>
                          {order.acceptedBid?.message && (
                            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>{order.acceptedBid.message}</p>
                          )}
                          {order.acceptedBid?.estimatedPickupTime && (
                            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                              Estimated pickup: {new Date(order.acceptedBid.estimatedPickupTime).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {order.status === 'accepted' && currentUser?.role === 'driver' && isDriverAssigned && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handlePickupOrder(order._id)}
                            disabled={loadingStates.pickupOrder}
                            style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.pickupOrder ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.pickupOrder ? 0.5 : 1 }}
                          >
                            {loadingStates.pickupOrder ? t('orders.pickingUp') : t('orders.markAsPickedUp')}
                          </button>
                        </div>
                      </div>
                    )}

                    {order.status === 'picked_up' && currentUser?.role === 'driver' && isDriverAssigned && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleInTransit(order._id)}
                            disabled={loadingStates.updateInTransit}
                            style={{ flex: 1, padding: '0.75rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.updateInTransit ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.updateInTransit ? 0.5 : 1 }}
                          >
                            {loadingStates.updateInTransit ? t('orders.updating') : t('orders.markAsInTransit')}
                          </button>
                        </div>
                      </div>
                    )}

                    {order.status === 'in_transit' && currentUser?.role === 'driver' && isDriverAssigned && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleCompleteOrder(order._id)}
                            disabled={loadingStates.completeOrder}
                            style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.completeOrder ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.completeOrder ? 0.5 : 1 }}
                          >
                            {loadingStates.completeOrder ? t('orders.completing') : t('orders.markAsDelivered')}
                          </button>
                        </div>
                      </div>
                    )}

                    {order.status === 'accepted' && currentUser?.role === 'customer' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ background: '#FEF3C7', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
                          <p style={{ fontSize: '0.875rem', color: '#92400E', marginBottom: '0.5rem' }}>
                            <strong>{t('orders.driver')}:</strong> {order.assignedDriver?.name || t('orders.assignedDriver')}
                          </p>
                          <p style={{ fontSize: '0.875rem', color: '#92400E' }}>
                            {t('orders.orderAccepted')}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === 'picked_up' && currentUser?.role === 'customer' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ background: '#E0E7FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #C7D2FE' }}>
                          <p style={{ fontSize: '0.875rem', color: '#3730A3' }}>
                            {t('orders.packagePickedUp')}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === 'in_transit' && currentUser?.role === 'customer' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ background: '#FCE7F3', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #F9A8D4' }}>
                          <p style={{ fontSize: '0.875rem', color: '#831843' }}>
                            {t('orders.packageInTransit')}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === 'delivered' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #A7F3D0' }}>
                          <p style={{ fontSize: '0.875rem', color: '#065F46' }}>
                            {t('orders.orderCompletedSuccessfully')}
                          </p>
                        </div>
                      </div>
                    )}

                    {order.status === 'cancelled' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ background: '#FEE2E2', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FECACA' }}>
                          <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>
                            {t('orders.orderCancelled')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            );
          })()}
        </div>
      </main>

      {showAdminPanel && currentUser?.role === 'admin' && (
        <AdminPanel token={token} onClose={() => setShowAdminPanel(false)} />
      )}

      <footer style={{
        padding: '1.5rem 1rem',
        fontSize: '0.75rem',
        color: '#6B7280',
        borderTop: '1px solid #E5E7EB',
        background: '#F9FAFB'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          {/* System Status Bar */}
          {footerStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: mobileView ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1rem',
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>👥</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.usersByRole?.customer || 0} Customers
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.usersByRole?.driver || 0} Drivers
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>📦</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.activeOrders || 0} Active Orders
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.pendingOrders || 0} Pending Bids
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>💰</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  ${footerStats.totalRevenue?.toFixed(2) || '0.00'} Revenue
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  ⭐ {footerStats.avgRating || '0.0'} Rating
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🚚</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.activeDrivers || 0} Active Drivers
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.todayOrders || 0} Orders Today
                </div>
              </div>
            </div>
          )}

          {/* Footer Links and Info */}
          <div style={{
            display: 'flex',
            flexDirection: mobileView ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: mobileView ? 'center' : 'center',
            gap: '1rem'
          }}>
            <div style={{ textAlign: mobileView ? 'center' : 'left' }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                Matrix Delivery v1.0.0
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.625rem' }}>
                Last deployment: {footerStats ? new Date(footerStats.deploymentTimestamp).toLocaleString() : 'Unknown'}
              </p>
            </div>

            <div style={{ textAlign: mobileView ? 'center' : 'right' }}>
              <p style={{ margin: 0, fontSize: '0.625rem' }}>
                Server uptime: {footerStats ? `${Math.floor(footerStats.serverUptime / 3600)}h ${Math.floor((footerStats.serverUptime % 3600) / 60)}m` : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <DeliveryApp />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
