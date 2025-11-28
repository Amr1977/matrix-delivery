import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from './i18n/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import AdminPanel from './AdminPanel';
import ErrorBoundary from './ErrorBoundary';
import OrderCreationForm from './updated-order-creation-form';
import LiveTrackingMapView from './components/maps/LiveTrackingMap';
import OrdersMap from './components/maps/OrdersMap';
import RoutePreviewMap from './components/RoutePreviewMap';
import AsyncOrderMap from './components/AsyncOrderMap';
import io from 'socket.io-client';
import ReCAPTCHA from 'react-google-recaptcha';
import logger from './logger';
import './Mobile.css';
import './MatrixTheme.css';
import BrowseVendors from './components/BrowseVendors';
import BrowseItems from './components/BrowseItems';
import VendorSelfDashboard from './components/VendorSelfDashboard';
import MobileNavBar from './components/MobileNavBar';
import MessagingPanel from './components/messaging/MessagingPanel';
import PaymentMethodsManager from './components/payments/PaymentMethodsManager';
import EmailVerificationBanner from './components/auth/EmailVerificationBanner';
import useDriver from './hooks/useDriver';
import GeolocationStatus from './components/ui/GeolocationStatus';
import './components/ui/GeolocationStatus.css';


// Location data state and API functions
const DeliveryApp = () => {
  const { t, locale, changeLocale } = useI18n();
  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

  // Fixed: LiveTrackingMap component moved outside DeliveryApp function for proper scoping
  // State variables
  const [authState, setAuthState] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);

  // Use driver hook for location management
  const driverHook = useDriver(token, currentUser);
  const driverLocation = driverHook.driverLocation;
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);

  const locationIntervalRef = useRef(null);

  const DRIVER_LOCATION_UPDATE_INTERVAL_MS_ACTIVE_ORDER = 3000;
  const DRIVER_LOCATION_UPDATE_INTERVAL_MS_NO_ACTIVE_ORDER = 10000;

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

  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(() => {
    // Try to load theme from local storage on initial render
    const savedTheme = localStorage.getItem('matrix_theme');
    return savedTheme ? { theme: savedTheme } : null;
  });
  const [preferencesData, setPreferencesData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [activityData, setActivityData] = useState(null);
  const [showBrowseVendors, setShowBrowseVendors] = useState(false);
  const [showBrowseItems, setShowBrowseItems] = useState(false);
  const [showVendorDashboard, setShowVendorDashboard] = useState(false);
  const [showMessaging, setShowMessaging] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  const optimizeAndUploadProfilePicture = async (file) => {
    if (!file || !token) return;
    try {
      const imgUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgUrl;
      });
      const maxSide = 512;
      const ratio = Math.min(maxSide / img.width, maxSide / img.height, 1);
      const w = Math.max(1, Math.round(img.width * ratio));
      const h = Math.max(1, Math.round(img.height * ratio));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(imgUrl);
      let quality = 0.7;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > 150000 && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      let res = await fetch(`${API_URL}/users/me/profile-picture`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl })
      });
      if (!res.ok) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        const form = new FormData();
        form.append('file', blob, (file.name || 'profile') + '.jpg');
        res = await fetch(`${API_URL}/users/me/profile-picture`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form
        });
      }
      if (!res.ok) throw new Error('Failed to upload picture');
      const d = await res.json();
      setProfileData(prev => ({ ...prev, profile_picture_url: d.profilePictureUrl }));
    } catch (err) {
      setError(err.message || 'Failed to upload picture');
    }
  };


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

  // Fetch countries from backend API
  const refetchCountries = useCallback(async () => {
    try {
      setCountriesLoading(true);
      const response = await fetch(`${API_URL}/locations/countries?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched countries from API:', data.length, 'countries', data.slice(0, 5));
        if (Array.isArray(data) && data.length > 0) {
          setCountries(data);
        } else {
          console.warn('⚠️ API returned empty countries list');
        }
      } else {
        console.warn('❌ API response not ok:', response.status);
      }
    } catch (error) {
      console.error('❌ Failed to fetch countries:', error);
      // Fallback to default countries if API fails
      const fallback = ['Egypt', 'Saudi Arabia', 'UAE', 'Jordan', 'Lebanon', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'Yemen', 'Iraq', 'Syria', 'Palestine'];
      console.log('Using fallback countries:', fallback.length);
      setCountries(fallback);
    } finally {
      setCountriesLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    refetchCountries();
  }, [refetchCountries]);

  // Expose cache clearing function to window for debugging
  useEffect(() => {
    window.clearLocationCache = async () => {
      try {
        console.log('🧹 Clearing backend location cache...');
        const response = await fetch(`${API_URL}/locations/cache/clear`, {
          method: 'POST'
        });
        if (response.ok) {
          console.log('✅ Cache cleared successfully');
          // Refetch countries after clearing cache
          setTimeout(() => refetchCountries(), 500);
        } else {
          console.error('❌ Failed to clear cache:', response.status);
        }
      } catch (error) {
        console.error('❌ Error clearing cache:', error);
      }
    };
  }, [API_URL, refetchCountries]);

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
  const [spokenNotifications, setSpokenNotifications] = useState(new Set());
  const ttsLastSpokenRef = useRef(0);
  const ttsSignaturesRef = useRef(new Set());

  const [driverPricing, setDriverPricing] = useState(() => {
    try {
      const saved = localStorage.getItem('driverPricing');
      return saved ? JSON.parse(saved) : { currency: 'USD', costPerKm: 1, waitingPerHour: 5, vehicleType: 'car' };
    } catch {
      return { currency: 'USD', costPerKm: 1, waitingPerHour: 5, vehicleType: 'car' };
    }
  });

  const saveDriverPricing = (updates) => {
    const next = { ...driverPricing, ...updates };
    setDriverPricing(next);
    try { localStorage.setItem('driverPricing', JSON.stringify(next)); } catch { }
  };

  const vehicleSpeeds = {
    walker: 5,
    pedestrian: 5,
    bicycle: 15,
    bike: 20,
    scooter: 22,
    motorbike: 25,
    car: 35,
    van: 30,
    truck: 25
  };

  const haversineKm = (a, b) => {
    if (!a || !b || a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
    const R = 6371;
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const aa = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  const estimateMetrics = (order) => {
    const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
    const dropoff = order.dropoffLocation?.coordinates || (order.to ? { lat: order.to.lat, lng: order.to.lng } : null);
    const driver = driverLocation ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : null;
    const speed = vehicleSpeeds[driverPricing.vehicleType] || 35;
    const toPickupKm = haversineKm(driver, pickup);
    const pickupToDropoffKm = haversineKm(pickup, dropoff);
    const toPickupMin = speed > 0 ? Math.ceil((toPickupKm / speed) * 60) : 0;
    const toDeliveryMin = speed > 0 ? Math.ceil((pickupToDropoffKm / speed) * 60) : 0;
    return { toPickupKm, pickupToDropoffKm, toPickupMin, toDeliveryMin };
  };

  const computeBidSuggestions = (order) => {
    const { toPickupKm, pickupToDropoffKm } = estimateMetrics(order);
    const distanceKm = (toPickupKm || 0) + (pickupToDropoffKm || 0);
    const base = distanceKm * (driverPricing.costPerKm || 0) + (driverPricing.waitingPerHour || 0) * 0.25; // 15 min buffer
    const minBid = Math.max(1, base * 2);
    const recommendedBid = Math.max(minBid, base * 3);
    return { base, minBid, recommendedBid };
  };

  // Driver location functionality
  const [viewType, setViewType] = useState('active'); // 'active', 'bidding', 'history', 'map', 'my_bids'
  const [ordersMapRadiusKm, setOrdersMapRadiusKm] = useState(5);
  const [selectedOrderForMap, setSelectedOrderForMap] = useState(null);
  const [driverOnline, setDriverOnline] = useState(false); // Driver online/offline status
  const [countryFilter, setCountryFilter] = useState(''); // Country filter for bidding orders
  const [cityFilter, setCityFilter] = useState(''); // City filter for bidding orders
  const [areaFilter, setAreaFilter] = useState(''); // Area filter for bidding orders

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






  const fetchOrders = useCallback(async (filters = {}) => {
    try {
      const queryParams = new URLSearchParams();

      if (filters.country) queryParams.append('country', filters.country);
      if (filters.city) queryParams.append('city', filters.city);
      if (filters.area) queryParams.append('area', filters.area);

      const queryString = queryParams.toString();
      const url = queryString ? `${API_URL}/orders?${queryString}` : `${API_URL}/orders`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        console.error('Fetch orders failed:', response.status, response.statusText);
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }
      const data = await response.json();

      const ordersWithBids = data.filter(order => order.bids && order.bids.length > 0);

      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err.message);
    }
  }, [API_URL, token]);


  // Effects
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchNotifications();
      // Optimized polling interval (30 seconds) to reduce battery drain
      const interval = setInterval(() => {
        fetchOrders();
        fetchNotifications();
      }, 30000); // 30 seconds - balanced for battery life
      return () => clearInterval(interval);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps





  const speakNotification = useCallback((notification) => {
    if ('speechSynthesis' in window) {
      try {
        const now = Date.now();
        const cooldownMs = 8000;
        const sig = `${notification.id || ''}|${notification.title || ''}|${notification.message || ''}`;
        if (window.speechSynthesis.speaking) {
          return;
        }
        if (ttsSignaturesRef.current.has(sig) && (now - ttsLastSpokenRef.current) < cooldownMs) {
          return;
        }
        ttsSignaturesRef.current.add(sig);
        ttsLastSpokenRef.current = now;
        let message = notification.message;

        const orderNumberRegex = /order\s+(\w+)/gi;
        message = message.replace(orderNumberRegex, (match, orderNum) => {
          const lastThree = orderNum.replace(/\D/g, '').slice(-3);
          return `${t('tracking.orderNumber')} ${lastThree}`;
        });

        const utterance = new SpeechSynthesisUtterance();
        utterance.text = `${t('notifications.newNotification')}: ${notification.title}. ${message}`;
        utterance.volume = 0.8;
        utterance.rate = 1;
        utterance.pitch = 0.7;

        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice =>
          voice.name.includes('David') || voice.name.includes('Microsoft David') ||
          voice.name.includes('Alex') || voice.name.includes('James') ||
          voice.name.includes('Daniel') || voice.name.includes('Paul') ||
          voice.name.includes('Mark') || voice.name.includes('George') ||
          voice.name.includes('Michael') || voice.name.includes('Steven') ||
          (voice.lang.includes('en-US') && !voice.name.toLowerCase().includes('female') && !voice.name.toLowerCase().includes('zira'))
        );

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        try { speechSynthesis.cancel(); } catch (_) { }
        speechSynthesis.speak(utterance);
      } catch (error) {
        console.warn('Could not speak notification:', error);
      }
    }
  }, [t]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser?.role === 'driver' && token && viewType === 'bidding') {
        fetchOrders({ country: countryFilter, city: cityFilter, area: areaFilter });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [countryFilter, cityFilter, areaFilter, currentUser?.role, token, viewType, fetchOrders]);

  // Start location tracking when driver enters bidding view
  useEffect(() => {
    if (currentUser?.role === 'driver' && token && viewType === 'bidding') {
      // Get initial location
      driverHook.getDriverLocation();
      // Start continuous location updates
      driverHook.updateDriverLocation();
    }
  }, [currentUser?.role, token, viewType, driverHook]);

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

      socket.on('notification', async (notification) => {
        console.log('📡 Real-time notification received:', notification);
        console.log('📡 Notification type:', notification.type);
        console.log('📡 Notification message:', notification.message);

        setNotifications(prev => [notification, ...prev]);
        playNotificationSound();

        if (!notification.isRead) {
          setSpokenNotifications(prev => {
            if (prev.has(notification.id)) {
              return prev;
            }
            speakNotification(notification);
            const next = new Set(prev);
            next.add(notification.id);
            return next;
          });
        }

        if (notification.type === 'new_bid' ||
          notification.type === 'bid_accepted' ||
          notification.type === 'order_picked_up' ||
          notification.type === 'order_in_transit' ||
          notification.type === 'order_delivered' ||
          notification.message?.toLowerCase().includes('bid') ||
          notification.message?.toLowerCase().includes('driver') ||
          notification.message?.toLowerCase().includes('order')) {
          try {
            await fetchOrders();
          } catch (error) {
            console.warn('Failed to refresh orders after notification:', error);
          }
        }
      });

      socket.on('disconnect', () => {
        console.log('📡 Disconnected from real-time notifications');
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [token, currentUser, API_URL, fetchOrders, speakNotification]);

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
      setAvailableRoles(data.roles || (data.role ? [data.role] : []));
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
          setSpokenNotifications(prev => {
            const next = new Set(prev);
            next.add(latestUnspoken.id);
            return next;
          });
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
  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  }, []);

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

  // Extract location parts from address string
  const extractLocationParts = (address) => {
    if (!address) return { personName: '', street: '', area: '', city: '', country: '' };
    // Address format: "personName, street, buildingNumber, floor, apartmentNumber, area, city, country"
    const parts = address.split(',').map(part => part.trim());
    return {
      personName: parts[0] || '',
      street: parts[1] || '',
      area: parts[parts.length - 3] || '',
      city: parts[parts.length - 2] || '',
      country: parts[parts.length - 1] || ''
    };
  };



  // Function to get available countries from order addresses
  const getAvailableCountries = () => {
    const countries = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupParts = extractLocationParts(order.pickupAddress);
        const deliveryParts = extractLocationParts(order.deliveryAddress);
        if (pickupParts.country) countries.add(pickupParts.country);
        if (deliveryParts.country) countries.add(deliveryParts.country);
      }
    });
    return Array.from(countries).sort();
  };

  // Function to get available cities by country
  const getAvailableCities = (countryFilter = '') => {
    const cities = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupParts = extractLocationParts(order.pickupAddress);
        const deliveryParts = extractLocationParts(order.deliveryAddress);

        if (!countryFilter || pickupParts.country === countryFilter) {
          if (pickupParts.city) cities.add(pickupParts.city);
        }
        if (!countryFilter || deliveryParts.country === countryFilter) {
          if (deliveryParts.city) cities.add(deliveryParts.city);
        }
      }
    });
    return Array.from(cities).sort();
  };

  // Function to get available areas by country and city
  const getAvailableAreas = (countryFilter = '', cityFilter = '') => {
    const areas = new Set();
    orders.forEach(order => {
      if (order.status === 'pending_bids') {
        const pickupParts = extractLocationParts(order.pickupAddress);
        const deliveryParts = extractLocationParts(order.deliveryAddress);

        if ((!countryFilter || pickupParts.country === countryFilter) &&
          (!cityFilter || pickupParts.city === cityFilter)) {
          if (pickupParts.area) areas.add(pickupParts.area);
        }
        if ((!countryFilter || deliveryParts.country === countryFilter) &&
          (!cityFilter || deliveryParts.city === cityFilter)) {
          if (deliveryParts.area) areas.add(deliveryParts.area);
        }
      }
    });
    return Array.from(areas).sort();
  };

  // Get title for driver view
  const getDriverViewTitle = (viewType) => {
    switch (viewType) {
      case 'active': return t('driver.activeOrders');
      case 'bidding': return t('driver.availableBids');
      case 'history': return t('driver.myHistory');
      case 'map': return 'Orders Map';
      case 'my_bids': return 'My Pending Bids';
      default: return t('driver.availableBids');
    }
  };

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
      setAvailableRoles(data.user.roles || (data.user.role ? [data.user.role] : []));
      setAuthForm({ name: '', email: '', password: '', phone: '', role: 'customer', vehicle_type: '' });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchRole = async (role) => {
    if (!token || !role) return;
    try {
      const response = await fetch(`${API_URL}/auth/switch-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to switch role');
      }
      const data = await response.json();
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setCurrentUser((prev) => ({ ...(prev || {}), role }));
    } catch (err) {
      setError(err.message);
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
    // Clear tracking modal state on logout
    setShowLiveTracking(false);
    setSelectedOrder(null);
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
    // Validation for required fields - must run BEFORE backend submission
    const requiredFieldsError = [];

    // Validate order basics first
    if (!orderData.title?.trim()) {
      requiredFieldsError.push('Order title');
    }
    if (!orderData.price || parseFloat(orderData.price) <= 0) {
      requiredFieldsError.push('Price');
    }

    // Check for both data structure formats since the form can send either
    const hasPickupData = orderData.pickupAddress?.country || orderData.pickupLocation?.address?.country;
    const hasPickupCountry = (orderData.pickupAddress?.country || orderData.pickupLocation?.address?.country)?.trim();
    const hasPickupCity = (orderData.pickupAddress?.city || orderData.pickupLocation?.address?.city)?.trim();
    const hasPickupPersonName = (orderData.pickupAddress?.personName || orderData.pickupLocation?.address?.personName)?.trim();

    if (!hasPickupData || !hasPickupCountry || !hasPickupCity || !hasPickupPersonName) {
      requiredFieldsError.push('Pickup location (country, city, contact name)');
    }

    const hasDropoffData = orderData.dropoffAddress?.country || orderData.dropoffLocation?.address?.country;
    const hasDropoffCountry = (orderData.dropoffAddress?.country || orderData.dropoffLocation?.address?.country)?.trim();
    const hasDropoffCity = (orderData.dropoffAddress?.city || orderData.dropoffLocation?.address?.city)?.trim();
    const hasDropoffPersonName = (orderData.dropoffAddress?.personName || orderData.dropoffLocation?.address?.personName)?.trim();

    if (!hasDropoffData || !hasDropoffCountry || !hasDropoffCity || !hasDropoffPersonName) {
      requiredFieldsError.push('Delivery location (country, city, contact name)');
    }

    // If validation fails, throw error for form to catch and display
    if (requiredFieldsError.length > 0) {
      const errorMessage = `Please fill all required fields: ${requiredFieldsError.join(', ')}`;
      console.log('🛑 Frontend validation failed:', errorMessage);
      console.log('📋 Current form data validation:', {
        title: !!orderData.title?.trim(),
        price: !!(orderData.price && parseFloat(orderData.price) > 0),
        showManualEntry: orderData.showManualEntry,
        pickup: orderData.showManualEntry ? {
          country: !!orderData.pickupAddress?.country,
          city: !!orderData.pickupAddress?.city,
          personName: !!orderData.pickupAddress?.personName
        } : {
          country: !!orderData.pickupLocation?.address?.country,
          city: !!orderData.pickupLocation?.address?.city,
          personName: !!orderData.pickupLocation?.address?.personName
        },
        dropoff: orderData.showManualEntry ? {
          country: !!orderData.dropoffAddress?.country,
          city: !!orderData.dropoffAddress?.city,
          personName: !!orderData.dropoffAddress?.personName
        } : {
          country: !!orderData.dropoffLocation?.address?.country,
          city: !!orderData.dropoffLocation?.address?.city,
          personName: !!orderData.dropoffLocation?.address?.personName
        }
      });
      throw new Error(errorMessage);
    }

    console.log('✅ Frontend validation passed, proceeding to submit');

    setLoadingState('createOrder', true);

    try {
      // Build the order data directly at root level to match backend expectations
      const newOrder = {
        // Order fields directly at root level (no nested orderData wrapper)
        title: orderData.title,
        description: orderData.description,
        package_description: orderData.package_description,
        package_weight: orderData.package_weight ? parseFloat(orderData.package_weight) : null,
        estimated_value: orderData.estimated_value ? parseFloat(orderData.estimated_value) : null,
        special_instructions: orderData.special_instructions,
        estimated_delivery_date: orderData.estimated_delivery_date || null,
        price: parseFloat(orderData.price),
        showManualEntry: true,
        // Location data at root level
        pickupAddress: orderData.pickupAddress,
        dropoffAddress: orderData.dropoffAddress,
        // Include map location and route info if available
        ...(orderData.pickupLocation && { pickupLocation: orderData.pickupLocation }),
        ...(orderData.dropoffLocation && { dropoffLocation: orderData.dropoffLocation }),
        ...(orderData.routeInfo && { routeInfo: orderData.routeInfo })
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
      setLoadingState('createOrder', false);

      // Re-throw the error so OrderCreationForm can catch it
      throw err;
    } finally {
      setLoadingState('createOrder', false);
    }
  }, [token, showSuccess, API_URL, fetchOrders]);

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

  const handleModifyBid = async (orderId) => {
    const bidPrice = bidInput[orderId];
    setLoadingState('placeBid', true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/bid`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bidPrice: parseFloat(bidPrice), message: bidDetails[orderId]?.message || null })
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to modify bid');
      }
      fetchOrders();
      showSuccess('Bid modified successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('placeBid', false);
    }
  };

  const handleWithdrawBid = async (orderId) => {
    setLoadingState('placeBid', true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/bid`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to withdraw bid');
      }
      fetchOrders();
      showSuccess('Bid withdrawn');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('placeBid', false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setLoadingState('deleteOrder', true);
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete order');
      }
      fetchOrders();
      showSuccess('Order deleted successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('deleteOrder', false);
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

  // Driver location functions - now using the driver hook
  const updateDriverLocation = async () => {
    await driverHook.updateDriverLocation();
    fetchOrders(); // Refresh orders with new distance calculations
  };

  const getDriverLocation = async () => {
    await driverHook.getDriverLocation();
  };

  // Driver status functions
  const hasActiveOrders = useCallback(() => {
    if (currentUser?.role !== 'driver') return false;
    return orders.some(order =>
      order.assignedDriver?.userId === currentUser.id &&
      ['accepted', 'picked_up', 'in_transit'].includes(order.status)
    );
  }, [currentUser, orders]);

  const updateDriverStatus = async (isOnline) => {
    if (currentUser?.role !== 'driver') {
      setError('Only drivers can toggle online/offline status');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/drivers/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isOnline })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || 'Failed to update status');
      }
      // Backend tracks driver online/offline status
    } catch (err) {
      console.error('Update status error:', err);
      setError('Failed to update driver status');
    }
  };

  const updateDriverLocationOnce = useCallback(async () => {
    if (currentUser?.role !== 'driver' || !driverOnline || loading) return;

    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            // Update driver location using the hook
            const success = await driverHook.updateDriverLocation();
            if (!success) throw new Error('Failed to update location');
            const activeOrders = orders.filter(o => o.assignedDriver?.userId === currentUser.id && ['accepted', 'picked_up', 'in_transit'].includes(o.status));
            if (activeOrders.length > 0) {
              await Promise.all(activeOrders.map(o => (
                fetch(`${API_URL}/orders/${o._id}/location`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({ latitude, longitude })
                })
              )));
            }
            fetchOrders(); // Refresh orders with new distance calculations
          },
          (error) => {
            console.error('Geolocation error:', error);
            setLocationPermission('denied');
            if (driverOnline) {
              setError('Location access denied. Please enable location services.');
            }
          }
        );
      } else {
        if (driverOnline) {
          setError('Geolocation is not supported by this browser.');
        }
      }
    } catch (err) {
      console.error('Update location error:', err);
      if (driverOnline) {
        setError('Failed to update location');
      }
    }
  }, [currentUser, driverOnline, loading, API_URL, token, orders, fetchOrders, driverHook]);

  const toggleOnline = async () => {
    if (driverOnline && hasActiveOrders()) {
      setError("Cannot go offline while you have active orders. Complete deliveries first.");
      return;
    }

    setLoadingState('toggleOnline', true);
    try {
      if (!driverOnline) {
        await updateDriverStatus(true);
        setDriverOnline(true);
        updateDriverLocationOnce();
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
        const intervalMs = hasActiveOrders() ? DRIVER_LOCATION_UPDATE_INTERVAL_MS_ACTIVE_ORDER : DRIVER_LOCATION_UPDATE_INTERVAL_MS_NO_ACTIVE_ORDER;
        locationIntervalRef.current = setInterval(() => {
          updateDriverLocationOnce();
        }, intervalMs);
      } else {
        // Going offline
        await updateDriverStatus(false);
        setDriverOnline(false);
        // Stop location sync
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
          locationIntervalRef.current = null;
        }
        setLocationPermission('unknown');
      }
    } catch (error) {
      console.error('Failed to toggle driver status:', error);
      setError('Failed to update driver status. Please try again.');
    } finally {
      setLoadingState('toggleOnline', false);
    }
  };

  useEffect(() => {
    if (!driverOnline) return;
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }
    const intervalMs = hasActiveOrders() ? DRIVER_LOCATION_UPDATE_INTERVAL_MS_ACTIVE_ORDER : DRIVER_LOCATION_UPDATE_INTERVAL_MS_NO_ACTIVE_ORDER;
    locationIntervalRef.current = setInterval(() => {
      updateDriverLocationOnce();
    }, intervalMs);

    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
        locationIntervalRef.current = null;
      }
    };
  }, [orders, driverOnline, hasActiveOrders, updateDriverLocationOnce]);





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
        <div style={{ position: 'fixed', top: 'calc(0.75rem + env(safe-area-inset-top))', right: 'calc(0.75rem + env(safe-area-inset-right))', zIndex: 2000 }}>
          <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card">
            <img
              src="/branding-hero-1.png"
              alt="Matrix Heroes - Your trusted delivery heroes"
              className="pulse"
              style={{ width: '3rem', height: '3rem', display: 'block', margin: '0 auto var(--spacing-lg) auto' }}
            />
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'var(--matrix-bright-green)', marginBottom: 'var(--spacing-sm)', textAlign: 'center', textShadow: 'var(--shadow-glow)' }}>{t('common.appName')}</h1>
            <p className="text-matrix" style={{ marginBottom: 'var(--spacing-lg)', textAlign: 'center' }}>{t('common.subtitle')}</p>

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
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.password')}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 3.5rem 0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none', height: '44px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5C7 5 3.1 8.1 1 12c2.1 3.9 6 7 11 7s8.9-3.1 11-7c-2.1-3.9-6-7-11-7z" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill={showPassword ? 'currentColor' : 'none'} />
                      </svg>
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
                  <div style={{ position: 'relative', width: '100%' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.password')}
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 3.5rem 0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none', height: '44px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 5C7 5 3.1 8.1 1 12c2.1 3.9 6 7 11 7s8.9-3.1 11-7c-2.1-3.9-6-7-11-7z" stroke="currentColor" strokeWidth="2" fill="none" />
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill={showPassword ? 'currentColor' : 'none'} />
                      </svg>
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

        {showLiveTracking && selectedOrder && token && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Live Tracking - {selectedOrder.orderNumber}</h2>
                <button onClick={() => setShowLiveTracking(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <LiveTrackingMapView orderId={selectedOrder?._id || selectedOrder?.id || selectedOrder?.orderNumber} t={t} />
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
            <img
              src="/branding-hero-1.png"
              alt="Matrix Heroes - Your trusted delivery heroes"
              className="pulse"
              style={{ width: '48px', height: '48px', marginBottom: '0.5rem' }}
            />
            <h1>{t('common.appName')}</h1>
          </div>
          <div className="header-geolocation">
            <GeolocationStatus />
          </div>
          {/* Desktop Actions - Hidden on Mobile */}
          <div className="header-actions desktop-only">



            <LanguageSwitcher locale={locale} changeLocale={changeLocale} />

            <a
              href="https://www.paypal.com/ncp/payment/HVC6ZJ7PPYETS"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              style={{
                backgroundColor: '#0070ba',
                color: 'white',
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_34x23.jpg" alt="PayPal" style={{ height: '1.2em' }} />
              Donate
            </a>

            <button
              onClick={async () => {
                setLoading(true);
                try {
                  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
                  const pRes = await fetch(`${API_URL}/users/me/profile`, { headers });
                  if (!pRes.ok) throw new Error('Failed to load profile');
                  const pData = await pRes.json();
                  setProfileData(pData);
                  const prefRes = await fetch(`${API_URL}/users/me/preferences`, { headers });
                  if (prefRes.ok) setPreferencesData(await prefRes.json());
                  const pmRes = await fetch(`${API_URL}/users/me/payment-methods`, { headers });
                  if (pmRes.ok) setPaymentMethods(await pmRes.json());
                  const favRes = await fetch(`${API_URL}/users/me/favorites`, { headers });
                  if (favRes.ok) setFavorites(await favRes.json());
                  const actRes = await fetch(`${API_URL}/users/me/activity`, { headers });
                  if (actRes.ok) setActivityData(await actRes.json());
                  setShowProfile(true);
                } catch (e) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="btn-secondary"
            >
              Profile
            </button>

            <button
              onClick={() => setShowMessaging(true)}
              className="btn-secondary"
              style={{ position: 'relative' }}
            >
              💬 Messages
            </button>

            <button
              onClick={() => setShowPaymentMethods(true)}
              className="btn-secondary"
            >
              💳 Payments
            </button>

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
                onClick={toggleOnline}
                disabled={loadingStates.toggleOnline || (!driverOnline && hasActiveOrders())}
                style={{
                  background: driverOnline ? '#EF4444' : '#10B981',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (loadingStates.toggleOnline || (!driverOnline && hasActiveOrders())) ? 'not-allowed' : 'pointer',
                  opacity: (loadingStates.toggleOnline || (!driverOnline && hasActiveOrders())) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {loadingStates.toggleOnline ? '...' : driverOnline ? '🔴 Go Offline' : '🟢 Go Online'}
              </button>
            )}

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <button
                  onClick={() => setShowProfile(true)}
                  style={{
                    fontWeight: '600',
                    color: 'var(--matrix-bright-green)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: '1rem',
                    textDecoration: 'underline'
                  }}
                >
                  {currentUser?.name}
                </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)', textTransform: 'capitalize' }}>
                  {currentUser?.role} {currentUser?.completedDeliveries > 0 && `• ${currentUser.completedDeliveries} deliveries`}
                </p>
                {availableRoles.length > 1 && (
                  <select
                    value={currentUser?.role}
                    onChange={(e) => switchRole(e.target.value)}
                    style={{
                      background: '#111827',
                      color: '#10B981',
                      border: '1px solid #374151',
                      borderRadius: '0.375rem',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                )}
                {(currentUser?.role === 'admin' || availableRoles.includes('admin')) && (
                  <button
                    onClick={() => setShowAdminPanel(true)}
                    style={{ background: '#4F46E5', color: 'white', padding: '0.375rem 0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600' }}
                  >
                    🛡️ Admin Dashboard
                  </button>
                )}


              </div>
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
          <div
            className="notification-panel"
            ref={(el) => {
              if (el && !el.dataset.listenerAdded) {
                el.dataset.listenerAdded = 'true';
                const handleClickOutside = (e) => {
                  if (!el.contains(e.target) && !e.target.closest('.notification-bell')) {
                    setShowNotifications(false);
                  }
                };
                setTimeout(() => document.addEventListener('click', handleClickOutside), 0);
                el._cleanup = () => document.removeEventListener('click', handleClickOutside);
              }
            }}
          >
            <div style={{ padding: 'var(--spacing-md)', borderBottom: '2px solid var(--matrix-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem', color: 'var(--matrix-bright-green)' }}>Notifications</h3>
              {notifications.some(n => !n.isRead) && (
                <button
                  className="notification-bell"
                  onClick={() => {
                    notifications.forEach(n => {
                      if (!n.isRead) markNotificationRead(n.id);
                    });
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #4F46E5 100%)',
                    color: '#FFFFFF',
                    border: '2px solid #4F46E5',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    minHeight: '44px',
                    padding: '0.5rem 1rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    boxShadow: '0 0 10px rgba(79, 70, 229, 0.5)',
                    textShadow: '0 0 5px rgba(139, 92, 246, 0.5)',
                    position: 'relative'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.boxShadow = '0 0 15px rgba(79, 70, 229, 0.8)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.boxShadow = '0 0 10px rgba(79, 70, 229, 0.5)';
                  }}
                >
                  ✓ Mark All Read
                </button>
              )}
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

              {/* Mobile Menu Action Buttons */}
              <div className="mobile-menu-section">
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button className="nav-item" onClick={() => {
                    setShowNotifications(prev => !prev);
                    setShowMobileMenu(false);
                  }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--matrix-green)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 22c1.1 0 2-0.9 2-2h-4c0 1.1 0.9 2 2 2zM18 16v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-0.83-0.67-1.5-1.5-1.5S10.5 3.17 10.5 4v0.68C7.63 5.36 6 7.93 6 11v5l-2 2v1h16v-1l-2-2z" fill="currentColor" />
                    </svg>
                    {notifications.filter(n => !n.isRead).length > 0 && <span style={{ background: '#EF4444', color: 'white', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600', position: 'absolute', top: '0.25rem', right: '0.25rem' }}>{notifications.filter(n => !n.isRead).length}</span>}
                    <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{t('common.notifications')}</span>
                  </button>

                  <button className="nav-item" onClick={() => {
                    setShowProfile(prev => !prev);
                    setShowMobileMenu(false);
                  }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--matrix-green)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                    </svg>
                    <span style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>{t('common.profile')}</span>
                  </button>
                </div>
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

      {showProfile && profileData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '80rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Profile</h2>
              <button onClick={() => setShowProfile(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#E5E7EB', overflow: 'hidden', border: '2px solid #fff' }}>
                      {profileData.profile_picture_url ? (
                        <img src={profileData.profile_picture_url} alt="User avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>👤</div>
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={(e) => e.target.files && optimizeAndUploadProfilePicture(e.target.files[0])} aria-label="Upload profile picture" />
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label htmlFor="name" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Full name</label>
                    <input id="name" value={profileData.name || ''} onChange={(e) => setProfileData({ ...profileData, name: e.target.value })} onBlur={async () => { try { const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: profileData.name }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setProfileData(prev => ({ ...prev, ...d.user })); setCurrentUser(d.user); } catch (err) { setError(err.message); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <label htmlFor="phone" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem' }}>Contact</label>
                    <input id="phone" value={profileData.phone || ''} onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })} onBlur={async () => { try { const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: profileData.phone }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setProfileData(prev => ({ ...prev, ...d.user })); setCurrentUser(d.user); } catch (err) { setError(err.message); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Language</label>
                      <select value={profileData.language || ''} onChange={async (e) => { try { const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ language: e.target.value }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setProfileData(prev => ({ ...prev, ...d.user })); } catch (err) { setError(err.message); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                        <option value="">Default</option>
                        <option value="en">English</option>
                        <option value="ar">Arabic</option>
                        <option value="tr">Turkish</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Theme</label>
                      <select value={profileData.theme || ''} onChange={async (e) => {
                        const newTheme = e.target.value;
                        // Save to local storage immediately
                        if (newTheme) localStorage.setItem('matrix_theme', newTheme);
                        else localStorage.removeItem('matrix_theme');

                        try {
                          const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: newTheme }) });
                          if (!res.ok) throw new Error('Failed');
                          const d = await res.json();
                          setProfileData(prev => ({ ...prev, ...d.user }));
                        } catch (err) { setError(err.message); }
                      }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                        <option value="">System</option>
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="matrix">Matrix</option>
                      </select>
                    </div>
                  </div>
                </div>

                {Array.isArray(profileData.roles) && profileData.roles.includes('driver') && (
                  <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Delivery Agent</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Vehicle type</label>
                        <select value={profileData.vehicle_type || ''} onChange={async (e) => { const v = e.target.value; setProfileData({ ...profileData, vehicle_type: v }); try { const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ vehicle_type: v }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setProfileData(prev => ({ ...prev, ...d.user })); } catch (err) { setError(err.message); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                          <option value="">Select</option>
                          <option value="bike">Bike</option>
                          <option value="car">Car</option>
                          <option value="van">Van</option>
                          <option value="truck">Truck</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>License</label>
                        <input value={profileData.license_number || ''} onChange={(e) => setProfileData({ ...profileData, license_number: e.target.value })} onBlur={async () => { try { const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ license_number: profileData.license_number }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setProfileData(prev => ({ ...prev, ...d.user })); } catch (err) { setError(err.message); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Service area</label>
                        <input value={profileData.service_area_zone || ''} onChange={(e) => setProfileData({ ...profileData, service_area_zone: e.target.value })} onBlur={async () => { try { const res = await fetch(`${API_URL}/users/me/profile`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ service_area_zone: profileData.service_area_zone }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setProfileData(prev => ({ ...prev, ...d.user })); } catch (err) { setError(err.message); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <input id="availability" type="checkbox" checked={!!profileData.is_available} onChange={async (e) => { try { const res = await fetch(`${API_URL}/users/me/availability`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ is_available: !!e.target.checked }) }); if (res.ok) { const d = await res.json(); setProfileData(prev => ({ ...prev, is_available: d.isAvailable })); } } catch (err) { setError(err.message); } }} />
                        <label htmlFor="availability" style={{ fontSize: '0.875rem' }}>Available</label>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>Rating: {profileData.rating || 0} • Deliveries: {profileData.completed_deliveries || 0} • Verified: {profileData.is_verified ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}

                {Array.isArray(profileData.roles) && profileData.roles.includes('customer') && (
                  <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Customer</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Delivery preferences</label>
                        <textarea value={JSON.stringify(preferencesData?.preferences || {})} onChange={(e) => setPreferencesData({ ...(preferencesData || {}), preferences: JSON.parse(e.target.value || '{}') })} onBlur={async () => { try { const res = await fetch(`${API_URL}/users/me/preferences`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: preferencesData?.preferences }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setPreferencesData(d); } catch (err) { setError(err.message); } }} style={{ width: '100%', minHeight: '80px', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Notification preferences</label>
                        <textarea value={JSON.stringify(preferencesData?.notification_prefs || {})} onChange={(e) => setPreferencesData({ ...(preferencesData || {}), notification_prefs: JSON.parse(e.target.value || '{}') })} onBlur={async () => { try { const res = await fetch(`${API_URL}/users/me/preferences`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ notification_prefs: preferencesData?.notification_prefs }) }); if (!res.ok) throw new Error('Failed'); const d = await res.json(); setPreferencesData(d); } catch (err) { setError(err.message); } }} style={{ width: '100%', minHeight: '80px', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Payment methods</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <select id="pmType" defaultValue="credit_card" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                      <option value="credit_card">Credit Card</option>
                      <option value="debit_card">Debit Card</option>
                      <option value="paypal">PayPal</option>
                      <option value="bank_account">Bank Account</option>
                    </select>
                    <input id="pmMask" placeholder="**** **** **** 1234" style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><input id="pmDefault" type="checkbox" /> Default</label>
                    <button onClick={async () => { const res = await fetch(`${API_URL}/users/me/payment-methods`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ payment_method_type: document.getElementById('pmType').value, masked_details: document.getElementById('pmMask').value, is_default: document.getElementById('pmDefault').checked }) }); if (res.ok) { const pm = await res.json(); setPaymentMethods(prev => [pm, ...prev]); } }} style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Add</button>
                  </div>
                  <div>
                    {paymentMethods.map(pm => (
                      <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '0.375rem', marginBottom: '0.5rem', background: 'white' }}>
                        <div style={{ fontSize: '0.875rem' }}>{pm.payment_method_type} • {pm.masked_details} {pm.is_default ? '• Default' : ''}</div>
                        <button onClick={async () => { const res = await fetch(`${API_URL}/users/me/payment-methods/${pm.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) { setPaymentMethods(prev => prev.filter(pp => pp.id !== pm.id)); } }} style={{ padding: '0.25rem 0.5rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Favorites</h3>
                  <div>
                    {favorites.map(f => (
                      <div key={f.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '0.375rem', marginBottom: '0.5rem', background: 'white' }}>
                        <div style={{ fontSize: '0.875rem' }}>{f.name} • {f.role} • ⭐ {f.rating || 0} • {f.completed_deliveries || 0} • {f.is_verified ? 'Verified' : 'Unverified'}</div>
                        <button onClick={async () => { const res = await fetch(`${API_URL}/users/me/favorites/${f.userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }); if (res.ok) { setFavorites(prev => prev.filter(ff => ff.userId !== f.userId)); } }} style={{ padding: '0.25rem 0.5rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Security</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Two-factor</label>
                      <select value={Array.isArray(preferencesData?.two_factor_methods) ? preferencesData.two_factor_methods[0] || '' : ''} onChange={async (e) => { const res = await fetch(`${API_URL}/users/me/preferences`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ two_factor_methods: e.target.value ? [e.target.value] : [] }) }); if (res.ok) { const d = await res.json(); setPreferencesData(d); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                        <option value="">Off</option>
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="totp">Authenticator App</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600 }}>Privacy</label>
                      <select value={(preferencesData?.preferences || {}).privacy || ''} onChange={async (e) => { const res = await fetch(`${API_URL}/users/me/preferences`, { method: 'PUT', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ preferences: { ...(preferencesData?.preferences || {}), privacy: e.target.value } }) }); if (res.ok) { const d = await res.json(); setPreferencesData(d); } }} style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                        <option value="public">Public</option>
                        <option value="friends">Friends</option>
                        <option value="private">Private</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Activity</h3>
                  <div>
                    {(activityData?.recentOrders || []).map(o => (
                      <div key={o.id} style={{ padding: '0.5rem', border: '1px solid #E5E7EB', borderRadius: '0.375rem', marginBottom: '0.5rem', background: 'white' }}>
                        <div style={{ fontSize: '0.875rem' }}>{o.order_number} • {o.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>{o.status}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', marginBottom: '0.5rem' }}>Help & Support</h3>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>For assistance, contact support@matrix-heroes.io</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '2rem 1rem' }}>
        {error && (
          <div className="error-matrix" style={{ padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-danger pulse">⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--status-cancelled)' }}>×</button>
          </div>
        )}

        {successMessage && (
          <div className="success-matrix" style={{ background: 'linear-gradient(135deg, var(--matrix-dim-green) 0%, var(--matrix-dark-green) 100%)', color: 'var(--matrix-bright-green)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', border: '2px solid var(--matrix-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: 'var(--shadow-matrix)' }}>
            <span className="glow">✅ {successMessage}</span>
            <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: 'var(--matrix-bright-green)' }}>×</button>
          </div>
        )}

        {/* Email Verification Banner */}
        <EmailVerificationBanner currentUser={currentUser} />

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setShowBrowseVendors(v => !v)} className="btn-primary">🏪 Browse Vendors</button>
          <button onClick={() => setShowBrowseItems(v => !v)} className="btn-primary">🛒 Browse Items</button>
          {Array.isArray(profileData?.roles) && profileData.roles.includes('vendor') && (
            <button onClick={() => setShowVendorDashboard(v => !v)} className="btn-primary">🧑‍💼 Vendor Dashboard</button>
          )}
        </div>
        {showBrowseVendors && (
          <div style={{ marginBottom: '1rem' }}>
            <BrowseVendors apiUrl={API_URL} />
          </div>
        )}
        {showBrowseItems && (
          <div style={{ marginBottom: '1rem' }}>
            <BrowseItems apiUrl={API_URL} />
          </div>
        )}
        {showVendorDashboard && Array.isArray(profileData?.roles) && profileData.roles.includes('vendor') && (
          <div style={{ marginBottom: '1rem' }}>
            <VendorSelfDashboard apiUrl={API_URL} token={token} />
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
                onClick={async () => {
                  await toggleOnline();
                }}
                disabled={!driverOnline && hasActiveOrders()}
                style={{
                  background: driverOnline ? '#EF4444' : '#10B981',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: (!driverOnline && hasActiveOrders()) ? 'not-allowed' : 'pointer',
                  opacity: (!driverOnline && hasActiveOrders()) ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {loadingStates.toggleOnline ? '...' : driverOnline ? '🔴' : '🟢'} {loadingStates.toggleOnline ? 'Switching...' : driverOnline ? 'Go Offline' : 'Go Online'}
              </button>
              <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                {driverOnline ? (
                  <span>Location sync active (30s)</span>
                ) : (
                  <span>Offline - no location sync</span>
                )}
                {driverOnline && locationPermission === 'granted' && driverLocation.latitude ? (
                  <span> 📍 Lat: {driverLocation.latitude.toFixed(4)}, Lng: {driverLocation.longitude.toFixed(4)}</span>
                ) : null}
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
                onClick={() => setViewType('map')}
                style={{
                  padding: '0.5rem 1rem',
                  background: viewType === 'map' ? '#4F46E5' : '#F3F4F6',
                  color: viewType === 'map' ? 'white' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🗺️ Map
              </button>
              <button
                onClick={() => setViewType('my_bids')}
                style={{
                  padding: '0.5rem 1rem',
                  background: viewType === 'my_bids' ? '#4F46E5' : '#F3F4F6',
                  color: viewType === 'my_bids' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '0 0.375rem 0.375rem 0',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                🎯 My Bids
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

        {showLiveTracking && selectedOrder && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Live Tracking - {selectedOrder.orderNumber}</h2>
                <button onClick={() => setShowLiveTracking(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <LiveTrackingMapView orderId={selectedOrder?._id || selectedOrder?.id || selectedOrder?.orderNumber} t={t} />
                <button onClick={() => setShowLiveTracking(false)} style={{ width: '100%', marginTop: '1rem', padding: '0.75rem', background: '#F3F4F6', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>{t('common.close')}</button>
              </div>
            </div>
          </div>
        )}

        {selectedOrderForMap && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', width: '95%', maxWidth: '64rem', maxHeight: '90vh', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #E5E7EB' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>{selectedOrderForMap.title || `Order #${selectedOrderForMap.orderNumber || selectedOrderForMap._id}`}</h2>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280' }}>Price offered: ${Number(selectedOrderForMap.price || 0).toFixed(2)}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setSelectedOrderForMap(null); setViewType('bidding'); }} style={{ padding: '0.5rem 0.75rem', background: '#4F46E5', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Go to Order</button>
                  <button onClick={() => setSelectedOrderForMap(null)} style={{ padding: '0.5rem 0.75rem', background: '#EF4444', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer' }}>Close</button>
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <AsyncOrderMap
                  order={selectedOrderForMap}
                  currentUser={currentUser}
                  driverLocation={driverLocation}
                  theme={profileData?.theme || 'dark'}
                />
                <div style={{ marginTop: '1rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '0.5rem', padding: '1rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Cost Estimate</h4>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#374151' }}>
                    Based on your preferences: cost per km {(preferencesData?.preferences || {}).cost_per_km || 1}, waiting per hour {(preferencesData?.preferences || {}).waiting_cost_per_hour || 0}, expected waiting hours {(preferencesData?.preferences || {}).expected_waiting_hours || 0}.
                  </p>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
                    {(() => {
                      const prefs = preferencesData?.preferences || {};
                      const cpk = Number(prefs.cost_per_km || 1);
                      const wph = Number(prefs.waiting_cost_per_hour || 0);
                      const wh = Number(prefs.expected_waiting_hours || 0);
                      const pickup = selectedOrderForMap.pickupLocation?.coordinates || (selectedOrderForMap.from ? { lat: selectedOrderForMap.from.lat, lng: selectedOrderForMap.from.lng } : null);
                      const dropoff = selectedOrderForMap.dropoffLocation?.coordinates || (selectedOrderForMap.to ? { lat: selectedOrderForMap.to.lat, lng: selectedOrderForMap.to.lng } : null);
                      const driver = driverLocation && Number.isFinite(driverLocation.latitude) && Number.isFinite(driverLocation.longitude)
                        ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : null;
                      let distanceKm = 0;
                      if (pickup && dropoff) distanceKm += haversineKm(pickup, dropoff);
                      if (driver && pickup) distanceKm += haversineKm(driver, pickup);
                      const baseCost = distanceKm * cpk + (wph * wh);
                      const min = (1 * baseCost).toFixed(2);
                      const low = (2 * baseCost).toFixed(2);
                      const high = (3 * baseCost).toFixed(2);
                      return `Recommended bid: $${low} – $${high} (min $${min})`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {currentUser?.role === 'customer' ? t('orders.myOrders') : getDriverViewTitle(viewType)}
        </h2>

        {currentUser?.role === 'driver' && viewType === 'bidding' && (
          <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>Filter Orders by Location</h3>
              <button
                onClick={async () => {
                  try {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const { latitude, longitude } = position.coords;
                          // Use a reverse geocoding service to get location details
                          try {
                            // Using OpenStreetMap's Nominatim geocoding service
                            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`);
                            const data = await response.json();

                            if (data && data.address) {
                              const detectedCountry = data.address.country;
                              const detectedCity = data.address.city || data.address.town || data.address.village;

                              // Auto-fill the dropdowns with detected location
                              if (detectedCountry && getAvailableCountries().includes(detectedCountry)) {
                                setCountryFilter(detectedCountry);
                                setCityFilter('');
                                setAreaFilter('');
                              }

                              // Try to set city after a brief delay to allow country to be set first
                              setTimeout(() => {
                                if (detectedCountry && detectedCity && getAvailableCities(detectedCountry).includes(detectedCity)) {
                                  setCityFilter(detectedCity);
                                }
                              }, 100);
                            }
                          } catch (reverseGeoError) {
                            console.warn('Reverse geocoding failed:', reverseGeoError);
                          }
                        },
                        (error) => {
                          console.error('Geolocation error:', error);
                          alert('Unable to get your location. Please ensure location permissions are enabled.');
                        }
                      );
                    } else {
                      alert('Geolocation is not supported by this browser.');
                    }
                  } catch (error) {
                    console.error('Location prefill error:', error);
                    alert('Failed to detect your location. Please fill filters manually.');
                  }
                }}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}
                title="Prefill filters based on your current location"
              >
                📍 Detect My Location
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  🇸 Country
                </label>
                <select
                  value={countryFilter}
                  onChange={(e) => {
                    setCountryFilter(e.target.value);
                    setCityFilter(''); // Reset city when country changes
                    setAreaFilter(''); // Reset area when country changes
                  }}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'white'
                  }}
                >
                  <option value="">All Countries</option>
                  {getAvailableCountries().map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  🏙️ City
                </label>
                <select
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setAreaFilter(''); // Reset area when city changes
                  }}
                  disabled={!countryFilter}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'white',
                    opacity: !countryFilter ? 0.5 : 1
                  }}
                >
                  <option value="">All Cities</option>
                  {getAvailableCities(countryFilter).map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
                  📍 Area
                </label>
                <select
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                  disabled={!cityFilter}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'white',
                    opacity: !cityFilter ? 0.5 : 1
                  }}
                >
                  <option value="">All Areas</option>
                  {getAvailableAreas(countryFilter, cityFilter).map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>
            </div>

            {(countryFilter || cityFilter || areaFilter) && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#F0F9FF', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1E40AF', marginBottom: '0.25rem' }}>Active Filters:</div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {countryFilter && <span>🇸 {countryFilter}</span>}
                  {countryFilter && cityFilter && <span> → </span>}
                  {cityFilter && <span>🏙️ {cityFilter}</span>}
                  {cityFilter && areaFilter && <span> → </span>}
                  {areaFilter && <span>📍 {areaFilter}</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {currentUser?.role === 'driver' && viewType === 'map' && (
          <div style={{ marginBottom: '1rem' }}>
            <OrdersMap
              orders={orders.filter(order => {
                if (order.status !== 'pending_bids') return false;
                const hasDriverBid = Array.isArray(order.bids) && order.bids.some(b => b.userId === currentUser?.id);
                if (hasDriverBid) return false;
                const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
                if (!pickup || !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)) return false;
                const driver = driverLocation && Number.isFinite(driverLocation.latitude) && Number.isFinite(driverLocation.longitude)
                  ? { lat: driverLocation.latitude, lng: driverLocation.longitude } : null;
                if (!driver) return true;
                const d = haversineKm(driver, pickup);
                return d <= ordersMapRadiusKm;
              })}
              driverLocation={driverLocation}
              radiusKm={ordersMapRadiusKm}
              onRadiusChange={setOrdersMapRadiusKm}
              onSelectOrder={(order) => setSelectedOrderForMap(order)}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(() => {
            return orders.length === 0 ? (
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
              orders.map((order) => {
                const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;
                const hasDriverBid = Array.isArray(order.bids) && order.bids.some(b => b.userId === currentUser?.id);
                if (currentUser?.role === 'driver') {
                  if (viewType === 'my_bids' && (!hasDriverBid || order.status !== 'pending_bids')) return null;
                  if (viewType === 'bidding' && hasDriverBid) return null;
                }

                return (
                  <div key={order._id} className="order-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{order.title}</h3>
                        {order.orderNumber && (
                          <p style={{ fontSize: '0.875rem' }}>Order #{order.orderNumber}</p>
                        )}
                      </div>
                      <span className={`status-badge status-${order.status}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    {order.description && (
                      <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>{order.description}</p>
                    )}

                    {/* Route Preview Map for all orders */}
                    <div style={{ height: '200px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                      <AsyncOrderMap
                        order={order}
                        currentUser={currentUser}
                        driverLocation={driverLocation}
                        theme={profileData?.theme || 'dark'}
                      />
                    </div>


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
                        {currentUser?.role === 'customer' && order.status === 'pending_bids' && order.customerId === currentUser?.id && (
                          <button
                            onClick={() => handleDeleteOrder(order._id)}
                            disabled={loadingStates.deleteOrder}
                            style={{ padding: '0.5rem 1rem', background: '#EF4444', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.deleteOrder ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '600', opacity: loadingStates.deleteOrder ? 0.5 : 1 }}
                          >
                            🗑️ Delete Order
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
                            const dropoff = order.dropoffLocation?.coordinates || (order.to ? { lat: order.to.lat, lng: order.to.lng } : null);
                            const origin = driverLocation ? `${driverLocation.latitude},${driverLocation.longitude}` : '';
                            const waypoint = pickup ? `${pickup.lat},${pickup.lng}` : '';
                            const destination = dropoff ? `${dropoff.lat},${dropoff.lng}` : '';
                            const travelmode = driverPricing.vehicleType === 'walker' ? 'walking' : (driverPricing.vehicleType === 'bicycle' ? 'bicycling' : 'driving');
                            const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoint}&travelmode=${travelmode}`;
                            window.open(url, '_blank');
                          }}
                          style={{ padding: '0.5rem 1rem', background: '#0EA5E9', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                        >
                          🧭 Google Maps
                        </button>
                      </div>
                    </div>

                    {order.status === 'pending_bids' && currentUser?.role === 'driver' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                          <select value={driverPricing.vehicleType} onChange={(e) => saveDriverPricing({ vehicleType: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                            <option value="walker">Walker</option>
                            <option value="bicycle">Bicycle</option>
                            <option value="scooter">Scooter</option>
                            <option value="motorbike">Motorbike</option>
                            <option value="car">Car</option>
                            <option value="van">Van</option>
                            <option value="truck">Truck</option>
                          </select>
                          <input type="number" step="0.01" value={driverPricing.costPerKm} onChange={(e) => saveDriverPricing({ costPerKm: parseFloat(e.target.value) || 0 })} placeholder="Cost per km" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                          <input type="number" step="0.01" value={driverPricing.waitingPerHour} onChange={(e) => saveDriverPricing({ waitingPerHour: parseFloat(e.target.value) || 0 })} placeholder="Waiting per hour" style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }} />
                          <select value={driverPricing.currency} onChange={(e) => saveDriverPricing({ currency: e.target.value })} style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}>
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="GBP">GBP (£)</option>
                          </select>
                          <button onClick={() => {
                            const s = computeBidSuggestions(order);
                            setBidInput({ ...bidInput, [order._id]: s.recommendedBid.toFixed(2) });
                          }} style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                            Use Recommended Bid
                          </button>
                          <button onClick={() => {
                            const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
                            const dropoff = order.dropoffLocation?.coordinates || (order.to ? { lat: order.to.lat, lng: order.to.lng } : null);
                            const origin = driverLocation ? `${driverLocation.latitude},${driverLocation.longitude}` : '';
                            const waypoint = pickup ? `${pickup.lat},${pickup.lng}` : '';
                            const destination = dropoff ? `${dropoff.lat},${dropoff.lng}` : '';
                            const travelmode = driverPricing.vehicleType === 'walker' ? 'walking' : (driverPricing.vehicleType === 'bicycle' ? 'bicycling' : 'driving');
                            const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoint}&travelmode=${travelmode}`;
                            window.open(url, '_blank');
                          }} style={{ padding: '0.5rem 1rem', background: '#3B82F6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                            Open in Google Maps
                          </button>
                        </div>
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
                          <div style={{ fontSize: '0.75rem', color: '#6B7280', alignSelf: 'center' }}>
                            {(() => { const s = computeBidSuggestions(order); return `Min: ${s.minBid.toFixed(2)} • Rec: ${s.recommendedBid.toFixed(2)} ${driverPricing.currency}`; })()}
                          </div>
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
                          {order.bids?.some(b => b.userId === currentUser?.id) && (
                            <>
                              <button
                                onClick={() => handleModifyBid(order._id)}
                                disabled={loadingStates.placeBid}
                                style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
                              >
                                Modify Bid
                              </button>
                              <button
                                onClick={() => handleWithdrawBid(order._id)}
                                disabled={loadingStates.placeBid}
                                style={{ padding: '0.5rem 1rem', background: '#EF4444', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
                              >
                                Withdraw Bid
                              </button>
                            </>
                          )}
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
            )
          })()}
        </div>
      </main>

      {showAdminPanel && (currentUser?.role === 'admin' || availableRoles.includes('admin')) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '100%', height: '100%', maxWidth: 'none', maxHeight: 'none', overflow: 'auto' }}>
            <AdminPanel token={token} onClose={() => setShowAdminPanel(false)} />
          </div>
        </div>
      )}

      {showMessaging && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '95%', height: '90%', maxWidth: '1200px', background: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Messages</h2>
              <button
                onClick={() => setShowMessaging(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }}
              >
                ×
              </button>
            </div>
            <MessagingPanel />
          </div>
        </div>
      )}

      {showPaymentMethods && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '600px', background: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>Payment Methods</h2>
              <button
                onClick={() => setShowPaymentMethods(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem' }}
              >
                ×
              </button>
            </div>
            <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
              <PaymentMethodsManager />
            </div>
          </div>
        </div>
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
        <MobileNavBar
          unreadCount={notifications.filter(n => !n.isRead).length}
          setShowNotifications={setShowNotifications}
          setShowProfile={setShowProfile}
          setShowMessaging={setShowMessaging}
          toggleMobileMenu={toggleMobileMenu}
        />
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
