// @ts-nocheck
// ============ UPDATED OrderCreationForm.jsx WITH MAP INTEGRATION ============
// Replace the existing OrderCreationForm component with this

import React, { useState, useEffect, useCallback, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import logger from './logger';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import SavedAddressSelector from './components/SavedAddressSelector';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ============ MODAL COMPONENT FOR SUCCESS/ERROR MESSAGES ============
const MessageModal = ({ isOpen, onClose, title, message, type }) => {
  if (!isOpen) return null;

  const isSuccess = type === 'success';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
        border: `2px solid ${isSuccess ? '#00AA00' : '#DC2626'}`,
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        boxShadow: `0 10px 30px rgba(${isSuccess ? '0, 170, 0' : '220, 38, 38'}, 0.5)`
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem'
        }}>
          {isSuccess ? '🎉' : '⚠️'}
        </div>

        <h2 style={{
          fontSize: '1.25rem',
          fontWeight: 'bold',
          color: '#30FF30',
          marginBottom: '1rem',
          textShadow: '0 0 10px #30FF30'
        }}>
          {title}
        </h2>

        <p style={{
          color: '#E5E7EB',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          {message}
        </p>

        <button
          onClick={onClose}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)',
            color: '#30FF30',
            border: '2px solid #00AA00',
            borderRadius: '0.375rem',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'Consolas, Monaco, Courier New, monospace'
          }}
          onMouseOver={(e) => {
            e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
            e.target.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.target.style.boxShadow = 'none';
            e.target.style.transform = 'translateY(0)';
          }}
        >
          {isSuccess ? '🎯 Got it!' : '❌ Try Again'}
        </button>
      </div>
    </div>
  );
};

//TODO SHOW IN SEPARATE PAGE!!!
const OrderCreationForm = ({ onSubmit, countries, t }) => {
  const API_URL = process.env.REACT_APP_API_URL;

  // Form state
  const [orderData, setOrderData] = useState({
    title: '',
    description: '',
    price: '',
    package_description: '',
    package_weight: '',
    estimated_value: '',
    special_instructions: '',
    estimated_delivery_date: ''
  });

  // Location state
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Address fields state for manual entry
  const [pickupAddress, setPickupAddress] = useState({
    country: '',
    city: '',
    area: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    personName: ''
  });
  const [dropoffAddress, setDropoffAddress] = useState({
    country: '',
    city: '',
    area: '',
    street: '',
    building: '',
    floor: '',
    apartment: '',
    personName: ''
  });

  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: '', // 'success' or 'error'
    title: '',
    message: ''
  });
  const [pickupErrors, setPickupErrors] = useState({});
  const [dropoffErrors, setDropoffErrors] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
          setUserLocation({ lat: 30.0444, lng: 31.2357 }); // Default to Cairo
        }
      );
    } else {
      setUserLocation({ lat: 30.0444, lng: 31.2357 });
    }
  }, []);

  // Calculate route when both locations are set
  const calculateRoute = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/locations/calculate-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupLocation.coordinates,
          delivery: dropoffLocation.coordinates
        })
      });

      if (!response.ok) throw new Error('Failed to calculate route');
      const data = await response.json();

      console.log('🗺️ Route calculated:', {
        distance: data.distance_km + ' km',
        hasPolyline: !!data.polyline,
        polylineLength: data.polyline?.length || 0,
        routeFound: data.route_found,
        osrmUsed: data.osrm_used
      });

      setRouteInfo(data);
    } catch (err) {
      setModalState({ isOpen: true, type: 'error', title: 'Route Error', message: err.message || 'Failed to calculate route' });
    } finally {
      setLoading(false);
    }
  }, [API_URL, pickupLocation?.coordinates, dropoffLocation?.coordinates]);

  useEffect(() => {
    if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
      calculateRoute();
    }
  }, [pickupLocation?.coordinates, dropoffLocation?.coordinates, calculateRoute]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate address fields for pickup and dropoff
    const requiredFields = ['country', 'city', 'area', 'street', 'building', 'personName', 'personPhone'];
    const computeErrors = (addr) => {
      const errs = {};
      requiredFields.forEach(f => {
        if (!addr?.[f] || String(addr[f]).trim() === '') {
          errs[f] = true;
        }
      });
      return errs;
    };

    const pErrs = computeErrors(pickupAddress);
    const dErrs = computeErrors(dropoffAddress);
    setPickupErrors(pErrs);
    setDropoffErrors(dErrs);

    if (Object.keys(pErrs).length > 0 || Object.keys(dErrs).length > 0) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Missing Address Fields',
        message: 'Please fill all required address fields (Country, City, Area, Street, Building, Contact Name, Phone).'
      });
      return;
    }

    // Validate that coordinates are set (either from map click OR address geocoding)
    const pickupCoordinates = pickupLocation?.coordinates;
    const dropoffCoordinates = dropoffLocation?.coordinates;

    if (!pickupCoordinates || !dropoffCoordinates) {
      const errorParts = [];
      if (!pickupCoordinates) {
        errorParts.push('Pickup location coordinates not set - click on map or fill address fields (country/city required)');
      }
      if (!dropoffCoordinates) {
        errorParts.push('Delivery location coordinates not set - click on map or fill address fields (country/city required)');
      }

      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Location Coordinates Required',
        message: errorParts.join('. ') + ' Use the interactive map or fill address fields (at least country and city) to set coordinates.'
      });
      return;
    }

    // Prepare complete order data - always include coordinates
    const completeOrderData = {
      ...orderData,
      pickupLocation,
      dropoffLocation,
      pickupAddress,
      dropoffAddress,
      routeInfo  // Include route info with OSRM polyline
    };

    try {
      // Show loading state
      setLoading(true);

      // Attempt to submit the order
      await onSubmit(completeOrderData);

      // Show success modal on successful submission
      setModalState({
        isOpen: true,
        type: 'success',
        title: '🚀 Order Published Successfully!',
        message: `Your order "${orderData.title}" has been published and is now available for heroes to accept. Track its progress from the Orders page.`
      });

      // Clear loading state
      setLoading(false);

    } catch (error) {
      // Show error modal on failure
      setLoading(false);
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Failed to Publish Order',
        message: `❌ ${error.message || 'An unexpected error occurred while publishing your order. Please try again.'}`
      });
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      type: '',
      title: '',
      message: ''
    });
  };

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
      border: '2px solid #00AA00',
      borderRadius: '0.75rem',
      padding: isMobile ? '1rem' : '2rem',
      maxHeight: '85vh',
      overflowY: 'auto'
    }}>
      <h2 style={{
        fontSize: isMobile ? '1.25rem' : '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#30FF30',
        textShadow: '0 0 10px #30FF30',
        fontFamily: 'Consolas, Monaco, Courier New, monospace'
      }}>
        📦 {t('orders.createNewOrder')}
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Basic Order Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#30FF30',
            textShadow: '0 0 10px #30FF30'
          }}>
            📋 {t('orders.orderDetails')}
          </h3>
          <div style={{
            background: 'rgba(0, 17, 0, 0.8)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px solid #00AA00'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📝 {t('orders.title')} *
                </label>
                <input
                  type="text"
                  value={orderData.title}
                  onChange={(e) => setOrderData({ ...orderData, title: e.target.value })}
                  placeholder="e.g., Deliver package to office"
                  required
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  💰 {t('orders.price')} (USD) *
                </label>
                <input
                  type="number"
                  value={orderData.price}
                  onChange={(e) => setOrderData({ ...orderData, price: e.target.value })}
                  placeholder="e.g., 50"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📄 {t('orders.description')}
                </label>
                <textarea
                  value={orderData.description}
                  onChange={(e) => setOrderData({ ...orderData, description: e.target.value })}
                  placeholder="Brief description of the delivery..."
                  rows="2"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location Selection - Combined Map + Manual Entry */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem'
          }}>
            {/* Pickup Location - Map + Manual Combined */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#16A34A' }}>
                📤 {t('orders.pickupLocation')} *
              </h3>
              <LocationEntryCombined
                mapLocation={pickupLocation}
                onMapLocationChange={setPickupLocation}
                addressData={pickupAddress}
                onAddressChange={setPickupAddress}
                userLocation={userLocation}
                markerColor="green"
                API_URL={API_URL}
                locationType="pickup"
                compact={true}
                countries={countries}
                t={t}
                validationErrors={pickupErrors}
              />
            </div>

            {/* Dropoff Location - Map + Manual Combined */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#DC2626' }}>
                📥 {t('orders.deliveryLocation')} *
              </h3>
              <LocationEntryCombined
                mapLocation={dropoffLocation}
                onMapLocationChange={setDropoffLocation}
                addressData={dropoffAddress}
                onAddressChange={setDropoffAddress}
                userLocation={pickupLocation?.coordinates || userLocation}
                markerColor="red"
                API_URL={API_URL}
                locationType="delivery"
                compact={true}
                countries={countries}
                t={t}
                validationErrors={dropoffErrors}
              />
            </div>
          </div>
        </div>

        {/* Route Preview removed to keep only two maps in the form */}

        {/* Package Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#30FF30',
            textShadow: '0 0 10px #30FF30'
          }}>
            📦 {t('orders.packageDetails')}
          </h3>
          <div style={{
            background: 'rgba(0, 17, 0, 0.8)',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px solid #00AA00'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.75rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📝 {t('orders.packageDescription')}
                </label>
                <input
                  type="text"
                  value={orderData.package_description}
                  onChange={(e) => setOrderData({ ...orderData, package_description: e.target.value })}
                  placeholder="e.g., Documents, Electronics"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  ⚖️ {t('orders.weight')} (kg)
                </label>
                <input
                  type="number"
                  value={orderData.package_weight}
                  onChange={(e) => setOrderData({ ...orderData, package_weight: e.target.value })}
                  placeholder="e.g., 2.5"
                  min="0"
                  step="0.1"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  💰 {t('orders.estimatedValue')} (USD)
                </label>
                <input
                  type="number"
                  value={orderData.estimated_value}
                  onChange={(e) => setOrderData({ ...orderData, estimated_value: e.target.value })}
                  placeholder="e.g., 100"
                  min="0"
                  step="0.01"
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📅 {t('orders.estimatedDeliveryDate')}
                </label>
                <input
                  type="datetime-local"
                  value={orderData.estimated_delivery_date}
                  onChange={(e) => setOrderData({ ...orderData, estimated_delivery_date: e.target.value })}
                  style={{
                    width: '100%',
                    height: '44px',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  marginBottom: '0.5rem',
                  color: '#30FF30',
                  textShadow: '0 0 5px #30FF30'
                }}>
                  📋 {t('orders.specialInstructions')}
                </label>
                <textarea
                  value={orderData.special_instructions}
                  onChange={(e) => setOrderData({ ...orderData, special_instructions: e.target.value })}
                  placeholder="Any special handling instructions..."
                  rows="2"
                  style={{
                    width: '100%',
                    background: 'rgba(0, 17, 0, 0.8)',
                    color: '#30FF30',
                    border: '2px solid #00AA00',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    padding: '0.375rem 0.5rem',
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div style={{
          display: 'flex',
          gap: isMobile ? '0.75rem' : '1rem',
          justifyContent: 'flex-end',
          position: isMobile ? 'sticky' : 'relative',
          bottom: isMobile ? '0' : 'auto',
          background: isMobile ? '#000000' : 'transparent',
          padding: isMobile ? '1rem' : '0',
          margin: isMobile ? '0 -1rem -1rem -1rem' : '0',
          borderTop: isMobile ? '2px solid #00AA00' : 'none'
        }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: isMobile ? '0.625rem 1.25rem' : '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #001100 0%, #000000 100%)',
              color: '#30FF30',
              border: '2px solid #00AA00',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.4)';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.2)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            ❎ {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !pickupLocation?.coordinates || !dropoffLocation?.coordinates}
            style={{
              padding: isMobile ? '0.625rem 1.25rem' : '0.75rem 1.5rem',
              background: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ?
                'linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)' : '#333333',
              color: '#30FF30',
              border: '2px solid #00AA00',
              borderRadius: '0.375rem',
              cursor: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              opacity: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ? 1 : 0.5,
              boxShadow: (pickupLocation?.coordinates && dropoffLocation?.coordinates) ?
                '0 0 20px rgba(0, 255, 0, 0.6)' : 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
                e.target.style.boxShadow = '0 0 30px rgba(0, 255, 0, 0.8)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseOut={(e) => {
              if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
                e.target.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.6)';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {loading ? '⏳ ' + t('orders.creating') : '🚀 ' + t('orders.publishOrder')}
          </button>
        </div>
      </form>

      {/* Success/Error Modal */}
      <MessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

// ============ MAP LOCATION PICKER COMPONENT ============
const MapLocationPicker = ({ location, onChange, onAddressFill, userLocation, markerColor, API_URL, locationType, compact = false, t }) => {
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleMapClick = async (coords) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/locations/reverse?lat=${coords.lat}&lng=${coords.lng}`
      );

      if (!response.ok) throw new Error('Failed to geocode location');
      const data = await response.json();
      const loc = {
        coordinates: { lat: data.lat, lng: data.lng },
        displayName: data.displayName,
        address: {
          country: data.address?.country || '',
          city: data.address?.city || '',
          area: data.address?.area || '',
          street: data.address?.street || '',
          building: data.address?.buildingNumber || '',
          floor: '',
          apartment: data.address?.apartmentNumber || ''
        }
      };
      onChange(loc);
      if (onAddressFill && data && data.address) {
        onAddressFill({
          country: data.address.country || '',
          city: data.address.city || '',
          area: data.address.area || '',
          street: data.address.street || '',
          building: data.address.buildingNumber || '',
          floor: data.address.floor || '',
          apartment: data.address.apartmentNumber || '',
          personName: data.address.personName || ''
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlPaste = async () => {
    if (!mapUrl.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/locations/parse-maps-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: mapUrl })
      });

      if (!response.ok) throw new Error('Invalid Google Maps URL');
      const data = await response.json();
      onChange(data);
      setMapUrl('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: '#F9FAFB',
      padding: compact ? '0.75rem' : '1rem',
      borderRadius: '0.5rem',
      border: '1px solid #E5E7EB'
    }}>
      {/* Google Maps URL Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{
          display: 'block',
          fontSize: compact ? '0.625rem' : '0.75rem',
          fontWeight: '600',
          marginBottom: '0.5rem',
          color: '#6B7280'
        }}>
          📍 {t('orders.googleMapsLink')} ({t('common.optional')})
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder={t('orders.pasteGoogleMapsLink')}
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            style={{
              flex: 1,
              padding: compact ? '0.375rem 0.5rem' : '0.5rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.375rem',
              fontSize: compact ? '0.75rem' : '0.875rem'
            }}
          />
          <button
            type="button"
            onClick={handleUrlPaste}
            disabled={loading || !mapUrl.trim()}
            style={{
              padding: compact ? '0.375rem 1rem' : '0.5rem 1rem',
              background: '#4F46E5',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loading || !mapUrl.trim() ? 'not-allowed' : 'pointer',
              fontSize: compact ? '0.75rem' : '0.875rem',
              fontWeight: '600',
              opacity: loading || !mapUrl.trim() ? 0.5 : 1
            }}
          >
            {loading ? '...' : t('common.parse')}
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#FEE2E2',
          color: '#991B1B',
          padding: compact ? '0.5rem' : '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          fontSize: compact ? '0.75rem' : '0.875rem'
        }}>
          ⚠️ {error}
        </div>
      )}

      {compact && (
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#6B7280',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}
        >
          {showMap ? '🗺️ Hide Map' : '🗺️ Show Map'}
        </button>
      )}

      {/* Map (click to fullscreen) */}
      {(!compact || showMap) && !isFullscreen && (
        <div onClick={() => setIsFullscreen(true)} style={{
          height: compact ? '300px' : '400px',
          width: '100%',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          position: 'relative',
          minWidth: '100%',
          cursor: 'zoom-in'
        }}>
          {userLocation ? (
            <MapContainer
              center={location?.coordinates ? [location.coordinates.lat, location.coordinates.lng] : (userLocation ? [userLocation.lat, userLocation.lng] : [30.0444, 31.2357])}
              zoom={15}
              style={{
                height: '100%',
                width: '100%',
                zIndex: 1,
                position: 'relative'
              }}
              whenReady={(map) => {
                // Ensure map resizes properly and tiles load completely
                setTimeout(() => {
                  try {
                    if (map && typeof map.invalidateSize === 'function') {
                      map.invalidateSize();
                      window.dispatchEvent(new Event('resize'));
                    }
                  } catch (error) {
                    console.warn('Map invalidateSize failed:', error);
                  }
                }, 100);
              }}
              whenCreated={(map) => {
                // Force tile loading when map is created
                setTimeout(() => {
                  try {
                    if (map && typeof map.invalidateSize === 'function') {
                      map.invalidateSize();
                    }
                  } catch (error) {
                    console.warn('Map invalidateSize failed:', error);
                  }
                }, 200);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="http://localhost:5000/api/maps/tiles/{z}/{x}/{y}.png"
                maxZoom={19}
                minZoom={1}
                subdomains={[]}
                tileSize={256}
                updateWhenZooming={true}
                updateWhenIdle={false}
                keepBuffer={4}
                tms={false}
                zoomReverse={false}
                detectRetina={false}
                maxNativeZoom={18}
                minNativeZoom={0}
                zoomOffset={0}
                errorTileUrl="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNiMmIyYjIiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TWlzc2luZyBUaWxlPC90ZXh0Pjwvc3ZnPg=="
                crossOrigin={null}
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {location?.coordinates && (
                <DraggableMarker
                  key={`${location.coordinates.lat}-${location.coordinates.lng}`}
                  position={[location.coordinates.lat, location.coordinates.lng]}
                  icon={L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${markerColor}.png`
                  })}
                  onDragEnd={async (newPos) => await handleMapClick(newPos)}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                >
                  <Popup>
                    <strong>{locationType === 'pickup' ? t('orders.pickup') : t('orders.delivery')}</strong><br />
                    {location.displayName}
                  </Popup>
                </DraggableMarker>
              )}
              <MapUpdater center={location?.coordinates || userLocation} />
            </MapContainer>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              width: '100%',
              background: '#F3F4F6',
              color: '#6B7280',
              fontSize: '1rem'
            }}>
              🔄 Loading map...
            </div>
          )}
        </div>
      )}

      {isFullscreen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ position: 'absolute', top: 16, right: 16 }}>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              style={{
                background: 'white', color: '#111827', border: 'none',
                borderRadius: '0.375rem', padding: '0.5rem 0.75rem', cursor: 'pointer', fontWeight: 600
              }}
            >
              {t('common.close')}
            </button>
          </div>
          <div style={{ width: '100%', maxWidth: 900, height: '80vh', background: 'white', borderRadius: '0.5rem', overflow: 'hidden' }}>
            <MapContainer
              center={location?.coordinates ? [location.coordinates.lat, location.coordinates.lng] : (userLocation ? [userLocation.lat, userLocation.lng] : [30.0444, 31.2357])}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              whenReady={(map) => {
                setTimeout(() => { try { map.invalidateSize(); } catch (_) { } }, 150);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="http://localhost:5000/api/maps/tiles/{z}/{x}/{y}.png"
                maxZoom={19}
                minZoom={1}
                subdomains={[]}
                tileSize={256}
                updateWhenZooming={true}
                updateWhenIdle={false}
                keepBuffer={4}
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {location?.coordinates && (
                <DraggableMarker
                  key={`fs-${location.coordinates.lat}-${location.coordinates.lng}`}
                  position={[location.coordinates.lat, location.coordinates.lng]}
                  icon={L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41]
                  })}
                  onDragEnd={(newPos) => handleMapClick(newPos)}
                >
                  <Popup>
                    <strong>{locationType === 'pickup' ? t('orders.pickup') : t('orders.delivery')}</strong><br />
                    {location.displayName || 'Drag to set location'}
                  </Popup>
                </DraggableMarker>
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => handleMapClick(userLocation)}
          disabled={loading || !userLocation}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: '#10B981',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: loading || !userLocation ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            opacity: loading || !userLocation ? 0.5 : 1
          }}
        >
          📍 {t('orders.useCurrentLocation')}
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={!location}
          style={{
            padding: '0.5rem 1rem',
            background: '#EF4444',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: !location ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            opacity: !location ? 0.5 : 1
          }}
        >
          {t('common.clear')}
        </button>
      </div>

      {/* Address Display */}
      {location && (
        <div style={{ background: 'white', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.country')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.country || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.city')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.city || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.area')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.area || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.625rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                {t('orders.street')}
              </p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.street || 'N/A'}</p>
            </div>
          </div>

          {location.isRemote && (
            <div style={{ background: '#FEF3C7', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400E' }}>
                ⚠️ {t('orders.remoteAreaWarning')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ ROUTE PREVIEW MAP COMPONENT ============


// ============ DRAGGABLE MARKER COMPONENT ============
const DraggableMarker = ({ position, icon, onDragEnd, children, isDragging, setIsDragging }) => {
  const [markerPosition, setMarkerPosition] = useState(position);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    dragstart: () => {
      if (setIsDragging) {
        setIsDragging(true);
      }
    },
    dragend: (e) => {
      const newPos = e.target.getLatLng();
      const coords = { lat: newPos.lat, lng: newPos.lng };
      setMarkerPosition(newPos);

      // Update the location immediately when drag ends
      if (onDragEnd) {
        onDragEnd(coords);
      }

      if (setIsDragging) {
        setIsDragging(false);
      }
    }
  };

  return (
    <Marker
      position={markerPosition}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
};

// ============ HELPER COMPONENTS ============
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
};

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
      map.invalidateSize();
    }
  }, [center, map]);

  return null;
};

// ============ CASCADING LOCATION DATA HOOK ============
const useLocationData = (API_URL) => {
  const [cities, setCities] = useState({});
  const [areas, setAreas] = useState({});
  const [streets, setStreets] = useState({});

  // Major cities and areas for common countries as fallback
  const FALLBACK_CITIES = {
    'Egypt': [
      { value: 'Cairo', label: 'Cairo' },
      { value: 'Alexandria', label: 'Alexandria' },
      { value: 'Giza', label: 'Giza' },
      { value: 'Shubra El-Kheima', label: 'Shubra El-Kheima' },
      { value: 'Port Said', label: 'Port Said' },
      { value: 'Suez', label: 'Suez' },
      { value: 'Luxor', label: 'Luxor' },
      { value: 'Mansoura', label: 'Mansoura' },
      { value: 'Tanta', label: 'Tanta' },
      { value: 'Asyut', label: 'Asyut' },
      { value: 'Ismailia', label: 'Ismailia' },
      { value: 'Zagazig', label: 'Zagazig' },
      { value: 'Damanhur', label: 'Damanhur' },
      { value: 'Beni Suef', label: 'Beni Suef' },
      { value: 'Aswan', label: 'Aswan' }
    ],
    'Saudi Arabia': [
      { value: 'Riyadh', label: 'Riyadh' },
      { value: 'Jeddah', label: 'Jeddah' },
      { value: 'Mecca', label: 'Mecca' },
      { value: 'Medina', label: 'Medina' },
      { value: 'Dammam', label: 'Dammam' },
      { value: 'Khobar', label: 'Khobar' },
      { value: 'Taif', label: 'Taif' },
      { value: 'Tabuk', label: 'Tabuk' },
      { value: 'Buraydah', label: 'Buraydah' },
      { value: 'Khamis Mushait', label: 'Khamis Mushait' }
    ],
    'United Arab Emirates': [
      { value: 'Dubai', label: 'Dubai' },
      { value: 'Abu Dhabi', label: 'Abu Dhabi' },
      { value: 'Sharjah', label: 'Sharjah' },
      { value: 'Ajman', label: 'Ajman' },
      { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
      { value: 'Fujairah', label: 'Fujairah' },
      { value: 'Umm Al Quwain', label: 'Umm Al Quwain' }
    ],
    'Jordan': [
      { value: 'Amman', label: 'Amman' },
      { value: 'Zarqa', label: 'Zarqa' },
      { value: 'Irbid', label: 'Irbid' },
      { value: 'Russeifa', label: 'Russeifa' },
      { value: 'Wadi Al Seer', label: 'Wadi Al Seer' },
      { value: 'Al-Quwaysimah', label: 'Al-Quwaysimah' },
      { value: 'Aqaba', label: 'Aqaba' }
    ],
    'Lebanon': [
      { value: 'Beirut', label: 'Beirut' },
      { value: 'Tripoli', label: 'Tripoli' },
      { value: 'Sidon', label: 'Sidon' },
      { value: 'Tyre', label: 'Tyre' },
      { value: 'Byblos', label: 'Byblos' },
      { value: 'Jounieh', label: 'Jounieh' },
      { value: 'Zahle', label: 'Zahle' }
    ],
    'Kuwait': [
      { value: 'Kuwait City', label: 'Kuwait City' },
      { value: 'Al Ahmadi', label: 'Al Ahmadi' },
      { value: 'Hawalli', label: 'Hawalli' },
      { value: 'Al Jahra', label: 'Al Jahra' },
      { value: 'Al Farwaniyah', label: 'Al Farwaniyah' },
      { value: 'Al Asimah', label: 'Al Asimah' }
    ],
    'Qatar': [
      { value: 'Doha', label: 'Doha' },
      { value: 'Al Rayyan', label: 'Al Rayyan' },
      { value: 'Al Wakrah', label: 'Al Wakrah' },
      { value: 'Al Khor', label: 'Al Khor' },
      { value: 'Umm Salal', label: 'Umm Salal' }
    ],
    'Bahrain': [
      { value: 'Manama', label: 'Manama' },
      { value: 'Riffa', label: 'Riffa' },
      { value: 'Muharraq', label: 'Muharraq' },
      { value: 'Hamad Town', label: 'Hamad Town' }
    ],
    'Oman': [
      { value: 'Muscat', label: 'Muscat' },
      { value: 'Seeb', label: 'Seeb' },
      { value: 'Salalah', label: 'Salalah' },
      { value: 'Nizwa', label: 'Nizwa' },
      { value: 'Al Sohar', label: 'Al Sohar' }
    ]
  };

  // Areas/Regions for major cities
  const FALLBACK_AREAS = {
    'Egypt-Cairo': [
      { value: 'Downtown Cairo', label: 'Downtown Cairo' },
      { value: 'Zamalek', label: 'Zamalek' },
      { value: 'Heliopolis', label: 'Heliopolis' },
      { value: 'Nasr City', label: 'Nasr City' },
      { value: 'Maadi', label: 'Maadi' },
      { value: 'Mohandessin', label: 'Mohandessin' },
      { value: 'Dokki', label: 'Dokki' },
      { value: 'Garden City', label: 'Garden City' },
      { value: 'Abdeen', label: 'Abdeen' },
      { value: 'Manshiyat Naser', label: 'Manshiyat Naser' },
      { value: 'Islamic Cairo', label: 'Islamic Cairo' },
      { value: 'Coptic Cairo', label: 'Coptic Cairo' },
      { value: 'Tahrir Square', label: 'Tahrir Square' },
      { value: 'Roda Island', label: 'Roda Island' },
      { value: 'Zamalek', label: 'Zamalek' }
    ],
    'Egypt-Alexandria': [
      { value: 'Downtown Alexandria', label: 'Downtown Alexandria' },
      { value: 'Montaza', label: 'Montaza' },
      { value: 'Laurent', label: 'Laurent' },
      { value: 'Fleming', label: 'Fleming' },
      { value: 'Raml Station', label: 'Raml Station' },
      { value: 'Sidi Gaber', label: 'Sidi Gaber' },
      { value: 'Roushdy', label: 'Roushdy' },
      { value: 'Miami', label: 'Miami' },
      { value: 'San Stefano', label: 'San Stefano' },
      { value: 'Smouha', label: 'Smouha' },
      { value: 'Bacchus', label: 'Bacchus' },
      { value: 'Al Hadara', label: 'Al Hadara' },
      { value: 'Loran', label: 'Loran' },
      { value: 'Saba Pasha', label: 'Saba Pasha' },
      { value: 'Abou Qir', label: 'Abou Qir' }
    ],
    'Saudi Arabia': [
      { value: 'Riyadh', label: 'Riyadh' },
      { value: 'Jeddah', label: 'Jeddah' },
      { value: 'Mecca', label: 'Mecca' },
      { value: 'Medina', label: 'Medina' },
      { value: 'Dammam', label: 'Dammam' },
      { value: 'Khobar', label: 'Khobar' },
      { value: 'Taif', label: 'Taif' },
      { value: 'Tabuk', label: 'Tabuk' },
      { value: 'Buraydah', label: 'Buraydah' },
      { value: 'Khamis Mushait', label: 'Khamis Mushait' }
    ],
    'UAE': [
      { value: 'Dubai', label: 'Dubai' },
      { value: 'Abu Dhabi', label: 'Abu Dhabi' },
      { value: 'Sharjah', label: 'Sharjah' },
      { value: 'Ajman', label: 'Ajman' },
      { value: 'Ras Al Khaimah', label: 'Ras Al Khaimah' },
      { value: 'Fujairah', label: 'Fujairah' },
      { value: 'Umm Al Quwain', label: 'Umm Al Quwain' }
    ],
    'Jordan': [
      { value: 'Amman', label: 'Amman' },
      { value: 'Zarqa', label: 'Zarqa' },
      { value: 'Irbid', label: 'Irbid' },
      { value: 'Russeifa', label: 'Russeifa' },
      { value: 'Wadi Al Seer', label: 'Wadi Al Seer' },
      { value: 'Al-Quwaysimah', label: 'Al-Quwaysimah' },
      { value: 'Aqaba', label: 'Aqaba' }
    ],
    'Lebanon': [
      { value: 'Beirut', label: 'Beirut' },
      { value: 'Tripoli', label: 'Tripoli' },
      { value: 'Sidon', label: 'Sidon' },
      { value: 'Tyre', label: 'Tyre' },
      { value: 'Byblos', label: 'Byblos' },
      { value: 'Jounieh', label: 'Jounieh' },
      { value: 'Zahle', label: 'Zahle' }
    ],
    'Kuwait': [
      { value: 'Kuwait City', label: 'Kuwait City' },
      { value: 'Al Ahmadi', label: 'Al Ahmadi' },
      { value: 'Hawalli', label: 'Hawalli' },
      { value: 'Al Jahra', label: 'Al Jahra' },
      { value: 'Al Farwaniyah', label: 'Al Farwaniyah' },
      { value: 'Al Asimah', label: 'Al Asimah' }
    ],
    'Qatar': [
      { value: 'Doha', label: 'Doha' },
      { value: 'Al Rayyan', label: 'Al Rayyan' },
      { value: 'Al Wakrah', label: 'Al Wakrah' },
      { value: 'Al Khor', label: 'Al Khor' },
      { value: 'Umm Salal', label: 'Umm Salal' }
    ],
    'Bahrain': [
      { value: 'Manama', label: 'Manama' },
      { value: 'Riffa', label: 'Riffa' },
      { value: 'Muharraq', label: 'Muharraq' },
      { value: 'Hamad Town', label: 'Hamad Town' }
    ],
    'Oman': [
      { value: 'Muscat', label: 'Muscat' },
      { value: 'Seeb', label: 'Seeb' },
      { value: 'Salalah', label: 'Salalah' },
      { value: 'Nizwa', label: 'Nizwa' },
      { value: 'Al Sohar', label: 'Al Sohar' }
    ]
  };

  // Country name to ISO code mapping for better API queries
  const COUNTRY_CODES = {
    'Egypt': 'eg',
    'Saudi Arabia': 'sa',
    'United Arab Emirates': 'ae',
    'Jordan': 'jo',
    'Lebanon': 'lb',
    'Kuwait': 'kw',
    'Qatar': 'qa',
    'Bahrain': 'bh',
    'Oman': 'om',
    'Morocco': 'ma',
    'Tunisia': 'tn',
    'Algeria': 'dz',
    'Libya': 'ly',
    'Sudan': 'sd',
    'Yemen': 'ye',
    'Iraq': 'iq',
    'Syria': 'sy',
    'Palestine': 'ps'
  };

  // Function to search for cities by country
  const searchCities = async (country, query = '') => {
    const normalizedQuery = (query || '').trim().toLowerCase();
    const cacheKey = `${country}-${normalizedQuery}`;
    if (!country) return [];

    if (cities[cacheKey]) return cities[cacheKey];

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(c => ({ value: c, label: c }));
        if (options.length) {
          setCities(prev => ({ ...prev, [cacheKey]: options }));
          return options;
        }
      }
    } catch (_) { }

    if (FALLBACK_CITIES[country]) {
      const fallbackCities = FALLBACK_CITIES[country].filter(city =>
        !normalizedQuery || city.value.toLowerCase().includes(normalizedQuery)
      );
      if (fallbackCities.length) {
        setCities(prev => ({ ...prev, [cacheKey]: fallbackCities }));
        return fallbackCities;
      }
    }

    try {
      const nominatimParams = new URLSearchParams({
        format: 'json',
        limit: '20',
        addressdetails: '1',
        dedupe: '1',
        extratags: '1'
      });
      if (normalizedQuery) {
        nominatimParams.set('q', `${normalizedQuery}, ${country}`);
      } else {
        nominatimParams.set('q', `city in ${country}`);
      }

      const response = await fetch(`https://nominatim.openstreetmap.org/search?${nominatimParams.toString()}`);

      if (response.ok) {
        const data = await response.json();
        console.log(`Nominatim results for ${country}:`, data.length);

        if (data.length > 0) {
          const uniqueCities = [...new Set(data
            .map(item => {
              const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || item.display_name?.split(',')[0];
              return city ? city.trim() : null;
            })
            .filter(Boolean)
          )].slice(0, 25);

          if (uniqueCities.length > 0) {
            const cityList = uniqueCities.map(city => ({
              value: city,
              label: city
            }));

            console.log(`Found ${cityList.length} cities for ${country}:`, cityList.slice(0, 3));
            setCities(prev => ({ ...prev, [cacheKey]: cityList }));
            return cityList;
          }
        }
      }

      console.log(`Trying Photon API for ${country}`);
      const countryCode = COUNTRY_CODES[country] || country.toLowerCase().substring(0, 2);
      const photonQuery = normalizedQuery ? `${normalizedQuery} ${countryCode}` : `city in ${countryCode}`;
      const photonResponse = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&lang=en&limit=20&layer=city&layer=town&layer=village&layer=suburb`
      );

      if (photonResponse.ok) {
        const photonData = await photonResponse.json();
        console.log(`Photon results for ${country}:`, photonData.features?.length);

        if (photonData.features && photonData.features.length > 0) {
          const uniqueCities = [...new Set(photonData.features
            .map(feature => feature.properties?.name)
            .filter(Boolean)
          )].slice(0, 25);

          const cityList = uniqueCities.map(city => ({
            value: city,
            label: city
          }));

          console.log(`Found ${cityList.length} cities via Photon for ${country}`);
          setCities(prev => ({ ...prev, [cacheKey]: cityList }));
          return cityList;
        }
      }

      console.warn(`All APIs failed for ${country}, using fallback`);
      return await getFallbackCities(country, cacheKey, normalizedQuery);

    } catch (error) {
      console.warn(`City search failed for ${country}:`, error);
      return await getFallbackCities(country, cacheKey, normalizedQuery);
    }
  };

  const getFallbackCities = (country, cacheKey, normalizedQuery) => {
    const baseFallback = FALLBACK_CITIES[country] || [
      { value: 'Capital City', label: 'Capital City' },
      { value: 'Main City', label: 'Main City' },
      { value: 'Central City', label: 'Central City' }
    ];

    const fallbackCities = normalizedQuery
      ? baseFallback.filter(city => city.value.toLowerCase().includes(normalizedQuery))
      : baseFallback;

    setCities(prev => ({ ...prev, [cacheKey]: fallbackCities }));
    return fallbackCities;
  };

  // Simplified fallback search for when APIs are definitely down


  // Function to search for areas by country and city
  const searchAreas = async (country, city, query = '') => {
    const normalizedQuery = (query || '').trim().toLowerCase();
    const baseKey = `${country}-${city}`;
    const key = `${baseKey}-${normalizedQuery}`;
    if (!country || !city) return [];

    if (areas[key]) return areas[key];

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(a => ({ value: a, label: a }));
        if (options.length) {
          setAreas(prev => ({ ...prev, [key]: options }));
          return options;
        }
      }
    } catch (_) { }

    if (FALLBACK_AREAS[baseKey]) {
      const fallbackAreas = FALLBACK_AREAS[baseKey].filter(area =>
        !normalizedQuery || area.value.toLowerCase().includes(normalizedQuery)
      );
      if (fallbackAreas.length) {
        setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
        return fallbackAreas;
      }
    }

    try {
      const photonQuery = normalizedQuery ? `${normalizedQuery}, ${city}, ${country}` : `${city}, ${country}`;
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&lang=en&limit=20&layer=street&layer=locality`
      );

      if (!response.ok) {
        throw new Error(`Photon API failed for areas`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const areaOptions = data.features
          .map(feature => {
            const properties = feature.properties;

            const localityName = properties.locality;
            const districtName = properties.district;
            const suburbName = properties.suburb;

            const areaName = districtName || suburbName || localityName || properties.name;

            if (areaName && areaName !== city) {
              return {
                value: areaName,
                label: areaName,
                properties: properties
              };
            }
            return null;
          })
          .filter(Boolean);

        const uniqueAreas = [];
        const seenNames = new Set();

        areaOptions.forEach(area => {
          if (!seenNames.has(area.value)) {
            uniqueAreas.push(area);
            seenNames.add(area.value);
          }
        });

        const finalAreas = uniqueAreas.slice(0, 20);
        if (finalAreas.length > 0) {
          setAreas(prev => ({ ...prev, [key]: finalAreas }));
          return finalAreas;
        }
      }

      return await fallbackSearchAreas(country, city, key, baseKey, normalizedQuery);

    } catch (error) {
      console.warn('Photon API failed for areas, falling back to Nominatim:', error);
      return await fallbackSearchAreas(country, city, key, baseKey, normalizedQuery);
    }
  };

  const fallbackSearchAreas = async (country, city, key, baseKey, normalizedQuery) => {
    try {
      const params = new URLSearchParams({
        country: country,
        city: city,
        format: 'json',
        limit: '20',
        addressdetails: '1',
        dedupe: '1'
      });
      if (normalizedQuery) {
        params.set('q', `${normalizedQuery}, ${city}, ${country}`);
      }
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const uniqueAreas = [...new Set(data.map(item =>
        item.address?.suburb || item.address?.neighbourhood || item.address?.district
      ).filter(Boolean))].slice(0, 20);

      const areaList = uniqueAreas.map(area => ({ value: area, label: area }));

      const fallbackAreas = areaList.length > 0 ? areaList : (FALLBACK_AREAS[baseKey] || []);
      setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
      return fallbackAreas;

    } catch (error) {
      console.warn('Failed to fetch areas:', error);
      const fallbackAreas = (FALLBACK_AREAS[baseKey] || []).filter(area =>
        !normalizedQuery || area.value.toLowerCase().includes(normalizedQuery)
      );
      if (fallbackAreas.length > 0) {
        setAreas(prev => ({ ...prev, [key]: fallbackAreas }));
        return fallbackAreas;
      }
      return [];
    }
  };

  // Function to search for streets by country, city, and area
  const searchStreets = async (country, city, area, query = '') => {
    const normalizedQuery = (query || '').trim().toLowerCase();
    const baseKey = `${country}-${city}-${area}`;
    const key = `${baseKey}-${normalizedQuery}`;
    if (!country || !city || !area) return [];

    if (streets[key]) return streets[key];

    try {
      const params = new URLSearchParams({ limit: '50' });
      if (normalizedQuery) {
        params.set('q', normalizedQuery);
      }
      const res = await fetch(`${API_URL}/locations/countries/${encodeURIComponent(country)}/cities/${encodeURIComponent(city)}/areas/${encodeURIComponent(area)}/streets?${params.toString()}`);
      if (res.ok) {
        const list = await res.json();
        const options = (Array.isArray(list) ? list : []).map(s => ({ value: s, label: s }));
        if (options.length) {
          setStreets(prev => ({ ...prev, [key]: options }));
          return options;
        }
      }
    } catch (_) { }

    try {
      const photonQuery = normalizedQuery ? `${normalizedQuery}, ${area}, ${city}, ${country}` : `${area}, ${city}, ${country}`;
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(photonQuery)}&lang=en&limit=20&layer=street&layer=locality`
      );

      if (!response.ok) {
        throw new Error(`Photon API failed for streets`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const streetOptions = data.features
          .map(feature => {
            const properties = feature.properties;

            const streetName = properties.street || properties.name;

            if (streetName) {
              return {
                value: streetName,
                label: streetName,
                properties: properties
              };
            }
            return null;
          })
          .filter(Boolean);

        const uniqueStreets = [];
        const seenNames = new Set();

        streetOptions.forEach(street => {
          if (!seenNames.has(street.value)) {
            uniqueStreets.push(street);
            seenNames.add(street.value);
          }
        });

        const finalStreets = uniqueStreets.slice(0, 20);
        if (finalStreets.length > 0) {
          setStreets(prev => ({ ...prev, [key]: finalStreets }));
          return finalStreets;
        }
      }

      return await fallbackSearchStreets(country, city, area, key, baseKey, normalizedQuery);

    } catch (error) {
      console.warn('Photon API failed for streets, falling back to Nominatim:', error);
      return await fallbackSearchStreets(country, city, area, key, baseKey, normalizedQuery);
    }
  };

  const fallbackSearchStreets = async (country, city, area, key, baseKey, normalizedQuery) => {
    try {
      const params = new URLSearchParams({
        country: country,
        city: city,
        suburb: area,
        format: 'json',
        limit: '20',
        addressdetails: '1',
        dedupe: '1'
      });
      if (normalizedQuery) {
        params.set('q', `${normalizedQuery}, ${area}, ${city}, ${country}`);
      }
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) return [];

      const data = await response.json();
      const uniqueStreets = [...new Set(data.map(item =>
        item.address?.road || item.address?.street || item.address?.pedestrian
      ).filter(Boolean))].slice(0, 20);

      const streetList = uniqueStreets.map(street => ({ value: street, label: street }));

      const finalList = streetList.length > 0 ? streetList : [];
      setStreets(prev => ({ ...prev, [key]: finalList }));
      return finalList;

    } catch (error) {
      console.warn('Failed to fetch streets:', error);
      const cachedBase = streets[`${baseKey}-`] || [];
      return cachedBase.filter(street =>
        !normalizedQuery || street.value.toLowerCase().includes(normalizedQuery)
      );
    }
  };

  // Function to geocode an address and update map
  const geocodeAddress = async (addressData, onLocationChange) => {
    try {
      if (!addressData.country || !addressData.city) {
        return;
      }

      const qParts = [
        addressData.street,
        addressData.building,
        addressData.area,
        addressData.city,
        addressData.country
      ].filter(Boolean);
      const q = qParts.join(', ');

      const response = await fetch(`${API_URL}/locations/search?q=${encodeURIComponent(q)}`);

      if (!response.ok) {
        console.warn('Address geocoding failed:', response.statusText);
        return;
      }

      const data = await response.json();

      if (data && data.coordinates) {
        // Create location object similar to reverse geocoding
        const location = {
          coordinates: data.coordinates,
          locationLink: data.locationLink,
          address: {
            ...data.address,
            personName: addressData.personName,
            personPhone: addressData.personPhone,
            floor: addressData.floor,
            apartment: addressData.apartment
          },
          displayName: data.displayName,
          isRemote: false // Will be determined later if needed
        };

        onLocationChange(location);
      }
    } catch (error) {
      console.warn('Address geocoding error:', error);
    }
  };

  return {
    searchCities,
    searchAreas,
    searchStreets,
    geocodeAddress,
    getCities: (country) => cities[`${country}-`] || [],
    getAreas: (country, city) => areas[`${country}-${city}-`] || [],
    getStreets: (country, city, area) => streets[`${country}-${city}-${area}-`] || []
  };
};

// ============ COMBINED LOCATION ENTRY (Map + Address Fields Together - MATRIX STYLE) ============
const LocationEntryCombined = ({
  mapLocation,
  onMapLocationChange,
  addressData,
  onAddressChange,
  userLocation,
  markerColor,
  API_URL,
  locationType,
  compact = false,
  countries = [],
  t,
  validationErrors = {}
}) => {
  const locationData = useLocationData(API_URL);


  // State for cascaded dropdowns
  const [availableCities, setAvailableCities] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [availableStreets, setAvailableStreets] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const citySearchTimer = useRef(null);
  const areaSearchTimer = useRef(null);
  const streetSearchTimer = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(citySearchTimer.current);
      clearTimeout(areaSearchTimer.current);
      clearTimeout(streetSearchTimer.current);
    };
  }, []);

  const triggerCitySearch = (value = '', overrideCountry) => {
    const selectedCountry = overrideCountry || addressData.country;
    if (!selectedCountry) {
      setAvailableCities([]);
      return;
    }
    const normalizedQuery = (value || '').trim();
    const effectiveQuery = normalizedQuery.length >= 2 ? normalizedQuery : '';
    clearTimeout(citySearchTimer.current);
    setLoadingCities(true);
    const timer = setTimeout(async () => {
      try {
        const result = await locationData.searchCities(selectedCountry, effectiveQuery);
        if (citySearchTimer.current === timer) {
          setAvailableCities(result);
        }
      } catch (error) {
        console.warn('City search error:', error);
      } finally {
        if (citySearchTimer.current === timer) {
          setLoadingCities(false);
        }
      }
    }, 250);
    citySearchTimer.current = timer;
  };

  const triggerAreaSearch = (value = '', overrideCity) => {
    const selectedCountry = addressData.country;
    const selectedCity = overrideCity || addressData.city;
    if (!selectedCountry || !selectedCity) {
      setAvailableAreas([]);
      return;
    }
    const normalizedQuery = (value || '').trim();
    const effectiveQuery = normalizedQuery.length >= 2 ? normalizedQuery : '';
    clearTimeout(areaSearchTimer.current);
    setLoadingAreas(true);
    const timer = setTimeout(async () => {
      try {
        const result = await locationData.searchAreas(selectedCountry, selectedCity, effectiveQuery);
        if (areaSearchTimer.current === timer) {
          setAvailableAreas(result);
        }
      } catch (error) {
        console.warn('Area search error:', error);
      } finally {
        if (areaSearchTimer.current === timer) {
          setLoadingAreas(false);
        }
      }
    }, 250);
    areaSearchTimer.current = timer;
  };

  const triggerStreetSearch = (value = '', overrideArea) => {
    const selectedCountry = addressData.country;
    const selectedCity = addressData.city;
    const selectedArea = overrideArea || addressData.area;
    if (!selectedCountry || !selectedCity || !selectedArea) {
      setAvailableStreets([]);
      return;
    }
    const normalizedQuery = (value || '').trim();
    const effectiveQuery = normalizedQuery.length >= 2 ? normalizedQuery : '';
    clearTimeout(streetSearchTimer.current);
    setLoadingStreets(true);
    const timer = setTimeout(async () => {
      try {
        const result = await locationData.searchStreets(selectedCountry, selectedCity, selectedArea, effectiveQuery);
        if (streetSearchTimer.current === timer) {
          setAvailableStreets(result);
        }
      } catch (error) {
        console.warn('Street search error:', error);
      } finally {
        if (streetSearchTimer.current === timer) {
          setLoadingStreets(false);
        }
      }
    }, 250);
    streetSearchTimer.current = timer;
  };

  useEffect(() => {
    if (!addressData.country) {
      setAvailableCities([]);
      return;
    }
    triggerCitySearch('', addressData.country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressData.country]);

  useEffect(() => {
    if (!addressData.country || !addressData.city) {
      setAvailableAreas([]);
      return;
    }
    triggerAreaSearch('', addressData.city);
    // Geocode when city changes (with enough info)
    setTimeout(() => locationData.geocodeAddress(addressData, onMapLocationChange), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressData.city, addressData.country]);

  useEffect(() => {
    if (!addressData.country || !addressData.city || !addressData.area) {
      setAvailableStreets([]);
      return;
    }
    triggerStreetSearch('', addressData.area);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressData.area, addressData.city, addressData.country]);

  // Handle country change - load cities
  const handleCountryChange = async (country) => {
    const newAddress = { ...addressData, country, city: '', area: '', street: '' };
    onAddressChange(newAddress);

    if (country) {
      setLoadingCities(true);
      const cities = await locationData.searchCities(country);
      setAvailableCities(cities);
      setLoadingCities(false);
      setAvailableAreas([]);
      setAvailableStreets([]);
    } else {
      setAvailableCities([]);
      setAvailableAreas([]);
      setAvailableStreets([]);
    }
  };

  // Handle city change - load areas
  const handleCityChange = async (city) => {
    const newAddress = { ...addressData, city, area: '', street: '' };
    onAddressChange(newAddress);

    if (addressData.country && city) {
      setLoadingAreas(true);
      const areas = await locationData.searchAreas(addressData.country, city);
      setAvailableAreas(areas);
      setLoadingAreas(false);
      setAvailableStreets([]);
    } else {
      setAvailableAreas([]);
      setAvailableStreets([]);
    }

    // Geocode when city changes (with enough info)
    setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  };

  // Handle area change - load streets
  const handleAreaChange = async (area) => {
    const newAddress = { ...addressData, area, street: '' };
    onAddressChange(newAddress);

    if (addressData.country && addressData.city && area) {
      setLoadingStreets(true);
      const streets = await locationData.searchStreets(addressData.country, addressData.city, area);
      setAvailableStreets(streets);
      setLoadingStreets(false);
    } else {
      setAvailableStreets([]);
    }

    // Geocode when area changes
    setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  };

  // Handle other field changes - geocode for street, building, floor, apartment
  const handleFieldChange = (field, value) => {
    const newAddress = { ...addressData, [field]: value };
    onAddressChange(newAddress);

    if (['street', 'building', 'floor', 'apartment'].includes(field)) {
      setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 300);
    }
  };

  // Handle selecting a saved address
  const handleSavedAddressSelect = (savedLocation) => {
    // Update map location
    onMapLocationChange(savedLocation);

    // Update address form fields
    if (savedLocation.address) {
      onAddressChange({
        ...addressData,
        ...savedLocation.address,
        country: savedLocation.address.country || addressData.country,
        city: savedLocation.address.city || '',
        area: savedLocation.address.area || '',
        street: savedLocation.address.street || '',
        building: savedLocation.address.building || '',
        floor: savedLocation.address.floor || '',
        apartment: savedLocation.address.apartment || ''
      });
    }
  };

  return (
    <div className="card" style={{
      background: 'linear-gradient(135deg, #000000 0%, #001100 100%)',
      border: '2px solid #00AA00',
      borderRadius: '0.75rem',
      overflow: 'hidden'
    }}>
      {/* Saved Address Selector */}
      <div style={{ padding: '1rem', borderBottom: '1px solid #00AA00', background: 'rgba(0,30,0,0.3)' }}>
        <SavedAddressSelector
          onSelect={handleSavedAddressSelect}
          currentAddress={addressData}
          currentCoordinates={mapLocation?.coordinates}
          onSaved={() => { }}
          t={t}
        />
      </div>
      {/* Map Section - Full Width - MOVED TO TOP */}
      <div style={{ padding: '1rem', borderBottom: '2px solid #00AA00' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.75rem'
        }}>
          <h4 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#30FF30',
            textShadow: '0 0 10px #30FF30'
          }}>
            🗺️ Interactive Map
          </h4>
        </div>

        <MapLocationPicker
          location={mapLocation}
          onChange={(loc) => {
            onMapLocationChange(loc);
          }}
          onAddressFill={(addr) => {
            onAddressChange({
              ...addressData,
              ...addr
            });
          }}
          userLocation={userLocation}
          markerColor={markerColor}
          API_URL={API_URL}
          locationType={locationType}
          compact={true}
          t={t}
        />
      </div>

      {/* Address Fields Section - NOW BELOW MAP */}
      <div style={{ padding: '1rem' }}>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#30FF30',
          marginBottom: '0.75rem',
          textShadow: '0 0 10px #30FF30'
        }}>
          📝 {locationType === 'pickup' ? t('orders.pickupLocation') : t('orders.deliveryLocation')} Details
        </h4>

        <div className="address-fields-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🌍 {t('orders.country')} *
            </label>
            <input
              type="text"
              value={addressData.country || ''}
              onChange={(e) => onAddressChange({ ...addressData, country: e.target.value })}
              placeholder={t('orders.selectCountry')}
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.country ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🏙️ {t('orders.city')} *
            </label>
            <input
              type="text"
              value={addressData.city || ''}
              onChange={(e) => onAddressChange({ ...addressData, city: e.target.value })}
              placeholder="Enter city"
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.city ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🏘️ {t('orders.area')} *
            </label>
            <input
              type="text"
              value={addressData.area || ''}
              onChange={(e) => onAddressChange({ ...addressData, area: e.target.value })}
              placeholder="Enter area"
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.area ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🛣️ {t('orders.street')} *
            </label>
            <input
              type="text"
              value={addressData.street || ''}
              onChange={(e) => onAddressChange({ ...addressData, street: e.target.value })}
              placeholder="Enter street"
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.street ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              🏢 {t('orders.building')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.5rem' }}>
              <input
                type="text"
                value={addressData.building || ''}
                onChange={(e) => onAddressChange({ ...addressData, building: e.target.value })}
                placeholder={t('orders.buildingNumber')}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: '#30FF30',
                  border: validationErrors?.building ? '2px solid #EF4444' : '2px solid #00AA00',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  padding: '0.5rem',
                  outline: 'none'
                }}
                required
              />
              <input
                type="text"
                value={addressData.floor || ''}
                onChange={(e) => onAddressChange({ ...addressData, floor: e.target.value })}
                placeholder={t('orders.floor')}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: '#30FF30',
                  border: '2px solid #00AA00',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  padding: '0.5rem',
                  outline: 'none'
                }}
              />
              <input
                type="text"
                value={addressData.apartment || ''}
                onChange={(e) => onAddressChange({ ...addressData, apartment: e.target.value })}
                placeholder={t('orders.aptNumber')}
                style={{
                  width: '100%',
                  height: '44px',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: '#30FF30',
                  border: '2px solid #00AA00',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  padding: '0.5rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              👤 {t('orders.contactName')} *
            </label>
            <input
              type="text"
              value={addressData.personName || ''}
              onChange={(e) => onAddressChange({ ...addressData, personName: e.target.value })}
              placeholder={t('orders.contactPerson')}
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.personName ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#30FF30',
              marginBottom: '0.25rem',
              textShadow: '0 0 5px #30FF30'
            }}>
              ☎️ {t('orders.contactPhone')} *
            </label>
            <input
              type="tel"
              value={addressData.personPhone || ''}
              onChange={(e) => onAddressChange({ ...addressData, personPhone: e.target.value })}
              placeholder={t('orders.phoneNumber')}
              required
              style={{
                width: '100%',
                height: '44px',
                background: 'rgba(0, 17, 0, 0.8)',
                color: '#30FF30',
                border: validationErrors?.personPhone ? '2px solid #EF4444' : '2px solid #00AA00',
                borderRadius: '0.375rem',
                fontSize: '0.875rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                padding: '0.5rem',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen handled inside MapLocationPicker */}
    </div>
  );
};

// ============ LOCATION ENTRY COMPONENT (Address Fields + Map) ============

export default OrderCreationForm;
