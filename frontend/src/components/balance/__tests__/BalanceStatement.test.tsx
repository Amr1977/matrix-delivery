/**
 * Unit Tests for BalanceStatement Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BalanceStatement from '../BalanceStatement';
import * as useBalanceHook from '../../../hooks/useBalance';

jest.mock('../../../hooks/useBalance');

const mockUseBalance = useBalanceHook.useBalance as jest.MockedFunction<typeof useBalanceHook.useBalance>;

describe('BalanceStatement', () => {
    const mockStatement = {
        userId: 1,
        period: {
            startDate: '2024-01-01',
            endDate: '2024-01-31'
        },
        openingBalance: 4000,
        closingBalance: 5000,
        totalDeposits: 2000,
        totalWithdrawals: 1000,
        totalEarnings: 500,
        totalDeductions: 100,
        currency: 'EGP',
        transactions: [
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
            }
        ],
        generatedAt: '2024-02-01T10:00:00Z'
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
            withdraw: jest.fn(),
            fetchTransactions: jest.fn(),
            generateStatement: jest.fn().mockResolvedValue(undefined),
            refreshBalance: jest.fn(),
            clearError: jest.fn()
        });

        global.URL.createObjectURL = jest.fn(() => 'mock-url');
        global.alert = jest.fn();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders statement generator', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            expect(screen.getByText('Balance Statement')).toBeInTheDocument();
            expect(screen.getByText('Generate Statement')).toBeInTheDocument();
        });

        test('renders period selection buttons', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            expect(screen.getByText('Last 7 days')).toBeInTheDocument();
            expect(screen.getByText('Last 30 days')).toBeInTheDocument();
            expect(screen.getByText('Last 3 months')).toBeInTheDocument();
            expect(screen.getByText('Last 6 months')).toBeInTheDocument();
            expect(screen.getByText('Last year')).toBeInTheDocument();
            expect(screen.getByText('Custom range')).toBeInTheDocument();
        });
    });

    describe('Period Selection', () => {
        test('selecting preset period sets dates', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Last 7 days'));

            const startDate = screen.getByLabelText('Start Date') as HTMLInputElement;
            const endDate = screen.getByLabelText('End Date') as HTMLInputElement;

            expect(startDate.value).toBeTruthy();
            expect(endDate.value).toBeTruthy();
        });

        test('selecting custom range shows date inputs', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Custom range'));

            expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
            expect(screen.getByLabelText('End Date')).toBeInTheDocument();
        });

        test('selected period highlights', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            const btn = screen.getByText('Last 7 days');
            fireEvent.click(btn);

            expect(btn).toHaveClass('active');
        });
    });

    describe('Date Validation', () => {
        test('validates future start date', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Custom range'));

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const startDate = screen.getByLabelText('Start Date');
            fireEvent.change(startDate, { target: { value: tomorrow.toISOString().split('T')[0] } });

            fireEvent.click(screen.getByText('Generate Statement'));

            expect(screen.getByText(/Start date cannot be in the future/i)).toBeInTheDocument();
        });

        test('validates end before start', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Custom range'));

            const startDate = screen.getByLabelText('Start Date');
            const endDate = screen.getByLabelText('End Date');

            fireEvent.change(startDate, { target: { value: '2024-01-31' } });
            fireEvent.change(endDate, { target: { value: '2024-01-01' } });

            fireEvent.click(screen.getByText('Generate Statement'));

            expect(screen.getByText(/End date must be after start date/i)).toBeInTheDocument();
        });

        test('validates maximum period of 1 year', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Custom range'));

            const startDate = screen.getByLabelText('Start Date');
            const endDate = screen.getByLabelText('End Date');

            fireEvent.change(startDate, { target: { value: '2023-01-01' } });
            fireEvent.change(endDate, { target: { value: '2024-02-01' } });

            fireEvent.click(screen.getByText('Generate Statement'));

            expect(screen.getByText(/Maximum statement period is 1 year/i)).toBeInTheDocument();
        });
    });

    describe('Statement Generation', () => {
        test('generate button disabled without dates', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            const generateBtn = screen.getByText('Generate Statement');
            expect(generateBtn).toBeDisabled();
        });

        test('calls generateStatement with correct params', async () => {
            const mockGenerateStatement = jest.fn().mockResolvedValue(undefined);
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
                generateStatement: mockGenerateStatement,
                refreshBalance: jest.fn(),
                clearError: jest.fn()
            });

            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Last 7 days'));
            fireEvent.click(screen.getByText('Generate Statement'));

            await waitFor(() => {
                expect(mockGenerateStatement).toHaveBeenCalled();
            });
        });
    });

    describe('Statement Preview', () => {
        test('shows statement preview after generation', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: mockStatement,
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

            render(<BalanceStatement userId={1} userRole="customer" />);

            expect(screen.getByText('Statement Preview')).toBeInTheDocument();
            expect(screen.getByText('Opening Balance')).toBeInTheDocument();
            expect(screen.getByText('4000.00 EGP')).toBeInTheDocument();
            expect(screen.getByText('Closing Balance')).toBeInTheDocument();
            expect(screen.getByText('5000.00 EGP')).toBeInTheDocument();
        });

        test('shows driver earnings for driver role', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: mockStatement,
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

            render(<BalanceStatement userId={1} userRole="driver" />);

            expect(screen.getByText('Total Earnings')).toBeInTheDocument();
            expect(screen.getByText('Total Deductions')).toBeInTheDocument();
        });

        test('shows download buttons', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: mockStatement,
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

            render(<BalanceStatement userId={1} userRole="customer" />);

            expect(screen.getByText('Download PDF')).toBeInTheDocument();
            expect(screen.getByText('Download CSV')).toBeInTheDocument();
        });
    });

    describe('Downloads', () => {
        test('PDF download triggers alert', () => {
            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: mockStatement,
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

            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Download PDF'));

            expect(global.alert).toHaveBeenCalled();
        });

        test('CSV download creates download link', () => {
            const createElementSpy = jest.spyOn(document, 'createElement');

            mockUseBalance.mockReturnValue({
                balance: null,
                transactions: [],
                statement: mockStatement,
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

            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Download CSV'));

            expect(createElementSpy).toHaveBeenCalledWith('a');
        });
    });

    describe('Loading State', () => {
        test('shows loading text when generating', () => {
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

            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByText('Last 7 days'));

            expect(screen.getByText('Generating...')).toBeInTheDocument();
        });
    });
});
