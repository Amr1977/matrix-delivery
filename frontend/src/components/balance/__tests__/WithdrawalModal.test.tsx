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

            expect(screen.getByText('Withdraw Funds')).toBeInTheDocument();
            expect(screen.getByText('Available Balance:')).toBeInTheDocument();
            expect(screen.getByText('5000.00 EGP')).toBeInTheDocument();
            expect(screen.getByText('Daily Limit:')).toBeInTheDocument();
            expect(screen.getByText('Monthly Limit:')).toBeInTheDocument();
        });

        test('validates minimum withdrawal amount', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '5' } });

            expect(screen.getByText(/Minimum withdrawal is 10/i)).toBeInTheDocument();
        });

        test('validates insufficient balance', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '6000' } });

            expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
        });

        test('validates daily limit exceeded', () => {
            render(<WithdrawalModal {...defaultProps} dailyLimit={1000} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '2000' } });

            expect(screen.getByText(/Daily limit is 1,000/i)).toBeInTheDocument();
        });

        test('continue button disabled when invalid', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const continueBtn = screen.getByText('Continue');
            expect(continueBtn).toBeDisabled();
        });
    });

    describe('Step 2: Destination Selection', () => {
        test('shows all destination options', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));

            expect(screen.getByText('Bank Transfer')).toBeInTheDocument();
            expect(screen.getByText('Vodafone Cash')).toBeInTheDocument();
            expect(screen.getByText('Orange Cash')).toBeInTheDocument();
            expect(screen.getByText('Etisalat Cash')).toBeInTheDocument();
            expect(screen.getByText('InstaPay')).toBeInTheDocument();
        });

        test('shows bank fields when bank selected', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Bank Transfer'));

            expect(screen.getByLabelText('Account Holder Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Bank Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Account Number')).toBeInTheDocument();
        });

        test('shows wallet field when wallet selected', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Vodafone Cash'));

            expect(screen.getByPlaceholderText('01234567890')).toBeInTheDocument();
        });
    });

    describe('Step 3: Confirmation', () => {
        test('shows withdrawal summary', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Vodafone Cash'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByText('Continue')[1]);

            expect(screen.getByText('Confirm Withdrawal')).toBeInTheDocument();
            expect(screen.getByText('Amount:')).toBeInTheDocument();
            expect(screen.getByText('100.00 EGP')).toBeInTheDocument();
        });

        test('shows 24-48 hour processing notice', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Vodafone Cash'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByText('Continue')[1]);

            expect(screen.getByText(/24-48 hours/i)).toBeInTheDocument();
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

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Vodafone Cash'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByText('Continue')[1]);
            fireEvent.click(screen.getByText('Confirm Withdrawal'));

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

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Vodafone Cash'));

            const walletInput = screen.getByPlaceholderText('01234567890');
            fireEvent.change(walletInput, { target: { value: '01234567890' } });
            fireEvent.click(screen.getAllByText('Continue')[1]);
            fireEvent.click(screen.getByText('Confirm Withdrawal'));

            await waitFor(() => {
                expect(screen.getByText('Withdrawal Request Submitted!')).toBeInTheDocument();
            });
        });
    });

    describe('Modal Controls', () => {
        test('close button calls onClose', () => {
            const onClose = jest.fn();
            render(<WithdrawalModal {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByText('×'));
            expect(onClose).toHaveBeenCalled();
        });

        test('back button navigation works', () => {
            render(<WithdrawalModal {...defaultProps} />);

            const input = screen.getByLabelText('Withdrawal Amount');
            fireEvent.change(input, { target: { value: '100' } });
            fireEvent.click(screen.getByText('Continue'));
            fireEvent.click(screen.getByText('Back'));

            expect(screen.getByLabelText('Withdrawal Amount')).toBeInTheDocument();
        });
    });
});
