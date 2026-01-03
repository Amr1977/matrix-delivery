import React from 'react';

/**
 * OrderBiddingSection Component
 * 
 * Handles all driver bidding functionality including:
 * - Driver pricing configuration (vehicle type, cost per km, waiting time, currency)
 * - Customer reputation display
 * - Bid input form
 * - Bid management (place, modify, withdraw)
 * 
 * Only displayed for drivers viewing pending_bids orders
 */
const OrderBiddingSection = ({
    order,
    currentUser,
    driverLocation,
    t,
    driverPricing,
    saveDriverPricing,
    bidInput,
    setBidInput,
    bidDetails,
    setBidDetails,
    loadingStates,
    renderStars,
    computeBidSuggestions,
    handleBidOnOrder,
    handleModifyBid,
    handleWithdrawBid,
    openReviewModal,
}) => {
    // Only show for drivers on pending_bids orders
    if (order.status !== 'pending_bids' || currentUser?.primary_role !== 'driver') {
        return null;
    }

    const openGoogleMaps = () => {
        const pickup = order.pickupLocation?.coordinates || (order.from ? { lat: order.from.lat, lng: order.from.lng } : null);
        const dropoff = order.dropoffLocation?.coordinates || (order.to ? { lat: order.to.lat, lng: order.to.lng } : null);
        const origin = driverLocation ? `${driverLocation.latitude},${driverLocation.longitude}` : '';
        const waypoint = pickup ? `${pickup.lat},${pickup.lng}` : '';
        const destination = dropoff ? `${dropoff.lat},${dropoff.lng}` : '';
        const travelmode = driverPricing.vehicleType === 'walker' ? 'walking' : (driverPricing.vehicleType === 'bicycle' ? 'bicycling' : 'driving');
        const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoint}&travelmode=${travelmode}`;
        window.open(url, '_blank');
    };

    return (
        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '1rem' }}>
            {/* Driver Pricing Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <select
                    value={driverPricing.vehicleType}
                    onChange={(e) => saveDriverPricing({ vehicleType: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                >
                    <option value="walker">Walker</option>
                    <option value="bicycle">Bicycle</option>
                    <option value="scooter">Scooter</option>
                    <option value="motorbike">Motorbike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                </select>

                <input
                    type="number"
                    step="0.01"
                    value={driverPricing.costPerKm}
                    onChange={(e) => saveDriverPricing({ costPerKm: parseFloat(e.target.value) || 0 })}
                    placeholder="Cost per km"
                    style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />

                <input
                    type="number"
                    step="0.01"
                    value={driverPricing.waitingPerHour}
                    onChange={(e) => saveDriverPricing({ waitingPerHour: parseFloat(e.target.value) || 0 })}
                    placeholder="Waiting per hour"
                    style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />

                <select
                    value={driverPricing.currency}
                    onChange={(e) => saveDriverPricing({ currency: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                >
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="EGP">EGP (LE) - Egyptian Pound</option>
                    <option value="SAR">SAR (﷼) - Saudi Riyal</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                    <option value="KWD">KWD (د.ك) - Kuwaiti Dinar</option>
                    <option value="QAR">QAR (﷼) - Qatari Riyal</option>
                    <option value="BHD">BHD (د.ب) - Bahraini Dinar</option>
                    <option value="OMR">OMR (﷼) - Omani Rial</option>
                    <option value="JOD">JOD (د.ا) - Jordanian Dinar</option>
                    <option value="LBP">LBP (ل.ل) - Lebanese Pound</option>
                    <option value="IQD">IQD (ع.د) - Iraqi Dinar</option>
                    <option value="TRY">TRY (₺) - Turkish Lira</option>
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="PKR">PKR (₨) - Pakistani Rupee</option>
                    <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                    <option value="CNY">CNY (¥) - Chinese Yuan</option>
                    <option value="JPY">JPY (¥) - Japanese Yen</option>
                    <option value="KRW">KRW (₩) - South Korean Won</option>
                    <option value="MYR">MYR (RM) - Malaysian Ringgit</option>
                    <option value="SGD">SGD (S$) - Singapore Dollar</option>
                    <option value="THB">THB (฿) - Thai Baht</option>
                    <option value="CAD">CAD (C$) - Canadian Dollar</option>
                    <option value="AUD">AUD (A$) - Australian Dollar</option>
                    <option value="NZD">NZD (NZ$) - New Zealand Dollar</option>
                    <option value="ZAR">ZAR (R) - South African Rand</option>
                    <option value="NGN">NGN (₦) - Nigerian Naira</option>
                    <option value="KES">KES (KSh) - Kenyan Shilling</option>
                </select>

                <button
                    onClick={() => {
                        const s = computeBidSuggestions(order);
                        setBidInput({ ...bidInput, [order.id]: s.recommendedBid.toFixed(2) });
                    }}
                    style={{ padding: '0.5rem 1rem', background: '#10B981', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                    Use Recommended Bid
                </button>

                <button
                    onClick={openGoogleMaps}
                    style={{ padding: '0.5rem 1rem', background: '#3B82F6', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                    Open in Google Maps
                </button>
            </div>

            {/* Customer Reputation Section */}
            <div style={{ background: '#F0F9FF', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', border: '1px solid #DBEAFE' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1E40AF' }}>
                        👤 Customer Reputation
                    </h4>
                    {order.customerIsVerified && (
                        <span style={{ background: '#10B981', color: 'white', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', fontWeight: '600' }}>
                            ✓ Verified
                        </span>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Rating</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {renderStars(order.customerRating || 0)}
                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                                {order.customerRating ? order.customerRating.toFixed(1) : 'New'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Deliveries</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                            {order.customerCompletedOrders || 0}
                        </p>
                    </div>
                    <div>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Reviews</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937' }}>
                            {order.customerReviewCount || 0}
                        </p>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem' }}>Member Since</p>
                        <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
                            {order.customerJoinedAt ? new Date(order.customerJoinedAt).toLocaleDateString() : 'Unknown'}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => openReviewModal(order.id, 'view_customer_reviews')}
                        style={{ padding: '0.25rem 0.75rem', background: '#3B82F6', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}
                    >
                        📝 View Reviews ({order.customerReviewCount || 0})
                    </button>
                    <button
                        onClick={() => openReviewModal(order.id, 'view_customer_given_reviews')}
                        style={{ padding: '0.25rem 0.75rem', background: '#6366F1', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}
                    >
                        ⭐ Reviews Given ({order.customerGivenReviewCount || 0})
                    </button>
                    {!order.customerIsVerified && (
                        <button
                            onClick={() => window.open(`https://wa.me/1234567890?text=Hello, I would like to verify my account for order ${order.orderNumber}`, '_blank')}
                            style={{ padding: '0.25rem 0.75rem', background: '#25D366', color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        >
                            📱 Verify Account
                        </button>
                    )}
                </div>
            </div>

            {/* Distance Display */}
            {order.distance && (
                <div style={{ marginBottom: '0.75rem', fontSize: '0.875rem', color: '#6B7280' }}>
                    📍 Distance from pickup: {order.distance ? `${order.distance.toFixed(2)} km` : 'Unknown'}
                </div>
            )}

            {/* Bid Input Form */}
            <p style={{ fontWeight: '600', marginBottom: '0.75rem', fontSize: '0.875rem' }}>{t('orders.placeYourBid')}</p>
            <div className="bid-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="number"
                    placeholder={t('driver.bidAmount')}
                    value={bidInput[order.id] || ''}
                    onChange={(e) => setBidInput({ ...bidInput, [order.id]: e.target.value })}
                    style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                    step="0.01"
                />
                <div style={{ fontSize: '0.75rem', color: '#6B7280', alignSelf: 'center' }}>
                    {(() => {
                        const s = computeBidSuggestions(order);
                        return `Min: ${s.minBid.toFixed(2)} • Rec: ${s.recommendedBid.toFixed(2)} ${driverPricing.currency}`;
                    })()}
                </div>
                <input
                    type="datetime-local"
                    placeholder={t('orders.pickupTime')}
                    value={bidDetails[order.id]?.pickupTime || ''}
                    onChange={(e) => setBidDetails({ ...bidDetails, [order.id]: { ...bidDetails[order.id], pickupTime: e.target.value } })}
                    style={{ padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
            </div>

            {/* Bid Action Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                    type="text"
                    placeholder={t('orders.messageOptional')}
                    value={bidDetails[order.id]?.message || ''}
                    onChange={(e) => setBidDetails({ ...bidDetails, [order.id]: { ...bidDetails[order.id], message: e.target.value } })}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem' }}
                />
                <button
                    onClick={() => handleBidOnOrder(order.id)}
                    disabled={loadingStates.placeBid}
                    style={{ padding: '0.5rem 1rem', background: '#4F46E5', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
                >
                    {loadingStates.placeBid ? t('driver.bidding') : t('driver.placeBid')}
                </button>
                {order.bids?.some(b => b.userId === currentUser?.id) && (
                    <>
                        <button
                            onClick={() => handleModifyBid(order.id)}
                            disabled={loadingStates.placeBid}
                            style={{ padding: '0.5rem 1rem', background: '#F59E0B', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
                        >
                            Modify Bid
                        </button>
                        <button
                            onClick={() => handleWithdrawBid(order.id)}
                            disabled={loadingStates.placeBid}
                            style={{ padding: '0.5rem 1rem', background: '#EF4444', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: loadingStates.placeBid ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: loadingStates.placeBid ? 0.5 : 1 }}
                        >
                            Withdraw Bid
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default OrderBiddingSection;
