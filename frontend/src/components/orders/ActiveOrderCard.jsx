import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AsyncOrderMap from '../AsyncOrderMap';
import OrderBiddingSection from './OrderBiddingSection';
import OrderStatusSection from './OrderStatusSection';
import DriverBiddingCard from './DriverBiddingCard';

/**
 * ActiveOrderCard Component
 * 
 * Displays a comprehensive order card with all order details, actions, and status-specific UI.
 * Extracted from App.js for better code organization and maintainability.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.order - Order data object
 * @param {Object} props.currentUser - Current logged-in user
 * @param {Object} props.driverLocation - Driver's current location
 * @param {Object} props.profileData - User profile data (theme, etc.)
 * @param {Function} props.t - Translation function
 * @param {Object} props.driverPricing - Driver pricing configuration
 * @param {Function} props.saveDriverPricing - Save driver pricing handler
 * @param {Object} props.bidInput - Bid input state
 * @param {Function} props.setBidInput - Set bid input state
 * @param {Object} props.bidDetails - Bid details state
 * @param {Function} props.setBidDetails - Set bid details state
 * @param {Object} props.loadingStates - Loading states for various actions
 * @param {Object} props.reviewStatus - Review status for the order
 * @param {Function} props.getStatusLabel - Get localized status label
 * @param {Function} props.renderStars - Render star rating component
 * @param {Function} props.computeBidSuggestions - Compute bid suggestions
 * @param {Function} props.handleDeleteOrder - Delete order handler
 * @param {Function} props.handleBidOnOrder - Place bid handler
 * @param {Function} props.handleModifyBid - Modify bid handler
 * @param {Function} props.handleWithdrawBid - Withdraw bid handler
 * @param {Function} props.handleAcceptBid - Accept bid handler
 * @param {Function} props.handlePickupOrder - Mark as picked up handler
 * @param {Function} props.handleInTransit - Mark as in transit handler
 * @param {Function} props.handleCompleteOrder - Mark as delivered handler
 * @param {Function} props.openReviewModal - Open review modal handler
 * @param {Function} props.fetchOrderReviews - Fetch order reviews handler
 */
const ActiveOrderCard = ({
    order,
    currentUser,
    driverLocation,
    profileData,
    t,
    driverPricing,
    saveDriverPricing,
    bidInput,
    setBidInput,
    bidDetails,
    setBidDetails,
    loadingStates,
    reviewStatus,
    getStatusLabel,
    renderStars,
    computeBidSuggestions,
    handleDeleteOrder,
    handleBidOnOrder,
    handleModifyBid,
    handleWithdrawBid,
    handleAcceptBid,
    handlePickupOrder,
    handleInTransit,
    handleCompleteOrder,
    handleConfirmDelivery,
    openReviewModal,
    fetchOrderReviews,
}) => {
    const navigate = useNavigate();
    const [telemetry, setTelemetry] = useState(null);
    const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

    // Determine if order is trackable (in progress)
    const isTrackable = ['accepted', 'picked_up', 'in_transit'].includes(order.status);

    // ---------------------------------------------------------------------------
    // NEW: Dedicated Driver Bidding Card View
    // ---------------------------------------------------------------------------
    if (order.status === 'pending_bids' && currentUser?.primary_role === 'driver') {
        return (
            <DriverBiddingCard
                order={order}
                currentUser={currentUser}
                driverLocation={driverLocation}
                onBid={handleBidOnOrder}
                bidInput={bidInput}
                setBidInput={setBidInput}
                bidDetails={bidDetails}
                setBidDetails={setBidDetails}
                loadingStates={loadingStates}
                openReviewModal={openReviewModal}
            />
        );
    }

    // Helper function to open Google Maps
    const openGoogleMaps = () => {
        const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
        const dropoff = order.dropoffLocation?.coordinates || (order.to ? { lat: order.to.lat, lng: order.to.lng } : null);
        const pickupStr = pickup ? `${pickup.lat},${pickup.lng}` : '';
        const dropoffStr = dropoff ? `${dropoff.lat},${dropoff.lng}` : '';
        const travelmode = driverPricing.vehicleType === 'walker' ? 'walking' : (driverPricing.vehicleType === 'bicycle' ? 'bicycling' : 'driving');
        // For drivers: origin=driver location, waypoint=pickup, destination=dropoff
        // For customers: origin=pickup, destination=dropoff (no driver location)
        let url;
        if (driverLocation && currentUser?.primary_role === 'driver') {
            const driverStr = `${driverLocation.latitude},${driverLocation.longitude}`;
            url = `https://www.google.com/maps/dir/?api=1&origin=${driverStr}&destination=${dropoffStr}&waypoints=${pickupStr}&travelmode=${travelmode}`;
        } else {
            url = `https://www.google.com/maps/dir/?api=1&origin=${pickupStr}&destination=${dropoffStr}&travelmode=${travelmode}`;
        }
        window.open(url, '_blank');
    };

    return (
        <div key={order.id} className="order-card">
            {/* Header: Title, Order Number, Status Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{order.title}</h3>
                    {order.orderNumber && (
                        <p style={{ fontSize: '0.875rem' }}>{t('activeOrder.orderNumber')} {order.orderNumber}</p>
                    )}
                </div>
                <span className={`status-badge status-${order.status}`}>
                    {getStatusLabel(order.status)}
                </span>
            </div>

            {/* Description */}
            {order.description && (
                <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>{order.description}</p>
            )}

            {/* Route Preview Map */}
            <div data-testid={'active-order-live-map-' + order.id} style={{ position: 'relative', height: '250px', marginBottom: '1rem', borderRadius: '0.5rem', overflow: 'hidden', border: '2px solid var(--matrix-border)', boxShadow: 'var(--shadow-matrix)' }}>

                <AsyncOrderMap
                    order={order}
                    currentUser={currentUser}
                    driverLocation={driverLocation}
                    theme={profileData?.theme || 'dark'}
                    onTelemetryUpdate={setTelemetry}
                />
                
                {/* Live Telemetry Overlay */}
                {isTrackable && telemetry && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        left: '10px',
                        right: '10px',
                        zIndex: 1000,
                        display: 'flex',
                        gap: '0.5rem',
                        pointerEvents: 'none'
                    }}>
                        <div className="telemetry-badge" style={{
                            flex: 1,
                            background: 'rgba(0, 17, 0, 0.85)',
                            border: '1px solid var(--matrix-border)',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.625rem', color: 'var(--matrix-green)', textTransform: 'uppercase' }}>
                                {t('activeOrder.to')} {telemetry.nextTarget}
                            </span>
                            <span className="text-matrix" style={{ fontSize: '1rem', fontWeight: 'bold', textShadow: 'var(--shadow-glow)' }}>
                                {telemetry.distanceKm} {t('activeOrder.km')}
                            </span>
                        </div>
                        
                        <div className="telemetry-badge" style={{
                            flex: 1,
                            background: 'rgba(0, 17, 0, 0.85)',
                            border: '1px solid var(--matrix-border)',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            backdropFilter: 'blur(4px)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}>
                            <span style={{ fontSize: '0.625rem', color: 'var(--matrix-green)', textTransform: 'uppercase' }}>{t('activeOrder.eta')}</span>
                            <span className="text-matrix" style={{ fontSize: '1rem', fontWeight: 'bold', textShadow: 'var(--shadow-glow)' }}>
                                {telemetry.etaMinutes} {t('activeOrder.min')}
                            </span>
                        </div>

                        {telemetry.speedKmh > 0 && (
                            <div className="telemetry-badge" style={{
                                flex: 1,
                                background: 'rgba(0, 17, 0, 0.85)',
                                border: '1px solid var(--matrix-border)',
                                padding: '0.5rem',
                                borderRadius: '0.375rem',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center'
                            }}>
                                <span style={{ fontSize: '0.625rem', color: 'var(--matrix-green)', textTransform: 'uppercase' }}>{t('activeOrder.speed')}</span>
                                <span className="text-matrix" style={{ fontSize: '1rem', fontWeight: 'bold', textShadow: 'var(--shadow-glow)' }}>
                                    {telemetry.speedKmh} {t('activeOrder.kmh')}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Live Indicator */}
                {isTrackable && (
                    <div style={{
                        position: 'absolute',
                        top: '10px',
                        left: '10px',
                        zIndex: 1000,
                        background: 'rgba(0, 17, 0, 0.85)',
                        border: '1px solid var(--matrix-border)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem'
                    }}>
                        <div className="pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00FF00' }}></div>
                        <span style={{ fontSize: '0.625rem', color: '#00FF00', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>{t('tracking.liveTracking')}</span>
                    </div>
                )}
            </div>

            {/* Order Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', padding: '1rem', background: '#F9FAFB', borderRadius: '0.375rem' }}>
                <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>ðŸ“¤ {t('activeOrder.pickup')}</p>
                    <p style={{ fontSize: '0.875rem' }}>{order.pickupAddress || order.from?.name}</p>
                    {order.pickupContactName && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#4B5563' }}>
                            <span role="img" aria-label="user">ðŸ‘¤</span> {order.pickupContactName}
                            {order.pickupContactPhone && <><br /><span role="img" aria-label="phone">ðŸ“ž</span> <a href={`tel:${order.pickupContactPhone}`} style={{ color: '#4F46E5', textDecoration: 'none' }}>{order.pickupContactPhone}</a></>}
                        </div>
                    )}
                </div>
                <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>ðŸ“¥ {t('activeOrder.delivery')}</p>
                    <p style={{ fontSize: '0.875rem' }}>{order.deliveryAddress || order.to?.name}</p>
                    {order.dropoffContactName && (
                        <div style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: '#4B5563' }}>
                            <span role="img" aria-label="user">ðŸ‘¤</span> {order.dropoffContactName}
                            {order.dropoffContactPhone && <><br /><span role="img" aria-label="phone">ðŸ“ž</span> <a href={`tel:${order.dropoffContactPhone}`} style={{ color: '#4F46E5', textDecoration: 'none' }}>{order.dropoffContactPhone}</a></>}
                        </div>
                    )}
                </div>
                {order.packageDescription && (
                    <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>ðŸ“¦ {t('activeOrder.package')}</p>
                        <p style={{ fontSize: '0.875rem' }}>{order.packageDescription}</p>
                    </div>
                )}
                {order.packageWeight && (
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>âš–ï¸ {t('activeOrder.weight')}</p>
                        <p style={{ fontSize: '0.875rem' }}>{order.packageWeight} kg</p>
                    </div>
                )}
                {order.estimatedValue && (
                    <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>ðŸ’° {t('activeOrder.value')}</p>
                        <p style={{ fontSize: '0.875rem' }}>${parseFloat(order.estimatedValue).toFixed(2)}</p>
                    </div>
                )}
                {order.specialInstructions && (
                    <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>ðŸ“ {t('activeOrder.instructions')}</p>
                        <p style={{ fontSize: '0.875rem' }}>{order.specialInstructions}</p>
                    </div>
                )}
            </div>

            {/* Price and Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4F46E5' }}>
                    ${parseFloat(order.price).toFixed(2)}
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Review Buttons (Delivered Orders) */}
                    {order.status === 'delivered' && (
                        <>
                            {currentUser?.primary_role === 'customer' && !reviewStatus?.reviews.toDriver && (
                                <button
                                    onClick={() => openReviewModal(order.id, 'customer_to_driver')}
                                    style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                                >
                                    â­ {t('activeOrder.reviewDriver')}
                                </button>
                            )}
                            {currentUser?.primary_role === 'driver' && order.assignedDriver?.userId === currentUser?.id && !reviewStatus?.reviews.toCustomer && (
                                <button
                                    onClick={() => openReviewModal(order.id, 'driver_to_customer')}
                                    style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                                >
                                    â­ {t('activeOrder.reviewCustomer')}
                                </button>
                            )}
                            {!reviewStatus?.reviews.toPlatform && (
                                <button
                                    onClick={() => openReviewModal(order.id, `${currentUser?.primary_role}_to_platform`)}
                                    style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                                >
                                    ðŸŒŸ {t('activeOrder.reviewPlatform')}
                                </button>
                            )}
                            <button
                                onClick={() => fetchOrderReviews(order.id)}
                                style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                            >
                                ðŸ“ {t('activeOrder.viewReviews')}
                            </button>
                        </>
                    )}

                    {/* Delete Order Button (Customer, Pending Bids) */}
                    {currentUser?.primary_role === 'customer' && order.status === 'pending_bids' && order.customerId === currentUser?.id && (
                        <button
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={loadingStates.deleteOrder}
                            style={{ padding: '0.5rem 1rem', background: '#EF4444', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.deleteOrder ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '600', opacity: loadingStates.deleteOrder ? 0.5 : 1 }}
                        >
                            ðŸ—‘ï¸ {t('activeOrder.deleteOrder')}
                        </button>
                    )}

                    {/* Google Maps Button */}
                    <button
                        onClick={openGoogleMaps}
                        style={{ padding: '0.5rem 1rem', background: '#0EA5E9', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                    >
                        ðŸ§­ {t('activeOrder.googleMaps')}
                    </button>

                    {/* Chat Button (Active Orders) */}
                    {(order.status === 'accepted' || order.status === 'picked_up' || order.status === 'in_transit') && (
                        <button
                            onClick={() => navigate(`/chat/${order.id}`)}
                            style={{ padding: '0.5rem 1rem', background: '#8B5CF6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                            title="Chat with driver/customer"
                        >
                            ðŸ’¬ {t('activeOrder.chat')}
                        </button>
                    )}
                </div>
            </div>

            {/* Driver Bidding Section */}
            <OrderBiddingSection
                order={order}
                currentUser={currentUser}
                driverLocation={driverLocation}
                t={t}
                driverPricing={driverPricing}
                saveDriverPricing={saveDriverPricing}
                bidInput={bidInput}
                setBidInput={setBidInput}
                bidDetails={bidDetails}
                setBidDetails={setBidDetails}
                loadingStates={loadingStates}
                renderStars={renderStars}
                computeBidSuggestions={computeBidSuggestions}
                handleBidOnOrder={handleBidOnOrder}
                handleModifyBid={handleModifyBid}
                handleWithdrawBid={handleWithdrawBid}
                openReviewModal={openReviewModal}
            />

            {/* Order Status Section */}
            <OrderStatusSection
                order={order}
                currentUser={currentUser}
                t={t}
                loadingStates={loadingStates}
                renderStars={renderStars}
                handleAcceptBid={handleAcceptBid}
                handlePickupOrder={handlePickupOrder}
                handleInTransit={handleInTransit}
                handleCompleteOrder={handleCompleteOrder}
                handleConfirmDelivery={handleConfirmDelivery}
                openReviewModal={openReviewModal}
            />
        </div>
    );
};

export default ActiveOrderCard;


