/**
 * WalletForm Component
 * Form for creating and editing platform wallets
 * 
 * Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 5.2, 5.3
 */

import React, { useState } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { PlatformWallet, WalletFormData, PaymentMethodType } from '../../services/api/types';

export interface WalletFormProps {
    wallet?: PlatformWallet; // undefined for create, defined for edit
    onSubmit: (data: WalletFormData) => Promise<void>;
    onCancel: () => void;
    loading?: boolean;
}

// Payment method options
const PAYMENT_METHOD_OPTIONS: Array<{ value: PaymentMethodType; label: string; type: 'smart_wallet' | 'instapay' }> = [
    { value: 'vodafone_cash', label: 'Vodafone Cash', type: 'smart_wallet' },
    { value: 'orange_money', label: 'Orange Money', type: 'smart_wallet' },
    { value: 'etisalat_cash', label: 'Etisalat Cash', type: 'smart_wallet' },
    { value: 'we_pay', label: 'WE Pay', type: 'smart_wallet' },
    { value: 'instapay', label: 'InstaPay', type: 'instapay' }
];

interface FormErrors {
    paymentMethod?: string;
    phoneNumber?: string;
    instapayAlias?: string;
    holderName?: string;
    dailyLimit?: string;
    monthlyLimit?: string;
}

export const WalletForm: React.FC<WalletFormProps> = ({
    wallet,
    onSubmit,
    onCancel,
    loading = false
}) => {
    const isEditing = !!wallet;
    
    // Form state
    const [formData, setFormData] = useState<WalletFormData>({
        paymentMethod: wallet?.paymentMethod || 'vodafone_cash',
        phoneNumber: wallet?.phoneNumber || '',
        instapayAlias: wallet?.instapayAlias || '',
        holderName: wallet?.holderName || '',
        dailyLimit: wallet?.dailyLimit || 50000,
        monthlyLimit: wallet?.monthlyLimit || 500000
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [submitError, setSubmitError] = useState<string>('');

    // Get selected payment method config
    const selectedMethodConfig = PAYMENT_METHOD_OPTIONS.find(
        option => option.value === formData.paymentMethod
    );

    // Validation function
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Payment method is required
        if (!formData.paymentMethod) {
            newErrors.paymentMethod = 'Please select a payment method';
        }

        // Holder name is required
        if (!formData.holderName.trim()) {
            newErrors.holderName = 'Holder name is required';
        }

        // Conditional validation based on payment method
        if (selectedMethodConfig?.type === 'smart_wallet') {
            if (!formData.phoneNumber?.trim()) {
                newErrors.phoneNumber = 'Phone number is required for smart wallets';
            } else if (!/^\d{10,15}$/.test(formData.phoneNumber.replace(/\D/g, ''))) {
                newErrors.phoneNumber = 'Please enter a valid phone number';
            }
        } else if (selectedMethodConfig?.type === 'instapay') {
            if (!formData.instapayAlias?.trim()) {
                newErrors.instapayAlias = 'InstaPay alias is required';
            }
        }

        // Validate limits
        if (formData.dailyLimit <= 0) {
            newErrors.dailyLimit = 'Daily limit must be a positive number';
        }

        if (formData.monthlyLimit <= 0) {
            newErrors.monthlyLimit = 'Monthly limit must be a positive number';
        }

        if (formData.dailyLimit > formData.monthlyLimit) {
            newErrors.dailyLimit = 'Daily limit cannot exceed monthly limit';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        try {
            setSubmitError('');
            await onSubmit(formData);
        } catch (error: any) {
            setSubmitError(error.message || 'Failed to save wallet');
        }
    };

    // Handle input changes
    const handleInputChange = (field: keyof WalletFormData, value: string | number) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    // Handle payment method change
    const handlePaymentMethodChange = (value: PaymentMethodType) => {
        setFormData(prev => ({
            ...prev,
            paymentMethod: value,
            // Clear fields that don't apply to new method
            phoneNumber: '',
            instapayAlias: ''
        }));

        // Clear related errors
        setErrors(prev => ({
            ...prev,
            paymentMethod: undefined,
            phoneNumber: undefined,
            instapayAlias: undefined
        }));
    };

    return (
        <div className="wallet-form-overlay" data-testid="wallet-form-overlay">
            <div className="wallet-form-modal" data-testid="wallet-form-modal">
                {/* Header */}
                <div className="form-header" data-testid="form-header">
                    <h2 className="form-title">
                        {isEditing ? 'Edit Platform Wallet' : 'Add Platform Wallet'}
                    </h2>
                    <button
                        onClick={onCancel}
                        className="close-button"
                        data-testid="close-button"
                        disabled={loading}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="wallet-form" data-testid="wallet-form">
                    {/* Payment Method */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="paymentMethod">
                            Payment Method *
                        </label>
                        <select
                            id="paymentMethod"
                            value={formData.paymentMethod}
                            onChange={(e) => handlePaymentMethodChange(e.target.value as PaymentMethodType)}
                            className={`form-input ${errors.paymentMethod ? 'error' : ''}`}
                            data-testid="payment-method-select"
                            disabled={isEditing || loading} // Disable when editing
                        >
                            {PAYMENT_METHOD_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        {errors.paymentMethod && (
                            <span className="error-message" data-testid="payment-method-error">
                                {errors.paymentMethod}
                            </span>
                        )}
                    </div>

                    {/* Conditional Fields */}
                    {selectedMethodConfig?.type === 'smart_wallet' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="phoneNumber">
                                Phone Number *
                            </label>
                            <input
                                type="tel"
                                id="phoneNumber"
                                value={formData.phoneNumber}
                                onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                                placeholder="e.g., 01012345678"
                                className={`form-input ${errors.phoneNumber ? 'error' : ''}`}
                                data-testid="phone-number-input"
                                disabled={loading}
                            />
                            {errors.phoneNumber && (
                                <span className="error-message" data-testid="phone-number-error">
                                    {errors.phoneNumber}
                                </span>
                            )}
                        </div>
                    )}

                    {selectedMethodConfig?.type === 'instapay' && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="instapayAlias">
                                InstaPay Alias *
                            </label>
                            <input
                                type="text"
                                id="instapayAlias"
                                value={formData.instapayAlias}
                                onChange={(e) => handleInputChange('instapayAlias', e.target.value)}
                                placeholder="e.g., matrix@instapay"
                                className={`form-input ${errors.instapayAlias ? 'error' : ''}`}
                                data-testid="instapay-alias-input"
                                disabled={loading}
                            />
                            {errors.instapayAlias && (
                                <span className="error-message" data-testid="instapay-alias-error">
                                    {errors.instapayAlias}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Holder Name */}
                    <div className="form-group">
                        <label className="form-label" htmlFor="holderName">
                            Account Holder Name *
                        </label>
                        <input
                            type="text"
                            id="holderName"
                            value={formData.holderName}
                            onChange={(e) => handleInputChange('holderName', e.target.value)}
                            placeholder="e.g., Matrix Delivery LLC"
                            className={`form-input ${errors.holderName ? 'error' : ''}`}
                            data-testid="holder-name-input"
                            disabled={loading}
                        />
                        {errors.holderName && (
                            <span className="error-message" data-testid="holder-name-error">
                                {errors.holderName}
                            </span>
                        )}
                    </div>

                    {/* Limits */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label" htmlFor="dailyLimit">
                                Daily Limit (EGP) *
                            </label>
                            <input
                                type="number"
                                id="dailyLimit"
                                value={formData.dailyLimit}
                                onChange={(e) => handleInputChange('dailyLimit', parseFloat(e.target.value) || 0)}
                                min="1"
                                step="1"
                                className={`form-input ${errors.dailyLimit ? 'error' : ''}`}
                                data-testid="daily-limit-input"
                                disabled={loading}
                            />
                            {errors.dailyLimit && (
                                <span className="error-message" data-testid="daily-limit-error">
                                    {errors.dailyLimit}
                                </span>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="monthlyLimit">
                                Monthly Limit (EGP) *
                            </label>
                            <input
                                type="number"
                                id="monthlyLimit"
                                value={formData.monthlyLimit}
                                onChange={(e) => handleInputChange('monthlyLimit', parseFloat(e.target.value) || 0)}
                                min="1"
                                step="1"
                                className={`form-input ${errors.monthlyLimit ? 'error' : ''}`}
                                data-testid="monthly-limit-input"
                                disabled={loading}
                            />
                            {errors.monthlyLimit && (
                                <span className="error-message" data-testid="monthly-limit-error">
                                    {errors.monthlyLimit}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Submit Error */}
                    {submitError && (
                        <div className="submit-error" data-testid="submit-error">
                            <AlertCircle size={16} />
                            <span>{submitError}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="form-actions" data-testid="form-actions">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="cancel-button"
                            data-testid="cancel-button"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="submit-button"
                            data-testid="submit-button"
                            disabled={loading}
                        >
                            {loading ? (
                                <span>Saving...</span>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>{isEditing ? 'Update Wallet' : 'Create Wallet'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <style>{`
                    .wallet-form-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.7);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 1rem;
                    }

                    .wallet-form-modal {
                        background: var(--matrix-surface);
                        border: 2px solid var(--matrix-border);
                        border-radius: 0.75rem;
                        width: 100%;
                        max-width: 600px;
                        max-height: 90vh;
                        overflow-y: auto;
                    }

                    .form-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 1.5rem;
                        border-bottom: 1px solid var(--matrix-border);
                    }

                    .form-title {
                        color: var(--matrix-bright-green);
                        font-size: 1.25rem;
                        font-weight: 600;
                        margin: 0;
                    }

                    .close-button {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 32px;
                        height: 32px;
                        border: none;
                        border-radius: 0.5rem;
                        background: transparent;
                        color: var(--matrix-secondary);
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .close-button:hover:not(:disabled) {
                        background: var(--matrix-dark-green);
                        color: var(--matrix-bright-green);
                    }

                    .close-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .wallet-form {
                        padding: 1.5rem;
                        display: flex;
                        flex-direction: column;
                        gap: 1.5rem;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .form-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 1rem;
                    }

                    .form-label {
                        color: var(--matrix-bright-green);
                        font-weight: 500;
                        font-size: 0.875rem;
                    }

                    .form-input {
                        padding: 0.75rem;
                        border: 1px solid var(--matrix-border);
                        border-radius: 0.5rem;
                        background: var(--matrix-bg);
                        color: var(--matrix-bright-green);
                        font-size: 0.875rem;
                        transition: border-color 0.2s ease;
                    }

                    .form-input:focus {
                        outline: none;
                        border-color: var(--matrix-green);
                    }

                    .form-input:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    .form-input.error {
                        border-color: #EF4444;
                    }

                    .error-message {
                        color: #EF4444;
                        font-size: 0.75rem;
                        display: flex;
                        align-items: center;
                        gap: 0.25rem;
                    }

                    .submit-error {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem;
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid #EF4444;
                        border-radius: 0.5rem;
                        color: #EF4444;
                        font-size: 0.875rem;
                    }

                    .form-actions {
                        display: flex;
                        gap: 1rem;
                        justify-content: flex-end;
                        padding-top: 1rem;
                        border-top: 1px solid var(--matrix-border);
                    }

                    .cancel-button {
                        padding: 0.75rem 1.5rem;
                        border: 1px solid var(--matrix-border);
                        border-radius: 0.5rem;
                        background: transparent;
                        color: var(--matrix-secondary);
                        cursor: pointer;
                        font-weight: 500;
                        transition: all 0.2s ease;
                    }

                    .cancel-button:hover:not(:disabled) {
                        background: var(--matrix-dark-green);
                        color: var(--matrix-bright-green);
                        border-color: var(--matrix-green);
                    }

                    .cancel-button:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .submit-button {
                        display: flex;
                        align-items: center;
                        gap: 0.5rem;
                        padding: 0.75rem 1.5rem;
                        border: none;
                        border-radius: 0.5rem;
                        background: var(--matrix-green);
                        color: var(--matrix-black);
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.2s ease;
                    }

                    .submit-button:hover:not(:disabled) {
                        background: var(--matrix-bright-green);
                    }

                    .submit-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                    }

                    /* Responsive */
                    @media (max-width: 768px) {
                        .wallet-form-modal {
                            margin: 0;
                            border-radius: 0;
                            max-height: 100vh;
                        }

                        .form-row {
                            grid-template-columns: 1fr;
                        }

                        .form-actions {
                            flex-direction: column-reverse;
                        }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default WalletForm;