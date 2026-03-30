import React, { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import io from "socket.io-client";
import BidDriverMarker from "./BidDriverMarker";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/markers/marker-icon-2x.png",
  iconUrl: "/markers/marker-icon.png",
  shadowUrl: "/markers/marker-shadow.png",
});

const createPulseIcon = () => {
  return L.icon({
    iconUrl: "/markers/user-location.svg",
    iconSize: [60, 60],
    iconAnchor: [30, 30],
    popupAnchor: [0, -30],
    className: "",
  });
};

const OrdersMap = ({
  orders,
  driverLocation,
  radiusKm,
  onRadiusChange,
  onSelectOrder,
  theme = "dark",
}) => {
  const API_BASE = process.env.REACT_APP_API_URL;
  const tileUrl = `${API_BASE}/maps/tiles/{z}/{x}/{y}.png?v=3`;

  const getActiveLocation = () => {
    try {
      const fakeLocationStr = localStorage.getItem("fakeDriverLocation");
      if (fakeLocationStr) {
        const fakeLoc = JSON.parse(fakeLocationStr);
        const lat = fakeLoc?.lat || fakeLoc?.latitude;
        const lng = fakeLoc?.lng || fakeLoc?.longitude;
        if (fakeLoc && Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng };
        }
      }
    } catch (e) {
      // ignore
    }
    if (driverLocation) {
      const lat = driverLocation.lat || driverLocation.latitude;
      const lng = driverLocation.lng || driverLocation.longitude;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
    return null;
  };

  const activeLocation = getActiveLocation();
  const hasDriver = activeLocation !== null;
  const center = hasDriver
    ? [activeLocation.lat, activeLocation.lng]
    : [30.0444, 31.2357];
  const zoom = hasDriver ? 15 : 13;

  const [map, setMap] = useState(null);

  // Live bid locations from socket events
  const [liveBidLocations, setLiveBidLocations] = useState({});
  const socketRef = useRef(null);

  // Connect to socket and listen for bid_location_update events
  useEffect(() => {
    if (!API_BASE) return;

    const apiUrl = API_BASE.replace("/api", "");
    const socket = io(apiUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 5000,
      path: "/socket.io/",
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("🗺️ OrdersMap socket connected");
    });

    socket.on("bid_location_update", (data) => {
      const { driverId, latitude, longitude, heading, speed_kmh, timestamp } =
        data;
      if (driverId && Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setLiveBidLocations((prev) => ({
          ...prev,
          [driverId]: { latitude, longitude, heading, speed_kmh, timestamp },
        }));
      }
    });

    socket.on("disconnect", () => {
      console.log("🗺️ OrdersMap socket disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [API_BASE]);

  // Track if user has manually interacted with the map
  const userInteractedRef = useRef(false);
  const prevCenterRef = useRef(null);

  // Reset interaction flag when orders or radius change (new context)
  useEffect(() => {
    userInteractedRef.current = false;
  }, [orders?.length, radiusKm]);

  // Listen for user drag/zoom interactions to prevent auto-centering
  useEffect(() => {
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

  // Auto-fit map to show all bid locations (only when user hasn't interacted)
  useEffect(() => {
    if (!map) return;
    if (userInteractedRef.current) return;

    try {
      // Deep value comparison to prevent unnecessary setView calls
      const prev = prevCenterRef.current;
      if (prev && prev[0] === center[0] && prev[1] === center[1]) {
        return;
      }
      map.setView(center, zoom, { animate: true });
      prevCenterRef.current = center;
    } catch (e) {
      /* ignore */
    }
  }, [map, driverLocation]);

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "0.5rem",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.75rem",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151" }}
          >
            Orders within {radiusKm} km
          </div>
          <input
            type="range"
            min={0}
            max={20}
            step={1}
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ height: "60vh", width: "100%" }}>
        <MapContainer
          center={center}
          zoom={zoom}
          whenCreated={setMap}
          style={{ height: "100%", width: "100%", zIndex: 1 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url={tileUrl}
          />

          {hasDriver && (
            <Marker
              position={[activeLocation.lat, activeLocation.lng]}
              icon={createPulseIcon()}
              zIndexOffset={1000}
            >
              <Popup>
                <div style={{ fontSize: "0.875rem" }}>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                    Your Location
                  </div>
                  <div>Lat: {activeLocation.lat.toFixed(6)}</div>
                  <div>Lng: {activeLocation.lng.toFixed(6)}</div>
                </div>
              </Popup>
            </Marker>
          )}

          {orders.map((order) => {
            const pickup =
              order.pickupLocation?.coordinates ||
              (order.from
                ? { lat: order.from.lat, lng: order.from.lng }
                : null);
            if (
              !pickup ||
              !Number.isFinite(pickup.lat) ||
              !Number.isFinite(pickup.lng)
            )
              return null;

            const bids = Array.isArray(order.bids) ? order.bids : [];

            return (
              <React.Fragment key={order.id}>
                {/* Pickup marker */}
                <Marker
                  position={[pickup.lat, pickup.lng]}
                  icon={L.icon({
                    iconUrl: "/markers/marker-icon-2x-green.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                  eventHandlers={{ click: () => onSelectOrder(order) }}
                >
                  <Tooltip permanent direction="top">
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#111827",
                      }}
                    >
                      ${Number(order.price || 0).toFixed(2)}
                    </span>
                  </Tooltip>
                </Marker>

                {/* Bid driver markers with live location and routes */}
                {bids.map((bid) => {
                  const bidDriverId =
                    bid.driver_id || bid.userId || bid.user_id;
                  return (
                    <BidDriverMarker
                      key={`bid-${order.id}-${bidDriverId}`}
                      bid={bid}
                      pickup={pickup}
                      liveLocation={liveBidLocations[bidDriverId] || null}
                      onSelect={() => onSelectOrder(order)}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default OrdersMap;
