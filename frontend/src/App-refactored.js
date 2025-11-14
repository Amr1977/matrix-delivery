import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from './i18n/i18nContext';
import LanguageSwitcher from './LanguageSwitcher';
import AdminPanel from './AdminPanel';
import ErrorBoundary from './ErrorBoundary';
import AuthScreen from './components/auth/AuthScreen';
import OrderCreationForm from './components/OrderCreationForm';
import OrderList from './components/orders/OrderList';
import LiveTrackingMap from './components/maps/LiveTrackingMap';
import NotificationPanel from './components/notifications/NotificationPanel';
import ReviewModal from './components/reviews/ReviewModal';
import useAuth from './hooks/useAuth';
import useNotifications from './hooks/useNotifications';
import useDriver from './hooks/useDriver';
import useOrders from './hooks/useOrders';
import { apiRequest } from './utils/api';
import { getAvailableCities, extractCityFromAddress } from './utils/formatters';
import logger from './logger';
import './Mobile.css';
import './MatrixTheme.css';

const DeliveryApp = () => {
  const { t, locale, direction, changeLocale } = useI18n();

  // Use custom hooks
  const auth = useAuth();
  const ordersHook = useOrders(auth.token);
  const notificationsHook = useNotifications(auth.token, auth.currentUser);
  const driver = useDriver(auth.token, auth.currentUser);

  // Countries and footer stats
  const [countries] = useState(['Egypt', 'Saudi Arabia', 'UAE', 'Jordan', 'Lebanon', 'Kuwait', 'Qatar', 'Bahrain', 'Oman', 'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'Yemen', 'Iraq', 'Syria', 'Palestine']);
  const [footerStats, setFooterStats] = useState(null);

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    userFetch: false,
    ordersFetch: false,
    notificationsFetch: false,
    createOrder: false,
    placeBid: false,
    acceptBid: false,
    pickupOrder: false,
    updateInTransit: false,
    completeOrder: false,
    submitReview: false,
    trackOrder: false
  });

  // UI state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showUserReviewsModal, setShowUserReviewsModal] = useState(false);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [reviewType, setReviewType] = useState('');
  const [userReviews, setUserReviews] = useState([]);
  const [userReviewsType, setUserReviewsType] = useState('');
  const [reviewStatus, setReviewStatus] = useState(null);
  const [orderReviews, setOrderReviews] = useState([]);

  // Bid state
  const [bidInput, setBidInput] = useState({});
  const [bidDetails, setBidDetails] = useState({});

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    professionalismRating: 0,
    communicationRating: 0,
    timelinessRating: 0,
    conditionRating: 0
  });

  // Mobile responsiveness
  const [mobileView, setMobileView] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize viewport meta tag
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="viewport"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'viewport';
      document.head.appendChild(metaTag);
    }
    metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }, []);

  // Mobile menu handler
  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMobileMenu]);

  // Footer stats fetch
  useEffect(() => {
    const fetchFooterStats = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://matrix-api.oldantique50.com/api'}/footer/stats`);
        if (response.ok) {
          const data = await response.json();
          setFooterStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch footer stats:', error);
      }
    };

    fetchFooterStats();
    const interval = setInterval(fetchFooterStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const setLoadingState = (key, value) => {
    setLoadingStates(prev => ({ ...prev, [key]: value }));
  };

  // Enhanced UX Helper Functions
  const showSuccess = (message) => {
    auth.setError && auth.setError('');
    // TODO: Implement success message display
  };

  // Order creation handler
  const handlePublishOrder = useCallback(async (orderData) => {
    setLoadingState('createOrder', true);
    try {
      await ordersHook.createOrder(orderData);
      setShowOrderForm(false);
      setTimeout(() => ordersHook.fetchOrders(), 500);
      showSuccess('Order published successfully! Waiting for drivers in your area.');
    } catch (err) {
      auth.setError && auth.setError(err.message);
    } finally {
      setLoadingState('createOrder', false);
    }
  }, [ordersHook, showSuccess]);

  // If not authenticated, show auth screen
  if (!auth.token) {
    return (
      <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
        </div>
        <AuthScreen
          authForm={auth.authForm}
          setAuthForm={auth.setAuthForm}
          authState={auth.authState}
          setAuthState={auth.setAuthState}
          handleLogin={auth.handleLogin}
          handleRegister={auth.handleRegister}
          error={auth.error}
          setError={auth.setError}
          loading={auth.loading}
          t={t}
        />
      </div>
    );
  }

  const unreadCount = notificationsHook.notifications.filter(n => !n.isRead).length;

  return (
    <div style={{ minHeight: '100vh', background: '#090909' }}>
      {/* Header */}
      <header className="glow">
        <div className="header-content">
          <div className="header-logo">
            <span className="pulse">📦</span>
            <h1>{t('common.appName')}</h1>
          </div>

          <div className="header-actions">
            <LanguageSwitcher locale={locale} changeLocale={changeLocale} />

            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`notification-bell ${unreadCount > 0 ? 'bell-notification' : ''}`}
            >
              🔔
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>

            {auth.currentUser?.role === 'admin' && (
              <button
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                style={{
                  background: showAdminPanel ? '#DC2626' : '#7C3AED',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                ⚙️ {showAdminPanel ? 'Close Admin' : 'Admin Panel'}
              </button>
            )}

            {auth.currentUser?.role === 'driver' && (
              <button
                onClick={driver.updateDriverLocation}
                disabled={typeof driver.locationPermission === 'string' && driver.locationPermission}
                style={{
                  background: driver.locationPermission === 'granted' ? '#10B981' : '#4F46E5',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: driver.locationPermission !== 'unknown' ? 'not-allowed' : 'pointer',
                  opacity: driver.locationPermission === 'granted' ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📍 {driver.locationPermission === 'granted' ? t('driver.locationUpdated') : t('driver.updateLocation')}
              </button>
            )}

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: 'var(--matrix-bright-green)' }}>{auth.currentUser?.name}</p>
                {auth.currentUser?.isVerified && (
                  <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                    ✓ Verified
                  </span>
                )}
                {!auth.currentUser?.isVerified && (
                  <button
                    onClick={() => window.open(`https://wa.me/${process.env.REACT_APP_WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(`Hello, I would like to verify my account. My user ID is: ${auth.currentUser?.id}`)}`, '_blank')}
                    style={{ background: '#25D366', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', border: 'none', cursor: 'pointer', fontSize: '0.625rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Contact admin to verify account"
                  >
                    📱 Verify
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)', textTransform: 'capitalize' }}>
                {auth.currentUser?.role} {auth.currentUser?.completedDeliveries > 0 && `• ${auth.currentUser.completedDeliveries} deliveries`}
              </p>
            </div>

            <button onClick={auth.logout} className="btn-danger">
              {t('auth.logout')}
            </button>
          </div>

          <button className={`hamburger-btn ${showMobileMenu ? 'open' : ''}`} onClick={() => setShowMobileMenu(!showMobileMenu)}>
            <span></span><span></span><span></span>
          </button>
        </div>

        {/* Desktop Notification Panel */}
        {showNotifications && (
          <NotificationPanel
            notifications={notificationsHook.notifications}
            onMarkAsRead={notificationsHook.markNotificationRead}
          />
        )}

        {/* Mobile Menu */}
        {showMobileMenu && (
          <nav className={`mobile-menu ${showMobileMenu ? 'open' : ''}`}>
            <div className="mobile-menu-items">
              <div className="mobile-menu-section">
                <div className="mobile-user-info">
                  <div className="mobile-user-name">
                    {auth.currentUser?.name}
                    {auth.currentUser?.isVerified && (
                      <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div className="mobile-user-role">
                    {auth.currentUser?.role}
                    {auth.currentUser?.completedDeliveries > 0 && ` • ${auth.currentUser.completedDeliveries} deliveries`}
                  </div>
                </div>
              </div>

              <div className="mobile-menu-section">
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--matrix-bright-green)', marginBottom: 'var(--spacing-sm)' }}>
                  Language
                </h4>
                <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
              </div>

              <div className="mobile-menu-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--matrix-bright-green)' }}>
                    Notifications
                  </h4>
                  {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                </div>
                {notificationsHook.notifications.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)' }}>No notifications</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {notificationsHook.notifications.slice(0, 5).map((notif) => (
                      <div key={notif.id} className={`notification-item ${!notif.isRead ? 'unread' : ''}`} style={{ padding: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                        <p style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--matrix-bright-green)' }}>{notif.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--matrix-green)' }}>{notif.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mobile-menu-section">
                <button onClick={() => { auth.logout(); setShowMobileMenu(false); }} className="btn-danger" style={{ width: '100%' }}>
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Driver controls */}
      {auth.currentUser?.role === 'driver' && (
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '1rem 1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {driver.locationPermission === 'granted' && driver.driverLocation.latitude ? (
                <span>📍 Lat: {driver.driverLocation.latitude.toFixed(4)}, Lng: {driver.driverLocation.longitude.toFixed(4)}</span>
              ) : driver.locationPermission === 'denied' ? (
                <span style={{ color: '#DC2626' }}>❌ Location access denied</span>
              ) : (
                <span>⚠️ Enable location for better order visibility</span>
              )}
            </div>
          </div>

          <div className="driver-tabs" style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
            <button
              onClick={() => driver.setViewType('active')}
              style={{
                padding: '0.5rem 1rem',
                background: driver.viewType === 'active' ? '#4F46E5' : '#F3F4F6',
                color: driver.viewType === 'active' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.375rem 0 0 0.375rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {t('driver.activeOrders')}
            </button>
            <button
              onClick={() => driver.setViewType('bidding')}
              style={{
                padding: '0.5rem 1rem',
                background: driver.viewType === 'bidding' ? '#4F46E5' : '#F3F4F6',
                color: driver.viewType === 'bidding' ? 'white' : '#374151',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {t('driver.availableBids')}
            </button>
            <button
              onClick={() => driver.setViewType('history')}
              style={{
                padding: '0.5rem 1rem',
                background: driver.viewType === 'history' ? '#4F46E5' : '#F3F4F6',
                color: driver.viewType === 'history' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0 0.375rem 0.375rem 0',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {t('driver.myHistory')}
            </button>
          </div>

          {driver.viewType === 'bidding' && (
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  Filter by City:
                </label>
                <select
                  value={driver.cityFilter}
                  onChange={(e) => driver.setCityFilter(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    background: 'white',
                    minWidth: '200px'
                  }}
                >
                  <option value="">All Cities</option>
                  {driver.getCitiesFromOrders().map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
                {driver.cityFilter && (
                  <button
                    onClick={() => driver.setCityFilter('')}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#6B7280',
                      color: 'white',
                      borderRadius: '0.375rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '2rem 1rem' }}>
        {auth.error && (
          <div className="error-matrix" style={{ padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {auth.error}</span>
            <button onClick={auth.setError} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#FF3030' }}>×</button>
          </div>
        )}

        {(auth.currentUser?.role === 'customer' || auth.currentUser?.role === 'admin') && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={loadingStates.createOrder}
              className="btn-primary"
            >
              📦 {showOrderForm ? t('common.cancel') : t('orders.createOrder')}
            </button>
          </div>
        )}

        {showOrderForm && (
          <OrderCreationForm
            onSubmit={handlePublishOrder}
            countries={countries}
            t={t}
          />
        )}

        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          {auth.currentUser?.role === 'customer' ? t('orders.myOrders') : driver.getDriverViewTitle()}
        </h2>

        <OrderList
          orders={ordersHook.orders}
          currentUser={auth.currentUser}
          driverState={driver}
          onViewTracking={(order) => {
            setSelectedOrder(order);
            setShowLiveTracking(true);
          }}
          onBid={async (orderId, bidData) => {
            setLoadingState('placeBid', true);
            try {
              await ordersHook.placeBid(orderId, bidData);
              setLoadingState('placeBid', false);
              showSuccess('Bid placed successfully!');
            } catch (err) {
              setLoadingState('placeBid', false);
              auth.setError && auth.setError(err.message);
            }
          }}
          onAcceptBid={async (orderId, userId) => {
            setLoadingState('acceptBid', true);
            try {
              await ordersHook.acceptBid(orderId, userId);
              setLoadingState('acceptBid', false);
              showSuccess('Bid accepted successfully! Driver notified.');
            } catch (err) {
              setLoadingState('acceptBid', false);
              auth.setError && auth.setError(err.message);
            }
          }}
          onUpdateStatus={async (orderId, action) => {
            setLoadingState('updateInTransit', true);
            try {
              await ordersHook.updateOrderStatus(orderId, action);
              setLoadingState('updateInTransit', false);
            } catch (err) {
              setLoadingState('updateInTransit', false);
              auth.setError && auth.setError(err.message);
            }
          }}
          onViewReviews={async (orderId) => {
            // Implementation for viewing reviews
          }}
          onOpenReviewModal={(orderId, reviewType) => {
            setSelectedOrder(orderId);
            setShowReviewModal(true);
          }}
          bidInput={bidInput}
          setBidInput={setBidInput}
          bidDetails={bidDetails}
          setBidDetails={setBidDetails}
          loadingStates={loadingStates}
        />
      </main>

      {/* Modals */}
      {showLiveTracking && selectedOrder && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Live Tracking</h2>
              <button onClick={() => setShowLiveTracking(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <LiveTrackingMap order={selectedOrder} token={token} />
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSubmit={async (reviewData) => {
            try {
              await apiRequest(`/orders/${selectedOrder}/review`, 'POST', reviewData);
              setShowReviewModal(false);
              setSuccessMessage('Review submitted successfully!');
              setTimeout(() => setSuccessMessage(''), 5000);
            } catch (err) {
              setError(err.message);
            }
          }}
          orderId={selectedOrder}
          reviewType="customer_to_driver"
          loading={loading}
        />
      )}

      {showAdminPanel && currentUser?.role === 'admin' && (
        <AdminPanel token={token} onClose={() => setShowAdminPanel(false)} />
      )}

      {/* Footer */}
      <footer style={{ padding: '1.5rem 1rem', fontSize: '0.75rem', color: '#6B7280', borderTop: '1px solid #E5E7EB', background: '#F9FAFB' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          {/* System Status Bar */}
          {footerStats && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: mobileView ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1rem',
              padding: '1rem',
              background: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>👥</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.usersByRole?.customer || 0} Customers
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.usersByRole?.driver || 0} Drivers
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>📦</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.activeOrders || 0} Active Orders
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.pendingOrders || 0} Pending Bids
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>💰</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  ${footerStats.totalRevenue?.toFixed(2) || '0.00'} Revenue
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  ⭐ {footerStats.avgRating || '0.0'} Rating
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🚚</div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.activeDrivers || 0} Active Drivers
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
                  {footerStats.todayOrders || 0} Orders Today
                </div>
              </div>
            </div>
          )}

          {/* Footer Links and Info */}
          <div style={{
            display: 'flex',
            flexDirection: mobileView ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: mobileView ? 'center' : 'center',
            gap: '1rem'
          }}>
            <div style={{ textAlign: mobileView ? 'center' : 'left' }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                Matrix Delivery v1.0.0
              </p>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.625rem' }}>
                Last deployment: {footerStats ? new Date(footerStats.deploymentTimestamp).toLocaleString() : 'Unknown'}
              </p>
            </div>

            <div style={{ textAlign: mobileView ? 'center' : 'right' }}>
              <p style={{ margin: 0, fontSize: '0.625rem' }}>
                Server uptime: {footerStats ? `${Math.floor(footerStats.serverUptime / 3600)}h ${Math.floor((footerStats.serverUptime % 3600) / 60)}m` : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AppWithErrorBoundary = () => (
  <ErrorBoundary>
    <DeliveryApp />
  </ErrorBoundary>
);

export default AppWithErrorBoundary;
