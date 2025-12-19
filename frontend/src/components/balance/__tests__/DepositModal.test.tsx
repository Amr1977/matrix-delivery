/**
 * Unit Tests for DepositModal Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DepositModal from '../DepositModal';
import * as useBalanceHook from '../../../hooks/useBalance';

jest.mock('../../../services/api/balance');
jest.mock('../../../hooks/useBalance');
jest.mock('../../payments/PaymentMethodSelector', () => {
    return function MockPaymentMethodSelector({ onSelect }: any) {
        return (
            <div data-testid="payment-selector">
                <button onClick={() => onSelect({ id: 'test', type: 'card' })}>
                    Select Payment
                </button>
            </div>
        );
    };
});

const mockUseBalance = useBalanceHook.useBalance as jest.MockedFunction<typeof useBalanceHook.useBalance>;

describe('DepositModal', () => {
    const defaultProps = {
        userId: 1,
        currentBalance: 5000,
        currency: 'EGP',
        onClose: jest.fn(),
        onSuccess: jest.fn()
    };

    beforeEach(() => {
        mockUseBalance.mockReturnValue({
            balance: null,
            transactions: [],
            statement: null,
            loading: false,
            error: null,
            fetchBalance: jest.fn(),
            deposit: jest.fn().mockResolvedValue(undefined),
            withdraw: jest.fn(),
            fetchTransactions: jest.fn(),
            generateStatement: jest.fn(),
            refreshBalance: jest.fn(),
            clearError: jest.fn()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Step 1: Amount Entry', () => {
        test('renders amount input step', () => {
            render(<DepositModal {...defaultProps} />);

            expect(screen.getByTestId('modal-title')).toBeInTheDocument();
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

        test('validates minimum amount', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '0.5' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Minimum deposit is 1/i);
        });

        test('validates maximum amount', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '150000' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Maximum deposit is 100,000/i);
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

    describe('Step 2: Payment Method', () => {
        test('shows payment method selector after continue', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            expect(screen.getByTestId('payment-selector')).toBeInTheDocument();
        });

        test('shows deposit summary', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            expect(screen.getByTestId('deposit-summary')).toBeInTheDocument();
            expect(screen.getByTestId('summary-amount')).toHaveTextContent('100.00 EGP');
            expect(screen.getByTestId('summary-new-balance')).toHaveTextContent('5100.00 EGP');
        });

        test('back button returns to amount step', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('back-button'));

            expect(screen.getByTestId('deposit-amount-input')).toBeInTheDocument();
        });
    });

    describe('Deposit Process', () => {
        test('calls deposit function with correct params', async () => {
            const mockDeposit = jest.fn().mockResolvedValue(undefined);
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: false,
                error: null,
                fetchBalance: jest.fn(),
                deposit: mockDeposit,
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<DepositModal {...defaultProps} />);

            // Step 1: Enter amount
            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            // Step 2: Select payment
            fireEvent.click(screen.getByText('Select Payment'));
            fireEvent.click(screen.getByTestId('confirm-deposit-button'));

            await waitFor(() => {
                expect(mockDeposit).toHaveBeenCalledWith(1, 100, 'Balance deposit');
            });
        });

        test('shows success message after deposit', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByText('Select Payment'));
            fireEvent.click(screen.getByTestId('confirm-deposit-button'));

            await waitFor(() => {
                expect(screen.getByTestId('success-title')).toHaveTextContent('Deposit Successful!');
            });
        });

        test('calls onSuccess after successful deposit', async () => {
            const onSuccess = jest.fn();
            render(<DepositModal {...defaultProps} onSuccess={onSuccess} />);

            const input = screen.getByTestId('deposit-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByText('Select Payment'));
            fireEvent.click(screen.getByTestId('confirm-deposit-button'));

            await waitFor(() => {
                expect(onSuccess).toHaveBeenCalled();
            }, { timeout: 3000 });
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
    });
});
