/**
 * Deposit Modal Component
 * Modal for depositing funds into balance via Egypt payment methods
 * Flow: amount → wallet selection → instructions → submit reference → pending
 */

import React, { useState, useEffect } from 'react';
import PaymentMethodSelector, { PaymentMethod, PaymentMethodType } from '../payments/PaymentMethodSelector';
import { topupApi } from '../../services/api/topup';
import type { PlatformWallet, Topup, PaymentMethodType as TopupPaymentMethod, DuplicateTopupError } from '../../types/topup';
import './DepositModal.css';

interface DepositModalProps {
    userId: number;
    currentBalance: number;
    currency: string;
    onClose: () => void;
    onSuccess: () => void;
    language?: 'en' | 'ar';
}

type DepositStep = 'amount' | 'wallet' | 'instructions' | 'reference' | 'pending';

// Map PaymentMethodSelector types to backend payment method types
const mapPaymentMethodToBackend = (method: PaymentMethod): TopupPaymentMethod | null => {
    if (method.type === 'smart_wallets') {
        return 'vodafone_cash'; // Default, will be overridden by wallet selection
    }
    if (method.type === 'instapay') {
        return 'instapay';
    }
    return null;
};

// Get wallet provider display name
const getWalletProviderName = (paymentMethod: TopupPaymentMethod, lang: 'en' | 'ar'): string => {
    const names: Record<TopupPaymentMethod, { en: string; ar: string }> = {
        vodafone_cash: { en: 'Vodafone Cash', ar: 'فودافون كاش' },
        orange_money: { en: 'Orange Money', ar: 'أورانج موني' },
        etisalat_cash: { en: 'Etisalat Cash', ar: 'اتصالات كاش' },
        we_pay: { en: 'WE Pay', ar: 'وي باي' },
        instapay: { en: 'InstaPay', ar: 'انستاباي' }
    };
    return names[paymentMethod]?.[lang] || paymentMethod;
};

const DepositModal: React.FC<DepositModalProps> = ({
    userId,
    currentBalance,
    currency,
    onClose,
    onSuccess,
    language = 'en'
}) => {
    const [amount, setAmount] = useState('');
    const [step, setStep] = useState<DepositStep>('amount');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
    const [selectedWallet, setSelectedWallet] = useState<PlatformWallet | null>(null);
    const [availableWallets, setAvailableWallets] = useState<PlatformWallet[]>([]);
    const [transactionReference, setTransactionReference] = useState('');
    const [validationError, setValidationError] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createdTopup, setCreatedTopup] = useState<Topup | null>(null);
    const [duplicateTopup, setDuplicateTopup] = useState<Topup | null>(null);

    const isArabic = language === 'ar';
    const MIN_DEPOSIT = 10;
    const MAX_DEPOSIT = 10000;

    // Fetch available wallets when payment method is selected
    useEffect(() => {
        if (selectedPaymentMethod && step === 'wallet') {
            fetchWallets();
        }
    }, [selectedPaymentMethod, step]);

    const fetchWallets = async () => {
        if (!selectedPaymentMethod) return;
        
        setLoading(true);
        setError(null);
        try {
            // For smart_wallets, fetch all wallet types; for instapay, fetch only instapay
            const paymentMethodFilter = selectedPaymentMethod.type === 'instapay' ? 'instapay' : undefined;
            const wallets = await topupApi.getActiveWallets(paymentMethodFilter);
            
            // Filter wallets based on selected payment method type
            const filteredWallets = selectedPaymentMethod.type === 'instapay'
                ? wallets.filter(w => w.paymentMethod === 'instapay')
                : wallets.filter(w => w.paymentMethod !== 'instapay');
            
            setAvailableWallets(filteredWallets);
        } catch (err: any) {
            setError(err.message || (isArabic ? 'فشل في تحميل المحافظ' : 'Failed to load wallets'));
        } finally {
            setLoading(false);
        }
    };

    const validateAmount = (value: string): boolean => {
        const numValue = parseFloat(value);

        if (isNaN(numValue) || numValue <= 0) {
            setValidationError(isArabic ? 'المبلغ يجب أن يكون موجباً' : 'Amount must be positive');
            return false;
        }

        if (numValue < MIN_DEPOSIT) {
            setValidationError(isArabic 
                ? `الحد الأدنى للشحن ${MIN_DEPOSIT} ${currency}`
                : `Minimum top-up is ${MIN_DEPOSIT} ${currency}`);
            return false;
        }

        if (numValue > MAX_DEPOSIT) {
            setValidationError(isArabic
                ? `الحد الأقصى للشحن ${MAX_DEPOSIT.toLocaleString()} ${currency}`
                : `Maximum top-up is ${MAX_DEPOSIT.toLocaleString()} ${currency}`);
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

    const handleContinueFromAmount = () => {
        if (validateAmount(amount)) {
            setStep('wallet');
        }
    };

    const handlePaymentMethodSelect = (method: PaymentMethod) => {
        setSelectedPaymentMethod(method);
        setSelectedWallet(null);
        setAvailableWallets([]);
    };

    const handleWalletSelect = (wallet: PlatformWallet) => {
        setSelectedWallet(wallet);
    };

    const handleContinueFromWallet = () => {
        if (selectedWallet) {
            setStep('instructions');
        }
    };

    const handleContinueFromInstructions = () => {
        setStep('reference');
    };

    const handleSubmitTopup = async () => {
        if (!selectedWallet || !transactionReference.trim()) {
            setValidationError(isArabic 
                ? 'يرجى إدخال رقم المعاملة'
                : 'Please enter the transaction reference');
            return;
        }

        setLoading(true);
        setError(null);
        setDuplicateTopup(null);

        try {
            const topup = await topupApi.createTopup({
                amount: parseFloat(amount),
                paymentMethod: selectedWallet.paymentMethod,
                transactionReference: transactionReference.trim(),
                platformWalletId: selectedWallet.id
            });
            setCreatedTopup(topup);
            setStep('pending');
        } catch (err: any) {
            // Check for duplicate reference error
            if (err.code === 'DUPLICATE_REFERENCE' && err.existingTopup) {
                setDuplicateTopup(err.existingTopup);
                setError(isArabic 
                    ? 'تم إرسال هذه المعاملة مسبقاً'
                    : 'This transaction was already submitted');
            } else {
                setError(err.message || (isArabic 
                    ? 'فشل في إنشاء طلب الشحن'
                    : 'Failed to create top-up request'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const handleBack = () => {
        switch (step) {
            case 'wallet':
                setStep('amount');
                break;
            case 'instructions':
                setStep('wallet');
                break;
            case 'reference':
                setStep('instructions');
                break;
            default:
                break;
        }
    };

    const getStepTitle = (): string => {
        const titles: Record<DepositStep, { en: string; ar: string }> = {
            amount: { en: '💵 Deposit Funds', ar: '💵 شحن الرصيد' },
            wallet: { en: '📱 Select Wallet', ar: '📱 اختر المحفظة' },
            instructions: { en: '📋 Transfer Instructions', ar: '📋 تعليمات التحويل' },
            reference: { en: '🔢 Enter Reference', ar: '🔢 أدخل رقم المعاملة' },
            pending: { en: '⏳ Request Submitted', ar: '⏳ تم إرسال الطلب' }
        };
        return titles[step][isArabic ? 'ar' : 'en'];
    };

    // Render amount step
    const renderAmountStep = () => (
        <div className="amount-step" data-testid="amount-step">
            <div className="current-balance" data-testid="current-balance">
                <span className="label">{isArabic ? 'الرصيد الحالي:' : 'Current Balance:'}</span>
                <span className="value" data-testid="current-balance-value">
                    {currentBalance.toFixed(2)} {currency}
                </span>
            </div>

            <div className="form-group">
                <label htmlFor="deposit-amount">
                    {isArabic ? 'مبلغ الشحن' : 'Deposit Amount'}
                </label>
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
                    <div className="validation-error" data-testid="validation-error">
                        {validationError}
                    </div>
                )}
                <div className="input-hint">
                    {isArabic 
                        ? `الحد الأدنى: ${MIN_DEPOSIT} ${currency} | الحد الأقصى: ${MAX_DEPOSIT.toLocaleString()} ${currency}`
                        : `Min: ${MIN_DEPOSIT} ${currency} | Max: ${MAX_DEPOSIT.toLocaleString()} ${currency}`}
                </div>
            </div>

            <div className="quick-amounts" data-testid="quick-amounts">
                <span className="quick-label">
                    {isArabic ? 'مبالغ سريعة:' : 'Quick amounts:'}
                </span>
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
    );

    // Render wallet selection step
    const renderWalletStep = () => (
        <div className="wallet-step" data-testid="wallet-step">
            <div className="deposit-summary" data-testid="deposit-summary">
                <div className="summary-row">
                    <span>{isArabic ? 'مبلغ الشحن:' : 'Deposit Amount:'}</span>
                    <span className="amount" data-testid="summary-amount">
                        {parseFloat(amount).toFixed(2)} {currency}
                    </span>
                </div>
            </div>

            <PaymentMethodSelector
                onSelect={handlePaymentMethodSelect}
                selectedMethodId={selectedPaymentMethod?.id}
                language={language}
            />

            {selectedPaymentMethod && (
                <div className="wallet-list" data-testid="wallet-list">
                    <h4 className="wallet-list-title">
                        {isArabic ? 'اختر المحفظة للتحويل إليها:' : 'Select wallet to transfer to:'}
                    </h4>
                    
                    {loading && (
                        <div className="loading-wallets" data-testid="loading-wallets">
                            <div className="spinner"></div>
                            <span>{isArabic ? 'جاري التحميل...' : 'Loading wallets...'}</span>
                        </div>
                    )}

                    {!loading && availableWallets.length === 0 && (
                        <div className="no-wallets" data-testid="no-wallets">
                            {isArabic 
                                ? 'لا توجد محافظ متاحة حالياً'
                                : 'No wallets available at the moment'}
                        </div>
                    )}

                    {!loading && availableWallets.map(wallet => (
                        <div
                            key={wallet.id}
                            className={`wallet-card ${selectedWallet?.id === wallet.id ? 'selected' : ''}`}
                            onClick={() => handleWalletSelect(wallet)}
                            data-testid={`wallet-card-${wallet.id}`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleWalletSelect(wallet);
                                }
                            }}
                        >
                            <div className="wallet-provider">
                                {getWalletProviderName(wallet.paymentMethod, language)}
                            </div>
                            <div className="wallet-details">
                                {wallet.phoneNumber && (
                                    <span className="wallet-phone" data-testid={`wallet-phone-${wallet.id}`}>
                                        📱 {wallet.phoneNumber}
                                    </span>
                                )}
                                {wallet.instapayAlias && (
                                    <span className="wallet-alias" data-testid={`wallet-alias-${wallet.id}`}>
                                        🏦 {wallet.instapayAlias}
                                    </span>
                                )}
                                <span className="wallet-holder" data-testid={`wallet-holder-${wallet.id}`}>
                                    👤 {wallet.holderName}
                                </span>
                            </div>
                            {selectedWallet?.id === wallet.id && (
                                <div className="selected-indicator">✓</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {error && (
                <div className="error-message" data-testid="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}
        </div>
    );

    // Render instructions step
    const renderInstructionsStep = () => {
        if (!selectedWallet) return null;

        const isInstaPay = selectedWallet.paymentMethod === 'instapay';
        const providerName = getWalletProviderName(selectedWallet.paymentMethod, language);

        return (
            <div className="instructions-step" data-testid="instructions-step">
                <div className="deposit-summary" data-testid="deposit-summary">
                    <div className="summary-row">
                        <span>{isArabic ? 'مبلغ الشحن:' : 'Deposit Amount:'}</span>
                        <span className="amount" data-testid="summary-amount">
                            {parseFloat(amount).toFixed(2)} {currency}
                        </span>
                    </div>
                    <div className="summary-row">
                        <span>{isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                        <span data-testid="summary-method">{providerName}</span>
                    </div>
                </div>

                <div className="wallet-details-card" data-testid="wallet-details-card">
                    <h4>{isArabic ? 'تفاصيل المحفظة' : 'Wallet Details'}</h4>
                    
                    {selectedWallet.phoneNumber && (
                        <div className="detail-row" data-testid="wallet-phone-detail">
                            <span className="detail-label">
                                {isArabic ? 'رقم الهاتف:' : 'Phone Number:'}
                            </span>
                            <span className="detail-value copyable" data-testid="wallet-phone-value">
                                {selectedWallet.phoneNumber}
                            </span>
                        </div>
                    )}

                    {selectedWallet.instapayAlias && (
                        <div className="detail-row" data-testid="wallet-alias-detail">
                            <span className="detail-label">
                                {isArabic ? 'عنوان انستاباي:' : 'InstaPay Alias:'}
                            </span>
                            <span className="detail-value copyable" data-testid="wallet-alias-value">
                                {selectedWallet.instapayAlias}
                            </span>
                        </div>
                    )}

                    <div className="detail-row" data-testid="wallet-holder-detail">
                        <span className="detail-label">
                            {isArabic ? 'اسم المستلم:' : 'Holder Name:'}
                        </span>
                        <span className="detail-value" data-testid="wallet-holder-value">
                            {selectedWallet.holderName}
                        </span>
                    </div>
                </div>

                <div className="transfer-instructions" data-testid="transfer-instructions">
                    <h4>{isArabic ? 'تعليمات التحويل' : 'Transfer Instructions'}</h4>
                    
                    {isInstaPay ? (
                        <ol className="instructions-list" data-testid="instapay-instructions">
                            <li>{isArabic 
                                ? 'افتح تطبيق البنك الخاص بك'
                                : 'Open your bank app'}</li>
                            <li>{isArabic
                                ? 'اختر "تحويل عبر انستاباي"'
                                : 'Select "Transfer via InstaPay"'}</li>
                            <li>{isArabic
                                ? `أدخل عنوان انستاباي: ${selectedWallet.instapayAlias}`
                                : `Enter InstaPay alias: ${selectedWallet.instapayAlias}`}</li>
                            <li>{isArabic
                                ? `أدخل المبلغ: ${parseFloat(amount).toFixed(2)} ${currency}`
                                : `Enter amount: ${parseFloat(amount).toFixed(2)} ${currency}`}</li>
                            <li>{isArabic
                                ? 'تأكد من اسم المستلم وأكمل التحويل'
                                : 'Verify recipient name and complete transfer'}</li>
                            <li>{isArabic
                                ? 'احتفظ برقم المعاملة للخطوة التالية'
                                : 'Save the transaction reference for the next step'}</li>
                        </ol>
                    ) : (
                        <ol className="instructions-list" data-testid="smart-wallet-instructions">
                            <li>{isArabic
                                ? `افتح تطبيق ${providerName}`
                                : `Open ${providerName} app`}</li>
                            <li>{isArabic
                                ? 'اختر "تحويل أموال"'
                                : 'Select "Transfer Money"'}</li>
                            <li>{isArabic
                                ? `أدخل رقم الهاتف: ${selectedWallet.phoneNumber}`
                                : `Enter phone number: ${selectedWallet.phoneNumber}`}</li>
                            <li>{isArabic
                                ? `أدخل المبلغ: ${parseFloat(amount).toFixed(2)} ${currency}`
                                : `Enter amount: ${parseFloat(amount).toFixed(2)} ${currency}`}</li>
                            <li>{isArabic
                                ? 'تأكد من اسم المستلم وأكمل التحويل'
                                : 'Verify recipient name and complete transfer'}</li>
                            <li>{isArabic
                                ? 'احتفظ برقم المعاملة للخطوة التالية'
                                : 'Save the transaction reference for the next step'}</li>
                        </ol>
                    )}
                </div>
            </div>
        );
    };

    // Render reference submission step
    const renderReferenceStep = () => (
        <div className="reference-step" data-testid="reference-step">
            <div className="deposit-summary" data-testid="deposit-summary">
                <div className="summary-row">
                    <span>{isArabic ? 'مبلغ الشحن:' : 'Deposit Amount:'}</span>
                    <span className="amount" data-testid="summary-amount">
                        {parseFloat(amount).toFixed(2)} {currency}
                    </span>
                </div>
                <div className="summary-row">
                    <span>{isArabic ? 'طريقة الدفع:' : 'Payment Method:'}</span>
                    <span data-testid="summary-method">
                        {selectedWallet && getWalletProviderName(selectedWallet.paymentMethod, language)}
                    </span>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="transaction-reference">
                    {isArabic ? 'رقم المعاملة' : 'Transaction Reference'}
                </label>
                <input
                    id="transaction-reference"
                    type="text"
                    value={transactionReference}
                    onChange={(e) => {
                        setTransactionReference(e.target.value);
                        setValidationError('');
                        setError(null);
                        setDuplicateTopup(null);
                    }}
                    placeholder={isArabic ? 'أدخل رقم المعاملة من إيصال التحويل' : 'Enter reference from transfer receipt'}
                    autoFocus
                    data-testid="transaction-reference-input"
                />
                {validationError && (
                    <div className="validation-error" data-testid="validation-error">
                        {validationError}
                    </div>
                )}
                <div className="input-hint">
                    {isArabic
                        ? 'رقم المعاملة موجود في إيصال التحويل أو رسالة التأكيد'
                        : 'Transaction reference is found in your transfer receipt or confirmation message'}
                </div>
            </div>

            {error && (
                <div className="error-message" data-testid="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {duplicateTopup && (
                <div className="duplicate-info" data-testid="duplicate-info">
                    <h4>{isArabic ? 'حالة الطلب الموجود:' : 'Existing Request Status:'}</h4>
                    <div className="duplicate-details">
                        <div className="detail-row">
                            <span>{isArabic ? 'المبلغ:' : 'Amount:'}</span>
                            <span>{duplicateTopup.amount.toFixed(2)} {currency}</span>
                        </div>
                        <div className="detail-row">
                            <span>{isArabic ? 'الحالة:' : 'Status:'}</span>
                            <span className={`status-badge status-${duplicateTopup.status}`} data-testid="duplicate-status">
                                {duplicateTopup.status === 'pending' && (isArabic ? 'قيد الانتظار' : 'Pending')}
                                {duplicateTopup.status === 'verified' && (isArabic ? 'تم التأكيد' : 'Verified')}
                                {duplicateTopup.status === 'rejected' && (isArabic ? 'مرفوض' : 'Rejected')}
                            </span>
                        </div>
                        <div className="detail-row">
                            <span>{isArabic ? 'تاريخ الإنشاء:' : 'Created:'}</span>
                            <span>{new Date(duplicateTopup.createdAt).toLocaleString(isArabic ? 'ar-EG' : 'en-US')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    // Render pending confirmation step
    const renderPendingStep = () => (
        <div className="pending-step" data-testid="pending-step">
            <div className="pending-icon">⏳</div>
            <h3 data-testid="pending-title">
                {isArabic ? 'تم إرسال طلبك!' : 'Request Submitted!'}
            </h3>
            <p data-testid="pending-message">
                {isArabic
                    ? 'طلب الشحن الخاص بك قيد المراجعة. سيتم إشعارك عند التأكيد.'
                    : 'Your top-up request is being reviewed. You will be notified when confirmed.'}
            </p>
            
            <div className="pending-details" data-testid="pending-details">
                <div className="detail-row">
                    <span>{isArabic ? 'المبلغ:' : 'Amount:'}</span>
                    <span className="amount" data-testid="pending-amount">
                        {parseFloat(amount).toFixed(2)} {currency}
                    </span>
                </div>
                <div className="detail-row">
                    <span>{isArabic ? 'رقم المعاملة:' : 'Reference:'}</span>
                    <span data-testid="pending-reference">{transactionReference}</span>
                </div>
                {createdTopup && (
                    <div className="detail-row">
                        <span>{isArabic ? 'رقم الطلب:' : 'Request ID:'}</span>
                        <span data-testid="pending-topup-id">#{createdTopup.id}</span>
                    </div>
                )}
            </div>

            <div className="estimated-time" data-testid="estimated-time">
                <span className="time-icon">🕐</span>
                <span>
                    {isArabic
                        ? 'الوقت المتوقع للتأكيد: 5-30 دقيقة'
                        : 'Estimated confirmation time: 5-30 minutes'}
                </span>
            </div>
        </div>
    );

    // Render footer buttons based on current step
    const renderFooter = () => {
        switch (step) {
            case 'amount':
                return (
                    <>
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleClose} 
                            data-testid="cancel-button"
                        >
                            {isArabic ? 'إلغاء' : 'Cancel'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleContinueFromAmount}
                            disabled={!amount || !!validationError}
                            data-testid="continue-button"
                        >
                            {isArabic ? 'متابعة' : 'Continue'}
                        </button>
                    </>
                );

            case 'wallet':
                return (
                    <>
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleBack} 
                            data-testid="back-button"
                        >
                            {isArabic ? 'رجوع' : 'Back'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleContinueFromWallet}
                            disabled={!selectedWallet || loading}
                            data-testid="continue-button"
                        >
                            {isArabic ? 'متابعة' : 'Continue'}
                        </button>
                    </>
                );

            case 'instructions':
                return (
                    <>
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleBack} 
                            data-testid="back-button"
                        >
                            {isArabic ? 'رجوع' : 'Back'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleContinueFromInstructions}
                            data-testid="continue-button"
                        >
                            {isArabic ? 'أكملت التحويل' : 'I\'ve Completed Transfer'}
                        </button>
                    </>
                );

            case 'reference':
                return (
                    <>
                        <button 
                            className="btn btn-secondary" 
                            onClick={handleBack}
                            disabled={loading}
                            data-testid="back-button"
                        >
                            {isArabic ? 'رجوع' : 'Back'}
                        </button>
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitTopup}
                            disabled={!transactionReference.trim() || loading}
                            data-testid="submit-topup-button"
                        >
                            {loading 
                                ? (isArabic ? 'جاري الإرسال...' : 'Submitting...') 
                                : (isArabic ? 'إرسال الطلب' : 'Submit Request')}
                        </button>
                    </>
                );

            case 'pending':
                return (
                    <button 
                        className="btn btn-primary" 
                        onClick={onSuccess} 
                        data-testid="done-button"
                    >
                        {isArabic ? 'تم' : 'Done'}
                    </button>
                );

            default:
                return null;
        }
    };

    return (
        <div 
            className="modal-overlay" 
            onClick={handleClose} 
            data-testid="deposit-modal-overlay"
            dir={isArabic ? 'rtl' : 'ltr'}
        >
            <div 
                className="deposit-modal" 
                onClick={(e) => e.stopPropagation()} 
                data-testid="deposit-modal"
            >
                <div className="modal-header" data-testid="modal-header">
                    <h2 data-testid="modal-title">{getStepTitle()}</h2>
                    <button 
                        className="close-btn" 
                        onClick={handleClose} 
                        disabled={loading}
                        data-testid="close-button"
                    >
                        ×
                    </button>
                </div>

                <div className="modal-body" data-testid="modal-body">
                    {step === 'amount' && renderAmountStep()}
                    {step === 'wallet' && renderWalletStep()}
                    {step === 'instructions' && renderInstructionsStep()}
                    {step === 'reference' && renderReferenceStep()}
                    {step === 'pending' && renderPendingStep()}
                </div>

                <div className="modal-footer" data-testid="modal-footer">
                    {renderFooter()}
                </div>
            </div>
        </div>
    );
};

export default DepositModal;
