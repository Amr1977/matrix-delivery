import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// ============ DEMO/TESTING COMPONENT ============
// This demonstrates all the map location picker features

const MapLocationPickerDemo = () => {
  const API_URL = 'http://localhost:5000/api';
  
  // State
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [agentPreferences, setAgentPreferences] = useState({
    max_distance_km: 50,
    accept_remote_areas: false,
    accept_international: false
  });

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
          // Default to Cairo, Egypt
          setUserLocation({ lat: 30.0444, lng: 31.2357 });
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
    setError('');
    
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

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>
        📍 Map Location Picker - Complete Demo
      </h1>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Delivery Agent Preferences */}
      <div style={{ background: '#F0F9FF', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem', border: '2px solid #DBEAFE' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          🚚 Delivery Agent Preferences (Filter Settings)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Max Distance (km)</span>
            <input
              type="number"
              value={agentPreferences.max_distance_km}
              onChange={(e) => setAgentPreferences({...agentPreferences, max_distance_km: parseFloat(e.target.value)})}
              style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={agentPreferences.accept_remote_areas}
              onChange={(e) => setAgentPreferences({...agentPreferences, accept_remote_areas: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Accept Remote Areas</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={agentPreferences.accept_international}
              onChange={(e) => setAgentPreferences({...agentPreferences, accept_international: e.target.checked})}
            />
            <span style={{ fontSize: '0.875rem', fontWeight: '600' }}>Accept International Orders</span>
          </label>
        </div>
      </div>

      {/* Pickup Location */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          📤 Pickup Location
        </h2>
        <MapLocationPicker
          location={pickupLocation}
          onChange={setPickupLocation}
          userLocation={userLocation}
          markerColor="green"
          API_URL={API_URL}
        />
      </div>

      {/* Dropoff Location */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          📥 Dropoff Location
        </h2>
        <MapLocationPicker
          location={dropoffLocation}
          onChange={setDropoffLocation}
          userLocation={pickupLocation?.coordinates || userLocation}
          markerColor="red"
          API_URL={API_URL}
        />
      </div>

      {/* Route Preview */}
      {pickupLocation && dropoffLocation && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            🗺️ Route Preview & Estimates
          </h2>
          <RoutePreviewMap
            pickup={pickupLocation.coordinates}
            dropoff={dropoffLocation.coordinates}
            routeInfo={routeInfo}
            loading={loading}
          />
        </div>
      )}

      {/* Order Summary */}
      {pickupLocation && dropoffLocation && routeInfo && (
        <div style={{ background: '#ECFDF5', padding: '1.5rem', borderRadius: '0.5rem', border: '2px solid #A7F3D0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            ✅ Order Summary
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Distance</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{routeInfo.distance_km} km</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Is Remote Area</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                {(pickupLocation.isRemote || dropoffLocation.isRemote) ? '⚠️ Yes' : '✅ No'}
              </p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Is International</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                {pickupLocation.address?.country !== dropoffLocation.address?.country ? '🌍 Yes' : '🏠 No'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ MAP LOCATION PICKER COMPONENT ============
const MapLocationPicker = ({ location, onChange, userLocation, markerColor = 'blue', API_URL }) => {
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleClear = () => {
    onChange(null);
    setMapUrl('');
    setError('');
  };

  const handleUseCurrentLocation = async () => {
    if (!userLocation) {
      setError('Current location not available');
      return;
    }
    
    await handleMapClick(userLocation);
  };

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {/* URL Input */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
          Google Maps Link (Optional)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Paste Google Maps link here..."
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
          />
          <button
            onClick={handleUrlPaste}
            disabled={loading || !mapUrl.trim()}
            style={{
              padding: '0.5rem 1rem',
              background: '#4F46E5',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: loading || !mapUrl.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !mapUrl.trim() ? 0.5 : 1
            }}
          >
            {loading ? 'Loading...' : 'Parse'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#FEE2E2', color: '#991B1B', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Map */}
      <div style={{ height: '400px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
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
                  <strong>Selected Location</strong><br />
                  {location.displayName}
                </Popup>
              </Marker>
            )}
            <MapUpdater center={location?.coordinates || userLocation} />
          </MapContainer>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#F3F4F6' }}>
            Loading map...
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={handleUseCurrentLocation}
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
            fontWeight: '600'
          }}
        >
          📍 Use Current Location
        </button>
        <button
          onClick={handleClear}
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
          Clear
        </button>
      </div>

      {/* Address Display */}
      {location && (
        <div style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Country</p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.country || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>City</p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.city || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Area</p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.area || 'N/A'}</p>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Street</p>
              <p style={{ fontSize: '0.875rem' }}>{location.address?.street || 'N/A'}</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>Location Link</p>
              <a 
                href={location.locationLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: '#4F46E5', textDecoration: 'underline', wordBreak: 'break-all' }}
              >
                {location.locationLink}
              </a>
            </div>
            {location.isRemote && (
              <div style={{ gridColumn: '1 / -1', background: '#FEF3C7', padding: '0.75rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400E' }}>
                  ⚠️ Remote Area Detected
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============ ROUTE PREVIEW MAP COMPONENT ============
const RoutePreviewMap = ({ pickup, dropoff, routeInfo, loading }) => {
  if (!pickup || !dropoff) return null;

  // Decode polyline if available (simplified - would use polyline library in production)
  const routePath = routeInfo?.polyline ? [] : [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]];

  return (
    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      {loading && (
        <div style={{ background: '#FEF3C7', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
          🔄 Calculating route...
        </div>
      )}

      {/* Map */}
      <div style={{ height: '400px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
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
            <Popup><strong>Pickup</strong></Popup>
          </Marker>
          <Marker 
            position={[dropoff.lat, dropoff.lng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })}
          >
            <Popup><strong>Dropoff</strong></Popup>
          </Marker>
          <Polyline positions={routePath} color="#FF6B00" weight={6} opacity={1.0} dashArray="12, 8" />
        </MapContainer>
      </div>

      {/* Distance and Duration */}
      {routeInfo && (
        <>
          <div style={{ marginBottom: '1rem', padding: '1rem', background: '#F0F9FF', borderRadius: '0.375rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Total Distance
                </p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E40AF' }}>
                  {routeInfo.distance_km} km
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>
                  Route Type
                </p>
                <p style={{ fontSize: '0.875rem', fontWeight: '600' }}>
                  {routeInfo.route_found ? '✅ Optimized Route' : '⚠️ Straight Line Estimate'}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Estimates */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
              Estimated Delivery Times by Vehicle Type
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
              {Object.entries(routeInfo.estimates || {}).map(([vehicle, data]) => (
                <div key={vehicle} style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{data.icon}</div>
                  <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                    {vehicle === 'bicycle' ? 'Bicycle' : vehicle}
                  </p>
                  <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1F2937' }}>
                    {data.duration_minutes} min
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                    ~{data.speed_kmh} km/h
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
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

export default MapLocationPickerDemo;
