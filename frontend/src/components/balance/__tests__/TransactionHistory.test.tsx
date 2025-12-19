/**
 * Unit Tests for TransactionHistory Component - UPDATED FOR I18N
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionHistory from '../TransactionHistory';
import * as useBalanceHook from '../../../hooks/useBalance';

jest.mock('../../../services/api/balance');
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
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders transaction history with header', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByTestId('history-title')).toBeInTheDocument();
            expect(screen.getByTestId('export-csv-button')).toBeInTheDocument();
        });

        test('renders search and filter controls', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByTestId('search-input')).toBeInTheDocument();
            expect(screen.getByTestId('type-filter')).toBeInTheDocument();
            expect(screen.getByTestId('status-filter')).toBeInTheDocument();
        });

        test('renders transaction table', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByTestId('transactions-table')).toBeInTheDocument();
            expect(screen.getAllByTestId('transaction-row')).toHaveLength(2);
        });

        test('renders pagination controls', () => {
            render(<TransactionHistory userId={1} />);

            expect(screen.getByTestId('pagination')).toBeInTheDocument();
            expect(screen.getByTestId('previous-page-button')).toBeInTheDocument();
            expect(screen.getByTestId('next-page-button')).toBeInTheDocument();
        });
    });

    describe('Search Functionality', () => {
        test('filters transactions by search query', () => {
            render(<TransactionHistory userId={1} />);

            const searchInput = screen.getByTestId('search-input');
            fireEvent.change(searchInput, { target: { value: 'deposit' } });

            const rows = screen.getAllByTestId('transaction-row');
            expect(rows).toHaveLength(1);
        });
    });

    describe('Filter Controls', () => {
        test('type filter changes selection', () => {
            render(<TransactionHistory userId={1} />);

            const typeFilter = screen.getByTestId('type-filter');
            fireEvent.change(typeFilter, { target: { value: 'deposit' } });

            expect(typeFilter).toHaveValue('deposit');
        });

        test('status filter changes selection', () => {
            render(<TransactionHistory userId={1} />);

            const statusFilter = screen.getByTestId('status-filter');
            fireEvent.change(statusFilter, { target: { value: 'completed' } });

            expect(statusFilter).toHaveValue('completed');
        });

        test('date filters work', () => {
            render(<TransactionHistory userId={1} />);

            const startDate = screen.getByTestId('start-date-filter');
            const endDate = screen.getByTestId('end-date-filter');

            fireEvent.change(startDate, { target: { value: '2024-01-01' } });
            fireEvent.change(endDate, { target: { value: '2024-01-31' } });

            expect(startDate).toHaveValue('2024-01-01');
            expect(endDate).toHaveValue('2024-01-31');
        });

        test('clear filters button appears when filters active', () => {
            render(<TransactionHistory userId={1} />);

            const typeFilter = screen.getByTestId('type-filter');
            fireEvent.change(typeFilter, { target: { value: 'deposit' } });

            expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument();
        });

        test('clear filters resets all filters', () => {
            render(<TransactionHistory userId={1} />);

            const typeFilter = screen.getByTestId('type-filter');
            fireEvent.change(typeFilter, { target: { value: 'deposit' } });

            const clearBtn = screen.getByTestId('clear-filters-button');
            fireEvent.click(clearBtn);

            expect(typeFilter).toHaveValue('');
        });
    });

    describe('Export Functionality', () => {
        test('export CSV button is available', () => {
            render(<TransactionHistory userId={1} />);

            const exportBtn = screen.getByTestId('export-csv-button');
            expect(exportBtn).toBeInTheDocument();
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

            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
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

            expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to load transactions');
            expect(screen.getByTestId('retry-button')).toBeInTheDocument();
        });

        test('retry button calls fetchTransactions', () => {
            const mockFetchTransactions = jest.fn();
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: null,
                loading: false,
                error: 'Failed to load transactions',
                fetchBalance: jest.fn(),
                deposit: jest.fn(),
                withdraw: jest.fn(),
                fetchTransactions: mockFetchTransactions,
                generateStatement: jest.fn(),
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<TransactionHistory userId={1} />);

            fireEvent.click(screen.getByTestId('retry-button'));
            expect(mockFetchTransactions).toHaveBeenCalled();
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

            expect(screen.getByTestId('empty-title')).toHaveTextContent('No transactions found');
        });
    });

    describe('Pagination', () => {
        test('previous button disabled on first page', () => {
            render(<TransactionHistory userId={1} />);

            const prevBtn = screen.getByTestId('previous-page-button');
            expect(prevBtn).toBeDisabled();
        });

        test('page number buttons work', () => {
            render(<TransactionHistory userId={1} />);

            const page1Btn = screen.getByTestId('page-1-button');
            expect(page1Btn).toHaveClass('active');
        });
    });
});
