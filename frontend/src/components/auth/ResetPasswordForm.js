import React, { useState, useEffect } from 'react';
import { useI18n } from '../../i18n/i18nContext';
import { useAuth } from '../../hooks/useAuth';

const ResetPasswordForm = ({ token, onSuccess, onBack }) => {
  const { t } = useI18n();
  const { handleResetPassword, loading, error, setError } = useAuth();

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [token, setToken] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }
  }, [token, setError]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.password || !formData.confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const success = await handleResetPassword(token, formData.password);
    if (success) {
      setSuccess(true);
      setTimeout(() => {
        onSuccess && onSuccess();
      }, 3000);
    }
  };

  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090909',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div className="card-matrix" style={{
          position: 'relative',
          borderRadius: '0.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 48, 0, 0.2), inset 0 0 20px rgba(48, 255, 48, 0.1)',
          padding: '2rem',
          maxWidth: '28rem',
          width: '100%',
          background: 'linear-gradient(135deg, #000000 0%, #111111 100%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#30FF30', marginBottom: '1rem' }}>
            {t('auth.passwordResetSuccess')}
          </h2>
          <p style={{ color: '#22BB22', marginBottom: '1rem' }}>
            {t('auth.passwordResetSuccessMessage')}
          </p>
          <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
            {t('auth.redirectingToLogin')}
          </p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090909',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}>
        <div className="card-matrix" style={{
          position: 'relative',
          borderRadius: '0.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 48, 0, 0.2), inset 0 0 20px rgba(48, 255, 48, 0.1)',
          padding: '2rem',
          maxWidth: '28rem',
          width: '100%',
          background: 'linear-gradient(135deg, #000000 0%, #111111 100%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>❌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF3030', marginBottom: '1rem' }}>
            {t('auth.invalidResetLink')}
          </h2>
          <p style={{ color: '#BB2222', marginBottom: '2rem' }}>
            {t('auth.invalidResetLinkMessage')}
          </p>
          <button
            onClick={onBack}
            style={{
              background: '#4F46E5',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            {t('auth.backToLogin')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090909',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="card-matrix" style={{
        position: 'relative',
        borderRadius: '0.5rem',
        boxShadow: '0 20px 25px -5px rgba(0, 48, 0, 0.2), inset 0 0 20px rgba(48, 255, 48, 0.1)',
        padding: '2rem',
        maxWidth: '28rem',
        width: '100%',
        background: 'linear-gradient(135deg, #000000 0%, #111111 100%)'
      }}>
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              fontSize: '1.5rem'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>🔐</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#30FF30', marginBottom: '0.5rem', textAlign: 'center' }}>
          {t('auth.resetYourPassword')}
        </h2>
        <p style={{ color: '#22BB22', marginBottom: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          {t('auth.enterNewPassword')}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder={t('auth.newPassword')}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 3rem 0.75rem 1rem',
                border: '1px solid #D1D5DB',
                borderRadius: '0.5rem',
                outline: 'none',
                fontSize: '1rem',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white'
              }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          <input
            type="password"
            placeholder={t('auth.confirmNewPassword')}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid #D1D5DB',
              borderRadius: '0.5rem',
              outline: 'none',
              fontSize: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white'
            }}
            required
          />

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
            disabled={loading || !formData.password || !formData.confirmPassword}
            style={{
              width: '100%',
              background: '#4F46E5',
              color: 'white',
              padding: '0.75rem',
              borderRadius: '0.5rem',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
              opacity: loading || !formData.password || !formData.confirmPassword ? 0.5 : 1
            }}
          >
            {loading ? t('auth.resetting') : t('auth.resetPassword')}
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
      </div>
    </div>
  );
};

export default ResetPasswordForm;
