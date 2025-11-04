import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ReCAPTCHA from 'react-google-recaptcha';

const DeliveryApp = () => {
const API_URL = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';

// Reverse geocoding utility
const reverseGeocode = async (lat, lng) => {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    const data = await response.json();

    if (data && data.address) {
      return {
        country: data.address.country,
        city: data.address.city || data.address.town || data.address.village || data.address.hamlet,
        area: data.address.suburb || data.address.neighbourhood || data.address.district,
        street: data.address.road || data.address.footway || data.address.pedestrian,
        buildingNumber: data.address.house_number,
        personName: '' // Will be filled by user
      };
    }
    return { country: '', city: '', area: '', street: '', buildingNumber: '', personName: '' };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return { country: '', city: '', area: '', street: '', buildingNumber: '', personName: '' };
  }
};

// Update user location
const updateUserLocation = async (userId, locationData) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const response = await fetch(`${API_URL}/auth/update-location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(locationData)
    });

    if (response.ok) {
      console.log('✅ User location updated successfully');
    } else {
      console.warn('Failed to update user location');
    }
  } catch (error) {
    console.warn('Error updating user location:', error);
  }
};

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
  const LocationSelector = React.memo(({ isOpen, onClose, onLocationSelect, initialCoordinates, customerLocation }) => {
    const [selectedPosition, setSelectedPosition] = useState(initialCoordinates || null);
    const [hasCentered, setHasCentered] = useState(false);

    const LocationMarker = React.memo(() => {
      const map = useMapEvents({
        click(e) {
          const newPosition = [e.latlng.lat, e.latlng.lng];
          setSelectedPosition(newPosition);
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
    });

    // Reset state when modal closes
    React.useEffect(() => {
      if (!isOpen) {
        setHasCentered(false);
      }
    }, [isOpen]);

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
              center={customerLocation ? [customerLocation.lat, customerLocation.lng] : [40.7128, -74.0060]}
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
  });

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

  // Captcha refs
  const registerCaptchaRef = useRef(null);
  const loginCaptchaRef = useRef(null);

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
  const handleLocationSelect = async (lat, lng) => {
    const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };

    // Auto-fill address details from coordinates
    const addressDetails = await reverseGeocode(lat, lng);

    const locationData = {
      coordinates,
      address: {
        country: currentUser?.country || addressDetails.country,
        city: currentUser?.city || addressDetails.city,
        area: addressDetails.area,
        street: addressDetails.street,
        buildingNumber: addressDetails.buildingNumber,
        personName: mapSelectorType === 'pickup' ? (currentUser?.name || '') : ''
      }
    };

    if (mapSelectorType === 'pickup') {
      setFormData(prev => ({
        ...prev,
        pickupLocation: locationData
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        dropoffLocation: locationData
      }));
    }
    setShowMapSelector(false);
  };

  const handleOpenMap = (type) => {
    setMapSelectorType(type);
    setShowMapSelector(true);
    // Location is fetched on auth and stored globally to prevent re-fetching
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
        // Skip polling when map selector is open to prevent map zoom resets
        if (!showMapSelector) {
          fetchOrders();
          fetchNotifications();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [token, showMapSelector]); // Added showMapSelector as dependency

  // Pre-fill order form with user location when form opens
  useEffect(() => {
    if (showOrderForm && currentUser?.country && currentUser?.city) {
      setFormData(prev => ({
        ...prev,
        pickupLocation: {
          ...prev.pickupLocation,
          address: {
            ...prev.pickupLocation.address,
            country: currentUser.country,
            city: currentUser.city
          }
        }
      }));
    }
  }, [showOrderForm, currentUser]);

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

      // Get user's current location once for map centering
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCustomerLocation({ lat: latitude, lng: longitude });
          },
          (error) => {
            console.warn('Could not get customer location for map:', error);
            setCustomerLocation(null);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes cache
          }
        );
      }
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

    const captchaToken = process.env.REACT_APP_RECAPTCHA_SITE_KEY && process.env.REACT_APP_ENV === 'production' ? registerCaptchaRef.current?.getValue() : null;
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && process.env.REACT_APP_ENV === 'production' && !captchaToken) {
      setError('Please complete the captcha');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...authForm,
          recaptchaToken: captchaToken
        })
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

    const captchaToken = process.env.REACT_APP_RECAPTCHA_SITE_KEY && process.env.REACT_APP_ENV === 'production' ? loginCaptchaRef.current?.getValue() : null;
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && process.env.REACT_APP_ENV === 'production' && !captchaToken) {
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
          recaptchaToken: captchaToken
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

      // Detect and store user location after successful login
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const locationData = await reverseGeocode(latitude, longitude);
            await updateUserLocation(data.user.id, locationData);
            console.log('✅ User location detected and stored:', locationData);
          },
          (error) => {
            console.warn('Could not detect user location:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
          }
        );
      }
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
