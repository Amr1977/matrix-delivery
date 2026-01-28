import React, { useState, useEffect } from 'react';
import { Marker } from 'react-leaflet';

// ============ ROUTE PREVIEW MAP COMPONENT ============
// ============ DRAGGABLE MARKER COMPONENT ============
export const DraggableMarker = ({ position, icon, onDragEnd, children, isDragging, setIsDragging }) => {
  const [markerPosition, setMarkerPosition] = useState(position);

  useEffect(() => {
    setMarkerPosition(position);
  }, [position]);

  const eventHandlers = {
    dragstart: () => {
      if (setIsDragging) {
        setIsDragging(true);
      }
    },
    dragend: (e) => {
      const newPos = e.target.getLatLng();
      const coords = { lat: newPos.lat, lng: newPos.lng };
      setMarkerPosition(newPos);

      // Update the location immediately when drag ends
      if (onDragEnd) {
        onDragEnd(coords);
      }

      if (setIsDragging) {
        setIsDragging(false);
      }
    }
  };

  return (
    <Marker
      position={markerPosition}
      icon={icon}
      draggable={true}
      eventHandlers={eventHandlers}
    >
      {children}
    </Marker>
  );
};
