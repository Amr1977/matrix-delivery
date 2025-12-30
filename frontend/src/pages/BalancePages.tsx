/**
 * Balance Page Wrappers
 * These components wrap the balance components with MainLayout and provide user context
 */

import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BalanceDashboard from '../components/balance/BalanceDashboard';
import TransactionHistory from '../components/balance/TransactionHistory';
import BalanceStatement from '../components/balance/BalanceStatement';
import MainLayout from '../components/layout/MainLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import useAuth from '../hooks/useAuth';
import { useI18n } from '../i18n/i18nContext';

// Wrapper for Balance Dashboard
export const BalanceDashboardPage = () => {
    const { currentUser, loading } = useAuth();
    const { t, locale, changeLocale } = useI18n();
    const navigate = useNavigate();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return (
        <MainLayout
            currentUser={currentUser}
            notifications={[]}
            onNavigate={(view) => {
                if (view === 'notifications') navigate('/notifications');
                else navigate('/');
            }}
            onLogout={() => navigate('/logout')}
            t={t}
            currentLocale={locale}
            onChangeLocale={changeLocale}
            availableRoles={[]}
            unreadCount={0}
        >
            <BalanceDashboard
                userId={(currentUser as any).id}
                userRole={(currentUser as any).primary_role || 'customer'}
            />
        </MainLayout>
    );
};

// Wrapper for Transaction History
export const TransactionHistoryPage = () => {
    const { currentUser, loading } = useAuth();
    const { t, locale, changeLocale } = useI18n();
    const navigate = useNavigate();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return (
        <MainLayout
            currentUser={currentUser}
            notifications={[]}
            onNavigate={(view) => {
                if (view === 'notifications') navigate('/notifications');
                else navigate('/');
            }}
            onLogout={() => navigate('/logout')}
            t={t}
            currentLocale={locale}
            onChangeLocale={changeLocale}
            availableRoles={[]}
            unreadCount={0}
        >
            <TransactionHistory userId={(currentUser as any).id} />
        </MainLayout>
    );
};

// Wrapper for Balance Statement
export const BalanceStatementPage = () => {
    const { currentUser, loading } = useAuth();
    const { t, locale, changeLocale } = useI18n();
    const navigate = useNavigate();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!currentUser) {
        return <Navigate to="/" replace />;
    }

    return (
        <MainLayout
            currentUser={currentUser}
            notifications={[]}
            onNavigate={(view) => {
                if (view === 'notifications') navigate('/notifications');
                else navigate('/');
            }}
            onLogout={() => navigate('/logout')}
            t={t}
            currentLocale={locale}
            onChangeLocale={changeLocale}
            availableRoles={[]}
            unreadCount={0}
        >
            <BalanceStatement
                userId={(currentUser as any).id}
                userRole={(currentUser as any).primary_role || 'customer'}
            />
        </MainLayout>
    );
};
