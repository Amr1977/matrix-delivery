/**
 * Deposit Modal Component
 * Modal for depositing funds into balance
 */

import React, { useState } from 'react';
import { useBalance } from '../../hooks/useBalance';
import PaymentMethodSelector from '../payments/PaymentMethodSelector';
import './DepositModal.css';

interface DepositModalProps {
    userId: number;
    currentBalance: number;
    currency: string;
    onClose: () => void;
    onSuccess: () => void;
}

const DepositModal: React.FC<DepositModalProps> = ({
    userId,
    currentBalance,
    currency,
    onClose,
    onSuccess
}) => {
    const { deposit, loading, error, clearError } = useBalance();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('Balance deposit');
    const [step, setStep] = useState<'amount' | 'payment' | 'processing' | 'success'>('amount');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
    const [validationError, setValidationError] = useState('');

    const MIN_DEPOSIT = 1;
    const MAX_DEPOSIT = 100000;

    const validateAmount = (value: string): boolean => {
        const numValue = parseFloat(value);

        if (isNaN(numValue) || numValue <= 0) {
            setValidationError('Amount must be positive');
            return false;
        }

        if (numValue < MIN_DEPOSIT) {
            setValidationError(`Minimum deposit is ${MIN_DEPOSIT} ${currency}`);
            return false;
        }

        if (numValue > MAX_DEPOSIT) {
            setValidationError(`Maximum deposit is ${MAX_DEPOSIT.toLocaleString()} ${currency}`);
            return false;
        }

        setValidationError('');
        return true;
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setAmount(value);
        if (value) {
            validateAmount(value);
        } else {
            setValidationError('');
        }
    };

    const handleContinue = () => {
        if (validateAmount(amount)) {
            setStep('payment');
        }
    };

    const handlePaymentMethodSelect = (method: any) => {
        setSelectedPaymentMethod(method);
    };

    const handleDeposit = async () => {
        if (!selectedPaymentMethod) {
            setValidationError('Please select a payment method');
            return;
        }

        setStep('processing');
        clearError();

        try {
            await deposit(userId, parseFloat(amount), description);
            setStep('success');
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setStep('payment');
        }
    };

    const handleClose = () => {
        if (step !== 'processing') {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>💵 Deposit Funds</h2>
                    <button className="close-btn" onClick={handleClose} disabled={step === 'processing'}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {step === 'amount' && (
                        <div className="amount-step">
                            <div className="current-balance">
                                <span className="label">Current Balance:</span>
                                <span className="value">{currentBalance.toFixed(2)} {currency}</span>
                            </div>

                            <div className="form-group">
                                <label htmlFor="deposit-amount">Deposit Amount</label>
                                <div className="amount-input-wrapper">
                                    <input
                                        id="deposit-amount"
                                        type="number"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        placeholder="0.00"
                                        min={MIN_DEPOSIT}
                                        max={MAX_DEPOSIT}
                                        step="0.01"
                                        autoFocus
                                    />
                                    <span className="currency-label">{currency}</span>
                                </div>
                                {validationError && (
                                    <div className="validation-error">{validationError}</div>
                                )}
                                <div className="input-hint">
                                    Min: {MIN_DEPOSIT} {currency} | Max: {MAX_DEPOSIT.toLocaleString()} {currency}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="deposit-description">Description (Optional)</label>
                                <input
                                    id="deposit-description"
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., Monthly top-up"
                                    maxLength={200}
                                />
                            </div>

                            <div className="quick-amounts">
                                <span className="quick-label">Quick amounts:</span>
                                {[100, 500, 1000, 5000].map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        className="quick-amount-btn"
                                        onClick={() => {
                                            setAmount(quickAmount.toString());
                                            validateAmount(quickAmount.toString());
                                        }}
                                    >
                                        {quickAmount} {currency}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="payment-step">
                            <div className="deposit-summary">
                                <div className="summary-row">
                                    <span>Deposit Amount:</span>
                                    <span className="amount">{parseFloat(amount).toFixed(2)} {currency}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>New Balance:</span>
                                    <span className="amount">{(currentBalance + parseFloat(amount)).toFixed(2)} {currency}</span>
                                </div>
                            </div>

                            <PaymentMethodSelector
                                onSelect={handlePaymentMethodSelect}
                                amount={parseFloat(amount)}
                                currency={currency}
                            />

                            {error && (
                                <div className="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="processing-step">
                            <div className="spinner"></div>
                            <h3>Processing Deposit...</h3>
                            <p>Please wait while we process your deposit.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="success-step">
                            <div className="success-icon">✅</div>
                            <h3>Deposit Successful!</h3>
                            <p>Your balance has been updated.</p>
                            <div className="success-amount">
                                +{parseFloat(amount).toFixed(2)} {currency}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    {step === 'amount' && (
                        <>
                            <button className="btn btn-secondary" onClick={handleClose}>
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleContinue}
                                disabled={!amount || !!validationError}
                            >
                                Continue
                            </button>
                        </>
                    )}

                    {step === 'payment' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('amount')}>
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDeposit}
                                disabled={!selectedPaymentMethod || loading}
                            >
                                {loading ? 'Processing...' : 'Confirm Deposit'}
                            </button>
                        </>
                    )}

                    {step === 'success' && (
                        <button className="btn btn-primary" onClick={onSuccess}>
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepositModal;
