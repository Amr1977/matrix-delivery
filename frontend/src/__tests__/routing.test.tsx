import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom/dist/index';
import { BalanceDashboardPage, TransactionHistoryPage, BalanceStatementPage } from '../pages/BalancePages';
import useAuth from '../hooks/useAuth';

// Mock the child components to avoid their inner logic requirements
jest.mock('../components/balance/BalanceDashboard', () => () => <div data-testid="balance-dashboard">Balance Dashboard Component</div>);
jest.mock('../components/balance/TransactionHistory', () => () => <div data-testid="transaction-history">Transaction History Component</div>);
jest.mock('../components/balance/BalanceStatement', () => () => <div data-testid="balance-statement">Balance Statement Component</div>);

// Mock useAuth
jest.mock('../hooks/useAuth');

describe('Balance Pages Routing', () => {
    const mockUseAuth = useAuth;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    const renderWithRouter = (initialEntries) => {
        return render(
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    <Route path="/" element={<div>Landing Page</div>} />
                    <Route path="/balance" element={<BalanceDashboardPage />} />
                    <Route path="/balance/transactions" element={<TransactionHistoryPage />} />
                    <Route path="/balance/statement" element={<BalanceStatementPage />} />
                </Routes>
            </MemoryRouter>
        );
    };

    test('BalanceDashboardPage redirects to landing page if user is not authenticated', () => {
        mockUseAuth.mockReturnValue({ currentUser: null, loading: false });
        renderWithRouter(['/balance']);
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    test('BalanceDashboardPage shows loading state initially', () => {
        mockUseAuth.mockReturnValue({ currentUser: null, loading: true });
        renderWithRouter(['/balance']);
        expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    test('BalanceDashboardPage renders Dashboard if user is authenticated', () => {
        mockUseAuth.mockReturnValue({ currentUser: { id: 1, primary_role: 'driver' }, loading: false });
        renderWithRouter(['/balance']);
        expect(screen.getByTestId('balance-dashboard')).toBeInTheDocument();
    });

    test('TransactionHistoryPage redirects if not authenticated', () => {
        mockUseAuth.mockReturnValue({ currentUser: null, loading: false });
        renderWithRouter(['/balance/transactions']);
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    test('TransactionHistoryPage renders History if authenticated', () => {
        mockUseAuth.mockReturnValue({ currentUser: { id: 1 }, loading: false });
        renderWithRouter(['/balance/transactions']);
        expect(screen.getByTestId('transaction-history')).toBeInTheDocument();
    });

    test('BalanceStatementPage redirects if not authenticated', () => {
        mockUseAuth.mockReturnValue({ currentUser: null, loading: false });
        renderWithRouter(['/balance/statement']);
        expect(screen.getByText('Landing Page')).toBeInTheDocument();
    });

    test('BalanceStatementPage renders Statement if authenticated', () => {
        mockUseAuth.mockReturnValue({ currentUser: { id: 1 }, loading: false });
        renderWithRouter(['/balance/statement']);
        expect(screen.getByTestId('balance-statement')).toBeInTheDocument();
    });
});
