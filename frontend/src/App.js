// ============ APP.JS PART 1: Setup & State Management ============
import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const DeliveryApp = () => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // MapController Component - handles map instance for programmatic control
  const MapController = React.forwardRef((props, ref) => {
    const map = useMap();

    useImperativeHandle(ref, () => ({
      setView: (coordinates, zoom) => {
        if (map) {
          map.setView(coordinates, zoom);
        }
      }
    }));

    return null;
  });


  // Location Selector Component
  const LocationSelector = ({ isOpen, onClose, onLocationSelect, initialCoordinates, customerLocation }) => {
    const [selectedPosition, setSelectedPosition] = useState(initialCoordinates || null);
    const [hasInitiallyCentered, setHasInitiallyCentered] = useState(false);

    const LocationMarker = () => {
      const map = useMapEvents({
        click(e) {
          const newPosition = [e.latlng.lat, e.latlng.lng];
          setSelectedPosition(newPosition);

          // Center the map on the clicked location and zoom in slightly
          setTimeout(() => {
            map.setView(newPosition, Math.max(15, map.getZoom()));
          }, 100);
        },
      });

      return selectedPosition ? (
        <Marker position={selectedPosition}>
          <Popup>
            <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                📍 Selected Location
              </div>
              <div style={{ color: '#6B7280', marginBottom: '0.5rem' }}>
                Coordinates: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
              </div>
              <button
                onClick={() => {
                  navigator.share({
                    text: `Location: ${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`,
                    url: `https://www.openstreetmap.org/?mlat=${selectedPosition[0]}&mlon=${selectedPosition[1]}`
                  }).catch(() => {
                    navigator.clipboard.writeText(`${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`);
                  });
                }}
                style={{
                  background: '#4F46E5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Copy Coordinates
              </button>
            </div>
          </Popup>
        </Marker>
      ) : null;
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: isOpen ? 'flex' : 'none',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '0.5rem',
          width: '100%',
          maxWidth: '48rem',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Select Location on Map</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#6B7280'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ height: '400px' }}>
            <MapContainer
              center={[40.7128, -74.0060]} // Default center, stable center to prevent zoom resets
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              whenReady={() => {
                // Ensure map is fully loaded before interactions
                setTimeout(() => {
                  try {
                    // Force a map size recalculation only once
                    const mapElement = document.querySelector('.leaflet-container');
                    if (mapElement && mapElement._leaflet_map) {
                      mapElement._leaflet_map.invalidateSize();
                    }
                  } catch (e) {
                    console.warn('Map initialization warning:', e);
                  }
                }, 200);
              }}
              // Error boundary for Leaflet
              errorOverlay={{
                message: 'Map failed to load. Please refresh the page.',
                style: { background: '#f44336', color: 'white', padding: '10px' }
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker />
            </MapContainer>
          </div>
          <div style={{ padding: '1rem', borderTop: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1rem' }}>
              Click on the map to select your location. Make sure to position the marker accurately.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#F3F4F6',
                  color: '#374151',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '600',
                  flex: 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedPosition) {
                    onLocationSelect(selectedPosition[0], selectedPosition[1]);
                    onClose();
                  }
                }}
                disabled={!selectedPosition}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#4F46E5',
                  color: 'white',
                  borderRadius: '0.375rem',
                  border: 'none',
                  cursor: !selectedPosition ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  flex: 1,
                  opacity: !selectedPosition ? 0.5 : 1
                }}
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Detailed Address Form Component
  const AddressDetailsForm = ({ type, location, onLocationChange, onOpenMap }) => {
    const updateAddressField = (field, value) => {
      const updatedLocation = {
        ...location,
        address: {
          ...location.address,
          [field]: value
        }
      };
      onLocationChange(updatedLocation);
    };

    return (
      <div style={{
        border: '1px solid #E5E7EB',
        borderRadius: '0.5rem',
        padding: '1rem',
        background: '#F9FAFB'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <h4 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1F2937',
            textTransform: 'capitalize'
          }}>
            {type} Location
          </h4>
        </div>

        {/* Map Selection Button */}
        <button
          onClick={onOpenMap}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: location.coordinates?.lat ? '#10B981' : '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontWeight: '600',
            marginBottom: '1rem'
          }}
        >
          {location.coordinates?.lat ? '📍 Update Location on Map' : '🗺️ Select Location on Map'}
        </button>

        {location.coordinates?.lat && (
          <div style={{
            background: '#D1FAE5',
            color: '#065F46',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            marginBottom: '1rem',
            fontSize: '0.875rem'
          }}>
            ✅ Map location selected: {location.coordinates.lat.toFixed(6)}, {location.coordinates.lng.toFixed(6)}
          </div>
        )}

        {/* Address Fields */}
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              Country *
            </label>
            <input
              type="text"
              placeholder="Country (e.g., Iraq, USA, UK)"
              value={location.address.country}
              onChange={(e) => updateAddressField('country', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                City *
              </label>
              <input
                type="text"
                placeholder="City"
                value={location.address.city}
                onChange={(e) => updateAddressField('city', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Area *
              </label>
              <input
                type="text"
                placeholder="Area/District"
                value={location.address.area}
                onChange={(e) => updateAddressField('area', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              Street *
            </label>
            <input
              type="text"
              placeholder="Street name and number"
              value={location.address.street}
              onChange={(e) => updateAddressField('street', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Building #
              </label>
              <input
                type="text"
                placeholder="Building number"
                value={location.address.buildingNumber}
                onChange={(e) => updateAddressField('buildingNumber', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Floor
              </label>
              <input
                type="text"
                placeholder="Floor (optional)"
                value={location.address.floor}
                onChange={(e) => updateAddressField('floor', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.25rem'
              }}>
                Apt #
              </label>
              <input
                type="text"
                placeholder="Apartment (optional)"
                value={location.address.apartmentNumber}
                onChange={(e) => updateAddressField('apartmentNumber', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '0.25rem'
            }}>
              Person Name *
            </label>
            <input
              type="text"
              placeholder="Person to contact at this location"
              value={location.address.personName}
              onChange={(e) => updateAddressField('personName', e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>
      </div>
    );
  };

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
  const [trackingData, setTrackingData] = useState(null);
  const [showTracking, setShowTracking] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewType, setReviewType] = useState('');
  const [reviewStatus, setReviewStatus] = useState(null);
  const [orderReviews, setOrderReviews] = useState([]);
  const [showReviewsModal, setShowReviewsModal] = useState(false);

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
  const [locationPermission, setLocationPermission] = useState('unknown'); // 'unknown', 'granted', 'denied'

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
    vehicle_type: ''
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pickupLocation: {
      coordinates: { lat: null, lng: null },
      address: {
        country: '',
        city: '',
        area: '',
        street: '',
        buildingNumber: '',
        floor: '',
        apartmentNumber: '',
        personName: ''
      }
    },
    dropoffLocation: {
      coordinates: { lat: null, lng: null },
      address: {
        country: '',
        city: '',
        area: '',
        street: '',
        buildingNumber: '',
        floor: '',
        apartmentNumber: '',
        personName: ''
      }
    },
    package_description: '',
    package_weight: '',
    estimated_value: '',
    special_instructions: '',
    estimated_delivery_date: '',
    price: ''
  });

  const [bidInput, setBidInput] = useState({});
  const [bidDetails, setBidDetails] = useState({});

  // Map selector state
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [mapSelectorType, setMapSelectorType] = useState('pickup'); // 'pickup' or 'dropoff'
  const [customerLocation, setCustomerLocation] = useState(null); // Customer's current location for map centering

  // Get customer's current location for map centering
  const getCustomerLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCustomerLocation({ lat: latitude, lng: longitude });
        },
        (error) => {
          console.warn('Could not get customer location:', error);
          setCustomerLocation(null); // Fall back to default center
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      setCustomerLocation(null);
    }
  };

  // Map event handlers
  const handleLocationSelect = (lat, lng) => {
    const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };

    if (mapSelectorType === 'pickup') {
      setFormData(prev => ({
        ...prev,
        pickupLocation: {
          ...prev.pickupLocation,
          coordinates: coordinates
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dropoffLocation: {
          ...prev.dropoffLocation,
          coordinates: coordinates
        }
      }));
    }
    setShowMapSelector(false);
  };

  const handleOpenMap = (type) => {
    setMapSelectorType(type);
    // Get customer's current location when opening the map
    getCustomerLocation();
    setShowMapSelector(true);
  };

  const handleLocationChange = (locationType, newLocationData) => {
    setFormData(prev => ({
      ...prev,
      [locationType]: newLocationData
    }));
  };

  // Effects
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchNotifications();
      const interval = setInterval(() => {
        fetchOrders();
        fetchNotifications();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [token]);

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
  }, [currentUser, token]);

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
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      setCurrentUser(data);
      setError('');
      fetchOrders();
    } catch (err) {
      console.error(err);
      logout();
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      console.error(err);
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

  const fetchOrderTracking = async (orderId) => {
    try {
      const response = await fetch(`${API_URL}/orders/${orderId}/tracking`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch tracking');
      const data = await response.json();
      setTrackingData(data);
      setShowTracking(true);
    } catch (err) {
      setError(err.message);
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

  const openReviewModal = async (orderId, type) => {
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
    await fetchReviewStatus(orderId);
    setShowReviewModal(true);
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
      alert('Review submitted successfully!');
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

  const clearError = () => setError('');

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

  // Filter orders based on driver view type
  const filterDriverOrders = (orders, viewType) => {
    if (currentUser?.role !== 'driver') return orders;

    switch (viewType) {
      case 'active':
        return orders.filter(order =>
          order.assignedDriver?.userId === currentUser.id &&
          ['accepted', 'picked_up', 'in_transit'].includes(order.status)
        );
      case 'bidding':
        return orders.filter(order =>
          order.status === 'pending_bids' &&
          !order.assignedDriver
        );
      case 'history':
        return orders.filter(order =>
          order.status === 'delivered' ||
          (order.assignedDriver?.userId === currentUser.id && order.status === 'cancelled')
        );
      default:
        return orders;
    }
  };

  // Get title for driver view
  const getDriverViewTitle = (viewType) => {
    switch (viewType) {
      case 'active': return 'Active Orders';
      case 'bidding': return 'Available Bids';
      case 'history': return 'My History';
      default: return 'Available Orders';
    }
  };

  const speakNotification = (notification) => {
    if ('speechSynthesis' in window) {
      try {
        const utterance = new SpeechSynthesisUtterance();
        utterance.text = `New notification: ${notification.title}. ${notification.message}`;
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

  const renderLoadingSpinner = () => (
    <div style={{ display: 'inline-block', width: '1rem', height: '1rem', border: '2px solid #F3F4F6', borderRadius: '50%', borderTop: '2px solid #4F46E5', animation: 'spin 1s linear infinite' }} />
  );

  const renderLoadingButton = (text, loading, style = {}) => (
    <button
      disabled={loading}
      style={{
        ...style,
        opacity: loading ? 0.6 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}
    >
      {loading && renderLoadingSpinner()}
      {loading ? `${text}...` : text}
    </button>
  );

  // ============ END OF PART 2 ============
  // Continue with Part 3 for Event Handlers

// ============ APP.JS PART 3: Event Handlers ============
// Add this after Part 2

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!authForm.name || !authForm.email || !authForm.password || !authForm.phone) {
      setError('All fields required');
      return;
    }
    if (authForm.role === 'driver' && !authForm.vehicle_type) {
      setError('Vehicle type is required for drivers');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
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

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!authForm.email || !authForm.password) {
      setError('Email and password required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: authForm.email,
          password: authForm.password
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

  const handlePublishOrder = async (e) => {
    e.preventDefault();

    // Enhanced validation for new form structure
    const requiredFieldsError = [];
    if (!formData.title) requiredFieldsError.push('Order title');
    if (!formData.price) requiredFieldsError.push('Price');

    // Validate pickup location has coordinates and required address fields
    if (!formData.pickupLocation.coordinates?.lat || !formData.pickupLocation.coordinates?.lng) {
      requiredFieldsError.push('Pickup location on map');
    }
    if (!formData.pickupLocation.address.country) requiredFieldsError.push('Pickup country');
    if (!formData.pickupLocation.address.city) requiredFieldsError.push('Pickup city');
    if (!formData.pickupLocation.address.area) requiredFieldsError.push('Pickup area');
    if (!formData.pickupLocation.address.street) requiredFieldsError.push('Pickup street');
    if (!formData.pickupLocation.address.personName) requiredFieldsError.push('Pickup contact person');

    // Validate dropoff location has coordinates and required address fields
    if (!formData.dropoffLocation.coordinates?.lat || !formData.dropoffLocation.coordinates?.lng) {
      requiredFieldsError.push('Dropoff location on map');
    }
    if (!formData.dropoffLocation.address.country) requiredFieldsError.push('Dropoff country');
    if (!formData.dropoffLocation.address.city) requiredFieldsError.push('Dropoff city');
    if (!formData.dropoffLocation.address.area) requiredFieldsError.push('Dropoff area');
    if (!formData.dropoffLocation.address.street) requiredFieldsError.push('Dropoff street');
    if (!formData.dropoffLocation.address.personName) requiredFieldsError.push('Dropoff contact person');

    if (requiredFieldsError.length > 0) {
      setError(`Please fill all required fields: ${requiredFieldsError.join(', ')}`);
      return;
    }

    setLoadingState('createOrder', true);
    setError('');

    try {
      // Build the new structured order data
      const newOrder = {
        title: formData.title,
        description: formData.description,
        // New structured location data for pickup
        pickupLocation: {
          coordinates: {
            lat: parseFloat(formData.pickupLocation.coordinates.lat),
            lng: parseFloat(formData.pickupLocation.coordinates.lng)
          },
          address: {
            country: formData.pickupLocation.address.country,
            city: formData.pickupLocation.address.city,
            area: formData.pickupLocation.address.area,
            street: formData.pickupLocation.address.street,
            buildingNumber: formData.pickupLocation.address.buildingNumber || '',
            floor: formData.pickupLocation.address.floor || '',
            apartmentNumber: formData.pickupLocation.address.apartmentNumber || '',
            personName: formData.pickupLocation.address.personName
          }
        },
        // New structured location data for dropoff
        dropoffLocation: {
          coordinates: {
            lat: parseFloat(formData.dropoffLocation.coordinates.lat),
            lng: parseFloat(formData.dropoffLocation.coordinates.lng)
          },
          address: {
            country: formData.dropoffLocation.address.country,
            city: formData.dropoffLocation.address.city,
            area: formData.dropoffLocation.address.area,
            street: formData.dropoffLocation.address.street,
            buildingNumber: formData.dropoffLocation.address.buildingNumber || '',
            floor: formData.dropoffLocation.address.floor || '',
            apartmentNumber: formData.dropoffLocation.address.apartmentNumber || '',
            personName: formData.dropoffLocation.address.personName
          }
        },
        package_description: formData.package_description,
        package_weight: formData.package_weight ? parseFloat(formData.package_weight) : null,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        special_instructions: formData.special_instructions,
        estimated_delivery_date: formData.estimated_delivery_date || null,
        price: parseFloat(formData.price)
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

      // Reset form to initial empty state
      setFormData({
        title: '',
        description: '',
        pickupLocation: {
          coordinates: { lat: null, lng: null },
          address: {
            country: '',
            city: '',
            area: '',
            street: '',
            buildingNumber: '',
            floor: '',
            apartmentNumber: '',
            personName: ''
          }
        },
        dropoffLocation: {
          coordinates: { lat: null, lng: null },
          address: {
            country: '',
            city: '',
            area: '',
            street: '',
            buildingNumber: '',
            floor: '',
            apartmentNumber: '',
            personName: ''
          }
        },
        package_description: '',
        package_weight: '',
        estimated_value: '',
        special_instructions: '',
        estimated_delivery_date: '',
        price: ''
      });

      setShowOrderForm(false);
      fetchOrders();
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
          handlePublishOrder(e);
        }, 2000);
      }
    } finally {
      setLoadingState('createOrder', false);
    }
  };

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

  const getStatusColor = (status) => {
    const colors = {
      'pending_bids': { bg: '#FEF3C7', text: '#92400E' },
      'accepted': { bg: '#DBEAFE', text: '#1E40AF' },
      'picked_up': { bg: '#E0E7FF', text: '#3730A3' },
      'in_transit': { bg: '#FCE7F3', text: '#831843' },
      'delivered': { bg: '#D1FAE5', text: '#065F46' },
      'cancelled': { bg: '#FEE2E2', text: '#991B1B' }
    };
    return colors[status] || { bg: '#F3F4F6', text: '#374151' };
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending_bids': 'Pending Bids',
      'accepted': 'Accepted',
      'picked_up': 'Picked Up',
      'in_transit': 'In Transit',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

// ============ END OF PART 3 ============
// Continue with Part 4 for Authentication UI

// ============ APP.JS PART 4: Authentication UI ============
// Add this after Part 3

  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card-matrix" style={{ borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0, 48, 0, 0.2), inset 0 0 20px rgba(48, 255, 48, 0.1)', padding: '2rem', maxWidth: '28rem', width: '100%', background: 'linear-gradient(135deg, #000000 0%, #111111 100%)' }}>
          <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1.5rem' }}>📦</div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#30FF30', marginBottom: '0.5rem', textAlign: 'center', textShadow: '0 0 10px #30FF30' }}>Matrix Delivery</h1>
          <p style={{ color: '#22BB22', marginBottom: '1.5rem', textAlign: 'center' }}>P2P Delivery Marketplace</p>

          {error && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #FEE2E2' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {authState === 'login' ? (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Sign In</h2>
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
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
                <button
                  onClick={handleLogin}
                  disabled={loading}
                  style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'Loading...' : 'Sign In'}
                </button>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                  Don't have an account?{' '}
                  <button
                    onClick={() => { setAuthState('register'); setError(''); }}
                    style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Sign Up
                  </button>
                </p>
              </>
            ) : (
              <>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>Create Account</h2>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={authForm.phone}
                  onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                />
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
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
                  <option value="customer">Customer</option>
                  <option value="driver">Driver</option>
                </select>
                {authForm.role === 'driver' && (
                  <select
                    value={authForm.vehicle_type}
                    onChange={(e) => setAuthForm({ ...authForm, vehicle_type: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
                  >
                    <option value="">Select Vehicle Type</option>
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                  </select>
                )}
                <button
                  onClick={handleRegister}
                  disabled={loading}
                  style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
                >
                  {loading ? 'Loading...' : 'Create Account'}
                </button>
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                  Already have an account?{' '}
                  <button
                    onClick={() => { setAuthState('login'); setError(''); }}
                    style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
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
        <header className="glow" style={{ background: 'linear-gradient(135deg, #000 0%, #111 100%)', boxShadow: '0 0 20px rgba(48, 255, 48, 0.3)', position: 'sticky', top: 0, zIndex: 10, borderBottom: '1px solid #30FF30' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem', color: '#30FF30', textShadow: '0 0 10px #30FF30' }}>📦</span>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#30FF30', textShadow: '0 0 10px #30FF30' }}>Matrix Delivery</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`${unreadCount > 0 ? 'bell-notification' : ''}`}
                style={{ position: 'relative', padding: '0.5rem', background: 'rgba(48, 255, 48, 0.1)', border: '1px solid #30FF30', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1.25rem', color: '#30FF30', transition: 'all 0.3s ease' }}
                onMouseEnter={(e) => e.target.style.textShadow = '0 0 10px #30FF30'}
                onMouseLeave={(e) => e.target.style.textShadow = 'none'}
              >
                🔔
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: '-0.25rem', right: '-0.25rem', background: '#DC2626', color: 'white', borderRadius: '9999px', width: '1.25rem', height: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                  {unreadCount}
                </span>
              )}
            </button>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: '600', color: '#1F2937' }}>{currentUser?.name}</p>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', textTransform: 'capitalize' }}>
                {currentUser?.role} {currentUser?.completedDeliveries > 0 && `• ${currentUser.completedDeliveries} deliveries`}
              </p>
            </div>
            <button
              onClick={logout}
              style={{ padding: '0.5rem 1rem', background: '#DC2626', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              Logout
            </button>
          </div>
        </div>

        {showNotifications && (
          <div style={{ position: 'absolute', right: '1rem', top: '4rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', width: '24rem', maxHeight: '24rem', overflowY: 'auto', zIndex: 20 }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #E5E7EB' }}>
              <h3 style={{ fontWeight: '600', fontSize: '1rem' }}>Notifications</h3>
            </div>
            {notifications.length === 0 ? (
              <p style={{ padding: '1rem', textAlign: 'center', color: '#6B7280' }}>No notifications</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  style={{ padding: '1rem', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', background: notif.isRead ? 'white' : '#F0F9FF' }}
                >
                  <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>{notif.title}</p>
                  <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>{notif.message}</p>
                  <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </header>

      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' }}>
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

        {currentUser?.role === 'customer' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={loading}
              style={{ background: '#4F46E5', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              📦 {showOrderForm ? 'Cancel' : 'Create New Order'}
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
                📍 {loading ? 'Updating...' : locationPermission === 'granted' ? 'Location Updated' : 'Update Location'}
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

            <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
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
                Active Orders
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
                Available Bids
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
                My History
              </button>
            </div>
          </div>
        )}

        {showMapSelector && (
          <LocationSelector
            isOpen={showMapSelector}
            onClose={() => setShowMapSelector(false)}
            onLocationSelect={handleLocationSelect}
            initialCoordinates={mapSelectorType === 'pickup' ?
              (formData.pickupLocation.coordinates?.lat ? [formData.pickupLocation.coordinates.lat, formData.pickupLocation.coordinates.lng] : null) :
              (formData.dropoffLocation.coordinates?.lat ? [formData.dropoffLocation.coordinates.lat, formData.dropoffLocation.coordinates.lng] : null)
            }
            customerLocation={customerLocation}
          />
        )}

        {showOrderForm && (
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Create New Delivery Order</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
              {/* Basic Order Info */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="Order Title *"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                />
                <textarea
                  placeholder="Description (optional)"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '100px', fontSize: '0.875rem', resize: 'vertical' }}
                />
                <textarea
                  placeholder="Package Description"
                  value={formData.package_description}
                  onChange={(e) => setFormData({ ...formData, package_description: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '80px', fontSize: '0.875rem', resize: 'vertical' }}
                />
                <textarea
                  placeholder="Special Instructions (optional)"
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '60px', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              {/* Detailed Package & Pricing Info */}
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Package Weight (kg)
                    </label>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={formData.package_weight}
                      onChange={(e) => setFormData({ ...formData, package_weight: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      step="0.1"
                      min="0"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                      Estimated Value ($)
                    </label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={formData.estimated_value}
                      onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    Estimated Delivery Date (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.estimated_delivery_date}
                    onChange={(e) => setFormData({ ...formData, estimated_delivery_date: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    Offered Price ($) *
                  </label>
                  <input
                    type="number"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: '600' }}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <button
                  onClick={handlePublishOrder}
                  disabled={loadingStates.createOrder}
                  style={{
                    width: '100%',
                    background: '#10B981',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.375rem',
                    fontWeight: '600',
                    border: 'none',
                    cursor: loadingStates.createOrder ? 'not-allowed' : 'pointer',
                    opacity: loadingStates.createOrder ? 0.5 : 1
                  }}
                >
                  {loadingStates.createOrder ? 'Publishing Order...' : '📦 Publish Order'}
                </button>
              </div>
            </div>

            {/* Location Sections - Full Width */}
            <div style={{ marginTop: '2rem' }}>
              <AddressDetailsForm
                type="Pickup"
                location={formData.pickupLocation}
                onLocationChange={(pickupData) => handleLocationChange('pickupLocation', pickupData)}
                onOpenMap={() => handleOpenMap('pickup')}
              />

              <div style={{ marginTop: '1.5rem' }}>
                <AddressDetailsForm
                  type="Delivery"
                  location={formData.dropoffLocation}
                  onLocationChange={(dropoffData) => handleLocationChange('dropoffLocation', dropoffData)}
                  onOpenMap={() => handleOpenMap('dropoff')}
                />
              </div>
            </div>
          </div>
        )}

        {showTracking && trackingData && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Order Tracking - {trackingData.orderNumber}</h2>
                <button onClick={() => setShowTracking(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>📍</span>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#6B7280' }}>Current Status</p>
                      <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1F2937' }}>{getStatusLabel(trackingData.status)}</p>
                    </div>
                  </div>
                  
                  {trackingData.currentLocation && (
                    <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Current Location</p>
                      <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                        Lat: {trackingData.currentLocation.lat.toFixed(6)}, Lng: {trackingData.currentLocation.lng.toFixed(6)}
                      </p>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>📤 Pickup</p>
                      <p style={{ fontSize: '0.875rem' }}>{trackingData.pickup.address}</p>
                    </div>
                    <div>
                      <p style={{ fontWeight: '600', fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.25rem' }}>📥 Delivery</p>
                      <p style={{ fontSize: '0.875rem' }}>{trackingData.delivery.address}</p>
                    </div>
                  </div>

                  <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.375rem' }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '1rem' }}>Timeline</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {trackingData.createdAt && (
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                          <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', flexShrink: 0 }}>✓</div>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Order Created</p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date(trackingData.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {trackingData.acceptedAt && (
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                          <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', flexShrink: 0 }}>✓</div>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Bid Accepted</p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date(trackingData.acceptedAt).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {trackingData.pickedUpAt && (
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                          <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', flexShrink: 0 }}>✓</div>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Package Picked Up</p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date(trackingData.pickedUpAt).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {trackingData.deliveredAt && (
                        <div style={{ display: 'flex', alignItems: 'start', gap: '0.75rem' }}>
                          <div style={{ width: '2rem', height: '2rem', borderRadius: '9999px', background: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', flexShrink: 0 }}>✓</div>
                          <div>
                            <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>Delivered</p>
                            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>{new Date(trackingData.deliveredAt).toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {trackingData.locationHistory && trackingData.locationHistory.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <h3 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Location History</h3>
                      <div style={{ maxHeight: '12rem', overflowY: 'auto', background: '#F9FAFB', padding: '0.75rem', borderRadius: '0.375rem' }}>
                        {trackingData.locationHistory.map((loc, idx) => (
                          <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: idx < trackingData.locationHistory.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                            <p style={{ color: '#6B7280' }}>{new Date(loc.timestamp).toLocaleString()}</p>
                            <p>Lat: {loc.lat.toFixed(6)}, Lng: {loc.lng.toFixed(6)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showReviewModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '32rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Submit Review</h2>
                <button onClick={() => setShowReviewModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>Overall Rating *</label>
                  <div style={{ marginBottom: '1rem' }}>
                    {renderStars(reviewForm.rating, (rating) => setReviewForm({ ...reviewForm, rating: rating }))}
                  </div>
                </div>

                {reviewType === 'customer_to_driver' && (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>Professionalism</label>
                      {renderStars(reviewForm.professionalismRating, (rating) => setReviewForm({ ...reviewForm, professionalismRating: rating }))}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>Communication</label>
                      {renderStars(reviewForm.communicationRating, (rating) => setReviewForm({ ...reviewForm, communicationRating: rating }))}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>Timeliness</label>
                      {renderStars(reviewForm.timelinessRating, (rating) => setReviewForm({ ...reviewForm, timelinessRating: rating }))}
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>Package Condition</label>
                      {renderStars(reviewForm.conditionRating, (rating) => setReviewForm({ ...reviewForm, conditionRating: rating }))}
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>Comment (Optional)</label>
                  <textarea
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    placeholder="Share your experience..."
                    style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '100px', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitReview}
                    disabled={loading || reviewForm.rating === 0}
                    style={{ flex: 1, padding: '0.75rem', background: '#4F46E5', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: reviewForm.rating === 0 || loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: reviewForm.rating === 0 || loading ? 0.5 : 1 }}
                  >
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showReviewsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '48rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Order Reviews</h2>
                <button onClick={() => setShowReviewsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                {orderReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
                    <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📝</p>
                    <p>No reviews yet for this order</p>
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

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {currentUser?.role === 'customer' ? 'My Orders' : getDriverViewTitle(viewType)}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(() => {
            const filteredOrders = currentUser?.role === 'driver' ? filterDriverOrders(orders, viewType) : orders;
            return filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
                <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</p>
                <p style={{ color: '#6B7280' }}>
                  {currentUser?.role === 'driver'
                    ? `No ${viewType === 'active' ? 'active orders' : viewType === 'bidding' ? 'available bids' : 'order history'} found`
                    : 'No orders available'
                  }
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => {
                const statusColor = getStatusColor(order.status);
                const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

                return (
                  <div key={order._id} style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{order.title}</h3>
                        {order.orderNumber && (
                          <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order #{order.orderNumber}</p>
                        )}
                      </div>
                      <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '600', background: statusColor.bg, color: statusColor.text }}>
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
                          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📦 Package</p>
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
                                ⭐ Review Driver
                              </button>
                            )}
                            {currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser?.id && !reviewStatus?.reviews.toCustomer && (
                              <button
                                onClick={() => openReviewModal(order._id, 'driver_to_customer')}
                                style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                              >
                                ⭐ Review Customer
                              </button>
                            )}
                            {!reviewStatus?.reviews.toPlatform && (
                              <button
                                onClick={() => openReviewModal(order._id, `${currentUser?.role}_to_platform`)}
                                style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                              >
                                🌟 Review Platform
                              </button>
                            )}
                            <button
                              onClick={() => fetchOrderReviews(order._id)}
                              style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                            >
                              📝 View Reviews
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => fetchOrderTracking(order._id)}
                          style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                        >
                          🗺️ Track Order
                        </button>
                      </div>
                    </div>

                    {order.status === 'pending_bids' && currentUser?.role === 'driver' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        {order.distance && (
                          <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                            📍 Distance from pickup: {order.distance ? `${order.distance.toFixed(2)} km` : 'Unknown'}
                          </div>
                        )}
                        <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Place Your Bid</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            type="number"
                            placeholder="Bid Amount ($)"
                            value={bidInput[order._id] || ''}
                            onChange={(e) => setBidInput({ ...bidInput, [order._id]: e.target.value })}
                            style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                            step="0.01"
                          />
                          <input
                            type="datetime-local"
                            placeholder="Pickup Time"
                            value={bidDetails[order._id]?.pickupTime || ''}
                            onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], pickupTime: e.target.value } })}
                            style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                          />
                          <input
                            type="datetime-local"
                            placeholder="Delivery Time"
                            value={bidDetails[order._id]?.deliveryTime || ''}
                            onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], deliveryTime: e.target.value } })}
                            style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                          />
                          <textarea
                            placeholder="Message (optional)"
                            value={bidDetails[order._id]?.message || ''}
                            onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], message: e.target.value } })}
                            style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '60px', gridColumn: '1 / -1' }}
                          />
                        </div>
                        <button
                          onClick={() => handleBidOnOrder(order._id)}
                          disabled={loading}
                          style={{ width: '100%', background: '#10B981', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                        >
                          {loading ? 'Placing Bid...' : 'Place Bid'}
                        </button>
                      </div>
                    )}

                    {order.status === 'pending_bids' && order.bids && order.bids.length > 0 && currentUser?.role === 'customer' && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                        <p style={{ fontWeight: '600', marginBottom: '0.75rem' }}>Bids Received ({order.bids.filter(b => b.status === 'pending').length})</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {order.bids.filter(b => b.status === 'pending').map((bid, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#F9FAFB', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
                              <div style={{ flex: 1 }}>
                                <p style={{ fontWeight: '600', fontSize: '0.875rem' }}>{bid.driverName}</p>
                                <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#10B981', marginTop: '0.25rem' }}>
                                  ${parseFloat(bid.bidPrice).toFixed(2)}
                                </p>
                                {bid.estimatedPickupTime && (
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                    🕐 Pickup: {new Date(bid.estimatedPickupTime).toLocaleString()}
                                  </p>
                                )}
                                {bid.estimatedDeliveryTime && (
                                  <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                    🕐 Delivery: {new Date(bid.estimatedDeliveryTime).toLocaleString()}
                                  </p>
                                )}
                                {bid.message && (
                                  <p style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: '0.5rem', fontStyle: 'italic' }}>
                                    "{bid.message}"
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => handleAcceptBid(order._id, bid.userId)}
                                disabled={loading}
                                style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600', marginLeft: '1rem' }}
                              >
                                Accept
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {order.assignedDriver && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '1rem' }}>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.5rem' }}>
                          🚗 Assigned Driver
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ fontWeight: '600' }}>{order.assignedDriver.driverName}</p>
                            <p style={{ fontSize: '0.875rem', color: '#10B981', fontWeight: '600' }}>
                              Agreed Price: ${parseFloat(order.assignedDriver.bidPrice).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {isDriverAssigned && (
                      <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem', marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {order.status === 'accepted' && (
                          <button
                            onClick={() => handlePickupOrder(order._id)}
                            disabled={loading}
                            style={{ flex: 1, minWidth: '200px', background: '#F59E0B', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                          >
                            📦 Mark as Picked Up
                          </button>
                        )}
                        {order.status === 'picked_up' && (
                          <button
                            onClick={() => handleInTransit(order._id)}
                            disabled={loading}
                            style={{ flex: 1, minWidth: '200px', background: '#8B5CF6', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                          >
                            🚚 Mark as In Transit
                          </button>
                        )}
                        {(order.status === 'in_transit' || order.status === 'picked_up') && (
                          <button
                            onClick={() => handleCompleteOrder(order._id)}
                            disabled={loading}
                            style={{ flex: 1, minWidth: '200px', background: '#10B981', color: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                          >
                            ✅ Mark as Delivered
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            );
          })()}
        </div>
      </main>
    </div>
  );
};

export default DeliveryApp;
