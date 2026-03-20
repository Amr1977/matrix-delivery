import React from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { formatCurrency, getStatusColor, getStatusLabel, formatDateTime } from '../../utils/formatters';
import DriverBiddingMap from '../maps/DriverBiddingMap';
import AsyncOrderMap from '../AsyncOrderMap';
import LiveTrackingMap from '../maps/LiveTrackingMap';
import useAuth from '../../hooks/useAuth';
import useBidsLocations from '../../hooks/useBidsLocations';
import BidWithLiveLocation from './BidWithLiveLocation';
import DriverBiddingCard from './DriverBiddingCard';

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
  loadingStates,
  onDeleteOrder,
  driverLocation: appDriverLocation // Accept driver location from App.js
}) => {
  const { t } = useI18n();
  const [showRouteMapFullscreen, setShowRouteMapFullscreen] = React.useState(false);
  const [highlightedBidId, setHighlightedBidId] = React.useState(null);
  const [isMapVisible, setIsMapVisible] = React.useState(false);
  const mapContainerRef = React.useRef(null);

  // Intersection Observer to detect map visibility
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsMapVisible(entry.isIntersecting);
      },
      { threshold: 0.1 } // 10% visibility is enough to trigger rapid updates
    );

    if (mapContainerRef.current) {
      observer.observe(mapContainerRef.current);
    }

    return () => {
      if (mapContainerRef.current) {
        observer.unobserve(mapContainerRef.current);
      }
    };
  }, []);

  // Fetch live locations for all drivers who bid on this order
  const { locations: bidLocations, loading: loadingLocations } = useBidsLocations(
    order.id, 
    order.status === 'pending_bids' && currentUser?.primary_role === 'customer' && order.bids?.length > 0,
    isMapVisible // Use rapid polling when map is in viewport
  );

  // Debug log for bid locations
  React.useEffect(() => {
    if (order.status === 'pending_bids' && currentUser?.primary_role === 'customer') {
      window.console.log(`ðŸ“¦ [Order ${order.id}] Bid Locations State:`, {
        loading: loadingLocations,
        locationsCount: bidLocations?.length || 0,
        bidsCount: order.bids?.length || 0,
        isMapVisible,
        bidLocationsData: bidLocations,
        orderBidsData: order.bids
      });
    }
  }, [order.id, bidLocations, loadingLocations, order.status, currentUser?.primary_role, order.bids, isMapVisible]);

  // Scroll to highlighted bid section when it changes from the map
  React.useEffect(() => {
    if (highlightedBidId) {
      const element = document.getElementById(`bid-section-${highlightedBidId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedBidId]);

  // Convert app-level driver location format for compatibility with maps
  // appDriverLocation comes from useDriver hook in App.js and has { latitude, longitude } format
  const driverLocation = appDriverLocation ? {
    lat: appDriverLocation.latitude,
    lng: appDriverLocation.longitude,
    userId: currentUser?.id
  } : null;


  // Always log order data to debug
  window.console.log('ðŸŽ¯ OrderCard Rendered:', {
    orderId: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    userRole: currentUser?.primary_role,
    hasRoutePolyline: !!order.routePolyline,
    polylineLength: order.routePolyline?.length || 0,
    estimatedDistanceKm: order.estimatedDistanceKm,
    willShowMap: order.status === 'pending_bids' && currentUser?.primary_role === 'customer'
  });

  const statusColor = getStatusColor(order.status);
  const isDriverAssigned = order.assignedDriver?.userId === currentUser?.id;

  const handleBidSubmit = (e) => {
    e.preventDefault();


    if (bidInput[order.id]) {
      // Refresh location before submitting
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            onBid(order.id, {
              bidPrice: bidInput[order.id],
              estimatedPickupTime: bidDetails[order.id]?.pickupTime,
              estimatedDeliveryTime: bidDetails[order.id]?.deliveryTime,
              message: bidDetails[order.id]?.message,
              location: location
            });
          },
          () => {
            // Fallback if location fails (submit without location)
            onBid(order.id, {
              bidPrice: bidInput[order.id],
              estimatedPickupTime: bidDetails[order.id]?.pickupTime,
              estimatedDeliveryTime: bidDetails[order.id]?.deliveryTime,
              message: bidDetails[order.id]?.message
            });
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      } else {
        onBid(order.id, {
          bidPrice: bidInput[order.id],
          estimatedPickupTime: bidDetails[order.id]?.pickupTime,
          estimatedDeliveryTime: bidDetails[order.id]?.deliveryTime,
          message: bidDetails[order.id]?.message
        });
      }
    }
  };

  const formatAddress = (address) => {
    if (!address) return 'Not specified';

    // If it's already a simple string without commas, return it
    if (!address.includes(',')) return address;

    // Parse comma-separated address
    const parts = address.split(',').map(p => p.trim()).filter(p => p);

    // Format: Show first part (person/building), then last 3 parts (area, city, country)
    if (parts.length >= 4) {
      const personOrBuilding = parts[0];
      const location = parts.slice(-3).join(', '); // area, city, country
      return `${personOrBuilding}, ${location}`;
    }

    // If less than 4 parts, just show last 3 or all available
    return parts.slice(-3).join(', ');
  };

  // ---------------------------------------------------------------------------
  // NEW: Dedicated Driver Bidding Card View
  // ---------------------------------------------------------------------------
  if (order.status === 'pending_bids' && currentUser?.primary_role === 'driver') {
    return (
      <DriverBiddingCard
        order={order}
        currentUser={currentUser}
        onBid={onBid}
        driverLocation={driverLocation}
        bidInput={bidInput}
        setBidInput={setBidInput}
        bidDetails={bidDetails}
        setBidDetails={setBidDetails}
        loadingStates={loadingStates}
      />
    );
  }

  return (
    <div className="order-card" style={{ border: '5px solid red' }} data-testid={`order-card-${order.id}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
        <div>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            marginBottom: '0.25rem',
            color: 'var(--matrix-bright-green)',
            textShadow: 'var(--shadow-glow)',
            fontFamily: 'Consolas, Monaco, Courier New, monospace'
          }}>
            {order.title}
          </h3>
          {order.orderNumber && (
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--matrix-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
            }}>
              {t('orders.orderNumberLabel')}{order.orderNumber}
            </p>
          )}
        </div>
        <span
          className={`status-badge status-${order.status}`}
          style={{
            background: `linear-gradient(135deg, ${statusColor}20, ${statusColor})`,
            color: 'white',
            padding: '0.375rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            fontFamily: 'Consolas, Monaco, Courier New, monospace',
            boxShadow: `0 0 10px ${statusColor}50`
          }}
        >
          {getStatusLabel(order.status, t)}
        </span>
      </div>

      {order.description && (
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--matrix-bright-green)',
          marginBottom: '0.75rem',
          fontFamily: 'Consolas, Monaco, Courier New, monospace',
          textShadow: '0 0 5px rgba(48, 255, 48, 0.5)'
        }}>
          {order.description}
        </p>
      )}

      {/* Route Preview Map for Customers */}
      {order.status === 'pending_bids' && currentUser?.primary_role === 'customer' && (
        <div style={{
          borderTop: '2px solid var(--matrix-border)',
          paddingTop: '1rem',
          marginBottom: '1rem',
          marginTop: '0.5rem'
        }}>
          {(() => {
            const debugInfo = {
              mapType: 'Customer Order Card - Pending Bids',
              orderId: order.id,
              orderNumber: order.orderNumber,
              hasRoutePolyline: !!order.routePolyline,
              polylineLength: order.routePolyline?.length || 0,
              polylinePreview: order.routePolyline?.substring(0, 50),
              estimatedDistanceKm: order.estimatedDistanceKm,
              hasFrom: !!order.from,
              hasTo: !!order.to,
              fromCoords: order.from,
              toCoords: order.to
            };
            // Force console.log to show
            window.console.log('ðŸ“¦ [CUSTOMER PENDING] OrderCard - Order data:', debugInfo);
            return null;
          })()}
          <RoutePreviewMap
            pickup={order.from}
            dropoff={order.to}
            routeInfo={{
              polyline: order.routePolyline,
              distance_km: order.estimatedDistanceKm,
              route_found: !!order.routePolyline,
              osrm_used: !!order.routePolyline
            }}
            bids={bidLocations && bidLocations.length > 0 ? bidLocations : (order.bids || [])}
            compact={true}
          />
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '0.5rem',
        marginBottom: '1rem',
        background: 'rgba(0, 17, 0, 0.3)',
        border: '2px solid var(--matrix-border)',
        borderRadius: '0.5rem',
        padding: '1rem',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{
            marginTop: '0.25rem',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            background: 'rgba(0, 255, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--matrix-bright-green)',
            fontSize: '0.875rem',
            boxShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
          }}>ðŸ“</div>
          <div>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--matrix-green)',
              marginBottom: '0.25rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Pickup</p>
            <p style={{
              color: 'var(--matrix-bright-green)',
              fontSize: '0.95rem',
              lineHeight: '1.4',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textShadow: '0 0 5px rgba(48, 255, 48, 0.5)'
            }}>{formatAddress(order.pickupAddress || order.from?.name)}</p>
          </div>
        </div>

        <div style={{
          marginLeft: '0.75rem',
          borderLeft: '2px dashed var(--matrix-border)',
          height: '1rem',
          opacity: 0.5
        }}></div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{
            marginTop: '0.25rem',
            width: '1.5rem',
            height: '1.5rem',
            borderRadius: '50%',
            background: 'rgba(0, 255, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--matrix-bright-green)',
            fontSize: '0.875rem',
            boxShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
          }}>ðŸŽ¯</div>
          <div>
            <p style={{
              fontSize: '0.75rem',
              color: 'var(--matrix-green)',
              marginBottom: '0.25rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>Delivery</p>
            <p style={{
              color: 'var(--matrix-bright-green)',
              fontSize: '0.95rem',
              lineHeight: '1.4',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textShadow: '0 0 5px rgba(48, 255, 48, 0.5)'
            }}>{formatAddress(order.deliveryAddress || order.to?.name)}</p>
          </div>
        </div>
      </div>

      {order.assignedDriver && (
        <div style={{
          marginBottom: '1rem',
          background: '#1F2937',
          borderRadius: '0.5rem',
          padding: '1rem',
          border: '1px solid #374151'
        }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#9CA3AF', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Assigned Driver</h4>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{
              width: '3rem',
              height: '3rem',
              borderRadius: '50%',
              background: '#374151',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              {order.assignedDriver.profilePicture ? (
                <img src={order.assignedDriver.profilePicture} alt="Driver" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                'ðŸ‘¤'
              )}
            </div>
            <div>
              <p style={{ color: '#F3F4F6', fontWeight: '600', fontSize: '1rem' }}>{order.assignedDriver.name || 'Unknown Driver'}</p>
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.875rem', color: '#9CA3AF', marginTop: '0.25rem' }}>
                <span>â­ {order.assignedDriver.rating?.toFixed(1) || 'New'}</span>
                <span>â€¢</span>
                <span>{order.assignedDriver.totalDeliveries || 0} deliveries</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.875rem' }}>
            {order.assignedDriver.vehicleDescription && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: '#9CA3AF', minWidth: '4.5rem' }}>Vehicle:</span>
                <span style={{ color: '#E5E7EB' }}>{order.assignedDriver.vehicleDescription}</span>
              </div>
            )}
            {/* Contact Info - Only show to customer if order is active */}
            {currentUser?.primary_role === 'customer' && ['accepted', 'picked_up', 'in_transit'].includes(order.status) && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <span style={{ color: '#9CA3AF', minWidth: '4.5rem' }}>Contact:</span>
                <a href={`tel:${order.assignedDriver.phone}`} style={{ color: '#60A5FA', textDecoration: 'none' }}>{order.assignedDriver.phone}</a>
              </div>
            )}

          </div>
        </div>
      )}
      <div className="details-grid" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(0, 17, 0, 0.3)', borderRadius: '0.5rem', border: '1px solid var(--matrix-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {order.packageDescription && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--matrix-bright-green)',
              marginBottom: '0.25rem',
              textShadow: 'var(--shadow-glow)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              ðŸ“¦ Package
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--matrix-bright-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              {order.packageDescription}
            </p>
          </div>
        )}
        {order.packageWeight && (
          <div>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--matrix-bright-green)',
              marginBottom: '0.25rem',
              textShadow: 'var(--shadow-glow)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              âš–ï¸ Weight
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--matrix-bright-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              {order.packageWeight} kg
            </p>
          </div>
        )}
        {order.estimatedValue && (
          <div>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--matrix-bright-green)',
              marginBottom: '0.25rem',
              textShadow: 'var(--shadow-glow)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              ðŸ’° Value
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--matrix-bright-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              {formatCurrency(order.estimatedValue)}
            </p>
          </div>
        )}
        {order.specialInstructions && (
          <div style={{ gridColumn: '1 / -1' }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--matrix-bright-green)',
              marginBottom: '0.25rem',
              textShadow: 'var(--shadow-glow)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              ðŸ“ Instructions
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--matrix-bright-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              {order.specialInstructions}
            </p>
          </div>
        )}
        {(order.require_upfront_payment || order.requireUpfrontPayment) && (
          <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.2)', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
            <p style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: '#EF4444',
              marginBottom: '0.25rem',
              fontFamily: 'Consolas, Monaco, Courier New, monospace'
            }}>
              âš ï¸ Upfront Payment Required
            </p>
            <p style={{
              fontSize: '0.875rem',
              color: '#FCA5A5',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              fontWeight: 'bold'
            }}>
              {formatCurrency(order.upfront_payment || order.upfrontPayment)}
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: 'var(--matrix-bright-green)',
          textShadow: 'var(--shadow-glow)',
          fontFamily: 'Consolas, Monaco, Courier New, monospace'
        }}>
          {formatCurrency(order.price)}
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {order.status === 'delivered' && (
            <>
              {currentUser?.primary_role === 'customer' && !order.reviewStatus?.reviews.toDriver && (
                <button
                  onClick={() => onOpenReviewModal(order.id, 'customer_to_driver')}
                  className="btn-success"
                  data-testid="review-driver-btn"
                  style={{ textShadow: '0 0 5px rgba(0, 0, 0, 0.5)' }}
                >
                  â­ {t('reviews.reviewDriver')}
                </button>
              )}
              {currentUser?.primary_role === 'driver' && order.assignedDriver?.userId === currentUser?.id && !order.reviewStatus?.reviews.toCustomer && (
                <button
                  onClick={() => onOpenReviewModal(order.id, 'driver_to_customer')}
                  className="btn-success"
                  data-testid="review-customer-btn"
                  style={{ textShadow: '0 0 5px rgba(0, 0, 0, 0.5)' }}
                >
                  â­ {t('reviews.reviewCustomer')}
                </button>
              )}
              {!order.reviewStatus?.reviews.toPlatform && (
                <button
                  onClick={() => onOpenReviewModal(order.id, `${currentUser?.primary_role}_to_platform`)}
                  data-testid="review-platform-btn"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #6366F1 100%)',
                    color: '#FFFFFF',
                    border: '2px solid #6366F1',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    minHeight: '44px',
                    padding: '0.5rem 1rem',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    boxShadow: '0 0 10px rgba(99, 102, 241, 0.5)',
                    textShadow: '0 0 5px rgba(139, 92, 246, 0.5)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.boxShadow = '0 0 15px rgba(99, 102, 241, 0.8)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.boxShadow = '0 0 10px rgba(99, 102, 241, 0.5)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  ðŸŒŸ Review Platform
                </button>
              )}
              <button
                onClick={() => onViewReviews(order.id)}
                className="btn-warning"
              >
                ðŸ“ View Reviews
              </button>
            </>
          )}

          {currentUser?.primary_role === 'customer' && order.status === 'pending_bids' && order.customerId === currentUser?.id && typeof onDeleteOrder === 'function' && (
            <button
              onClick={() => onDeleteOrder(order.id)}
              disabled={loadingStates?.deleteOrder}
              className="btn-danger"
              style={{ minHeight: '44px', textShadow: '0 0 5px rgba(0, 0, 0, 0.5)', opacity: loadingStates?.deleteOrder ? 0.5 : 1 }}
            >
              ðŸ—‘ï¸ Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Driver bidding section */}
      {
        order.status === 'pending_bids' && currentUser?.primary_role === 'driver' && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            {/* Customer Reputation Section */}
            {(order.customerRating || order.customerReviewCount) && (
              <div style={{
                background: 'rgba(0, 17, 0, 0.3)',
                border: '2px solid var(--matrix-border)',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem',
                opacity: '0.95'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <h4 style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: 'var(--matrix-bright-green)',
                    fontFamily: 'Consolas, Monaco, Courier New, monospace',
                    textShadow: 'var(--shadow-glow)'
                  }}>
                    ðŸ‘¤ Customer Reputation
                  </h4>
                  {order.customerIsVerified && (
                    <span style={{
                      background: 'linear-gradient(135deg, #00AA00 0%, #30FF30 50%, #00AA00 100%)',
                      color: '#000000',
                      padding: '0.125rem 0.5rem',
                      borderRadius: '9999px',
                      fontSize: '0.625rem',
                      fontWeight: '600',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace',
                      textShadow: '0 0 5px rgba(0, 0, 0, 0.5)',
                      boxShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
                    }}>
                      âœ“ Verified
                    </span>
                  )}
                  {!order.customerIsVerified && (
                    <button
                      onClick={() => window.open(`https://wa.me/${process.env.REACT_APP_WHATSAPP_ADMIN_NUMBER}?text=${encodeURIComponent(`Hello, I would like to verify my account for order ${order.orderNumber || order.id}. My user ID is: ${currentUser?.id}`)}`, '_blank')}
                      style={{
                        background: 'linear-gradient(135deg, #25D366 0%, #10B981 50%, #25D366 100%)',
                        color: '#FFFFFF',
                        border: '2px solid #25D366',
                        padding: '0.125rem 0.5rem',
                        borderRadius: '9999px',
                        cursor: 'pointer',
                        fontSize: '0.625rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace',
                        textShadow: '0 0 5px rgba(16, 185, 129, 0.5)',
                        boxShadow: '0 0 5px rgba(37, 211, 102, 0.5)'
                      }}
                      title="Contact admin to verify account"
                    >
                      ðŸ“± Verify
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--matrix-green)',
                      marginBottom: '0.25rem',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      Rating
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {renderStars(order.customerRating || 0)}
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'var(--matrix-bright-green)',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace'
                      }}>
                        {order.customerRating ? order.customerRating.toFixed(1) : 'New'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--matrix-green)',
                      marginBottom: '0.25rem',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      Deliveries
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--matrix-bright-green)',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      {order.customerCompletedOrders || 0}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--matrix-green)',
                      marginBottom: '0.25rem',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      Reviews
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'var(--matrix-bright-green)',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      {order.customerReviewCount || 0}
                    </p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{
                      fontSize: '0.75rem',
                      color: 'var(--matrix-green)',
                      marginBottom: '0.25rem',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      Member Since
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: 'var(--matrix-green)',
                      fontFamily: 'Consolas, Monaco, Courier New, monospace'
                    }}>
                      {order.customerJoinedAt ? new Date(order.customerJoinedAt).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {order.distance && (
              <div style={{
                marginBottom: '0.75rem',
                fontSize: '0.875rem',
                color: 'var(--matrix-green)',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                textShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
              }}>
                ðŸ“ Distance from pickup: {order.distance ? `${order.distance.toFixed(2)} km` : 'Unknown'}
              </div>
            )}

            {/* Route Preview Map */}
            <DriverBiddingMap
              order={order}
              driverLocation={driverLocation} // Pass the tracked driver location
              driverVehicleType={currentUser?.vehicle_type || 'car'}
              onToggleFullscreen={() => setShowRouteMapFullscreen(prev => !prev)}
              isFullscreen={showRouteMapFullscreen}
            />

            <p style={{
              fontWeight: '600',
              marginBottom: '0.75rem',
              marginTop: '1rem',
              fontSize: '0.875rem',
              color: 'var(--matrix-bright-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textShadow: 'var(--shadow-glow)'
            }}>
              Place Your Bid
            </p>
            <form onSubmit={handleBidSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                data-testid={`bid-amount-input-${order.id}`}
                type="number"
                placeholder="Bid Amount"
                value={bidInput[order.id] || ''}
                onChange={(e) => setBidInput({ ...bidInput, [order.id]: e.target.value })}
                className="form-control"
                style={{
                  padding: '0.5rem',
                  border: '2px solid var(--matrix-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: 'var(--matrix-bright-green)',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace'
                }}
                step="0.01"
              />
              <input
                type="datetime-local"
                placeholder="Pickup Time"
                value={bidDetails[order.id]?.pickupTime || ''}
                onChange={(e) => setBidDetails({ ...bidDetails, [order.id]: { ...bidDetails[order.id], pickupTime: e.target.value } })}
                style={{
                  padding: '0.5rem',
                  border: '2px solid var(--matrix-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: 'var(--matrix-bright-green)',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace'
                }}
              />
            </form>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                placeholder="Message (optional)"
                value={bidDetails[order.id]?.message || ''}
                onChange={(e) => setBidDetails({ ...bidDetails, [order.id]: { ...bidDetails[order.id], message: e.target.value } })}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '2px solid var(--matrix-border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0, 17, 0, 0.8)',
                  color: 'var(--matrix-bright-green)',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace'
                }}
              />
              <button
                data-testid={`place-bid-btn-${order.id}`}
                type="submit"
                disabled={loadingStates.placeBid}
                style={{
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 50%, #4F46E5 100%)',
                  color: '#FFFFFF',
                  border: '2px solid #4F46E5',
                  borderRadius: 'var(--radius-md)',
                  cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  boxShadow: '0 0 10px rgba(79, 70, 229, 0.5)',
                  textShadow: '0 0 5px rgba(139, 92, 246, 0.5)',
                  opacity: loadingStates.placeBid ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (!loadingStates.placeBid) {
                    e.target.style.boxShadow = '0 0 15px rgba(79, 70, 229, 0.8)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loadingStates.placeBid) {
                    e.target.style.boxShadow = '0 0 10px rgba(79, 70, 229, 0.5)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loadingStates.placeBid ? 'Bidding...' : 'Place Bid'}
              </button>
            </div>
          </div>
        )
      }

      {/* Route Preview Map for Customers */}
      {
        order.status === 'pending_bids' && currentUser?.primary_role === 'customer' && (
          <div 
            ref={mapContainerRef}
            style={{
              borderTop: '2px solid var(--matrix-border)',
              paddingTop: '1rem',
              marginTop: '0.5rem'
            }}
          >
            <RoutePreviewMap
              pickup={order.from || (order.pickupLocation && order.pickupLocation.coordinates)}
              dropoff={order.to || (order.dropoffLocation && order.dropoffLocation.coordinates)}
              // Pass all bid locations for the markers
              bids={bidLocations && bidLocations.length > 0 ? bidLocations : (order.bids || [])}
              selectedBidId={highlightedBidId}
              onBidSelect={(bidId) => setHighlightedBidId(bidId)}
              onBidAccept={(bidId) => onAcceptBid(order.id, bidId)}
              // Pass the first bid's location if available (or logic to select which driver to show)
              // For now, we don't show a specific driver on the main card map until a bid is selected or we iterate bids
              // But if we want to show the route for a specific bid, we'd need to pass that bid's location
              routeInfo={{
                polyline: order.routePolyline,
                distance_km: order.estimatedDistanceKm,
                route_found: !!order.routePolyline,
                osrm_used: !!order.routePolyline
              }}
              compact={true}
            />
          </div>
        )
      }

      {/* Customer bid acceptance section */}
      {
        order.status === 'pending_bids' && currentUser?.primary_role === 'customer' && order.bids && order.bids.length > 0 && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <h4 style={{
              fontSize: '0.875rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              color: 'var(--matrix-bright-green)',
              fontFamily: 'Consolas, Monaco, Courier New, monospace',
              textShadow: 'var(--shadow-glow)'
            }}>
              Driver Bids ({order.bids.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {order.bids.map((bid, index) => {
                const isHighlighted = highlightedBidId === (bid.userId || bid.driver_id);
                return (
                  <div 
                    key={index} 
                    id={`bid-section-${bid.userId || bid.driver_id}`}
                    style={{
                      background: isHighlighted ? 'rgba(79, 70, 229, 0.2)' : 'rgba(0, 17, 0, 0.3)',
                      border: isHighlighted ? '2px solid #4F46E5' : '2px solid var(--matrix-border)',
                      padding: '1rem',
                      borderRadius: '0.5rem',
                      opacity: '0.95',
                      transition: 'all 0.3s ease',
                      transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                      boxShadow: isHighlighted ? '0 0 15px rgba(79, 70, 229, 0.4)' : 'none'
                    }}
                    onMouseEnter={() => setHighlightedBidId(bid.userId || bid.driver_id)}
                    onMouseLeave={() => setHighlightedBidId(null)}
                  >
                    {/* Show live location map removed as we now have one main map with all markers */}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{
                        fontWeight: '600',
                        color: 'var(--matrix-bright-green)',
                        marginBottom: '0.25rem',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace',
                        textShadow: 'var(--shadow-glow)'
                      }}>
                        {bid.driverName}
                      </p>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--matrix-bright-green)',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace',
                        textShadow: '0 0 5px rgba(48, 255, 48, 0.5)'
                      }}>
                        Bid: <span style={{
                          fontWeight: '600',
                          color: 'var(--matrix-bright-green)',
                          textShadow: 'var(--shadow-glow)'
                        }}>
                          {formatCurrency(bid.bidPrice)}
                        </span>
                      </p>
                      {bid.estimatedPickupTime && (
                        <p style={{
                          fontSize: '0.75rem',
                          color: 'var(--matrix-green)',
                          marginTop: '0.25rem',
                          fontFamily: 'Consolas, Monaco, Courier New, monospace'
                        }}>
                          Pickup: {formatDateTime(bid.estimatedPickupTime)}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        data-testid={`accept-bid-btn-${order.id}-${bid.userId}`}
                        onClick={() => onAcceptBid(order.id, bid.userId)}
                        disabled={loadingStates.acceptBid}
                        className="btn-success"
                        style={{
                          opacity: loadingStates.acceptBid ? 0.5 : 1
                        }}
                        onMouseOver={(e) => {
                          if (!loadingStates.acceptBid) {
                            e.target.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.8)';
                            e.target.style.transform = 'translateY(-2px)';
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!loadingStates.acceptBid) {
                            e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
                            e.target.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        {loadingStates.acceptBid ? t('orders.acceptingBid') : t('orders.acceptBid')}
                      </button>
                    </div>
                  </div>
                  {bid.message && (
                    <div style={{
                      background: 'rgba(0, 17, 0, 0.8)',
                      border: '2px solid var(--matrix-border)',
                      padding: '0.75rem',
                      borderRadius: '0.25rem',
                      marginTop: '0.5rem'
                    }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontStyle: 'italic',
                        color: 'var(--matrix-bright-green)',
                        fontFamily: 'Consolas, Monaco, Courier New, monospace',
                        textShadow: '0 0 5px rgba(48, 255, 48, 0.5)'
                      }}>
                        "{bid.message}"
                      </p>
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      
      {/* Live Map for Active Orders (driver marker via sockets) */}
      {(order.status === 'accepted' || order.status === 'picked_up' || order.status === 'in_transit') && (
        <div
          data-testid={'order-card-live-map-' + order.id}
          style={{ position: 'relative', height: '220px', marginTop: '0.5rem', border: '2px solid var(--matrix-border)', borderRadius: '0.5rem', overflow: 'hidden' }}
        >
          <AsyncOrderMap
            order={order}
            currentUser={currentUser}
            driverLocation={driverLocation}
            theme={'dark'}
          />
          <div data-testid="live-indicator" style={{ position: 'absolute', top: '8px', left: '8px', zIndex: 1000, background: 'rgba(0,17,0,0.85)', border: '1px solid var(--matrix-border)', padding: '2px 6px', borderRadius: '9999px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00FF00', boxShadow: '0 0 10px #00FF00' }} />
            <span style={{ fontSize: '0.625rem', color: '#00FF00', fontWeight: 700, letterSpacing: '0.06em' }}>Live</span>
          </div>
        </div>
      )}
      {/* Status-specific action buttons */}
      {
        order.status === 'accepted' && currentUser?.primary_role === 'customer' && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{
              background: 'rgba(245, 166, 11, 0.1)',
              border: '2px solid #F59E0B',
              padding: '1rem',
              borderRadius: '0.5rem',
              boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#FBBF24',
                marginBottom: '0.5rem',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                textShadow: '0 0 10px rgba(251, 191, 36, 0.8)'
              }}>
                <strong>Driver:</strong> {order.assignedDriver?.name || 'Assigned Driver'}
              </p>
              <p style={{
                fontSize: '0.875rem',
                color: '#FCD34D',
                fontFamily: 'Consolas, Monaco, Courier New, monospace'
              }}>
                Order accepted and driver assigned.
              </p>
            </div>
          </div>
        )
      }

      {
        order.status === 'accepted' && currentUser?.primary_role === 'driver' && isDriverAssigned && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                data-testid={`pickup-order-btn-${order.id}`}
                onClick={() => onUpdateStatus(order.id, 'pickup')}
                disabled={loadingStates.pickupOrder}
                className="btn-success"
                style={{
                  flex: 1,
                  opacity: loadingStates.pickupOrder ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (!loadingStates.pickupOrder) {
                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.8)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loadingStates.pickupOrder) {
                    e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loadingStates.pickupOrder ? 'Marking as picked up...' : 'Mark as Picked Up'}
              </button>
            </div>
          </div>
        )
      }

      {
        order.status === 'picked_up' && currentUser?.primary_role === 'driver' && isDriverAssigned && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                data-testid={`in-transit-order-btn-${order.id}`}
                onClick={() => onUpdateStatus(order.id, 'in-transit')}
                disabled={loadingStates.updateInTransit}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #F59E0B 100%)',
                  color: '#000000',
                  border: '2px solid #F59E0B',
                  borderRadius: 'var(--radius-md)',
                  cursor: loadingStates.updateInTransit ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontFamily: 'Consolas, Monaco, Courier New, monospace',
                  boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)',
                  textShadow: '0 0 5px rgba(251, 191, 36, 0.5)',
                  opacity: loadingStates.updateInTransit ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (!loadingStates.updateInTransit) {
                    e.target.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.8)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loadingStates.updateInTransit) {
                    e.target.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.5)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loadingStates.updateInTransit ? 'Updating...' : 'Mark as In Transit'}
              </button>
            </div>
          </div>
        )
      }

      {
        order.status === 'in_transit' && currentUser?.primary_role === 'driver' && isDriverAssigned && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                data-testid={`complete-order-btn-${order.id}`}
                onClick={() => onUpdateStatus(order.id, 'complete')}
                disabled={loadingStates.completeOrder}
                className="btn-success"
                style={{
                  flex: 1,
                  opacity: loadingStates.completeOrder ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (!loadingStates.completeOrder) {
                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.8)';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!loadingStates.completeOrder) {
                    e.target.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {loadingStates.completeOrder ? 'Completing...' : 'Mark as Delivered'}
              </button>
            </div>
          </div>
        )
      }

      {/* Status messages */}
      {
        order.status === 'picked_up' && currentUser?.primary_role === 'customer' && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{
              background: 'rgba(101, 56, 234, 0.1)',
              border: '2px solid #6366F1',
              padding: '1rem',
              borderRadius: '0.5rem',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.3)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#8B5CF6',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                textShadow: '0 0 10px rgba(139, 92, 246, 0.8)'
              }}>
                Package has been picked up by the driver.
              </p>
            </div>
          </div>
        )
      }

      {
        order.status === 'in_transit' && currentUser?.primary_role === 'customer' && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{
              background: 'rgba(244, 114, 182, 0.1)',
              border: '2px solid #F472B6',
              padding: '1rem',
              borderRadius: '0.5rem',
              boxShadow: '0 0 10px rgba(244, 114, 182, 0.3)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#FCA5D6',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                textShadow: '0 0 10px rgba(252, 165, 214, 0.8)'
              }}>
                Package is in transit to the delivery address.
              </p>
            </div>
          </div>
        )
      }

      {
        order.status === 'delivered' && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{
              background: 'rgba(0, 170, 0, 0.1)',
              border: '2px solid var(--matrix-border)',
              padding: '1rem',
              borderRadius: '0.5rem',
              boxShadow: '0 0 10px rgba(0, 170, 0, 0.3)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--matrix-bright-green)',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                textShadow: 'var(--shadow-glow)'
              }}>
                Order completed successfully!
              </p>
            </div>
          </div>
        )
      }

      {
        order.status === 'cancelled' && (
          <div style={{
            borderTop: '2px solid var(--matrix-border)',
            paddingTop: '1rem',
            marginTop: '0.5rem'
          }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid #EF4444',
              padding: '1rem',
              borderRadius: '0.5rem',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#F87171',
                fontFamily: 'Consolas, Monaco, Courier New, monospace',
                textShadow: '0 0 10px rgba(248, 113, 113, 0.8)'
              }}>
                Order has been cancelled.
              </p>
            </div>
          </div>
        )
      }
    </div >
  );
};

// Render star rating function
const renderStars = (rating, onRate = null) => {
  return (
    <div style={{ display: 'flex', gap: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          onClick={() => onRate && onRate(star)}
          style={{
            fontSize: '1rem',
            cursor: onRate ? 'pointer' : 'default',
            color: star <= rating ? '#FCD34D' : '#D1D5DB'
          }}
        >
          â˜…
        </span>
      ))}
    </div>
  );
};

export default OrderCard;



