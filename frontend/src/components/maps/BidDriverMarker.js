import React, { useEffect, useState } from "react";
import { Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const resolveProfileImage = (profilePicture, gender) => {
  if (profilePicture) {
    if (profilePicture.startsWith("/")) return `${API_URL}${profilePicture}`;
    return profilePicture;
  }
  return gender === "female"
    ? "/assets/avatars/female_avatar_matrix.png"
    : "/assets/avatars/male_avatar_matrix.png";
};

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const decodePolyline = (encoded) => {
  if (!encoded) return [];
  try {
    return polyline.decode(encoded).map(([lat, lng]) => [lat, lng]);
  } catch {
    return [];
  }
};

const profileImageIcon = (imageUrl, bidPrice, isLive) => {
  const size = 44;
  const priceTag =
    bidPrice != null
      ? `<div style="
        position:absolute; bottom:-8px; left:50%; transform:translateX(-50%);
        background:#111827; color:#fff; border:2px solid ${isLive ? "#10B981" : "#4F46E5"};
        border-radius:9999px; padding:1px 6px; font-size:10px; font-weight:700;
        white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.3);
      ">$${Number(bidPrice).toFixed(0)}</div>`
      : "";

  const liveDot = isLive
    ? `<div style="
        position:absolute; top:-2px; right:-2px;
        width:12px; height:12px; border-radius:50%;
        background:#10B981; border:2px solid #fff;
        box-shadow:0 0 6px rgba(16,185,129,0.6);
        animation:pulse-dot 2s ease-in-out infinite;
      "></div>`
    : "";

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size + 20}px;display:flex;align-items:center;justify-content:center;">
      <style>@keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}</style>
      <img src="${imageUrl}" style="
        width:${size}px; height:${size}px; border-radius:50%;
        border:3px solid ${isLive ? "#10B981" : "#4F46E5"};
        object-fit:cover; box-shadow:0 4px 10px rgba(0,0,0,0.3);
        background:#fff;
      " onerror="this.src='/assets/avatars/male_avatar_matrix.png'" />
      ${liveDot}
      ${priceTag}
    </div>`,
    className: "",
    iconSize: [size, size + 20],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 5)],
  });
};

const BidDriverMarker = ({
  bid,
  pickup,
  liveLocation,
  isSelected,
  onSelect,
}) => {
  const driverId = bid.driver_id || bid.userId || bid.user_id;
  const driverName = bid.driverName || bid.driver_name || "Driver";
  const bidPrice = bid.bid_price || bid.bidPrice || bid.price;
  const profilePic = resolveProfileImage(
    bid.driverProfilePicture,
    bid.driverGender,
  );
  const bidRating = bid.driverRating || bid.driver_rating || 0;
  const bidDeliveries =
    bid.driverCompletedDeliveries || bid.driver_completed_deliveries || 0;

  // Bid location fallback (from when bid was placed)
  const rawBidLat = bid.driverLocation?.lat ?? bid.latitude ?? bid.lat;
  const rawBidLng = bid.driverLocation?.lng ?? bid.longitude ?? bid.lng;
  const hasBidLoc =
    Number.isFinite(Number(rawBidLat)) &&
    Number.isFinite(Number(rawBidLng)) &&
    (rawBidLat !== 0 || rawBidLng !== 0);
  const bidLat = hasBidLoc ? Number(rawBidLat) : null;
  const bidLng = hasBidLoc ? Number(rawBidLng) : null;

  // Live location takes priority
  const currentLat = liveLocation?.latitude ?? bidLat;
  const currentLng = liveLocation?.longitude ?? bidLng;

  // If no location at all (no live, no bid-time), render at pickup as placeholder
  const hasValidLoc =
    Number.isFinite(Number(currentLat)) &&
    Number.isFinite(Number(currentLng)) &&
    (currentLat !== 0 || currentLng !== 0);
  const markerLat = hasValidLoc ? Number(currentLat) : (pickup?.lat ?? null);
  const markerLng = hasValidLoc ? Number(currentLng) : (pickup?.lng ?? null);

  if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) return null;

  const isLive = !!liveLocation;

  // Decode stored polyline
  const storedRoute = decodePolyline(
    bid.driverToPickupPolyline || bid.driver_to_pickup_polyline,
  );
  const hasStoredRoute = storedRoute.length > 1;

  // Calculate ETA
  const [eta, setEta] = useState(null);
  useEffect(() => {
    if (!pickup?.lat || !pickup?.lng || !hasValidLoc) return;
    const dist = haversineKm(markerLat, markerLng, pickup.lat, pickup.lng);
    const avgSpeedKmh = 30;
    setEta(Math.round((dist / avgSpeedKmh) * 60));
  }, [markerLat, markerLng, pickup?.lat, pickup?.lng, hasValidLoc]);

  const polylinePositions =
    hasStoredRoute && !liveLocation && hasBidLoc
      ? storedRoute
      : [
          [markerLat, markerLng],
          [pickup.lat, pickup.lng],
        ];

  return (
    <>
      {pickup?.lat && pickup?.lng && (
        <Polyline
          positions={polylinePositions}
          color={isSelected ? "#3B82F6" : isLive ? "#10B981" : "#6B7280"}
          weight={isSelected ? 5 : 3}
          opacity={isSelected ? 0.9 : 0.5}
          dashArray={
            hasStoredRoute && !liveLocation && hasBidLoc ? null : "8, 8"
          }
        />
      )}

      <Marker
        position={[markerLat, markerLng]}
        icon={profileImageIcon(profilePic, bidPrice, isLive)}
        zIndexOffset={isSelected ? 500 : 100}
        eventHandlers={{ click: () => onSelect?.(driverId) }}
      >
        <Popup>
          <div
            style={{
              fontSize: "0.875rem",
              minWidth: "160px",
              color: "#111827",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.5rem",
              }}
            >
              <img
                src={profilePic}
                alt={driverName}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
                onError={(e) => {
                  e.target.src = "/assets/avatars/male_avatar_matrix.png";
                }}
              />
              <div>
                <div style={{ fontWeight: 700 }}>{driverName}</div>
                <div style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  ⭐ {Number(bidRating).toFixed(1)} · {bidDeliveries} deliveries
                </div>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{ fontWeight: 700, color: "#4F46E5", fontSize: "1rem" }}
              >
                ${Number(bidPrice || 0).toFixed(2)}
              </span>
              {eta != null && (
                <span style={{ fontSize: "0.75rem", color: "#6B7280" }}>
                  ~{eta} min away
                </span>
              )}
            </div>
            {isLive && (
              <div
                style={{
                  marginTop: "0.25rem",
                  fontSize: "0.7rem",
                  color: "#10B981",
                  fontWeight: 600,
                }}
              >
                🟢 Live location
              </div>
            )}
          </div>
        </Popup>
        <Tooltip direction="top" offset={[0, -25]} permanent={!isSelected}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "#111827",
              background: "#fff",
              padding: "2px 6px",
              borderRadius: "4px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }}
          >
            {driverName.split(" ")[0]}
            {eta != null ? ` · ~${eta}min` : ""}
          </span>
        </Tooltip>
      </Marker>
    </>
  );
};

export default BidDriverMarker;
