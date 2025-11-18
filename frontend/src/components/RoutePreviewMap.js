 import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

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
            <Popup><strong>Pickup Location</strong></Popup>
          </Marker>
          <Marker
            position={[dropoff.lat, dropoff.lng]}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41]
            })}
          >
            <Popup><strong>Dropoff Location</strong></Popup>
          </Marker>
          <Polyline positions={routePath} color="#4F46E5" weight={4} opacity={0.7} />
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

export default RoutePreviewMap;
