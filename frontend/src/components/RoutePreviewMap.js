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
const RoutePreviewMap = ({ pickup, dropoff, routeInfo, loading, compact = false, t }) => {
  // For testing, always return a visible div
  return (
    <div style={{
      background: 'rgba(0, 255, 0, 0.3)',
      border: '2px solid var(--matrix-border)',
      padding: '1rem',
      borderRadius: '0.5rem',
      marginBottom: '1rem',
      textAlign: 'center',
      color: 'var(--matrix-bright-green)'
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗺️</div>
      <p>This is where the route map will be shown for customers to view the pickup and delivery locations.</p>
      <p>Order pending bids, showing route preview.</p>
    </div>
  );

  // Original code kept for reference
  const hasCoordinates = pickup && dropoff;
  const centerLat = hasCoordinates ? (pickup.lat + dropoff.lat) / 2 : 30.0444;
  const centerLng = hasCoordinates ? (pickup.lng + dropoff.lng) / 2 : 31.2357;

  // Decode polyline if available (simplified - would use polyline library in production)
  const routePath = routeInfo?.polyline ? [] : (hasCoordinates ? [[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]] : []);

  return (
    <div style={{
      background: 'rgba(0, 17, 0, 0.8)',
      border: '2px solid var(--matrix-border)',
      padding: '1rem',
      borderRadius: '0.5rem',
      boxShadow: '0 0 10px var(--matrix-border)',
      opacity: 0.95,
      color: 'var(--matrix-bright-green)',
      fontFamily: 'Consolas, Monaco, Courier New, monospace'
    }}>
      {loading && (
        <div style={{ background: '#FEF3C7', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
          🔄 Calculating route...
        </div>
      )}

      {/* Map */}
      <div style={{ height: '400px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden' }}>
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
              minZoom={1}
              subdomains={['a', 'b', 'c']}
              tileSize={256}
              updateWhenZooming={false}
              updateWhenIdle={false}
              keepBuffer={3}
              tms={false}
              zoomReverse={false}
              detectRetina={false}
              maxNativeZoom={18}
              minNativeZoom={0}
              zoomOffset={0}
              errorTileUrl="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjU2IiBoZWlnaHQ9IjI1NiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2IiBzdHJva2U9IiNiMmIyYjIiIHN0cm9rZS13aWR0aD0iMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE2IiBmaWxsPSIjNjY2IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TWlzc2luZyBUaWxlPC90ZXh0Pjwvc3ZnPg=="
              crossOrigin={false}
            />
          {/* Show markers only if coordinates exist */}
          {hasCoordinates && (
            <>
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
            </>
          )}
        </MapContainer>
      </div>

      {/* Notice if no coordinates */}
      {!hasCoordinates && (
        <div style={{
          textAlign: 'center',
          padding: '1rem',
          background: 'rgba(245, 166, 11, 0.1)',
          border: '2px solid #F59E0B',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          fontFamily: 'Consolas, Monaco, Courier New, monospace'
        }}>
          <p style={{
            color: '#FBBF24',
            margin: 0,
            textShadow: '0 0 10px rgba(251, 191, 36, 0.8)'
          }}>
            🗺️ Order created without location coordinates. Map shows default city view. Use map picker during order creation for accurate routing.
          </p>
        </div>
      )}

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
          {routeInfo.estimates && Object.keys(routeInfo.estimates).length > 0 && (
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                Estimated Delivery Times by Vehicle Type
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                {Object.entries(routeInfo.estimates).map(([vehicle, data]) => (
                  <div key={vehicle} style={{ background: '#F9FAFB', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #E5E7EB', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{data.icon || '🚗'}</div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', textTransform: 'capitalize', marginBottom: '0.25rem' }}>
                      {vehicle === 'bicycle' ? 'Bicycle' : vehicle}
                    </p>
                    <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1F2937' }}>
                      {data.duration_minutes || 'N/A'} min
                    </p>
                    <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                      ~{data.speed_kmh || '?'} km/h
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RoutePreviewMap;
