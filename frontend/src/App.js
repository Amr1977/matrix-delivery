import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from './i18n/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import AdminPanel from './AdminPanel';
import ErrorBoundary from './ErrorBoundary';
import OrderCreationForm from './updated-order-creation-form';
import LiveTrackingMapView from './components/maps/LiveTrackingMap';
import OrdersMap from './components/maps/OrdersMap';
import AsyncOrderMap from './components/AsyncOrderMap';
import io from 'socket.io-client';
import ReCAPTCHA from 'react-google-recaptcha';
import logger from './logger';
import './Mobile.css';
import './MatrixTheme.css';
import MessagingPanel from './components/messaging/MessagingPanel';
import ChatPage from './components/messaging/ChatPage';
import ActiveOrderCard from './components/orders/ActiveOrderCard';
import PaymentMethodsManager from './components/payments/PaymentMethodsManager';
// Email verification banner moved into profile modal
import MainLayout from './components/layout/MainLayout';
import ProfilePage from './pages/ProfilePage';
import NotificationPanel from './components/notifications/NotificationPanel';
import SettingsModal from './components/layout/SettingsModal';
import DriverEarningsDashboard from './components/driver/DriverEarningsDashboard';
import PrivacyPolicy from './components/legal/PrivacyPolicy';
import TermsOfService from './components/legal/TermsOfService';
import RefundPolicy from './components/legal/RefundPolicy';
import DriverAgreement from './components/legal/DriverAgreement';
import LoadingSpinner from './components/LoadingSpinner';
import CookiePolicy from './components/legal/CookiePolicy';
import CryptoTest from './pages/CryptoTest';
import useDriver from './hooks/useDriver';
import GeolocationStatus from './components/ui/GeolocationStatus';
import InteractiveLocationPicker from './components/InteractiveLocationPicker';
import usePageVisibility from './hooks/usePageVisibility';
import { useBackendHealth } from './hooks/useBackendHealth';
import { useHeartbeat } from './hooks/useHeartbeat';
import MaintenancePage from './components/MaintenancePage';
import './components/ui/GeolocationStatus.css';

// TypeScript API Services
import { AuthApi, OrdersApi, NotificationsApi, UsersApi } from './services/api';

import * as Sentry from '@sentry/react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.REACT_APP_ENV || 'development',
  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [process.env.REACT_APP_API_URL || 'localhost:5000'],
    }),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  tracesSampleRate: process.env.REACT_APP_ENV === 'production' ? 0.1 : 1.0,
  replaysSessionSampleRate: process.env.REACT_APP_ENV === 'production' ? 0.1 : 1.0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.token;
      delete event.request.data.recaptchaToken;
    }
    return event;
  },
});


// Location data state and API functions
export const MainApp = () => {
  const navigate = useNavigate();
  const { t, locale, changeLocale } = useI18n();
  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

  // Performance optimization: Page visibility detection
  const isPageVisible = usePageVisibility();

  // Backend health monitoring
  const { isHealthy, isChecking, lastCheck, checkHealth } = useBackendHealth(API_URL);

  // Fixed: LiveTrackingMap component moved outside DeliveryApp function for proper scoping
  // State variables
  const [authState, setAuthState] = useState('login');
  const [token, setToken] = useState(null); // Remove localStorage - tokens are in httpOnly cookies
  const [authChecking, setAuthChecking] = useState(true); // Track initial auth check
  const [currentUser, setCurrentUser] = useState(null);

  // Heartbeat for online status tracking (must be after token state declaration)
  useHeartbeat(token, API_URL);

  // Use driver hook for location management
  const driverHook = useDriver(token, currentUser);
  const driverLocation = driverHook.driverLocation;
  const driverLocationRef = useRef(driverLocation);

  useEffect(() => {
    driverLocationRef.current = driverLocation;
  }, [driverLocation]);

  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // const [showMobileMenu, setShowMobileMenu] = useState(false); // Moved to MainLayout

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
    return savedTheme ? { theme: savedTheme } : {};
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
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCryptoTest, setShowCryptoTest] = useState(false);
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);

  // Customer history view state
  const [customerViewType, setCustomerViewType] = useState('active'); // 'active' | 'history'
  const [historyOrders, setHistoryOrders] = useState([]);
  const [historyPagination, setHistoryPagination] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      // Try uploading as data URL first
      try {
        const d = await UsersApi.updateProfilePicture({ imageDataUrl: dataUrl });
        setProfileData(prev => ({ ...prev, profile_picture_url: d.profilePictureUrl }));
        setCurrentUser(prev => prev ? { ...prev, profile_picture_url: d.profilePictureUrl } : null);
        return;
      } catch (err) {
        // If data URL fails, try FormData
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        const form = new FormData();
        form.append('file', blob, (file.name || 'profile') + '.jpg');
        const d = await UsersApi.updateProfilePicture(form);
        setProfileData(prev => ({ ...prev, profile_picture_url: d.profilePictureUrl }));
        setCurrentUser(prev => prev ? { ...prev, profile_picture_url: d.profilePictureUrl } : null);
      }
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
  // const toggleMobileMenu = () => setShowMobileMenu(!showMobileMenu); // Moved to MainLayout

  // Add effect to close menu when clicking backdrop
  // This useEffect was related to showMobileMenu, which is now handled by MainLayout.
  // It should be removed or adapted if MainLayout needs to control body overflow.
  // Given the instruction "Remove the old header and mobile menu JSX", this useEffect is part of the old mobile menu logic.
  // So, remove it.


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

      // Check for fake location in localStorage (development feature)
      const fakeLocation = localStorage.getItem('fakeDriverLocation');
      if (fakeLocation && currentUser?.role === 'driver') {
        try {
          const loc = JSON.parse(fakeLocation);
          if (loc.lat && loc.lng) {
            queryParams.append('lat', loc.lat.toString());
            queryParams.append('lng', loc.lng.toString());
            console.log('🔧 Using fake location for order filtering:', loc);
          }
        } catch (e) {
          console.warn('Invalid fake location data:', e);
        }
      } else if (currentUser?.role === 'driver' && driverLocation?.latitude && driverLocation?.longitude) {
        // Use real driver location for filtering if no fake location is set
        queryParams.append('lat', driverLocation.latitude.toString());
        queryParams.append('lng', driverLocation.longitude.toString());
        console.log('📍 Using real driver location for order filtering:', {
          lat: driverLocation.latitude,
          lng: driverLocation.longitude
        });
      }

      const queryString = queryParams.toString();
      const url = queryString ? `${API_URL}/orders?${queryString}` : `${API_URL}/orders`;

      // Only require query parameters for drivers (they need lat/lng for distance filtering)
      // Customers should be able to fetch their orders without any query parameters
      if (currentUser?.role === 'driver' && !queryString) {
        console.warn('⚠️ Driver location required for fetching orders');
        return;
      }

      // Build query parameters object for OrdersApi
      const queryOptions = {};
      if (currentUser?.role === 'driver' && queryString) {
        // Parse query params for driver
        const params = new URLSearchParams(queryString);
        if (params.has('lat')) queryOptions.lat = params.get('lat');
        if (params.has('lng')) queryOptions.lng = params.get('lng');
      }

      const data = await OrdersApi.getOrders(queryOptions);

      const ordersWithBids = data.filter(order => order.bids && order.bids.length > 0);

      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders:', err.message);
    }
  }, [API_URL, token, currentUser?.role, driverLocation]);

  // Sound and Text-to-Speech Notifications (moved before fetchUpdates to avoid initialization error)
  const playNotificationSound = useCallback(() => {
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
  }, []);

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

  // Combined fetch for performance
  const fetchUpdates = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();

      // Driver location logic
      if (currentUser?.role === 'driver') {
        const fakeLocation = localStorage.getItem('fakeDriverLocation');
        let usedFake = false;
        if (fakeLocation) {
          try {
            const loc = JSON.parse(fakeLocation);
            if (loc.lat && loc.lng) {
              queryParams.append('lat', loc.lat.toString());
              queryParams.append('lng', loc.lng.toString());
              usedFake = true;
            }
          } catch (e) { }
        }

        // Use ref for driver location to avoid re-creating function on every location update
        const currentDriverLocation = driverLocationRef.current;
        if (!usedFake && currentDriverLocation?.latitude && currentDriverLocation?.longitude) {
          queryParams.append('lat', currentDriverLocation.latitude.toString());
          queryParams.append('lng', currentDriverLocation.longitude.toString());
        }
      }

      const queryString = queryParams.toString();
      const url = `${API_URL}/updates${queryString ? '?' + queryString : ''}`;

      const response = await fetch(url, {
        credentials: 'include' // Include cookies for authentication
      });

      if (!response.ok) return;
      const data = await response.json();

      if (data.orders) setOrders(data.orders);

      if (data.notifications) {
        const newNotifications = data.notifications;

        // Use functional update to avoid dependency on notifications
        setNotifications(prevNotifications => {
          const newUnreadCount = newNotifications.filter(n => !n.isRead).length;
          const previousUnreadCount = prevNotifications.filter(n => !n.isRead).length;

          if (newUnreadCount > previousUnreadCount && newNotifications.length > 0) {
            playNotificationSound();

            // Use functional update for spokenNotifications too
            setSpokenNotifications(prevSpoken => {
              const unreadNotifications = newNotifications.filter(n => !n.isRead && !prevSpoken.has(n.id));
              if (unreadNotifications.length > 0) {
                const latestUnspoken = unreadNotifications[0];
                speakNotification(latestUnspoken);
                const next = new Set(prevSpoken);
                next.add(latestUnspoken.id);
                return next;
              }
              return prevSpoken;
            });
          }

          return newNotifications;
        });
      }
    } catch (err) {
      console.error('Fetch updates error:', err);
    }
  }, [API_URL, token, currentUser?.role, playNotificationSound, speakNotification]);

  // Location picker callback - moved after fetchOrders to avoid initialization error
  const handleLocationSelect = useCallback((lat, lng) => {
    const location = { lat, lng };
    localStorage.setItem('fakeDriverLocation', JSON.stringify(location));
    setSuccessMessage(`Location set to ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    // Debounce the fetchOrders call to prevent excessive API requests
    setTimeout(() => fetchOrders(), 500);
  }, [fetchOrders]);

  const fetchHistoryOrders = useCallback(async (page = 1) => {
    if (!token) return;

    try {
      setHistoryLoading(true);
      const data = await OrdersApi.getOrders({ page, limit: 20, status: 'history' });

      // If page 1, replace all history orders; otherwise append
      setHistoryOrders(prev => page === 1 ? data.orders : [...prev, ...data.orders]);
      setHistoryPagination(data.pagination);
    } catch (err) {
      console.error('Error fetching history orders:', err.message);
      setError('Failed to load order history');
    } finally {
      setHistoryLoading(false);
    }
  }, [API_URL, token]);

  const markNotificationRead = useCallback(async (notificationId) => {
    try {
      await NotificationsApi.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('markNotificationRead error:', err);
    }
  }, [API_URL])


  // Initialize authentication on app mount - restore session from httpOnly cookies
  useEffect(() => {
    // On initial mount, attempt to restore authentication from httpOnly cookies
    // This fixes the "hard refresh logs user out" issue
    const checkAuth = async () => {
      await fetchCurrentUser();
      setAuthChecking(false); // Auth check complete
    };
    checkAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effects - Optimized polling with Page Visibility API
  useEffect(() => {
    if (token) {
      fetchCurrentUser(); // This already fetches profile data from /auth/me
      fetchUpdates(); // Initial fetch

      // Adaptive polling interval based on page visibility
      // Visible: 60s (reduced from 30s for better battery)
      // Hidden: 5min (300s) - minimal background activity
      const getPollingInterval = () => isPageVisible ? 60000 : 300000;

      const interval = setInterval(() => {
        // Only poll if page is visible or it's been a while
        if (isPageVisible || !document.hidden) {
          fetchUpdates();
        }
      }, getPollingInterval());

      return () => clearInterval(interval);
    }
  }, [token, isPageVisible, fetchUpdates]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch orders after user data is loaded and location is available for drivers
  useEffect(() => {
    if (token && currentUser) {
      // For drivers, only fetch orders if we have location data
      if (currentUser.role === 'driver') {
        const fakeLocation = localStorage.getItem('fakeDriverLocation');
        const hasFakeLocation = fakeLocation && (() => {
          try {
            const loc = JSON.parse(fakeLocation);
            return loc.lat && loc.lng;
          } catch {
            return false;
          }
        })();
        const hasRealLocation = driverLocation?.latitude && driverLocation?.longitude;

        if (hasFakeLocation || hasRealLocation) {
          fetchOrders();
        }
      } else {
        // For non-drivers, fetch orders immediately
        fetchOrders();
      }
    }
  }, [token, currentUser, driverLocation]); // eslint-disable-line react-hooks/exhaustive-deps








  // Start location tracking when driver enters bidding view
  useEffect(() => {
    if (currentUser?.role === 'driver' && token && viewType === 'bidding') {
      // Get initial location
      driverHook.getDriverLocation();
      // Start continuous location updates
      driverHook.updateDriverLocation();
    }
  }, [currentUser?.role, token, viewType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy load history orders when customer opens history tab
  useEffect(() => {
    if (currentUser?.role === 'customer' && customerViewType === 'history' && historyOrders.length === 0 && !historyLoading) {
      fetchHistoryOrders(1);
    }
  }, [customerViewType, currentUser?.role, historyOrders.length, historyLoading, fetchHistoryOrders]);

  // Real-time notifications via WebSocket
  useEffect(() => {
    if (!token || !currentUser?.id) return;

    const apiUrl = API_URL.replace('/api', '');

    // Don't send token in auth - use httpOnly cookie instead
    const socket = io(apiUrl, {
      withCredentials: true, // CRITICAL: Send cookies with Socket.IO requests
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('📡 Connected to real-time notifications');

      // Join user's notification room
      socket.emit('join_user_room', currentUser.id);
      console.log(`📡 Joined user room: user_${currentUser.id}`);
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
  }, [token, currentUser, API_URL, fetchOrders, speakNotification]);

  // Fetch footer statistics
  useEffect(() => {
    const fetchFooterStats = async () => {
      try {
        // Note: Footer stats endpoint doesn't exist in our API services yet
        // Using direct fetch for now - TODO: Add to StatsApi
        const response = await fetch(`${API_URL}/footer/stats`);
        if (response.ok) {
          const data = await response.json();
          setFooterStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch footer stats:', error);
      }
    };

    if (isPageVisible) {
      fetchFooterStats();
    }

    // Refresh stats every 5 minutes
    const interval = setInterval(() => {
      if (isPageVisible) {
        fetchFooterStats();
      }
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [API_URL, isPageVisible]);

  // ============ END OF PART 1 ============
  // Continue with Part 2 for API Functions

  // ============ APP.JS PART 2: API Functions ============
  // Add this after Part 1

  // Fetch Functions
  const fetchCurrentUser = async () => {
    try {
      const data = await AuthApi.getCurrentUser();
      setCurrentUser(data);
      setAvailableRoles(data.granted_roles || data.roles || (data.role ? [data.role] : []));
      setToken('authenticated'); // Set token flag to indicate logged in
      setError('');

      // Also update profileData with the user data including profile_picture_url
      setProfileData(prev => ({
        ...prev,
        ...data,
        profile_picture_url: data.profile_picture_url || data.profilePictureUrl
      }));

    } catch (err) {
      console.error('fetchCurrentUser error:', err);

      // Handle 401/403 errors (no session or expired session)
      if (err.statusCode === 401 || err.statusCode === 403) {
        // Only logout if we previously had a user (session expired)
        // Don't logout on initial page load when there's no session
        if (currentUser) {
          console.log('Session expired, logging out');
          logout();
        } else {
          console.log('No active session on initial load');
        }
        return;
      }

      // Only show error for network/server issues, don't logout automatically
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.statusCode === 500) {
        setError('Connection issue: Failed to get user. Please try refreshing the page.');
      } else if (currentUser) {
        // Only logout if we had a user before (session expired)
        logout();
      }
    }
  };





  const fetchNotifications = async () => {
    try {
      const data = await NotificationsApi.getNotifications();
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



  const fetchReviewStatus = async (orderId) => {
    try {
      const data = await OrdersApi.getReviewStatus(orderId);
      setReviewStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrderReviews = async (orderId) => {
    try {
      const data = await OrdersApi.getReviews(orderId);
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
        // Use UsersApi to fetch user reviews
        const data = await UsersApi.getUserReviews(userId, endpoint.includes('received') ? 'received' : 'given');
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
      await OrdersApi.submitReview(reviewOrderId, {
        reviewType: reviewType,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        professionalismRating: reviewForm.professionalismRating || null,
        communicationRating: reviewForm.communicationRating || null,
        timelinessRating: reviewForm.timelinessRating || null,
        conditionRating: reviewForm.conditionRating || null
      });

      setShowReviewModal(false);
      setError('');
      showSuccess('Review submitted successfully!');
      fetchOrders();
    } catch (err) {
      // Handle "Review already submitted" error with a user-friendly message
      if (err.message.includes('Review already submitted for this order')) {
        setError('⚠️ You have already submitted a review for this order. You can only review each order once.');
        setShowReviewModal(false);
      } else {
        setError(err.message);
      }
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


  // Get title for driver view
  const getDriverViewTitle = (viewType) => {
    switch (viewType) {
      case 'active': return t('driver.activeOrders');
      case 'bidding': return t('driver.availableBids');
      case 'history': return t('driver.myHistory');
      case 'map': return 'Orders Map';
      case 'my_bids': return 'My Pending Bids';
      case 'earnings': return 'My Earnings';
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
      const data = await AuthApi.register({
        ...authForm,
        primary_role: authForm.role, // Backend expects primary_role
        recaptchaToken
      });

      const duration = Date.now() - startTime;
      // Token is now set in httpOnly cookie by server, no need to store in localStorage
      setToken('authenticated'); // Just a flag to indicate user is logged in
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
      const data = await AuthApi.login({
        email: authForm.email,
        password: authForm.password,
        recaptchaToken
      });
      // Token is now set in httpOnly cookie by server, no need to store in localStorage
      setToken('authenticated'); // Just a flag to indicate user is logged in
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
      const data = await AuthApi.switchRole({ role });
      // Token is now in httpOnly cookie, just update the flag
      setToken('authenticated');
      setCurrentUser((prev) => ({ ...(prev || {}), role }));
    } catch (err) {
      setError(err.message || err.error || 'Failed to switch role');
    }
  };

  const logout = async () => {
    try {
      // Call backend logout to clear httpOnly cookie
      await AuthApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Clear all client-side state
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setNotifications([]);
    setAuthState('login');
    setError('');

    // Clear any localStorage items that might persist auth
    localStorage.removeItem('token');

    // Clear tracking modal state on logout
    setShowLiveTracking(false);
    setSelectedOrder(null);
  };

  // Add effect to close menu when clicking backdrop
  // This useEffect was related to showMobileMenu, which is now handled by MainLayout.
  // It should be removed or adapted if MainLayout needs to control body overflow.
  // Given the instruction "Remove the old header and mobile menu JSX", this useEffect is part of the old mobile menu logic.
  // So, remove it.

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

      await OrdersApi.createOrder(newOrder);

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
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use cookie-based authentication
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
      await OrdersApi.modifyBid(orderId, {
        bidPrice: parseFloat(bidPrice),
        message: bidDetails[orderId]?.message || null
      });
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
      await OrdersApi.withdrawBid(orderId);
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
      await OrdersApi.deleteOrder(orderId);
      fetchOrders();
      showSuccess('Order deleted successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingState('deleteOrder', false);
    }
  };

  // Navigation handler for MainLayout
  const handleNavigate = (view) => {
    switch (view) {
      case 'notifications':
        setShowNotifications(prev => !prev);
        break;
      case 'profile':
        setShowProfile(true);
        break;
      case 'settings':
        setShowSettings(true);
        break;
      case 'admin':
        setShowAdminPanel(true);
        break;
      case 'earnings':
        // Driver earnings view
        setViewType('earnings');
        break;
      case 'crypto-test':
        setShowCryptoTest(true);
        break;
      default:
        console.log('Unknown navigation view:', view);
    }
  };

  const handleAcceptBid = async (orderId, userId) => {
    setLoadingState('acceptBid', true);
    setError('');
    try {
      await OrdersApi.acceptBid(orderId, userId);

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
      await OrdersApi.updateStatus(orderId, 'picked_up');

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
      await OrdersApi.updateStatus(orderId, 'in_transit');

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
      await OrdersApi.updateStatus(orderId, 'delivered');

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
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Use httpOnly cookies for authentication
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
                    'Content-Type': 'application/json'
                  },
                  credentials: 'include', // Use cookie-based authentication
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

  // Profile and preferences handlers using TypeScript API services
  const handleUpdateProfile = async (field, value) => {
    try {
      const data = await UsersApi.updateProfile({ [field]: value });
      setProfileData(prev => ({ ...prev, ...data.user }));
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handleUpdateAvailability = async (isAvailable) => {
    try {
      const data = await UsersApi.updateAvailability({ is_available: isAvailable });
      setProfileData(prev => ({ ...prev, is_available: data.isAvailable }));
    } catch (err) {
      setError(err.message || 'Failed to update availability');
    }
  };

  const handleUpdatePreferences = async (preferences) => {
    try {
      const data = await UsersApi.updatePreferences(preferences);
      setPreferencesData(data);
    } catch (err) {
      setError(err.message || 'Failed to update preferences');
    }
  };

  const handleAddPaymentMethod = async (paymentMethod) => {
    try {
      const pm = await UsersApi.addPaymentMethod(paymentMethod);
      setPaymentMethods(prev => [pm, ...prev]);
    } catch (err) {
      setError(err.message || 'Failed to add payment method');
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    try {
      await UsersApi.deletePaymentMethod(paymentMethodId);
      setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
    } catch (err) {
      setError(err.message || 'Failed to delete payment method');
    }
  };

  const handleDeleteFavorite = async (userId) => {
    try {
      await UsersApi.deleteFavorite(userId);
      setFavorites(prev => prev.filter(f => f.userId !== userId));
    } catch (err) {
      setError(err.message || 'Failed to remove favorite');
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

  // Admin Panel Navigation Handler
  const handleAdminPanelNavigation = () => {
    // Check if user has admin privileges
    if (!currentUser || (!currentUser.role === 'admin' && !availableRoles.includes('admin'))) {
      setError('Access denied: Admin privileges required');
      return;
    }

    // Check if token is available
    if (!token) {
      setError('Authentication required: Please log in');
      return;
    }

    // Set admin panel visibility
    setShowAdminPanel(true);
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
                    <input
                      type="text"
                      placeholder={t('orders.selectCountry')}
                      value={authForm.country}
                      onChange={(e) => setAuthForm({ ...authForm, country: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                    />
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

      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ============ END OF PART 4 ============
  // Continue with Part 5 for Main App UI (FINAL)

  // Legal Pages Routing
  if (viewType === 'legal_privacy') {
    return <PrivacyPolicy onBack={() => setViewType('active')} />;
  }
  if (viewType === 'legal_terms') {
    return <TermsOfService onBack={() => setViewType('active')} />;
  }
  if (viewType === 'legal_refund') {
    return <RefundPolicy onBack={() => setViewType('active')} />;
  }
  if (viewType === 'legal_driver_agreement') {
    return <DriverAgreement onBack={() => setViewType('active')} />;
  }
  if (viewType === 'legal_cookies') {
    return <CookiePolicy onBack={() => setViewType('active')} />;
  }

  // ============ APP.JS PART 5A: Main UI - Header & Modals ============
  // Add this after Part 4 (continues the return statement)

  // Show loading spinner while checking authentication on initial load
  if (authChecking) {
    return <LoadingSpinner />;
  }


  return (
    <MainLayout
      currentUser={currentUser}
      notifications={notifications}
      onNavigate={(view) => {
        if (view === 'home') setViewType('active');
        else if (view === 'earnings') setViewType('earnings');
        else if (view === 'profile') setViewType('profile');
        else if (view === 'notifications') setShowNotifications(prev => !prev);
        else if (view === 'settings') setShowSettings(true);
        else if (view === 'bidding') setViewType('bidding');
        else if (view === 'map') setViewType('map');
        else if (view === 'my_bids') setViewType('my_bids');
        else if (view === 'history') setViewType('history');
        else if (view === 'location_settings') setViewType('location_settings');
        else if (view === 'admin_panel') setShowAdminPanel(true);
        else if (view === 'crypto-test') setShowCryptoTest(true);
        else if (view.startsWith('legal_')) setViewType(view);
      }}
      onLogout={logout}
      onToggleOnline={toggleOnline}
      isDriverOnline={driverOnline}
      onSwitchRole={switchRole}
      availableRoles={availableRoles}
      onChangeLocale={changeLocale}
      currentLocale={locale}
      t={t}
      unreadCount={unreadCount}
      footerStats={footerStats}
    >


      {/* ProfileOverlay removed - replaced by ProfilePage page view */}

      {/* OLD INLINE MODAL - REMOVED - Kept commented for reference */}

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        locale={locale}
        changeLocale={changeLocale}
      />

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '2rem 1rem', flex: 1, width: '100%' }}>
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

        {/* Email verification moved into profile modal */}

        {viewType === 'profile' && profileData && (
          <ProfilePage
            profileData={profileData}
            API_URL={API_URL}
            token={token}
            setProfileData={setProfileData}
            setCurrentUser={setCurrentUser}
            currentUser={currentUser}
            optimizeAndUploadProfilePicture={optimizeAndUploadProfilePicture}
            setError={setError}
            preferencesData={preferencesData}
            setPreferencesData={setPreferencesData}
            activityData={activityData}
            paymentMethods={paymentMethods}
            setPaymentMethods={setPaymentMethods}
            favorites={favorites}
            setFavorites={setFavorites}
            onNavigate={(view) => {
              if (view === 'earnings') setViewType('earnings');
            }}
          />
        )}

        {viewType !== 'profile' && (currentUser?.role === 'customer' || currentUser?.role === 'admin') && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={loading}
              className="btn-primary"
            >
              📦 {showOrderForm ? t('common.cancel') : t('orders.createOrder')}
            </button>

            {/* Customer Tab Switcher */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', borderRadius: '0.375rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <button
                onClick={() => setCustomerViewType('active')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: customerViewType === 'active' ? '#4F46E5' : '#F3F4F6',
                  color: customerViewType === 'active' ? 'white' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                📋 {t('orders.activeOrders') || 'Active Orders'}
              </button>
              <button
                onClick={() => setCustomerViewType('history')}
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  background: customerViewType === 'history' ? '#4F46E5' : '#F3F4F6',
                  color: customerViewType === 'history' ? 'white' : '#374151',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  transition: 'all 0.2s'
                }}
              >
                📜 {t('driver.myHistory') || 'Order History'}
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

        {!['profile', 'settings', 'admin_panel'].includes(viewType) && (
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            {currentUser?.role === 'customer' ? t('orders.myOrders') : getDriverViewTitle(viewType)}
          </h2>
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

        {currentUser?.role === 'driver' && viewType === 'earnings' && (
          <DriverEarningsDashboard token={token} API_URL={API_URL} t={t} />
        )}

        {currentUser?.role === 'driver' && viewType === 'location_settings' && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
                📍 Location Settings (Development)
              </h2>
              <p style={{ margin: '0 0 1.5rem 0', color: '#6B7280', fontSize: '0.875rem' }}>
                Set your fake location for testing distance filtering. This overrides your real GPS location.
              </p>

              {/* Current Location Display */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F8FAFC', borderRadius: '0.375rem', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                  Current Location
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: '#6B7280' }}>Real GPS:</span>
                    <div style={{ fontFamily: 'monospace', color: '#1F2937', marginTop: '0.25rem' }}>
                      {driverLocation ? (
                        <>
                          Lat: {driverLocation.latitude?.toFixed(6)}<br />
                          Lng: {driverLocation.longitude?.toFixed(6)}
                        </>
                      ) : (
                        <span style={{ color: '#EF4444' }}>Not available</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#6B7280' }}>Fake Location:</span>
                    <div style={{ fontFamily: 'monospace', color: '#1F2937', marginTop: '0.25rem' }}>
                      {(() => {
                        const fakeLocation = localStorage.getItem('fakeDriverLocation');
                        if (fakeLocation) {
                          try {
                            const loc = JSON.parse(fakeLocation);
                            return (
                              <>
                                Lat: {loc.lat?.toFixed(6)}<br />
                                Lng: {loc.lng?.toFixed(6)}
                              </>
                            );
                          } catch {
                            return <span style={{ color: '#EF4444' }}>Invalid</span>;
                          }
                        }
                        return <span style={{ color: '#6B7280' }}>Not set</span>;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Map for Setting Location */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                  Set Location on Interactive Map
                </h3>
                <div style={{
                  height: '400px',
                  borderRadius: '0.375rem',
                  overflow: 'hidden',
                  border: '2px solid #E5E7EB',
                  background: '#F8FAFC'
                }}>
                  <InteractiveLocationPicker
                    onLocationSelect={handleLocationSelect}
                  />
                </div>
                <p style={{
                  margin: '0.75rem 0 0 0',
                  fontSize: '0.875rem',
                  color: '#374151',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  🗺️ Click anywhere on the map to set your test location. You can pan, zoom, and navigate freely.
                </p>
              </div>

              {/* Manual Location Input */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#F8FAFC', borderRadius: '0.375rem', border: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                  Manual Coordinates
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="31.209709"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                      onChange={(e) => {
                        const lat = parseFloat(e.target.value);
                        const fakeLocation = localStorage.getItem('fakeDriverLocation');
                        let location = fakeLocation ? JSON.parse(fakeLocation) : { lat: 0, lng: 0 };
                        location.lat = lat;
                        localStorage.setItem('fakeDriverLocation', JSON.stringify(location));
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      placeholder="29.914654"
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #D1D5DB',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                      onChange={(e) => {
                        const lng = parseFloat(e.target.value);
                        const fakeLocation = localStorage.getItem('fakeDriverLocation');
                        let location = fakeLocation ? JSON.parse(fakeLocation) : { lat: 0, lng: 0 };
                        location.lng = lng;
                        localStorage.setItem('fakeDriverLocation', JSON.stringify(location));
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    localStorage.removeItem('fakeDriverLocation');
                    setSuccessMessage('Fake location cleared');
                    fetchOrders();
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Clear Fake Location
                </button>
                <button
                  onClick={() => {
                    const fakeLocation = localStorage.getItem('fakeDriverLocation');
                    if (fakeLocation) {
                      try {
                        const loc = JSON.parse(fakeLocation);
                        setSuccessMessage(`Using fake location: ${loc.lat?.toFixed(4)}, ${loc.lng?.toFixed(4)}`);
                        fetchOrders();
                      } catch {
                        setError('Invalid fake location data');
                      }
                    } else {
                      setError('No fake location set');
                    }
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#10B981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Apply Location
                </button>
              </div>

              {/* Instructions */}
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#FEF3C7', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', fontWeight: '600', color: '#92400E' }}>
                  Instructions
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', fontSize: '0.875rem', color: '#92400E' }}>
                  <li>Set your fake location using the map or manual coordinates</li>
                  <li>Click "Apply Location" to use it for filtering orders</li>
                  <li>Orders will be filtered to show only those within 7km of your fake location</li>
                  <li>Clear the fake location to use your real GPS position</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {!['profile', 'settings', 'admin_panel'].includes(viewType) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(() => {
              // Determine which orders to display based on role and view type
              let ordersToDisplay = orders;
              let emptyMessage = t('orders.noOrdersAvailable');

              if (currentUser?.role === 'customer') {
                if (customerViewType === 'history') {
                  ordersToDisplay = historyOrders;
                  emptyMessage = historyLoading ? t('common.loading') || 'Loading...' : (t('orders.noOrderHistory') || 'No order history');
                } else {
                  ordersToDisplay = orders;
                  emptyMessage = t('orders.noOrdersAvailable');
                }
              }

              return ordersToDisplay.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
                  <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</p>
                  <p style={{ color: '#6B7280' }}>
                    {currentUser?.role === 'driver'
                      ? viewType === 'active' ? t('driver.noActiveOrders')
                        : viewType === 'bidding' ? t('orders.noAvailableBids')
                          : t('orders.noOrderHistory')
                      : emptyMessage
                    }
                  </p>
                </div>
              ) : (
                ordersToDisplay.map((order) => {
                  const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;
                  const hasDriverBid = Array.isArray(order.bids) && order.bids.some(b => b.userId === currentUser?.id);
                  if (currentUser?.role === 'driver') {
                    if (viewType === 'my_bids' && (!hasDriverBid || order.status !== 'pending_bids')) return null;
                    if (viewType === 'bidding' && hasDriverBid) return null;
                  }

                  return (
                    <ActiveOrderCard
                      key={order._id}
                      order={order}
                      currentUser={currentUser}
                      driverLocation={driverLocation}
                      profileData={profileData}
                      t={t}
                      driverPricing={driverPricing}
                      saveDriverPricing={saveDriverPricing}
                      bidInput={bidInput}
                      setBidInput={setBidInput}
                      bidDetails={bidDetails}
                      setBidDetails={setBidDetails}
                      loadingStates={loadingStates}
                      reviewStatus={reviewStatus}
                      getStatusLabel={getStatusLabel}
                      renderStars={renderStars}
                      computeBidSuggestions={computeBidSuggestions}
                      handleDeleteOrder={handleDeleteOrder}
                      handleBidOnOrder={handleBidOnOrder}
                      handleModifyBid={handleModifyBid}
                      handleWithdrawBid={handleWithdrawBid}
                      handleAcceptBid={handleAcceptBid}
                      handlePickupOrder={handlePickupOrder}
                      handleInTransit={handleInTransit}
                      handleCompleteOrder={handleCompleteOrder}
                      openReviewModal={openReviewModal}
                      fetchOrderReviews={fetchOrderReviews}
                    />
                  );
                })
              )
            })()}

            {/* Load More Button for History */}
            {currentUser?.role === 'customer' && customerViewType === 'history' && historyPagination?.hasMore && (
              <button
                onClick={() => fetchHistoryOrders(historyPagination.page + 1)}
                disabled={historyLoading}
                style={{
                  padding: '0.75rem',
                  background: 'white',
                  color: '#4F46E5',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.375rem',
                  cursor: historyLoading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  marginTop: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {historyLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    {t('common.loading') || 'Loading...'}
                  </>
                ) : (
                  <>
                    ⬇️ {t('common.loadMore') || 'Load More'} ({historyPagination.total - historyOrders.length} remaining)
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </main>

      {
        showAdminPanel && (currentUser?.role === 'admin' || availableRoles.includes('admin')) && (
          <AdminPanel onClose={() => setShowAdminPanel(false)} />
        )
      }

      {
        showMessaging && (
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
        )
      }

      {
        showPaymentMethods && (
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
        )
      }

      {
        showNotifications && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setShowNotifications(false)}
          >
            <div
              style={{ width: '100%', maxWidth: '600px', background: 'var(--matrix-bg)', borderRadius: '0.5rem', overflow: 'hidden', border: '2px solid var(--matrix-border)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: '1rem', borderBottom: '2px solid var(--matrix-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--matrix-bright-green)' }}>{t('notifications.title') || 'Notifications'}</h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', padding: '0.25rem', color: 'var(--matrix-bright-green)' }}
                >
                  ×
                </button>
              </div>
              <div style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                <NotificationPanel
                  notifications={notifications}
                  onMarkAsRead={markNotificationRead}
                  showHeader={false}
                />
              </div>
            </div>
          </div>
        )
      }

      {
        showCryptoTest && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            overflow: 'auto'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '1200px',
              margin: '2rem auto',
              background: '#f7fafc',
              borderRadius: '16px',
              position: 'relative'
            }}>
              <button
                onClick={() => setShowCryptoTest(false)}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  padding: '0.5rem 1rem',
                  background: '#e53e3e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                ✕ Close
              </button>
              <CryptoTest />
            </div>
          </div>
        )
      }


    </MainLayout >
  );
};

// Router configuration - must be after MainApp definition to avoid circular dependency
const router = createBrowserRouter([
  {
    path: '/',
    element: <MainApp />,
  },
  {
    path: '/chat/:orderId',
    element: <ChatPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

const AppWithErrorBoundary = () => {
  // Show maintenance page if backend is down
  const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';
  const { isHealthy, isChecking, lastCheck, checkHealth } = useBackendHealth(API_URL);

  if (!isHealthy) {
    return (
      <MaintenancePage
        onRetry={checkHealth}
        isChecking={isChecking}
        lastCheck={lastCheck}
      />
    );
  }

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
};

export default AppWithErrorBoundary;
