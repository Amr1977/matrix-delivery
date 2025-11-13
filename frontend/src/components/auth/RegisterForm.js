import React, { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useI18n } from '../../i18n/i18nContext';

const RegisterForm = ({ onSubmit, loading, error, t, countries }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    vehicle_type: '',
    country: '',
    city: '',
    area: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaRef, setCaptchaRef] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.role || !formData.country || !formData.city || !formData.area) {
      return;
    }
    if (formData.role === 'driver' && !formData.vehicle_type) {
      return;
    }

    const recaptchaToken = process.env.REACT_APP_RECAPTCHA_SITE_KEY && captchaRef?.getValue();
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      return;
    }

    await onSubmit({
      ...formData,
      recaptchaToken
    });
  };

  return (
    <>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>{t('auth.createAccount')}</h2>
      <input
        type="text"
        placeholder={t('auth.fullName')}
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
      />
      <input
        type="email"
        placeholder={t('auth.email')}
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
      />
      <input
        type="tel"
        placeholder={t('auth.phoneNumber')}
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
      />
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder={t('auth.password')}
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
        />
        <button
          onClick={() => setShowPassword(!showPassword)}
          style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}
        >
          {showPassword ? '👁️' : '👁️‍🗨️'}
        </button>
      </div>
      <select
        value={formData.role}
        onChange={(e) => setFormData({ ...formData, role: e.target.value, vehicle_type: e.target.value === 'customer' ? '' : formData.vehicle_type })}
        style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
      >
        <option value="customer">{t('auth.customer')}</option>
        <option value="driver">{t('auth.driver')}</option>
      </select>
      {formData.role === 'driver' && (
        <select
          value={formData.vehicle_type}
          onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
          style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
        >
          <option value="">{t('auth.selectVehicleType')}</option>
          <option value="bike">{t('auth.bike')}</option>
          <option value="car">{t('auth.car')}</option>
          <option value="van">{t('auth.van')}</option>
          <option value="truck">{t('auth.truck')}</option>
        </select>
      )}

      {/* Location Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <select
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value, city: '', area: '' })}
          style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
        >
          <option value="">{t('orders.selectCountry')}</option>
          {countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t('orders.city')}
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
        />
      </div>
      <input
        type="text"
        placeholder={t('orders.area')}
        value={formData.area}
        onChange={(e) => setFormData({ ...formData, area: e.target.value })}
        style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
      />
      {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <ReCAPTCHA
            ref={(ref) => setCaptchaRef(ref)}
            sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
          />
        </div>
      )}
      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
      >
        {loading ? t('auth.loading') : t('auth.register')}
      </button>
    </>
  );
};

export default RegisterForm;
