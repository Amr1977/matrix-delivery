import React, { useState, useEffect, useRef } from 'react';
import RoutePreviewMap from './RoutePreviewMap';
import api from '../api';

/**
 * AsyncOrderMap
 * Wraps RoutePreviewMap to asynchronously fetch actual driver route for active orders.
 * Only fetches data when the component is visible (lazy loading).
 */
const AsyncOrderMap = ({ order, currentUser, theme = 'dark', ...props }) => {
    const [actualRoute, setActualRoute] = useState(null);
    const [loadingRoute, setLoadingRoute] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const containerRef = useRef(null);

    const isActiveOrder = ['picked_up', 'in_transit', 'delivered'].includes(order.status);
    const shouldFetch = isActiveOrder && (
        currentUser?.role === 'admin' ||
        (currentUser?.role === 'customer' && order.customerId === currentUser?.id) ||
        (currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser?.id)
    );

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
                routeInfo={{
                    polyline: order.routePolyline,
                    distance_km: order.estimatedDistanceKm,
                    route_found: !!order.routePolyline,
                    osrm_used: !!order.routePolyline,
                    actualRoutePolyline: actualRoute // Pass the fetched actual route
                }}
                compact={true}
                mapTitle={`Order #${order.orderNumber || order._id}`}
                theme={theme}
                {...props}
            />
        </div>
    );
};

export default AsyncOrderMap;
