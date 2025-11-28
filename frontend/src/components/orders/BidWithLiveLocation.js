import React from 'react';
import useDriverLocation from '../../hooks/useDriverLocation';
import RoutePreviewMap from '../RoutePreviewMap';

/**
 * Component to display a bid with live driver location
 */
const BidWithLiveLocation = ({ bid, order, compact = true }) => {
    // Track this driver's live location
    const { location: liveLocation, isLive } = useDriverLocation(bid.driver_id, true, false);

    // Use live location if available, otherwise fall back to bid location
    const driverLocation = liveLocation ? {
        latitude: liveLocation.latitude,
        longitude: liveLocation.longitude
    } : (bid.driverLocation && bid.driverLocation.lat) ? {
        latitude: bid.driverLocation.lat,
        longitude: bid.driverLocation.lng
    } : null;

    if (!driverLocation) {
        return null; // No location to display
    }

    return (
        <div style={{ height: '200px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden', position: 'relative' }}>
            {isLive && (
                <div style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: 'rgba(0, 255, 0, 0.9)',
                    color: '#000',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
                }}>
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#000',
                        animation: 'pulse 2s ease-in-out infinite'
                    }} />
                    LIVE
                </div>
            )}
            <RoutePreviewMap
                pickup={order.from}
                dropoff={order.to}
                driverLocation={driverLocation}
                routeInfo={{
                    polyline: order.routePolyline,
                    distance_km: order.estimatedDistanceKm
                }}
                compact={compact}
                mapTitle={`${isLive ? '🟢 ' : ''}Route for ${bid.driverName}`}
            />
        </div>
    );
};

export default BidWithLiveLocation;
