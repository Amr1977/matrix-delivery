import React from 'react';

/**
 * OrderStatusSection Component
 * 
 * Displays status-specific UI elements including:
 * - Customer bids display (for pending_bids orders)
 * - Accepted bid information
 * - Driver action buttons (pickup, in transit, complete)
 * - Status messages for customers
 */
const OrderStatusSection = ({
    order,
    currentUser,
    t,
    loadingStates,
    renderStars,
    handleAcceptBid,
    handlePickupOrder,
    handleInTransit,
    handleCompleteOrder,
    openReviewModal,
}) => {
    const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

    return (
        <>
            {/* Customer View: Display Bids (pending_bids) */}
            {order.status === 'pending_bids' && currentUser?.role === 'customer' && order.bids && order.bids.length > 0 && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>
                        {t('driver.driverBids')} ({order.bids.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {order.bids.map((bid, index) => (
                            <div key={index} style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <p style={{ fontWeight: '600', color: '#1E40AF', marginBottom: '0.25rem' }}>{bid.driverName}</p>
                                        <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                            Bid: <span style={{ fontWeight: '600', color: '#1E40AF' }}>${parseFloat(bid.bidPrice).toFixed(2)}</span>
                                        </p>
                                        {bid.estimatedPickupTime && (
                                            <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                                                Pickup: {new Date(bid.estimatedPickupTime).toLocaleString()}
                                            </p>
                                        )}
                                        {bid.estimatedDeliveryTime && (
                                            <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                                                Delivery: {new Date(bid.estimatedDeliveryTime).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button
                                            onClick={() => handleAcceptBid(order._id, bid.userId)}
                                            disabled={loadingStates.acceptBid}
                                            style={{
                                                padding: '0.5rem 1rem',
                                                background: '#10B981',
                                                color: 'white',
                                                borderRadius: '0.375rem',
                                                border: 'none',
                                                cursor: loadingStates.acceptBid ? 'not-allowed' : 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: '600',
                                                opacity: loadingStates.acceptBid ? 0.5 : 1
                                            }}
                                        >
                                            {loadingStates.acceptBid ? t('orders.acceptingBid') : t('orders.acceptBid')}
                                        </button>
                                    </div>
                                </div>

                                {/* Driver Reputation */}
                                <div style={{ background: '#E0F2FE', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '0.75rem', border: '1px solid #BAE6FD' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <h5 style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0C4A6E' }}>
                                            👨‍🚗 Driver Reputation
                                        </h5>
                                        {bid.driverIsVerified && (
                                            <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.375rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                                                ✓ Verified
                                            </span>
                                        )}
                                        <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#1E293B' }}>
                                            {bid.driverReviewCount || 0}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => openReviewModal(order._id, 'view_driver_reviews', bid)}
                                        style={{ padding: '0.25rem 0.5rem', background: '#3B82F6', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: '500' }}
                                    >
                                        📝 Reviews ({bid.driverReviewCount || 0})
                                    </button>
                                    <button
                                        onClick={() => openReviewModal(order._id, 'view_driver_given_reviews', bid)}
                                        style={{ padding: '0.25rem 0.5rem', background: '#6366F1', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: '500' }}
                                    >
                                        ⭐ Given ({bid.driverGivenReviewCount || 0})
                                    </button>
                                </div>

                                {bid.message && (
                                    <div style={{ background: 'white', padding: '0.75rem', borderRadius: '0.25rem', marginTop: '0.5rem' }}>
                                        <p style={{ fontSize: '0.875rem', fontStyle: 'italic', color: '#374151' }}>
                                            "{bid.message}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Customer View: Accepted Bid Info */}
            {order.status === 'accepted' && currentUser?.role === 'customer' && order.bids && order.bids.length > 0 && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>{t('orders.acceptedBid')}</h4>
                    <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <p style={{ fontWeight: '600', color: '#1E40AF' }}>{order.assignedDriver?.name || 'Driver'}</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#1E40AF' }}>${order.acceptedBid?.bidPrice || order.price}</p>
                        </div>
                        {order.acceptedBid?.message && (
                            <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.5rem' }}>{order.acceptedBid.message}</p>
                        )}
                        {order.acceptedBid?.estimatedPickupTime && (
                            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                                Estimated pickup: {new Date(order.acceptedBid.estimatedPickupTime).toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Driver View: Pickup Button */}
            {order.status === 'accepted' && currentUser?.role === 'driver' && isDriverAssigned && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => handlePickupOrder(order._id)}
                            disabled={loadingStates.pickupOrder}
                            style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.pickupOrder ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.pickupOrder ? 0.5 : 1 }}
                        >
                            {loadingStates.pickupOrder ? t('orders.pickingUp') : t('orders.markAsPickedUp')}
                        </button>
                    </div>
                </div>
            )}

            {/* Driver View: In Transit Button */}
            {order.status === 'picked_up' && currentUser?.role === 'driver' && isDriverAssigned && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => handleInTransit(order._id)}
                            disabled={loadingStates.updateInTransit}
                            style={{ flex: 1, padding: '0.75rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.updateInTransit ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.updateInTransit ? 0.5 : 1 }}
                        >
                            {loadingStates.updateInTransit ? t('orders.updating') : t('orders.markAsInTransit')}
                        </button>
                    </div>
                </div>
            )}

            {/* Driver View: Complete Button */}
            {order.status === 'in_transit' && currentUser?.role === 'driver' && isDriverAssigned && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => handleCompleteOrder(order._id)}
                            disabled={loadingStates.completeOrder}
                            style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.completeOrder ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.completeOrder ? 0.5 : 1 }}
                        >
                            {loadingStates.completeOrder ? t('orders.completing') : t('orders.markAsDelivered')}
                        </button>
                    </div>
                </div>
            )}

            {/* Customer View: Status Messages */}
            {order.status === 'accepted' && currentUser?.role === 'customer' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#FEF3C7', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
                        <p style={{ fontSize: '0.875rem', color: '#92400E', marginBottom: '0.5rem' }}>
                            <strong>{t('orders.driver')}:</strong> {order.assignedDriver?.name || t('orders.assignedDriver')}
                        </p>
                        <p style={{ fontSize: '0.875rem', color: '#92400E' }}>
                            {t('orders.orderAccepted')}
                        </p>
                    </div>
                </div>
            )}

            {order.status === 'picked_up' && currentUser?.role === 'customer' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#E0E7FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #C7D2FE' }}>
                        <p style={{ fontSize: '0.875rem', color: '#3730A3' }}>
                            {t('orders.packagePickedUp')}
                        </p>
                    </div>
                </div>
            )}

            {order.status === 'in_transit' && currentUser?.role === 'customer' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#FCE7F3', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #F9A8D4' }}>
                        <p style={{ fontSize: '0.875rem', color: '#831843' }}>
                            {t('orders.packageInTransit')}
                        </p>
                    </div>
                </div>
            )}

            {order.status === 'delivered' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #A7F3D0' }}>
                        <p style={{ fontSize: '0.875rem', color: '#065F46' }}>
                            {t('orders.orderCompletedSuccessfully')}
                        </p>
                    </div>
                </div>
            )}

            {order.status === 'cancelled' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#FEE2E2', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FECACA' }}>
                        <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>
                            {t('orders.orderCancelled')}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
};

export default OrderStatusSection;
