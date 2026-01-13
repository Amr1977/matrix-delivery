import React, { useState } from 'react';
import './PaymentMethodSelector.css';

/**
 * Payment method types for Egypt Phase 1
 * - smart_wallets: Combined entry for Vodafone Cash, Orange Money, Etisalat Cash, WE Pay
 * - instapay: Egypt's national instant payment network
 */
export type PaymentMethodType = 'smart_wallets' | 'instapay';

export interface PaymentMethod {
    id: string;
    name: string;
    nameAr: string;
    icon: string;
    description: string;
    descriptionAr: string;
    type: PaymentMethodType;
}

export interface PaymentMethodSelectorProps {
    onSelect: (method: PaymentMethod) => void;
    selectedMethodId?: string;
    language?: 'en' | 'ar';
}

/**
 * Egypt Phase 1 payment methods
 * - Smart Wallets: Combined entry for all mobile wallets (they can send/receive from each other)
 * - InstaPay: Bank transfers via Egypt's national instant payment network
 * 
 * Note: Card, crypto, and COD options removed for Phase 1
 * No gateway fees for manual transfers
 */
export const EGYPT_PAYMENT_METHODS: PaymentMethod[] = [
    {
        id: 'smart_wallets',
        name: 'Smart Wallets',
        nameAr: 'المحافظ الذكية',
        icon: '📱',
        description: 'Vodafone Cash, Orange Money, Etisalat Cash, WE Pay',
        descriptionAr: 'فودافون كاش، أورانج موني، اتصالات كاش، وي باي',
        type: 'smart_wallets'
    },
    {
        id: 'instapay',
        name: 'InstaPay',
        nameAr: 'انستاباي',
        icon: '🏦',
        description: 'Bank transfer via InstaPay',
        descriptionAr: 'تحويل بنكي عبر انستاباي',
        type: 'instapay'
    }
];

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
    onSelect,
    selectedMethodId,
    language = 'en'
}) => {
    const [internalSelectedId, setInternalSelectedId] = useState<string | null>(selectedMethodId || null);

    const handleMethodSelect = (method: PaymentMethod) => {
        setInternalSelectedId(method.id);
        onSelect(method);
    };

    const isArabic = language === 'ar';
    const selectedId = selectedMethodId !== undefined ? selectedMethodId : internalSelectedId;

    return (
        <div 
            className="payment-method-selector" 
            data-testid="payment-method-selector"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <h3 className="selector-title" data-testid="selector-title">
                {isArabic ? 'اختر طريقة الدفع' : 'Select Payment Method'}
            </h3>

            <div className="payment-methods-grid" data-testid="payment-methods-grid">
                {EGYPT_PAYMENT_METHODS.map(method => (
                    <div
                        key={method.id}
                        className={`payment-method-card ${selectedId === method.id ? 'selected' : ''}`}
                        onClick={() => handleMethodSelect(method)}
                        data-testid={`payment-method-${method.id}`}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleMethodSelect(method);
                            }
                        }}
                        aria-pressed={selectedId === method.id}
                        aria-label={isArabic ? method.nameAr : method.name}
                    >
                        <div className="method-icon" data-testid={`method-icon-${method.id}`}>
                            {method.icon}
                        </div>
                        <div className="method-info">
                            <div className="method-name" data-testid={`method-name-${method.id}`}>
                                {isArabic ? method.nameAr : method.name}
                            </div>
                            <div className="method-description" data-testid={`method-description-${method.id}`}>
                                {isArabic ? method.descriptionAr : method.description}
                            </div>
                        </div>
                        {selectedId === method.id && (
                            <div className="selected-indicator" data-testid={`selected-indicator-${method.id}`}>
                                ✓
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PaymentMethodSelector;
