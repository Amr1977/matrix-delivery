import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import RoutePreviewMap from './RoutePreviewMap';
import io from 'socket.io-client';

const AsyncOrderMap = ({ order, currentUser, driverLocation, theme = 'dark', onTelemetryUpdate, ...props }) => {
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [actualRoute, setActualRoute] = useState(null);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  const isActiveOrder = ['accepted', 'picked_up', 'in_transit'].includes(order.status);
  const canView = (
    currentUser?.primary_role === 'admin' ||
    (currentUser?.primary_role === 'customer' && order.customerId === currentUser?.id) ||
    (currentUser?.primary_role === 'driver' && order.assignedDriver?.userId === currentUser?.id)
  );
  const shouldFetch = isActiveOrder && canView;

  const calculateDistanceKm = (a, b) => {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const updateTelemetry = useCallback((lat, lng) => {
    if (!onTelemetryUpdate) return;
    const nextTarget = order.status === 'accepted' ? order.from : order.to;
    if (!nextTarget?.lat || !nextTarget?.lng) return;
    const distanceKm = calculateDistanceKm({ lat, lng }, { lat: nextTarget.lat, lng: nextTarget.lng });
    const speed = 30; // fallback if unknown
    const etaMinutes = Math.ceil((distanceKm / speed) * 60);
    onTelemetryUpdate({ distanceKm: distanceKm.toFixed(1), etaMinutes, speedKmh: '0', lastUpdated: new Date().toISOString(), nextTarget: order.status === 'accepted' ? 'pickup' : 'delivery' });
  }, [onTelemetryUpdate, order.status, order.from, order.to]);

  const fetchTracking = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orders/${order.id}/tracking`);
      const loc = res?.currentLocation;
      if (loc && Number.isFinite(parseFloat(loc.lat)) && Number.isFinite(parseFloat(loc.lng))) {
        const lat = parseFloat(loc.lat), lng = parseFloat(loc.lng);
        setCurrentDriverLocation({ latitude: lat, longitude: lng, timestamp: loc.timestamp, heading: loc.heading, speedKmh: loc.speedKmh, accuracyMeters: loc.accuracyMeters });
        updateTelemetry(lat, lng);
      }
      if (Array.isArray(res?.locationHistory) && res.locationHistory.length > 0) {
        const path = res.locationHistory.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
        setActualRoute(path);
      }
    } catch (err) {
      console.warn('[AsyncOrderMap] tracking fetch failed', err?.message || err);
    } finally {
      setLoading(false);
    }
  }, [order.id, updateTelemetry]);

  useEffect(() => {
    if (!shouldFetch) return;
    fetchTracking();
  }, [shouldFetch, fetchTracking]);

  useEffect(() => {
    if (!shouldFetch) return;
    const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
    const socket = io(apiUrl, { withCredentials: true, transports: ['websocket'], reconnection: true });
    socketRef.current = socket;

    socket.on('connect', () => { socket.emit('join_order', { orderId: order.id }); });
    socket.on('connect_error', () => fetchTracking());
    socket.on('error', () => {});
    socket.on('location_update', (data) => {
      if (data.orderId !== order.id) return;
      const lat = parseFloat(data.latitude), lng = parseFloat(data.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setCurrentDriverLocation({ latitude: lat, longitude: lng, timestamp: data.timestamp, heading: data.heading, speedKmh: data.speedKmh, accuracyMeters: data.accuracyMeters });
      updateTelemetry(lat, lng);
    });

    return () => {
      try { socket.emit('leave_order', order.id); } catch {}
      socket.disconnect();
      socketRef.current = null;
    };
  }, [shouldFetch, order.id, fetchTracking, updateTelemetry]);

  useEffect(() => {
    if (!shouldFetch) return;
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    pollRef.current = setInterval(() => {
      const s = socketRef.current;
      if (!s || s.disconnected) fetchTracking();
    }, 15000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [shouldFetch, fetchTracking]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {loading && (
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: '#00FF00', padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontFamily: 'monospace', pointerEvents: 'none' }}>⚡ Loading route...</div>
      )}
      <RoutePreviewMap
        pickup={order.from}
        dropoff={order.to}
        driverLocation={driverLocation || currentDriverLocation}
        routeInfo={{
          polyline: order.routePolyline,
          distance_km: order.estimatedDistanceKm,
          route_found: !!order.routePolyline,
          osrm_used: !!order.routePolyline,
          actualRoutePolyline: actualRoute
        }}
        compact={true}
        mapTitle={`Order #${order.orderNumber || order.id}`}
        theme={theme}
        {...props}
      />
    </div>
  );
};

export default AsyncOrderMap;
