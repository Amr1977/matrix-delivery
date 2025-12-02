// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

/**
 * InteractiveLocationPicker Component
 * Allows users to click on a map to select a location for testing purposes
 */
const InteractiveLocationPicker = ({ onLocationSelect }) => {
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapRef = useRef(null);

  // Default center (world view)
  const defaultCenter = [20, 0];

  // Custom marker icon for selected location
  const selectedIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Component to handle map clicks - only render when map is ready
  const LocationMarker = () => {
    const map = useMapEvents({
      click(e) {
        if (!isMapReady) return;
        const { lat, lng } = e.latlng;
        setSelectedPosition([lat, lng]);
        onLocationSelect(lat, lng);
        console.log('📍 Location selected:', lat.toFixed(6), lng.toFixed(6));
      },
      zoomend() {
        if (!isMapReady) return;
        try {
          setCurrentZoom(map.getZoom());
        } catch (error) {
          console.warn('Zoom end error:', error);
        }
      }
    });

    return selectedPosition === null ? null : (
      <Marker position={selectedPosition} icon={selectedIcon}>
        <Popup>
          <div style={{ textAlign: 'center', fontFamily: 'monospace', fontSize: '0.875rem' }}>
            <strong>Selected Location</strong><br />
            Lat: {selectedPosition[0].toFixed(6)}<br />
            Lng: {selectedPosition[1].toFixed(6)}
          </div>
        </Popup>
      </Marker>
    );
  };

  // Load previously saved location on component mount
  useEffect(() => {
    try {
      const fakeLocation = localStorage.getItem('fakeDriverLocation');
      if (fakeLocation) {
        const loc = JSON.parse(fakeLocation);
        if (loc.lat && loc.lng) {
          setSelectedPosition([loc.lat, loc.lng]);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved location:', error);
    }
  }, []);

  // Handle map ready state
  const handleMapReady = () => {
    setIsMapReady(true);
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={defaultCenter}
        zoom={2}
        style={{
          height: '100%',
          width: '100%',
          borderRadius: '0.375rem'
        }}
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
        doubleClickZoom={true}
        whenReady={handleMapReady}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {isMapReady && <LocationMarker />}
      </MapContainer>

      {/* Loading indicator */}
      {!isMapReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '0.875rem',
          zIndex: 1000
        }}>
          Loading Map...
        </div>
      )}

      {/* Instructions overlay */}
      {isMapReady && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '8px 12px',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          fontSize: '0.75rem',
          color: '#374151',
          maxWidth: '250px',
          zIndex: 1000,
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px' }}>
            🖱️ Click to Set Location
          </div>
          <div>
            Click anywhere on the map to place your marker. You can pan and zoom to navigate.
          </div>
          {selectedPosition && (
            <div style={{
              marginTop: '6px',
              padding: '4px 8px',
              background: '#EF4444',
              color: 'white',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontFamily: 'monospace'
            }}>
              📍 {selectedPosition[0].toFixed(4)}, {selectedPosition[1].toFixed(4)}
            </div>
          )}
        </div>
      )}

      {/* Zoom level indicator */}
      {isMapReady && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontFamily: 'monospace',
          zIndex: 1000
        }}>
          Zoom: {currentZoom}
        </div>
      )}
    </div>
  );
};

export default InteractiveLocationPicker;
