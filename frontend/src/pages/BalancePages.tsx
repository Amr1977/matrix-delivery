/**
 * Balance Page Wrappers
 * These components wrap the balance components to provide user context from auth
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import BalanceDashboard from '../components/balance/BalanceDashboard';
import TransactionHistory from '../components/balance/TransactionHistory';
import BalanceStatement from '../components/balance/BalanceStatement';
import useAuth from '../hooks/useAuth';

// Wrapper for Balance Dashboard
export const BalanceDashboardPage = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0e27'
            }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return (
        <BalanceDashboard
            userId={currentUser.id}
            userRole={currentUser.role || currentUser.primary_role || 'customer'}
        />
    );
};

// Wrapper for Transaction History
export const TransactionHistoryPage = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0e27'
            }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return <TransactionHistory userId={(currentUser as any).id} />;
};

// Wrapper for Balance Statement
export const BalanceStatementPage = () => {
    const { currentUser, loading } = useAuth();

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: '#0a0e27'
            }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>Loading...</div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return (
        <BalanceStatement
            userId={currentUser.id}
            userRole={currentUser.role || currentUser.primary_role || 'customer'}
        />
    );
};
