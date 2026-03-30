import React, { useEffect, useState, useRef } from "react";
import { Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import polyline from "@mapbox/polyline";
import api from "../../api";

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
      "></div>`
    : "";

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size + 20}px;display:flex;align-items:center;justify-content:center;">
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
  isSelected,
  onSelect,
  pollInterval = 30000,
}) => {
  const [liveLoc, setLiveLoc] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [eta, setEta] = useState(null);
  const intervalRef = useRef(null);

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

  // Bid location fallback
  const bidLat = bid.driverLocation?.lat ?? bid.latitude ?? bid.lat;
  const bidLng = bid.driverLocation?.lng ?? bid.longitude ?? bid.lng;

  // Decode stored polyline from bid
  const storedRoute = decodePolyline(
    bid.driverToPickupPolyline || bid.driver_to_pickup_polyline,
  );

  // Poll live location
  useEffect(() => {
    if (!driverId) return;

    const fetchLocation = async () => {
      try {
        const res = await api.get(`/drivers/location/bidding/${driverId}`);
        if (res.location) {
          setLiveLoc(res.location);
        }
      } catch {
        // keep fallback
      }
    };

    fetchLocation();
    intervalRef.current = setInterval(fetchLocation, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [driverId, pollInterval]);

  // Resolve current position: live > bid fallback
  const currentLat = liveLoc?.latitude ?? bidLat;
  const currentLng = liveLoc?.longitude ?? bidLng;

  if (
    !Number.isFinite(Number(currentLat)) ||
    !Number.isFinite(Number(currentLng))
  )
    return null;
  if (Number(currentLat) === 0 && Number(currentLng) === 0) return null;

  const isLive = !!liveLoc;

  // Calculate straight-line distance and ETA
  useEffect(() => {
    if (!pickup?.lat || !pickup?.lng) return;
    const dist = haversineKm(
      Number(currentLat),
      Number(currentLng),
      pickup.lat,
      pickup.lng,
    );
    const avgSpeedKmh = 30;
    setEta(Math.round((dist / avgSpeedKmh) * 60));
  }, [currentLat, currentLng, pickup?.lat, pickup?.lng]);

  // Build route path: use stored polyline if driver hasn't moved, otherwise straight line
  const hasStoredRoute = storedRoute.length > 1;
  const polylinePositions =
    hasStoredRoute && !liveLoc
      ? storedRoute
      : [
          [Number(currentLat), Number(currentLng)],
          [pickup.lat, pickup.lng],
        ];

  return (
    <>
      {/* Route polyline to pickup */}
      {pickup?.lat && pickup?.lng && (
        <Polyline
          positions={polylinePositions}
          color={isSelected ? "#3B82F6" : isLive ? "#10B981" : "#6B7280"}
          weight={isSelected ? 5 : 3}
          opacity={isSelected ? 0.9 : 0.5}
          dashArray={hasStoredRoute && !liveLoc ? null : "8, 8"}
        />
      )}

      {/* Driver marker with profile image */}
      <Marker
        position={[Number(currentLat), Number(currentLng)]}
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
