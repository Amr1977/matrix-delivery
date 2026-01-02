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
    handleConfirmDelivery,
    openReviewModal,
}) => {
    const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

    return (
        <>
            {/* Customer View: Display Bids (pending_bids) */}
            {order.status === 'pending_bids' && currentUser?.primary_role === 'customer' && order.bids && order.bids.length > 0 && (
                <div style={{ borderTop: '2px solid var(--matrix-border)', paddingTop: 'var(--spacing-lg)', marginTop: 'var(--spacing-md)' }}>
                    <h4 className="text-matrix" style={{ fontSize: '1rem', fontWeight: '600', marginBottom: 'var(--spacing-md)', textShadow: 'var(--shadow-glow)' }}>
                        {t('driver.driverBids')} ({order.bids.length})
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {order.bids.map((bid, index) => {
                            // Helper function to get avatar
                            const getDriverAvatar = () => {
                                const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
                                if (bid.driverProfilePicture) {
                                    // Handle relative paths (e.g. /uploads/...)
                                    if (bid.driverProfilePicture.startsWith('/')) {
                                        return `${API_URL.replace('/api', '')}${bid.driverProfilePicture}`;
                                    }
                                    return bid.driverProfilePicture;
                                }
                                return bid.driverGender === 'female'
                                    ? '/assets/avatars/female_avatar_matrix.png'
                                    : '/assets/avatars/male_avatar_matrix.png';
                            };

                            // Format member since date
                            const memberSince = bid.driverMemberSince
                                ? new Date(bid.driverMemberSince).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                                : 'N/A';

                            return (
                                <div
                                    key={index}
                                    className="card"
                                    style={{
                                        padding: 'var(--spacing-lg)',
                                        marginBottom: 0,
                                        position: 'relative'
                                    }}
                                >
                                    {/* Profile Section */}
                                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)', alignItems: 'start' }}>
                                        {/* Avatar with Verification Frame and Rating */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderRadius: '50%',
                                                    border: bid.driverIsVerified
                                                        ? '3px solid var(--status-delivered)'
                                                        : '3px solid var(--status-cancelled)',
                                                    boxShadow: bid.driverIsVerified
                                                        ? '0 0 20px var(--status-delivered)'
                                                        : '0 0 20px var(--status-cancelled)',
                                                    padding: '3px',
                                                    background: 'var(--matrix-black)',
                                                    overflow: 'hidden'
                                                }}>
                                                    <img
                                                        src={getDriverAvatar()}
                                                        alt={bid.driverName}
                                                        style={{
                                                            width: '100%',
                                                            height: '100%',
                                                            borderRadius: '50%',
                                                            objectFit: 'cover'
                                                        }}
                                                    />
                                                </div>
                                                {/* Verification Badge */}
                                                {bid.driverIsVerified ? (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-5px',
                                                        right: '-5px',
                                                        background: 'var(--status-delivered)',
                                                        color: 'var(--matrix-black)',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.625rem',
                                                        fontWeight: '700',
                                                        boxShadow: '0 0 10px var(--status-delivered)',
                                                        border: '1px solid var(--matrix-black)'
                                                    }}>
                                                        ✓ Verified
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: '-5px',
                                                        right: '-5px',
                                                        background: 'var(--status-cancelled)',
                                                        color: 'white',
                                                        padding: '2px 6px',
                                                        borderRadius: '10px',
                                                        fontSize: '0.625rem',
                                                        fontWeight: '700',
                                                        boxShadow: '0 0 10px var(--status-cancelled)',
                                                        border: '1px solid var(--matrix-black)'
                                                    }}>
                                                        Unverified
                                                    </div>
                                                )}
                                            </div>

                                            {/* Rating Stars Below Avatar */}
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span className="text-matrix" style={{ fontSize: '1rem', fontWeight: '700' }}>
                                                    {renderStars(bid.driverRating || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Driver Info */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <h5 className="text-matrix" style={{
                                                fontSize: '1.125rem',
                                                fontWeight: '700',
                                                marginBottom: '0.25rem',
                                                textShadow: 'var(--shadow-glow)'
                                            }}>
                                                {bid.driverName}
                                            </h5>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--matrix-green)',
                                                marginBottom: '0.25rem'
                                            }}>
                                                Member since {memberSince}
                                            </p>
                                            <p style={{
                                                fontSize: '0.75rem',
                                                color: 'var(--matrix-green)',
                                                marginBottom: '0.5rem'
                                            }}>
                                                Overall Rating: <span className="text-matrix" style={{ fontWeight: '700' }}>{(bid.driverRating || 0).toFixed(1)}</span>
                                            </p>

                                            {/* Stats Grid - Reviews and Deliveries Only */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(2, 1fr)',
                                                gap: 'var(--spacing-sm)',
                                                marginBottom: 'var(--spacing-sm)'
                                            }}>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="text-matrix" style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                                                        {bid.driverReviewCount || 0}
                                                    </div>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--matrix-green)' }}>Reviews</div>
                                                </div>
                                                <div style={{ textAlign: 'center' }}>
                                                    <div className="text-matrix" style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                                                        {bid.driverCompletedDeliveries || 0}
                                                    </div>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--matrix-green)' }}>Deliveries</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bid Price */}
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <div className="text-matrix" style={{
                                                fontSize: '1.5rem',
                                                fontWeight: '700',
                                                textShadow: '0 0 15px var(--status-pending)'
                                            }}>
                                                ${parseFloat(bid.bidPrice).toFixed(2)}
                                            </div>
                                            <div style={{ fontSize: '0.625rem', color: 'var(--matrix-green)' }}>Bid Price</div>
                                        </div>
                                    </div>

                                    {/* Estimated Times */}
                                    {(bid.estimatedPickupTime || bid.estimatedDeliveryTime) && (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                            gap: 'var(--spacing-sm)',
                                            marginBottom: 'var(--spacing-md)',
                                            padding: 'var(--spacing-sm)',
                                            background: 'rgba(0, 255, 0, 0.05)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--matrix-border)'
                                        }}>
                                            {bid.estimatedPickupTime && (
                                                <div>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--matrix-green)', marginBottom: '0.25rem' }}>
                                                        Pickup
                                                    </div>
                                                    <div className="text-matrix" style={{ fontSize: '0.75rem' }}>
                                                        {new Date(bid.estimatedPickupTime).toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                            {bid.estimatedDeliveryTime && (
                                                <div>
                                                    <div style={{ fontSize: '0.625rem', color: 'var(--matrix-green)', marginBottom: '0.25rem' }}>
                                                        Delivery
                                                    </div>
                                                    <div className="text-matrix" style={{ fontSize: '0.75rem' }}>
                                                        {new Date(bid.estimatedDeliveryTime).toLocaleString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Driver Message */}
                                    {bid.message && (
                                        <div style={{
                                            background: 'rgba(0, 255, 0, 0.05)',
                                            padding: 'var(--spacing-md)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid var(--matrix-border)',
                                            marginBottom: 'var(--spacing-md)'
                                        }}>
                                            <p className="text-matrix" style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>
                                                "{bid.message}"
                                            </p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="btn-group" style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => handleAcceptBid(order._id, bid.userId)}
                                            disabled={loadingStates.acceptBid}
                                            className="btn-success"
                                            style={{ flex: '1 1 auto', minWidth: '120px' }}
                                        >
                                            {loadingStates.acceptBid ? t('orders.acceptingBid') : t('orders.acceptBid')}
                                        </button>
                                        <button
                                            onClick={() => openReviewModal(order._id, 'view_driver_reviews', bid)}
                                            className="btn"
                                            style={{ flex: '0 1 auto' }}
                                        >
                                            📝 Customer Reviews ({bid.driverReviewCount || 0})
                                        </button>
                                        <button
                                            onClick={() => openReviewModal(order._id, 'view_driver_given_reviews', bid)}
                                            className="btn"
                                            style={{ flex: '0 1 auto' }}
                                        >
                                            ⭐ Driver Reviews ({bid.driverGivenReviewCount || 0})
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Customer View: Accepted Bid Info */}
            {order.status === 'accepted' && currentUser?.primary_role === 'customer' && order.bids && order.bids.length > 0 && (
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
            {order.status === 'accepted' && currentUser?.primary_role === 'driver' && isDriverAssigned && (
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
            {order.status === 'picked_up' && currentUser?.primary_role === 'driver' && isDriverAssigned && (
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
            {order.status === 'in_transit' && currentUser?.primary_role === 'driver' && isDriverAssigned && (
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
            {order.status === 'accepted' && currentUser?.primary_role === 'customer' && (
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

            {order.status === 'picked_up' && currentUser?.primary_role === 'customer' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#E0E7FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #C7D2FE' }}>
                        <p style={{ fontSize: '0.875rem', color: '#3730A3' }}>
                            {t('orders.packagePickedUp')}
                        </p>
                    </div>
                </div>
            )}

            {order.status === 'in_transit' && currentUser?.primary_role === 'customer' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    <div style={{ background: '#FCE7F3', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #F9A8D4' }}>
                        <p style={{ fontSize: '0.875rem', color: '#831843' }}>
                            {t('orders.packageInTransit')}
                        </p>
                    </div>
                </div>
            )}

            {order.status === 'delivered_pending' && (
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
                    {currentUser?.primary_role === 'customer' ? (
                        <>
                            <div style={{ background: '#DBEAFE', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #93C5FD', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.875rem', color: '#1E40AF' }}>
                                    <strong>Driver marked as delivered.</strong> Please confirm receiving the package.
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    onClick={() => handleConfirmDelivery(order._id)}
                                    // disabled={loadingStates.confirmDelivery} // Add this if you track it
                                    style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                                >
                                    ✅ {t('orders.confirmDelivery') || 'Confirm Delivery'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{ background: '#FEF3C7', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
                            <p style={{ fontSize: '0.875rem', color: '#92400E' }}>
                                ⏳ Waiting for customer confirmation...
                            </p>
                        </div>
                    )}
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
