import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/markers/marker-icon-2x.png',
  iconUrl: '/markers/marker-icon.png',
  shadowUrl: '/markers/marker-shadow.png'
});

const createPulseIcon = () => {
  return L.icon({
    iconUrl: '/markers/user-location.svg',
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
    className: ''
  });
};

const priceIcon = (price) => L.divIcon({
  html: `<div style="
    background: #111827; color: #fff; border: 2px solid #4F46E5;
    border-radius: 9999px; padding: 4px 8px; font-size: 12px; font-weight: 700;
    box-shadow: 0 6px 12px rgba(0,0,0,0.25);
  ">$${Number(price || 0).toFixed(2)}</div>`,
  className: '',
  iconSize: [60, 24],
  iconAnchor: [30, 30]
});

const OrdersMap = ({
  orders,
  driverLocation,
  radiusKm,
  onRadiusChange,
  onSelectOrder,
  theme = 'dark'
}) => {
  // Get API base URL from environment, strip /api suffix for tile endpoint
  const API_BASE = process.env.REACT_APP_API_URL;
  const tileUrl = `${API_BASE}/maps/tiles/{z}/{x}/{y}.png?v=3`;
  console.log('🗺️ OrdersMap tileUrl:', tileUrl, '| API_BASE:', API_BASE);

  const getActiveLocation = () => {
    try {
      const fakeLocationStr = localStorage.getItem('fakeDriverLocation');
      if (fakeLocationStr) {
        const fakeLoc = JSON.parse(fakeLocationStr);
        const lat = fakeLoc?.lat || fakeLoc?.latitude;
        const lng = fakeLoc?.lng || fakeLoc?.longitude;
        if (fakeLoc && Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    if (driverLocation) {
      const lat = driverLocation.lat || driverLocation.latitude;
      const lng = driverLocation.lng || driverLocation.longitude;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  const activeLocation = getActiveLocation();
  const hasDriver = activeLocation !== null;
  const center = hasDriver ? [activeLocation.lat, activeLocation.lng] : [30.0444, 31.2357];

  const zoom = hasDriver ? 15 : 13;

  const [map, setMap] = useState(null);

  useEffect(() => {
    if (map && hasDriver) {
      try { map.setView(center, zoom, { animate: true }); } catch (e) { /* ignore if map not ready */ }
    }
  }, [map, driverLocation]);

  return (
    <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '0.75rem', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Orders within {radiusKm} km</div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      <div style={{ height: '60vh', width: '100%' }}>
        <MapContainer center={center} zoom={zoom} whenCreated={setMap} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={tileUrl}
          />

          {hasDriver && (
            <Marker position={[activeLocation.lat, activeLocation.lng]} icon={createPulseIcon()} zIndexOffset={1000}>
              <Popup>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Your Location</div>
                  <div>Lat: {activeLocation.lat.toFixed(6)}</div>
                  <div>Lng: {activeLocation.lng.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {orders.map((order) => {
            const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
            if (!pickup || !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)) return null;
            return (
              <Marker
                key={order.id}
                position={[pickup.lat, pickup.lng]}
                icon={L.icon({
                  iconUrl: '/markers/marker-icon-2x-green.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41]
                })}
                eventHandlers={{ click: () => onSelectOrder(order) }}
              >
                <Tooltip permanent direction="top">
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827' }}>
                    ${Number(order.price || 0).toFixed(2)}
                  </span>
                </Tooltip>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default OrdersMap;
