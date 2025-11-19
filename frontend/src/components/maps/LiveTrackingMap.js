import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';

// OpenRouteService configuration - Replace with your actual API key
const ORS_API_KEY = process.env.REACT_APP_ORS_API_KEY || '5b3ce3597851110001cf624877f8d68432634e7f8fd4b9f523e9f951';
const ORS_BASE_URL = 'https://api.openrouteservice.org/v2';

// Get driving route using OpenRouteService API
const getDrivingRoute = async (startLat, startLng, endLat, endLng) => {
  try {
    const coordinates = [[startLng, startLat], [endLng, endLat]];
    const response = await fetch(`${ORS_BASE_URL}/directions/driving-car?api_key=${ORS_API_KEY}&coordinates=${JSON.stringify(coordinates)}&format=geojson`);

    if (!response.ok) {
      throw new Error(`ORS API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      throw new Error('No route found');
    }

    const route = data.features[0];
    const geometry = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // Convert to [lat, lng]
    const distance = route.properties.segments[0].distance / 1000; // Convert meters to km
    const duration = route.properties.segments[0].duration; // Duration in seconds

    return {
      route: geometry,
      distance: distance,
      duration: duration,
      segments: route.properties.segments
    };
  } catch (error) {
    console.warn('Failed to get driving route, falling back to straight line:', error);
    // Fallback to Haversine calculation if API fails
    const distance = calculateStraightLineDistance(startLat, startLng, endLat, endLng);
    return {
      route: [[startLat, startLng], [endLat, endLng]], // Straight line
      distance: distance,
      duration: (distance / 30) * 3600, // 30 km/h assumption, convert to seconds
      segments: null
    };
  }
};

// Fallback function for straight-line distance (Haversine)
const calculateStraightLineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Format duration from seconds to readable format
const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) {
    return `${minutes} min`;
  } else if (minutes === 0) {
    return `${hours} hr`;
  } else {
    return `${hours}h ${minutes}m`;
  }
};

const LiveTrackingMap = React.memo(({ order, token }) => {
  const [driverLocation, setDriverLocation] = React.useState(null);
  const [locationHistory, setLocationHistory] = React.useState([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [routeToPickup, setRouteToPickup] = React.useState([]);
  const [routeToDelivery, setRouteToDelivery] = React.useState([]);
  const [etaInfo, setEtaInfo] = React.useState({});
  const socketRef = React.useRef(null);
  const mapRef = React.useRef(null);

  // Calculate ETAs when driver location or route coordinates change
  React.useEffect(() => {
    const calculateRoutesAndETAs = async () => {
      if (driverLocation && order.from && order.to) {
        try {
          const pickupCoords = { lat: parseFloat(order.from.lat), lng: parseFloat(order.from.lng) };
          const deliveryCoords = { lat: parseFloat(order.to.lat), lng: parseFloat(order.to.lng) };

          // Get actual driving route to pickup
          const pickupRoute = await getDrivingRoute(
            driverLocation.lat, driverLocation.lng,
            pickupCoords.lat, pickupCoords.lng
          );

          // Get actual driving route from pickup to delivery
          const deliveryRoute = await getDrivingRoute(
            pickupCoords.lat, pickupCoords.lng,
            deliveryCoords.lat, deliveryCoords.lng
          );

          // Update route visualizations
          setRouteToPickup(pickupRoute.route);
          setRouteToDelivery(deliveryRoute.route);

          // Set ETA information
          setEtaInfo({
            toPickup: {
              distance: pickupRoute.distance.toFixed(1),
              time: formatDuration(pickupRoute.duration)
            },
            toDelivery: {
              distance: deliveryRoute.distance.toFixed(1),
              time: formatDuration(deliveryRoute.duration)
            },
            status: order.status,
            hasActualRoutes: true
          });

        } catch (error) {
          console.warn('Failed to calculate routes, using straight line distances:', error);

          // Fallback to straight-line calculations
          const pickupCoords = { lat: parseFloat(order.from.lat), lng: parseFloat(order.from.lng) };
          const deliveryCoords = { lat: parseFloat(order.to.lat), lng: parseFloat(order.to.lng) };

          const distanceToPickup = calculateStraightLineDistance(
            driverLocation.lat, driverLocation.lng,
            pickupCoords.lat, pickupCoords.lng
          );

          const distanceToDelivery = calculateStraightLineDistance(
            pickupCoords.lat, pickupCoords.lng,
            deliveryCoords.lat, deliveryCoords.lng
          );

          const etaToPickup = formatDuration(distanceToPickup / 30 * 3600); // Assuming 30 km/h
          const etaToDelivery = formatDuration(distanceToDelivery / 30 * 3600);

          setEtaInfo({
            toPickup: { distance: distanceToPickup.toFixed(1), time: etaToPickup },
            toDelivery: { distance: distanceToDelivery.toFixed(1), time: etaToDelivery },
            status: order.status,
            hasActualRoutes: false
          });

          // Set straight-line routes for visualization
          setRouteToPickup([[driverLocation.lat, driverLocation.lng], [pickupCoords.lat, pickupCoords.lng]]);
          setRouteToDelivery([[pickupCoords.lat, pickupCoords.lng], [deliveryCoords.lat, deliveryCoords.lng]]);
        }
      }
    };

    calculateRoutesAndETAs();
  }, [driverLocation, order.from, order.to, order.status]);

  React.useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';
    const socketUrl = apiUrl.replace('/api', '');

    const socket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_order', { orderId: order._id, token: token });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('location_update', (data) => {
      const newLocation = { lat: data.latitude, lng: data.longitude, timestamp: data.timestamp };
      setDriverLocation(newLocation);
      setLocationHistory(prev => [...prev, newLocation]);
      if (mapRef.current && mapRef.current.setView) {
        mapRef.current.setView([data.latitude, data.longitude], 15);
      }
    });

    let locationInterval;
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser.id) {
      locationInterval = setInterval(() => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              socket.emit('update_location', {
                orderId: order._id,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                token: token
              });
            }
          );
        }
      }, 30000);
    }

    return () => {
      socket.emit('leave_order', order._id);
      socket.disconnect();
      if (locationInterval) clearInterval(locationInterval);
    };
  }, [order._id, token]);

  const MapUpdater = () => {
    const map = useMap();
    React.useEffect(() => { mapRef.current = map; }, [map]);
    return null;
  };

  return (
    <div style={{ height: '600px', width: '100%', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1rem' }}>
      {/* Status Bar */}
      <div style={{
        background: isConnected ? '#10B981' : '#EF4444',
        color: 'white',
        padding: '0.75rem',
        textAlign: 'center',
        fontSize: '0.875rem',
        fontWeight: '600'
      }}>
        {isConnected ? '🛰️ Live Tracking Active' : '🔌 Connecting...'}
      </div>

      {/* Info Panel */}
      <div style={{
        background: '#F8FAFC',
        padding: '0.75rem',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4F46E5' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Actual Route</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Pickup Point</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#DC2626' }}></div>
            <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Delivery Point</span>
          </div>
        </div>

        {etaInfo.toPickup && (
          <div style={{ fontSize: '0.75rem', color: '#4B5563' }}>
            📍 {etaInfo.toPickup.distance} km, {etaInfo.toPickup.time} to pickup
          </div>
        )}
      </div>

      <MapContainer
        center={driverLocation ? [driverLocation.lat, driverLocation.lng] : [parseFloat(order.from?.lat || 30.0444), parseFloat(order.from?.lng || 31.2357)]}
        zoom={14}
        style={{ height: 'calc(100% - 120px)', width: '100%' }}
      >
        <MapUpdater />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={1}
        />

        {/* Markers with enhanced popups */}
        {/* Pickup Marker */}
        <Marker
          position={[parseFloat(order.from?.lat || 30.0444), parseFloat(order.from?.lng || 31.2357)]}
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>📦 Pickup Location</strong>
              <br />
              {order.pickupAddress}
              <br />
              {etaInfo.toDelivery && (
                <span style={{ fontSize: '0.8em', color: '#059669' }}>
                  Distance to delivery: {etaInfo.toDelivery.distance} km ({etaInfo.toDelivery.time})
                </span>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Delivery Marker */}
        <Marker
          position={[parseFloat(order.to?.lat || 30.0444), parseFloat(order.to?.lng || 31.2357)]}
          icon={L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
          })}
        >
          <Popup>
            <div style={{ textAlign: 'center' }}>
              <strong>🏠 Delivery Location</strong>
              <br />
              {order.deliveryAddress}
            </div>
          </Popup>
        </Marker>

        {/* Driver Marker */}
        {driverLocation && (
          <Marker
            position={[driverLocation.lat, driverLocation.lng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })}
          >
            <Popup>
              <div style={{ textAlign: 'center' }}>
                <strong>🚚 Driver Location</strong>
                <br />
                <span style={{ fontSize: '0.8em' }}>
                  Lat: {driverLocation.lat.toFixed(4)}, Lng: {driverLocation.lng.toFixed(4)}
                </span>
                {etaInfo.toPickup && (
                  <>
                    <br />
                    <span style={{ fontSize: '0.8em', color: '#4F46E5' }}>
                      To pickup: {etaInfo.toPickup.distance} km ({etaInfo.toPickup.time})
                    </span>
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver's actual path (historical locations) */}
        {locationHistory.length > 1 && (
          <Polyline
            positions={locationHistory.map(loc => [loc.lat, loc.lng])}
            color="#4F46E5"
            weight={4}
            opacity={0.8}
            dashArray="5, 10"
          />
        )}

        {/* Expected route to pickup (dashed line) */}
        {driverLocation && order.from && routeToPickup.length > 0 && (
          <Polyline
            positions={routeToPickup}
            color="#059669"
            weight={3}
            opacity={0.7}
            dashArray="10, 15"
          />
        )}

        {/* Expected route from pickup to delivery */}
        {order.from && order.to && routeToDelivery.length > 0 && (
          <Polyline
            positions={routeToDelivery}
            color="#DC2626"
            weight={3}
            opacity={0.7}
            dashArray="10, 15"
          />
        )}
      </MapContainer>
    </div>
  );
});

export default LiveTrackingMap;
