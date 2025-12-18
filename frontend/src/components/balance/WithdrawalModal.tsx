/**
 * Withdrawal Modal Component
 * Modal for requesting fund withdrawals
 */

import React, { useState } from 'react';
import { useBalance } from '../../hooks/useBalance';
import './WithdrawalModal.css';

interface WithdrawalModalProps {
    userId: number;
    availableBalance: number;
    currency: string;
    dailyLimit: number;
    monthlyLimit: number;
    onClose: () => void;
    onSuccess: () => void;
}

type DestinationType = 'bank' | 'vodafone' | 'orange' | 'etisalat' | 'instapay';

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
    userId,
    availableBalance,
    currency,
    dailyLimit,
    monthlyLimit,
    onClose,
    onSuccess
}) => {
    const { withdraw, loading, error, clearError } = useBalance();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('Withdrawal request');
    const [destinationType, setDestinationType] = useState<DestinationType>('bank');
    const [destinationDetails, setDestinationDetails] = useState({
        accountNumber: '',
        bankName: '',
        accountHolder: '',
        walletNumber: ''
    });
    const [step, setStep] = useState<'amount' | 'destination' | 'confirm' | 'processing' | 'success'>('amount');
    const [validationError, setValidationError] = useState('');

    const MIN_WITHDRAWAL = 10;
    const MAX_WITHDRAWAL = 100000;

    const validateAmount = (value: string): boolean => {
        const numValue = parseFloat(value);

        if (isNaN(numValue) || numValue <= 0) {
            setValidationError('Amount must be positive');
            return false;
        }

        if (numValue < MIN_WITHDRAWAL) {
            setValidationError(`Minimum withdrawal is ${MIN_WITHDRAWAL} ${currency}`);
            return false;
        }

        if (numValue > MAX_WITHDRAWAL) {
            setValidationError(`Maximum withdrawal is ${MAX_WITHDRAWAL.toLocaleString()} ${currency}`);
            return false;
        }

        if (numValue > availableBalance) {
            setValidationError('Insufficient balance');
            return false;
        }

        if (numValue > dailyLimit) {
            setValidationError(`Daily limit is ${dailyLimit.toLocaleString()} ${currency}`);
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
            setStep('destination');
        }
    };

    const validateDestination = (): boolean => {
        if (destinationType === 'bank') {
            if (!destinationDetails.accountNumber || !destinationDetails.bankName || !destinationDetails.accountHolder) {
                setValidationError('All bank details are required');
                return false;
            }
        } else {
            if (!destinationDetails.walletNumber) {
                setValidationError('Wallet number is required');
                return false;
            }
        }
        setValidationError('');
        return true;
    };

    const handleConfirm = () => {
        if (validateDestination()) {
            setStep('confirm');
        }
    };

    const handleWithdraw = async () => {
        setStep('processing');
        clearError();

        const destination = destinationType === 'bank'
            ? `${destinationDetails.bankName} - ${destinationDetails.accountNumber}`
            : `${destinationType} - ${destinationDetails.walletNumber}`;

        try {
            await withdraw(userId, parseFloat(amount), destination, description);
            setStep('success');
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setStep('confirm');
        }
    };

    const handleClose = () => {
        if (step !== 'processing') {
            onClose();
        }
    };

    const destinationOptions = [
        { id: 'bank', name: 'Bank Transfer', icon: '🏦' },
        { id: 'vodafone', name: 'Vodafone Cash', icon: '📱' },
        { id: 'orange', name: 'Orange Cash', icon: '🍊' },
        { id: 'etisalat', name: 'Etisalat Cash', icon: '💚' },
        { id: 'instapay', name: 'InstaPay', icon: '⚡' }
    ];

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="withdrawal-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>💸 Withdraw Funds</h2>
                    <button className="close-btn" onClick={handleClose} disabled={step === 'processing'}>
                        ×
                    </button>
                </div>

                <div className="modal-body">
                    {step === 'amount' && (
                        <div className="amount-step">
                            <div className="balance-info">
                                <div className="info-row">
                                    <span className="label">Available Balance:</span>
                                    <span className="value">{availableBalance.toFixed(2)} {currency}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Daily Limit:</span>
                                    <span className="value">{dailyLimit.toLocaleString()} {currency}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Monthly Limit:</span>
                                    <span className="value">{monthlyLimit.toLocaleString()} {currency}</span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="withdrawal-amount">Withdrawal Amount</label>
                                <div className="amount-input-wrapper">
                                    <input
                                        id="withdrawal-amount"
                                        type="number"
                                        value={amount}
                                        onChange={handleAmountChange}
                                        placeholder="0.00"
                                        min={MIN_WITHDRAWAL}
                                        max={Math.min(availableBalance, dailyLimit, MAX_WITHDRAWAL)}
                                        step="0.01"
                                        autoFocus
                                    />
                                    <span className="currency-label">{currency}</span>
                                </div>
                                {validationError && (
                                    <div className="validation-error">{validationError}</div>
                                )}
                                <div className="input-hint">
                                    Min: {MIN_WITHDRAWAL} {currency} | Max: {Math.min(availableBalance, dailyLimit).toLocaleString()} {currency}
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="withdrawal-description">Description</label>
                                <input
                                    id="withdrawal-description"
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g., Monthly withdrawal"
                                    maxLength={200}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'destination' && (
                        <div className="destination-step">
                            <h3>Select Destination</h3>
                            <div className="destination-options">
                                {destinationOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        className={`destination-option ${destinationType === option.id ? 'selected' : ''}`}
                                        onClick={() => setDestinationType(option.id as DestinationType)}
                                    >
                                        <span className="option-icon">{option.icon}</span>
                                        <span className="option-name">{option.name}</span>
                                        {destinationType === option.id && <span className="check-icon">✓</span>}
                                    </button>
                                ))}
                            </div>

                            {destinationType === 'bank' ? (
                                <div className="destination-details">
                                    <div className="form-group">
                                        <label>Account Holder Name</label>
                                        <input
                                            type="text"
                                            value={destinationDetails.accountHolder}
                                            onChange={(e) => setDestinationDetails({ ...destinationDetails, accountHolder: e.target.value })}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Bank Name</label>
                                        <input
                                            type="text"
                                            value={destinationDetails.bankName}
                                            onChange={(e) => setDestinationDetails({ ...destinationDetails, bankName: e.target.value })}
                                            placeholder="National Bank of Egypt"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Account Number</label>
                                        <input
                                            type="text"
                                            value={destinationDetails.accountNumber}
                                            onChange={(e) => setDestinationDetails({ ...destinationDetails, accountNumber: e.target.value })}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="destination-details">
                                    <div className="form-group">
                                        <label>Wallet Number</label>
                                        <input
                                            type="tel"
                                            value={destinationDetails.walletNumber}
                                            onChange={(e) => setDestinationDetails({ ...destinationDetails, walletNumber: e.target.value })}
                                            placeholder="01234567890"
                                        />
                                    </div>
                                </div>
                            )}

                            {validationError && (
                                <div className="validation-error">{validationError}</div>
                            )}
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="confirm-step">
                            <h3>Confirm Withdrawal</h3>
                            <div className="confirmation-summary">
                                <div className="summary-row">
                                    <span>Amount:</span>
                                    <span className="amount">{parseFloat(amount).toFixed(2)} {currency}</span>
                                </div>
                                <div className="summary-row">
                                    <span>Processing Fee:</span>
                                    <span className="amount">0.00 {currency}</span>
                                </div>
                                <div className="summary-row total">
                                    <span>You will receive:</span>
                                    <span className="amount">{parseFloat(amount).toFixed(2)} {currency}</span>
                                </div>
                                <div className="summary-divider"></div>
                                <div className="summary-row">
                                    <span>Destination:</span>
                                    <span>{destinationOptions.find(o => o.id === destinationType)?.name}</span>
                                </div>
                                {destinationType === 'bank' ? (
                                    <>
                                        <div className="summary-row">
                                            <span>Account Holder:</span>
                                            <span>{destinationDetails.accountHolder}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>Bank:</span>
                                            <span>{destinationDetails.bankName}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span>Account Number:</span>
                                            <span>{destinationDetails.accountNumber}</span>
                                        </div>
                                    </>
                                ) : (
                                    <div className="summary-row">
                                        <span>Wallet Number:</span>
                                        <span>{destinationDetails.walletNumber}</span>
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div className="warning-notice">
                                <span className="warning-icon">ℹ️</span>
                                <p>Withdrawal requests are usually processed within 24-48 hours.</p>
                            </div>
                        </div>
                    )}

                    {step === 'processing' && (
                        <div className="processing-step">
                            <div className="spinner"></div>
                            <h3>Processing Withdrawal...</h3>
                            <p>Please wait while we process your withdrawal request.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="success-step">
                            <div className="success-icon">✅</div>
                            <h3>Withdrawal Request Submitted!</h3>
                            <p>Your withdrawal request has been submitted successfully.</p>
                            <div className="success-amount">
                                -{parseFloat(amount).toFixed(2)} {currency}
                            </div>
                            <p className="success-note">You will be notified once the withdrawal is processed.</p>
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

                    {step === 'destination' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('amount')}>
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirm}
                            >
                                Continue
                            </button>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('destination')}>
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleWithdraw}
                                disabled={loading}
                            >
                                {loading ? 'Processing...' : 'Confirm Withdrawal'}
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

export default WithdrawalModal;
