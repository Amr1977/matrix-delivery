import React, { useState, useEffect } from "react";
import { useI18n } from "../../i18n/i18nContext";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import DriverBiddingMap from "../maps/DriverBiddingMap";
import {
  MapPin,
  Clock,
  Wallet,
  User,
  Star,
  Hash,
  Navigation,
  AlertTriangle,
  CheckCircle,
  Send,
  ArrowRight,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { MapsApi } from "../../services/api";

/**
 * DriverBiddingCard - Ultra-Premium Matrix Design (Mobile First)
 *
 * Features:
 * - Fluid Responsive Layout (Flex/Grid with auto-fit)
 * - True Matrix Aesthetics (Neon Greens, Deep Blacks, Glassmorphism)
 * - Optimized Touch Targets for Mobile
 * - Visual Hierarchy: Price -> Map -> Status -> Action
 */
const DriverBiddingCard = ({
  order,
  currentUser,
  onBid,
  //TODO USE DRIVER ID TO GET LIVE LOCATION INSTEAD
  driverLocation,
  bidInput,
  setBidInput,
  bidDetails,
  setBidDetails,
  loadingStates,
  openReviewModal,
  onWithdrawBid,
}) => {
  const { t } = useI18n();
  const [showMapFullscreen, setShowMapFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Calculate upfront payment (default to 0 if undefined)
  const upfrontPayment = order.upfront_payment || order.upfrontPayment || 0;
  const hasUpfrontPayment = upfrontPayment > 0;

  // Payment method (COD or PREPAID)
  const paymentMethod = order.payment_method || "COD";
  const isPrepaid = paymentMethod === "PREPAID";
  const isCOD = paymentMethod === "COD";

  // Check if driver already bid
  const myBid = order.bids?.find((b) => b.driverId === currentUser?.id);

  // Estimates logic
  const [calculatedDistance, setCalculatedDistance] = useState(0);
  const [totalDistanceKm, setTotalDistanceKm] = useState(0);
  const [pickupDistanceKm, setPickupDistanceKm] = useState(0);
  const [dropoffDistanceKm, setDropoffDistanceKm] = useState(0);

  // Haversine Distance Calc
  const haversineKm = (a, b) => {
    if (
      !a ||
      !b ||
      a.lat == null ||
      a.lng == null ||
      b.lat == null ||
      b.lng == null
    )
      return 0;
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const aa =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    return R * c;
  };

  const distanceKm =
    order.estimatedDistanceKm || order.distance || calculatedDistance || 0;
  const estTimeMins = Math.ceil((distanceKm / 30) * 60) + 15;
  const totalEstTimeMins = Math.ceil((totalDistanceKm / 30) * 60) + 15;

  // Haversine Distance Calc
  useEffect(() => {
    // Robust coordinate extraction & Type Safety
    const fromLat = parseFloat(
      order.from_lat ||
        order.from?.lat ||
        order.pickupLocation?.coordinates?.lat,
    );
    const fromLng = parseFloat(
      order.from_lng ||
        order.from?.lng ||
        order.pickupLocation?.coordinates?.lng,
    );
    const toLat = parseFloat(
      order.to_lat || order.to?.lat || order.dropoffLocation?.coordinates?.lat,
    );
    const toLng = parseFloat(
      order.to_lng || order.to?.lng || order.dropoffLocation?.coordinates?.lng,
    );

    if (
      !order.estimatedDistanceKm &&
      !order.distance &&
      !isNaN(fromLat) &&
      !isNaN(fromLng) &&
      !isNaN(toLat) &&
      !isNaN(toLng)
    ) {
      const R = 6371; // Radius of earth in km
      const dLat = (toLat - fromLat) * (Math.PI / 180);
      const dLon = (toLng - fromLng) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(fromLat * (Math.PI / 180)) *
          Math.cos(toLat * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const d = R * c; // Distance in km
      setCalculatedDistance(d);
    }
  }, [order]);

  // Calculate total distance using routing API with Haversine fallback
  useEffect(() => {
    const calculateRouteDistance = async () => {
      // Comprehensive coordinate extraction - same logic as full map view but with all possible sources
      const pickupLat = parseFloat(
        order.from_lat ||
          order.from?.lat ||
          order.pickupLocation?.coordinates?.lat,
      );
      const pickupLng = parseFloat(
        order.from_lng ||
          order.from?.lng ||
          order.pickupLocation?.coordinates?.lng,
      );
      const dropoffLat = parseFloat(
        order.to_lat ||
          order.to?.lat ||
          order.dropoffLocation?.coordinates?.lat,
      );
      const dropoffLng = parseFloat(
        order.to_lng ||
          order.to?.lng ||
          order.dropoffLocation?.coordinates?.lng,
      );

      const pickup =
        !isNaN(pickupLat) && !isNaN(pickupLng)
          ? { lat: pickupLat, lng: pickupLng }
          : null;
      const dropoff =
        !isNaN(dropoffLat) && !isNaN(dropoffLng)
          ? { lat: dropoffLat, lng: dropoffLng }
          : null;

      // if (!pickup || !dropoff) {
      //     // Fallback to Haversine if coordinates are missing
      //     let pickupToDropoffKm = 0;
      //     if (pickup && dropoff) {
      //         pickupToDropoffKm = haversineKm(pickup, dropoff);
      //     }
      //     let driverToPickupKm = 0;
      //     if (driverLocation && Number.isFinite(driverLocation.lat || driverLocation.latitude) && Number.isFinite(driverLocation.lng || driverLocation.longitude) && pickup) {
      //         const driverLat = driverLocation.lat || driverLocation.latitude;
      //         const driverLng = driverLocation.lng || driverLocation.longitude;
      //         driverToPickupKm = haversineKm({ lat: driverLat, lng: driverLng }, pickup);
      //     }
      //     const totalKm = driverToPickupKm + pickupToDropoffKm;
      //     setTotalDistanceKm(totalKm);
      //     return;
      // }

      try {
        // Calculate driver to pickup distance using routing API
        let driverToPickupKm = 0;
        if (
          driverLocation &&
          Number.isFinite(driverLocation.lat || driverLocation.latitude) &&
          Number.isFinite(driverLocation.lng || driverLocation.longitude)
        ) {
          const driverLat = driverLocation.lat || driverLocation.latitude;
          const driverLng = driverLocation.lng || driverLocation.longitude;

          const driverToPickupResponse = await MapsApi.calculateRoute({
            pickup: { lat: driverLat, lng: driverLng },
            delivery: { lat: pickupLat, lng: pickupLng },
          });

          driverToPickupKm = driverToPickupResponse.distance_km || 0;
          setPickupDistanceKm(driverToPickupKm);
        }

        // Calculate pickup to dropoff distance using routing API
        const pickupToDropoffResponse = await MapsApi.calculateRoute({
          pickup: { lat: pickupLat, lng: pickupLng },
          delivery: { lat: dropoffLat, lng: dropoffLng },
        });

        const pickupToDropoffKm = pickupToDropoffResponse.distance_km || 0;
        setDropoffDistanceKm(pickupToDropoffKm);
        const totalKm = driverToPickupKm + pickupToDropoffKm;

        setTotalDistanceKm(totalKm);
      } catch (error) {
        console.warn(
          "Route calculation failed, using Haversine fallback:",
          error.message,
        );

        // Fallback to Haversine calculation
        let pickupToDropoffKm = haversineKm(pickup, dropoff);
        let driverToPickupKm = 0;

        if (
          driverLocation &&
          Number.isFinite(driverLocation.lat || driverLocation.latitude) &&
          Number.isFinite(driverLocation.lng || driverLocation.longitude)
        ) {
          const driverLat = driverLocation.lat || driverLocation.latitude;
          const driverLng = driverLocation.lng || driverLocation.longitude;
          driverToPickupKm = haversineKm(
            { lat: driverLat, lng: driverLng },
            pickup,
          );
        }
        setPickupDistanceKm(driverToPickupKm);
        setDropoffDistanceKm(pickupToDropoffKm);
        const totalKm = driverToPickupKm + pickupToDropoffKm;
        setTotalDistanceKm(totalKm);
      }
    };

    calculateRouteDistance();
  }, [order, driverLocation, haversineKm]);

  useEffect(() => {
    if (myBid && !bidInput[order.id] && !isEditing) {
      setBidInput((prev) => ({
        ...prev,
        [order.id]: myBid.bidPrice.toString(),
      }));
      setBidDetails((prev) => ({
        ...prev,
        [order.id]: { ...bidDetails[order.id], message: myBid.message || "" },
      }));
    }
  }, [
    myBid,
    order.id,
    bidInput,
    setBidInput,
    bidDetails,
    setBidDetails,
    isEditing,
  ]);

  // Responsive layout state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const renderStars = (rating) => {
    return [...Array(5)].map((_, i) => (
      <Star
        key={i}
        size={14}
        fill={i < Math.round(rating) ? "#FBBF24" : "none"}
        color={i < Math.round(rating) ? "#FBBF24" : "#4B5563"}
      />
    ));
  };

  const handleBidSubmit = (e) => {
    e.preventDefault();

    // Prepare bid payload
    const bidPayload = {
      bidPrice: bidInput[order.id],
      estimatedPickupTime: bidDetails[order.id]?.pickupTime,
      estimatedDeliveryTime: bidDetails[order.id]?.deliveryTime,
      message: bidDetails[order.id]?.message,
    };

    // Prioritize prop location (from useDriver hook, which handles fake locations)
    if (
      driverLocation &&
      (driverLocation.lat || driverLocation.latitude) &&
      (driverLocation.lng || driverLocation.longitude)
    ) {
      bidPayload.location = {
        lat: driverLocation.lat || driverLocation.latitude,
        lng: driverLocation.lng || driverLocation.longitude,
      };
      console.log(
        "[DEBUG] Submitting bid with prop location:",
        bidPayload.location,
      );
      onBid(order.id, bidPayload);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          bidPayload.location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log(
            "[DEBUG] Submitting bid with legacy geolocation:",
            bidPayload.location,
          );
          onBid(order.id, bidPayload);
        },
        () => {
          console.log(
            "[DEBUG] Submitting bid without location (geolocation failed)",
          );
          onBid(order.id, bidPayload);
        },
      );
    } else {
      console.log(
        "[DEBUG] Submitting bid without location (no geolocation API)",
      );
      onBid(order.id, bidPayload);
    }
  };

  return (
    <div
      className="order-card"
      style={{
        background:
          "linear-gradient(145deg, rgba(0, 10, 0, 0.95) 0%, rgba(0, 20, 0, 0.98) 100%)",
        border: "1px solid var(--matrix-border, #00AA00)",
        borderRadius: "12px",
        marginBottom: "1.5rem",
        overflow: "hidden", // Keep for border-radius
        boxShadow: "0 0 20px rgba(0, 255, 0, 0.1)",
        color: "var(--matrix-bright-green, #30FF30)",
        fontFamily: "'Consolas', 'Monaco', monospace",
        transition: "all 0.3s ease",
        position: "relative",
      }}
    >
      {/* Glowing Border Animation Element */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "1px",
          background:
            "linear-gradient(90deg, transparent, var(--matrix-bright-green), transparent)",
          opacity: 0.5,
        }}
      />

      {/* 1. Header: Compact & High Contrast - Unified Metrics */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid rgba(0, 255, 0, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          background: "rgba(0, 255, 0, 0.05)",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <div
            style={{
              fontSize: "1.25rem",
              fontWeight: "bold",
              color: "white",
              textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
            }}
          >
            {order.title}
          </div>
          {order.orderNumber && (
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--matrix-border)",
                marginTop: "0.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>#{order.orderNumber}</span>
              <span
                style={{
                  fontSize: "0.6rem",
                  padding: "1px 4px",
                  border: "1px solid var(--matrix-border)",
                  borderRadius: "4px",
                }}
              >
                WAITING FOR BIDS
              </span>
            </div>
          )}
        </div>

        {/* Unified Metrics Row */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          {/* Upfront - Always Shown */}
          <div
            style={{
              textAlign: "center",
              background: hasUpfrontPayment
                ? "rgba(220, 38, 38, 0.1)"
                : "rgba(16, 185, 129, 0.1)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: `1px solid ${hasUpfrontPayment ? "#DC2626" : "#10B981"}`,
              minWidth: "90px",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: hasUpfrontPayment ? "#ff6666" : "#6ee7b7",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Upfront
            </div>
            <div
              style={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                color: hasUpfrontPayment ? "#fca5a5" : "#a7f3d0",
              }}
            >
              {hasUpfrontPayment ? formatCurrency(upfrontPayment) : "None"}
            </div>
          </div>

          {/* Payment Method Badge */}
          <div
            style={{
              textAlign: "center",
              background: isPrepaid ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: `1px solid ${isPrepaid ? "#3B82F6" : "#10B981"}`,
              minWidth: "90px",
            }}
          >
            <div style={{ fontSize: "0.6rem", color: isPrepaid ? "#93C5FD" : "#6ee7b7", textTransform: "uppercase", marginBottom: "2px" }}>
              Pay
            </div>
            <div style={{ fontSize: "1rem", fontWeight: "bold", color: isPrepaid ? "#BFDBFE" : "#a7f3d0" }}>
              {isPrepaid ? "Prepaid" : "COD"}
            </div>
          </div>

          {/* Pickup Distance */}
          <div
            style={{
              textAlign: "center",
              background: "rgba(0,0,0,0.6)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--matrix-border)",
              minWidth: "80px",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "#aaa",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Pickup
            </div>
            <div
              style={{ fontSize: "1.1rem", fontWeight: "bold", color: "white" }}
            >
              {pickupDistanceKm.toFixed(1)} km
            </div>
          </div>
          {/* DropOff Distance */}
          <div
            style={{
              textAlign: "center",
              background: "rgba(0,0,0,0.6)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--matrix-border)",
              minWidth: "80px",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "#aaa",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Dropoff
            </div>
            <div
              style={{ fontSize: "1.1rem", fontWeight: "bold", color: "white" }}
            >
              {dropoffDistanceKm.toFixed(1)} km
            </div>
          </div>
          {/* Total Distance */}
          <div
            style={{
              textAlign: "center",
              background: "rgba(0,0,0,0.6)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--matrix-border)",
              minWidth: "80px",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "#aaa",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Distance
            </div>
            <div
              style={{ fontSize: "1.1rem", fontWeight: "bold", color: "white" }}
            >
              {(totalDistanceKm > 0 ? totalDistanceKm : distanceKm).toFixed(1)}{" "}
              km
            </div>
          </div>

          {/* Time */}
          <div
            style={{
              textAlign: "center",
              background: "rgba(0,0,0,0.6)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--matrix-border)",
              minWidth: "80px",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "#aaa",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Time
            </div>
            <div
              style={{ fontSize: "1.1rem", fontWeight: "bold", color: "white" }}
            >
              ~{totalDistanceKm > 0 ? totalEstTimeMins : estTimeMins} min
            </div>
          </div>

          {/* Offer */}
          <div
            style={{
              textAlign: "center",
              background: "rgba(0,0,0,0.6)",
              padding: "0.4rem 0.8rem",
              borderRadius: "8px",
              border: "1px solid var(--matrix-border)",
              minWidth: "100px",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "#aaa",
                textTransform: "uppercase",
                marginBottom: "2px",
              }}
            >
              Offer
            </div>
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "var(--matrix-bright-green)",
              }}
            >
              {formatCurrency(order.price)}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Map Visualization */}
      <div
        style={{
          position: "relative",
          height: "220px",
          width: "100%",
          borderBottom: "1px solid rgba(0, 255, 0, 0.1)",
        }}
      >
        <DriverBiddingMap
          order={order}
          driverLocation={driverLocation}
          driverVehicleType={currentUser?.vehicle_type || "car"}
          onToggleFullscreen={() => setShowMapFullscreen(!showMapFullscreen)}
          isFullscreen={showMapFullscreen}
          compact={true}
        />

        {/* Floating Stats Overlay REMOVED - Moved to Header */}
      </div>

      {/* 3. Key Details Section - Flex Wrap for Robustness */}
      <div
        style={{
          position: "relative",
          zIndex: 5,
          padding: "1.5rem",
          marginTop: "1rem", // Spacer
          background: "#0a0a0a", // Solid BG to block Map overlap
          borderTop: "1px solid var(--matrix-border)",
          display: "flex",
          flexWrap: "wrap",
          gap: "2rem",
          alignItems: "flex-start",
        }}
      >
        {/* Route Column */}
        <div
          style={{
            flex: "1 1 300px",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            paddingTop: "0.5rem",
          }}
        >
          <div
            style={{
              position: "relative",
              paddingLeft: "2.5rem",
              borderLeft: "2px dashed rgba(0,255,0,0.3)",
            }}
          >
            {/* Pickup */}
            <div style={{ position: "relative", marginBottom: "2rem" }}>
              <div
                style={{
                  position: "absolute",
                  left: "-2.55rem",
                  top: "-4px",
                  background: "black",
                  border: "2px solid var(--matrix-bright-green)",
                  borderRadius: "50%",
                  padding: "4px",
                  zIndex: 10,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    background: "var(--matrix-bright-green)",
                    borderRadius: "50%",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--matrix-bright-green)",
                  fontWeight: "bold",
                  marginBottom: "0.25rem",
                  paddingLeft: "0.5rem",
                }}
              >
                PICKUP
              </div>
              <div
                style={{
                  color: "white",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                  paddingLeft: "0.5rem",
                }}
              >
                {order.pickupAddress ||
                  order.from?.name ||
                  "Unknown Pickup Location"}
              </div>
            </div>

            {/* Delivery */}
            <div style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: "-2.55rem",
                  top: "-4px",
                  background: "black",
                  border: "2px solid white",
                  borderRadius: "50%",
                  padding: "4px",
                  zIndex: 10,
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    background: "white",
                    borderRadius: "50%",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#ccc",
                  fontWeight: "bold",
                  marginBottom: "0.25rem",
                  paddingLeft: "0.5rem",
                }}
              >
                DELIVERY
              </div>
              <div
                style={{
                  color: "white",
                  fontSize: "1rem",
                  lineHeight: "1.5",
                  paddingLeft: "0.5rem",
                }}
              >
                {order.deliveryAddress ||
                  order.to?.name ||
                  "Unknown Delivery Location"}
              </div>
            </div>
          </div>
        </div>

        {/* Financials & Reputation Column */}
        <div
          style={{
            flex: "1 1 300px",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
          }}
        >
          {/* Upfront Payment Warning - Moved to Header */}

          {/* COMPREHENSIVE CLIENT REPUTATION */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "12px",
              padding: "1.25rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <User size={16} color="var(--matrix-bright-green)" />
              <h4
                style={{
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  color: "white",
                  margin: 0,
                }}
              >
                CLIENT REPUTATION
              </h4>
              {order.customerIsVerified && (
                <span
                  style={{
                    background: "#10B981",
                    color: "black",
                    padding: "1px 6px",
                    borderRadius: "99px",
                    fontSize: "0.6rem",
                    fontWeight: "bold",
                  }}
                >
                  ✓ VERIFIED
                </span>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem 1rem",
                marginBottom: "1rem",
              }}
            >
              {(() => {
                // Robust extraction
                const ratingRaw = order.customerRating || order.customerrating;
                const ratingVal = ratingRaw ? parseFloat(ratingRaw) : 0;
                const joinedRaw =
                  order.customerJoinedAt || order.customerjoinedat;
                const joinedDate = joinedRaw
                  ? new Date(joinedRaw).toLocaleDateString()
                  : "Unknown";

                return (
                  <>
                    <div>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "#888",
                          marginBottom: "2px",
                        }}
                      >
                        RATING
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "2px",
                        }}
                      >
                        {renderStars(ratingVal)}
                        <span
                          style={{
                            fontSize: "0.9rem",
                            fontWeight: "bold",
                            color: "white",
                            marginLeft: "4px",
                          }}
                        >
                          {ratingVal > 0 ? ratingVal.toFixed(1) : "New"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "#888",
                          marginBottom: "2px",
                        }}
                      >
                        ORDERS
                      </p>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        {order.customerCompletedOrders !== undefined
                          ? order.customerCompletedOrders
                          : order.customercompletedorders !== undefined
                            ? order.customercompletedorders
                            : 0}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "#888",
                          marginBottom: "2px",
                        }}
                      >
                        REVIEWS
                      </p>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          color: "white",
                        }}
                      >
                        {order.customerReviewCount !== undefined
                          ? order.customerReviewCount
                          : order.customerreviewcount !== undefined
                            ? order.customerreviewcount
                            : 0}
                      </p>
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: "0.7rem",
                          color: "#888",
                          marginBottom: "2px",
                        }}
                      >
                        SINCE
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "white" }}>
                        {joinedDate}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() =>
                  openReviewModal &&
                  openReviewModal(order.id, "view_customer_reviews")
                }
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60A5FA",
                  border: "1px solid #3B82F6",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                View Reviews
              </button>
              <button
                onClick={() =>
                  openReviewModal &&
                  openReviewModal(order.id, "view_customer_given_reviews")
                }
                style={{
                  flex: 1,
                  padding: "0.4rem",
                  background: "rgba(99, 102, 241, 0.2)",
                  color: "#818CF8",
                  border: "1px solid #6366F1",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                }}
              >
                Reviews Given
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action / Bidding Area */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          padding: "1.25rem",
          borderTop: "1px solid rgba(0, 255, 0, 0.2)",
        }}
      >
        {myBid && !isEditing ? (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid #10B981",
              borderRadius: "8px",
              padding: "1.5rem",
              textAlign: "center",
              animation: "matrix-pulse 2s infinite",
            }}
          >
            <CheckCircle
              size={32}
              color="#10B981"
              style={{ margin: "0 auto 0.5rem auto" }}
            />
            <div
              style={{
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: "#10B981",
              }}
            >
              BID PLACED
            </div>
            <div style={{ color: "white", marginTop: "0.25rem" }}>
              You offered {formatCurrency(myBid.bidPrice)}
            </div>
            {myBid.message && (
              <div
                style={{
                  color: "#ccc",
                  marginTop: "0.5rem",
                  fontSize: "0.9rem",
                }}
              >
                Message: {myBid.message}
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                marginTop: "1.5rem",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => setIsEditing(true)}
                data-testid={`edit-bid-btn-${order.id}`}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60A5FA",
                  border: "1px solid #3B82F6",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                Edit Bid
              </button>
              <button
                onClick={() => onWithdrawBid && onWithdrawBid(order.id)}
                data-testid={`withdraw-bid-btn-${order.id}`}
                disabled={loadingStates?.withdrawBid}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  background: "rgba(239, 68, 68, 0.2)",
                  color: "#F87171",
                  border: "1px solid #EF4444",
                  borderRadius: "6px",
                  cursor: loadingStates?.withdrawBid
                    ? "not-allowed"
                    : "pointer",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  opacity: loadingStates?.withdrawBid ? 0.7 : 1,
                }}
              >
                <X size={16} />
                {loadingStates?.withdrawBid ? "Withdrawing..." : "Withdraw Bid"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleBidSubmit}>
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "var(--matrix-bright-green)",
              }}
            >
              <ArrowRight size={16} />
              <span style={{ fontWeight: "bold", letterSpacing: "1px" }}>
                {myBid ? "EDIT YOUR BID" : "PLACE YOUR BID"}
              </span>
            </div>

            {/* Inputs Grid - Stacked on Mobile */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {/* Bid Amount */}
              <div style={{ position: "relative" }}>
                <label
                  style={{
                    fontSize: "0.7rem",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  YOUR PRICE
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={bidInput[order.id] || ""}
                  onChange={(e) =>
                    setBidInput({ ...bidInput, [order.id]: e.target.value })
                  }
                  data-testid={`bid-amount-input-${order.id}`}
                  style={{
                    width: "100%",
                    background: "rgba(0, 20, 0, 0.8)",
                    border: "1px solid var(--matrix-border)",
                    color: "white",
                    padding: "0.75rem",
                    fontSize: "1.1rem",
                    fontWeight: "bold",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                  required
                />
              </div>

              {/* Message (Optional) */}
              <div>
                <label
                  style={{
                    fontSize: "0.7rem",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  MESSAGE (OPTIONAL)
                </label>
                <input
                  type="text"
                  placeholder="e.g. I have a thermal bag..."
                  value={bidDetails[order.id]?.message || ""}
                  onChange={(e) =>
                    setBidDetails({
                      ...bidDetails,
                      [order.id]: {
                        ...bidDetails[order.id],
                        message: e.target.value,
                      },
                    })
                  }
                  style={{
                    width: "100%",
                    background: "rgba(0, 20, 0, 0.8)",
                    border: "1px solid var(--matrix-border)",
                    color: "white",
                    padding: "0.75rem",
                    fontSize: "0.9rem",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Submit Button */}
            {myBid ? (
              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    background: "rgba(107, 114, 128, 0.2)",
                    color: "#9CA3AF",
                    border: "1px solid #6B7280",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid={`place-bid-btn-${order.id}`}
                  disabled={loadingStates?.placeBid}
                  style={{
                    flex: 1,
                    padding: "1rem",
                    background:
                      "linear-gradient(90deg, var(--matrix-dim-green), var(--matrix-border))",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "1rem",
                    fontWeight: "bold",
                    letterSpacing: "1px",
                    cursor: loadingStates?.placeBid ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.75rem",
                    boxShadow: "0 4px 15px rgba(0, 255, 0, 0.3)",
                    transition: "all 0.2s ease",
                    opacity: loadingStates?.placeBid ? 0.7 : 1,
                  }}
                  onMouseOver={(e) =>
                    !loadingStates?.placeBid &&
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseOut={(e) =>
                    !loadingStates?.placeBid &&
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  <Send size={20} />
                  {loadingStates?.placeBid
                    ? "UPDATING BID..."
                    : "UPDATE BID PROPOSAL"}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                data-testid={`place-bid-btn-${order.id}`}
                disabled={loadingStates?.placeBid}
                style={{
                  width: "100%",
                  padding: "1rem",
                  background:
                    "linear-gradient(90deg, var(--matrix-dim-green), var(--matrix-border))",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "bold",
                  letterSpacing: "1px",
                  cursor: loadingStates?.placeBid ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  boxShadow: "0 4px 15px rgba(0, 255, 0, 0.3)",
                  transition: "all 0.2s ease",
                  opacity: loadingStates?.placeBid ? 0.7 : 1,
                }}
                onMouseOver={(e) =>
                  !loadingStates?.placeBid &&
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseOut={(e) =>
                  !loadingStates?.placeBid &&
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <Send size={20} />
                {loadingStates?.placeBid
                  ? "SENDING BID..."
                  : "SUBMIT BID PROPOSAL"}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default DriverBiddingCard;
