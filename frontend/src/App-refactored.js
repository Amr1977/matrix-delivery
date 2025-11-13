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
import useOrders from './hooks/useOrders';
import { apiRequest } from './utils/api';
import { getAvailableCities, extractCityFromAddress } from './utils/formatters';
import logger from './logger';
import './Mobile.css';
import './MatrixTheme.css';

const DeliveryApp = () => {
  const { t, locale, direction, changeLocale } = useI18n();

  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [currentUser, setCurrentUser] = useState(null);
  const [authState, setAuthState] = useState('login');

  // UI state
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showLiveTracking, setShowLiveTracking] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Data state
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  // Authentication effects
  useEffect(() => {
    if (token) {
      fetchCurrentUser();
      fetchNotifications();
      const interval = setInterval(() => {
        fetchOrders();
        fetchNotifications();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [token]);

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

  // API Functions
  const fetchCurrentUser = async () => {
    try {
      const response = await apiRequest('/auth/me');
      setCurrentUser(response);
      setError('');
      fetchOrders();
    } catch (err) {
      console.error('fetchCurrentUser error:', err);
      if (err.message.includes('401') || err.message.includes('403')) {
        logout();
      } else {
        setError('Connection issue: Failed to get user data');
      }
    }
  };

  const fetchOrders = async () => {
    try {
      const data = await apiRequest('/orders');
      setOrders(data);
    } catch (err) {
      console.error('fetchOrders error:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const data = await apiRequest('/notifications');
      setNotifications(data);
    } catch (err) {
      console.error('fetchNotifications error:', err);
    }
  };

  const handlePublishOrder = async (orderData) => {
    setLoading(true);
    try {
      await apiRequest('/orders', 'POST', orderData);
      setShowOrderForm(false);
      setTimeout(() => fetchOrders(), 500);
      setSuccessMessage('Order published successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setOrders([]);
    setNotifications([]);
    setAuthState('login');
    setError('');
  };

  // If not authenticated, show auth screen
  if (!token) {
    return (
      <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
          <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
        </div>
        <AuthScreen
          authState={authState}
          setAuthState={setAuthState}
          setToken={setToken}
          setCurrentUser={setCurrentUser}
          setError={setError}
          error={error}
          t={t}
        />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

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

            {currentUser?.role === 'admin' && (
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

            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <p style={{ fontWeight: '600', color: 'var(--matrix-bright-green)' }}>{currentUser?.name}</p>
                {currentUser?.isVerified && (
                  <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                    ✓ Verified
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)', textTransform: 'capitalize' }}>
                {currentUser?.role} {currentUser?.completedDeliveries > 0 && `• ${currentUser.completedDeliveries} deliveries`}
              </p>
            </div>

            <button onClick={logout} className="btn-danger">
              {t('auth.logout')}
            </button>
          </div>

          <button className={`hamburger-btn ${showMobileMenu ? 'open' : ''}`} onClick={toggleMobileMenu}>
            <span></span><span></span><span></span>
          </button>
        </div>

        {/* Desktop Notification Panel */}
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onMarkAsRead={(id) => {
              // Mark notification as read
              setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            }}
          />
        )}

        {/* Mobile Menu */}
        {showMobileMenu && (
          <nav className={`mobile-menu ${showMobileMenu ? 'open' : ''}`}>
            <div className="mobile-menu-items">
              <div className="mobile-menu-section">
                <div className="mobile-user-info">
                  <div className="mobile-user-name">
                    {currentUser?.name}
                    {currentUser?.isVerified && (
                      <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                        ✓ Verified
                      </span>
                    )}
                  </div>
                  <div className="mobile-user-role">
                    {currentUser?.role}
                    {currentUser?.completedDeliveries > 0 && ` • ${currentUser.completedDeliveries} deliveries`}
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
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: 'var(--matrix-green)' }}>No notifications</p>
                ) : (
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {notifications.slice(0, 5).map((notif) => (
                      <div key={notif.id} className={`notification-item ${!notif.isRead ? 'unread' : ''}`} style={{ padding: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                        <p style={{ fontWeight: '600', fontSize: '0.75rem', color: 'var(--matrix-bright-green)' }}>{notif.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--matrix-green)' }}>{notif.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mobile-menu-section">
                <button onClick={() => { logout(); setShowMobileMenu(false); }} className="btn-danger" style={{ width: '100%' }}>
                  {t('auth.logout')}
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: mobileView ? '1rem 0.5rem' : '2rem 1rem' }}>
        {error && (
          <div className="error-matrix" style={{ padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#FF3030' }}>×</button>
          </div>
        )}

        {successMessage && (
          <div className="success-message" style={{ background: 'linear-gradient(135deg, #003300 0%, #001100 100%)', color: '#30FF30', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #30FF30', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>✅ {successMessage}</span>
            <button onClick={() => setSuccessMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#30FF30' }}>×</button>
          </div>
        )}

        {currentUser?.role === 'customer' && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              disabled={loading}
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
          {currentUser?.role === 'customer' ? t('orders.myOrders') : t('orders.availableOrders')}
        </h2>

        <OrderList
          orders={orders}
          currentUser={currentUser}
          onViewTracking={(order) => {
            setSelectedOrder(order);
            setShowLiveTracking(true);
          }}
          onBid={async (orderId, bidData) => {
            try {
              await apiRequest(`/orders/${orderId}/bid`, 'POST', bidData);
              fetchOrders();
              setSuccessMessage('Bid placed successfully!');
              setTimeout(() => setSuccessMessage(''), 5000);
            } catch (err) {
              setError(err.message);
            }
          }}
          onAcceptBid={async (orderId, userId) => {
            try {
              await apiRequest(`/orders/${orderId}/accept-bid`, 'POST', { userId });
              fetchOrders();
              setSuccessMessage('Bid accepted successfully!');
              setTimeout(() => setSuccessMessage(''), 5000);
            } catch (err) {
              setError(err.message);
            }
          }}
          onUpdateStatus={async (orderId, action) => {
            try {
              const endpoints = {
                pickup: `/orders/${orderId}/pickup`,
                'in-transit': `/orders/${orderId}/in-transit`,
                complete: `/orders/${orderId}/complete`
              };
              await apiRequest(endpoints[action], 'POST');
              fetchOrders();
            } catch (err) {
              setError(err.message);
            }
          }}
          onViewReviews={async (orderId) => {
            // Implementation for viewing reviews
          }}
          onOpenReviewModal={(orderId, reviewType) => {
            setSelectedOrder(orderId);
            setShowReviewModal(true);
            // Additional review modal setup
          }}
          bidInput={{}}
          setBidInput={() => {}}
          bidDetails={{}}
          setBidDetails={() => {}}
          loadingStates={{}}
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
          <div style={{ display: 'flex', flexDirection: mobileView ? 'column' : 'row', justifyContent: 'space-between', alignItems: mobileView ? 'center' : 'center', gap: '1rem' }}>
            <div style={{ textAlign: mobileView ? 'center' : 'left' }}>
              <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                Matrix Delivery v1.0.0
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
