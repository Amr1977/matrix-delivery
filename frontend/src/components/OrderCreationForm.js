import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useI18n } from '../i18n/i18nContext';
import logger from '../logger';

const OrderCreationForm = ({ onSubmit, countries, t }) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      description: '',
      package_description: '',
      package_weight: '',
      estimated_value: '',
      special_instructions: '',
      estimated_delivery_date: '',
      price: '',
      pickup_country: '',
      pickup_city: '',
      pickup_area: '',
      pickup_street: '',
      pickup_building: '',
      pickup_floor: '',
      pickup_apartment: '',
      pickup_personName: '',
      dropoff_country: '',
      dropoff_city: '',
      dropoff_area: '',
      dropoff_street: '',
      dropoff_building: '',
      dropoff_floor: '',
      dropoff_apartment: '',
      dropoff_personName: ''
    },
    mode: 'onBlur',
    shouldUnregister: false,
    reValidateMode: 'onBlur'
  });

  const onFormSubmit = async (data) => {
    const startTime = Date.now();
    setInternalLoading(true);

    logger.user('Order creation form submitted', {
      hasTitle: !!data.title,
      hasPrice: !!data.price,
      pickupCountry: data.pickup_country,
      dropoffCountry: data.dropoff_country
    });

    try {
      const orderData = {
        title: data.title,
        description: data.description,
        package_description: data.package_description,
        package_weight: data.package_weight ? parseFloat(data.package_weight) : null,
        estimated_value: data.estimated_value ? parseFloat(data.estimated_value) : null,
        special_instructions: data.special_instructions,
        estimated_delivery_date: data.estimated_delivery_date || null,
        price: parseFloat(data.price),
        pickup_country: data.pickup_country,
        pickup_city: data.pickup_city,
        pickup_area: data.pickup_area,
        pickup_street: data.pickup_street,
        pickup_building: data.pickup_building,
        pickup_floor: data.pickup_floor,
        pickup_apartment: data.pickup_apartment,
        pickup_personName: data.pickup_personName,
        dropoff_country: data.dropoff_country,
        dropoff_city: data.dropoff_city,
        dropoff_area: data.dropoff_area,
        dropoff_street: data.dropoff_street,
        dropoff_building: data.dropoff_building,
        dropoff_floor: data.dropoff_floor,
        dropoff_apartment: data.dropoff_apartment,
        dropoff_personName: data.dropoff_personName
      };

      await onSubmit(orderData);

      const duration = Date.now() - startTime;
      logger.performance('Order form submission', duration, {
        success: true,
        price: orderData.price
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.performance('Order form submission', duration, {
        success: false,
        error: error.message
      });
      throw error;
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{t('orders.createOrder')}</h2>

      <form onSubmit={handleSubmit(onFormSubmit)} autoComplete="off">
        <div className="order-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
          {/* Basic Order Info */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                {t('orders.orderTitle')} *
              </label>
              <input
                {...register('title', { required: t('orders.orderTitleRequired') })}
                type="text"
                placeholder={t('orders.orderTitle')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.title ? '1px solid #EF4444' : '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              {errors.title && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.title.message}</p>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                {t('orders.description')}
              </label>
              <textarea
                {...register('description')}
                placeholder={`${t('orders.description')} (${t('orders.optional')})`}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  minHeight: '100px',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                {t('orders.packageDescription')}
              </label>
              <textarea
                {...register('package_description')}
                placeholder={t('orders.packageDescription')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  minHeight: '80px',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                {t('orders.specialInstructions')}
              </label>
              <textarea
                {...register('special_instructions')}
                placeholder={`${t('orders.specialInstructions')} (${t('orders.optional')})`}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  minHeight: '60px',
                  fontSize: '0.875rem',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Detailed Package & Pricing Info */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  {t('orders.packageWeight')}
                </label>
                <input
                  {...register('package_weight')}
                  type="number"
                  placeholder="0.0"
                  step="0.1"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                  {t('orders.estimatedValue')}
                </label>
                <input
                  {...register('estimated_value')}
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #D1D5DB',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                {t('orders.estimatedDelivery')}
              </label>
              <input
                {...register('estimated_delivery_date')}
                type="datetime-local"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                {t('orders.price')} *
              </label>
              <input
                {...register('price', { required: t('orders.priceRequired') })}
                type="number"
                placeholder={t('orders.price')}
                step="0.01"
                min="0"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.price ? '1px solid #EF4444' : '1px solid #D1D5DB',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              />
              {errors.price && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.price.message}</p>}
            </div>

            <button
              type="submit"
              disabled={internalLoading}
              style={{
                width: '100%',
                background: '#10B981',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '0.375rem',
                fontWeight: '600',
                border: 'none',
                cursor: internalLoading ? 'not-allowed' : 'pointer',
                opacity: internalLoading ? 0.5 : 1
              }}
            >
              {internalLoading ? t('orders.publishingOrder') : t('orders.publishOrder')}
            </button>
          </div>
        </div>

        {/* Location Sections */}
        <div style={{ marginTop: '2rem' }}>
          <div className="location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            {/* Pickup Location */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              background: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📤</span>
                <h4 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#1F2937',
                  margin: 0
                }}>
                  {t('orders.pickupLocation')}
                </h4>
              </div>

              <div className="address-fields-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.country')} *
                  </label>
                  <select
                    {...register('pickup_country', { required: t('orders.pickupCountryRequired') })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: errors.pickup_country ? '1px solid #EF4444' : '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: 'white'
                    }}
                  >
                    <option value="">{t('orders.selectCountry')}</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.pickup_country && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.pickup_country.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.city')} *
                  </label>
                  <input
                    {...register('pickup_city', { required: t('orders.pickupCityRequired') })}
                    type="text"
                    placeholder={t('orders.enterCity')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: errors.pickup_city ? '1px solid #EF4444' : '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  {errors.pickup_city && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.pickup_city.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.area')}
                  </label>
                  <input
                    {...register('pickup_area')}
                    type="text"
                    placeholder={t('orders.enterArea')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.street')}
                  </label>
                  <input
                    {...register('pickup_street')}
                    type="text"
                    placeholder={t('orders.enterStreet')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.building')}
                  </label>
                  <input
                    {...register('pickup_building')}
                    type="text"
                    placeholder={t('orders.buildingNumber')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.floor')}
                  </label>
                  <input
                    {...register('pickup_floor')}
                    type="text"
                    placeholder={t('orders.floor')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.apartment')}
                  </label>
                  <input
                    {...register('pickup_apartment')}
                    type="text"
                    placeholder={t('orders.aptNumber')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.contactName')} *
                  </label>
                  <input
                    {...register('pickup_personName', { required: t('orders.pickupContactRequired') })}
                    type="text"
                    placeholder={t('orders.contactPerson')}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: errors.pickup_personName ? '1px solid #EF4444' : '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  {errors.pickup_personName && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.pickup_personName.message}</p>}
                </div>
              </div>
            </div>

            {/* Delivery Location */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              background: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.25rem' }}>📥</span>
                <h4 style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: '#1F2937',
                  margin: 0
                }}>
                  {t('orders.deliveryLocation')}
                </h4>
              </div>

              <div className="address-fields-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.country')} *
                  </label>
                  <select
                    {...register('dropoff_country', { required: t('orders.deliveryCountryRequired') })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: errors.dropoff_country ? '1px solid #EF4444' : '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                      background: 'white'
                    }}
                  >
                    <option value="">{t('orders.selectCountry')}</option>
                    {countries.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                  {errors.dropoff_country && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.dropoff_country.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.city')} *
                  </label>
                  <input
                    {...register('dropoff_city', { required: t('orders.deliveryCityRequired') })}
                    type="text"
                    placeholder={t('orders.enterCity')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: errors.dropoff_city ? '1px solid #EF4444' : '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  {errors.dropoff_city && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.dropoff_city.message}</p>}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.area')}
                  </label>
                  <input
                    {...register('dropoff_area')}
                    type="text"
                    placeholder={t('orders.enterArea')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.street')}
                  </label>
                  <input
                    {...register('dropoff_street')}
                    type="text"
                    placeholder={t('orders.enterStreet')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.building')}
                  </label>
                  <input
                    {...register('dropoff_building')}
                    type="text"
                    placeholder={t('orders.buildingNumber')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.floor')}
                  </label>
                  <input
                    {...register('dropoff_floor')}
                    type="text"
                    placeholder={t('orders.floor')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.apartment')}
                  </label>
                  <input
                    {...register('dropoff_apartment')}
                    type="text"
                    placeholder={t('orders.aptNumber')}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.25rem' }}>
                    {t('orders.contactName')} *
                  </label>
                  <input
                    {...register('dropoff_personName', { required: t('orders.deliveryContactRequired') })}
                    type="text"
                    placeholder={t('orders.contactPerson')}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: errors.dropoff_personName ? '1px solid #EF4444' : '1px solid #D1D5DB',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem'
                    }}
                  />
                  {errors.dropoff_personName && <p style={{ color: '#EF4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>{errors.dropoff_personName.message}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default React.memo(OrderCreationForm);
