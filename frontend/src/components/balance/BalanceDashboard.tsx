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
    const [paymentEarnings, setPaymentEarnings] = useState<any>(null);
    const [earningsLoading, setEarningsLoading] = useState(false);

    useEffect(() => {
        fetchBalance(userId);
        fetchTransactions(userId, { limit: 5 });

        // Fetch payment earnings for drivers
        if (userRole === 'driver') {
            setEarningsLoading(true);
            fetch('/api/payments/earnings', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    setPaymentEarnings(data.summary);
                    setEarningsLoading(false);
                })
                .catch(err => {
                    console.error('Failed to fetch earnings:', err);
                    setEarningsLoading(false);
                });
        }
    }, [userId, userRole, fetchBalance, fetchTransactions]);

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
            <div className="balance-dashboard loading" data-testid="balance-loading">
                <div className="loading-spinner" data-testid="loading-spinner">Loading balance...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="balance-dashboard error" data-testid="balance-error">
                <div className="error-message" data-testid="error-message">
                    <span className="error-icon">⚠️</span>
                    <p data-testid="error-text">{error}</p>
                    <button onClick={() => fetchBalance(userId)} data-testid="retry-button">Retry</button>
                </div>
            </div>
        );
    }

    const isFrozen = balance?.isFrozen || false;

    return (
        <div className="balance-dashboard" data-testid="balance-dashboard">
            <div className="dashboard-header" data-testid="dashboard-header">
                <h1 data-testid="dashboard-title">💰 My Balance</h1>
                {userRole === 'driver' && <span className="role-badge" data-testid="driver-badge">Driver Account</span>}
            </div>

            {isFrozen && (
                <div className="freeze-warning" data-testid="freeze-warning">
                    <span className="warning-icon">⚠️</span>
                    <div className="warning-content">
                        <strong>Account Frozen</strong>
                        <p data-testid="freeze-reason">{balance?.freezeReason || 'Your balance is currently frozen. Please contact support.'}</p>
                    </div>
                </div>
            )}

            <div className="balance-cards" data-testid="balance-cards">
                <div className="balance-card main-balance" data-testid="available-balance-card">
                    <div className="card-header">
                        <span className="card-icon">💵</span>
                        <span className="card-title">Available Balance</span>
                    </div>
                    <div className="card-amount" data-testid="available-balance-amount">
                        {formatCurrency(balance?.availableBalance || 0, balance?.currency)}
                    </div>
                </div>

                <div className="balance-card" data-testid="pending-balance-card">
                    <div className="card-header">
                        <span className="card-icon">⏳</span>
                        <span className="card-title">Pending</span>
                    </div>
                    <div className="card-amount secondary" data-testid="pending-balance-amount">
                        {formatCurrency(balance?.pendingBalance || 0, balance?.currency)}
                    </div>
                </div>

                <div className="balance-card" data-testid="held-balance-card">
                    <div className="card-header">
                        <span className="card-icon">🔒</span>
                        <span className="card-title">Held</span>
                    </div>
                    <div className="card-amount secondary" data-testid="held-balance-amount">
                        {formatCurrency(balance?.heldBalance || 0, balance?.currency)}
                    </div>
                </div>

                <div className="balance-card total" data-testid="total-balance-card">
                    <div className="card-header">
                        <span className="card-icon">📊</span>
                        <span className="card-title">Total Balance</span>
                    </div>
                    <div className="card-amount" data-testid="total-balance-amount">
                        {formatCurrency(balance?.totalBalance || 0, balance?.currency)}
                    </div>
                </div>
            </div>

            <div className="quick-actions" data-testid="quick-actions">
                <button
                    className="action-btn deposit-btn"
                    onClick={() => setShowDepositModal(true)}
                    disabled={isFrozen}
                    data-testid="deposit-button"
                >
                    <span className="btn-icon">💵</span>
                    Deposit
                </button>
                <button
                    className="action-btn withdraw-btn"
                    onClick={() => setShowWithdrawalModal(true)}
                    disabled={isFrozen}
                    data-testid="withdraw-button"
                >
                    <span className="btn-icon">💸</span>
                    Withdraw
                </button>
            </div>

            <div className="recent-transactions" data-testid="recent-transactions">
                <div className="section-header">
                    <h2 data-testid="transactions-title">Recent Transactions</h2>
                    <a href="/balance/transactions" className="view-all-link" data-testid="view-all-link">
                        View All →
                    </a>
                </div>

                {transactions.length === 0 ? (
                    <div className="empty-state" data-testid="empty-transactions">
                        <span className="empty-icon">📭</span>
                        <p data-testid="empty-message">No transactions yet</p>
                        <button
                            className="cta-btn"
                            onClick={() => setShowDepositModal(true)}
                            disabled={isFrozen}
                            data-testid="first-deposit-button"
                        >
                            Make Your First Deposit
                        </button>
                    </div>
                ) : (
                    <div className="transactions-list" data-testid="transactions-list">
                        {transactions.map((transaction) => {
                            const statusBadge = getStatusBadge(transaction.status);
                            return (
                                <div key={transaction.id} className="transaction-item" data-testid="transaction-item">
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

            {/* COD Earnings Section for Drivers */}
            {userRole === 'driver' && paymentEarnings && !earningsLoading && (
                <div className="earnings-section" data-testid="earnings-section">
                    <h3 data-testid="cod-earnings-title">💵 COD Earnings Summary</h3>

                    <div className="earnings-breakdown">
                        {/* Cash Collected (Gross) */}
                        <div className="stat-item" data-testid="cash-collected">
                            <span className="stat-label">💵 Cash Collected</span>
                            <span className="stat-value positive">
                                {formatCurrency(paymentEarnings.totalEarnings, balance?.currency)}
                            </span>
                        </div>

                        {/* Platform Commission */}
                        <div className="stat-item" data-testid="platform-commission">
                            <span className="stat-label">🏢 Platform Commission (15%)</span>
                            <span className="stat-value negative">
                                -{formatCurrency(paymentEarnings.platformFee, balance?.currency)}
                            </span>
                        </div>

                        {/* Net Earnings */}
                        <div className="stat-item highlight" data-testid="net-earnings">
                            <span className="stat-label">✅ Net Earnings</span>
                            <span className="stat-value success">
                                {formatCurrency(paymentEarnings.driverEarnings, balance?.currency)}
                            </span>
                        </div>

                        <hr />

                        {/* Current Balance */}
                        <div className="stat-item" data-testid="current-balance-status">
                            <span className="stat-label">💰 Current Balance</span>
                            <span className={`stat-value ${balance && balance.availableBalance < 0 ? 'negative' : 'positive'}`}>
                                {balance && formatCurrency(balance.availableBalance, balance.currency)}
                                {balance && balance.availableBalance < 0 && ' (Debt)'}
                            </span>
                        </div>

                        {/* Warning if debt is high */}
                        {balance && balance.availableBalance < -300 && (
                            <div className="warning-box" data-testid="debt-warning">
                                ⚠️ Your balance is low. Please deposit funds to continue accepting orders.
                            </div>
                        )}

                        {/* Critical warning if blocked */}
                        {balance && balance.availableBalance <= -500 && (
                            <div className="error-box" data-testid="blocked-warning">
                                🚫 You cannot accept new orders until your balance is above -500 EGP.
                                <button onClick={() => setShowDepositModal(true)} className="btn-deposit">
                                    Deposit Now
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Orders Summary */}
                    <div className="orders-summary">
                        <div className="summary-stat">
                            <span>Total Deliveries</span>
                            <span>{paymentEarnings.totalDeliveries}</span>
                        </div>
                        <div className="summary-stat">
                            <span>Completed Payments</span>
                            <span>{paymentEarnings.completedPayments}</span>
                        </div>
                    </div>
                </div>
            )}

            {userRole === 'driver' && balance && (
                <div className="driver-stats" data-testid="driver-stats">
                    <h3 data-testid="earnings-title">Earnings Summary</h3>
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
