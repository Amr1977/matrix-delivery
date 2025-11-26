import React, { useState } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { useI18n } from '../../i18n/i18nContext';

const ForgotPasswordForm = ({ onSubmit, onBack, loading, error, success }) => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [captchaRef, setCaptchaRef] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    const recaptchaToken = process.env.REACT_APP_RECAPTCHA_SITE_KEY && captchaRef?.getValue();
    if (process.env.REACT_APP_RECAPTCHA_SITE_KEY && !recaptchaToken) {
      return;
    }

    await onSubmit(email, recaptchaToken);
  };

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📧</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#30FF30', marginBottom: '1rem' }}>
          {t('auth.checkYourEmail')}
        </h2>
        <p style={{ color: '#22BB22', marginBottom: '2rem' }}>
          {t('auth.resetEmailSent')}
        </p>
        <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
          {t('auth.resetEmailInstructions')}
        </p>
        <button
          onClick={onBack}
          style={{
            background: '#4F46E5',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {t('auth.backToLogin')}
        </button>
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1F2937' }}>
        {t('auth.forgotPassword')}
      </h2>
      <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        {t('auth.forgotPasswordInstructions')}
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input
          type="email"
          placeholder={t('auth.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            border: '1px solid #D1D5DB',
            borderRadius: '0.5rem',
            outline: 'none',
            fontSize: '1rem'
          }}
          required
        />

        {process.env.REACT_APP_RECAPTCHA_SITE_KEY && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <ReCAPTCHA
              ref={(ref) => setCaptchaRef(ref)}
              sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
            />
          </div>
        )}

        {error && (
          <div style={{
            background: '#FEF2F2',
            color: '#991B1B',
            padding: '0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            border: '1px solid #FEE2E2'
          }}>
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          style={{
            width: '100%',
            background: '#4F46E5',
            color: 'white',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            opacity: loading || !email ? 0.5 : 1
          }}
        >
          {loading ? t('auth.sending') : t('auth.sendResetLink')}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          onClick={onBack}
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
          {t('auth.backToLogin')}
        </button>
      </div>
    </>
  );
};

export default ForgotPasswordForm;
