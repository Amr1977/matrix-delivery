import React from 'react';
import { useMap } from 'react-leaflet';

// MapInitializer component to handle proper map initialization and sizing
export const MapInitializer = ({ children, center, zoom = 13 }) => {
  const map = useMap();

  const prevCenterRef = React.useRef(null);

  React.useEffect(() => {
    if (map && center) {
      // Deep compare center to prevent unnecessary resets
      const prev = prevCenterRef.current;
      const currentLat = Array.isArray(center) ? center[0] : center.lat;
      const currentLng = Array.isArray(center) ? center[1] : center.lng;

      const prevLat = prev ? (Array.isArray(prev) ? prev[0] : prev.lat) : null;
      const prevLng = prev ? (Array.isArray(prev) ? prev[1] : prev.lng) : null;

      // Only update if coordinates actually changed
      if (currentLat !== prevLat || currentLng !== prevLng) {
        map.setView(center, zoom);
        prevCenterRef.current = center;

        // Ensure proper sizing and tile loading
        const initializeMap = () => {
          try {
            map.invalidateSize();
          } catch (error) {
            console.warn('Map initialization error:', error);
          }
        };

        // Delay initialization to ensure DOM is ready
        const timeoutId = setTimeout(initializeMap, 100);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [map, center, zoom]);

  // Handle resize separately to keep it active
  React.useEffect(() => {
    if (!map) return;
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);

  return children || null;
};

const MapController = React.forwardRef((props, ref) => {
  const map = useMap();

  React.useImperativeHandle(ref, () => ({
    setView: (coordinates, zoom) => {
      if (map) {
        map.setView(coordinates, zoom);
        // Force tile reload after view change
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch (error) {
            console.warn('Map invalidateSize failed:', error);
          }
        }, 100);
      }
    }
  }));

  return null;
});

export default MapController;
