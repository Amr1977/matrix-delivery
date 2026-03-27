import React, { useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import { ClickableMap } from "./FullscreenMapModal";

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/markers/marker-icon-2x.png",
  iconUrl: "/markers/marker-icon.png",
  shadowUrl: "/markers/marker-shadow.png",
});

function RoutePreviewMap({
  pickup,
  dropoff,
  routeInfo,
  driverLocation,
  driverToPickupPath = [],
  pickupToDropoffPath = [],
  bids = [],
  onBidAccept,
  onBidSelect,
  selectedBidId: externalSelectedBidId,
  loading,
  compact = false,
  t,
  mapTitle = "Route Preview",
  theme = "dark",
}) {
  const [internalSelectedBidId, setInternalSelectedBidId] = useState(null);
  const selectedBidId =
    externalSelectedBidId !== undefined
      ? externalSelectedBidId
      : internalSelectedBidId;

  // Debug: check if coordinates are valid before passing to MapContainer
  const hasPickupCoords =
    pickup?.lat &&
    pickup?.lng &&
    Number.isFinite(pickup.lat) &&
    Number.isFinite(pickup.lng);
  const hasDropoffCoords =
    dropoff?.lat &&
    dropoff?.lng &&
    Number.isFinite(dropoff.lat) &&
    Number.isFinite(dropoff.lng);
  const hasCoords = hasPickupCoords || hasDropoffCoords;
  const hasCoordinates = hasCoords; // Alias for existing code

  console.log(
    `🗺️ [RoutePreviewMap] Coordinates check: pickup=${pickup}, dropoff=${dropoff}, hasPickup=${hasPickupCoords}, hasDropoff=${hasDropoffCoords}, hasCoords=${hasCoords}`,
  );

  // Normalize driverLocation coordinates
  const driverLat = Number(driverLocation?.lat || driverLocation?.latitude);
  const driverLng = Number(driverLocation?.lng || driverLocation?.longitude);
  const hasDriverCoords =
    Number.isFinite(driverLat) && Number.isFinite(driverLng);

  console.log(
    `🗺️ [RoutePreviewMap] driverLocation prop:`,
    driverLocation,
    "| normalized:",
    driverLat,
    driverLng,
    "| hasCoords:",
    hasDriverCoords,
  );

  const haversineKm = (a, b) => {
    if (
      !a ||
      !b ||
      !Number.isFinite(Number(a.lat)) ||
      !Number.isFinite(Number(a.lng)) ||
      !Number.isFinite(Number(b.lat)) ||
      !Number.isFinite(Number(b.lng))
    ) {
      return null;
    }
    const R = 6371;
    const dLat = ((Number(b.lat) - Number(a.lat)) * Math.PI) / 180;
    const dLng = ((Number(b.lng) - Number(a.lng)) * Math.PI) / 180;
    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((Number(a.lat) * Math.PI) / 180) *
        Math.cos((Number(b.lat) * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  const getBidPickupTelemetry = (bid, bidLat, bidLng) => {
    const rawDistance = Number(
      bid.pickupDistanceKm ?? bid.pickup_distance_km ?? bid.distance_km,
    );
    const distanceKm =
      Number.isFinite(rawDistance) && rawDistance > 0
        ? rawDistance
        : pickup
          ? haversineKm({ lat: bidLat, lng: bidLng }, pickup)
          : null;

    const rawEta = Number(bid.pickupEtaMinutes ?? bid.pickup_eta_minutes);
    const etaMinutes =
      Number.isFinite(rawEta) && rawEta > 0
        ? rawEta
        : Number.isFinite(distanceKm)
          ? Math.max(1, Math.ceil((distanceKm / 30) * 60))
          : null;

    return { distanceKm, etaMinutes };
  };

  const centerLat = hasCoordinates ? (pickup.lat + dropoff.lat) / 2 : 30.0444;
  const centerLng = hasCoordinates ? (pickup.lng + dropoff.lng) / 2 : 31.2357;

  // If driver location is provided, adjust center to include driver
  const effectiveCenterLat = hasDriverCoords
    ? (centerLat + driverLat) / 2
    : centerLat;
  const effectiveCenterLng = hasDriverCoords
    ? (centerLng + driverLng) / 2
    : centerLng;

  // Get API base URL from environment, strip /api suffix for tile endpoint
  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const tileUrl = `${API_BASE}/maps/tiles/{z}/{x}/{y}.png?v=3`;

  // Decode polyline if available from OSRM, otherwise use straight line
  let routePath = [];
  let isActualRoute = false;
  let actualDriverPath = [];

  const debugInfo = {
    mapTitle,
    hasRouteInfo: !!routeInfo,
    hasPolyline: !!routeInfo?.polyline,
    polylineLength: routeInfo?.polyline?.length || 0,
    polylinePreview: routeInfo?.polyline?.substring(0, 50),
    routeFound: routeInfo?.route_found,
    osrmUsed: routeInfo?.osrm_used,
    distance: routeInfo?.distance_km,
    hasPickup: !!pickup,
    hasDropoff: !!dropoff,
    hasDriverLocation: !!driverLocation,
    hasBiddingRoute: !!routeInfo?.biddingRoute,
    hasActualRoute: !!routeInfo?.actualRoutePolyline,
    theme,
  };

  // Debug logging (can be removed in production)
  // window.console.log(`\ud83d\uddfa\ufe0f [${mapTitle}] RoutePreviewMap Debug:`, debugInfo);

  if (routeInfo?.biddingRoute) {
    routePath = routeInfo.biddingRoute;
    isActualRoute = true;
  } else if (routeInfo?.polyline) {
    try {
      // Decode OSRM polyline to array of [lat, lng] coordinates
      routePath = polyline.decode(routeInfo.polyline);
      isActualRoute = true;
    } catch (error) {
      routePath = hasCoordinates
        ? [
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng],
          ]
        : [];
    }
  } else {
    // Fallback to straight line if no polyline available (this is normal for orders without route calculation)
    routePath = hasCoordinates
      ? [
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ]
      : [];
  }

  // Decode actual driver route if available
  if (routeInfo?.actualRoutePolyline) {
    try {
      if (typeof routeInfo.actualRoutePolyline === "string") {
        actualDriverPath = polyline.decode(routeInfo.actualRoutePolyline);
      } else if (Array.isArray(routeInfo.actualRoutePolyline)) {
        actualDriverPath = routeInfo.actualRoutePolyline;
      }
    } catch (error) {
      // Silent fail for route decoding
    }
  }

  // Calculate bounds to include all points
  const bounds = React.useMemo(() => {
    const points = [];
    if (pickup) points.push([pickup.lat, pickup.lng]);
    if (dropoff) points.push([dropoff.lat, dropoff.lng]);

    // Normalize driverLocation
    const dLat = driverLocation?.lat || driverLocation?.latitude;
    const dLng = driverLocation?.lng || driverLocation?.longitude;
    if (Number.isFinite(Number(dLat)) && Number.isFinite(Number(dLng))) {
      points.push([Number(dLat), Number(dLng)]);
    }

    // Add bid locations to bounds
    if (Array.isArray(bids)) {
      bids.forEach((bid) => {
        const lat = bid.driverLocation?.lat || bid.latitude || bid.lat;
        const lng = bid.driverLocation?.lng || bid.longitude || bid.lng;
        if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
          points.push([Number(lat), Number(lng)]);
        }
      });
    }

    // Include driver to pickup route path points
    if (driverToPickupPath && driverToPickupPath.length > 0) {
      const sampleRate = Math.ceil(driverToPickupPath.length / 20);
      for (let i = 0; i < driverToPickupPath.length; i += sampleRate) {
        points.push(driverToPickupPath[i]);
      }
    }

    // Include pickup to dropoff route path points
    if (pickupToDropoffPath && pickupToDropoffPath.length > 0) {
      const sampleRate = Math.ceil(pickupToDropoffPath.length / 20);
      for (let i = 0; i < pickupToDropoffPath.length; i += sampleRate) {
        points.push(pickupToDropoffPath[i]);
      }
    }

    // Also include route path points if available to ensure full route is visible
    if (routePath && routePath.length > 0) {
      // Sample points to avoid performance issues with large polylines
      const sampleRate = Math.ceil(routePath.length / 20);
      for (let i = 0; i < routePath.length; i += sampleRate) {
        points.push(routePath[i]);
      }
    }

    if (points.length === 0) return null;
    return L.latLngBounds(points);
  }, [
    pickup,
    dropoff,
    driverLocation,
    routePath,
    bids,
    driverToPickupPath,
    pickupToDropoffPath,
  ]);

  const MapEffect = () => {
    const map = useMap();
    const hasFittedRef = React.useRef(false);
    const lastOrderRef = React.useRef(null);

    React.useEffect(() => {
      // Only fit bounds on initial render or when order changes, not on every driver location update
      const orderKey = pickup
        ? `${pickup[0]},${pickup[1]}-${dropoff?.[0]},${dropoff?.[1]}`
        : null;
      if (
        bounds &&
        bounds.isValid() &&
        (!hasFittedRef.current || lastOrderRef.current !== orderKey)
      ) {
        map.fitBounds(bounds, { padding: [50, 50] });
        hasFittedRef.current = true;
        lastOrderRef.current = orderKey;
      }
    }, [map, bounds]);

    return null;
  };

  const renderMapContent = (isCompact) => {
    const isLightMode = theme === "light";
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        {loading ? (
          <div
            style={{
              color: isLightMode ? "#059669" : "#00FF00",
              fontFamily: "monospace",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            Loading Map...
          </div>
        ) : (
          <MapContainer
            center={[effectiveCenterLat, effectiveCenterLng]}
            zoom={13}
            style={{
              height: "100%",
              width: "100%",
              background: isLightMode ? "#e5e7eb" : "#000000",
              zIndex: 1,
            }}
            zoomControl={!isCompact}
            scrollWheelZoom={!isCompact}
            dragging={!isCompact}
            doubleClickZoom={!isCompact}
            attributionControl={false}
          >
            <TileLayer
              url={tileUrl}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <MapEffect />
            {/* Show markers only if coordinates exist */}
            {hasCoords && (
              <>
                {/* Debug: Show all props */}
                <div
                  style={{
                    position: "absolute",
                    top: 5,
                    right: 5,
                    zIndex: 1000,
                    background: "rgba(0,0,0,0.7)",
                    color: "#00FF00",
                    padding: "4px",
                    fontSize: "10px",
                    fontFamily: "monospace",
                  }}
                >
                  dl: {driverLat?.toFixed(4)},{driverLng?.toFinite?.()}
                  <br />
                  hDC: {hasDriverCoords ? "YES" : "NO"}
                  <br />
                  bids: {bids?.length || 0}
                </div>
                {/* Driver Location Marker - only show if driverLocation is provided */}

                <Marker
                  position={[pickup.lat, pickup.lng]}
                  icon={L.icon({
                    iconUrl: "/markers/marker-icon-2x-green.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                >
                  <Popup>
                    <strong>Pickup Location</strong>
                  </Popup>
                </Marker>
                <Marker
                  position={[dropoff.lat, dropoff.lng]}
                  icon={L.icon({
                    iconUrl: "/markers/marker-icon-2x-red.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                >
                  <Popup>
                    <strong>Dropoff Location</strong>
                  </Popup>
                </Marker>

                {/* Route Polyline - Solid for OSRM routes, dashed for estimated */}
                <Polyline
                  positions={routePath}
                  color={isActualRoute ? "#00FF00" : "#FF6B00"}
                  weight={isActualRoute ? 8 : 6}
                  opacity={1.0}
                  dashArray={isActualRoute ? undefined : "12, 8"}
                />

                {/* Actual Driver Route - Solid Green/Blue */}
                {actualDriverPath && actualDriverPath.length > 0 && (
                  <Polyline
                    positions={actualDriverPath}
                    color="#00FF00"
                    weight={8}
                    opacity={1.0}
                  />
                )}

                {/* Two-leg route: Driver → Pickup (Blue Dashed) - from AsyncOrderMap */}
                {driverToPickupPath && driverToPickupPath.length > 1 && (
                  <Polyline
                    positions={driverToPickupPath}
                    color="#3B82F6"
                    weight={5}
                    opacity={0.8}
                    dashArray="10, 10"
                  />
                )}

                {/* Two-leg route: Pickup → Dropoff (Orange Solid) - from AsyncOrderMap */}
                {pickupToDropoffPath && pickupToDropoffPath.length > 1 && (
                  <Polyline
                    positions={pickupToDropoffPath}
                    color="#FF6B00"
                    weight={6}
                    opacity={1.0}
                  />
                )}

                {/* Driver to Pickup Line (Dashed) - Fallback when no route path available */}
                {hasDriverCoords &&
                  pickup &&
                  !actualDriverPath.length &&
                  driverToPickupPath.length === 0 && (
                    <Polyline
                      positions={[
                        [driverLat, driverLng],
                        [pickup.lat, pickup.lng],
                      ]}
                      color="#3B82F6"
                      weight={4}
                      opacity={0.8}
                      dashArray="10, 10"
                    />
                  )}

                {/* All Bids Markers */}
                {(() => {
                  const normalizedBids = Array.isArray(bids) ? bids : [];

                  if (normalizedBids.length === 0) {
                    return null;
                  }

                  return normalizedBids.map((bid, index) => {
                    const rawLat =
                      bid.driverLocation?.lat ?? bid.latitude ?? bid.lat;
                    const rawLng =
                      bid.driverLocation?.lng ?? bid.longitude ?? bid.lng;

                    if (
                      rawLat === null ||
                      rawLat === undefined ||
                      rawLng === null ||
                      rawLng === undefined
                    ) {
                      return null;
                    }

                    const bidLat = Number(rawLat);
                    const bidLng = Number(rawLng);

                    if (!Number.isFinite(bidLat) || !Number.isFinite(bidLng)) {
                      return null;
                    }
                    if (bidLat === 0 && bidLng === 0) return null;

                    const bidUserId =
                      bid.userId ||
                      bid.driver_id ||
                      bid.user_id ||
                      `bid-${index}`;
                    const isSelected =
                      (selectedBidId &&
                        String(selectedBidId) === String(bidUserId)) ||
                      (driverLocation &&
                        (driverLocation.userId || driverLocation.id) &&
                        String(driverLocation.userId || driverLocation.id) ===
                          String(bidUserId));
                    const { distanceKm, etaMinutes } = getBidPickupTelemetry(
                      bid,
                      bidLat,
                      bidLng,
                    );

                    return (
                      <React.Fragment key={bidUserId || index}>
                        {/* Route leg from each bidding driver to pickup */}
                        {pickup && (
                          <Polyline
                            positions={[
                              [bidLat, bidLng],
                              [pickup.lat, pickup.lng],
                            ]}
                            color={isSelected ? "#3B82F6" : "#6B7280"}
                            weight={isSelected ? 6 : 3}
                            opacity={isSelected ? 1.0 : 0.45}
                            dashArray="10, 10"
                          />
                        )}

                        <Marker
                          position={[bidLat, bidLng]}
                          icon={L.icon({
                            iconUrl: isSelected
                              ? "/markers/user-location.svg"
                              : "/markers/marker-icon.png",
                            iconSize: isSelected ? [60, 60] : [25, 41],
                            iconAnchor: isSelected ? [30, 30] : [12, 41],
                            popupAnchor: [0, -30],
                          })}
                          eventHandlers={{
                            click: () => {
                              if (externalSelectedBidId !== undefined) {
                                if (onBidSelect) onBidSelect(bidUserId);
                              } else {
                                setInternalSelectedBidId(bidUserId);
                                if (onBidSelect) onBidSelect(bidUserId);
                              }
                            },
                          }}
                        >
                          <Popup>
                            <div
                              style={{
                                fontSize: "0.875rem",
                                minWidth: "200px",
                                color: isLightMode ? "#000" : "#fff",
                                background: isLightMode ? "#fff" : "#000",
                                padding: "0.5rem",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: "600",
                                  color: "#3B82F6",
                                  marginBottom: "0.25rem",
                                  fontSize: "1rem",
                                }}
                              >
                                🚗{" "}
                                {bid.driverName || bid.driver_name || "Driver"}
                              </div>
                              <div
                                style={{
                                  color: "#059669",
                                  fontWeight: "bold",
                                  marginBottom: "0.5rem",
                                }}
                              >
                                Bid:{" "}
                                {bid.bidPrice || bid.bid_price
                                  ? `${bid.bidPrice || bid.bid_price} EGP`
                                  : "Price not set"}
                              </div>

                              {(distanceKm || etaMinutes) && (
                                <div
                                  style={{
                                    marginBottom: "0.5rem",
                                    padding: "0.375rem 0.5rem",
                                    borderRadius: "0.375rem",
                                    border: "1px solid rgba(147, 197, 253, 0.5)",
                                    background: "rgba(59, 130, 246, 0.12)",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  <div style={{ color: "#93C5FD", marginBottom: "0.125rem" }}>
                                    Route to pickup
                                  </div>
                                  {Number.isFinite(distanceKm) && (
                                    <div>{distanceKm.toFixed(1)} km away</div>
                                  )}
                                  {Number.isFinite(etaMinutes) && (
                                    <div>ETA {etaMinutes} min</div>
                                  )}
                                </div>
                              )}

                              <div
                                style={{
                                  display: "flex",
                                  gap: "1rem",
                                  marginBottom: "0.5rem",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <div>
                                  ⭐{" "}
                                  {bid.driverRating ||
                                    bid.rating ||
                                    bid.driver_rating ||
                                    "No rating"}
                                </div>
                                <div>
                                  📦{" "}
                                  {bid.driverCompletedDeliveries ||
                                    bid.completed_deliveries ||
                                    0}{" "}
                                  orders
                                </div>
                              </div>

                              {bid.message && (
                                <div
                                  style={{
                                    fontStyle: "italic",
                                    borderLeft: "3px solid #3B82F6",
                                    paddingLeft: "0.5rem",
                                    marginBottom: "0.75rem",
                                    fontSize: "0.8125rem",
                                  }}
                                >
                                  "{bid.message}"
                                </div>
                              )}

                              <button
                                onClick={() => {
                                  if (onBidAccept) onBidAccept(bidUserId);
                                }}
                                style={{
                                  width: "100%",
                                  padding: "0.5rem",
                                  background: "#059669",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                }}
                              >
                                Accept Bid
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      </React.Fragment>
                    );
                  });
                })()}

                {/* Driver Location Marker */}
                {(() => {
                  // Use the pre-normalized values from earlier
                  console.log(
                    `🚗 [DriverMarker] Using pre-normalized: driverLat=${driverLat}, driverLng=${driverLng}, hasDriverCoords=${hasDriverCoords}`,
                  );
                  console.log(
                    `🚗 [DriverMarker] driverLocation raw:`,
                    driverLocation,
                  );

                  const dLat = driverLat;
                  const dLng = driverLng;
                  const dUserId = driverLocation?.userId || driverLocation?.id;

                  console.log(
                    `🚗 [DriverMarker] Final coords: dLat=${dLat}, dLng=${dLng}, dUserId=${dUserId}`,
                  );

                  console.log(
                    `🚗 [RoutePreviewMap] Driver marker check: lat=${dLat}, lng=${dLng}, userId=${dUserId}, bids count=${bids?.length}`,
                  );

                  if (!Number.isFinite(dLat) || !Number.isFinite(dLng)) {
                    console.log(
                      `🚗 [RoutePreviewMap] Driver marker NOT rendered: invalid coordinates`,
                    );
                    return null;
                  }

                  // Skip if this driver is already shown in the bids list (but allow for own location)
                  const normalizedBids = Array.isArray(bids) ? bids : [];
                  const inBids = normalizedBids.some(
                    (b) =>
                      String(b.userId || b.driver_id || b.user_id) ===
                      String(dUserId),
                  );

                  // DEBUG: Always show the marker regardless of bids to test
                  if (false && inBids) {
                    console.log(
                      `🚗 [RoutePreviewMap] Driver marker skipped: driver already in bids list`,
                    );
                    return null;
                  }

                  console.log(
                    `🚗 [RoutePreviewMap] Rendering driver marker at:`,
                    dLat,
                    dLng,
                    "(inBids:",
                    inBids,
                    ")",
                  );
                  // Always render marker for real-time driver location (not bid locations)
                  // The bids locations are stale, driverLocation prop has live location
                  return (
                    <Marker
                      position={[dLat, dLng]}
                      icon={L.icon({
                        iconUrl: "/markers/user-location.svg",
                        iconSize: [60, 60],
                        iconAnchor: [30, 30],
                        popupAnchor: [0, -30],
                        className: "",
                      })}
                      zIndexOffset={1000}
                    >
                      <Popup>
                        <div style={{ fontSize: "0.875rem" }}>
                          <strong>🚗 Driver Location</strong>
                          <div>Lat: {dLat.toFixed(6)}</div>
                          <div>Lng: {dLng.toFixed(6)}</div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })()}
              </>
            )}
          </MapContainer>
        )}

        {/* Notice if no coordinates */}
        {!hasCoordinates && (
          <div
            style={{
              textAlign: "center",
              padding: "0.5rem",
              background: isLightMode
                ? "rgba(245, 158, 11, 0.1)"
                : "rgba(245, 166, 11, 0.1)",
              borderTop: `2px solid ${isLightMode ? "#D97706" : "#F59E0B"}`,
              fontFamily: "Consolas, Monaco, Courier New, monospace",
            }}
          >
            <p
              style={{
                color: isLightMode ? "#B45309" : "#FBBF24",
                margin: 0,
                fontSize: "0.75rem",
                textShadow: isLightMode
                  ? "none"
                  : "0 0 10px rgba(251, 191, 36, 0.8)",
              }}
            >
              ⚠️ Default city view (no coordinates)
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <ClickableMap
      title={mapTitle}
      osrmSuccess={isActualRoute}
      routeDistance={routeInfo?.distance_km}
      routeFound={routeInfo?.route_found || isActualRoute}
      compact={compact}
      fullscreenChildren={renderMapContent(false)} // Always interactive in fullscreen
      theme={theme}
    >
      {renderMapContent(compact)}
    </ClickableMap>
  );
}

export default RoutePreviewMap;
