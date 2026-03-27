/**
 * Shared route calculation service.
 * Uses OSRM when available and falls back to estimated road distance/time.
 */

const ROUTE_CACHE_TTL_MS = 2 * 60 * 1000;
const routeCache = new Map();

function isValidCoordinate(coord) {
  return (
    coord &&
    Number.isFinite(Number(coord.lat)) &&
    Number.isFinite(Number(coord.lng)) &&
    Math.abs(Number(coord.lat)) <= 90 &&
    Math.abs(Number(coord.lng)) <= 180
  );
}

function toKey(pickup, delivery) {
  return `${Number(pickup.lat).toFixed(5)},${Number(pickup.lng).toFixed(5)}:${Number(delivery.lat).toFixed(5)},${Number(delivery.lng).toFixed(5)}`;
}

function calculateDistanceKm(a, b) {
  if (!isValidCoordinate(a) || !isValidCoordinate(b)) {
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
}

function estimateDurationMinutes(distanceKm, speedKmh = 25) {
  if (!Number.isFinite(Number(distanceKm)) || Number(distanceKm) <= 0) {
    return null;
  }
  return Math.max(1, Math.ceil((Number(distanceKm) / speedKmh) * 60));
}

async function calculateRoute(pickup, delivery) {
  if (!isValidCoordinate(pickup) || !isValidCoordinate(delivery)) {
    throw new Error("Invalid coordinates for route calculation");
  }

  const key = toKey(pickup, delivery);
  const now = Date.now();
  const cached = routeCache.get(key);
  if (cached && now - cached.cachedAt < ROUTE_CACHE_TTL_MS) {
    return cached.data;
  }

  const straightLineDistanceKm = calculateDistanceKm(pickup, delivery);
  let distanceKm =
    Number.isFinite(straightLineDistanceKm) && straightLineDistanceKm > 0
      ? straightLineDistanceKm
      : 0;
  let durationMinutes = estimateDurationMinutes(distanceKm, 25);
  let polyline = null;
  let routeFound = false;
  let osrmUsed = false;

  try {
    const osrmServer =
      process.env.OSRM_SERVER_URL || "http://router.project-osrm.org";
    const osrmUrl = `${osrmServer}/route/v1/driving/${Number(pickup.lng)},${Number(pickup.lat)};${Number(delivery.lng)},${Number(delivery.lat)}?overview=full&geometries=polyline`;

    const response = await fetch(osrmUrl, {
      headers: { "User-Agent": "Matrix-Delivery-App/1.0" },
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.code === "Ok" && Array.isArray(data.routes) && data.routes[0]) {
        const route = data.routes[0];
        const routeDistanceKm = Number(route.distance) / 1000;
        const routeDurationMinutes = Number(route.duration) / 60;

        if (Number.isFinite(routeDistanceKm) && routeDistanceKm > 0) {
          distanceKm = routeDistanceKm;
        }
        if (Number.isFinite(routeDurationMinutes) && routeDurationMinutes > 0) {
          durationMinutes = Math.max(1, Math.ceil(routeDurationMinutes));
        } else {
          durationMinutes = estimateDurationMinutes(distanceKm, 25);
        }

        polyline = route.geometry || null;
        routeFound = true;
        osrmUsed = true;
      }
    }
  } catch (error) {
    // Fallback estimate keeps the API responsive when OSRM is unavailable.
    const estimatedRoadDistanceKm = Number(distanceKm) * 1.3;
    if (Number.isFinite(estimatedRoadDistanceKm) && estimatedRoadDistanceKm > 0) {
      distanceKm = estimatedRoadDistanceKm;
    }
    durationMinutes = estimateDurationMinutes(distanceKm, 25);
  }

  const result = {
    distance_km: Number(distanceKm.toFixed(2)),
    straight_line_distance_km: Number(
      (straightLineDistanceKm || distanceKm).toFixed(2),
    ),
    duration_minutes: durationMinutes,
    estimates: {
      car: {
        duration_minutes: durationMinutes,
      },
    },
    polyline,
    route_found: routeFound,
    osrm_used: osrmUsed,
  };

  routeCache.set(key, { cachedAt: now, data: result });
  return result;
}

module.exports = {
  calculateRoute,
  calculateDistanceKm,
};

