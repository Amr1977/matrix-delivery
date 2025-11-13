import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { formatCurrency, getStatusColor, getStatusLabel, formatDateTime } from '../../utils/formatters';

const OrderCard = ({
  order,
  currentUser,
  onViewTracking,
  onBid,
  onAcceptBid,
  onUpdateStatus,
  onViewReviews,
  onOpenReviewModal,
  bidInput,
  setBidInput,
  bidDetails,
  setBidDetails,
  loadingStates
}) => {
  const { t } = useI18n();

  const statusColor = getStatusColor(order.status);
  const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

  const handleBidSubmit = (e) => {
    e.preventDefault();
    if (bidInput[order._id]) {
      onBid(order._id, {
        bidPrice: bidInput[order._id],
        estimatedPickupTime: bidDetails[order._id]?.pickupTime,
        estimatedDeliveryTime: bidDetails[order._id]?.deliveryTime,
        message: bidDetails[order._id]?.message
      });
    }
  };

  return (
    <div key={order._id} className="order-card" style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{order.title}</h3>
          {order.orderNumber && (
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Order #{order.orderNumber}</p>
          )}
        </div>
        <span className={`status-badge status-${order.status}`}>
          {getStatusLabel(order.status, t)}
        </span>
      </div>

      {order.description && (
        <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '0.75rem' }}>{order.description}</p>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', padding: '1rem', background: '#F9FAFB', borderRadius: '0.375rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📤 Pickup</p>
          <p style={{ fontSize: '0.875rem' }}>{order.pickupAddress || order.from?.name}</p>
        </div>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📥 Delivery</p>
          <p style={{ fontSize: '0.875rem' }}>{order.deliveryAddress || order.to?.name}</p>
        </div>
        {order.packageDescription && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📦 Package</p>
            <p style={{ fontSize: '0.875rem' }}>{order.packageDescription}</p>
          </div>
        )}
        {order.packageWeight && (
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>⚖️ Weight</p>
            <p style={{ fontSize: '0.875rem' }}>{order.packageWeight} kg</p>
          </div>
        )}
        {order.estimatedValue && (
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>💰 Value</p>
            <p style={{ fontSize: '0.875rem' }}>{formatCurrency(order.estimatedValue)}</p>
          </div>
        )}
        {order.specialInstructions && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6B7280', marginBottom: '0.25rem' }}>📝 Instructions</p>
            <p style={{ fontSize: '0.875rem' }}>{order.specialInstructions}</p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4F46E5' }}>
          {formatCurrency(order.price)}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {order.status === 'delivered' && (
            <>
              {currentUser?.role === 'customer' && !order.reviewStatus?.reviews.toDriver && (
                <button
                  onClick={() => onOpenReviewModal(order._id, 'customer_to_driver')}
                  style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                >
                  ⭐ Review Driver
                </button>
              )}
              {currentUser?.role === 'driver' && order.assignedDriver?.userId === currentUser?.id && !order.reviewStatus?.reviews.toCustomer && (
                <button
                  onClick={() => onOpenReviewModal(order._id, 'driver_to_customer')}
                  style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                >
                  ⭐ Review Customer
                </button>
              )}
              {!order.reviewStatus?.reviews.toPlatform && (
                <button
                  onClick={() => onOpenReviewModal(order._id, `${currentUser?.role}_to_platform`)}
                  style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
                >
                  🌟 Review Platform
                </button>
              )}
              <button
                onClick={() => onViewReviews(order._id)}
                style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
              >
                📝 View Reviews
              </button>
            </>
          )}
          <button
            onClick={() => onViewTracking(order)}
            style={{ padding: '0.5rem 1rem', background: '#6366F1', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600' }}
          >
            🗺️ Track Order
          </button>
        </div>
      </div>

      {/* Driver bidding section */}
      {order.status === 'pending_bids' && currentUser?.role === 'driver' && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.875rem' }}>Place Your Bid</p>
          <form onSubmit={handleBidSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="number"
              placeholder="Bid Amount"
              value={bidInput[order._id] || ''}
              onChange={(e) => setBidInput({ ...bidInput, [order._id]: e.target.value })}
              style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
              step="0.01"
            />
            <input
              type="datetime-local"
              placeholder="Pickup Time"
              value={bidDetails[order._id]?.pickupTime || ''}
              onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], pickupTime: e.target.value } })}
              style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
            />
          </form>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              placeholder="Message (optional)"
              value={bidDetails[order._id]?.message || ''}
              onChange={(e) => setBidDetails({ ...bidDetails, [order._id]: { ...bidDetails[order._id], message: e.target.value } })}
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
            />
            <button
              type="submit"
              disabled={loadingStates.placeBid}
              style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
            >
              {loadingStates.placeBid ? 'Bidding...' : 'Place Bid'}
            </button>
          </div>
        </div>
      )}

      {/* Customer bid acceptance section */}
      {order.status === 'pending_bids' && currentUser?.role === 'customer' && order.bids && order.bids.length > 0 && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem' }}>Driver Bids ({order.bids.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {order.bids.map((bid, index) => (
              <div key={index} style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #DBEAFE' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#1E40AF', marginBottom: '0.25rem' }}>{bid.driverName}</p>
                    <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                      Bid: <span style={{ fontWeight: '600', color: '#1E40AF' }}>{formatCurrency(bid.bidPrice)}</span>
                    </p>
                    {bid.estimatedPickupTime && (
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.25rem' }}>
                        Pickup: {formatDateTime(bid.estimatedPickupTime)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => onAcceptBid(order._id, bid.userId)}
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
                      {loadingStates.acceptBid ? 'Accepting...' : 'Accept Bid'}
                    </button>
                  </div>
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

      {/* Status-specific action buttons */}
      {order.status === 'accepted' && currentUser?.role === 'customer' && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ background: '#FEF3C7', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FCD34D' }}>
            <p style={{ fontSize: '0.875rem', color: '#92400E', marginBottom: '0.5rem' }}>
              <strong>Driver:</strong> {order.assignedDriver?.name || 'Assigned Driver'}
            </p>
            <p style={{ fontSize: '0.875rem', color: '#92400E' }}>
              Order accepted and driver assigned.
            </p>
          </div>
        </div>
      )}

      {order.status === 'accepted' && currentUser?.role === 'driver' && isDriverAssigned && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onUpdateStatus(order._id, 'pickup')}
              disabled={loadingStates.pickupOrder}
              style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.pickupOrder ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.pickupOrder ? 0.5 : 1 }}
            >
              {loadingStates.pickupOrder ? 'Marking as picked up...' : 'Mark as Picked Up'}
            </button>
          </div>
        </div>
      )}

      {order.status === 'picked_up' && currentUser?.role === 'driver' && isDriverAssigned && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onUpdateStatus(order._id, 'in-transit')}
              disabled={loadingStates.updateInTransit}
              style={{ flex: 1, padding: '0.75rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.updateInTransit ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.updateInTransit ? 0.5 : 1 }}
            >
              {loadingStates.updateInTransit ? 'Updating...' : 'Mark as In Transit'}
            </button>
          </div>
        </div>
      )}

      {order.status === 'in_transit' && currentUser?.role === 'driver' && isDriverAssigned && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => onUpdateStatus(order._id, 'complete')}
              disabled={loadingStates.completeOrder}
              style={{ flex: 1, padding: '0.75rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.completeOrder ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.completeOrder ? 0.5 : 1 }}
            >
              {loadingStates.completeOrder ? 'Completing...' : 'Mark as Delivered'}
            </button>
          </div>
        </div>
      )}

      {/* Status messages */}
      {order.status === 'picked_up' && currentUser?.role === 'customer' && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ background: '#E0E7FF', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #C7D2FE' }}>
            <p style={{ fontSize: '0.875rem', color: '#3730A3' }}>
              Package has been picked up by the driver.
            </p>
          </div>
        </div>
      )}

      {order.status === 'in_transit' && currentUser?.role === 'customer' && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ background: '#FCE7F3', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #F9A8D4' }}>
            <p style={{ fontSize: '0.875rem', color: '#831843' }}>
              Package is in transit to the delivery address.
            </p>
          </div>
        </div>
      )}

      {order.status === 'delivered' && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ background: '#D1FAE5', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #A7F3D0' }}>
            <p style={{ fontSize: '0.875rem', color: '#065F46' }}>
              Order completed successfully!
            </p>
          </div>
        </div>
      )}

      {order.status === 'cancelled' && (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
          <div style={{ background: '#FEE2E2', padding: '1rem', borderRadius: '0.375rem', border: '1px solid #FECACA' }}>
            <p style={{ fontSize: '0.875rem', color: '#991B1B' }}>
              Order has been cancelled.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
