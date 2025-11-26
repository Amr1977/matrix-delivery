import React, { useState, useEffect, useRef, useCallback } from 'react';
import RoutePreviewMap from './RoutePreviewMap';
import api from '../api';
import polyline from '@mapbox/polyline';

/**
 * AsyncOrderMap
 * Wraps RoutePreviewMap to asynchronously fetch actual driver route for active orders.
 * Only fetches data when the component is visible (lazy loading).
 */
const AsyncOrderMap = ({ order, currentUser, driverLocation, theme = 'dark', ...props }) => {
    const [actualRoute, setActualRoute] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [biddingRoute, setBiddingRoute] = useState(null);
    const containerRef = useRef(null);

    const isActiveOrder = ['picked_up', 'in_transit', 'delivered'].includes(order.status);
    const shouldFetch = isActiveOrder && (
        currentUser?.role === 'admin' ||
        (currentUser?.role === 'customer' && order.customerId === currentUser?.id) ||
        (currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser?.id)
    );

    // Check if we need to calculate bidding route (driver to pickup to dropoff)
    const isBiddingView = currentUser?.role === 'driver' && driverLocation &&
        Number.isFinite(driverLocation.latitude) && Number.isFinite(driverLocation.longitude);

    useEffect(() => {
        if (!shouldFetch || hasFetched) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fetchRouteHistory();
                observer.disconnect();
            }
        }, { threshold: 0.1 });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [shouldFetch, hasFetched, order._id]);

    // Calculate bidding route when driver location is available
    // Use a ref to track the last calculated location to prevent excessive recalculations
    const lastCalculatedLocation = useRef(null);

    useEffect(() => {
        if (!isBiddingView || loadingRoute) return;

        // Only recalculate if we don't have a route yet or the location has changed significantly
        const shouldCalculate = !biddingRoute || !lastCalculatedLocation.current ||
            Math.abs((driverLocation?.latitude || 0) - (lastCalculatedLocation.current.lat || 0)) > 0.001 ||
            Math.abs((driverLocation?.longitude || 0) - (lastCalculatedLocation.current.lng || 0)) > 0.001;

        if (shouldCalculate && driverLocation?.latitude && driverLocation?.longitude) {
            lastCalculatedLocation.current = {
                lat: driverLocation.latitude,
                lng: driverLocation.longitude
            };
            calculateBiddingRoute();
        }
    }, [isBiddingView, driverLocation?.latitude, driverLocation?.longitude, order.from?.lat, order.from?.lng, order.to?.lat, order.to?.lng]);

    // Calculate bidding route (driver -> pickup -> dropoff) using OSRM
    const calculateBiddingRoute = async () => {
        if (!isBiddingView || !order.from || !order.to || loadingRoute) {
            console.log('⚠️ Skipping bidding route calculation:', { isBiddingView, hasFrom: !!order.from, hasTo: !!order.to, loading: loadingRoute });
            return;
        }

        try {
            setLoadingRoute(true);
            console.log('🚗 Calculating OSRM bidding route for order:', order.orderNumber);

            const driverPos = {
                lat: driverLocation.latitude,
                lng: driverLocation.longitude
            };
            const pickupPos = {
                lat: order.from.lat,
                lng: order.from.lng
            };
            const dropoffPos = {
                lat: order.to.lat,
                lng: order.to.lng
            };

            // Calculate route from driver to pickup
            const driverToPickupResponse = await api.post('/locations/calculate-route', {
                pickup: driverPos,
                delivery: pickupPos
            });

            // Calculate route from pickup to dropoff
            const pickupToDropoffResponse = await api.post('/locations/calculate-route', {
                pickup: pickupPos,
                delivery: dropoffPos
            });

            let driverToPickupDistance = calculateDistance(driverPos, pickupPos);
            let driverToPickupDuration = (driverToPickupDistance / 35) * 60; // Estimate based on 35 km/h
            let pickupToDropoffDistance = calculateDistance(pickupPos, dropoffPos);
            let pickupToDropoffDuration = (pickupToDropoffDistance / 35) * 60;

            let combinedPolyline = null;
            let decodedPath = [];

            // Use OSRM data if available
            if (driverToPickupResponse?.routePolyline && pickupToDropoffResponse?.routePolyline) {
                // Both routes have OSRM polylines - combine them
                driverToPickupDistance = driverToPickupResponse.distance_km || driverToPickupDistance;
                driverToPickupDuration = driverToPickupResponse.duration_minutes || driverToPickupDuration;
                pickupToDropoffDistance = pickupToDropoffResponse.distance_km || pickupToDropoffDistance;
                pickupToDropoffDuration = pickupToDropoffResponse.duration_minutes || pickupToDropoffDuration;

                try {
                    const driverToPickupPath = polyline.decode(driverToPickupResponse.routePolyline);
                    const pickupToDropoffPath = polyline.decode(pickupToDropoffResponse.routePolyline);
                    decodedPath = [...driverToPickupPath, ...pickupToDropoffPath];
                    combinedPolyline = `${driverToPickupResponse.routePolyline}${pickupToDropoffResponse.routePolyline}`;
                    console.log(`✅ Combined OSRM routes: ${decodedPath.length} points`);
                } catch (decodeError) {
                    console.warn('Failed to combine OSRM polylines:', decodeError);
                    decodedPath = [[driverPos.lat, driverPos.lng], [pickupPos.lat, pickupPos.lng], [dropoffPos.lat, dropoffPos.lng]];
                }
            } else {
                // Fallback to straight lines if OSRM is not available
                console.log('⚠️ OSRM routes not available, using straight lines');
                decodedPath = [[driverPos.lat, driverPos.lng], [pickupPos.lat, pickupPos.lng], [dropoffPos.lat, dropoffPos.lng]];
            }

            const totalDistance = driverToPickupDistance + pickupToDropoffDistance;
            const totalDuration = driverToPickupDuration + pickupToDropoffDuration;

            setBiddingRoute({
                polyline: combinedPolyline,
                decodedPath: decodedPath,
                distance_km: totalDistance.toFixed(1),
                duration_minutes: Math.ceil(totalDuration),
                driverToPickupDistance: driverToPickupDistance.toFixed(1),
                pickupToDropoffDistance: pickupToDropoffDistance.toFixed(1),
                driverToPickupTime: Math.ceil(driverToPickupDuration),
                pickupToDropoffTime: Math.ceil(pickupToDropoffDuration),
                routeFound: !!combinedPolyline
            });

            console.log('✅ Bidding route calculated:', {
                totalDistance: totalDistance.toFixed(1) + 'km',
                totalTime: Math.ceil(totalDuration) + 'min',
                driverToPickup: `${driverToPickupDistance.toFixed(1)}km, ${Math.ceil(driverToPickupDuration)}min`,
                pickupToDropoff: `${pickupToDropoffDistance.toFixed(1)}km, ${Math.ceil(pickupToDropoffDuration)}min`,
                hasOSRM: !!combinedPolyline
            });
        } catch (error) {
            console.warn('Failed to calculate bidding route:', error);
            // Fallback to basic straight line
            const straightLine = [
                [driverLocation.latitude, driverLocation.longitude],
                [order.from.lat, order.from.lng],
                [order.to.lat, order.to.lng]
            ];
            setBiddingRoute({
                polyline: null,
                decodedPath: straightLine,
                distance_km: calculateDistance(
                    { lat: driverLocation.latitude, lng: driverLocation.longitude },
                    { lat: order.from.lat, lng: order.from.lng }
                ) + calculateDistance(
                    { lat: order.from.lat, lng: order.from.lng },
                    { lat: order.to.lat, lng: order.to.lng }
                ).toFixed(1),
                duration_minutes: 'Unknown',
                driverToPickupDistance: calculateDistance(
                    { lat: driverLocation.latitude, lng: driverLocation.longitude },
                    { lat: order.from.lat, lng: order.from.lng }
                ).toFixed(1),
                pickupToDropoffDistance: calculateDistance(
                    { lat: order.from.lat, lng: order.from.lng },
                    { lat: order.to.lat, lng: order.to.lng }
                ).toFixed(1)
            });
        } finally {
            setLoadingRoute(false);
        }
    };

    // Haversine distance calculation
    const calculateDistance = (point1, point2) => {
        const R = 6371; // Earth's radius in km
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLng = (point2.lng - point1.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

    const fetchRouteHistory = async () => {
        try {
            setLoadingRoute(true);
            // Use the tracking endpoint which returns location history
            const response = await api.get(`/orders/${order._id}/tracking`);

            if (response && response.locationHistory && Array.isArray(response.locationHistory)) {
                // Convert history to [[lat, lng], ...] array
                // Sort by timestamp ascending to draw correct path
                const history = response.locationHistory
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map(loc => [loc.lat, loc.lng]);

                if (history.length > 0) {
                    setActualRoute(history);
                    window.console.log(`📍 [AsyncOrderMap] Fetched ${history.length} points for order ${order.orderNumber}`);
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch route history for order ${order.orderNumber}:`, error);
        } finally {
            setLoadingRoute(false);
            setHasFetched(true);
        }
    };

    return (
        <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
            {loadingRoute && (
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#00FF00',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    pointerEvents: 'none'
                }}>
                    ⚡ Loading route...
                </div>
            )}

            <RoutePreviewMap
                pickup={order.from}
                dropoff={order.to}
                driverLocation={driverLocation}
                routeInfo={biddingRoute ? {
                    polyline: biddingRoute.polyline,
                    distance_km: biddingRoute.distance_km,
                    duration_minutes: biddingRoute.duration_minutes,
                    route_found: !!biddingRoute.polyline,
                    osrm_used: !!biddingRoute.polyline,
                    actualRoutePolyline: actualRoute,
                    biddingRoute: biddingRoute.decodedPath,
                    isBiddingRoute: true,
                    driverToPickupDistance: biddingRoute.driverToPickupDistance,
                    pickupToDropoffDistance: biddingRoute.pickupToDropoffDistance,
                    driverToPickupTime: biddingRoute.driverToPickupTime,
                    pickupToDropoffTime: biddingRoute.pickupToDropoffTime
                } : {
                    polyline: order.routePolyline,
                    distance_km: order.estimatedDistanceKm,
                    route_found: !!order.routePolyline,
                    osrm_used: !!order.routePolyline,
                    actualRoutePolyline: actualRoute // Pass the fetched actual route
                }}
                compact={true}
                mapTitle={`Order #${order.orderNumber || order._id}${isBiddingView ? ' (Bidding)' : ''}`}
                theme={theme}
                {...props}
            />
        </div>
    );
};

export default AsyncOrderMap;
