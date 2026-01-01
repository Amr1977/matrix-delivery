import React, { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useI18n } from '../../i18n/i18nContext';

const LoginForm = ({ onSubmit, onForgotPassword, loading, error, t }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [captchaRef, setCaptchaRef] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
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
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>{t('auth.signIn')}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="text"
          data-testid="email-input"
          placeholder={t('auth.email')}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
        />
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            data-testid="password-input"
            placeholder={t('auth.password')}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            style={{ width: '100%', padding: '0.5rem 3.5rem 0.5rem 1rem', border: '1px solid #D1D5DB', borderRadius: '0.5rem', outline: 'none' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <ReCAPTCHA
              ref={(ref) => setCaptchaRef(ref)}
              sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
            />
          </div>
        )}
        <button
          type="submit"
          data-testid="login-submit-btn"
          disabled={loading}
          style={{ width: '100%', background: '#4F46E5', color: 'white', padding: '0.5rem', borderRadius: '0.5rem', fontWeight: '600', border: 'none', cursor: 'pointer', opacity: loading ? 0.5 : 1 }}
        >
          {loading ? t('auth.loading') : t('auth.login')}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
        <button
          onClick={onForgotPassword}
          style={{
            color: '#4F46E5',
            textDecoration: 'underline',
            fontWeight: '600',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
        >
          {t('auth.forgotPassword')}
        </button>
      </div>
    </>
  );
};

export default LoginForm;
