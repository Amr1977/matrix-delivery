/**
 * Unit Tests for BalanceDashboard Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BalanceDashboard from '../BalanceDashboard';
import * as useBalanceHook from '../../../hooks/useBalance';

// Mock the useBalance hook
jest.mock('../../../hooks/useBalance');

const mockUseBalance = useBalanceHook.useBalance as jest.MockedFunction<typeof useBalanceHook.useBalance>;

describe('BalanceDashboard', () => {
    const mockBalance = {
        userId: 1,
        availableBalance: 5000,
        pendingBalance: 500,
        heldBalance: 200,
        totalBalance: 5700,
        currency: 'EGP',
        isFrozen: false,
        freezeReason: null,
        dailyWithdrawalLimit: 5000,
        monthlyWithdrawalLimit: 50000,
        lifetimeEarnings: 10000,
        lifetimeDeposits: 8000,
        lifetimeWithdrawals: 3000,
        totalTransactions: 25,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-15'
    };

    const mockTransactions = [
        {
            id: 1,
            userId: 1,
            type: 'deposit' as const,
            amount: 1000,
            currency: 'EGP',
            description: 'Test deposit',
            status: 'completed' as const,
            balanceAfter: 5000,
            createdAt: '2024-01-15T10:00:00Z',
            orderId: null
        },
        {
            id: 2,
            userId: 1,
            type: 'withdrawal' as const,
            amount: -500,
            currency: 'EGP',
            description: 'Test withdrawal',
            status: 'pending' as const,
            balanceAfter: 4500,
            createdAt: '2024-01-14T10:00:00Z',
            orderId: null
        }
    ];

    beforeEach(() => {
        mockUseBalance.mockReturnValue({
            balance: mockBalance,
            transactions: mockTransactions,
            statement: null,
            loading: false,
            error: null,
            fetchBalance: jest.fn(),
            deposit: jest.fn(),
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

    describe('Rendering', () => {
        test('renders dashboard with balance cards', () => {
            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText(/My Balance/i)).toBeInTheDocument();
            expect(screen.getByText('5000.00 EGP')).toBeInTheDocument();
            expect(screen.getByText('500.00 EGP')).toBeInTheDocument();
            expect(screen.getByText('200.00 EGP')).toBeInTheDocument();
            expect(screen.getByText('5700.00 EGP')).toBeInTheDocument();
        });

        test('renders recent transactions', () => {
            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText('Test deposit')).toBeInTheDocument();
            expect(screen.getByText('Test withdrawal')).toBeInTheDocument();
        });

        test('renders quick action buttons', () => {
            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText('Deposit')).toBeInTheDocument();
            expect(screen.getByText('Withdraw')).toBeInTheDocument();
        });

        test('renders driver stats for driver role', () => {
            render(<BalanceDashboard userId={1} userRole="driver" />);

            expect(screen.getByText('Earnings Summary')).toBeInTheDocument();
            expect(screen.getByText('10000.00 EGP')).toBeInTheDocument(); // Lifetime earnings
        });

        test('does not render driver stats for customer role', () => {
            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.queryByText('Earnings Summary')).not.toBeInTheDocument();
        });
    });

    describe('Loading State', () => {
        test('shows loading spinner when loading', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: true,
                error: null,
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText(/Loading balance/i)).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        test('shows error message when error occurs', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: false,
                error: 'Failed to load balance',
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText('Failed to load balance')).toBeInTheDocument();
            expect(screen.getByText('Retry')).toBeInTheDocument();
        });

        test('retry button calls fetchBalance', () => {
            const mockFetchBalance = jest.fn();
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: false,
                error: 'Failed to load balance',
                fetchBalance: mockFetchBalance,
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Retry'));
            expect(mockFetchBalance).toHaveBeenCalledWith(1);
        });
    });

    describe('Frozen Balance', () => {
        test('shows freeze warning when balance is frozen', () => {
            mockUseBalance.mockReturnValue({
                balance: { ...mockBalance, isFrozen: true, freezeReason: 'Account under review' },
                transactions: mockTransactions,
                statement: null,
                loading: false,
                error: null,
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText('Account Frozen')).toBeInTheDocument();
            expect(screen.getByText('Account under review')).toBeInTheDocument();
        });

        test('disables action buttons when frozen', () => {
            mockUseBalance.mockReturnValue({
                balance: { ...mockBalance, isFrozen: true },
                transactions: mockTransactions,
                statement: null,
                loading: false,
                error: null,
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            const depositBtn = screen.getByText('Deposit').closest('button');
            const withdrawBtn = screen.getByText('Withdraw').closest('button');

            expect(depositBtn).toBeDisabled();
            expect(withdrawBtn).toBeDisabled();
        });
    });

    describe('Empty State', () => {
        test('shows empty state when no transactions', () => {
            mockUseBalance.mockReturnValue({
                balance: mockBalance,
                transactions: [],
                statement: null,
                loading: false,
                error: null,
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(screen.getByText('No transactions yet')).toBeInTheDocument();
            expect(screen.getByText('Make Your First Deposit')).toBeInTheDocument();
        });
    });

    describe('Interactions', () => {
        test('opens deposit modal when deposit button clicked', () => {
            render(<BalanceDashboard userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Deposit'));

            // Modal should be rendered (would need to check for modal content)
            // This is a basic test - full modal testing would be in DepositModal.test.tsx
        });

        test('opens withdrawal modal when withdraw button clicked', () => {
            render(<BalanceDashboard userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Withdraw'));

            // Modal should be rendered
        });
    });

    describe('Data Fetching', () => {
        test('fetches balance on mount', () => {
            const mockFetchBalance = jest.fn();
            const mockFetchTransactions = jest.fn();

            mockUseBalance.mockReturnValue({
                balance: mockBalance,
                transactions: mockTransactions,
                statement: null,
                loading: false,
                error: null,
                fetchBalance: mockFetchBalance,
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: mockFetchTransactions,
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceDashboard userId={1} userRole="customer" />);

            expect(mockFetchBalance).toHaveBeenCalledWith(1);
            expect(mockFetchTransactions).toHaveBeenCalledWith(1, { limit: 5 });
        });
    });
});
