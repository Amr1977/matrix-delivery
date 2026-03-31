import React from "react";
import { useMap } from "react-leaflet";

// MapInitializer component to handle proper map initialization and sizing
export const MapInitializer = ({ children, center, zoom = 13 }) => {
  const map = useMap();

  const prevCenterRef = React.useRef(null);
  const userInteractedRef = React.useRef(false);

  // Track user drag/zoom interactions to prevent auto-centering after user interaction
  React.useEffect(() => {
    if (!map) return;
    const handleInteraction = () => {
      userInteractedRef.current = true;
    };
    map.on("dragstart", handleInteraction);
    map.on("zoomstart", handleInteraction);
    return () => {
      map.off("dragstart", handleInteraction);
      map.off("zoomstart", handleInteraction);
    };
  }, [map]);

  // Only auto-center on INITIAL load, never after user interaction
  React.useEffect(() => {
    if (!map || !center) return;
    if (userInteractedRef.current) return;

    const currentLat = Array.isArray(center) ? center[0] : center.lat;
    const currentLng = Array.isArray(center) ? center[1] : center.lng;
    const prev = prevCenterRef.current;

    if (!prev) {
      map.setView(center, zoom);
      prevCenterRef.current = center;
      try { map.invalidateSize(); } catch {}
    }
  }, [map, center, zoom]);

  // Handle resize separately to keep it active
  React.useEffect(() => {
    if (!map) return;
    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
            console.warn("Map invalidateSize failed:", error);
          }
        }, 100);
      }
    },
  }));

  return null;
});

export default MapController;
