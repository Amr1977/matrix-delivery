import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../../api';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom icons for different tracking states
const createCustomIcon = (type, status) => {
  let color = '#10B981'; // green
  if (status === 'completed') color = '#34D399';
  else if (status === 'upcoming') color = '#6B7280';
  else if (status === 'current') color = '#EF4444';

  return L.divIcon({
    className: 'custom-tracking-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${
      type === 'pickup' ? '📍' :
      type === 'delivery' ? '🏠' :
      type === 'driver' ? '🚗' : '📍'
    }</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

// Map controller to auto-fit bounds
const MapBoundsUpdater = ({ trackingData }) => {
  const map = useMap();

  useEffect(() => {
    if (trackingData) {
      const bounds = [];
      // Add pickup and delivery points to bounds
      if (trackingData.pickup && trackingData.pickup.location) {
        bounds.push([trackingData.pickup.location.lat, trackingData.pickup.location.lng]);
      }
      if (trackingData.delivery && trackingData.delivery.location) {
        bounds.push([trackingData.delivery.location.lat, trackingData.delivery.location.lng]);
      }
      // Add all route points to bounds
      if (trackingData.locationHistory && trackingData.locationHistory.length > 0) {
        trackingData.locationHistory.forEach(loc => {
          bounds.push([loc.lat, loc.lng]);
        });
      }

      // If we have bounds, fit the map to them
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [20, 20] });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      }
    }
  }, [trackingData, map]);

  return null;
};

// ========== LIVE TRACKING MAP COMPONENT ==========
const LiveTrackingMap = ({ orderId, t, compact = false }) => {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshIntervalRef = useRef(null);
  const mapRef = useRef(null);

  // Fetch tracking data
  const fetchTrackingData = async () => {
    try {
      let detailsResponse;
      try {
        detailsResponse = await api.get(`/orders/${orderId}/tracking`);
      } catch (primaryErr) {
        if (primaryErr && String(primaryErr.message).includes('HTTP 404')) {
          const ordersList = await api.get('/orders');
          const match = Array.isArray(ordersList)
            ? ordersList.find(o => o.orderNumber === orderId)
            : null;
          if (match && match._id) {
            detailsResponse = await api.get(`/orders/${match._id}/tracking`);
          } else {
            throw primaryErr;
          }
        } else {
          throw primaryErr;
        }
      }

      setTrackingData(detailsResponse);
      setError(null);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError(err.message || 'Failed to load tracking data');
    } finally {
      setLoading(false);
    }
  };

  // Start tracking updates when component mounts
  useEffect(() => {
    if (orderId) {
      fetchTrackingData(); // Initial load

      // Set up interval for live updates (every 10 seconds)
      refreshIntervalRef.current = setInterval(fetchTrackingData, 10000);
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [orderId]);

  // Calculate center point for map
  const getCenter = () => {
    if (trackingData?.currentLocation) {
      return [trackingData.currentLocation.lat, trackingData.currentLocation.lng];
    } else if (trackingData?.pickup?.location && trackingData?.delivery?.location) {
      return [
        (trackingData.pickup.location.lat + trackingData.delivery.location.lat) / 2,
        (trackingData.pickup.location.lng + trackingData.delivery.location.lng) / 2
      ];
    }
    return [30.0444, 31.2357]; // Cairo center
  };

  // Format time and distance
  const formatDistance = (distanceKm) => {
    if (!distanceKm) return 'N/A';
    return distanceKm < 1 ? `${(distanceKm * 1000).toFixed(0)}m` : `${distanceKm.toFixed(1)}km`;
  };

  const formatTime = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${Math.ceil(minutes)}min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.ceil(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Render loading state
  if (loading) {
    return (
      <div style={{
        background: 'rgba(0, 17, 0, 0.8)',
        border: '2px solid var(--matrix-border)',
        padding: '2rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        textAlign: 'center',
        color: 'var(--matrix-bright-green)',
        opacity: 0.95,
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Consolas, Monaco, Courier New, monospace'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid var(--matrix-border)',
          borderTop: '4px solid var(--matrix-bright-green)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem'
        }} />
        <p>Loading tracking data...</p>
        <p style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
          Connecting to live tracking system
        </p>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div style={{
        background: 'rgba(17, 0, 0, 0.8)',
        border: '2px solid #DC2626',
        padding: '2rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        textAlign: 'center',
        color: '#F87171',
        opacity: 0.95,
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Consolas, Monaco, Courier New, monospace'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
        <p style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{error}</p>
        <p style={{ fontSize: '0.875rem', color: '#F3F4F6' }}>
          {trackingData?.trackingStatus === 'not_started'
            ? 'Driver has not started tracking yet'
            : 'Unable to load tracking information'
          }
        </p>
      </div>
    );
  }

  // Render tracking map
  const center = getCenter();
  const hasCoordinates = (trackingData?.pickup && trackingData.pickup.location) || (trackingData?.delivery && trackingData.delivery.location);

  return (
    <div style={{
      background: 'rgba(0, 17, 0, 0.8)',
      border: '2px solid var(--matrix-border)',
      padding: compact ? '1rem' : '2rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      opacity: 0.95,
      color: 'var(--matrix-bright-green)',
      fontFamily: 'Consolas, Monaco, Courier New, monospace'
    }}>
      {/* Header with status and ETA */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h3 style={{
            color: 'var(--matrix-bright-green)',
            margin: '0 0 0.25rem 0',
            fontSize: '1.125rem'
          }}>
            📍 Live Tracking - Order {trackingData.orderNumber}
          </h3>
          <p style={{
            margin: 0,
            fontSize: '0.875rem',
            color: '#9CA3AF'
          }}>
            Status: <span style={{
              color: trackingData.status === 'in_transit' ? '#10B981' :
                     trackingData.status === 'picked_up' ? '#F59E0B' : '#6B7280',
              fontWeight: 'bold'
            }}>
              {trackingData.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </p>
        </div>

        {trackingData.nextPoint?.distanceKm && trackingData.nextPoint?.estimatedTimeMinutes && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#F3F4F6' }}>
              To {trackingData.nextPoint.type}
            </p>
            <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>
              {formatDistance(trackingData.nextPoint.distanceKm)}
            </p>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
              {formatTime(trackingData.nextPoint.estimatedTimeMinutes)} ETA
            </p>
          </div>
        )}
      </div>

      {/* Route steps */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        <div style={{
          flex: 1,
          padding: '0.75rem',
          border: `2px solid ${trackingData.status !== 'delivered' ? '#10B981' : '#34D399'}`,
          borderRadius: '0.375rem',
          background: 'rgba(16, 185, 129, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ marginRight: '0.5rem' }}>📍</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
              {trackingData.status === 'picked_up' || trackingData.status === 'in_transit' || trackingData.status === 'delivered'
                ? '✅ Pickup Complete'
                : 'Pickup'
              }
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.75rem',
            color: '#9CA3AF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {trackingData.pickup.address}
          </p>
        </div>

        <div style={{
          width: '2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280'
        }}>
          →
        </div>

        <div style={{
          flex: 1,
          padding: '0.75rem',
          border: `2px solid ${trackingData.status === 'delivered' ? '#34D399' : '#6B7280'}`,
          borderRadius: '0.375rem',
          background: trackingData.status === 'delivered' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(107, 114, 128, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
            <span style={{ marginRight: '0.5rem' }}>🏠</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>
              {trackingData.status === 'delivered' ? '✅ Delivered' : 'Delivery'}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.75rem',
            color: '#9CA3AF',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {trackingData.delivery.address}
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: compact ? '300px' : '500px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapBoundsUpdater trackingData={trackingData} />

          {/* Expected route (straight line) */}
          {trackingData.routes?.expected && trackingData.routes.expected.length > 0 && (
            <Polyline
              positions={trackingData.routes.expected}
              color="#6B7280"
              weight={3}
              opacity={0.6}
              dashArray="10, 10"
            />
          )}

          {/* Actual route taken */}
          {trackingData.routes?.actual && trackingData.routes.actual.length > 1 && (
            <Polyline
              positions={trackingData.routes.actual}
              color="#10B981"
              weight={4}
              opacity={0.8}
            />
          )}

          {/* Pickup point */}
          {trackingData.pickup && trackingData.pickup.location && (
            <Marker
              position={[trackingData.pickup.location.lat, trackingData.pickup.location.lng]}
              icon={createCustomIcon('pickup', trackingData.status === 'picked_up' || trackingData.status === 'in_transit' || trackingData.status === 'delivered' ? 'completed' : 'upcoming')}
            >
              <Popup>
                <strong>Pickup Location</strong><br />
                {trackingData.pickup.address}<br />
                {trackingData.pickup.completedAt && (
                  <small>Completed: {new Date(trackingData.pickup.completedAt).toLocaleString()}</small>
                )}
              </Popup>
            </Marker>
          )}

          {/* Delivery point */}
          {trackingData.delivery && trackingData.delivery.location && (
            <Marker
              position={[trackingData.delivery.location.lat, trackingData.delivery.location.lng]}
              icon={createCustomIcon('delivery', trackingData.status === 'delivered' ? 'completed' : 'upcoming')}
            >
              <Popup>
                <strong>Delivery Location</strong><br />
                {trackingData.delivery.address}<br />
                {trackingData.delivery.completedAt && (
                  <small>Completed: {new Date(trackingData.delivery.completedAt).toLocaleString()}</small>
                )}
              </Popup>
            </Marker>
          )}

          {/* Driver current location */}
          {trackingData.currentLocation && (
            <Marker
              position={[trackingData.currentLocation.lat, trackingData.currentLocation.lng]}
              icon={createCustomIcon('driver', 'current')}
            >
              <Popup>
                <strong>Driver Current Location</strong><br />
                Driver: {trackingData.driver?.name || 'Unknown'}<br />
                Speed: {trackingData.currentLocation.speedKmh ? `${trackingData.currentLocation.speedKmh} km/h` : 'Unknown'}<br />
                Last Update: {new Date(trackingData.currentLocation.timestamp).toLocaleString()}<br />
                Accuracy: {trackingData.currentLocation.accuracyMeters || 'Unknown'}m
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.75rem',
        color: '#9CA3AF',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>🟢 Completed Route</span>
          <span>⚪ Expected Route</span>
          <span>📍 Pickup</span>
          <span>🏠 Delivery</span>
          <span>🚗 Driver</span>
        </div>
        <div>
          Auto-refreshing every 10 seconds
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingMap;
