import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import DriverBiddingMap from '../maps/DriverBiddingMap';
import { MapPin, Clock, Wallet, User, Star, Hash, Navigation, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import useAuth from '../../hooks/useAuth';

/**
 * DriverBiddingCard - Matrix Design System
 * 
 * Specialized card for drivers to view and bid on available orders.
 * Focuses on:
 * 1. Visual Route (Driver -> Pickup -> Delivery)
 * 2. Financials (Upfront Payment, Client Offer)
 * 3. Client Reputation
 */
const DriverBiddingCard = ({
    order,
    currentUser,
    onBid,
    driverLocation,
    bidInput,
    setBidInput,
    bidDetails,
    setBidDetails,
    loadingStates
}) => {
    const { t } = useI18n();
    const [showMapFullscreen, setShowMapFullscreen] = useState(false);

    // Calculate upfront payment (default to 0 if undefined)
    const upfrontPayment = order.upfront_payment || order.upfrontPayment || 0;
    const hasUpfrontPayment = upfrontPayment > 0;

    // Check if driver already bid
    const myBid = order.bids?.find(b => b.driverId === currentUser?.id);

    // Estimates logic
    const distanceKm = order.estimatedDistanceKm || order.distance || 0;
    // Rough estimate: 30km/h avg speed + 15 mins pickup/dropoff handling
    const estTimeMins = Math.ceil((distanceKm / 30) * 60) + 15;

    const handleBidSubmit = (e) => {
        e.preventDefault();

        // Balance Check
        if (hasUpfrontPayment) {
            const userBalance = Number(currentUser?.balance || 0);
            if (userBalance < Number(upfrontPayment)) {
                alert(`Insufficient Balance! You need ${formatCurrency(upfrontPayment)} in your wallet.`);
                return;
            }
        }

        // Logic handled by parent (OrderCard) wrapper usually, but we implement the call here
        if (bidInput[order.id]) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const location = { lat: position.coords.latitude, lng: position.coords.longitude };
                        onBid(order.id, {
                            bidPrice: bidInput[order.id],
                            estimatedPickupTime: bidDetails[order.id]?.pickupTime,
                            estimatedDeliveryTime: bidDetails[order.id]?.deliveryTime,
                            message: bidDetails[order.id]?.message,
                            location: location
                        });
                    },
                    () => onBid(order.id, { // Fallback
                        bidPrice: bidInput[order.id],
                        estimatedPickupTime: bidDetails[order.id]?.pickupTime,
                        estimatedDeliveryTime: bidDetails[order.id]?.deliveryTime,
                        message: bidDetails[order.id]?.message
                    })
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

    return (
        <div style={{
            background: 'rgba(10, 14, 39, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 255, 65, 0.2)',
            borderRadius: '1rem',
            marginBottom: '1.5rem',
            overflow: 'hidden',
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.05)',
            color: 'white',
            position: 'relative'
        }}>

            {/* 1. Header Section */}
            <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h3 style={{
                            margin: 0,
                            fontSize: '1.1rem',
                            color: 'var(--matrix-bright-green, #00ff41)',
                            fontFamily: 'monospace'
                        }}>
                            {order.title}
                        </h3>
                        {order.orderNumber && (
                            <span style={{
                                fontSize: '0.75rem',
                                background: 'rgba(255,255,255,0.1)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontFamily: 'monospace'
                            }}>
                                #{order.orderNumber}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Client Offer</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                        {formatCurrency(order.price)}
                    </div>
                </div>
            </div>

            {/* 2. Map Section */}
            <div style={{ position: 'relative', height: '200px', width: '100%' }}>
                <DriverBiddingMap
                    order={order}
                    driverLocation={driverLocation}
                    driverVehicleType={currentUser?.vehicle_type || 'car'}
                    onToggleFullscreen={() => setShowMapFullscreen(!showMapFullscreen)}
                    isFullscreen={showMapFullscreen}
                    compact={true} // New prop to make it fit better if needed
                />

                {/* Overlay Stats */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    right: '10px',
                    display: 'flex',
                    gap: '0.5rem',
                    zIndex: 400
                }}>
                    <div style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(5px)',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Navigation size={16} color="var(--matrix-cyan, #00ffff)" />
                        <div>
                            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Est. Distance</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{distanceKm.toFixed(1)} km</div>
                        </div>
                    </div>

                    <div style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.8)',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <Clock size={16} color="#FBBF24" />
                        <div>
                            <div style={{ fontSize: '0.65rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Est. Time</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>~{estTimeMins} min</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Key Details Grid */}
            <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) 2fr', gap: '1rem' }}>

                {/* Financials Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {/* Upfront Payment Box */}
                    <div style={{
                        background: hasUpfrontPayment ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        border: `1px solid ${hasUpfrontPayment ? '#EF4444' : '#10B981'}`,
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '0.7rem',
                            color: hasUpfrontPayment ? '#EF4444' : '#10B981',
                            textTransform: 'uppercase',
                            fontWeight: 'bold',
                            marginBottom: '0.25rem'
                        }}>
                            Upfront Payment
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                            {formatCurrency(upfrontPayment)}
                        </div>
                        {hasUpfrontPayment && (
                            <div style={{ fontSize: '0.65rem', color: '#FCA5A5', marginTop: '0.25rem' }}>
                                Required in wallet
                            </div>
                        )}
                    </div>
                </div>

                {/* Addresses Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{
                            background: 'rgba(0, 255, 65, 0.1)',
                            padding: '6px',
                            borderRadius: '50%',
                            color: 'var(--matrix-bright-green)'
                        }}>
                            <MapPin size={16} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Pickup From</div>
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.3' }}>
                                {order.pickupAddress || order.from?.name || "Unknown Location"}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            padding: '6px',
                            borderRadius: '50%',
                            color: '#ffffff'
                        }}>
                            <MapPin size={16} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Deliver To</div>
                            <div style={{ fontSize: '0.9rem', lineHeight: '1.3' }}>
                                {order.deliveryAddress || order.to?.name || "Unknown Location"}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Client Reputation */}
            <div style={{
                margin: '0 1rem 1rem 1rem',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '0.5rem',
                padding: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#374151', padding: '6px', borderRadius: '50%' }}>
                        <User size={16} color="#9CA3AF" />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Client Reputation</div>
                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                            {order.customerCompletedOrders || 0} Orders
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', items: 'center', gap: '0.25rem' }}>
                    <Star size={14} fill="#FBBF24" color="#FBBF24" />
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {order.customerRating ? order.customerRating.toFixed(1) : 'New'}
                    </span>
                </div>
            </div>

            {/* 5. Bidding Section */}
            <div style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '1rem',
                borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
                {myBid ? (
                    <div style={{
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid #10B981',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        textAlign: 'center'
                    }}>
                        <CheckCircle size={24} color="#10B981" style={{ marginBottom: '0.5rem' }} />
                        <div style={{ fontWeight: 'bold', color: '#10B981' }}>Bid Placed</div>
                        <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
                            You offered {formatCurrency(myBid.bidPrice)}
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleBidSubmit}>
                        <div style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            color: 'var(--matrix-bright-green)',
                            marginBottom: '0.5rem',
                            fontWeight: 'bold'
                        }}>
                            Place Your Bid
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '10px', top: '10px', fontSize: '0.8rem', opacity: 0.7 }}>EGP</span>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={bidInput[order.id] || ''}
                                    onChange={(e) => setBidInput({ ...bidInput, [order.id]: e.target.value })}
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0,0,0,0.5)',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        padding: '0.5rem 0.5rem 0.5rem 2.5rem',
                                        borderRadius: '0.5rem',
                                        color: 'white',
                                        fontWeight: 'bold'
                                    }}
                                    step="1"
                                    required
                                />
                            </div>

                            <input
                                type="datetime-local"
                                value={bidDetails[order.id]?.pickupTime || ''}
                                onChange={(e) => setBidDetails({ ...bidDetails, [order.id]: { ...bidDetails[order.id], pickupTime: e.target.value } })}
                                style={{
                                    width: '100%',
                                    background: 'rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.8rem'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <input
                                placeholder="Message to client (optional)"
                                value={bidDetails[order.id]?.message || ''}
                                onChange={(e) => setBidDetails({ ...bidDetails, [order.id]: { ...bidDetails[order.id], message: e.target.value } })}
                                style={{
                                    flex: 1,
                                    background: 'rgba(0,0,0,0.5)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    padding: '0.5rem',
                                    borderRadius: '0.5rem',
                                    color: 'white',
                                    fontSize: '0.9rem'
                                }}
                            />

                            <button
                                type="submit"
                                disabled={loadingStates?.placeBid}
                                style={{
                                    background: 'linear-gradient(135deg, var(--matrix-bright-green), #00cc33)',
                                    color: 'black',
                                    border: 'none',
                                    padding: '0 1.5rem',
                                    borderRadius: '0.5rem',
                                    fontWeight: 'bold',
                                    cursor: loadingStates?.placeBid ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    opacity: loadingStates?.placeBid ? 0.7 : 1
                                }}
                            >
                                <Send size={16} />
                                {loadingStates?.placeBid ? '...' : 'Bid'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default DriverBiddingCard;
