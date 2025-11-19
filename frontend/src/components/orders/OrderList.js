import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import OrderCard from './OrderCard';

const OrderList = ({
  orders,
  currentUser,
  driverState,
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

  const displayOrders = currentUser?.role === 'driver' && driverState
    ? driverState.getFilteredDriverOrders()
    : orders;

  if (displayOrders.length === 0) {
    return (
      <div className="order-card" style={{
        textAlign: 'center',
        padding: '3rem'
      }}>
        <p style={{
          fontSize: '3rem',
          marginBottom: '0.5rem'
        }}>📦</p>
        <p style={{
          color: 'var(--matrix-bright-green)',
          fontFamily: 'Consolas, Monaco, Courier New, monospace',
          textShadow: 'var(--shadow-glow)',
          fontSize: '1.25rem'
        }}>
          {currentUser?.role === 'customer'
            ? t('orders.noOrdersAvailable')
            : driverState
              ? driverState.getDriverViewTitle().includes('Active')
                ? 'No active orders'
                : driverState.getDriverViewTitle().includes('Available')
                  ? 'No available bids in your area'
                  : 'No order history'
              : t('orders.noAvailableBids')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {displayOrders.map((order) => (
        <OrderCard
          key={order._id}
          order={order}
          currentUser={currentUser}
          onViewTracking={onViewTracking}
          onBid={onBid}
          onAcceptBid={onAcceptBid}
          onUpdateStatus={onUpdateStatus}
          onViewReviews={onViewReviews}
          onOpenReviewModal={onOpenReviewModal}
          bidInput={bidInput}
          setBidInput={setBidInput}
          bidDetails={bidDetails}
          setBidDetails={setBidDetails}
          loadingStates={loadingStates}
        />
      ))}
    </div>
  );
};

export default OrderList;
