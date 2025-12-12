import React, { useState } from 'react';
import './PaymentMethodSelector.css';

interface PaymentMethod {
    id: string;
    name: string;
    icon: string;
    fee: string;
    description: string;
    type: 'card' | 'wallet' | 'cod';
}

interface PaymentMethodSelectorProps {
    onSelect: (method: PaymentMethod) => void;
    amount: number;
    currency?: string;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
    onSelect,
    amount,
    currency = 'EGP'
}) => {
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

    const paymentMethods: PaymentMethod[] = [
        {
            id: 'card',
            name: 'Credit/Debit Card',
            icon: '💳',
            fee: '2.5%',
            description: 'Visa, Mastercard, Amex',
            type: 'card'
        },
        {
            id: 'vodafone',
            name: 'Vodafone Cash',
            icon: '📱',
            fee: '2.5%',
            description: 'Pay with Vodafone wallet',
            type: 'wallet'
        },
        {
            id: 'orange',
            name: 'Orange Cash',
            icon: '🍊',
            fee: '2.5%',
            description: 'Pay with Orange wallet',
            type: 'wallet'
        },
        {
            id: 'etisalat',
            name: 'Etisalat Cash',
            icon: '💚',
            fee: '2.5%',
            description: 'Pay with Etisalat wallet',
            type: 'wallet'
        },
        {
            id: 'cod',
            name: 'Cash on Delivery',
            icon: '💵',
            fee: 'Free',
            description: 'Pay when you receive',
            type: 'cod'
        }
    ];

    const handleMethodSelect = (method: PaymentMethod) => {
        setSelectedMethod(method);
        onSelect(method);
    };

    const calculateTotal = (method: PaymentMethod): number => {
        if (method.type === 'cod') {
            return amount;
        }
        return amount * 1.025; // 2.5% fee
    };

    const calculateFee = (method: PaymentMethod): number => {
        if (method.type === 'cod') {
            return 0;
        }
        return amount * 0.025;
    };

    return (
        <div className="payment-method-selector">
            <h3 className="selector-title">Select Payment Method</h3>

            <div className="payment-methods-grid">
                {paymentMethods.map(method => (
                    <div
                        key={method.id}
                        className={`payment-method-card ${selectedMethod?.id === method.id ? 'selected' : ''}`}
                        onClick={() => handleMethodSelect(method)}
                    >
                        <div className="method-icon">{method.icon}</div>
                        <div className="method-info">
                            <div className="method-name">{method.name}</div>
                            <div className="method-description">{method.description}</div>
                            <div className="method-fee">Fee: {method.fee}</div>
                        </div>
                        {selectedMethod?.id === method.id && (
                            <div className="selected-indicator">✓</div>
                        )}
                    </div>
                ))}
            </div>

            {selectedMethod && (
                <div className="payment-summary">
                    <div className="summary-title">Payment Summary</div>
                    <div className="summary-row">
                        <span>Order Amount:</span>
                        <span>{amount.toFixed(2)} {currency}</span>
                    </div>
                    {selectedMethod.type !== 'cod' && (
                        <div className="summary-row fee-row">
                            <span>Processing Fee ({selectedMethod.fee}):</span>
                            <span>{calculateFee(selectedMethod).toFixed(2)} {currency}</span>
                        </div>
                    )}
                    <div className="summary-row total-row">
                        <span>Total:</span>
                        <span className="total-amount">{calculateTotal(selectedMethod).toFixed(2)} {currency}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethodSelector;
