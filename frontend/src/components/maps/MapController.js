import React from 'react';
import { useMap } from 'react-leaflet';

// MapInitializer component to handle proper map initialization and sizing
export const MapInitializer = ({ children, center, zoom = 13 }) => {
  const map = useMap();

  React.useEffect(() => {
    if (map && center) {
      // Initial view
      map.setView(center, zoom);

      // Ensure proper sizing and tile loading
      const initializeMap = () => {
        try {
          // Force map to recalculate its size and reload tiles
          map.invalidateSize();

          // Handle any window resize events
          const handleResize = () => {
            map.invalidateSize();
          };

          window.addEventListener('resize', handleResize);
          return () => window.removeEventListener('resize', handleResize);
        } catch (error) {
          console.warn('Map initialization error:', error);
        }
      };

      // Delay initialization to ensure DOM is ready
      const timeoutId = setTimeout(initializeMap, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [map, center, zoom]);

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
