import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import useAuth from '../../hooks/useAuth';

const EmailVerificationBanner = ({ currentUser }) => {
  const { t } = useI18n();
  const { handleSendEmailVerification, loading, error } = useAuth();
  const [resent, setResent] = useState(false);

  // Don't show if user is verified or not logged in
  if (!currentUser || currentUser.isVerified) {
    return null;
  }

  const handleResendVerification = async () => {
    const success = await handleSendEmailVerification();
    if (success) {
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #FFF3CD 0%, #FFEAA7 100%)',
      border: '1px solid #FFECB5',
      borderRadius: '0.5rem',
      padding: '1rem',
      marginBottom: '1rem',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ fontSize: '1.25rem', color: '#856404' }}>📧</div>
        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#856404',
            margin: '0 0 0.25rem 0'
          }}>
            {t('auth.verifyYourEmail')}
          </h3>
          <p style={{
            fontSize: '0.875rem',
            color: '#856404',
            margin: '0 0 0.75rem 0'
          }}>
            {t('auth.emailVerificationRequired')}
          </p>
          <button
            onClick={handleResendVerification}
            disabled={loading}
            style={{
              background: '#856404',
              color: 'white',
              padding: '0.375rem 0.75rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? t('auth.sending') : (resent ? t('auth.resent') : t('auth.resendVerification'))}
          </button>
        </div>
        <button
          onClick={() => {
            // For now, just hide the banner. In a real app, you might store this preference
            const banner = document.querySelector('[data-email-verification-banner]');
            if (banner) banner.style.display = 'none';
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#856404',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0',
            lineHeight: '1'
          }}
        >
          ×
        </button>
      </div>

      {error && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem',
          background: '#FEE2E2',
          color: '#991B1B',
          borderRadius: '0.25rem',
          fontSize: '0.75rem',
          border: '1px solid #FECACA'
        }}>
          {error}
        </div>
      )}
    </div>
  );
};

export default EmailVerificationBanner;
