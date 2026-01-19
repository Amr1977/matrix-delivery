/**
 * Transaction History Component
 * Full transaction list with filtering, search, and export
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBalance } from '../../hooks/useBalance';
import { useI18n } from '../../i18n/i18nContext';
import type { TransactionType, TransactionStatus, TransactionFilters } from '../../types/balance';
import './TransactionHistory.css';

interface TransactionHistoryProps {
    userId: number;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ userId }) => {
    const navigate = useNavigate();
    const { t, language } = useI18n();
    const { transactions, loading, error, fetchTransactions, cancelWithdrawal } = useBalance();
    const [filters, setFilters] = useState<TransactionFilters>({
        limit: 20,
        offset: 0
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        loadTransactions();
    }, [userId, filters]);

    const loadTransactions = async () => {
        await fetchTransactions(userId, filters);
        // Calculate total pages (would come from API in production)
        setTotalPages(Math.ceil(50 / (filters.limit || 20)));
    };

    const handleFilterChange = (key: keyof TransactionFilters, value: any) => {
        setFilters({ ...filters, [key]: value, offset: 0 });
        setCurrentPage(1);
    };

    const handlePageChange = (page: number) => {
        const newOffset = (page - 1) * (filters.limit || 20);
        setFilters({ ...filters, offset: newOffset });
        setCurrentPage(page);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        // In production, this would trigger API call with search parameter
    };

    const handleExportCSV = () => {
        const headers = ['Date', 'Type', 'Description', 'Amount', 'Status', 'Balance After'];
        const rows = transactions.map(t => [
            new Date(t.createdAt).toLocaleDateString(),
            t.type,
            t.description,
            t.amount.toFixed(2),
            t.status,
            t.balanceAfter.toFixed(2)
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const clearFilters = () => {
        setFilters({ limit: 20, offset: 0 });
        setSearchQuery('');
        setCurrentPage(1);
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
        const badges: Record<string, { text: string; className: string; icon: string }> = {
            completed: { text: t('transactionHistory.statusCompleted'), className: 'status-completed', icon: '✓' },
            pending: { text: t('transactionHistory.statusPending'), className: 'status-pending', icon: '⏳' },
            failed: { text: t('transactionHistory.statusFailed'), className: 'status-failed', icon: '✗' },
            cancelled: { text: t('transactionHistory.statusCancelled'), className: 'status-cancelled', icon: '⊘' }
        };
        return badges[status] || { text: status, className: 'status-default', icon: '•' };
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number, currency: string = 'EGP') => {
        return `${amount.toFixed(2)} ${currency}`;
    };

    const handleCancelWithdrawal = async (transactionId: number, withdrawalRequestId?: number) => {
        if (!withdrawalRequestId) {
            return;
        }
        const confirmed = window.confirm(t('transactionHistory.cancelConfirm'));
        if (!confirmed) {
            return;
        }
        await cancelWithdrawal(userId, withdrawalRequestId, t('transactionHistory.cancelledFromHistory'));
        await loadTransactions();
    };

    const filteredTransactions = transactions.filter(t =>
        searchQuery ? t.description.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );

    const activeFiltersCount =
        (filters.type ? 1 : 0) +
        (filters.status ? 1 : 0) +
        (filters.startDate ? 1 : 0);

    return (
        <div className="transaction-history" data-testid="transaction-history">
            <div className="history-header" data-testid="history-header">
                <button onClick={() => navigate(-1)} className="back-btn matrix-btn-ghost">
                    ← {t('transactionHistory.back') || 'Back'}
                </button>
                <div className="header-title-group">
                    <h1 data-testid="history-title">{t('transactionHistory.title')}</h1>
                    <button className="export-btn" onClick={handleExportCSV} data-testid="export-csv-button">
                        <span className="btn-icon">📥</span>
                        {t('transactionHistory.exportCSV')}
                    </button>
                </div>
            </div>

            <div className="filters-section" data-testid="filters-section">
                <div className="search-box" data-testid="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder={t('transactionHistory.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        data-testid="search-input"
                    />
                </div>

                <div className="filter-controls" data-testid="filter-controls">
                    <select
                        value={filters.type || ''}
                        onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                        data-testid="type-filter"
                    >
                        <option value="">{t('transactionHistory.allTypes')}</option>
                        <option value="deposit">{t('transactionHistory.typeDeposit')}</option>
                        <option value="withdrawal">{t('transactionHistory.typeWithdrawal')}</option>
                        <option value="order_payment">{t('transactionHistory.typeOrderPayment')}</option>
                        <option value="order_refund">{t('transactionHistory.typeOrderRefund')}</option>
                        <option value="earnings">{t('transactionHistory.typeEarnings')}</option>
                        <option value="commission_deduction">{t('transactionHistory.typeCommission')}</option>
                    </select>

                    <select
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                        data-testid="status-filter"
                    >
                        <option value="">{t('transactionHistory.allStatuses')}</option>
                        <option value="completed">{t('transactionHistory.statusCompleted')}</option>
                        <option value="pending">{t('transactionHistory.statusPending')}</option>
                        <option value="failed">{t('transactionHistory.statusFailed')}</option>
                        <option value="cancelled">{t('transactionHistory.statusCancelled')}</option>
                    </select>

                    <input
                        type="date"
                        placeholder={t('transactionHistory.startDate')}
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                        data-testid="start-date-filter"
                    />

                    <input
                        type="date"
                        placeholder={t('transactionHistory.endDate')}
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                        data-testid="end-date-filter"
                    />

                    {activeFiltersCount > 0 && (
                        <button className="clear-filters-btn" onClick={clearFilters} data-testid="clear-filters-button">
                            {t('transactionHistory.clearFilters')} ({activeFiltersCount})
                        </button>
                    )}
                </div>
            </div>

            {loading && !transactions.length ? (
                <div className="loading-state" data-testid="loading-state">
                    <div className="spinner" data-testid="loading-spinner"></div>
                    <p>{t('transactionHistory.loading')}</p>
                </div>
            ) : error ? (
                <div className="error-state" data-testid="error-state">
                    <span className="error-icon">⚠️</span>
                    <p data-testid="error-message">{error}</p>
                    <button onClick={loadTransactions} data-testid="retry-button">{t('transactionHistory.retry')}</button>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="empty-state" data-testid="empty-state">
                    <span className="empty-icon">📭</span>
                    <h3 data-testid="empty-title">{t('transactionHistory.noTransactions')}</h3>
                    <p>{t('transactionHistory.noTransactionsHint')}</p>
                </div>
            ) : (
                <>
                    <div className="transactions-table" data-testid="transactions-table">
                        <div className="table-header" data-testid="table-header">
                            <div className="col-icon"></div>
                            <div className="col-type">{t('transactionHistory.type')}</div>
                            <div className="col-description">{t('transactionHistory.description')}</div>
                            <div className="col-date">{t('transactionHistory.date')}</div>
                            <div className="col-amount">{t('transactionHistory.amount')}</div>
                            <div className="col-status">{t('transactionHistory.status')}</div>
                            <div className="col-balance">{t('transactionHistory.balanceAfter')}</div>
                            <div className="col-actions">{t('transactionHistory.actions')}</div>
                        </div>

                        <div className="table-body" data-testid="table-body">
                            {filteredTransactions.map((transaction) => {
                                const statusBadge = getStatusBadge(transaction.status);
                                return (
                                    <div key={transaction.id} className="table-row" data-testid="transaction-row">
                                        <div className="col-icon">
                                            <span className="transaction-icon">
                                                {getTransactionIcon(transaction.type)}
                                            </span>
                                        </div>
                                        <div className="col-type">
                                            <span className="type-label">
                                                {['deposit', 'withdrawal', 'order_payment', 'order_refund', 'earnings', 'commission_deduction'].includes(transaction.type)
                                                    ? t(`transactionHistory.type${transaction.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('')}`)
                                                    : transaction.type.replace(/_/g, ' ')
                                                }
                                            </span>
                                        </div>
                                        <div className="col-description">
                                            <span className="description-text">{transaction.description}</span>
                                            {transaction.orderId && (
                                                <span className="order-id">Order #{transaction.orderId}</span>
                                            )}
                                        </div>
                                        <div className="col-date">
                                            {formatDate(transaction.createdAt)}
                                        </div>
                                        <div className="col-amount">
                                            <span className={transaction.amount >= 0 ? 'amount-positive' : 'amount-negative'}>
                                                {transaction.amount >= 0 ? '+' : ''}
                                                {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                                            </span>
                                        </div>
                                        <div className="col-status">
                                            <span className={`status-badge ${statusBadge.className}`}>
                                                <span className="status-icon">{statusBadge.icon}</span>
                                                {statusBadge.text}
                                            </span>
                                        </div>
                                        <div className="col-balance">
                                            {formatCurrency(transaction.balanceAfter, transaction.currency)}
                                        </div>
                                        <div className="col-actions">
                                            {transaction.type === 'withdrawal' && transaction.status === 'pending' && (
                                                <button
                                                    className="cancel-withdrawal-btn"
                                                    onClick={() => handleCancelWithdrawal(transaction.id, transaction.withdrawalRequestId)}
                                                    data-testid="cancel-withdrawal-button"
                                                >
                                                    {t('transactionHistory.cancel')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pagination" data-testid="pagination">
                        <button
                            className="page-btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            data-testid="previous-page-button"
                        >
                            ← {t('transactionHistory.previous')}
                        </button>

                        <div className="page-numbers" data-testid="page-numbers">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
                                        data-testid={`page-${page}-button`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            className="page-btn"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            data-testid="next-page-button"
                        >
                            {t('transactionHistory.next')} →
                        </button>

                        <div className="page-info" data-testid="page-info">
                            {t('transactionHistory.pageInfo').replace('{current}', currentPage.toString()).replace('{total}', totalPages.toString())}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionHistory;
