import React from 'react';
import { useMap } from 'react-leaflet';

const MapController = React.forwardRef((props, ref) => {
  const map = useMap();

  React.useImperativeHandle(ref, () => ({
    setView: (coordinates, zoom) => {
      if (map) {
        map.setView(coordinates, zoom);
      }
    }
  }));

  return null;
});

export default MapController;
