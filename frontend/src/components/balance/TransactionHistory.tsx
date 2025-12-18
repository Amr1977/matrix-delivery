/**
 * Transaction History Component
 * Full transaction list with filtering, search, and export
 */

import React, { useEffect, useState } from 'react';
import { useBalance } from '../../hooks/useBalance';
import type { TransactionType, TransactionStatus, TransactionFilters } from '../../types/balance';
import './TransactionHistory.css';

interface TransactionHistoryProps {
    userId: number;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ userId }) => {
    const { transactions, loading, error, fetchTransactions } = useBalance();
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
            completed: { text: 'Completed', className: 'status-completed', icon: '✓' },
            pending: { text: 'Pending', className: 'status-pending', icon: '⏳' },
            failed: { text: 'Failed', className: 'status-failed', icon: '✗' },
            cancelled: { text: 'Cancelled', className: 'status-cancelled', icon: '⊘' }
        };
        return badges[status] || { text: status, className: 'status-default', icon: '•' };
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

    const formatCurrency = (amount: number, currency: string = 'EGP') => {
        return `${amount.toFixed(2)} ${currency}`;
    };

    const filteredTransactions = transactions.filter(t =>
        searchQuery ? t.description.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );

    const activeFiltersCount =
        (filters.type ? 1 : 0) +
        (filters.status ? 1 : 0) +
        (filters.startDate ? 1 : 0);

    return (
        <div className="transaction-history">
            <div className="history-header">
                <h1>📊 Transaction History</h1>
                <button className="export-btn" onClick={handleExportCSV}>
                    <span className="btn-icon">📥</span>
                    Export CSV
                </button>
            </div>

            <div className="filters-section">
                <div className="search-box">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="filter-controls">
                    <select
                        value={filters.type || ''}
                        onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
                    >
                        <option value="">All Types</option>
                        <option value="deposit">Deposit</option>
                        <option value="withdrawal">Withdrawal</option>
                        <option value="order_payment">Order Payment</option>
                        <option value="order_refund">Order Refund</option>
                        <option value="earnings">Earnings</option>
                        <option value="commission_deduction">Commission</option>
                    </select>

                    <select
                        value={filters.status || ''}
                        onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
                    >
                        <option value="">All Statuses</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>

                    <input
                        type="date"
                        placeholder="Start Date"
                        value={filters.startDate || ''}
                        onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                    />

                    <input
                        type="date"
                        placeholder="End Date"
                        value={filters.endDate || ''}
                        onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                    />

                    {activeFiltersCount > 0 && (
                        <button className="clear-filters-btn" onClick={clearFilters}>
                            Clear Filters ({activeFiltersCount})
                        </button>
                    )}
                </div>
            </div>

            {loading && !transactions.length ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading transactions...</p>
                </div>
            ) : error ? (
                <div className="error-state">
                    <span className="error-icon">⚠️</span>
                    <p>{error}</p>
                    <button onClick={loadTransactions}>Retry</button>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <h3>No transactions found</h3>
                    <p>Try adjusting your filters or search query</p>
                </div>
            ) : (
                <>
                    <div className="transactions-table">
                        <div className="table-header">
                            <div className="col-icon"></div>
                            <div className="col-type">Type</div>
                            <div className="col-description">Description</div>
                            <div className="col-date">Date</div>
                            <div className="col-amount">Amount</div>
                            <div className="col-status">Status</div>
                            <div className="col-balance">Balance After</div>
                        </div>

                        <div className="table-body">
                            {filteredTransactions.map((transaction) => {
                                const statusBadge = getStatusBadge(transaction.status);
                                return (
                                    <div key={transaction.id} className="table-row">
                                        <div className="col-icon">
                                            <span className="transaction-icon">
                                                {getTransactionIcon(transaction.type)}
                                            </span>
                                        </div>
                                        <div className="col-type">
                                            <span className="type-label">{transaction.type.replace(/_/g, ' ')}</span>
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
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="pagination">
                        <button
                            className="page-btn"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                        >
                            ← Previous
                        </button>

                        <div className="page-numbers">
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        className={`page-number ${currentPage === page ? 'active' : ''}`}
                                        onClick={() => handlePageChange(page)}
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
                        >
                            Next →
                        </button>

                        <div className="page-info">
                            Page {currentPage} of {totalPages}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TransactionHistory;
