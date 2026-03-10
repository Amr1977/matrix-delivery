import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';
import RoutePreviewMap from './RoutePreviewMap';
import { MapsApi } from '../services/api';
import polyline from '@mapbox/polyline';
import io from 'socket.io-client';

/**
 * AsyncOrderMap
 * Wraps RoutePreviewMap to asynchronously fetch actual driver route for active orders.
 * Only fetches data when the component is visible (lazy loading).
 * Supports real-time tracking via Socket.IO.
 */
const AsyncOrderMap = ({ order, currentUser, driverLocation, theme = 'dark', onTelemetryUpdate, ...props }) => {
    const [actualRoute, setActualRoute] = useState(null);
    const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [biddingRoute, setBiddingRoute] = useState(null);
    
    const pollRef = useRef(null);`r`n    const socketRef = useRef(null);`r`n    const containerRef = useRef(null);

    const fetchLatestLocation = useCallback(async () => {
        try {
            const details = await api.get(`/orders/${order.id}/tracking`);
            const loc = details?.currentLocation;
            if (loc && Number.isFinite(parseFloat(loc.lat)) && Number.isFinite(parseFloat(loc.lng))) {
                setCurrentDriverLocation({
                    latitude: parseFloat(loc.lat),
                    longitude: parseFloat(loc.lng),
                    timestamp: loc.timestamp,
                    heading: loc.heading,
                    speedKmh: loc.speedKmh,
                    accuracyMeters: loc.accuracyMeters
                });
            }
            if (Array.isArray(details?.locationHistory) && details.locationHistory.length > 0) {
                const path = details.locationHistory.map(p => [parseFloat(p.lat), parseFloat(p.lng)]);
                setActualRoute(path);
            }
        } catch (err) {
            console.warn('[AsyncOrderMap] tracking fallback failed', err?.message || err);
        }
    }, [order.id]);

    const isActiveOrder = ['accepted', 'picked_up', 'in_transit'].includes(order.status);
    const shouldFetch = isActiveOrder && (
        currentUser?.primary_role === 'admin' ||
        (currentUser?.primary_role === 'customer' && order.customerId === currentUser?.id) ||
        (currentUser?.primary_role === 'driver' && order.assignedDriver?.userId === currentUser?.id)
    );

    // Initialize Socket.IO for real-time tracking
    useEffect(() => {
        if (!shouldFetch || !order.id) return;

        const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api').replace('/api', '');
        const socket = io(apiUrl, {
            withCredentials: true,
            transports: ['websocket'],
            reconnection: true
        });

        socketRef.current = socket;
        socket.on('connect', () => { console.log(\uD83D\uDCE1 [AsyncOrderMap] Socket connected, joining order room: ); socket.emit('join_order', { orderId: order.id }); });
        socket.on('connect_error', (err) => { console.warn('[AsyncOrderMap] socket connect_error', err?.message || err); fetchLatestLocation(); });
        socket.on('error', (err) => { console.warn('[AsyncOrderMap] socket error', err?.message || err); });
        socket.on('connect_error', (err) => { console.warn('[AsyncOrderMap] socket connect_error', err?.message || err); fetchLatestLocation(); });
        socket.on('error', (err) => { console.warn('[AsyncOrderMap] socket error', err?.message || err); });
        });

        socket.on('location_update', (data) => {
            if (data.orderId === order.id) {
                console.log(`ðŸ“¡ [AsyncOrderMap] Real-time update for order ${order.id}`);
                
                const newLocation = {
                    latitude: data.latitude,
                    longitude: data.longitude,
                    timestamp: data.timestamp,
                    heading: data.heading,
                    speedKmh: data.speedKmh,
                    accuracyMeters: data.accuracyMeters
                };

                setCurrentDriverLocation(newLocation);

                // Update route history
                setActualRoute(prev => {
                    const newPoint = [data.latitude, data.longitude];
                    if (!prev) return [newPoint];
                    
                    const lastPoint = prev[prev.length - 1];
                    if (lastPoint[0] === newPoint[0] && lastPoint[1] === newPoint[1]) return prev;
                    
                    return [...prev, newPoint];
                });

                // Trigger map bounds update when live location moves
                setHasFetched(false); 

                // Calculate telemetry if we have pickup/delivery
                if (onTelemetryUpdate) {
                    const nextTarget = order.status === 'accepted' ? order.from : order.to;
                    if (nextTarget && nextTarget.lat && nextTarget.lng) {
                        const distanceKm = calculateDistance(
                            { lat: data.latitude, lng: data.longitude },
                            { lat: nextTarget.lat, lng: nextTarget.lng }
                        );
                        
                        // Assume average speed of 30 km/h for ETA if current speed is too low
                        const speed = data.speedKmh > 5 ? data.speedKmh : 30;
                        const etaMinutes = Math.ceil((distanceKm / speed) * 60);

                        onTelemetryUpdate({
                            distanceKm: distanceKm.toFixed(1),
                            etaMinutes,
                            speedKmh: data.speedKmh ? data.speedKmh.toFixed(0) : '0',
                            lastUpdated: data.timestamp,
                            nextTarget: order.status === 'accepted' ? 'pickup' : 'delivery'
                        });
                    }
                }
            }
        });

        return () => {
            if (socketRef.current) {
                console.log(`ðŸ“¡ [AsyncOrderMap] Leaving order room: ${order.id}`);
                socketRef.current.emit('leave_order', order.id);
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
    }, [shouldFetch, order.id, order.status, onTelemetryUpdate]);

    // Check if we need to calculate bidding route (driver to pickup to dropoff)
    const isBiddingView = currentUser?.primary_role === 'driver' && driverLocation &&
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
    }, [shouldFetch, hasFetched, order.id]);

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
            console.log('âš ï¸ Skipping bidding route calculation:', { isBiddingView, hasFrom: !!order.from, hasTo: !!order.to, loading: loadingRoute });
            return;
        }

        try {
            setLoadingRoute(true);
            console.log('ðŸš— Calculating OSRM bidding route for order:', order.orderNumber);

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
            const driverToPickupResponse = await MapsApi.calculateRoute({
                pickup: driverPos,
                delivery: pickupPos
            });

            // Calculate route from pickup to dropoff
            const pickupToDropoffResponse = await MapsApi.calculateRoute({
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
            if (driverToPickupResponse?.polyline && pickupToDropoffResponse?.polyline) {
                // Both routes have OSRM polylines - combine them
                driverToPickupDistance = driverToPickupResponse.distance_km || driverToPickupDistance;
                driverToPickupDuration = driverToPickupResponse.estimates?.car?.duration_minutes || driverToPickupDuration;
                pickupToDropoffDistance = pickupToDropoffResponse.distance_km || pickupToDropoffDistance;
                pickupToDropoffDuration = pickupToDropoffResponse.estimates?.car?.duration_minutes || pickupToDropoffDuration;

                try {
                    const driverToPickupPath = polyline.decode(driverToPickupResponse.polyline);
                    const pickupToDropoffPath = polyline.decode(pickupToDropoffResponse.polyline);
                    decodedPath = [...driverToPickupPath, ...pickupToDropoffPath];
                    combinedPolyline = `${driverToPickupResponse.polyline}${pickupToDropoffResponse.polyline}`;
                    console.log(`âœ… Combined OSRM routes: ${decodedPath.length} points`);
                } catch (decodeError) {
                    console.warn('Failed to combine OSRM polylines:', decodeError);
                    decodedPath = [[driverPos.lat, driverPos.lng], [pickupPos.lat, pickupPos.lng], [dropoffPos.lat, dropoffPos.lng]];
                }
            } else {
                // Fallback to straight lines if OSRM is not available
                console.log('âš ï¸ OSRM routes not available, using straight lines');
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

            console.log('âœ… Bidding route calculated:', {
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
            const response = await api.get(`/orders/${order.id}/tracking`);

            // Store current driver location if available
            if (response && response.currentLocation) {
                const currentLoc = {
                    latitude: response.currentLocation.lat,
                    longitude: response.currentLocation.lng,
                    timestamp: response.currentLocation.timestamp,
                    speedKmh: response.speedKmh,
                    heading: response.heading
                };
                setCurrentDriverLocation(currentLoc);

                // Initial telemetry update from history
                if (onTelemetryUpdate) {
                    const nextTarget = order.status === 'accepted' ? order.from : order.to;
                    if (nextTarget && nextTarget.lat && nextTarget.lng) {
                        const distanceKm = calculateDistance(
                            { lat: currentLoc.latitude, lng: currentLoc.longitude },
                            { lat: nextTarget.lat, lng: nextTarget.lng }
                        );
                        const speed = currentLoc.speedKmh > 5 ? currentLoc.speedKmh : 30;
                        const etaMinutes = Math.ceil((distanceKm / speed) * 60);

                        onTelemetryUpdate({
                            distanceKm: distanceKm.toFixed(1),
                            etaMinutes,
                            speedKmh: currentLoc.speedKmh ? currentLoc.speedKmh.toFixed(0) : '0',
                            lastUpdated: currentLoc.timestamp,
                            nextTarget: order.status === 'accepted' ? 'pickup' : 'delivery'
                        });
                    }
                }
            }

            if (response && response.locationHistory && Array.isArray(response.locationHistory)) {
                // Convert history to [[lat, lng], ...] array
                // Sort by timestamp ascending to draw correct path
                const history = response.locationHistory
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map(loc => [loc.lat, loc.lng]);

                if (history.length > 0) {
                    setActualRoute(history);
                    window.console.log(`ðŸ“ [AsyncOrderMap] Fetched ${history.length} points for order ${order.orderNumber}`);
                }
            }
        } catch (error) {
            console.warn(`Failed to fetch route history for order ${order.orderNumber}:`, error);
        } finally {
            setLoadingRoute(false);
            setHasFetched(true);
        }
    };

        useEffect(() => {
        if (!shouldFetch) return;
        fetchLatestLocation();
    }, [shouldFetch, fetchLatestLocation]);

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
                    âš¡ Loading route...
                </div>
            )}

            <RoutePreviewMap
                pickup={order.from}
                dropoff={order.to}
                driverLocation={driverLocation || currentDriverLocation}
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
                mapTitle={`Order #${order.orderNumber || order.id}${isBiddingView ? ' (Bidding)' : ''}`}
                theme={theme}
                {...props}
            />
        </div>
    );
};

export default AsyncOrderMap;



