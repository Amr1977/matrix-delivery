import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png'
});

const createPulseIcon = () => {
  const size = 42;
  return L.divIcon({
    html: `
      <div style="position: relative; width: ${size}px; height: ${size}px;">
        <div style="
          position: absolute; inset: 0;
          background: #4F46E5;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 8px 16px rgba(0,0,0,0.4);
        "></div>
        <div style="
          position: absolute; inset: 0;
          border-radius: 50%;
          animation: pulseRing 1.8s ease-out infinite;
          box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.6);
        "></div>
        <style>
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0.6); }
          70% { box-shadow: 0 0 0 18px rgba(79, 70, 229, 0); }
          100% { box-shadow: 0 0 0 0 rgba(79, 70, 229, 0); }
        }
        </style>
      </div>
    `,
    className: '',
    iconSize: [size, size],
    iconAnchor: [Math.floor(size / 2), Math.floor(size / 2)],
    popupAnchor: [0, -size]
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
  // Check for fake location first (development/testing feature)
  const getActiveLocation = () => {
    try {
      const fakeLocationStr = localStorage.getItem('fakeDriverLocation');
      if (fakeLocationStr) {
        const fakeLoc = JSON.parse(fakeLocationStr);
        if (fakeLoc && Number.isFinite(fakeLoc.latitude) && Number.isFinite(fakeLoc.longitude)) {
          return fakeLoc;
        }
      }
    } catch (e) {
      // ignore parse errors
    }
    return driverLocation;
  };

  const activeLocation = getActiveLocation();
  const hasDriver = activeLocation && Number.isFinite(activeLocation.latitude) && Number.isFinite(activeLocation.longitude);
  const center = hasDriver ? [activeLocation.latitude, activeLocation.longitude] : [30.0444, 31.2357];

  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

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
            <Marker position={[activeLocation.latitude, activeLocation.longitude]} icon={createPulseIcon()}>
              <Popup>
                <div style={{ fontSize: '0.875rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Your Location</div>
                  <div>Lat: {activeLocation.latitude.toFixed(6)}</div>
                  <div>Lng: {activeLocation.longitude.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {orders.map((order) => {
            const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
            if (!pickup || !Number.isFinite(pickup.lat) || !Number.isFinite(pickup.lng)) return null;
            return (
              <Marker
                key={order._id}
                position={[pickup.lat, pickup.lng]}
                icon={L.icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
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
