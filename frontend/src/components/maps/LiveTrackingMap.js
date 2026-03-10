import React, { useState, useEffect, useRef, useCallback } from 'react';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import io from 'socket.io-client';
import { ClickableMap } from '../FullscreenMapModal';
import api from '../../api';

const MAP_DEFAULT_CENTER = [30.0444, 31.2357];
const MAP_DEFAULT_ZOOM = 13;
const LIVE_TRACK_REFRESH_INTERVAL_MS_ACTIVE = 15000; // 15 seconds (optimized from 10s)
const LIVE_TRACK_REFRESH_INTERVAL_MS_IDLE = 60000; // 60 seconds (optimized from 30s)
const LIVE_TRACK_REFRESH_INTERVAL_MS_HIDDEN = 300000; // 5 minutes when tab is hidden
const SMART_TRACKING_DISTANCE_THRESHOLD_METERS = 50;
const SMART_TRACKING_TIME_THRESHOLD_MS = 30000;
const AVERAGE_CITY_SPEED_KMH_FOR_ETA = 25;
const EARTH_RADIUS_KM_FOR_DISTANCE = 6371;
const POLYLINE_WEIGHT_ACTUAL_ROUTE = 8;
const POLYLINE_WEIGHT_EXPECTED_ROUTE = 6;
const POLYLINE_OPACITY_ACTUAL_ROUTE = 1.0;
const POLYLINE_OPACITY_EXPECTED_ROUTE = 1.0;
const POLYLINE_DASH_PATTERN = '12, 8';
const COLOR_ROUTE_ACTUAL = '#00FF00';
const COLOR_ROUTE_EXPECTED_PICKUP = '#FF6B00';
const COLOR_ROUTE_EXPECTED_DELIVERY = '#0066FF';
const NOMINATIM_REVERSE_URL_BASE = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/markers/marker-icon-2x.png',
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png',
});

// Custom icons for different tracking states
const createCustomIcon = (type, status) => {
  let color = '#10B981';
  if (status === 'completed') color = '#34D399';
  else if (status === 'upcoming') color = '#6B7280';
  else if (status === 'current') color = '#00FF00';

  const size = 48;
  const pulse = status === 'current';

  const iconHtml = `
    <div style="
      position: relative;
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: 4px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #001100;
      font-weight: 700;
      font-size: 22px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.5);
      text-shadow: 0 1px 0 rgba(255,255,255,0.6);
    ">
      ${type === 'pickup' ? '📍' : type === 'delivery' ? '🏠' : type === 'driver' ? '🚗' : '📍'}
      ${pulse ? `<div style="position:absolute;top:0;left:0;width:${size}px;height:${size}px;border-radius:50%;animation:matrixPulse 2s ease-out infinite;box-shadow:0 0 0 0 rgba(0,255,0,0.6);"></div>` : ''}
    </div>
    ${pulse ? `<style>@keyframes matrixPulse{0%{box-shadow:0 0 0 0 rgba(0,255,0,0.6);}70%{box-shadow:0 0 0 20px rgba(0,255,0,0);}100%{box-shadow:0 0 0 0 rgba(0,255,0,0);}}</style>` : ''}
  `;

  return L.divIcon({
    className: 'custom-tracking-icon',
    html: iconHtml,
    iconSize: [size, size],
    iconAnchor: [Math.floor(size / 2), Math.floor(size / 2)]
  });
};

// Map controller to auto-fit bounds
const MapEffect = () => {
  const map = useMap();
  // We need to access the bounds calculated in the main component.
  // Since we can't easily pass props to a component defined inside another component's render,
  // we'll move the bounds calculation inside MapEffect or pass it via context if needed.
  // However, a cleaner way is to define MapEffect inside the main component so it closes over 'bounds'.
  // But React warns against defining components during render.
  // So we will use a different approach: a component that takes bounds as a prop.
  return null;
};

// Better approach: A component that takes bounds as a prop
const BoundsController = ({ bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);

  return null;
};

// ========== LIVE TRACKING MAP COMPONENT ==========
const LiveTrackingMap = ({ orderId, t, compact = false, theme = 'dark', isDriver = false }) => {
  // Ensure orderId is a valid string for API calls
  const validOrderId = typeof orderId === 'string' && orderId ? orderId : String(orderId || '');
  
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshIntervalRef = useRef(null);
  const mapRef = useRef(null);
  const [currentAddress, setCurrentAddress] = useState('');
  const [orderMeta, setOrderMeta] = useState(null);
  const lastLocationUpdateRef = useRef({ timestamp: 0, lat: 0, lng: 0 });
  const watchIdRef = useRef(null);

  // Get API base URL from environment, strip /api suffix for tile endpoint
  const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
  const tileUrl = `${API_BASE}/api/maps/tiles/{z}/{x}/{y}.png`;

  // Fetch tracking data
  const fetchTrackingData = useCallback(async () => {
    try {
      let idToUse = validOrderId;
      if (!orderMeta) {
        try {
          const ordersList = await api.get('/orders');
          const match = Array.isArray(ordersList)
            ? ordersList.find(o => o.id === validOrderId || o.orderNumber === validOrderId)
            : null;
          if (match) {
            setOrderMeta({ id: match.id, status: match.status });
            idToUse = match.id || validOrderId;
            if (match.status === 'pending_bids') {
              setError('Tracking is unavailable until a bid is accepted');
              setLoading(false);
              return;
            }
          }
        } catch (_) { }
      } else {
        if (orderMeta.status === 'pending_bids') {
          setError('Tracking is unavailable until a bid is accepted');
          setLoading(false);
          return;
        }
        idToUse = orderMeta.id || validOrderId;
      }

      let detailsResponse;
      try {
        // Try the tracking endpoint first
        detailsResponse = await api.get(`/orders/${idToUse}/tracking`);
      } catch (primaryErr) {
        console.warn('Primary tracking endpoint failed, trying alternative:', primaryErr.message);
        
        // If tracking endpoint fails, try to get order details and build tracking data manually
        try {
          const orderDetails = await api.get(`/orders/${idToUse}`);
          
          // Build tracking data from order details
          detailsResponse = {
            orderNumber: orderDetails.orderNumber,
            status: orderDetails.status,
            currentLocation: orderDetails.currentLocation || null,
            pickup: {
              address: orderDetails.pickupAddress,
              location: orderDetails.from
            },
            delivery: {
              address: orderDetails.deliveryAddress,
              location: orderDetails.to
            },
            estimatedDistanceKm: orderDetails.estimatedDistanceKm,
            estimatedDurationMinutes: orderDetails.estimatedDurationMinutes,
            routePolyline: orderDetails.routePolyline,
            locationHistory: [],
            driver: orderDetails.assignedDriver
          };
        } catch (fallbackErr) {
          console.error('Fallback order details also failed:', fallbackErr.message);
          
          if (primaryErr && String(primaryErr.message).includes('HTTP 403')) {
            setError('Tracking is unavailable until a bid is accepted');
            setLoading(false);
            return;
          }
          if (primaryErr && String(primaryErr.message).includes('HTTP 404')) {
            const ordersList = await api.get('/orders');
            const match = Array.isArray(ordersList)
              ? ordersList.find(o => o.orderNumber === validOrderId)
              : null;
            if (match && match.id) {
              detailsResponse = await api.get(`/orders/${match.id}/tracking`);
            } else {
              throw primaryErr;
            }
          } else {
            throw primaryErr;
          }
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
  }, [validOrderId, orderMeta]);

  // Start tracking updates when component mounts
  useEffect(() => {
    if (validOrderId) {
      fetchTrackingData(); // Initial load

      // Set up Socket.IO connection for real-time updates
      const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
      const socket = io(apiUrl, {
        withCredentials: true,
        transports: ['websocket'],
        reconnection: true
      });

      socket.on('connect', () => {
        console.log('📡 LiveTrackingMap: Socket connected, joining order room');
        socket.emit('join_order', { orderId: validOrderId });
      });

      socket.on('location_update', (data) => {
        console.log('📡 LiveTrackingMap: Real-time location update received', data);
        if (data.orderId === validOrderId) {
          setTrackingData(prev => {
            if (!prev) return prev;
            
            // Add to location history
            const newHistory = [...(prev.locationHistory || [])];
            const newPoint = {
              lat: data.latitude,
              lng: data.longitude,
              timestamp: data.timestamp,
              status: prev.status
            };
            
            // Avoid duplicate points (simple check)
            const lastPoint = newHistory[newHistory.length - 1];
            if (!lastPoint || lastPoint.lat !== newPoint.lat || lastPoint.lng !== newPoint.lng) {
              newHistory.push(newPoint);
            }

            return {
              ...prev,
              currentLocation: {
                lat: data.latitude,
                lng: data.longitude,
                timestamp: data.timestamp,
                heading: data.heading,
                speedKmh: data.speedKmh,
                accuracyMeters: data.accuracyMeters
              },
              locationHistory: newHistory
            };
          });
        }
      });

      socket.on('error', (err) => {
        console.error('📡 LiveTrackingMap: Socket error:', err);
      });

      // Set up interval for fallback/status updates (less frequent if socket is active)
      refreshIntervalRef.current = setInterval(fetchTrackingData, LIVE_TRACK_REFRESH_INTERVAL_MS_IDLE);

      return () => {
        console.log('📡 LiveTrackingMap: Disconnecting socket');
        socket.emit('leave_order', validOrderId);
        socket.disconnect();
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [validOrderId, fetchTrackingData]);

  useEffect(() => {
    if (!trackingData) return;
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    const activeStatuses = ['accepted', 'picked_up', 'in_transit'];
    const isActive = activeStatuses.includes(trackingData.status);

    // Adaptive polling based on order status AND page visibility
    const getInterval = () => {
      if (document.hidden) {
        return LIVE_TRACK_REFRESH_INTERVAL_MS_HIDDEN; // 5 minutes when hidden
      }
      return isActive ? LIVE_TRACK_REFRESH_INTERVAL_MS_ACTIVE : LIVE_TRACK_REFRESH_INTERVAL_MS_IDLE;
    };

    refreshIntervalRef.current = setInterval(fetchTrackingData, getInterval());

    // Listen for visibility changes to adjust polling
    const handleVisibilityChange = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(fetchTrackingData, getInterval());
      console.log(`🔍 Live tracking interval adjusted: ${document.hidden ? 'HIDDEN (5min)' : isActive ? 'ACTIVE (15s)' : 'IDLE (60s)'}`);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start smart tracking if driver and order is active
    // Note: In a real app, we would check if currentUser.id === trackingData.driver.userId
    // For this demo, we'll assume if the component is mounted and we have geolocation, we might be the driver
    // But strictly speaking, we should check primary_role. Since we don't have currentUser prop here easily without context,
    // we'll rely on the fact that only drivers see the "Start Tracking" button which usually leads to this view or similar.
    // However, this component is used by BOTH driver and customer.
    // We need to be careful not to have the CUSTOMER send location updates.
    // We'll assume the parent component handles the "sending" part or we need to check permissions.
    // Actually, looking at the requirements, "driver path should be traced on map".
    // The requirement says "smart, effecient and balanced location tracking without overloading courier battery".
    // This implies WE (the app) are doing the tracking.
    // So we should only run watchPosition if we are the driver.
    // Since we don't have user context here, we'll skip the ACTUAL sending implementation here and assume
    // the "DriverBiddingMap" or a dedicated background service handles it, OR we add it here if we can verify user.
    // Given the constraints, I will implement the logic but wrap it in a check that would need to be true.
    // For now, let's assume this component is purely for VISUALIZATION as per its name "LiveTrackingMap".
    // The actual tracking usually happens in a background service or a dedicated "DriverActiveOrder" component.
    // BUT, the requirement says "current order map should be used for life tracking".
    // So let's add the tracking logic but only enable it if we can confirm we are the driver.
    // We'll add a prop `isDriver` to this component to enable sending updates.

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [trackingData, fetchTrackingData]);

  // Smart tracking effect
  useEffect(() => {
    // We need to know if we are the driver to start sending updates.
    // Since we don't have that prop yet, we'll add it to the component signature in a separate edit or assume false for safety.
    // However, to fulfill the requirement, I will add the logic function here, ready to be used.

    const sendLocationUpdate = async (lat, lng, heading, speed, accuracy) => {
      try {
        await api.post(`/drivers/location/${validOrderId}`, {
          latitude: lat,
          longitude: lng,
          heading,
          speedKmh: speed,
          accuracyMeters: accuracy
        });
        lastLocationUpdateRef.current = {
          timestamp: Date.now(),
          lat,
          lng
        };
        console.log('📍 Smart tracking: Location update sent');
      } catch (err) {
        console.error('Failed to send location update:', err);
      }
    };

    const handlePositionUpdate = (position) => {
      const { latitude, longitude, heading, speed, accuracy } = position.coords;
      const now = Date.now();
      const last = lastLocationUpdateRef.current;

      // Calculate distance from last update
      const dist = haversineKm({ lat: last.lat, lng: last.lng }, { lat: latitude, lng: longitude }) * 1000; // meters

      // Smart tracking logic:
      // 1. If distance > threshold (50m) -> Send
      // 2. If time > threshold (30s) AND distance > small_threshold (10m) -> Send
      // 3. If first update -> Send

      const isFirstUpdate = last.timestamp === 0;
      const movedEnough = dist > SMART_TRACKING_DISTANCE_THRESHOLD_METERS;
      const timeElapsed = now - last.timestamp > SMART_TRACKING_TIME_THRESHOLD_MS;
      const movedSlightly = dist > 10;

      if (isFirstUpdate || movedEnough || (timeElapsed && movedSlightly)) {
        sendLocationUpdate(latitude, longitude, heading, speed, accuracy);
      }
    };

    // Only start watching if we are the driver
    if (isDriver && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        handlePositionUpdate,
        (err) => console.warn('Tracking error:', err),
        {
          enableHighAccuracy: false, // Changed to false to save battery
          timeout: 15000, // Increased from 10s
          maximumAge: 5000 // Allow 5s cached position
        }
      );
    }

    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [validOrderId, isDriver]);

  useEffect(() => {
    const loc = trackingData?.currentLocation;
    if (loc && typeof loc.lat === 'number' && typeof loc.lng === 'number') {
      const url = `${NOMINATIM_REVERSE_URL_BASE}&lat=${loc.lat}&lon=${loc.lng}`;
      fetch(url, { headers: { 'Accept': 'application/json' } })
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setCurrentAddress(data.display_name);
          }
        })
        .catch(() => { });
    } else {
      setCurrentAddress('');
    }
  }, [trackingData]);

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
    return MAP_DEFAULT_CENTER;
  };

  // Safe render helper to prevent React error #31 (objects as children)
  const safeRender = (value, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    // If it's an object, try to extract a display value
    if (typeof value === 'object') {
      if (value.address) return safeRender(value.address, fallback);
      if (value.name) return safeRender(value.name, fallback);
      if (value.display_name) return safeRender(value.display_name, fallback);
      if (value.lat && value.lng) return `${value.lat}, ${value.lng}`;
      // Return JSON stringified as last resort
      try {
        return JSON.stringify(value);
      } catch {
        return fallback;
      }
    }
    return String(value);
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

  const haversineKm = (a, b) => {
    if (!a || !b) return null;
    const toRad = (v) => (v * Math.PI) / 180;
    const R = EARTH_RADIUS_KM_FOR_DISTANCE;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon));
    return R * c;
  };

  // Calculate bounds to include all points
  // Moved to top level to avoid conditional hook error
  const bounds = React.useMemo(() => {
    if (!trackingData) return null;

    const points = [];

    // Add pickup and delivery
    if (trackingData.pickup && trackingData.pickup.location) {
      points.push([trackingData.pickup.location.lat, trackingData.pickup.location.lng]);
    }
    if (trackingData.delivery && trackingData.delivery.location) {
      points.push([trackingData.delivery.location.lat, trackingData.delivery.location.lng]);
    }

    // Add current driver location
    if (trackingData.currentLocation && typeof trackingData.currentLocation.lat === 'number') {
      points.push([trackingData.currentLocation.lat, trackingData.currentLocation.lng]);
    }

    // Add route history points
    if (trackingData.locationHistory && Array.isArray(trackingData.locationHistory)) {
      trackingData.locationHistory.forEach(loc => {
        if (loc.lat && loc.lng) points.push([loc.lat, loc.lng]);
      });
    }

    // Add route polyline points (sampled)
    if (trackingData.routePolyline) {
      try {
        const decoded = polyline.decode(trackingData.routePolyline);
        const sampleRate = Math.ceil(decoded.length / 20);
        for (let i = 0; i < decoded.length; i += sampleRate) {
          points.push(decoded[i]);
        }
      } catch (e) {
        // ignore
      }
    }

    if (points.length === 0) return null;
    return L.latLngBounds(points);
  }, [trackingData]);

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

  const actualRoute = Array.isArray(trackingData?.locationHistory)
    ? [...trackingData.locationHistory].reverse().map(p => [p.lat, p.lng])
    : [];

  const pickupLoc = trackingData?.pickup?.location;
  const deliveryLoc = trackingData?.delivery?.location;
  const currentLoc = trackingData?.currentLocation;

  // Try to use OSRM route polyline if available, otherwise fall back to straight line
  let expectedToPickup = [];
  let expectedToDelivery = [];

  // Decode route polyline if available from order data
  if (trackingData?.routePolyline) {
    try {
      const decodedRoute = polyline.decode(trackingData.routePolyline);
      // Use the full route for expected delivery path
      if (trackingData?.status === 'accepted' && pickupLoc && deliveryLoc) {
        expectedToDelivery = decodedRoute;
      } else if ((trackingData?.status === 'picked_up' || trackingData?.status === 'in_transit') && currentLoc && deliveryLoc) {
        // For in-transit, show route from current location to delivery
        // Note: This is still the original route, ideally we'd recalculate from current position
        expectedToDelivery = decodedRoute;
      }
    } catch (error) {
      console.warn('Failed to decode route polyline:', error);
    }
  }

  // Fallback to straight lines if no polyline or decoding failed
  if (expectedToPickup.length === 0 && trackingData?.status === 'accepted' && currentLoc && pickupLoc) {
    expectedToPickup = [[currentLoc.lat, currentLoc.lng], [pickupLoc.lat, pickupLoc.lng]];
  }

  if (expectedToDelivery.length === 0) {
    if (trackingData?.status === 'accepted' && pickupLoc && deliveryLoc) {
      expectedToDelivery = [[pickupLoc.lat, pickupLoc.lng], [deliveryLoc.lat, deliveryLoc.lng]];
    } else if ((trackingData?.status === 'picked_up' || trackingData?.status === 'in_transit') && currentLoc && deliveryLoc) {
      expectedToDelivery = [[currentLoc.lat, currentLoc.lng], [deliveryLoc.lat, deliveryLoc.lng]];
    }
  }

  const hasOsrmRoute = !!trackingData?.routePolyline;

  const mapContent = (
    <div style={{
      background: 'transparent',
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

        {(() => {
          const nextType = trackingData.status === 'accepted' ? 'pickup' : 'delivery';
          const nextLoc = nextType === 'pickup' ? trackingData.pickup?.location : trackingData.delivery?.location;
          const cur = trackingData.currentLocation;
          const distanceKm = cur && nextLoc ? haversineKm({ lat: cur.lat, lng: cur.lng }, { lat: nextLoc.lat, lng: nextLoc.lng }) : null;
          const speedKmh = AVERAGE_CITY_SPEED_KMH_FOR_ETA;
          const etaMinutes = distanceKm ? Math.ceil((distanceKm / speedKmh) * 60) : null;
          return (distanceKm && etaMinutes);
        })() && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #EF4444',
              padding: '0.75rem',
              borderRadius: '0.375rem',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.875rem', color: '#F3F4F6' }}>
                To {trackingData.status === 'accepted' ? 'pickup' : 'delivery'}
              </p>
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 'bold' }}>
                {(() => {
                  const nextType = trackingData.status === 'accepted' ? 'pickup' : 'delivery';
                  const nextLoc = nextType === 'pickup' ? trackingData.pickup?.location : trackingData.delivery?.location;
                  const cur = trackingData.currentLocation;
                  const distanceKm = cur && nextLoc ? haversineKm({ lat: cur.lat, lng: cur.lng }, { lat: nextLoc.lat, lng: nextLoc.lng }) : null;
                  return formatDistance(distanceKm);
                })()}
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>
                {(() => {
                  const nextType = trackingData.status === 'accepted' ? 'pickup' : 'delivery';
                  const nextLoc = nextType === 'pickup' ? trackingData.pickup?.location : trackingData.delivery?.location;
                  const cur = trackingData.currentLocation;
                  const distanceKm = cur && nextLoc ? haversineKm({ lat: cur.lat, lng: cur.lng }, { lat: nextLoc.lat, lng: nextLoc.lng }) : null;
                  const speedKmh = AVERAGE_CITY_SPEED_KMH_FOR_ETA;
                  const etaMinutes = distanceKm ? Math.ceil((distanceKm / speedKmh) * 60) : null;
                  return formatTime(etaMinutes);
                })()} ETA
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
            {safeRender(trackingData.pickup.address)}
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
            {safeRender(trackingData.delivery.address)}
          </p>
        </div>
      </div>

      {/* Map */}
      <div style={{ height: compact ? '300px' : '500px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <MapContainer
          center={MAP_DEFAULT_CENTER} // Initial center, will be overridden by MapEffect
          zoom={MAP_DEFAULT_ZOOM}     // Initial zoom, will be overridden by MapEffect
          style={{ width: '100%', height: '100%', zIndex: 1 }}
          zoomControl={false}
          ref={mapRef}
        >
          <BoundsController bounds={bounds} />
          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {expectedToPickup.length === 2 && (
            <Polyline
              positions={expectedToPickup}
              color={COLOR_ROUTE_EXPECTED_PICKUP}
              weight={POLYLINE_WEIGHT_EXPECTED_ROUTE}
              opacity={POLYLINE_OPACITY_EXPECTED_ROUTE}
              dashArray={POLYLINE_DASH_PATTERN}
              pathOptions={{ className: 'expected-route-pickup animated-stroke' }}
            />
          )}

          {expectedToDelivery.length === 2 && (
            <Polyline
              positions={expectedToDelivery}
              color={COLOR_ROUTE_EXPECTED_DELIVERY}
              weight={POLYLINE_WEIGHT_EXPECTED_ROUTE}
              opacity={POLYLINE_OPACITY_EXPECTED_ROUTE}
              dashArray={POLYLINE_DASH_PATTERN}
              pathOptions={{ className: 'expected-route-delivery animated-stroke' }}
            />
          )}

          {actualRoute.length > 1 && (
            <Polyline
              positions={actualRoute}
              color={COLOR_ROUTE_ACTUAL}
              weight={POLYLINE_WEIGHT_ACTUAL_ROUTE}
              opacity={POLYLINE_OPACITY_ACTUAL_ROUTE}
              pathOptions={{ className: 'actual-route animated-glow' }}
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
                {safeRender(trackingData.pickup.address)}<br />
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
                {safeRender(trackingData.delivery.address)}<br />
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
              zIndexOffset={1000}
            >
              <Popup>
                <strong>Driver Current Location</strong><br />
                Driver: {safeRender(trackingData.driver?.name)}<br />
                Speed: {trackingData.currentLocation.speedKmh ? `${trackingData.currentLocation.speedKmh} km/h` : 'Unknown'}<br />
                Last Update: {new Date(trackingData.currentLocation.timestamp).toLocaleString()}<br />
                Accuracy: {safeRender(trackingData.currentLocation.accuracyMeters)}m<br />
                Address: {currentAddress || 'Locating...'}
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
          <span>🟢 Actual Route</span>
          <span>🟠 Expected to Pickup</span>
          <span>🔵 Expected to Delivery</span>
          <span>📍 Pickup</span>
          <span>🏠 Delivery</span>
          <span>🚗 Driver</span>
        </div>
        <div>
          Auto-refreshing every {['accepted', 'picked_up', 'in_transit'].includes(trackingData.status) ? `${LIVE_TRACK_REFRESH_INTERVAL_MS_ACTIVE / 1000} seconds` : `${LIVE_TRACK_REFRESH_INTERVAL_MS_IDLE / 1000} seconds`}
        </div>
      </div>
    </div>
  );

  return (
    <ClickableMap
      title={`Live Tracking - Order ${trackingData.orderNumber}`}
      osrmSuccess={hasOsrmRoute}
      routeDistance={trackingData?.estimatedDistanceKm}
      routeFound={hasOsrmRoute}
      compact={compact}
    >
      {mapContent}
    </ClickableMap>
  );
};

export default LiveTrackingMap;
