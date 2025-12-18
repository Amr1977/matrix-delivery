/**
 * Unit Tests for DepositModal Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DepositModal from '../DepositModal';
import * as useBalanceHook from '../../../hooks/useBalance';

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

            expect(screen.getByText('Deposit Funds')).toBeInTheDocument();
            expect(screen.getByLabelText('Deposit Amount')).toBeInTheDocument();
            expect(screen.getByText('Current Balance:')).toBeInTheDocument();
            expect(screen.getByText('5000.00 EGP')).toBeInTheDocument();
        });

        test('shows quick amount buttons', () => {
            render(<DepositModal {...defaultProps} />);

            expect(screen.getByText('100 EGP')).toBeInTheDocument();
            expect(screen.getByText('500 EGP')).toBeInTheDocument();
            expect(screen.getByText('1000 EGP')).toBeInTheDocument();
            expect(screen.getByText('5000 EGP')).toBeInTheDocument();
        });

        test('validates minimum amount', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '0.5' } });

            expect(screen.getByText(/Minimum deposit is 1/i)).toBeInTheDocument();
        });

        test('validates maximum amount', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '150000' } });

            expect(screen.getByText(/Maximum deposit is 100,000/i)).toBeInTheDocument();
        });

        test('quick amount button sets value', () => {
            render(<DepositModal {...defaultProps} />);

            fireEvent.click(screen.getByText('1000 EGP'));

            const input = screen.getByLabelText('Deposit Amount') as HTMLInputElement;
            expect(input.value).toBe('1000');
        });

        test('continue button disabled when invalid', () => {
            render(<DepositModal {...defaultProps} />);

            const continueBtn = screen.getByText('Continue');
            expect(continueBtn).toBeDisabled();
        });

        test('continue button enabled when valid amount', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });

            const continueBtn = screen.getByText('Continue');
            expect(continueBtn).not.toBeDisabled();
        });
    });

    describe('Step 2: Payment Method', () => {
        test('shows payment method selector after continue', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));

            expect(screen.getByTestId('payment-selector')).toBeInTheDocument();
        });

        test('shows deposit summary', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));

            expect(screen.getByText('Deposit Amount:')).toBeInTheDocument();
            expect(screen.getByText('100.00 EGP')).toBeInTheDocument();
            expect(screen.getByText('New Balance:')).toBeInTheDocument();
            expect(screen.getByText('5100.00 EGP')).toBeInTheDocument();
        });

        test('back button returns to amount step', () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Back'));

            expect(screen.getByLabelText('Deposit Amount')).toBeInTheDocument();
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
            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));

            // Step 2: Select payment
            fireEvent.click(screen.getByText('Select Payment'));
            fireEvent.click(screen.getByText('Confirm Deposit'));

            await waitFor(() => {
                expect(mockDeposit).toHaveBeenCalledWith(1, 100, 'Balance deposit');
            });
        });

        test('shows success message after deposit', async () => {
            render(<DepositModal {...defaultProps} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Select Payment'));
            fireEvent.click(screen.getByText('Confirm Deposit'));

            await waitFor(() => {
                expect(screen.getByText('Deposit Successful!')).toBeInTheDocument();
            });
        });

        test('calls onSuccess after successful deposit', async () => {
            const onSuccess = jest.fn();
            render(<DepositModal {...defaultProps} onSuccess={onSuccess} />);

            const input = screen.getByLabelText('Deposit Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Select Payment'));
            fireEvent.click(screen.getByText('Confirm Deposit'));

            await waitFor(() => {
                expect(onSuccess).toHaveBeenCalled();
            }, { timeout: 3000 });
        });
    });

    describe('Modal Controls', () => {
        test('close button calls onClose', () => {
            const onClose = jest.fn();
            render(<DepositModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByText('×'));
            expect(onClose).toHaveBeenCalled();
        });

        test('cancel button calls onClose', () => {
            const onClose = jest.fn();
            render(<DepositModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByText('Cancel'));
            expect(onClose).toHaveBeenCalled();
        });
    });
});
