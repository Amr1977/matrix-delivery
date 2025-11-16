// ============ UPDATED OrderCreationForm.jsx WITH MAP INTEGRATION ============
// Replace the existing OrderCreationForm component with this

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

const OrderCreationForm = ({ onSubmit, countries, t }) => {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
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
  
  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

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
  useEffect(() => {
    if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
      calculateRoute();
    }
  }, [pickupLocation?.coordinates, dropoffLocation?.coordinates]);
  
  const calculateRoute = async () => {
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
      setRouteInfo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!pickupLocation?.coordinates || !dropoffLocation?.coordinates) {
      setError('Please select both pickup and delivery locations on the map');
      return;
    }
    
    if (!orderData.title || !orderData.price) {
      setError('Title and price are required');
      return;
    }
    
    // Prepare complete order data
    const completeOrderData = {
      ...orderData,
      pickupLocation,
      dropoffLocation,
      routeInfo
    };
    
    onSubmit(completeOrderData);
  };
  
  return (
    <div style={{
      background: 'white',
      padding: isMobile ? '1rem' : '2rem',
      borderRadius: '0.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      maxHeight: '85vh',
      overflowY: 'auto'
    }}>
      <h2 style={{ fontSize: isMobile ? '1.25rem' : '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        📦 {t('orders.createNewOrder')}
      </h2>
      
      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Basic Order Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            📋 Order Details
          </h3>
          <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.title')} *
                </label>
                <input
                  type="text"
                  value={orderData.title}
                  onChange={(e) => setOrderData({...orderData, title: e.target.value})}
                  placeholder="e.g., Deliver package to office"
                  required
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.price')} (USD) *
                </label>
                <input
                  type="number"
                  value={orderData.price}
                  onChange={(e) => setOrderData({...orderData, price: e.target.value})}
                  placeholder="e.g., 50"
                  required
                  min="0"
                  step="0.01"
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.description')}
                </label>
                <textarea
                  value={orderData.description}
                  onChange={(e) => setOrderData({...orderData, description: e.target.value})}
                  placeholder="Brief description of the delivery..."
                  rows="2"
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Location Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: '1rem'
          }}>
            {/* Pickup Location */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#16A34A' }}>
                📤 {t('orders.pickupLocation')} *
              </h3>
              <MapLocationPicker
                location={pickupLocation}
                onChange={setPickupLocation}
                userLocation={userLocation}
                markerColor="green"
                API_URL={API_URL}
                locationType="pickup"
                compact={true}
                t={t}
              />
            </div>

            {/* Dropoff Location */}
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#DC2626' }}>
                📥 {t('orders.deliveryLocation')} *
              </h3>
              <MapLocationPicker
                location={dropoffLocation}
                onChange={setDropoffLocation}
                userLocation={pickupLocation?.coordinates || userLocation}
                markerColor="red"
                API_URL={API_URL}
                locationType="delivery"
                compact={true}
                t={t}
              />
            </div>
          </div>

          {/* Manual Entry Toggle - centered */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => setShowManualEntry(!showManualEntry)}
              style={{
                padding: '0.25rem 0.75rem',
                background: '#F3F4F6',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '0.375rem',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }}
            >
              {showManualEntry ? 'Use Map' : 'Manual Entry'}
            </button>
          </div>
        </div>
        
        {/* Route Preview */}
        {pickupLocation && dropoffLocation && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
              🗺️ {t('orders.routePreview')}
            </h3>
            <RoutePreviewMap
              pickup={pickupLocation.coordinates}
              dropoff={dropoffLocation.coordinates}
              routeInfo={routeInfo}
              loading={loading}
              compact={true}
              t={t}
            />
          </div>
        )}
        
        {/* Package Details */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
            📦 {t('orders.packageDetails')}
          </h3>
          <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #E5E7EB' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.75rem'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.packageDescription')}
                </label>
                <input
                  type="text"
                  value={orderData.package_description}
                  onChange={(e) => setOrderData({...orderData, package_description: e.target.value})}
                  placeholder="e.g., Documents, Electronics"
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.weight')} (kg)
                </label>
                <input
                  type="number"
                  value={orderData.package_weight}
                  onChange={(e) => setOrderData({...orderData, package_weight: e.target.value})}
                  placeholder="e.g., 2.5"
                  min="0"
                  step="0.1"
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.estimatedValue')} (USD)
                </label>
                <input
                  type="number"
                  value={orderData.estimated_value}
                  onChange={(e) => setOrderData({...orderData, estimated_value: e.target.value})}
                  placeholder="e.g., 100"
                  min="0"
                  step="0.01"
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.estimatedDeliveryDate')}
                </label>
                <input
                  type="datetime-local"
                  value={orderData.estimated_delivery_date}
                  onChange={(e) => setOrderData({...orderData, estimated_delivery_date: e.target.value})}
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  {t('orders.specialInstructions')}
                </label>
                <textarea
                  value={orderData.special_instructions}
                  onChange={(e) => setOrderData({...orderData, special_instructions: e.target.value})}
                  placeholder="Any special handling instructions..."
                  rows="2"
                  style={{ width: '100%', padding: '0.375rem 0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
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
          background: isMobile ? 'white' : 'transparent',
          padding: isMobile ? '1rem' : '0',
          margin: isMobile ? '0 -1rem -1rem' : '0',
          borderTop: isMobile ? '1px solid #E5E7EB' : 'none'
        }}>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: isMobile ? '0.625rem 1.25rem' : '0.75rem 1.5rem',
              background: '#F3F4F6',
              color: '#374151',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={loading || !pickupLocation || !dropoffLocation}
            style={{
              padding: isMobile ? '0.625rem 1.25rem' : '0.75rem 1.5rem',
              background: pickupLocation && dropoffLocation ? '#4F46E5' : '#9CA3AF',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: pickupLocation && dropoffLocation ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              fontSize: isMobile ? '0.875rem' : '1rem'
            }}
          >
            {loading ? t('orders.creating') : t('orders.publishOrder')}
          </button>
        </div>
      </form>
    </div>
  );
};

// ============ MAP LOCATION PICKER COMPONENT ============
const MapLocationPicker = ({ location, onChange, userLocation, markerColor, API_URL, locationType, compact = false, t }) => {
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(!compact);
  
  const handleMapClick = async (coords) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${API_URL}/locations/reverse-geocode?lat=${coords.lat}&lng=${coords.lng}`
      );
      
      if (!response.ok) throw new Error('Failed to geocode location');
      const data = await response.json();
      onChange(data);
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

      {/* Map */}
      {(!compact || showMap) && (
        <div style={{
          height: compact ? '250px' : '350px',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}>
        {userLocation ? (
          <MapContainer
            center={location?.coordinates ? [location.coordinates.lat, location.coordinates.lng] : [userLocation.lat, userLocation.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {location?.coordinates && (
              <Marker 
                position={[location.coordinates.lat, location.coordinates.lng]}
                icon={L.icon({
                  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41]
                })}
              >
                <Popup>
                  <strong>{locationType === 'pickup' ? t('orders.pickup') : t('orders.delivery')}</strong><br />
                  {location.displayName}
                </Popup>
              </Marker>
            )}
            <MapUpdater center={location?.coordinates || userLocation} />
          </MapContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#E5E7EB', color: '#6B7280' }}>
            {t('common.loadingMap')}
          </div>
        )}
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
const RoutePreviewMap = ({ pickup, dropoff, routeInfo, loading, compact = false, t }) => {
  const [showFullMap, setShowFullMap] = useState(false);

  if (!pickup || !dropoff) return null;

  const routePath = [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]];
  const estimates = Object.entries(routeInfo.estimates || {}).slice(0, 3); // First 3 estimates

  return (
    <div style={{
      background: compact ? '#F0F9FF' : '#F9FAFB',
      padding: '1rem',
      borderRadius: '0.5rem',
      border: compact ? '2px solid #DBEAFE' : '1px solid #E5E7EB'
    }}>
      {loading && (
        <div style={{
          background: '#FEF3C7',
          padding: compact ? '0.5rem' : '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          fontSize: compact ? '0.75rem' : '0.875rem'
        }}>
          🔄 {t('orders.calculatingRoute')}
        </div>
      )}

      {/* Route Info - moved above map for compact */}
      {routeInfo && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{
            display: compact ? 'inline-grid' : 'grid',
            gridTemplateColumns: compact ? '1fr auto auto' : '1fr 1fr',
            gap: compact ? '1rem' : '1rem',
            padding: '0.75rem',
            background: 'white',
            borderRadius: '0.375rem',
            border: '1px solid #E5E7EB',
            fontSize: compact ? '0.8125rem' : '0.875rem'
          }}>
            <div>
              <p style={{ fontSize: compact ? '0.6875rem' : '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                📏 {t('orders.totalDistance')}
              </p>
              <p style={{
                fontSize: compact ? '0.9375rem' : '1.5rem',
                fontWeight: 'bold',
                color: '#1E40AF'
              }}>
                {routeInfo.distance_km} km
              </p>
            </div>

            {!compact && (
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                  {t('orders.routeType')}
                </p>
                <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                  {routeInfo.route_found ? '✅ Optimized' : '⚠️ Estimate'}
                </p>
              </div>
            )}

            {/* Vehicle Estimates - show first 3 inline */}
            {estimates.map(([vehicle, data], index) => (
              <div key={vehicle} style={{
                textAlign: 'center',
                padding: compact ? '0.375rem' : '0.5rem'
              }}>
                <div style={{
                  fontSize: compact ? '1.125rem' : '1.5rem',
                  marginBottom: '0.125rem'
                }}>
                  {data.icon}
                </div>
                <p style={{
                  fontSize: compact ? '0.5625rem' : '0.625rem',
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'capitalize',
                  marginBottom: '0.125rem'
                }}>
                  {vehicle === 'bicycle' ? t('orders.bicycle') : vehicle === 'walker' ? t('orders.walker') : vehicle}
                </p>
                <p style={{
                  fontSize: compact ? '0.75rem' : '1rem',
                  fontWeight: 'bold',
                  color: '#1F2937'
                }}>
                  {data.duration_minutes}m
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button for compact mode */}
      {compact && (
        <button
          type="button"
          onClick={() => setShowFullMap(!showFullMap)}
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#4F46E5',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}
        >
          🗺️ {showFullMap ? 'Hide Map' : 'View Full Route Map'}
        </button>
      )}

      {/* Map - conditionally rendered */}
      {(!compact || showFullMap) && (
        <div style={{
          height: compact ? '200px' : '300px',
          marginBottom: '1rem',
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}>
          <MapContainer
            center={[(pickup.lat + dropoff.lat) / 2, (pickup.lng + dropoff.lng) / 2]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker
              position={[pickup.lat, pickup.lng]}
              icon={L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
              })}
            >
              <Popup><strong>{t('orders.pickup')}</strong></Popup>
            </Marker>
            <Marker
              position={[dropoff.lat, dropoff.lng]}
              icon={L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41]
              })}
            >
              <Popup><strong>{t('orders.delivery')}</strong></Popup>
            </Marker>
            <Polyline positions={routePath} color="#4F46E5" weight={4} opacity={0.7} />
          </MapContainer>
        </div>
      )}

      {/* Detailed Vehicle Estimates - only show in non-compact mode */}
      {routeInfo && !compact && Object.entries(routeInfo.estimates || {}).length > 3 && (
        <div>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#374151' }}>
            {t('orders.deliveryTimeEstimates')}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
            {Object.entries(routeInfo.estimates || {}).slice(3).map(([vehicle, data]) => (
              <div key={vehicle} style={{ background: 'white', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{data.icon}</div>
                <p style={{
                  fontSize: '0.625rem',
                  fontWeight: '600',
                  color: '#6B7280',
                  textTransform: 'capitalize',
                  marginBottom: '0.25rem'
                }}>
                  {vehicle === 'bicycle' ? t('orders.bicycle') : vehicle === 'walker' ? t('orders.walker') : vehicle}
                </p>
                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#1F2937' }}>
                  {data.duration_minutes}m
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
    }
  }, [center, map]);
  
  return null;
};

export default OrderCreationForm;
