import React, { useState, useEffect } from 'react';
import { usePayments } from '../../hooks/usePayments';
import { useI18n } from '../../i18n/i18nContext';

const PaymentMethodsManager = () => {
  const { t } = useI18n();
  const {
    paymentMethods,
    loading,
    error,
    fetchPaymentMethods,
    deletePaymentMethod,
    setError
  } = usePayments();

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  const handleDeletePaymentMethod = async (methodId) => {
    if (window.confirm(t('payments.confirmDelete'))) {
      await deletePaymentMethod(methodId);
    }
  };

  const getCardIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatCardNumber = (lastFour) => {
    return `•••• •••• •••• ${lastFour}`;
  };

  if (loading && paymentMethods.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        {t('payments.loading')}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#1F2937'
        }}>
          {t('payments.paymentMethods')}
        </h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: '#4F46E5',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          {showAddForm ? t('common.cancel') : t('payments.addPaymentMethod')}
        </button>
      </div>

      {error && (
        <div style={{
          background: '#FEF2F2',
          color: '#991B1B',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          marginBottom: '1rem',
          fontSize: '0.875rem',
          border: '1px solid #FEE2E2'
        }}>
          ⚠️ {error}
        </div>
      )}

      {showAddForm && (
        <div style={{
          background: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: '1rem'
          }}>
            {t('payments.addNewCard')}
          </h3>
          <p style={{
            color: '#6B7280',
            fontSize: '0.875rem',
            marginBottom: '1rem'
          }}>
            {t('payments.addCardInstructions')}
          </p>
          {/* Note: In a real implementation, you would integrate with Stripe Elements here */}
          <div style={{
            background: '#FFF',
            border: '1px solid #D1D5DB',
            borderRadius: '0.375rem',
            padding: '1rem',
            textAlign: 'center',
            color: '#6B7280'
          }}>
            {t('payments.stripeIntegrationRequired')}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '2rem' }}>
        {paymentMethods.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#6B7280'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</div>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: '#1F2937',
              marginBottom: '0.5rem'
            }}>
              {t('payments.noPaymentMethods')}
            </h3>
            <p style={{ fontSize: '0.875rem' }}>
              {t('payments.addFirstPaymentMethod')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                style={{
                  background: '#FFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>
                    {getCardIcon(method.type)}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#1F2937'
                    }}>
                      {formatCardNumber(method.lastFour)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: '#6B7280'
                    }}>
                      {method.type} • Expires {method.expiryMonth}/{method.expiryYear}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {method.isDefault && (
                    <span style={{
                      background: '#D1FAE5',
                      color: '#065F46',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      {t('payments.default')}
                    </span>
                  )}
                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    style={{
                      background: '#FEF2F2',
                      color: '#991B1B',
                      border: '1px solid #FEE2E2',
                      borderRadius: '0.375rem',
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{
        background: '#F9FAFB',
        border: '1px solid #E5E7EB',
        borderRadius: '0.5rem',
        padding: '1rem'
      }}>
        <h4 style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: '#1F2937',
          marginBottom: '0.5rem'
        }}>
          {t('payments.security')}
        </h4>
        <p style={{
          fontSize: '0.75rem',
          color: '#6B7280',
          margin: 0
        }}>
          {t('payments.securityDescription')}
        </p>
      </div>
    </div>
  );
};

export default PaymentMethodsManager;
