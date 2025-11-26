import React, { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useI18n } from '../../i18n/i18nContext';

// Initialize Stripe (this would typically come from environment variables)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder');

const PaymentForm = ({ amount, currency = 'usd', onSuccess, onError, orderId }) => {
  const { t } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe not initialized');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?orderId=${orderId}`,
        },
        redirect: 'if_required'
      });

      if (error) {
        setMessage(error.message);
        onError(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setMessage('Payment successful!');
        onSuccess(paymentIntent);
      } else {
        setMessage('Payment processing...');
      }
    } catch (err) {
      setMessage('An unexpected error occurred.');
      onError(err.message);
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      <PaymentElement
        options={{
          layout: 'tabs'
        }}
      />

      {message && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          background: message.includes('successful') ? '#D1FAE5' : '#FEF2F2',
          color: message.includes('successful') ? '#065F46' : '#991B1B',
          border: `1px solid ${message.includes('successful') ? '#A7F3D0' : '#FEE2E2'}`
        }}>
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%',
          marginTop: '1rem',
          padding: '0.75rem',
          background: '#4F46E5',
          color: 'white',
          border: 'none',
          borderRadius: '0.375rem',
          fontWeight: '600',
          cursor: 'pointer',
          opacity: !stripe || loading ? 0.5 : 1
        }}
      >
        {loading ? t('payments.processing') : `Pay ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`}
      </button>
    </form>
  );
};

const StripePaymentForm = ({ clientSecret, amount, currency, onSuccess, onError, orderId }) => {
  const { t } = useI18n();

  if (!clientSecret) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        color: '#6B7280'
      }}>
        {t('payments.loading')}
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#4F46E5',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <div style={{
        maxWidth: '400px',
        margin: '0 auto',
        padding: '1rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#1F2937',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          {t('payments.completePayment')}
        </h3>
        <PaymentForm
          amount={amount}
          currency={currency}
          onSuccess={onSuccess}
          onError={onError}
          orderId={orderId}
        />
      </div>
    </Elements>
  );
};

export default StripePaymentForm;
