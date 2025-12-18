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
        <div className="modal-overlay" onClick={handleClose} data-testid="deposit-modal-overlay">
            <div className="deposit-modal" onClick={(e) => e.stopPropagation()} data-testid="deposit-modal">
                <div className="modal-header" data-testid="modal-header">
                    <h2 data-testid="modal-title">💵 Deposit Funds</h2>
                    <button className="close-btn" onClick={handleClose} disabled={step === 'processing'} data-testid="close-button">
                        ×
                    </button>
                </div>

                <div className="modal-body" data-testid="modal-body">
                    {step === 'amount' && (
                        <div className="amount-step" data-testid="amount-step">
                            <div className="current-balance" data-testid="current-balance">
                                <span className="label">Current Balance:</span>
                                <span className="value" data-testid="current-balance-value">{currentBalance.toFixed(2)} {currency}</span>
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
                                        data-testid="deposit-amount-input"
                                    />
                                    <span className="currency-label">{currency}</span>
                                </div>
                                {validationError && (
                                    <div className="validation-error" data-testid="validation-error">{validationError}</div>
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
                                    data-testid="deposit-description-input"
                                />
                            </div>

                            <div className="quick-amounts" data-testid="quick-amounts">
                                <span className="quick-label">Quick amounts:</span>
                                {[100, 500, 1000, 5000].map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        className="quick-amount-btn"
                                        onClick={() => {
                                            setAmount(quickAmount.toString());
                                            validateAmount(quickAmount.toString());
                                        }}
                                        data-testid={`quick-amount-${quickAmount}`}
                                    >
                                        {quickAmount} {currency}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="payment-step" data-testid="payment-step">
                            <div className="deposit-summary" data-testid="deposit-summary">
                                <div className="summary-row">
                                    <span>Deposit Amount:</span>
                                    <span className="amount" data-testid="summary-amount">{parseFloat(amount).toFixed(2)} {currency}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>New Balance:</span>
                                    <span className="amount" data-testid="summary-new-balance">{(currentBalance + parseFloat(amount)).toFixed(2)} {currency}</span>
                                </div>
                            </div>

                            <PaymentMethodSelector
                                onSelect={handlePaymentMethodSelect}
                                amount={parseFloat(amount)}
                                currency={currency}
                            />

                            {error && (
                                <div className="error-message" data-testid="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {error}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="processing-step" data-testid="processing-step">
                            <div className="spinner" data-testid="processing-spinner"></div>
                            <h3 data-testid="processing-title">Processing Deposit...</h3>
                            <p>Please wait while we process your deposit.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="success-step" data-testid="success-step">
                            <div className="success-icon">✅</div>
                            <h3 data-testid="success-title">Deposit Successful!</h3>
                            <p data-testid="success-message">Your balance has been updated.</p>
                            <div className="success-amount" data-testid="success-amount">
                                +{parseFloat(amount).toFixed(2)} {currency}
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer" data-testid="modal-footer">
                    {step === 'amount' && (
                        <>
                            <button className="btn btn-secondary" onClick={handleClose} data-testid="cancel-button">
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleContinue}
                                disabled={!amount || !!validationError}
                                data-testid="continue-button"
                            >
                                Continue
                            </button>
                        </>
                    )}

                    {step === 'payment' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('amount')} data-testid="back-button">
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleDeposit}
                                disabled={!selectedPaymentMethod || loading}
                                data-testid="confirm-deposit-button"
                            >
                                {loading ? 'Processing...' : 'Confirm Deposit'}
                            </button>
                        </>
                    )}

                    {step === 'success' && (
                        <button className="btn btn-primary" onClick={onSuccess} data-testid="done-button">
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DepositModal;
