import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom markers with unique styling
const createCustomIcon = (iconType, color) => {
  const icons = {
    driver: '🚗',
    pickup: '📦',
    dropoff: '🏁'
  };

  const size = 60;

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

const DriverBiddingMap = React.memo(({ order, driverLocation, driverVehicleType = 'car', isFullscreen = false, onToggleFullscreen }) => {
  const [routePath, setRoutePath] = React.useState([]);
  const [routeInfo, setRouteInfo] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [driverCoords, setDriverCoords] = React.useState(null);
  const [pickupCoords, setPickupCoords] = React.useState(null);
  const [dropoffCoords, setDropoffCoords] = React.useState(null);
  const hasDriverCoords = !!(driverCoords && Number.isFinite(driverCoords.lat) && Number.isFinite(driverCoords.lng));

  // Parse order locations (handle both old and new formats)
  React.useEffect(() => {
    // Handle pickup location - support both old and new formats
    let pickupCoords = null;
    if (order.pickupLocation?.coordinates) {
      // New format
      pickupCoords = order.pickupLocation.coordinates;
    } else if (order.from) {
      // Old format converted to new format
      pickupCoords = { lat: order.from.lat, lng: order.from.lng };
    }
    setPickupCoords(pickupCoords);

    // Handle dropoff location
    let dropoffCoords = null;
    if (order.dropoffLocation?.coordinates) {
      // New format
      dropoffCoords = order.dropoffLocation.coordinates;
    } else if (order.to) {
      // Old format converted to new format
      dropoffCoords = { lat: order.to.lat, lng: order.to.lng };
    }
    setDropoffCoords(dropoffCoords);
  }, [order]);

  // Get real-time driver location if not provided
  React.useEffect(() => {
    if (!driverLocation && navigator.geolocation) {
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
        }
      );
    } else if (driverLocation) {
      const lat = driverLocation.latitude;
      const lng = driverLocation.longitude;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setDriverCoords({
          lat,
          lng,
          accuracy: driverLocation.accuracy || 100
        });
      } else if (pickupCoords) {
        setDriverCoords({ lat: pickupCoords.lat, lng: pickupCoords.lng, accuracy: 1000 });
      } else {
        setDriverCoords({ lat: 30.0444, lng: 31.2357, accuracy: 1000 });
      }
      setLoading(false);
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
    if (!hasDriverCoords || !pickupCoords || !dropoffCoords) {
      return;
    }

    const calculateRoute = async () => {
      try {
        // For demo purposes, we'll calculate a simple route
        // In production, you'd integrate with a routing service like GraphHopper, Mapbox, or OpenRouteService

        const driverPos = driverCoords;
        const pickupPos = pickupCoords;
        const dropoffPos = dropoffCoords;

        // Create waypoints: driver → pickup → dropoff
        const waypoints = [
          { lat: driverPos.lat, lng: driverPos.lng },
          { lat: pickupPos.lat, lng: pickupPos.lng },
          { lat: dropoffPos.lat, lng: dropoffPos.lng }
        ];

        // Calculate distances and times (simplified calculation)
        const toPickupDistance = calculateDistance(driverPos, pickupPos);
        const toDropoffDistance = calculateDistance(pickupPos, dropoffPos);

        // Calculate times based on vehicle type
        const vehicleSpeeds = {
          walker: 5,
          pedestrian: 5,
          bicycle: 15,
          bike: 20,
          scooter: 22,
          motorbike: 25,
          car: 35,
          van: 30,
          truck: 25
        };

        const speed = vehicleSpeeds[driverVehicleType] || 35;
        const toPickupTime = (toPickupDistance / speed) * 60; // minutes
        const toDeliveryTime = (toDropoffDistance / speed) * 60; // minutes

        // Create route path (simplified straight lines)
        const path = waypoints.map(point => [point.lat, point.lng]);

        setRoutePath(path);
        setRouteInfo({
          totalDistance: (toPickupDistance + toDropoffDistance).toFixed(1),
          driverToPickupDistance: toPickupDistance.toFixed(1),
          pickupToDropoffDistance: toDropoffDistance.toFixed(1),
          totalTimeMinutes: Math.ceil(toPickupTime + toDeliveryTime),
          pickupTimeMinutes: Math.ceil(toPickupTime),
          deliveryTimeMinutes: Math.ceil(toDeliveryTime),
          vehicleType: driverVehicleType,
          speed: speed,
          routeFound: true
        });
      } catch (error) {
        console.error('Route calculation error:', error);
        // Fallback to straight line
        const path = [
          [driverCoords.lat, driverCoords.lng],
          [pickupCoords.lat, pickupCoords.lng],
          [dropoffCoords.lat, dropoffCoords.lng]
        ];
        setRoutePath(path);
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

    calculateRoute();
  }, [hasDriverCoords, driverCoords, pickupCoords, dropoffCoords, order, driverVehicleType]);

  // Helper function to calculate distance between points
  const calculateDistance = (point1, point2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (point2.lat - point1.lat) * Math.PI / 180;
    const dLng = (point2.lng - point1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  const MapView = () => {
    const map = useMap();

    React.useEffect(() => {
      if (driverCoords && Number.isFinite(driverCoords.lat) && Number.isFinite(driverCoords.lng) && pickupCoords && dropoffCoords && map) {
        // Fit map to show all points with padding
        const bounds = L.latLngBounds([
          [driverCoords.lat, driverCoords.lng],
          [pickupCoords.lat, pickupCoords.lng],
          [dropoffCoords.lat, dropoffCoords.lng]
        ]);

        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }, [map]);

    return null;
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
              Please allow location access for best experience
            </p>
          )}
        </div>
      </div>
    );
  }

  const mapHeight = isFullscreen ? 'calc(100vh - 60px)' : '400px';

  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      {/* Debug Info */}
      <div style={{
        background: 'yellow',
        color: 'black',
        padding: '0.5rem',
        marginBottom: '1rem',
        fontSize: '0.75rem',
        borderRadius: '0.25rem',
        maxWidth: '800px',
        wordWrap: 'break-word'
      }}>
        DEBUG: Map showing for order {order.title || order.orderNumber || order._id}<br/>
        <strong>Order Status:</strong> {order.status}<br/>
        <strong>Order Data:</strong> {JSON.stringify({
          hasPickupLocation: !!order.pickupLocation,
          hasPickupCoords: !!order.pickupLocation?.coordinates,
          pickupLat: order.pickupLocation?.coordinates?.lat,
          pickupLng: order.pickupLocation?.coordinates?.lng,
          hasDropoffLocation: !!order.dropoffLocation,
          hasDropoffCoords: !!order.dropoffLocation?.coordinates,
          dropoffLat: order.dropoffLocation?.coordinates?.lat,
          dropoffLng: order.dropoffLocation?.coordinates?.lng,
          hasLegacyFrom: !!order.from,
          hasLegacyTo: !!order.to
        }, null, 0)}<br/>
        <strong>Driver Coords:</strong> {hasDriverCoords ? `Lat:${driverCoords.lat.toFixed(4)}, Lng:${driverCoords.lng.toFixed(4)}` : 'None'}
      </div>

      {/* Map Header with Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.75rem',
        background: '#ffffff',
        borderRadius: '0.5rem',
        border: '1px solid #e5e7eb'
      }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#374151', margin: 0 }}>
            📍 Route Preview - {order.title || `Order #${order.orderNumber}`}
          </h3>
          {routeInfo && (
            <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Distance: {routeInfo.totalDistance} km • Time: ~{routeInfo.totalTimeMinutes} min
            </p>
          )}
        </div>
        <button
          onClick={onToggleFullscreen}
          style={{
            padding: '0.5rem 1rem',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '0.375rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem'
          }}
        >
          {isFullscreen ? '🗗️ Exit Fullscreen' : '⛶ Fullscreen'}
        </button>
      </div>

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
          style={{ height: '100%', width: '100%' }}
          zoomControl={!isFullscreen}
        >
          <MapView />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            minZoom={1}
            updateWhenIdle={false}
            keepBuffer={4}
          />

          {/* Driver Location Marker */}
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

          {/* Route Polyline */}
          {routePath.length > 1 && (
            <Polyline
              positions={routePath}
              color="#4f46e5"
              weight={4}
              opacity={0.8}
              dashArray="10, 10"
            />
          )}
        </MapContainer>
      </div>

      {/* Route Information Panel */}
      {routeInfo && (
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
                {driverVehicleType.charAt(0).toUpperCase() + driverVehicleType.slice(1)} ({routeInfo.speed} km/h)
              </div>
            </div>

            <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.375rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                📍 Route Segments
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                You → Pickup: {routeInfo.driverToPickupDistance} km<br/>
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
                onToggleFullscreen={() => {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DriverBiddingMap;
