/**
 * Unit Tests for BalanceStatement Component - UPDATED FOR I18N
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import BalanceStatement from '../BalanceStatement';
import * as useBalanceHook from '../../../hooks/useBalance';

jest.mock('../../../services/api/balance');
jest.mock('../../../hooks/useBalance');

const mockUseBalance = useBalanceHook.useBalance as jest.MockedFunction<typeof useBalanceHook.useBalance>;

describe('BalanceStatement', () => {
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
            generateStatement: jest.fn(),
            refreshBalance: jest.fn(),
            clearError: jest.fn()
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders statement generator', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            expect(screen.getByTestId('statement-title')).toBeInTheDocument();
            expect(screen.getByTestId('period-selector')).toBeInTheDocument();
        });

        test('renders all period options', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            expect(screen.getByTestId('period-last7days')).toBeInTheDocument();
            expect(screen.getByTestId('period-last30days')).toBeInTheDocument();
            expect(screen.getByTestId('period-last3months')).toBeInTheDocument();
            expect(screen.getByTestId('period-custom')).toBeInTheDocument();
        });
    });

    describe('Period Selection', () => {
        test('selecting preset period sets dates', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByTestId('period-last7days'));

            // Dates should be set automatically
            const startDate = screen.getByTestId('start-date-input') as HTMLInputElement;
            const endDate = screen.getByTestId('end-date-input') as HTMLInputElement;

            expect(startDate.value).toBeTruthy();
            expect(endDate.value).toBeTruthy();
        });

        test('custom period shows date inputs', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByTestId('period-custom'));

            expect(screen.getByTestId('date-range-selector')).toBeInTheDocument();
        });
    });

    describe('Date Validation', () => {
        test('validates future start date', async () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByTestId('period-custom'));

            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const startDate = screen.getByTestId('start-date-input');
            fireEvent.change(startDate, { target: { value: tomorrow.toISOString().split('T')[0] } });

            fireEvent.click(screen.getByTestId('generate-statement-button'));

            await waitFor(() => {
                expect(mockUseBalance().generateStatement).not.toHaveBeenCalled();
            });
        });

        test('validates end date before start date', async () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByTestId('period-custom'));

            const startDate = screen.getByTestId('start-date-input');
            const endDate = screen.getByTestId('end-date-input');

            fireEvent.change(startDate, { target: { value: '2024-01-31' } });
            fireEvent.change(endDate, { target: { value: '2024-01-01' } });

            fireEvent.click(screen.getByTestId('generate-statement-button'));

            await waitFor(() => {
                expect(mockUseBalance().generateStatement).not.toHaveBeenCalled();
            });
        });

        test('validates period longer than one year', async () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            fireEvent.click(screen.getByTestId('period-custom'));

            const startDate = screen.getByTestId('start-date-input');
            const endDate = screen.getByTestId('end-date-input');

            fireEvent.change(startDate, { target: { value: '2023-01-01' } });
            fireEvent.change(endDate, { target: { value: '2024-02-01' } });

            fireEvent.click(screen.getByTestId('generate-statement-button'));

            await waitFor(() => {
                expect(mockUseBalance().generateStatement).not.toHaveBeenCalled();
            });
        });
    });

    describe('Statement Generation', () => {
        test('generate button disabled without dates', () => {
            render(<BalanceStatement userId={1} userRole="customer" />);

            const generateBtn = screen.getByTestId('generate-statement-button');
            expect(generateBtn).toBeDisabled();
        });

        test('generates statement with valid dates', async () => {
            const mockGenerateStatement = jest.fn();
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

            fireEvent.click(screen.getByTestId('period-last7days'));
            fireEvent.click(screen.getByTestId('generate-statement-button'));

            await waitFor(() => {
                expect(mockGenerateStatement).toHaveBeenCalled();
            });
        });
    });

    describe('Statement Preview', () => {
        test('shows statement preview after generation', () => {
            const mockStatement = {
                period: {
                    startDate: '2024-01-01',
                    endDate: '2024-01-31'
                },
                openingBalance: 1000,
                closingBalance: 5000,
                totalDeposits: 4000,
                totalWithdrawals: 0,
                totalEarnings: 0,
                totalDeductions: 0,
                currency: 'EGP',
                transactions: []
            };

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

            expect(screen.getByTestId('statement-preview')).toBeInTheDocument();
            expect(screen.getByTestId('opening-balance')).toBeInTheDocument();
            expect(screen.getByTestId('closing-balance')).toBeInTheDocument();
        });

        test('shows download buttons in preview', () => {
            const mockStatement = {
                period: { startDate: '2024-01-01', endDate: '2024-01-31' },
                openingBalance: 1000,
                closingBalance: 5000,
                totalDeposits: 4000,
                totalWithdrawals: 0,
                totalEarnings: 0,
                totalDeductions: 0,
                currency: 'EGP',
                transactions: []
            };

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

            expect(screen.getByTestId('download-pdf-button')).toBeInTheDocument();
            expect(screen.getByTestId('download-csv-button')).toBeInTheDocument();
        });

        test('shows driver-specific fields for driver role', () => {
            const mockStatement = {
                period: { startDate: '2024-01-01', endDate: '2024-01-31' },
                openingBalance: 1000,
                closingBalance: 5000,
                totalDeposits: 0,
                totalWithdrawals: 0,
                totalEarnings: 4000,
                totalDeductions: 500,
                currency: 'EGP',
                transactions: []
            };

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

            expect(screen.getByTestId('total-earnings')).toBeInTheDocument();
            expect(screen.getByTestId('total-deductions')).toBeInTheDocument();
        });
    });
});
