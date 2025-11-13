import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import OrderCard from './OrderCard';

const OrderList = ({
  orders,
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

  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '0.5rem' }}>
        <p style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</p>
        <p style={{ color: '#6B7280' }}>
          {currentUser?.role === 'customer' ? t('orders.noOrdersAvailable') : t('orders.noAvailableBids')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {orders.map((order) => (
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
