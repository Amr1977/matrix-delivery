import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const LocationMarker = React.memo(({ selectedPosition, setSelectedPosition, t }) => {
  const map = React.useMapEvents({
    click(e) {
      const newPosition = [e.latlng.lat, e.latlng.lng];
      setSelectedPosition(newPosition);
    },
  });

  return selectedPosition ? (
    <Marker position={selectedPosition}>
      <Popup>
        <div style={{ textAlign: 'center', fontSize: '0.875rem' }}>
          <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
            📍 {t('tracking.selectedLocation')}
          </div>
          <div style={{ color: '#6B7280', marginBottom: '0.5rem' }}>
            {t('tracking.coordinates')}: {selectedPosition[0].toFixed(6)}, {selectedPosition[1].toFixed(6)}
          </div>
          <button
            onClick={() => {
              navigator.share({
                text: `Location: ${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`,
                url: `https://www.openstreetmap.org/?mlat=${selectedPosition[0]}&mlon=${selectedPosition[1]}`
              }).catch(() => {
                navigator.clipboard.writeText(`${selectedPosition[0].toFixed(6)}, ${selectedPosition[1].toFixed(6)}`);
              });
            }}
            style={{
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              padding: '0.25rem 0.5rem',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            {t('tracking.copyCoordinates')}
          </button>
        </div>
      </Popup>
    </Marker>
  ) : null;
});

export default LocationMarker;
