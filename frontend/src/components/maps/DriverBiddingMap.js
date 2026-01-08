import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import polyline from '@mapbox/polyline';
import api from '../../api';

// Fix default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/markers/marker-icon-2x.png',
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png',
});

// Custom markers with unique styling
const createCustomIcon = (iconType, color) => {
  const icons = {
    driver: '🚗',
    pickup: '📦',
    dropoff: '🏁'
  };

  const size = 60;

  if (iconType === 'driver') {
    return L.icon({
      iconUrl: '/markers/user-location.svg',
      iconSize: [60, 60],
      iconAnchor: [30, 30],
      popupAnchor: [0, -30],
      className: ''
    });
  }

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        background: ${color};
        border: 4px solid white;
        border-radius: 50%;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        font-weight: 700;
        box-shadow: 0 8px 16px rgba(0,0,0,0.5);
        color: #001100;
        text-shadow: 0 1px 0 rgba(255,255,255,0.6);
      ">
        ${icons[iconType]}
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          animation: matrixPulse 2s ease-out infinite;
          box-shadow: 0 0 0 0 rgba(0,255,0,0.6);
        "></div>
      </div>
      <style>
        @keyframes matrixPulse {
          0% { box-shadow: 0 0 0 0 rgba(0,255,0,0.6); }
          70% { box-shadow: 0 0 0 20px rgba(0,255,0,0); }
          100% { box-shadow: 0 0 0 0 rgba(0,255,0,0); }
        }
      </style>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [Math.floor(size / 2), size],
    popupAnchor: [0, -size]
  });
};

// Map control component to handle bounds and interactions
const MapView = ({ pickupCoords, dropoffCoords, driverCoords, driverToPickupPath, pickupToDropoffPath, onInteraction }) => {
  const map = useMap();
  const boundsSetRef = React.useRef(false);

  useMapEvents({
    click: () => onInteraction && onInteraction(),
    dragstart: () => onInteraction && onInteraction()
  });

  React.useEffect(() => {
    if (map && pickupCoords && dropoffCoords && !boundsSetRef.current) {
      const boundsPoints = [
        [pickupCoords.lat, pickupCoords.lng],
        [dropoffCoords.lat, dropoffCoords.lng]
      ];

      if (driverCoords && Number.isFinite(driverCoords.lat) && Number.isFinite(driverCoords.lng)) {
        boundsPoints.push([driverCoords.lat, driverCoords.lng]);
      }

      if (driverToPickupPath && driverToPickupPath.length > 0) {
        boundsPoints.push(driverToPickupPath[Math.floor(driverToPickupPath.length / 2)]);
      }
      if (pickupToDropoffPath && pickupToDropoffPath.length > 0) {
        boundsPoints.push(pickupToDropoffPath[Math.floor(pickupToDropoffPath.length / 2)]);
      }

      const bounds = L.latLngBounds(boundsPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
        boundsSetRef.current = true;
      }
    }
  }, [map, pickupCoords, dropoffCoords, driverCoords, driverToPickupPath, pickupToDropoffPath]);

  return null;
};

const DriverBiddingMap = React.memo(({ order, driverLocation, driverVehicleType = 'car', isFullscreen = false, onToggleFullscreen, theme = 'dark', compact = false }) => {
  const [routePath, setRoutePath] = React.useState([]); // Full route path
  const [driverToPickupPath, setDriverToPickupPath] = React.useState([]);
  const [pickupToDropoffPath, setPickupToDropoffPath] = React.useState([]);
  const [routeInfo, setRouteInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [driverCoords, setDriverCoords] = React.useState(null);
  const [pickupCoords, setPickupCoords] = React.useState(null);
  const [dropoffCoords, setDropoffCoords] = React.useState(null);

  // Refs for debouncing and throttling
  const lastFetchRef = React.useRef({ time: 0, driver: null, pickup: null });
  const fetchTimeoutRef = React.useRef(null);

  const hasDriverCoords = !!(driverCoords && Number.isFinite(driverCoords.lat) && Number.isFinite(driverCoords.lng));

  // Get API base URL from environment, strip /api suffix for tile endpoint
  const API_BASE = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
  const tileUrl = `${API_BASE}/api/maps/tiles/{z}/{x}/{y}.png`;

  // Parse order locations (handle both old and new formats)
  React.useEffect(() => {
    // Handle pickup location
    let pCoords = null;
    if (order.pickupLocation?.coordinates) {
      pCoords = order.pickupLocation.coordinates;
    } else if (order.from) {
      pCoords = { lat: order.from.lat, lng: order.from.lng };
    } else if (Number.isFinite(parseFloat(order.from_lat)) && Number.isFinite(parseFloat(order.from_lng))) {
      // Handle flat fields from getOrders query
      pCoords = { lat: parseFloat(order.from_lat), lng: parseFloat(order.from_lng) };
    }
    setPickupCoords(pCoords);

    // Handle dropoff location
    let dCoords = null;
    if (order.dropoffLocation?.coordinates) {
      dCoords = order.dropoffLocation.coordinates;
    } else if (order.to) {
      dCoords = { lat: order.to.lat, lng: order.to.lng };
    } else if (Number.isFinite(parseFloat(order.to_lat)) && Number.isFinite(parseFloat(order.to_lng))) {
      // Handle flat fields from getOrders query
      dCoords = { lat: parseFloat(order.to_lat), lng: parseFloat(order.to_lng) };
    }
    setDropoffCoords(dCoords);
  }, [order]);

  // Get real-time driver location if not provided
  React.useEffect(() => {
    // Check if we have valid driverLocation coordinates from props
    // Support both {lat, lng} and {latitude, longitude} formats
    const lat = driverLocation?.lat || driverLocation?.latitude;
    const lng = driverLocation?.lng || driverLocation?.longitude;
    const hasValidDriverLocation = Number.isFinite(lat) && Number.isFinite(lng);

    if (hasValidDriverLocation) {
      // Use the driver location from props
      setDriverCoords({
        lat: lat,
        lng: lng,
        accuracy: driverLocation.accuracy || 100
      });
      setLoading(false);
    } else if (navigator.geolocation) {
      // Fall back to geolocation with proper options for mobile
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          setDriverCoords(coords);
          setLoading(false);
        },
        (error) => {
          console.warn('Geolocation error:', error);

          // Fall back to order pickup location for demo
          if (pickupCoords) {
            setDriverCoords({
              lat: pickupCoords.lat,
              lng: pickupCoords.lng,
              accuracy: 1000
            });
          } else {
            // Fallback to Cairo if no coordinates available
            setDriverCoords({
              lat: 30.0444,
              lng: 31.2357,
              accuracy: 1000
            });
          }
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // Accept cached location up to 5 minutes old
        }
      );
    } else {
      // If no geolocation available, use order pickup or default location
      if (pickupCoords) {
        setDriverCoords({
          lat: pickupCoords.lat,
          lng: pickupCoords.lng,
          accuracy: 1000
        });
      } else {
        // Default to Cairo for demo
        setDriverCoords({
          lat: 30.0444,
          lng: 31.2357,
          accuracy: 1000
        });
      }
      setLoading(false);
    }
  }, [driverLocation, pickupCoords]);

  // Calculate route when locations are available
  React.useEffect(() => {
    // Only proceed if we have at least Driver and Pickup coordinates
    // We allow missing Dropoff for partial route (Driver -> Pickup)
    if (!hasDriverCoords || !pickupCoords) {
      return;
    }

    // Use refs to debounce and throttle requests
    // Using top-level lastFetchRef and fetchTimeoutRef

    // Simple state to prevent race conditions
    let isMounted = true;

    // Clear timeout on unmount or re-run
    return () => {
      isMounted = false;
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };

    const calculateRoute = async () => {
      try {
        if (!isMounted) return;

        // Throttling: Check if we already fetched recently for similar coordinates
        const now = Date.now();
        const last = lastFetchRef.current;

        // Calculate distance moved since last fetch (approx in degrees)
        // 0.0005 deg is approx 50 meters
        const distMoved = last.driver
          ? Math.sqrt(Math.pow(driverCoords.lat - last.driver.lat, 2) + Math.pow(driverCoords.lng - last.driver.lng, 2))
          : 999;

        // Fetch if: never fetched OR > 60s ago OR moved > 50m
        const shouldFetch = !last.time || (now - last.time > 60000) || (distMoved > 0.0005);

        if (!shouldFetch) {
          console.log('⏳ Skipping route fetch (throttled/cached)');
          return;
        }

        console.log('🗺️ Starting route calculation...');
        console.log('📍 Driver:', driverCoords);
        console.log('📦 Pickup:', pickupCoords);

        // Update Ref immediately
        lastFetchRef.current = { time: now, driver: { ...driverCoords }, pickup: { ...pickupCoords } };

        // 1. Calculate Driver -> Pickup Route
        let driverToPickupPolyline = [];
        let driverToPickupDist = 0;
        let driverToPickupTime = 0;


        try {
          console.log('🚀 Requesting Driver->Pickup route from backend...');
          const response = await api.post('/locations/calculate-route', {
            pickup: { lat: driverCoords.lat, lng: driverCoords.lng },
            delivery: { lat: pickupCoords.lat, lng: pickupCoords.lng }
          });

          console.log('✅ Driver->Pickup response:', response);

          if (response.polyline) {
            console.log('🧩 Decoding Driver->Pickup polyline...');
            driverToPickupPolyline = polyline.decode(response.polyline);
          } else {
            console.warn('⚠️ No polyline in response, using straight line.');
            // Fallback to straight line
            driverToPickupPolyline = [[driverCoords.lat, driverCoords.lng], [pickupCoords.lat, pickupCoords.lng]];
          }

          driverToPickupDist = response.distance_km;
          // Use vehicle specific estimate if available, otherwise generic duration
          driverToPickupTime = response.estimates?.[driverVehicleType]?.duration_minutes || response.estimates?.car?.duration_minutes || 0;

        } catch (err) {
          console.warn('❌ Failed to calculate driver->pickup route:', err);
          // Fallback
          driverToPickupPolyline = [[driverCoords.lat, driverCoords.lng], [pickupCoords.lat, pickupCoords.lng]];
          driverToPickupDist = calculateDistance(driverCoords, pickupCoords);
          driverToPickupTime = (driverToPickupDist / 30) * 60; // Assume 30km/h
        }

        setDriverToPickupPath(driverToPickupPolyline);

        // 2. Calculate Pickup -> Dropoff Route (or use existing)
        let pickupToDropoffPolyline = [];
        let pickupToDropoffDist = 0;
        let pickupToDropoffTime = 0;

        if (order.routePolyline) {
          console.log('Using existing order polyline for Pickup->Dropoff');
          // Use existing route from order
          try {
            pickupToDropoffPolyline = polyline.decode(order.routePolyline);
            pickupToDropoffDist = order.estimatedDistanceKm || calculateDistance(pickupCoords, dropoffCoords);
            pickupToDropoffTime = order.estimatedDurationMinutes || (pickupToDropoffDist / 30) * 60;
          } catch (e) {
            console.warn('Failed to decode order polyline:', e);
            pickupToDropoffPolyline = [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]];
          }
        } else {
          // Calculate new route
          try {
            console.log('🚀 Requesting Pickup->Dropoff route from backend...');
            const response = await api.post('/locations/calculate-route', {
              pickup: { lat: pickupCoords.lat, lng: pickupCoords.lng },
              delivery: { lat: dropoffCoords.lat, lng: dropoffCoords.lng }
            });

            console.log('✅ Pickup->Dropoff response:', response);

            if (response.polyline) {
              pickupToDropoffPolyline = polyline.decode(response.polyline);
            } else {
              pickupToDropoffPolyline = [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]];
            }

            pickupToDropoffDist = response.distance_km;
            pickupToDropoffTime = response.estimates?.[driverVehicleType]?.duration_minutes || response.estimates?.car?.duration_minutes || 0;

          } catch (err) {
            console.warn('❌ Failed to calculate pickup->dropoff route:', err);
            pickupToDropoffPolyline = [[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]];
            pickupToDropoffDist = calculateDistance(pickupCoords, dropoffCoords);
            pickupToDropoffTime = (pickupToDropoffDist / 30) * 60;
          }
        }

        setPickupToDropoffPath(pickupToDropoffPolyline);

        // Combine info
        setRouteInfo({
          totalDistance: (driverToPickupDist + pickupToDropoffDist).toFixed(1),
          driverToPickupDistance: driverToPickupDist.toFixed(1),
          pickupToDropoffDistance: pickupToDropoffDist.toFixed(1),
          totalTimeMinutes: Math.ceil(driverToPickupTime + pickupToDropoffTime),
          pickupTimeMinutes: Math.ceil(driverToPickupTime),
          deliveryTimeMinutes: Math.ceil(pickupToDropoffTime),
          vehicleType: driverVehicleType,
          speed: 'Variable', // Speed varies by segment/traffic
          routeFound: true
        });

      } catch (error) {
        console.error('Route calculation error:', error);
        // Fallback to straight line
        setDriverToPickupPath([[driverCoords.lat, driverCoords.lng], [pickupCoords.lat, pickupCoords.lng]]);
        setPickupToDropoffPath([[pickupCoords.lat, pickupCoords.lng], [dropoffCoords.lat, dropoffCoords.lng]]);

        setRouteInfo({
          totalDistance: 'Unknown',
          driverToPickupDistance: 'Unknown',
          pickupToDropoffDistance: 'Unknown',
          totalTimeMinutes: 'Unknown',
          pickupTimeMinutes: 'Unknown',
          deliveryTimeMinutes: 'Unknown',
          vehicleType: driverVehicleType,
          speed: 'Unknown',
          routeFound: false
        });
      }
    };

    // Debounce execution: wait 1s before fetching
    fetchTimeoutRef.current = setTimeout(calculateRoute, 1000);
  }, [hasDriverCoords, driverCoords, pickupCoords, dropoffCoords, order, driverVehicleType]);

  // Helper function to calculate distance between points
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };



  if (loading || !hasDriverCoords) {
    return (
      <div style={{
        height: isFullscreen ? '100vh' : '400px',
        width: '100%',
        background: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0.5rem'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🗺️</div>
          <p style={{ color: '#6b7280' }}>Loading route information...</p>
          {!driverCoords && navigator.geolocation && (
            <p style={{ fontSize: '0.875rem', color: '#374151', marginTop: '0.5rem' }}>
              📍 Location access may be denied on mobile over HTTP. Using order location as fallback.
            </p>
          )}
        </div>
      </div>
    );
  }

  const mapHeight = isFullscreen ? 'calc(100vh - 60px)' : '400px';

  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      {/* Debug Info - Can be removed in prod */}
      {/* <div style={{
        background: 'yellow',
        color: 'black',
        padding: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.75rem',
        borderRadius: '0.25rem',
        maxWidth: '800px',
        wordWrap: 'break-word'
      }}>
        DEBUG: Map showing for order {order.title || order.orderNumber || order.id}<br />
        <strong>Driver Coords:</strong> {hasDriverCoords ? `Lat:${driverCoords.lat.toFixed(4)}, Lng:${driverCoords.lng.toFixed(4)}` : 'None'}
      </div> */}

      {/* Map Container */}
      <div style={{
        height: mapHeight,
        width: '100%',
        borderRadius: '0.5rem',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        transition: 'height 0.3s ease'
      }}>
        <MapContainer
          center={hasDriverCoords
            ? [driverCoords.lat, driverCoords.lng]
            : pickupCoords
              ? [pickupCoords.lat, pickupCoords.lng]
              : [30.0444, 31.2357]}
          zoom={13}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={!isFullscreen}
        >
          <MapView
            pickupCoords={pickupCoords}
            dropoffCoords={dropoffCoords}
            driverCoords={driverCoords}
            driverToPickupPath={driverToPickupPath}
            pickupToDropoffPath={pickupToDropoffPath}
            onInteraction={() => !isFullscreen && onToggleFullscreen && onToggleFullscreen()}
          />
          <TileLayer
            url={tileUrl}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            maxZoom={19}
            minZoom={1}
            updateWhenIdle={false}
            keepBuffer={4}
          />

          {/* Driver Location Marker */}
          {console.log('🚗 Rendering Driver Marker check:', { hasDriverCoords, driverCoords })}
          {hasDriverCoords && (
            <Marker
              position={[driverCoords.lat, driverCoords.lng]}
              icon={createCustomIcon('driver', '#4f46e5')}
            >
              <Popup>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>🎯 Current Location</div>
                  <div>Lat: {driverCoords.lat.toFixed(6)}</div>
                  <div>Lng: {driverCoords.lng.toFixed(6)}</div>
                  {Number.isFinite(driverCoords.accuracy) && (
                    <div>Accuracy: ±{driverCoords.accuracy.toFixed(0)}m</div>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Pickup Location Marker */}
          {pickupCoords && (
            <Marker
              position={[pickupCoords.lat, pickupCoords.lng]}
              icon={createCustomIcon('pickup', '#059669')}
            >
              <Popup>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#059669' }}>
                    📦 Pickup Location
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {order.pickupAddress || 'Address not available'}
                  </div>
                  {routeInfo && (
                    <>
                      <div>Distance from you: {routeInfo.driverToPickupDistance} km</div>
                      <div>Est. time: ~{routeInfo.pickupTimeMinutes} min</div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dropoff Location Marker */}
          {dropoffCoords && (
            <Marker
              position={[dropoffCoords.lat, dropoffCoords.lng]}
              icon={createCustomIcon('dropoff', '#dc2626')}
            >
              <Popup>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#dc2626' }}>
                    🏁 Dropoff Location
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    {order.deliveryAddress || 'Address not available'}
                  </div>
                  {routeInfo && (
                    <>
                      <div>Distance: {routeInfo.pickupToDropoffDistance} km</div>
                      <div>Est. time: ~{routeInfo.deliveryTimeMinutes} min</div>
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          )}

          {/* Route Polylines */}
          {/* 1. Driver to Pickup (Dashed Blue) */}
          {driverToPickupPath.length > 1 && (
            <Polyline
              positions={driverToPickupPath}
              color="#3B82F6"
              weight={5}
              opacity={0.8}
              dashArray="10, 10"
            />
          )}

          {/* 2. Pickup to Dropoff (Solid Orange) */}
          {pickupToDropoffPath.length > 1 && (
            <Polyline
              positions={pickupToDropoffPath}
              color="#FF6B00"
              weight={6}
              opacity={1.0}
            />
          )}
        </MapContainer>
      </div>

      {/* Route Information Panel */}
      {routeInfo && !compact && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#ffffff',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
            🛣️ Route Information
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
            {/* Total Route Info */}
            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                📏 Total Distance
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4f46e5' }}>
                {routeInfo.totalDistance} km
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                ⏱️ Estimated Time
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#4f46e5' }}>
                ~{routeInfo.totalTimeMinutes} min
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                🚗 Vehicle Type
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                {driverVehicleType.charAt(0).toUpperCase() + driverVehicleType.slice(1)}
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                📍 Route Segments
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                You → Pickup: {routeInfo.driverToPickupDistance} km<br />
                Pickup → Dropoff: {routeInfo.pickupToDropoffDistance} km
              </div>
            </div>
          </div>

          {/* Route Quality Indicator */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: routeInfo.routeFound ? '#ecfdf5' : '#fef3c7', borderRadius: '0.375rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>
                {routeInfo.routeFound ? '✅' : '⚠️'}
              </span>
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: routeInfo.routeFound ? '#065f46' : '#92400e' }}>
                  {routeInfo.routeFound ? 'Optimized Route Calculated' : 'Straight-Line Estimate (Traffic considerations limited)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: routeInfo.routeFound ? '#047857' : '#78350f' }}>
                  {routeInfo.routeFound
                    ? 'Route considers traffic and road conditions'
                    : 'Showing direct path - actual route may vary'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Modal */}
      {isFullscreen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '0.5rem',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '1rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0 }}>
                🗺️ Full Route View
              </h2>
              <button
                onClick={onToggleFullscreen}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                ❌ Close
              </button>
            </div>
            <div style={{ flex: 1, padding: '1rem' }}>
              <DriverBiddingMap
                order={order}
                driverLocation={driverLocation}
                driverVehicleType={driverVehicleType}
                isFullscreen={false}
                onToggleFullscreen={() => { }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DriverBiddingMap;
