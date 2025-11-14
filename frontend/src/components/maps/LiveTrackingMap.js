import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';

const LiveTrackingMap = React.memo(({ order, token }) => {
  const [driverLocation, setDriverLocation] = React.useState(null);
  const [locationHistory, setLocationHistory] = React.useState([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const socketRef = React.useRef(null);
  const mapRef = React.useRef(null);

  React.useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api';
    const socketUrl = apiUrl.replace('/api', '');

    // Configure Socket.IO client with proper options
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
    <div style={{ height: '500px', width: '100%', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ background: isConnected ? '#10B981' : '#EF4444', color: 'white', padding: '0.5rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>
        {isConnected ? 'Live Tracking Active' : 'Connecting...'}
      </div>
      <MapContainer center={driverLocation ? [driverLocation.lat, driverLocation.lng] : (order.pickupLocation?.coordinates ? [order.pickupLocation.coordinates.lat, order.pickupLocation.coordinates.lng] : [30.0444, 31.2357])} zoom={13} style={{ height: 'calc(100% - 40px)', width: '100%' }}>
        <MapUpdater />
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {order.pickupLocation?.coordinates && <Marker position={[order.pickupLocation.coordinates.lat, order.pickupLocation.coordinates.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>Pickup</strong></Popup></Marker>}
        {order.dropoffLocation?.coordinates && <Marker position={[order.dropoffLocation.coordinates.lat, order.dropoffLocation.coordinates.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>Delivery</strong></Popup></Marker>}
        {driverLocation && <Marker position={[driverLocation.lat, driverLocation.lng]} icon={L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', iconSize: [25, 41], iconAnchor: [12, 41] })}><Popup><strong>Driver</strong></Popup></Marker>}
        {locationHistory.length > 1 && <Polyline positions={locationHistory.map(loc => [loc.lat, loc.lng])} color="#4F46E5" weight={3} opacity={0.7} />}
      </MapContainer>
    </div>
  );
});

export default LiveTrackingMap;
