import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import api from "../api";
import RoutePreviewMap from "./RoutePreviewMap";
import { MapsApi } from "../services/api/maps";
import polyline from "@mapbox/polyline";
import io from "socket.io-client";

const AsyncOrderMap = ({
  order,
  currentUser,
  driverLocation,
  theme = "dark",
  onTelemetryUpdate,
  ...props
}) => {
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [nextWaypoint, setNextWaypoint] = useState(null);
  const [actualRoute, setActualRoute] = useState(null);
  const [driverToPickupPath, setDriverToPickupPath] = useState([]);
  const [pickupToDropoffPath, setPickupToDropoffPath] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const routeCacheRef = useRef({ leg1: null, leg2: null });
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const pollRef = useRef(null);

  console.log(
    `📡 [AsyncOrderMap] INPUT: orderId=${order?.id}, status=${order?.status}, driverLocation=`,
    driverLocation,
  );

  const isActiveOrder = ["accepted", "picked_up", "in_transit"].includes(
    order.status,
  );
  const canView =
    currentUser?.primary_role === "admin" ||
    (currentUser?.primary_role === "customer" &&
      (order.customerId === currentUser?.id ||
        order.customer_id === currentUser?.id)) ||
    (currentUser?.primary_role === "driver" &&
      (order.assignedDriver?.userId === currentUser?.id ||
        order.assigned_driver_user_id === currentUser?.id));
  const shouldFetch = isActiveOrder && canView;

  const normalizeOrderPoint = useCallback(
    (primary, fallbackCoordinates, latRaw, lngRaw) => {
      const lat = Number(
        primary?.lat ??
          primary?.latitude ??
          fallbackCoordinates?.lat ??
          fallbackCoordinates?.latitude ??
          latRaw,
      );
      const lng = Number(
        primary?.lng ??
          primary?.longitude ??
          fallbackCoordinates?.lng ??
          fallbackCoordinates?.longitude ??
          lngRaw,
      );
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    },
    [],
  );

  const pickupPoint = useMemo(
    () =>
      normalizeOrderPoint(
        order.from,
        order.pickupLocation?.coordinates,
        order.from_lat,
        order.from_lng,
      ),
    [
      normalizeOrderPoint,
      order.from,
      order.pickupLocation,
      order.from_lat,
      order.from_lng,
    ],
  );
  const dropoffPoint = useMemo(
    () =>
      normalizeOrderPoint(
        order.to,
        order.dropoffLocation?.coordinates,
        order.to_lat,
        order.to_lng,
      ),
    [
      normalizeOrderPoint,
      order.to,
      order.dropoffLocation,
      order.to_lat,
      order.to_lng,
    ],
  );

  const updateTelemetry = useCallback(
    (lat, lng, backendNextWaypoint = null) => {
      if (!onTelemetryUpdate) return;
      if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)))
        return;
      if (
        backendNextWaypoint &&
        Number.isFinite(Number(backendNextWaypoint.distance_km)) &&
        Number.isFinite(Number(backendNextWaypoint.eta_minutes))
      ) {
        onTelemetryUpdate({
          distanceKm: Number(backendNextWaypoint.distance_km).toFixed(1),
          etaMinutes: Math.max(
            1,
            Math.ceil(Number(backendNextWaypoint.eta_minutes)),
          ),
          speedKmh: "0",
          lastUpdated: new Date().toISOString(),
          nextTarget:
            backendNextWaypoint.type === "pickup" ? "pickup" : "delivery",
        });
      }
    },
    [onTelemetryUpdate],
  );

  const decodePolylinePath = (encodedPolyline) => {
    if (!encodedPolyline || typeof encodedPolyline !== "string") return [];
    try {
      return polyline.decode(encodedPolyline);
    } catch {
      return [];
    }
  };

  const fetchTracking = useCallback(async () => {
    try {
      setLoading(true);
      console.log(
        `📡 [AsyncOrderMap] Fetching tracking for order ${order.id}, status: ${order.status}, user: ${currentUser?.primary_role}, customer_id=${order.customer_id}, user_id=${currentUser?.id}`,
      );
      const res = await api.get(`/orders/${order.id}/tracking`);
      console.log(`📡 [AsyncOrderMap] Tracking response:`, res);
      const backendNextWaypoint = res?.nextWaypoint || null;
      setNextWaypoint(backendNextWaypoint);

      if (backendNextWaypoint?.polyline) {
        const nextPath = decodePolylinePath(backendNextWaypoint.polyline);
        if (nextPath.length > 0) {
          setDriverToPickupPath(nextPath);
        }
      } else {
        setDriverToPickupPath([]);
      }

      const loc = res?.currentLocation;
      if (
        loc &&
        Number.isFinite(parseFloat(loc.lat)) &&
        Number.isFinite(parseFloat(loc.lng))
      ) {
        const lat = parseFloat(loc.lat),
          lng = parseFloat(loc.lng);
        console.log(`📍 [AsyncOrderMap] Driver location found:`, lat, lng);
        setCurrentDriverLocation({
          latitude: lat,
          longitude: lng,
          timestamp: loc.timestamp,
          heading: loc.heading,
          speedKmh: loc.speedKmh,
          accuracyMeters: loc.accuracyMeters,
        });
        updateTelemetry(lat, lng, backendNextWaypoint);
      } else {
        console.log(
          `📡 [AsyncOrderMap] No current location in response - order may not have driver location updates yet`,
        );
      }
      if (
        Array.isArray(res?.locationHistory) &&
        res.locationHistory.length > 0
      ) {
        const path = res.locationHistory.map((p) => [
          parseFloat(p.lat),
          parseFloat(p.lng),
        ]);
        setActualRoute(path);
      }

      if (
        backendNextWaypoint &&
        !backendNextWaypoint.polyline &&
        loc &&
        Number.isFinite(parseFloat(loc.lat)) &&
        Number.isFinite(parseFloat(loc.lng)) &&
        Number.isFinite(Number(backendNextWaypoint?.location?.lat)) &&
        Number.isFinite(Number(backendNextWaypoint?.location?.lng))
      ) {
        setDriverToPickupPath([
          [parseFloat(loc.lat), parseFloat(loc.lng)],
          [
            Number(backendNextWaypoint.location.lat),
            Number(backendNextWaypoint.location.lng),
          ],
        ]);
      }
    } catch (err) {
      console.warn(
        "[AsyncOrderMap] tracking fetch failed",
        err?.message || err,
      );
    } finally {
      setLoading(false);
    }
  }, [
    order.id,
    order.status,
    currentUser?.primary_role,
    currentUser?.id,
    order.customer_id,
    updateTelemetry,
  ]);

  useEffect(() => {
    if (!shouldFetch) return;
    fetchTracking();
  }, [shouldFetch, fetchTracking]);

  useEffect(() => {
    if (!shouldFetch) return;
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    const socket = io(apiUrl, {
      withCredentials: true,
      transports: ["websocket"],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log(
        `📡 [AsyncOrderMap] Socket connected, joining order room:`,
        order.id,
      );
      socket.emit("join_order", { orderId: order.id });
    });
    socket.on("connect_error", () => fetchTracking());
    socket.on("error", () => {});
    socket.on("location_update", (data) => {
      console.log(`📍 [AsyncOrderMap] location_update received:`, data);
      if (data.orderId !== order.id) return;
      const lat = parseFloat(data.latitude),
        lng = parseFloat(data.longitude);
      console.log(`📍 [AsyncOrderMap] Parsed location:`, lat, lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setCurrentDriverLocation({
        latitude: lat,
        longitude: lng,
        timestamp: data.timestamp,
        heading: data.heading,
        speedKmh: data.speedKmh,
        accuracyMeters: data.accuracyMeters,
      });
      console.log(
        `📍 [AsyncOrderMap] Updated currentDriverLocation:`,
        lat,
        lng,
      );
      updateTelemetry(lat, lng, nextWaypoint);
    });

    return () => {
      try {
        socket.emit("leave_order", order.id);
      } catch {}
      socket.disconnect();
      socketRef.current = null;
    };
  }, [shouldFetch, order.id, fetchTracking, updateTelemetry, nextWaypoint]);

  useEffect(() => {
    if (!shouldFetch) return;
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollRef.current = setInterval(() => {
      const s = socketRef.current;
      if (!s || s.disconnected) fetchTracking();
    }, 15000);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [shouldFetch, fetchTracking]);

  // Fetch two-leg route for drivers: driver→waypoint and waypoint→dropoff
  // Debounce to prevent excessive API calls when coordinates change frequently
  useEffect(() => {
    if (!shouldFetch) return;
    if (nextWaypoint?.polyline) return;

    const fetchRoutes = async () => {
      const driverLoc = driverLocation || currentDriverLocation;
      if (!driverLoc) return;

      const driverLat = driverLoc.latitude || driverLoc.lat;
      const driverLng = driverLoc.longitude || driverLoc.lng;
      if (!Number.isFinite(driverLat) || !Number.isFinite(driverLng)) return;

      // Get pickup and dropoff coordinates
      const pickupLat = pickupPoint?.lat;
      const pickupLng = pickupPoint?.lng;
      const dropoffLat = dropoffPoint?.lat;
      const dropoffLng = dropoffPoint?.lng;

      if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) return;

      // Round coordinates to 4 decimals to improve cache hit rate (~11m precision)
      const rounded = {
        driver: {
          lat: Math.round(driverLat * 10000) / 10000,
          lng: Math.round(driverLng * 10000) / 10000,
        },
        pickup: {
          lat: Math.round(pickupLat * 10000) / 10000,
          lng: Math.round(pickupLng * 10000) / 10000,
        },
        dropoff:
          dropoffLat && dropoffLng
            ? {
                lat: Math.round(dropoffLat * 10000) / 10000,
                lng: Math.round(dropoffLng * 10000) / 10000,
              }
            : null,
      };

      // Skip if same coordinates as last fetch (prevent unnecessary API calls)
      const leg1Key = `${rounded.driver.lat},${rounded.driver.lng}:${rounded.pickup.lat},${rounded.pickup.lng}`;
      if (
        routeCacheRef.current.leg1 === leg1Key &&
        routeCacheRef.current.leg2
      ) {
        return;
      }
      routeCacheRef.current.leg1 = leg1Key;

      setRouteLoading(true);
      try {
        // Leg 1: Driver → Pickup (waypoint)
        const leg1Response = await MapsApi.calculateRoute({
          pickup: { lat: driverLat, lng: driverLng },
          delivery: { lat: pickupLat, lng: pickupLng },
        });

        if (leg1Response.polyline) {
          const path = polyline.decode(leg1Response.polyline);
          setDriverToPickupPath(path);
        }

        // Leg 2: Pickup → Dropoff (always fetch, regardless of status)
        if (Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng)) {
          const leg2Key = `${rounded.pickup.lat},${rounded.pickup.lng}:${rounded.dropoff.lat},${rounded.dropoff.lng}`;
          if (routeCacheRef.current.leg2 === leg2Key) {
            return;
          }
          routeCacheRef.current.leg2 = leg2Key;

          const leg2Response = await MapsApi.calculateRoute({
            pickup: { lat: pickupLat, lng: pickupLng },
            delivery: { lat: dropoffLat, lng: dropoffLng },
          });

          if (leg2Response.polyline) {
            const path = polyline.decode(leg2Response.polyline);
            setPickupToDropoffPath(path);
          }
        }
      } catch (err) {
        console.warn(
          "[AsyncOrderMap] Route fetch failed:",
          err?.message || err,
        );
      } finally {
        setRouteLoading(false);
      }
    };

    // Debounce: wait 1 second before fetching to avoid rapid re-renders
    const timer = setTimeout(fetchRoutes, 1000);
    return () => {
      clearTimeout(timer);
    };
  }, [
    shouldFetch,
    driverLocation,
    currentDriverLocation,
    nextWaypoint,
    pickupPoint,
    dropoffPoint,
  ]);

  const isRouteLoading = loading || routeLoading;

  console.log(
    `🎯 [AsyncOrderMap] Rendering: order=${order.id}, status=${order.status}, shouldFetch=${shouldFetch}, canView=${canView}, currentDriverLocation=`,
    currentDriverLocation,
    "driverLocation prop=",
    driverLocation,
  );

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 5,
          left: 5,
          zIndex: 2000,
          background: "rgba(0,0,0,0.8)",
          color: "#00FF00",
          padding: "4px 8px",
          fontSize: "10px",
          fontFamily: "monospace",
        }}
      >
        Order: {order?.id}
        <br />
        Status: {order?.status}
        <br />
        Fetch: {shouldFetch ? "YES" : "NO"}
        <br />
        Loc:{" "}
        {currentDriverLocation || driverLocation
          ? `${(currentDriverLocation || driverLocation).latitude?.toFixed(4)},${(currentDriverLocation || driverLocation).longitude?.toFixed(4)}`
          : "NONE"}
      </div>
      {isRouteLoading && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            background: "rgba(0,0,0,0.7)",
            color: "#00FF00",
            padding: "4px 8px",
            borderRadius: 4,
            fontSize: "0.75rem",
            fontFamily: "monospace",
            pointerEvents: "none",
          }}
        >
          ⚡ Loading route...
        </div>
      )}
      <RoutePreviewMap
        pickup={pickupPoint}
        dropoff={dropoffPoint}
        driverLocation={driverLocation || currentDriverLocation}
        routeInfo={{
          polyline: order.routePolyline,
          distance_km: order.estimatedDistanceKm,
          route_found: !!order.routePolyline,
          osrm_used: !!order.routePolyline,
          actualRoutePolyline: actualRoute,
        }}
        driverToPickupPath={driverToPickupPath}
        pickupToDropoffPath={pickupToDropoffPath}
        compact={true}
        mapTitle={`Order #${order.orderNumber || order.id}`}
        theme={theme}
        {...props}
      />
    </div>
  );
};

export default AsyncOrderMap;
