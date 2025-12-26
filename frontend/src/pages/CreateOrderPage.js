import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrderCreationForm from '../updated-order-creation-form';
import { useI18n } from '../i18n/i18nContext';
import { OrdersApi } from '../services/api';

const CreateOrderPage = () => {
    const navigate = useNavigate();
    const { t } = useI18n();
    const [loading, setLoading] = useState(false);

    // In App.js, countries seems to be initialized as [], so we replicate that here.
    const countries = [];

    const handlePublishOrder = async (orderData) => {
        // Validation logic ported from App.js
        const requiredFieldsError = [];

        if (!orderData.title?.trim()) requiredFieldsError.push('Order title');
        if (!orderData.price || parseFloat(orderData.price) <= 0) requiredFieldsError.push('Price');

        const hasPickupData = orderData.pickupAddress?.country || orderData.pickupLocation?.address?.country;
        const hasPickupCountry = (orderData.pickupAddress?.country || orderData.pickupLocation?.address?.country)?.trim();
        const hasPickupCity = (orderData.pickupAddress?.city || orderData.pickupLocation?.address?.city)?.trim();
        const hasPickupPersonName = (orderData.pickupAddress?.personName || orderData.pickupLocation?.address?.personName)?.trim();

        if (!hasPickupData || !hasPickupCountry || !hasPickupCity || !hasPickupPersonName) {
            requiredFieldsError.push('Pickup location (country, city, contact name)');
        }

        const hasDropoffData = orderData.dropoffAddress?.country || orderData.dropoffLocation?.address?.country;
        const hasDropoffCountry = (orderData.dropoffAddress?.country || orderData.dropoffLocation?.address?.country)?.trim();
        const hasDropoffCity = (orderData.dropoffAddress?.city || orderData.dropoffLocation?.address?.city)?.trim();
        const hasDropoffPersonName = (orderData.dropoffAddress?.personName || orderData.dropoffLocation?.address?.personName)?.trim();

        if (!hasDropoffData || !hasDropoffCountry || !hasDropoffCity || !hasDropoffPersonName) {
            requiredFieldsError.push('Delivery location (country, city, contact name)');
        }

        if (requiredFieldsError.length > 0) {
            const errorMessage = `Please fill all required fields: ${requiredFieldsError.join(', ')} `;
            throw new Error(errorMessage);
        }

        try {
            setLoading(true);
            const newOrder = {
                title: orderData.title,
                description: orderData.description,
                package_description: orderData.package_description,
                package_weight: orderData.package_weight ? parseFloat(orderData.package_weight) : null,
                estimated_value: orderData.estimated_value ? parseFloat(orderData.estimated_value) : null,
                special_instructions: orderData.special_instructions,
                estimated_delivery_date: orderData.estimated_delivery_date || null,
                price: parseFloat(orderData.price),
                showManualEntry: true,
                pickupAddress: orderData.pickupAddress,
                dropoffAddress: orderData.dropoffAddress,
                ...(orderData.pickupLocation && { pickupLocation: orderData.pickupLocation }),
                ...(orderData.dropoffLocation && { dropoffLocation: orderData.dropoffLocation }),
                ...(orderData.routeInfo && { routeInfo: orderData.routeInfo })
            };

            await OrdersApi.createOrder(newOrder);

            alert(t('common.orderPublished', 'Order published successfully!'));
            navigate('/'); // Go back to dashboard/active orders
        } catch (err) {
            throw err; // Form component will catch and display
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '1rem',
            maxWidth: '1200px',
            margin: '0 auto',
            minHeight: '100vh',
            background: '#f3f4f6'
        }}>
            <div style={{ marginBottom: '1rem' }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#4B5563',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '1rem',
                        fontWeight: '600'
                    }}
                >
                    ← {t('common.back', 'Back')}
                </button>
            </div>

            <OrderCreationForm
                onSubmit={handlePublishOrder}
                countries={countries}
                t={t}
            />
        </div>
    );
};

export default CreateOrderPage;
