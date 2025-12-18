/**
 * Balance Dashboard Component
 * Main balance page showing balance overview and recent transactions
 */

import React, { useEffect, useState } from 'react';
import { useBalance } from '../../hooks/useBalance';
import DepositModal from './DepositModal';
import WithdrawalModal from './WithdrawalModal';
import './BalanceDashboard.css';

interface BalanceDashboardProps {
    userId: number;
    userRole: 'customer' | 'driver' | 'admin';
}

const BalanceDashboard: React.FC<BalanceDashboardProps> = ({ userId, userRole }) => {
    const {
        balance,
        transactions,
        loading,
        error,
        fetchBalance,
        fetchTransactions
    } = useBalance();

    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

    useEffect(() => {
        fetchBalance(userId);
        fetchTransactions(userId, { limit: 5 });
    }, [userId, fetchBalance, fetchTransactions]);

    const formatCurrency = (amount: number, currency: string = 'EGP') => {
        return `${amount.toFixed(2)} ${currency}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTransactionIcon = (type: string) => {
        const icons: Record<string, string> = {
            deposit: '💵',
            withdrawal: '💸',
            order_payment: '🛍️',
            order_refund: '↩️',
            earnings: '💰',
            commission_deduction: '📊',
            adjustment: '⚙️',
            hold: '🔒',
            hold_release: '🔓'
        };
        return icons[type] || '💳';
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { text: string; className: string }> = {
            completed: { text: 'Completed', className: 'status-completed' },
            pending: { text: 'Pending', className: 'status-pending' },
            failed: { text: 'Failed', className: 'status-failed' },
            cancelled: { text: 'Cancelled', className: 'status-cancelled' }
        };
        return badges[status] || { text: status, className: 'status-default' };
    };

    if (loading && !balance) {
        return (
            <div className="balance-dashboard loading">
                <div className="loading-spinner">Loading balance...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="balance-dashboard error">
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={() => fetchBalance(userId)}>Retry</button>
                </div>
            </div>
        );
    }

    const isFrozen = balance?.isFrozen || false;

    return (
        <div className="balance-dashboard">
            <div className="dashboard-header">
                <h1>💰 My Balance</h1>
                {userRole === 'driver' && <span className="role-badge">Driver Account</span>}
            </div>

            {isFrozen && (
                <div className="freeze-warning">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-content">
                        <strong>Account Frozen</strong>
                        <p>{balance?.freezeReason || 'Your balance is currently frozen. Please contact support.'}</p>
                    </div>
                </div>
            )}

            <div className="balance-cards">
                <div className="balance-card main-balance">
                    <div className="card-header">
                        <span className="card-icon">💵</span>
                        <span className="card-title">Available Balance</span>
                    </div>
                    <div className="card-amount">
                        {formatCurrency(balance?.availableBalance || 0, balance?.currency)}
                    </div>
                </div>

                <div className="balance-card">
                    <div className="card-header">
                        <span className="card-icon">⏳</span>
                        <span className="card-title">Pending</span>
                    </div>
                    <div className="card-amount secondary">
                        {formatCurrency(balance?.pendingBalance || 0, balance?.currency)}
                    </div>
                </div>

                <div className="balance-card">
                    <div className="card-header">
                        <span className="card-icon">🔒</span>
                        <span className="card-title">Held</span>
                    </div>
                    <div className="card-amount secondary">
                        {formatCurrency(balance?.heldBalance || 0, balance?.currency)}
                    </div>
                </div>

                <div className="balance-card total">
                    <div className="card-header">
                        <span className="card-icon">📊</span>
                        <span className="card-title">Total Balance</span>
                    </div>
                    <div className="card-amount">
                        {formatCurrency(balance?.totalBalance || 0, balance?.currency)}
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <button
                    className="action-btn deposit-btn"
                    onClick={() => setShowDepositModal(true)}
                    disabled={isFrozen}
                >
                    <span className="btn-icon">💵</span>
                    Deposit
                </button>
                <button
                    className="action-btn withdraw-btn"
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={isFrozen}
                >
                    <span className="btn-icon">💸</span>
                    Withdraw
                </button>
            </div>

            <div className="recent-transactions">
                <div className="section-header">
                    <h2>Recent Transactions</h2>
                    <a href="/balance/transactions" className="view-all-link">
                        View All →
                    </a>
                </div>

                {transactions.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>No transactions yet</p>
                        <button
                            className="cta-btn"
                            onClick={() => setShowDepositModal(true)}
                            disabled={isFrozen}
                        >
                            Make Your First Deposit
                        </button>
                    </div>
                ) : (
                    <div className="transactions-list">
                        {transactions.map((transaction) => {
                            const statusBadge = getStatusBadge(transaction.status);
                            return (
                                <div key={transaction.id} className="transaction-item">
                                    <div className="transaction-icon">
                                        {getTransactionIcon(transaction.type)}
                                    </div>
                                    <div className="transaction-details">
                                        <div className="transaction-type">{transaction.description}</div>
                                        <div className="transaction-date">{formatDate(transaction.createdAt)}</div>
                                    </div>
                                    <div className="transaction-amount">
                                        <span className={transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                                            {transaction.amount >= 0 ? '+' : ''}
                                            {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                                        </span>
                                        <span className={`status-badge ${statusBadge.className}`}>
                                            {statusBadge.text}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {userRole === 'driver' && balance && (
                <div className="driver-stats">
                    <h3>Earnings Summary</h3>
                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-label">Lifetime Earnings</span>
                            <span className="stat-value">
                                {formatCurrency(balance.lifetimeEarnings, balance.currency)}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Deposits</span>
                            <span className="stat-value">
                                {formatCurrency(balance.lifetimeDeposits, balance.currency)}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Withdrawals</span>
                            <span className="stat-value">
                                {formatCurrency(balance.lifetimeWithdrawals, balance.currency)}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Transactions</span>
                            <span className="stat-value">{balance.totalTransactions}</span>
                        </div>
                    </div>
                </div>
            )}

            {showDepositModal && (
                <DepositModal
                    userId={userId}
                    currentBalance={balance?.availableBalance || 0}
                    currency={balance?.currency || 'EGP'}
                    onClose={() => setShowDepositModal(false)}
                    onSuccess={() => {
                        setShowDepositModal(false);
                        fetchBalance(userId);
                        fetchTransactions(userId, { limit: 5 });
                    }}
                />
            )}

            {showWithdrawalModal && (
                <WithdrawalModal
                    userId={userId}
                    availableBalance={balance?.availableBalance || 0}
                    currency={balance?.currency || 'EGP'}
                    dailyLimit={balance?.dailyWithdrawalLimit || 5000}
                    monthlyLimit={balance?.monthlyWithdrawalLimit || 50000}
                    onClose={() => setShowWithdrawalModal(false)}
                    onSuccess={() => {
                        setShowWithdrawalModal(false);
                        fetchBalance(userId);
                        fetchTransactions(userId, { limit: 5 });
                    }}
                />
            )}
        </div>
    );
};

export default BalanceDashboard;
