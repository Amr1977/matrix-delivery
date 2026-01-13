/**
 * Unit Tests for DepositModal Component
 * Tests the Egypt Payment Phase 1 deposit flow:
 * amount → wallet selection → instructions → submit reference → pending
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DepositModal from '../DepositModal';
import { topupApi } from '../../../services/api/topup';
import type { PlatformWallet, Topup } from '../../../types/topup';

// Mock the topup API
jest.mock('../../../services/api/topup');
const mockTopupApi = topupApi as jest.Mocked<typeof topupApi>;

// Mock PaymentMethodSelector
jest.mock('../../payments/PaymentMethodSelector', () => {
    return function MockPaymentMethodSelector({ onSelect, selectedMethodId }: any) {
        return (
            <div data-testid="payment-method-selector">
                <button 
                    data-testid="select-smart-wallets"
                    onClick={() => onSelect({ id: 'smart_wallets', type: 'smart_wallets', name: 'Smart Wallets' })}
                    className={selectedMethodId === 'smart_wallets' ? 'selected' : ''}
                >
                    Smart Wallets
                </button>
                <button 
                    data-testid="select-instapay"
                    onClick={() => onSelect({ id: 'instapay', type: 'instapay', name: 'InstaPay' })}
                    className={selectedMethodId === 'instapay' ? 'selected' : ''}
                >
                    InstaPay
                </button>
            </div>
        );
    };
});

const mockWallets: PlatformWallet[] = [
    {
        id: 1,
        paymentMethod: 'vodafone_cash',
        phoneNumber: '01012345678',
        holderName: 'Matrix Delivery',
        isActive: true,
        dailyLimit: 50000,
        monthlyLimit: 500000,
        dailyUsed: 0,
        monthlyUsed: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    },
    {
        id: 2,
        paymentMethod: 'instapay',
        instapayAlias: 'matrix@instapay',
        holderName: 'Matrix Delivery LLC',
        isActive: true,
        dailyLimit: 100000,
        monthlyLimit: 1000000,
        dailyUsed: 0,
        monthlyUsed: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z'
    }
];

const mockCreatedTopup: Topup = {
    id: 123,
    userId: '1',
    amount: 100,
    paymentMethod: 'vodafone_cash',
    transactionReference: 'TXN123456',
    platformWalletId: 1,
    status: 'pending',
    createdAt: '2026-01-13T10:00:00Z',
    updatedAt: '2026-01-13T10:00:00Z'
};

describe('DepositModal', () => {
    const defaultProps = {
        userId: 1,
        currentBalance: 5000,
        currency: 'EGP',
        onClose: jest.fn(),
        onSuccess: jest.fn(),
        language: 'en' as const
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockTopupApi.getActiveWallets.mockResolvedValue(mockWallets);
        mockTopupApi.createTopup.mockResolvedValue(mockCreatedTopup);
    });

    describe('Step 1: Amount Entry', () => {
        test('renders amount input step', () => {
            render(<DepositModal {...defaultProps} />);

            expect(screen.getByTestId('modal-title')).toHaveTextContent('Deposit Funds');
            expect(screen.getByTestId('deposit-amount-input')).toBeInTheDocument();
            expect(screen.getByTestId('current-balance')).toBeInTheDocument();
            expect(screen.getByTestId('current-balance-value')).toHaveTextContent('5000.00 EGP');
        });

        test('shows quick amount buttons', () => {
            render(<DepositModal {...defaultProps} />);

            expect(screen.getByTestId('quick-amount-100')).toBeInTheDocument();
            expect(screen.getByTestId('quick-amount-500')).toBeInTheDocument();
            expect(screen.getByTestId('quick-amount-1000')).toBeInTheDocument();
            expect(screen.getByTestId('quick-amount-5000')).toBeInTheDocument();
        });

        test('validates minimum amount (10 EGP)', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '5' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Minimum top-up is 10/i);
        });

        test('validates maximum amount (10000 EGP)', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '15000' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Maximum top-up is 10,000/i);
        });

        test('quick amount button sets value', () => {
            render(<DepositModal {...defaultProps} />);

            fireEvent.click(screen.getByTestId('quick-amount-1000'));

            const input = screen.getByTestId('deposit-amount-input') as HTMLInputElement;
            expect(input.value).toBe('1000');
        });

        test('continue button disabled when invalid', () => {
            render(<DepositModal {...defaultProps} />);

            const continueBtn = screen.getByTestId('continue-button');
            expect(continueBtn).toBeDisabled();
        });

        test('continue button enabled when valid amount', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });

            const continueBtn = screen.getByTestId('continue-button');
            expect(continueBtn).not.toBeDisabled();
        });
    });

    describe('Step 2: Wallet Selection', () => {
        test('shows payment method selector after continue', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            expect(screen.getByTestId('wallet-step')).toBeInTheDocument();
            expect(screen.getByTestId('payment-method-selector')).toBeInTheDocument();
        });

        test('shows deposit summary', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            expect(screen.getByTestId('deposit-summary')).toBeInTheDocument();
            expect(screen.getByTestId('summary-amount')).toHaveTextContent('100.00 EGP');
        });

        test('fetches wallets when payment method selected', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            fireEvent.click(screen.getByTestId('select-smart-wallets'));

            await waitFor(() => {
                expect(mockTopupApi.getActiveWallets).toHaveBeenCalled();
            });
        });

        test('displays available wallets', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            fireEvent.click(screen.getByTestId('select-smart-wallets'));

            await waitFor(() => {
                expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
            });
        });

        test('back button returns to amount step', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('back-button'));

            expect(screen.getByTestId('amount-step')).toBeInTheDocument();
        });
    });

    describe('Step 3: Instructions', () => {
        const navigateToInstructions = async () => {
            render(<DepositModal {...defaultProps} />);

            // Step 1: Enter amount
            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 2: Select payment method and wallet
            fireEvent.click(screen.getByTestId('select-smart-wallets'));
            
            await waitFor(() => {
                expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('wallet-card-1'));
            fireEvent.click(screen.getByTestId('continue-button'));
        };

        test('shows wallet details', async () => {
            await navigateToInstructions();

            expect(screen.getByTestId('instructions-step')).toBeInTheDocument();
            expect(screen.getByTestId('wallet-details-card')).toBeInTheDocument();
            expect(screen.getByTestId('wallet-phone-value')).toHaveTextContent('01012345678');
            expect(screen.getByTestId('wallet-holder-value')).toHaveTextContent('Matrix Delivery');
        });

        test('shows transfer instructions', async () => {
            await navigateToInstructions();

            expect(screen.getByTestId('transfer-instructions')).toBeInTheDocument();
            expect(screen.getByTestId('smart-wallet-instructions')).toBeInTheDocument();
        });

        test('continue button advances to reference step', async () => {
            await navigateToInstructions();

            fireEvent.click(screen.getByTestId('continue-button'));

            expect(screen.getByTestId('reference-step')).toBeInTheDocument();
        });
    });

    describe('Step 4: Reference Submission', () => {
        const navigateToReference = async () => {
            render(<DepositModal {...defaultProps} />);

            // Step 1: Enter amount
            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 2: Select payment method and wallet
            fireEvent.click(screen.getByTestId('select-smart-wallets'));
            
            await waitFor(() => {
                expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('wallet-card-1'));
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 3: Instructions
            fireEvent.click(screen.getByTestId('continue-button'));
        };

        test('shows reference input', async () => {
            await navigateToReference();

            expect(screen.getByTestId('reference-step')).toBeInTheDocument();
            expect(screen.getByTestId('transaction-reference-input')).toBeInTheDocument();
        });

        test('submit button disabled without reference', async () => {
            await navigateToReference();

            expect(screen.getByTestId('submit-topup-button')).toBeDisabled();
        });

        test('submit button enabled with reference', async () => {
            await navigateToReference();

            const refInput = screen.getByTestId('transaction-reference-input');
            fireEvent.change(refInput, { target: { value: 'TXN123456' } });

            expect(screen.getByTestId('submit-topup-button')).not.toBeDisabled();
        });

        test('submits topup request', async () => {
            await navigateToReference();

            const refInput = screen.getByTestId('transaction-reference-input');
            fireEvent.change(refInput, { target: { value: 'TXN123456' } });
            fireEvent.click(screen.getByTestId('submit-topup-button'));

            await waitFor(() => {
                expect(mockTopupApi.createTopup).toHaveBeenCalledWith({
                    amount: 100,
                    paymentMethod: 'vodafone_cash',
                    transactionReference: 'TXN123456',
                    platformWalletId: 1
                });
            });
        });
    });

    describe('Step 5: Pending Confirmation', () => {
        const navigateToPending = async () => {
            render(<DepositModal {...defaultProps} />);

            // Step 1: Enter amount
            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 2: Select payment method and wallet
            fireEvent.click(screen.getByTestId('select-smart-wallets'));
            
            await waitFor(() => {
                expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('wallet-card-1'));
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 3: Instructions
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 4: Submit reference
            const refInput = screen.getByTestId('transaction-reference-input');
            fireEvent.change(refInput, { target: { value: 'TXN123456' } });
            fireEvent.click(screen.getByTestId('submit-topup-button'));
        };

        test('shows pending confirmation', async () => {
            await navigateToPending();

            await waitFor(() => {
                expect(screen.getByTestId('pending-step')).toBeInTheDocument();
            });

            expect(screen.getByTestId('pending-title')).toHaveTextContent('Request Submitted!');
            expect(screen.getByTestId('pending-amount')).toHaveTextContent('100.00 EGP');
            expect(screen.getByTestId('pending-reference')).toHaveTextContent('TXN123456');
            expect(screen.getByTestId('pending-topup-id')).toHaveTextContent('#123');
        });

        test('shows estimated time', async () => {
            await navigateToPending();

            await waitFor(() => {
                expect(screen.getByTestId('pending-step')).toBeInTheDocument();
            });

            expect(screen.getByTestId('estimated-time')).toHaveTextContent('5-30 minutes');
        });

        test('done button calls onSuccess', async () => {
            await navigateToPending();

            await waitFor(() => {
                expect(screen.getByTestId('done-button')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('done-button'));
            expect(defaultProps.onSuccess).toHaveBeenCalled();
        });
    });

    describe('Duplicate Reference Handling', () => {
        test('shows duplicate error and existing request status', async () => {
            const duplicateTopup: Topup = {
                id: 99,
                userId: '1',
                amount: 100,
                paymentMethod: 'vodafone_cash',
                transactionReference: 'TXN123456',
                platformWalletId: 1,
                status: 'pending',
                createdAt: '2026-01-12T10:00:00Z',
                updatedAt: '2026-01-12T10:00:00Z'
            };

            mockTopupApi.createTopup.mockRejectedValue({
                code: 'DUPLICATE_REFERENCE',
                message: 'This transaction was already submitted',
                existingTopup: duplicateTopup
            });

            render(<DepositModal {...defaultProps} />);

            // Navigate to reference step
            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            fireEvent.click(screen.getByTestId('select-smart-wallets'));
            
            await waitFor(() => {
                expect(screen.getByTestId('wallet-card-1')).toBeInTheDocument();
            });

            fireEvent.click(screen.getByTestId('wallet-card-1'));
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('continue-button'));

            // Submit duplicate reference
            const refInput = screen.getByTestId('transaction-reference-input');
            fireEvent.change(refInput, { target: { value: 'TXN123456' } });
            fireEvent.click(screen.getByTestId('submit-topup-button'));

            await waitFor(() => {
                expect(screen.getByTestId('error-message')).toHaveTextContent('already submitted');
            });

            expect(screen.getByTestId('duplicate-info')).toBeInTheDocument();
            expect(screen.getByTestId('duplicate-status')).toHaveTextContent('Pending');
        });
    });

    describe('Modal Controls', () => {
        test('close button calls onClose', () => {
            const onClose = jest.fn();
            render(<DepositModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByTestId('close-button'));
            expect(onClose).toHaveBeenCalled();
        });

        test('cancel button calls onClose', () => {
            const onClose = jest.fn();
            render(<DepositModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByTestId('cancel-button'));
            expect(onClose).toHaveBeenCalled();
        });

        test('overlay click calls onClose', () => {
            const onClose = jest.fn();
            render(<DepositModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByTestId('deposit-modal-overlay'));
            expect(onClose).toHaveBeenCalled();
        });
    });

    describe('Arabic Language Support', () => {
        test('renders in Arabic when language is ar', () => {
            render(<DepositModal {...defaultProps} language="ar" />);

            expect(screen.getByTestId('modal-title')).toHaveTextContent('شحن الرصيد');
        });
    });
});
