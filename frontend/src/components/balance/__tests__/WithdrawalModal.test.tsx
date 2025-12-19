/**
 * Unit Tests for WithdrawalModal Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WithdrawalModal from '../WithdrawalModal';
import * as useBalanceHook from '../../../hooks/useBalance';

jest.mock('../../../services/api/balance');
jest.mock('../../../hooks/useBalance');

const mockUseBalance = useBalanceHook.useBalance as jest.MockedFunction<typeof useBalanceHook.useBalance>;

describe('WithdrawalModal', () => {
    const defaultProps = {
        userId: 1,
        availableBalance: 5000,
        currency: 'EGP',
        dailyLimit: 5000,
        monthlyLimit: 50000,
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
            deposit: jest.fn(),
            withdraw: jest.fn().mockResolvedValue(undefined),
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
        test('renders withdrawal modal with balance info', () => {
            render(<WithdrawalModal {...defaultProps} />);

            expect(screen.getByTestId('modal-title')).toBeInTheDocument();
            expect(screen.getByTestId('balance-info')).toBeInTheDocument();
            expect(screen.getByTestId('available-balance')).toHaveTextContent('5000.00 EGP');
            expect(screen.getByTestId('daily-limit')).toBeInTheDocument();
            expect(screen.getByTestId('monthly-limit')).toBeInTheDocument();
        });

        test('validates minimum withdrawal amount', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '5' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Minimum withdrawal is 10/i);
        });

        test('validates insufficient balance', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '6000' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Insufficient balance/i);
        });

        test('validates daily limit exceeded', () => {
            render(<WithdrawalModal {...defaultProps} dailyLimit={1000} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '2000' } });

            expect(screen.getByTestId('validation-error')).toHaveTextContent(/Daily limit is 1,000/i);
        });

        test('continue button disabled when invalid', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const continueBtn = screen.getByTestId('continue-button');
            expect(continueBtn).toBeDisabled();
        });
    });

    describe('Step 2: Destination Selection', () => {
        test('shows all destination options', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));

            expect(screen.getByTestId('destination-bank')).toBeInTheDocument();
            expect(screen.getByTestId('destination-vodafone')).toBeInTheDocument();
            expect(screen.getByTestId('destination-orange')).toBeInTheDocument();
            expect(screen.getByTestId('destination-etisalat')).toBeInTheDocument();
            expect(screen.getByTestId('destination-instapay')).toBeInTheDocument();
        });

        test('shows bank fields when bank selected', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('destination-bank'));

            expect(screen.getByLabelText('Account Holder Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Bank Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Account Number')).toBeInTheDocument();
        });

        test('shows wallet field when wallet selected', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('destination-vodafone'));

            expect(screen.getByPlaceholderText('01234567890')).toBeInTheDocument();
        });
    });

    describe('Step 3: Confirmation', () => {
        test('shows withdrawal summary', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('destination-vodafone'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByTestId('continue-button')[1]);

            expect(screen.getByTestId('confirmation-summary')).toBeInTheDocument();
        });

        test('shows 24-48 hour processing notice', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('destination-vodafone'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByTestId('continue-button')[1]);

            expect(screen.getByTestId('warning-notice')).toHaveTextContent(/24-48 hours/i);
        });
    });

    describe('Withdrawal Process', () => {
        test('calls withdraw function with correct params', async () => {
            const mockWithdraw = jest.fn().mockResolvedValue(undefined);
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: false,
                error: null,
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: mockWithdraw,
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('destination-vodafone'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByTestId('continue-button')[1]);
            fireEvent.click(screen.getByTestId('confirm-withdrawal-button'));

            await waitFor(() => {
                expect(mockWithdraw).toHaveBeenCalledWith(
                    1,
                    100,
                    'vodafone - 01234567890',
                    'Withdrawal request'
                );
            });
        });

        test('shows success message after withdrawal', async () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('destination-vodafone'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByTestId('continue-button')[1]);
            fireEvent.click(screen.getByTestId('confirm-withdrawal-button'));

            await waitFor(() => {
                expect(screen.getByTestId('success-title')).toHaveTextContent('Withdrawal Request Submitted!');
            });
        });
    });

    describe('Modal Controls', () => {
        test('close button calls onClose', () => {
            const onClose = jest.fn();
            render(<WithdrawalModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByTestId('close-button'));
            expect(onClose).toHaveBeenCalled();
        });

        test('back button navigation works', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByTestId('withdrawal-amount-input');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByTestId('continue-button'));
            fireEvent.click(screen.getByTestId('back-button'));

            expect(screen.getByTestId('withdrawal-amount-input')).toBeInTheDocument();
        });
    });
});
