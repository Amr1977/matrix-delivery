import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import LanguageSwitcher from '../../LanguageSwitcher';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import ForgotPasswordForm from './ForgotPasswordForm';
import ResetPasswordForm from './ResetPasswordForm';
import { useAuth } from '../../hooks/useAuth';

const AuthScreen = ({ onLogin, onRegister, loading, error, countries }) => {
  const { t, locale, changeLocale } = useI18n();
  const [authState, setAuthState] = useState('login');
  const { handleForgotPassword } = useAuth();
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [resetPasswordToken, setResetPasswordToken] = useState('');

  // Add viewport meta tag if not present
  useEffect(() => {
    let metaTag = document.querySelector('meta[name="viewport"]');
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.name = 'viewport';
      document.head.appendChild(metaTag);
    }
    metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }, []);

  const handleForgotPassword = async (email, recaptchaToken) => {
    const success = await handleForgotPassword(email, recaptchaToken);
    if (success) {
      setForgotPasswordSuccess(true);
    }
  };

  const handleResetPassword = (token) => {
    setResetPasswordToken(token);
    setAuthState('reset-password');
  };

  const handleResetPasswordSuccess = () => {
    setAuthState('login');
    setResetPasswordToken('');
    setForgotPasswordSuccess(false);
  };

  const handleBackToLogin = () => {
    setAuthState('login');
    setForgotPasswordSuccess(false);
    setResetPasswordToken('');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#090909', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div className="card-matrix" style={{ position: 'relative', borderRadius: '0.5rem', boxShadow: '0 20px 25px -5px rgba(0, 48, 0, 0.2), inset 0 0 20px rgba(48, 255, 48, 0.1)', padding: '2rem', maxWidth: '28rem', width: '100%', background: 'linear-gradient(135deg, #000000 0%, #111111 100%)' }}>
          <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
            <LanguageSwitcher locale={locale} changeLocale={changeLocale} />
          </div>
          <img
            src="/branding-hero-1.png"
            alt="Matrix Heroes - Your trusted delivery heroes"
            style={{ maxWidth: '120px', height: 'auto', display: 'block', margin: '0 auto 1.5rem auto', filter: 'drop-shadow(0 0 10px rgba(48, 255, 48, 0.3))' }}
          />
          <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#30FF30', marginBottom: '0.5rem', textAlign: 'center', textShadow: '0 0 10px #30FF30' }}>{t('common.appName')}</h1>
          <p style={{ color: '#22BB22', marginBottom: '1.5rem', textAlign: 'center' }}>{t('common.subtitle')}</p>

          {error && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem', border: '1px solid #FEE2E2' }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {authState === 'reset-password' ? (
              <ResetPasswordForm
                token={resetPasswordToken}
                onSuccess={handleResetPasswordSuccess}
                onBack={handleBackToLogin}
              />
            ) : authState === 'forgot-password' ? (
              <ForgotPasswordForm
                onSubmit={handleForgotPassword}
                onBack={handleBackToLogin}
                loading={loading}
                error={error}
                success={forgotPasswordSuccess}
              />
            ) : authState === 'login' ? (
              <LoginForm
                onSubmit={onLogin}
                onForgotPassword={() => setAuthState('forgot-password')}
                loading={loading}
                error={error}
                t={t}
              />
            ) : (
              <RegisterForm onSubmit={onRegister} loading={loading} error={error} t={t} countries={countries} />
            )}

            {authState !== 'forgot-password' && (
              <p style={{ textAlign: 'center', color: '#6B7280', fontSize: '0.875rem' }}>
                {authState === 'login' ? t('auth.dontHaveAccount') : t('auth.alreadyHaveAccount')}{' '}
                <button
                  onClick={() => { setAuthState(authState === 'login' ? 'register' : 'login'); }}
                  style={{ color: '#4F46E5', textDecoration: 'underline', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {authState === 'login' ? t('auth.signUp') : t('auth.signIn')}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>

      <footer style={{
        padding: '1rem',
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#6B7280',
        borderTop: '1px solid #E5E7EB',
        background: '#F9FAFB'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto' }}>
          <p style={{ margin: 0 }}>
            Matrix Delivery v1.0.0 | Commit: 0cc5c8d | {new Date().toLocaleDateString()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AuthScreen;
