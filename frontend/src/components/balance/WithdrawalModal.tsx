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

type DestinationType = 'vodafone' | 'orange' | 'etisalat' | 'instapay';

const WithdrawalModal: React.FC<WithdrawalModalProps> = ({
    userId,
    availableBalance,
    currency,
    dailyLimit,
    monthlyLimit,
    onClose,
    onSuccess
}) => {
    const { withdraw, verifyWithdrawal, loading, error, clearError } = useBalance();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('Withdrawal request');
    const [destinationType, setDestinationType] = useState<DestinationType>('vodafone');
    const [destinationDetails, setDestinationDetails] = useState({
        walletNumber: ''
    });
    const [step, setStep] = useState<'amount' | 'destination' | 'confirm' | 'processing' | 'verification' | 'success'>('amount');
    const [validationError, setValidationError] = useState('');
    const [withdrawalRequestId, setWithdrawalRequestId] = useState<number | null>(null);
    const [verificationCode, setVerificationCode] = useState('');

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
        if (!destinationDetails.walletNumber) {
            setValidationError('Wallet or Instapay number is required');
            return false;
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

        const destination = `${destinationType} - ${destinationDetails.walletNumber}`;
        const metadata: any = {
            withdrawalMethod: 'manual',
            destinationType,
            destinationDetails: {}
        };

        if (destinationType === 'instapay') {
            metadata.destinationDetails = {
                instapayAlias: destinationDetails.walletNumber
            };
        } else {
            metadata.destinationDetails = {
                walletNumber: destinationDetails.walletNumber
            };
        }

        try {
            const result = await withdraw(userId, parseFloat(amount), destination, description, metadata);
            setWithdrawalRequestId(result.withdrawalRequestId);
            setVerificationCode('');
            setValidationError('');
            setStep('verification');
        } catch (err) {
            setStep('confirm');
        }
    };

    const handleVerificationCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setVerificationCode(e.target.value);
        if (validationError) {
            setValidationError('');
        }
    };

    const handleVerify = async () => {
        if (!withdrawalRequestId) {
            return;
        }
        const trimmedCode = verificationCode.trim();
        if (!trimmedCode || trimmedCode.length !== 6) {
            setValidationError('Please enter the 6-digit verification code sent to your email');
            return;
        }
        setStep('processing');
        clearError();
        try {
            await verifyWithdrawal(userId, withdrawalRequestId, trimmedCode);
            setStep('success');
            setTimeout(() => {
                onSuccess();
            }, 2000);
        } catch (err) {
            setStep('verification');
        }
    };

    const handleClose = () => {
        if (step !== 'processing') {
            onClose();
        }
    };

    const destinationOptions = [
        { id: 'vodafone', name: 'Vodafone Cash', icon: '📱' },
        { id: 'orange', name: 'Orange Cash', icon: '🍊' },
        { id: 'etisalat', name: 'Etisalat Cash', icon: '💚' },
        { id: 'instapay', name: 'InstaPay', icon: '⚡' }
    ];

    return (
        <div className="modal-overlay" onClick={handleClose} data-testid="withdrawal-modal-overlay">
            <div className="withdrawal-modal" onClick={(e) => e.stopPropagation()} data-testid="withdrawal-modal">
                <div className="modal-header" data-testid="modal-header">
                    <h2 data-testid="modal-title">💸 Withdraw Funds</h2>
                    <button className="close-btn" onClick={handleClose} disabled={step === 'processing'} data-testid="close-button">
                        ×
                    </button>
                </div>

                <div className="modal-body" data-testid="modal-body">
                    {step === 'amount' && (
                        <div className="amount-step" data-testid="amount-step">
                            <div className="balance-info" data-testid="balance-info">
                                <div className="info-row">
                                    <span className="label">Available Balance:</span>
                                    <span className="value" data-testid="available-balance">{availableBalance.toFixed(2)} {currency}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Daily Limit:</span>
                                    <span className="value" data-testid="daily-limit">{dailyLimit.toLocaleString()} {currency}</span>
                                </div>
                                <div className="info-row">
                                    <span className="label">Monthly Limit:</span>
                                    <span className="value" data-testid="monthly-limit">{monthlyLimit.toLocaleString()} {currency}</span>
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
                                        data-testid="withdrawal-amount-input"
                                    />
                                    <span className="currency-label">{currency}</span>
                                </div>
                                {validationError && (
                                    <div className="validation-error" data-testid="validation-error">{validationError}</div>
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
                                    data-testid="withdrawal-description-input"
                                />
                            </div>
                        </div>
                    )}

                    {step === 'destination' && (
                        <div className="destination-step" data-testid="destination-step">
                            <h3>Select Destination</h3>
                            <div className="destination-options" data-testid="destination-options">
                                {destinationOptions.map((option) => (
                                    <button
                                        key={option.id}
                                        className={`destination-option ${destinationType === option.id ? 'selected' : ''}`}
                                        onClick={() => setDestinationType(option.id as DestinationType)}
                                        data-testid={`destination-${option.id}`}
                                    >
                                        <span className="option-icon">{option.icon}</span>
                                        <span className="option-name">{option.name}</span>
                                        {destinationType === option.id && <span className="check-icon">✓</span>}
                                    </button>
                                ))}
                            </div>

                            <div className="destination-details">
                                <div className="form-group">
                                    <label>Wallet or Instapay Number</label>
                                    <input
                                        type="tel"
                                        value={destinationDetails.walletNumber}
                                        onChange={(e) => setDestinationDetails({ ...destinationDetails, walletNumber: e.target.value })}
                                        placeholder="01234567890"
                                    />
                                </div>
                            </div>

                            {validationError && (
                                <div className="validation-error" data-testid="validation-error">{validationError}</div>
                            )}
                        </div>
                    )}

                    {step === 'confirm' && (
                        <div className="confirm-step" data-testid="confirm-step">
                            <h3>Confirm Withdrawal</h3>
                            <div className="confirmation-summary" data-testid="confirmation-summary">
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
                                <div className="summary-row">
                                    <span>Wallet or Instapay Number:</span>
                                    <span>{destinationDetails.walletNumber}</span>
                                </div>
                            </div>

                            {error && (
                                <div className="error-message" data-testid="error-message">
                                    <span className="error-icon">⚠️</span>
                                    {error}
                                </div>
                            )}

                            <div className="warning-notice" data-testid="warning-notice">
                                <span className="warning-icon">ℹ️</span>
                                <p>Withdrawal requests are usually processed within 24-48 hours.</p>
                            </div>
                        </div>
                    )}

                    {step === 'verification' && (
                        <div className="verification-step" data-testid="verification-step">
                            <h3 data-testid="verification-title">Enter Verification Code</h3>
                            <p data-testid="verification-instructions">
                                We sent a 6-digit verification code to your email. Enter it below to confirm your withdrawal.
                            </p>
                            <div className="form-group">
                                <label htmlFor="verification-code">Verification Code</label>
                                <input
                                    id="verification-code"
                                    type="text"
                                    value={verificationCode}
                                    onChange={handleVerificationCodeChange}
                                    maxLength={6}
                                    inputMode="numeric"
                                    autoFocus
                                    data-testid="verification-code-input"
                                />
                            </div>
                            {validationError && (
                                <div className="validation-error" data-testid="validation-error">{validationError}</div>
                            )}
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
                            <h3 data-testid="processing-title">Processing Withdrawal...</h3>
                            <p>Please wait while we process your withdrawal request.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="success-step" data-testid="success-step">
                            <div className="success-icon">✅</div>
                            <h3 data-testid="success-title">Withdrawal Request Submitted!</h3>
                            <p data-testid="success-message">Your withdrawal request has been submitted successfully.</p>
                            <div className="success-amount" data-testid="success-amount">
                                -{parseFloat(amount).toFixed(2)} {currency}
                            </div>
                            <p className="success-note">You will be notified once the withdrawal is processed.</p>
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

                    {step === 'destination' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('amount')} data-testid="back-button">
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirm}
                                data-testid="continue-button"
                            >
                                Continue
                            </button>
                        </>
                    )}

                    {step === 'confirm' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('destination')} data-testid="back-button">
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleWithdraw}
                                disabled={loading}
                                data-testid="confirm-withdrawal-button"
                            >
                                {loading ? 'Processing...' : 'Confirm Withdrawal'}
                            </button>
                        </>
                    )}

                    {step === 'verification' && (
                        <>
                            <button className="btn btn-secondary" onClick={() => setStep('confirm')} data-testid="back-button">
                                Back
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleVerify}
                                disabled={loading || !verificationCode}
                                data-testid="confirm-pin-button"
                            >
                                {loading ? 'Verifying...' : 'Confirm Code'}
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

export default WithdrawalModal;
