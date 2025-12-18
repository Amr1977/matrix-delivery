/**
 * Unit Tests for TransactionHistory Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionHistory from '../TransactionHistory';
import * as useBalanceHook from '../../../hooks/useBalance';

jest.mock('../../../hooks/useBalance');

const mockUseBalance = useBalanceHook.useBalance as jest.MockedFunction<typeof useBalanceHook.useBalance>;

describe('TransactionHistory', () => {
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
        },
        {
            id: 3,
            userId: 1,
            type: 'order_payment' as const,
            amount: -200,
            currency: 'EGP',
            description: 'Order payment',
            status: 'completed' as const,
            balanceAfter: 4300,
            createdAt: '2024-01-13T10:00:00Z',
            orderId: 123
        }
    ];

    beforeEach(() => {
        mockUseBalance.mockReturnValue({
            balance: null,
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

        // Mock URL.createObjectURL for CSV export
        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.URL.revokeObjectURL = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders transaction history page', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('Transaction History')).toBeInTheDocument();
            expect(screen.getByText('Export CSV')).toBeInTheDocument();
        });

        test('renders all transactions', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('Test deposit')).toBeInTheDocument();
            expect(screen.getByText('Test withdrawal')).toBeInTheDocument();
            expect(screen.getByText('Order payment')).toBeInTheDocument();
        });

        test('shows transaction icons', () => {
            render(<TransactionHistory userId={1} />);

            const icons = screen.getAllByText(/💵|💸|🛍️/);
            expect(icons.length).toBeGreaterThan(0);
        });

        test('shows status badges', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('Completed')).toBeInTheDocument();
            expect(screen.getByText('Pending')).toBeInTheDocument();
        });
    });

    describe('Filtering', () => {
        test('renders filter controls', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('All Types')).toBeInTheDocument();
            expect(screen.getByText('All Statuses')).toBeInTheDocument();
        });

        test('type filter changes selection', () => {
            render(<TransactionHistory userId={1} />);

            const typeFilter = screen.getByDisplayValue('All Types');
            fireEvent.change(typeFilter, { target: { value: 'deposit' } });

            expect(typeFilter).toHaveValue('deposit');
        });

        test('status filter changes selection', () => {
            render(<TransactionHistory userId={1} />);

            const statusFilter = screen.getByDisplayValue('All Statuses');
            fireEvent.change(statusFilter, { target: { value: 'completed' } });

            expect(statusFilter).toHaveValue('completed');
        });

        test('shows clear filters button when filters active', () => {
            render(<TransactionHistory userId={1} />);

            const typeFilter = screen.getByDisplayValue('All Types');
            fireEvent.change(typeFilter, { target: { value: 'deposit' } });

            expect(screen.getByText(/Clear Filters \(1\)/i)).toBeInTheDocument();
        });

        test('clear filters button resets all filters', () => {
            render(<TransactionHistory userId={1} />);

            const typeFilter = screen.getByDisplayValue('All Types');
            fireEvent.change(typeFilter, { target: { value: 'deposit' } });

            const clearBtn = screen.getByText(/Clear Filters/i);
            fireEvent.click(clearBtn);

            expect(typeFilter).toHaveValue('');
        });
    });

    describe('Search', () => {
        test('renders search box', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByPlaceholderText('Search transactions...')).toBeInTheDocument();
        });

        test('search filters transactions', () => {
            render(<TransactionHistory userId={1} />);

            const searchInput = screen.getByPlaceholderText('Search transactions...');
            fireEvent.change(searchInput, { target: { value: 'deposit' } });

            expect(screen.getByText('Test deposit')).toBeInTheDocument();
            expect(screen.queryByText('Test withdrawal')).not.toBeInTheDocument();
        });
    });

    describe('Pagination', () => {
        test('renders pagination controls', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('← Previous')).toBeInTheDocument();
            expect(screen.getByText('Next →')).toBeInTheDocument();
            expect(screen.getByText(/Page 1 of/i)).toBeInTheDocument();
        });

        test('previous button disabled on first page', () => {
            render(<TransactionHistory userId={1} />);

            const prevBtn = screen.getByText('← Previous');
            expect(prevBtn).toBeDisabled();
        });

        test('page number buttons work', () => {
            render(<TransactionHistory userId={1} />);

            const pageBtn = screen.getByText('1');
            expect(pageBtn).toHaveClass('active');
        });
    });

    describe('CSV Export', () => {
        test('export button triggers CSV download', () => {
            const createElementSpy = jest.spyOn(document, 'createElement');

            render(<TransactionHistory userId={1} />);

            const exportBtn = screen.getByText('Export CSV');
            fireEvent.click(exportBtn);

            expect(createElementSpy).toHaveBeenCalledWith('a');
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

            render(<TransactionHistory userId={1} />);

            expect(screen.getByText(/Loading transactions/i)).toBeInTheDocument();
        });
    });

    describe('Error State', () => {
        test('shows error message when error occurs', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: false,
                error: 'Failed to load transactions',
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: jest.fn(),
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('Failed to load transactions')).toBeInTheDocument();
        });
    });

    describe('Empty State', () => {
        test('shows empty state when no transactions', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
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

            render(<TransactionHistory userId={1} />);

            expect(screen.getByText('No transactions found')).toBeInTheDocument();
        });
    });
});
