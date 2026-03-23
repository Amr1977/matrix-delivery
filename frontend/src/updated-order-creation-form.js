// @ts-nocheck
// ============ UPDATED OrderCreationForm.jsx WITH MAP INTEGRATION ============
// Replace the existing OrderCreationForm component with this

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import SavedAddressSelector from "./components/SavedAddressSelector";
import api from "./api";
import { MapsApi } from "./services/api/maps";
import { MessageModal } from "./MessageModal";
import { DraggableMarker } from "./DraggableMarker";
// import { useLocationData } from './useLocationData';

// Fix Leaflet default icon issue
const GLOBAL_API_URL = process.env.REACT_APP_API_URL;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

//TODO SHOW IN SEPARATE PAGE!!!
const OrderCreationForm = ({
  onSubmit,
  countries,
  t,
  API_URL = GLOBAL_API_URL,
}) => {
  const navigate = useNavigate();

  // Form state
  const [orderData, setOrderData] = useState({
    title: "",
    description: "",
    price: "",
    package_description: "",
    package_weight: "",
    estimated_value: "",
    require_upfront_payment: false,
    //TODO ALSO ADD requiring insurance balance hold so that an amount is held from driver balance until order is completed.
    upfront_payment: "", // Amount driver needs to pay
    special_instructions: "",
    estimated_delivery_date: "",
    payment_method: "COD", // 'COD' or 'PREPAID'
  });

  // Balance for prepaid check
  const [customerBalance, setCustomerBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);

  // Location state
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Address fields state for manual entry
  const [pickupAddress, setPickupAddress] = useState({
    country: "",
    city: "",
    area: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    personName: "",
    personPhone: "",
  });
  const [dropoffAddress, setDropoffAddress] = useState({
    country: "",
    city: "",
    area: "",
    street: "",
    building: "",
    floor: "",
    apartment: "",
    personName: "",
    personPhone: "",
  });

  // UI state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: "", // 'success' or 'error'
    title: "",
    message: "",
  });
  const [pickupErrors, setPickupErrors] = useState({});
  const [dropoffErrors, setDropoffErrors] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // TEST MODE: Expose function for E2E tests to set coordinates
  // Always expose on localhost to support E2E testing
  useEffect(() => {
    const isTestMode =
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "testing" ||
      window.location.hostname === "localhost";

    if (isTestMode) {
      window.setOrderCoordinates = (pickup, delivery) => {
        console.log(
          "🧪 TEST MODE: Setting coordinates via window.setOrderCoordinates",
        );
        if (pickup) {
          setPickupLocation({
            coordinates: pickup.coordinates || pickup,
            displayName: pickup.displayName || `Test Pickup Location`,
            locationLink: pickup.locationLink || "",
          });
        }
        if (delivery) {
          setDropoffLocation({
            coordinates: delivery.coordinates || delivery,
            displayName: delivery.displayName || `Test Delivery Location`,
            locationLink: delivery.locationLink || "",
          });
        }
      };

      // Cleanup on unmount
      return () => {
        delete window.setOrderCoordinates;
      };
    }
  }, []);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setUserLocation({ lat: 31.2001012694892, lng: 29.91881847381592 }); // Default to Alexandria
        },
      );
    } else {
      setUserLocation({ lat: 31.2001012694892, lng: 29.91881847381592 }); // Default to Alexandria
    }
  }, []);

  // Fetch customer balance when switching to prepaid
  useEffect(() => {
    if (orderData.payment_method === "PREPAID") {
      const fetchBalance = async () => {
        try {
          const userId = JSON.parse(localStorage.getItem("user") || "{}").id;
          if (userId) {
            const response = await fetch(`${API_URL}/v1/balance/${userId}`, {
              credentials: "include",
            });
            const data = await response.json();
            if (data.data?.availableBalance !== undefined) {
              setCustomerBalance(data.data.availableBalance);
              const orderTotal = parseFloat(orderData.price) || 0;
              setShowInsufficientBalance(
                data.data.availableBalance < orderTotal,
              );
            }
          }
        } catch (err) {
          console.error("Failed to fetch balance:", err);
        }
      };
      fetchBalance();
    }
  }, [orderData.payment_method, orderData.price, API_URL]);

  // Update insufficient balance when price changes
  useEffect(() => {
    if (orderData.payment_method === "PREPAID") {
      const orderTotal = parseFloat(orderData.price) || 0;
      setShowInsufficientBalance(customerBalance < orderTotal);
    }
  }, [orderData.price, customerBalance, orderData.payment_method]);

  // Calculate route when both locations are set
  const calculateRoute = useCallback(async () => {
    setLoading(true);
    try {
      const data = await MapsApi.calculateRoute({
        pickup: pickupLocation.coordinates,
        delivery: dropoffLocation.coordinates,
      });

      console.log("🗺️ Route calculated:", {
        distance: data.distance_km + " km",
        hasPolyline: !!data.polyline,
        polylineLength: data.polyline?.length || 0,
        routeFound: data.route_found,
        osrmUsed: data.osrm_used,
      });

      setRouteInfo(data);
    } catch (err) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Route Error",
        message: err.message || "Failed to calculate route",
      });
    } finally {
      setLoading(false);
    }
  }, [API_URL, pickupLocation?.coordinates, dropoffLocation?.coordinates]);

  useEffect(() => {
    if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
      calculateRoute();
    }
  }, [
    pickupLocation?.coordinates,
    dropoffLocation?.coordinates,
    calculateRoute,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate address fields for pickup and dropoff
    const requiredFields = [
      "country",
      "city",
      "area",
      "street",
      "building",
      "personName",
      "personPhone",
    ];
    const computeErrors = (addr) => {
      const errs = {};
      requiredFields.forEach((f) => {
        if (!addr?.[f] || String(addr[f]).trim() === "") {
          errs[f] = true;
        }
      });
      return errs;
    };

    const pErrs = computeErrors(pickupAddress);
    const dErrs = computeErrors(dropoffAddress);
    setPickupErrors(pErrs);
    setDropoffErrors(dErrs);

    if (Object.keys(pErrs).length > 0 || Object.keys(dErrs).length > 0) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Missing Address Fields",
        message:
          "Please fill all required address fields (Country, City, Area, Street, Building, Contact Name, Phone).",
      });
      return;
    }

    // Validate that coordinates are set (either from map click OR address geocoding)
    // Validate VIP required fields first
    if (orderData.require_upfront_payment && !orderData.upfront_payment) {
      setModalState({
        isOpen: true,
        type: "error",
        title: "Missing VIP Amount",
        message: "Please enter the VIP amount the driver should pay at pickup.",
      });
      return;
    }

    // Check prepaid balance
    if (orderData.payment_method === "PREPAID") {
      const orderTotal = parseFloat(orderData.price) || 0;
      if (customerBalance < orderTotal) {
        setModalState({
          isOpen: true,
          type: "error",
          title: "Insufficient Balance",
          message: `You need at least ${orderTotal.toFixed(2)} EGP to use Pay Now. Please deposit funds first.`,
        });
        return;
      }
    }

    const pickupCoordinates = pickupLocation?.coordinates;
    const dropoffCoordinates = dropoffLocation?.coordinates;

    if (!pickupCoordinates || !dropoffCoordinates) {
      const errorParts = [];
      if (!pickupCoordinates) {
        errorParts.push(
          "Pickup location coordinates not set - click on map or fill address fields (country/city required)",
        );
      }
      if (!dropoffCoordinates) {
        errorParts.push(
          "Delivery location coordinates not set - click on map or fill address fields (country/city required)",
        );
      }

      setModalState({
        isOpen: true,
        type: "error",
        title: "Location Coordinates Required",
        message:
          errorParts.join(". ") +
          " Use the interactive map or fill address fields (at least country and city) to set coordinates.",
      });
      return;
    }

    // Prepare complete order data - always include coordinates
    const completeOrderData = {
      ...orderData,
      pickupLocation,
      dropoffLocation,
      pickupAddress,
      dropoffAddress,
      routeInfo, // Include route info with OSRM polyline
    };

    try {
      // Show loading state
      setLoading(true);

      // Attempt to submit the order
      await onSubmit(completeOrderData);

      // Show success modal on successful submission
      setModalState({
        isOpen: true,
        type: "success",
        title: "🚀 Order Published Successfully!",
        message: `Your order "${orderData.title}" has been published and is now available for heroes to accept. Track its progress from the Orders page.`,
      });

      // Clear loading state
      setLoading(false);
    } catch (error) {
      // Show error modal on failure
      setLoading(false);
      setModalState({
        isOpen: true,
        type: "error",
        title: "Failed to Publish Order",
        message: `❌ ${error.message || "An unexpected error occurred while publishing your order. Please try again."}`,
      });
    }
  };

  const closeModal = () => {
    if (modalState.type === "success") {
      navigate("/app");
    }
    setModalState({
      isOpen: false,
      type: "",
      title: "",
      message: "",
    });
  };

  return (
    <div
      className="card"
      style={{
        background: "linear-gradient(135deg, #000000 0%, #001100 100%)",
        border: "2px solid #00AA00",
        borderRadius: "0.75rem",
        padding: isMobile ? "1rem" : "2rem",
        maxHeight: "85vh",
        overflowY: "auto",
      }}
    >
      <h2
        style={{
          fontSize: isMobile ? "1.25rem" : "1.5rem",
          fontWeight: "bold",
          marginBottom: "1.5rem",
          color: "#30FF30",
          textShadow: "0 0 10px #30FF30",
          fontFamily: "Consolas, Monaco, Courier New, monospace",
        }}
      >
        📦 {t("orders.createNewOrder")}
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Basic Order Details */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "#30FF30",
              textShadow: "0 0 10px #30FF30",
            }}
          >
            📋 {t("orders.orderDetails")}
          </h3>
          <div
            style={{
              background: "rgba(0, 17, 0, 0.8)",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "2px solid #00AA00",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: "0.75rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  📝 {t("orders.title")} *
                </label>
                <input
                  data-testid="order-title"
                  type="text"
                  value={orderData.title}
                  onChange={(e) =>
                    setOrderData({ ...orderData, title: e.target.value })
                  }
                  placeholder="e.g., Deliver package to office"
                  required
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  💰 {t("orders.price")} (USD) *
                </label>
                <input
                  data-testid="order-price"
                  type="number"
                  value={orderData.price}
                  onChange={(e) =>
                    setOrderData({ ...orderData, price: e.target.value })
                  }
                  placeholder="e.g., 50"
                  required
                  min="0"
                  step="0.01"
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  📄 {t("orders.description")}
                </label>
                <textarea
                  data-testid="order-description"
                  value={orderData.description}
                  onChange={(e) =>
                    setOrderData({ ...orderData, description: e.target.value })
                  }
                  placeholder="Brief description of the delivery..."
                  rows="2"
                  style={{
                    width: "100%",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "#30FF30",
              textShadow: "0 0 10px #30FF30",
            }}
          >
            💳 Payment Method
          </h3>
          <div
            style={{
              background: "rgba(0, 17, 0, 0.8)",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "2px solid #00AA00",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  border:
                    orderData.payment_method === "COD"
                      ? "2px solid #00AA00"
                      : "2px solid #333",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  background:
                    orderData.payment_method === "COD"
                      ? "rgba(0, 170, 0, 0.2)"
                      : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="COD"
                  checked={orderData.payment_method === "COD"}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      payment_method: e.target.value,
                    })
                  }
                  style={{ marginRight: "0.5rem", accentColor: "#00AA00" }}
                />
                <span style={{ color: "#30FF30", fontWeight: "600" }}>
                  💵 Cash on Delivery
                </span>
              </label>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0.75rem 1rem",
                  border:
                    orderData.payment_method === "PREPAID"
                      ? "2px solid #00AAFF"
                      : "2px solid #333",
                  borderRadius: "0.5rem",
                  cursor: "pointer",
                  background:
                    orderData.payment_method === "PREPAID"
                      ? "rgba(0, 170, 255, 0.2)"
                      : "transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="PREPAID"
                  checked={orderData.payment_method === "PREPAID"}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      payment_method: e.target.value,
                    })
                  }
                  style={{ marginRight: "0.5rem", accentColor: "#00AAFF" }}
                />
                <span style={{ color: "#30FF30", fontWeight: "600" }}>
                  💳 Pay Now (Prepaid)
                </span>
              </label>
            </div>

            {orderData.payment_method === "PREPAID" &&
              showInsufficientBalance && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "0.75rem",
                    background: "rgba(220, 38, 38, 0.2)",
                    border: "1px solid #DC2626",
                    borderRadius: "0.5rem",
                  }}
                >
                  <p
                    style={{
                      color: "#FCA5A5",
                      margin: 0,
                      fontSize: "0.875rem",
                    }}
                  >
                    ⚠️ Insufficient balance. You need at least{" "}
                    {parseFloat(orderData.price || 0).toFixed(2)} EGP to create
                    this order.
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Location Selection - Combined Map + Manual Entry */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: "1rem",
            }}
          >
            {/* Pickup Location - Map + Manual Combined */}
            <div>
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#16A34A",
                }}
              >
                📤 {t("orders.pickupLocation")} *
              </h3>
              <LocationEntryCombined
                mapLocation={pickupLocation}
                onMapLocationChange={setPickupLocation}
                addressData={pickupAddress}
                onAddressChange={setPickupAddress}
                userLocation={userLocation}
                markerColor="green"
                API_URL={API_URL}
                locationType="pickup"
                compact={true}
                countries={countries}
                t={t}
                validationErrors={pickupErrors}
              />
            </div>

            {/* Dropoff Location - Map + Manual Combined */}
            <div>
              <h3
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  marginBottom: "1rem",
                  color: "#DC2626",
                }}
              >
                📥 {t("orders.deliveryLocation")} *
              </h3>
              <LocationEntryCombined
                mapLocation={dropoffLocation}
                onMapLocationChange={setDropoffLocation}
                addressData={dropoffAddress}
                onAddressChange={setDropoffAddress}
                userLocation={pickupLocation?.coordinates || userLocation}
                markerColor="red"
                API_URL={API_URL}
                locationType="delivery"
                compact={true}
                countries={countries}
                t={t}
                validationErrors={dropoffErrors}
              />
            </div>
          </div>
        </div>

        {/* Route Preview removed to keep only two maps in the form */}

        {/* Package Details */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              marginBottom: "1rem",
              color: "#30FF30",
              textShadow: "0 0 10px #30FF30",
            }}
          >
            📦 {t("orders.packageDetails")}
          </h3>
          <div
            style={{
              background: "rgba(0, 17, 0, 0.8)",
              padding: "1rem",
              borderRadius: "0.5rem",
              border: "2px solid #00AA00",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                gap: "0.75rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  📝 {t("orders.packageDescription")}
                </label>
                <input
                  type="text"
                  value={orderData.package_description}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      package_description: e.target.value,
                    })
                  }
                  placeholder="e.g., Documents, Electronics"
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  ⚖️ {t("orders.weight")} (kg)
                </label>
                <input
                  type="number"
                  value={orderData.package_weight}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      package_weight: e.target.value,
                    })
                  }
                  placeholder="e.g., 2.5"
                  min="0"
                  step="0.1"
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  💰 {t("orders.estimatedValue")} (USD)
                </label>
                <input
                  type="number"
                  value={orderData.estimated_value}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      estimated_value: e.target.value,
                    })
                  }
                  placeholder="e.g., 100"
                  min="0"
                  step="0.01"
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  📅 {t("orders.estimatedDeliveryDate")}
                </label>
                <input
                  type="datetime-local"
                  value={orderData.estimated_delivery_date}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      estimated_delivery_date: e.target.value,
                    })
                  }
                  style={{
                    width: "100%",
                    height: "44px",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <input
                    data-testid="require-upfront-payment"
                    type="checkbox"
                    id="require_upfront_payment"
                    checked={orderData.require_upfront_payment}
                    onChange={(e) =>
                      setOrderData({
                        ...orderData,
                        require_upfront_payment: e.target.checked,
                      })
                    }
                    style={{
                      marginRight: "0.5rem",
                      width: "1.25rem",
                      height: "1.25rem",
                      cursor: "pointer",
                      accentColor: "#00AA00",
                    }}
                  />
                  <label
                    htmlFor="require_upfront_payment"
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      color: "#30FF30",
                      textShadow: "0 0 5px #30FF30",
                    }}
                  >
                    💸 {t("orders.requireUpfrontPayment")} (Driver pays at
                    pickup)
                  </label>
                </div>

                {orderData.require_upfront_payment && (
                  <div style={{ marginLeft: "1.75rem", marginBottom: "1rem" }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        marginBottom: "0.5rem",
                        color: "#30FF30",
                        textShadow: "0 0 5px #30FF30",
                      }}
                    >
                      💵 {t("orders.upfrontAmount")} (USD) *
                    </label>
                    <input
                      data-testid="upfront-payment-amount"
                      type="number"
                      value={orderData.upfront_payment}
                      onChange={(e) =>
                        setOrderData({
                          ...orderData,
                          upfront_payment: e.target.value,
                        })
                      }
                      placeholder="e.g., 50"
                      min="0"
                      step="0.01"
                      required={orderData.require_upfront_payment}
                      style={{
                        width: "100%",
                        height: "44px",
                        background: "rgba(0, 17, 0, 0.8)",
                        color: "#30FF30",
                        border: "2px solid #00AA00",
                        borderRadius: "0.375rem",
                        fontSize: "0.875rem",
                        fontFamily: "Consolas, Monaco, Courier New, monospace",
                        padding: "0.375rem 0.5rem",
                        outline: "none",
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    color: "#30FF30",
                    textShadow: "0 0 5px #30FF30",
                  }}
                >
                  📋 {t("orders.specialInstructions")}
                </label>
                <textarea
                  value={orderData.special_instructions}
                  onChange={(e) =>
                    setOrderData({
                      ...orderData,
                      special_instructions: e.target.value,
                    })
                  }
                  placeholder="Any special handling instructions..."
                  rows="2"
                  style={{
                    width: "100%",
                    background: "rgba(0, 17, 0, 0.8)",
                    color: "#30FF30",
                    border: "2px solid #00AA00",
                    borderRadius: "0.375rem",
                    fontSize: "0.875rem",
                    fontFamily: "Consolas, Monaco, Courier New, monospace",
                    padding: "0.375rem 0.5rem",
                    outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? "0.75rem" : "1rem",
            justifyContent: "flex-end",
            position: isMobile ? "sticky" : "relative",
            bottom: isMobile ? "0" : "auto",
            background: isMobile ? "#000000" : "transparent",
            padding: isMobile ? "1rem" : "0",
            margin: isMobile ? "0 -1rem -1rem -1rem" : "0",
            borderTop: isMobile ? "2px solid #00AA00" : "none",
          }}
        >
          {/* Cancel button */}
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: isMobile ? "0.625rem 1.25rem" : "0.75rem 1.5rem",
              background: "linear-gradient(135deg, #001100 0%, #000000 100%)",
              color: "#30FF30",
              border: "2px solid #00AA00",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: isMobile ? "0.875rem" : "1rem",
              fontFamily: "Consolas, Monaco, Courier New, monospace",
              transition: "all 0.3s ease",
              boxShadow: "0 0 10px rgba(0, 255, 0, 0.2)",
            }}
            onMouseOver={(e) => {
              e.target.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.4)";
              e.target.style.transform = "translateY(-2px)";
            }}
            onMouseOut={(e) => {
              e.target.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.2)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            ❎ {t("common.cancel")}
          </button>

          {/* Publish button */}
          <button
            type="submit"
            disabled={
              loading ||
              !pickupLocation?.coordinates ||
              !dropoffLocation?.coordinates
            }
            style={{
              padding: isMobile ? "0.625rem 1.25rem" : "0.75rem 1.5rem",
              background:
                pickupLocation?.coordinates && dropoffLocation?.coordinates
                  ? "linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)"
                  : "#333333",
              color: "#30FF30",
              border: "2px solid #00AA00",
              borderRadius: "0.375rem",
              cursor:
                pickupLocation?.coordinates && dropoffLocation?.coordinates
                  ? "pointer"
                  : "not-allowed",
              fontWeight: "600",
              fontSize: isMobile ? "0.875rem" : "1rem",
              fontFamily: "Consolas, Monaco, Courier New, monospace",
              opacity:
                pickupLocation?.coordinates && dropoffLocation?.coordinates
                  ? 1
                  : 0.5,
              boxShadow:
                pickupLocation?.coordinates && dropoffLocation?.coordinates
                  ? "0 0 20px rgba(0, 255, 0, 0.6)"
                  : "none",
              transition: "all 0.3s ease",
            }}
            onMouseOver={(e) => {
              if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
                e.target.style.boxShadow = "0 0 30px rgba(0, 255, 0, 0.8)";
                e.target.style.transform = "translateY(-2px)";
              }
            }}
            onMouseOut={(e) => {
              if (pickupLocation?.coordinates && dropoffLocation?.coordinates) {
                e.target.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.6)";
                e.target.style.transform = "translateY(0)";
              }
            }}
          >
            {loading
              ? "⏳ " + t("orders.creating")
              : "🚀 " + t("orders.publishOrder")}
          </button>
        </div>
      </form>

      {/* Success/Error Modal */}
      <MessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </div>
  );
};

// ============ MAP LOCATION PICKER COMPONENT ============
const MapLocationPicker = ({
  location,
  onChange,
  onAddressFill,
  userLocation,
  markerColor,
  API_URL,
  locationType,
  compact = false,
  t,
}) => {
  const [mapUrl, setMapUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMap, setShowMap] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleMapClick = async (coords) => {
    setLoading(true);
    setError("");

    let loc = {
      coordinates: { lat: coords.lat, lng: coords.lng },
    };
    onChange(loc);
    try {
      const data = await api.get(
        `/locations/reverse?lat=${coords.lat}&lng=${coords.lng}`,
      );
      loc = {
        coordinates: { lat: coords.lat, lng: coords.lng },
        displayName: data.displayName,
        address: {
          country: data.address?.country || "",
          city: data.address?.city || "",
          area: data.address?.area || "",
          street: data.address?.street || "",
          building: data.address?.buildingNumber || "",
        },
      };

      if (onAddressFill && data && data.address) {
        onAddressFill({
          country: data.address.country || "",
          city: data.address.city || "",
          area: data.address.area || "",
          street: data.address.street || "",
          building: data.address.buildingNumber || "",
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlPaste = async () => {
    if (!mapUrl.trim()) return;

    setLoading(true);
    setError("");

    try {
      const data = await api.post("/locations/parse-maps-url", { url: mapUrl });
      onChange(data);
      setMapUrl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        background: "#F9FAFB",
        padding: compact ? "0.75rem" : "1rem",
        borderRadius: "0.5rem",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* Google Maps URL Input */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display: "block",
            fontSize: compact ? "0.625rem" : "0.75rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#6B7280",
          }}
        >
          📍 {t("orders.googleMapsLink")} ({t("common.optional")})
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder={t("orders.pasteGoogleMapsLink")}
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            style={{
              flex: 1,
              padding: compact ? "0.375rem 0.5rem" : "0.5rem",
              border: "1px solid #D1D5DB",
              borderRadius: "0.375rem",
              fontSize: compact ? "0.75rem" : "0.875rem",
            }}
          />
          <button
            type="button"
            onClick={handleUrlPaste}
            disabled={loading || !mapUrl.trim()}
            style={{
              padding: compact ? "0.375rem 1rem" : "0.5rem 1rem",
              background: "#4F46E5",
              color: "white",
              borderRadius: "0.375rem",
              border: "none",
              cursor: loading || !mapUrl.trim() ? "not-allowed" : "pointer",
              fontSize: compact ? "0.75rem" : "0.875rem",
              fontWeight: "600",
              opacity: loading || !mapUrl.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "..." : t("common.parse")}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#991B1B",
            padding: compact ? "0.5rem" : "0.75rem",
            borderRadius: "0.375rem",
            marginBottom: "1rem",
            fontSize: compact ? "0.75rem" : "0.875rem",
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {compact && (
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          style={{
            width: "100%",
            padding: "0.5rem",
            background: "#6B7280",
            color: "white",
            borderRadius: "0.375rem",
            border: "none",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontWeight: "600",
            marginBottom: "1rem",
          }}
        >
          {showMap ? "🗺️ Hide Map" : "🗺️ Show Map"}
        </button>
      )}

      {/* Map (click to fullscreen) */}
      {(!compact || showMap) && !isFullscreen && (
        <div
          onClick={() => setIsFullscreen(true)}
          style={{
            height: compact ? "300px" : "400px",
            width: "100%",
            marginBottom: "1rem",
            borderRadius: "0.5rem",
            overflow: "hidden",
            position: "relative",
            minWidth: "100%",
            cursor: "zoom-in",
          }}
        >
          {userLocation ? (
            <MapContainer
              center={
                location?.coordinates
                  ? [location.coordinates.lat, location.coordinates.lng]
                  : userLocation
                    ? [userLocation.lat, userLocation.lng]
                    : [31.2001012694892, 29.91881847381592]
              }
              zoom={15}
              style={{
                height: "100%",
                width: "100%",
                zIndex: 1,
                position: "relative",
              }}
              whenReady={(map) => {
                // Ensure map resizes properly and tiles load completely
                setTimeout(() => {
                  try {
                    if (map && typeof map.invalidateSize === "function") {
                      map.invalidateSize();
                      window.dispatchEvent(new Event("resize"));
                    }
                  } catch (error) {
                    console.warn("Map invalidateSize failed:", error);
                  }
                }, 100);
              }}
              whenCreated={(map) => {
                // Force tile loading when map is created
                setTimeout(() => {
                  try {
                    if (map && typeof map.invalidateSize === "function") {
                      map.invalidateSize();
                    }
                  } catch (error) {
                    console.warn("Map invalidateSize failed:", error);
                  }
                }, 200);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={`${process.env.REACT_APP_API_URL}/maps/tiles/{z}/{x}/{y}.png?v=3`}
                maxZoom={19}
                minZoom={1}
                subdomains={[]}
                tileSize={256}
                updateWhenZooming={true}
                updateWhenIdle={false}
                keepBuffer={4}
                tms={false}
                zoomReverse={false}
                detectRetina={false}
                maxNativeZoom={18}
                minNativeZoom={0}
                zoomOffset={0}
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {location?.coordinates && (
                <DraggableMarker
                  key={`${location.coordinates.lat}-${location.coordinates.lng}`}
                  position={[
                    location.coordinates.lat,
                    location.coordinates.lng,
                  ]}
                  icon={L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${markerColor}.png`,
                  })}
                  onDragEnd={async (newPos) => await handleMapClick(newPos)}
                  isDragging={isDragging}
                  setIsDragging={setIsDragging}
                >
                  <Popup>
                    <strong>
                      {locationType === "pickup"
                        ? t("orders.pickup")
                        : t("orders.delivery")}
                    </strong>
                    <br />
                    {location.displayName}
                  </Popup>
                </DraggableMarker>
              )}
              <MapUpdater center={location?.coordinates || userLocation} />
            </MapContainer>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                width: "100%",
                background: "#F3F4F6",
                color: "#6B7280",
                fontSize: "1rem",
              }}
            >
              🔄 Loading map...
            </div>
          )}
        </div>
      )}

      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ position: "absolute", top: 16, right: 16 }}>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              style={{
                background: "white",
                color: "#111827",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.5rem 0.75rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t("common.close")}
            </button>
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              height: "80vh",
              background: "white",
              borderRadius: "0.5rem",
              overflow: "hidden",
            }}
          >
            <MapContainer
              center={
                location?.coordinates
                  ? [location.coordinates.lat, location.coordinates.lng]
                  : userLocation
                    ? [userLocation.lat, userLocation.lng]
                    : [31.2001012694892, 29.91881847381592]
              }
              zoom={16}
              style={{ height: "100%", width: "100%" }}
              whenReady={(map) => {
                setTimeout(() => {
                  try {
                    map.invalidateSize();
                  } catch (_) {}
                }, 150);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={`${process.env.REACT_APP_API_URL}/maps/tiles/{z}/{x}/{y}.png?v=3`}
                maxZoom={19}
                minZoom={1}
                subdomains={[]}
                tileSize={256}
                updateWhenZooming={true}
                updateWhenIdle={false}
                keepBuffer={4}
              />
              <MapClickHandler onMapClick={handleMapClick} />
              {location?.coordinates && (
                <DraggableMarker
                  key={`fs-${location.coordinates.lat}-${location.coordinates.lng}`}
                  position={[
                    location.coordinates.lat,
                    location.coordinates.lng,
                  ]}
                  icon={L.icon({
                    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                  })}
                  onDragEnd={(newPos) => handleMapClick(newPos)}
                >
                  <Popup>
                    <strong>
                      {locationType === "pickup"
                        ? t("orders.pickup")
                        : t("orders.delivery")}
                    </strong>
                    <br />
                    {location.displayName || "Drag to set location"}
                  </Popup>
                </DraggableMarker>
              )}
            </MapContainer>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={() => handleMapClick(userLocation)}
          disabled={loading || !userLocation}
          style={{
            flex: 1,
            padding: "0.5rem",
            background: "#10B981",
            color: "white",
            borderRadius: "0.375rem",
            border: "none",
            cursor: loading || !userLocation ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
            opacity: loading || !userLocation ? 0.5 : 1,
          }}
        >
          📍 {t("orders.useCurrentLocation")}
        </button>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={!location}
          style={{
            padding: "0.5rem 1rem",
            background: "#EF4444",
            color: "white",
            borderRadius: "0.375rem",
            border: "none",
            cursor: !location ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: "600",
            opacity: !location ? 0.5 : 1,
          }}
        >
          {t("common.clear")}
        </button>
      </div>

      {/* Address Display */}
      {location && (
        <div
          style={{
            background: "white",
            padding: "1rem",
            borderRadius: "0.375rem",
            border: "1px solid #E5E7EB",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.625rem",
                  fontWeight: "600",
                  color: "#6B7280",
                  marginBottom: "0.25rem",
                }}
              >
                {t("orders.country")}
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                {location.address?.country || "N/A"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.625rem",
                  fontWeight: "600",
                  color: "#6B7280",
                  marginBottom: "0.25rem",
                }}
              >
                {t("orders.city")}
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                {location.address?.city || "N/A"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.625rem",
                  fontWeight: "600",
                  color: "#6B7280",
                  marginBottom: "0.25rem",
                }}
              >
                {t("orders.area")}
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                {location.address?.area || "N/A"}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.625rem",
                  fontWeight: "600",
                  color: "#6B7280",
                  marginBottom: "0.25rem",
                }}
              >
                {t("orders.street")}
              </p>
              <p style={{ fontSize: "0.875rem" }}>
                {location.address?.street || "N/A"}
              </p>
            </div>
          </div>

          {location.isRemote && (
            <div
              style={{
                background: "#FEF3C7",
                padding: "0.75rem",
                borderRadius: "0.375rem",
                border: "1px solid #FCD34D",
              }}
            >
              <p
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#92400E",
                }}
              >
                ⚠️ {t("orders.remoteAreaWarning")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============ HELPER COMPONENTS ============
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const MapUpdater = ({ center }) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], map.getZoom());
      map.invalidateSize();
    }
  }, [center, map]);

  return null;
};

// ============ COMBINED LOCATION ENTRY (Map + Address Fields Together - MATRIX STYLE) ============
const LocationEntryCombined = ({
  mapLocation,
  onMapLocationChange,
  addressData,
  onAddressChange,
  userLocation,
  markerColor,
  API_URL,
  locationType,
  compact = false,
  countries = [],
  t,
  validationErrors = {},
}) => {
  // const locationData = useLocationData(API_URL);

  // State for cascaded dropdowns
  // const [availableCities, setAvailableCities] = useState([]);
  // const [availableAreas, setAvailableAreas] = useState([]);
  // const [availableStreets, setAvailableStreets] = useState([]);
  // const [loadingCities, setLoadingCities] = useState(false);
  // const [loadingAreas, setLoadingAreas] = useState(false);
  // const [loadingStreets, setLoadingStreets] = useState(false);
  // const citySearchTimer = useRef(null);
  // const areaSearchTimer = useRef(null);
  // const streetSearchTimer = useRef(null);

  // useEffect(() => {
  //   return () => {
  //     clearTimeout(citySearchTimer.current);
  //     clearTimeout(areaSearchTimer.current);
  //     clearTimeout(streetSearchTimer.current);
  //   };
  // }, []);

  // const triggerCitySearch = (value = '', overrideCountry) => {
  //   const selectedCountry = overrideCountry || addressData.country;
  //   if (!selectedCountry) {
  //     setAvailableCities([]);
  //     return;
  //   }
  //   const normalizedQuery = (value || '').trim();
  //   const effectiveQuery = normalizedQuery.length >= 2 ? normalizedQuery : '';
  //   clearTimeout(citySearchTimer.current);
  //   setLoadingCities(true);
  //   const timer = setTimeout(async () => {
  //     try {
  //       const result = await locationData.searchCities(selectedCountry, effectiveQuery);
  //       if (citySearchTimer.current === timer) {
  //         setAvailableCities(result);
  //       }
  //     } catch (error) {
  //       console.warn('City search error:', error);
  //     } finally {
  //       if (citySearchTimer.current === timer) {
  //         setLoadingCities(false);
  //       }
  //     }
  //   }, 250);
  //   citySearchTimer.current = timer;
  // };

  // const triggerAreaSearch = (value = '', overrideCity) => {
  //   const selectedCountry = addressData.country;
  //   const selectedCity = overrideCity || addressData.city;
  //   if (!selectedCountry || !selectedCity) {
  //     setAvailableAreas([]);
  //     return;
  //   }
  //   const normalizedQuery = (value || '').trim();
  //   const effectiveQuery = normalizedQuery.length >= 2 ? normalizedQuery : '';
  //   clearTimeout(areaSearchTimer.current);
  //   setLoadingAreas(true);
  //   const timer = setTimeout(async () => {
  //     try {
  //       const result = await locationData.searchAreas(selectedCountry, selectedCity, effectiveQuery);
  //       if (areaSearchTimer.current === timer) {
  //         setAvailableAreas(result);
  //       }
  //     } catch (error) {
  //       console.warn('Area search error:', error);
  //     } finally {
  //       if (areaSearchTimer.current === timer) {
  //         setLoadingAreas(false);
  //       }
  //     }
  //   }, 250);
  //   areaSearchTimer.current = timer;
  // };

  // const triggerStreetSearch = (value = '', overrideArea) => {
  //   const selectedCountry = addressData.country;
  //   const selectedCity = addressData.city;
  //   const selectedArea = overrideArea || addressData.area;
  //   if (!selectedCountry || !selectedCity || !selectedArea) {
  //     setAvailableStreets([]);
  //     return;
  //   }
  //   const normalizedQuery = (value || '').trim();
  //   const effectiveQuery = normalizedQuery.length >= 2 ? normalizedQuery : '';
  //   clearTimeout(streetSearchTimer.current);
  //   setLoadingStreets(true);
  //   const timer = setTimeout(async () => {
  //     try {
  //       const result = await locationData.searchStreets(selectedCountry, selectedCity, selectedArea, effectiveQuery);
  //       if (streetSearchTimer.current === timer) {
  //         setAvailableStreets(result);
  //       }
  //     } catch (error) {
  //       console.warn('Street search error:', error);
  //     } finally {
  //       if (streetSearchTimer.current === timer) {
  //         setLoadingStreets(false);
  //       }
  //     }
  //   }, 250);
  //   streetSearchTimer.current = timer;
  // };

  // useEffect(() => {
  //   if (!addressData.country) {
  //     setAvailableCities([]);
  //     return;
  //   }
  //   triggerCitySearch('', addressData.country);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [addressData.country]);

  // useEffect(() => {
  //   if (!addressData.country || !addressData.city) {
  //     setAvailableAreas([]);
  //     return;
  //   }
  //   triggerAreaSearch('', addressData.city);
  //   // Geocode when city changes (with enough info)
  //   setTimeout(() => locationData.geocodeAddress(addressData, onMapLocationChange), 100);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [addressData.city, addressData.country]);

  // useEffect(() => {
  //   if (!addressData.country || !addressData.city || !addressData.area) {
  //     setAvailableStreets([]);
  //     return;
  //   }
  //   triggerStreetSearch('', addressData.area);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [addressData.area, addressData.city, addressData.country]);

  // Handle country change - load cities
  // const handleCountryChange = async (country) => {
  //   const newAddress = { ...addressData, country, city: '', area: '', street: '' };
  //   onAddressChange(newAddress);

  //   if (country) {
  //     setLoadingCities(true);
  //     const cities = await locationData.searchCities(country);
  //     setAvailableCities(cities);
  //     setLoadingCities(false);
  //     setAvailableAreas([]);
  //     setAvailableStreets([]);
  //   } else {
  //     setAvailableCities([]);
  //     setAvailableAreas([]);
  //     setAvailableStreets([]);
  //   }
  // };

  // // Handle city change - load areas
  // const handleCityChange = async (city) => {
  //   const newAddress = { ...addressData, city, area: '', street: '' };
  //   onAddressChange(newAddress);

  //   if (addressData.country && city) {
  //     setLoadingAreas(true);
  //     const areas = await locationData.searchAreas(addressData.country, city);
  //     setAvailableAreas(areas);
  //     setLoadingAreas(false);
  //     setAvailableStreets([]);
  //   } else {
  //     setAvailableAreas([]);
  //     setAvailableStreets([]);
  //   }

  //   // Geocode when city changes (with enough info)
  //   setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  // };

  // // Handle area change - load streets
  // const handleAreaChange = async (area) => {
  //   const newAddress = { ...addressData, area, street: '' };
  //   onAddressChange(newAddress);

  //   if (addressData.country && addressData.city && area) {
  //     setLoadingStreets(true);
  //     const streets = await locationData.searchStreets(addressData.country, addressData.city, area);
  //     setAvailableStreets(streets);
  //     setLoadingStreets(false);
  //   } else {
  //     setAvailableStreets([]);
  //   }

  //   // Geocode when area changes
  //   setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 100);
  // };

  // Handle other field changes - geocode for street, building, floor, apartment
  const handleFieldChange = (field, value) => {
    const newAddress = { ...addressData, [field]: value };
    onAddressChange(newAddress);

    //TODO currently we are not affecting map upon address change,
    //only map can change address fields and not the inverse, so check if this should be deleted with other fields cascading
    // if (['street', 'building', 'floor', 'apartment'].includes(field)) {
    //   setTimeout(() => locationData.geocodeAddress(newAddress, onMapLocationChange), 300);
    // }
  };

  // Handle selecting a saved address
  const handleSavedAddressSelect = (savedLocation) => {
    // Update map location
    onMapLocationChange(savedLocation);

    // Update address form fields
    if (savedLocation.address) {
      onAddressChange({
        ...addressData,
        ...savedLocation.address,
        country: savedLocation.address.country || addressData.country,
        city: savedLocation.address.city || "",
        area: savedLocation.address.area || "",
        street: savedLocation.address.street || "",
        building: savedLocation.address.building || "",
        floor: savedLocation.address.floor || "",
        apartment: savedLocation.address.apartment || "",
      });
    }
  };

  return (
    <div
      className="card"
      style={{
        background: "linear-gradient(135deg, #000000 0%, #001100 100%)",
        border: "2px solid #00AA00",
        borderRadius: "0.75rem",
        overflow: "hidden",
      }}
    >
      {/* Saved Address Selector */}
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid #00AA00",
          background: "rgba(0,30,0,0.3)",
        }}
      >
        <SavedAddressSelector
          onSelect={handleSavedAddressSelect}
          currentAddress={addressData}
          currentCoordinates={mapLocation?.coordinates}
          onSaved={() => {}}
          t={t}
        />
      </div>
      {/* Map Section - Full Width - MOVED TO TOP */}
      <div style={{ padding: "1rem", borderBottom: "2px solid #00AA00" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <h4
            style={{
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#30FF30",
              textShadow: "0 0 10px #30FF30",
            }}
          >
            🗺️ Interactive Map
          </h4>
        </div>

        <MapLocationPicker
          location={mapLocation}
          onChange={(loc) => {
            onMapLocationChange(loc);
          }}
          onAddressFill={(addr) => {
            onAddressChange({
              ...addressData,
              ...addr,
            });
          }}
          userLocation={userLocation}
          markerColor={markerColor}
          API_URL={API_URL}
          locationType={locationType}
          compact={true}
          t={t}
        />
      </div>

      {/* Address Fields Section - NOW BELOW MAP */}
      <div style={{ padding: "1rem" }}>
        <h4
          style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#30FF30",
            marginBottom: "0.75rem",
            textShadow: "0 0 10px #30FF30",
          }}
        >
          📝{" "}
          {locationType === "pickup"
            ? t("orders.pickupLocation")
            : t("orders.deliveryLocation")}{" "}
          Details
        </h4>

        <div
          className="address-fields-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.75rem",
          }}
        >
          {/* Country field */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              🌍 {t("orders.country")} *
            </label>
            <input
              data-testid={`${locationType}-country`}
              type="text"
              value={addressData.country || ""}
              onChange={(e) =>
                onAddressChange({ ...addressData, country: e.target.value })
              }
              placeholder={t("orders.selectCountry")}
              required
              style={{
                width: "100%",
                height: "44px",
                background: "rgba(0, 17, 0, 0.8)",
                color: "#30FF30",
                border: validationErrors?.country
                  ? "2px solid #EF4444"
                  : "2px solid #00AA00",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "Consolas, Monaco, Courier New, monospace",
                padding: "0.5rem",
                outline: "none",
              }}
            />
          </div>

          {/* City field */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              🏙️ {t("orders.city")} *
            </label>
            <input
              data-testid={`${locationType}-city`}
              type="text"
              value={addressData.city || ""}
              onChange={(e) =>
                onAddressChange({ ...addressData, city: e.target.value })
              }
              placeholder="Enter city"
              required
              style={{
                width: "100%",
                height: "44px",
                background: "rgba(0, 17, 0, 0.8)",
                color: "#30FF30",
                border: validationErrors?.city
                  ? "2px solid #EF4444"
                  : "2px solid #00AA00",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "Consolas, Monaco, Courier New, monospace",
                padding: "0.5rem",
                outline: "none",
              }}
            />
          </div>

          {/* Area field */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              🏘️ {t("orders.area")} *
            </label>
            <input
              data-testid={`${locationType}-area`}
              type="text"
              value={addressData.area || ""}
              onChange={(e) =>
                onAddressChange({ ...addressData, area: e.target.value })
              }
              placeholder="Enter area"
              required
              style={{
                width: "100%",
                height: "44px",
                background: "rgba(0, 17, 0, 0.8)",
                color: "#30FF30",
                border: validationErrors?.area
                  ? "2px solid #EF4444"
                  : "2px solid #00AA00",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "Consolas, Monaco, Courier New, monospace",
                padding: "0.5rem",
                outline: "none",
              }}
            />
          </div>

          {/* Street field */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              🛣️ {t("orders.street")} *
            </label>
            <input
              data-testid={`${locationType}-street`}
              type="text"
              value={addressData.street || ""}
              onChange={(e) =>
                onAddressChange({ ...addressData, street: e.target.value })
              }
              placeholder="Enter street"
              required
              style={{
                width: "100%",
                height: "44px",
                background: "rgba(0, 17, 0, 0.8)",
                color: "#30FF30",
                border: validationErrors?.street
                  ? "2px solid #EF4444"
                  : "2px solid #00AA00",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "Consolas, Monaco, Courier New, monospace",
                padding: "0.5rem",
                outline: "none",
              }}
            />
          </div>

          {/* Building field */}
          <div style={{ gridColumn: "span 2" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              🏢 {t("orders.building")} *
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr",
                gap: "0.5rem",
              }}
            >
              <input
                data-testid={`${locationType}-building`}
                type="text"
                value={addressData.building || ""}
                //TODO catestrophic: on each character change in address fields onAddressChange will be invoked!!!
                onChange={(e) =>
                  onAddressChange({ ...addressData, building: e.target.value })
                }
                placeholder={t("orders.buildingNumber")}
                style={{
                  width: "100%",
                  height: "44px",
                  background: "rgba(0, 17, 0, 0.8)",
                  color: "#30FF30",
                  border: validationErrors?.building
                    ? "2px solid #EF4444"
                    : "2px solid #00AA00",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontFamily: "Consolas, Monaco, Courier New, monospace",
                  padding: "0.5rem",
                  outline: "none",
                }}
                required
              />
              <input
                data-testid={`${locationType}-floor`}
                type="text"
                value={addressData.floor || ""}
                onChange={(e) =>
                  onAddressChange({ ...addressData, floor: e.target.value })
                }
                placeholder={t("orders.floor")}
                style={{
                  width: "100%",
                  height: "44px",
                  background: "rgba(0, 17, 0, 0.8)",
                  color: "#30FF30",
                  border: "2px solid #00AA00",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontFamily: "Consolas, Monaco, Courier New, monospace",
                  padding: "0.5rem",
                  outline: "none",
                }}
              />
              <input
                data-testid={`${locationType}-apartment`}
                type="text"
                value={addressData.apartment || ""}
                onChange={(e) =>
                  onAddressChange({ ...addressData, apartment: e.target.value })
                }
                placeholder={t("orders.aptNumber")}
                style={{
                  width: "100%",
                  height: "44px",
                  background: "rgba(0, 17, 0, 0.8)",
                  color: "#30FF30",
                  border: "2px solid #00AA00",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  fontFamily: "Consolas, Monaco, Courier New, monospace",
                  padding: "0.5rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              👤 {t("orders.contactName")} *
            </label>
            <input
              data-testid={`${locationType}-contact-name`}
              type="text"
              value={addressData.personName || ""}
              onChange={(e) =>
                onAddressChange({ ...addressData, personName: e.target.value })
              }
              placeholder={t("orders.contactPerson")}
              required
              style={{
                width: "100%",
                height: "44px",
                background: "rgba(0, 17, 0, 0.8)",
                color: "#30FF30",
                border: validationErrors?.personName
                  ? "2px solid #EF4444"
                  : "2px solid #00AA00",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "Consolas, Monaco, Courier New, monospace",
                padding: "0.5rem",
                outline: "none",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#30FF30",
                marginBottom: "0.25rem",
                textShadow: "0 0 5px #30FF30",
              }}
            >
              ☎️ {t("orders.contactPhone")} *
            </label>
            <input
              data-testid={`${locationType}-contact-phone`}
              type="tel"
              value={addressData.personPhone || ""}
              onChange={(e) =>
                onAddressChange({ ...addressData, personPhone: e.target.value })
              }
              placeholder={t("orders.phoneNumber")}
              required
              style={{
                width: "100%",
                height: "44px",
                background: "rgba(0, 17, 0, 0.8)",
                color: "#30FF30",
                border: validationErrors?.personPhone
                  ? "2px solid #EF4444"
                  : "2px solid #00AA00",
                borderRadius: "0.375rem",
                fontSize: "0.875rem",
                fontFamily: "Consolas, Monaco, Courier New, monospace",
                padding: "0.5rem",
                outline: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* Fullscreen handled inside MapLocationPicker */}
    </div>
  );
};

// ============ LOCATION ENTRY COMPONENT (Address Fields + Map) ============

export default OrderCreationForm;
