import React, { useState, useEffect } from 'react';
import api from '../../api';
import './PaymobCheckout.css';

interface PaymobCheckoutProps {
    orderId: string;
    amount: number;
    paymentMethod: 'card' | 'wallet';
    onSuccess: (data: any) => void;
    onError: (error: string) => void;
    onCancel?: () => void;
}

const PaymobCheckout: React.FC<PaymobCheckoutProps> = ({
    orderId,
    amount,
    paymentMethod,
    onSuccess,
    onError,
    onCancel
}) => {
    const [loading, setLoading] = useState(true);
    const [iframeUrl, setIframeUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        initiatePayment();

        // Cleanup
        return () => {
            window.removeEventListener('message', handlePaymentMessage);
        };
    }, []);

    const initiatePayment = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.post('/payments/paymob/create', {
                orderId,
                amount,
                paymentMethod
            });

            if (response.data.success) {
                setIframeUrl(response.data.iframeUrl);
                setLoading(false);

                // Listen for payment completion messages
                window.addEventListener('message', handlePaymentMessage);
            } else {
                throw new Error('Failed to create payment');
            }
        } catch (err: any) {
            console.error('Payment initiation failed:', err);
            const errorMessage = err.response?.data?.error || err.message || 'Failed to initiate payment';
            setError(errorMessage);
            setLoading(false);
            onError(errorMessage);
        }
    };

    const handlePaymentMessage = (event: MessageEvent) => {
        // Paymob sends postMessage when payment completes
        // Verify origin for security
        if (event.origin !== 'https://accept.paymob.com') {
            return;
        }

        const data = event.data;

        if (data.success || data.status === 'success') {
            onSuccess(data);
        } else if (data.error || data.status === 'failed') {
            onError(data.message || 'Payment failed');
        }
    };

    const handleRetry = () => {
        initiatePayment();
    };

    if (loading) {
        return (
            <div className="paymob-checkout">
                <div className="payment-loading">
                    <div className="loading-spinner"></div>
                    <p>Preparing secure payment...</p>
                    <p className="loading-subtext">Please wait while we connect to the payment gateway</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="paymob-checkout">
                <div className="payment-error">
                    <div className="error-icon">⚠️</div>
                    <h3>Payment Error</h3>
                    <p>{error}</p>
                    <div className="error-actions">
                        <button onClick={handleRetry} className="btn-retry">
                            Try Again
                        </button>
                        {onCancel && (
                            <button onClick={onCancel} className="btn-cancel">
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="paymob-checkout">
            <div className="payment-header">
                <h3>Complete Your Payment</h3>
                <p className="payment-amount">Amount: {amount.toFixed(2)} EGP</p>
                <p className="payment-method-info">
                    {paymentMethod === 'card' ? '💳 Credit/Debit Card' : '📱 Mobile Wallet'}
                </p>
            </div>

            <div className="iframe-container">
                {iframeUrl && (
                    <iframe
                        src={iframeUrl}
                        width="100%"
                        height="600px"
                        frameBorder="0"
                        title="Paymob Payment"
                        className="payment-iframe"
                        allow="payment"
                    />
                )}
            </div>

            <div className="payment-footer">
                <div className="security-badge">
                    <span className="lock-icon">🔒</span>
                    <span>Secured by Paymob</span>
                </div>
                {onCancel && (
                    <button onClick={onCancel} className="btn-cancel-footer">
                        Cancel Payment
                    </button>
                )}
            </div>
        </div>
    );
};

export default PaymobCheckout;
