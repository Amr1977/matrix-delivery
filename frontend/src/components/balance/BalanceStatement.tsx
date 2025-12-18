/**
 * Balance Statement Component
 * Generate and download balance statements for specific periods
 */

import React, { useState } from 'react';
import { useBalance } from '../../hooks/useBalance';
import type { BalanceStatement as BalanceStatementType } from '../../types/balance';
import './BalanceStatement.css';

interface BalanceStatementProps {
    userId: number;
    userRole: 'customer' | 'driver' | 'admin';
}

const BalanceStatement: React.FC<BalanceStatementProps> = ({ userId, userRole }) => {
    const { statement, loading, error, generateStatement } = useBalance();
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [validationError, setValidationError] = useState('');

    const presetPeriods = [
        { id: 'last7days', label: 'Last 7 days', days: 7 },
        { id: 'last30days', label: 'Last 30 days', days: 30 },
        { id: 'last3months', label: 'Last 3 months', days: 90 },
        { id: 'last6months', label: 'Last 6 months', days: 180 },
        { id: 'lastyear', label: 'Last year', days: 365 },
        { id: 'custom', label: 'Custom range', days: 0 }
    ];

    const handlePeriodSelect = (periodId: string) => {
        setSelectedPeriod(periodId);
        setValidationError('');

        if (periodId === 'custom') {
            setStartDate('');
            setEndDate('');
            return;
        }

        const period = presetPeriods.find(p => p.id === periodId);
        if (period && period.days > 0) {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - period.days);

            setEndDate(end.toISOString().split('T')[0]);
            setStartDate(start.toISOString().split('T')[0]);
        }
    };

    const validateDates = (): boolean => {
        if (!startDate || !endDate) {
            setValidationError('Please select both start and end dates');
            return false;
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start > now) {
            setValidationError('Start date cannot be in the future');
            return false;
        }

        if (end > now) {
            setValidationError('End date cannot be in the future');
            return false;
        }

        if (start > end) {
            setValidationError('End date must be after start date');
            return false;
        }

        const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff > 365) {
            setValidationError('Maximum statement period is 1 year');
            return false;
        }

        setValidationError('');
        return true;
    };

    const handleGenerateStatement = async () => {
        if (!validateDates()) return;

        await generateStatement(userId, startDate, endDate);
    };

    const handleDownloadPDF = () => {
        if (!statement) return;
        // In production, this would call a PDF generation service
        alert('PDF download would be triggered here');
    };

    const handleDownloadCSV = () => {
        if (!statement) return;

        const headers = ['Date', 'Type', 'Description', 'Amount', 'Balance After'];
        const rows = statement.transactions.map(t => [
            new Date(t.createdAt).toLocaleDateString(),
            t.type,
            t.description,
            t.amount.toFixed(2),
            t.balanceAfter.toFixed(2)
        ]);

        const summary = [
            [''],
            ['SUMMARY'],
            ['Opening Balance', statement.openingBalance.toFixed(2)],
            ['Total Deposits', statement.totalDeposits.toFixed(2)],
            ['Total Withdrawals', statement.totalWithdrawals.toFixed(2)],
            ['Total Earnings', statement.totalEarnings.toFixed(2)],
            ['Total Deductions', statement.totalDeductions.toFixed(2)],
            ['Closing Balance', statement.closingBalance.toFixed(2)]
        ];

        const csvContent = [
            ...summary.map(row => row.join(',')),
            [''],
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `balance-statement-${startDate}-to-${endDate}.csv`;
        a.click();
    };

    const formatCurrency = (amount: number, currency: string = 'EGP') => {
        return `${amount.toFixed(2)} ${currency}`;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="balance-statement">
            <div className="statement-header">
                <h1>📄 Balance Statement</h1>
            </div>

            <div className="statement-generator">
                <h2>Generate Statement</h2>

                <div className="period-selector">
                    <label>Select Period:</label>
                    <div className="period-options">
                        {presetPeriods.map((period) => (
                            <button
                                key={period.id}
                                className={`period-btn ${selectedPeriod === period.id ? 'active' : ''}`}
                                onClick={() => handlePeriodSelect(period.id)}
                            >
                                {period.label}
                            </button>
                        ))}
                    </div>
                </div>

                {(selectedPeriod === 'custom' || selectedPeriod) && (
                    <div className="date-range-selector">
                        <div className="date-input-group">
                            <label htmlFor="start-date">Start Date</label>
                            <input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>

                        <div className="date-input-group">
                            <label htmlFor="end-date">End Date</label>
                            <input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                            />
                        </div>
                    </div>
                )}

                {validationError && (
                    <div className="validation-error">
                        <span className="error-icon">⚠️</span>
                        {validationError}
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        <span className="error-icon">⚠️</span>
                        {error}
                    </div>
                )}

                <button
                    className="generate-btn"
                    onClick={handleGenerateStatement}
                    disabled={!startDate || !endDate || loading}
                >
                    {loading ? 'Generating...' : 'Generate Statement'}
                </button>
            </div>

            {statement && (
                <div className="statement-preview">
                    <div className="preview-header">
                        <h2>Statement Preview</h2>
                        <div className="download-buttons">
                            <button className="download-btn pdf" onClick={handleDownloadPDF}>
                                <span className="btn-icon">📄</span>
                                Download PDF
                            </button>
                            <button className="download-btn csv" onClick={handleDownloadCSV}>
                                <span className="btn-icon">📊</span>
                                Download CSV
                            </button>
                        </div>
                    </div>

                    <div className="statement-content">
                        <div className="statement-info">
                            <h3>Balance Statement</h3>
                            <p className="period">
                                {formatDate(statement.period.startDate)} - {formatDate(statement.period.endDate)}
                            </p>
                        </div>

                        <div className="statement-summary">
                            <div className="summary-grid">
                                <div className="summary-item">
                                    <span className="label">Opening Balance</span>
                                    <span className="value">
                                        {formatCurrency(statement.openingBalance, statement.currency)}
                                    </span>
                                </div>

                                <div className="summary-item positive">
                                    <span className="label">Total Deposits</span>
                                    <span className="value">
                                        +{formatCurrency(statement.totalDeposits, statement.currency)}
                                    </span>
                                </div>

                                <div className="summary-item negative">
                                    <span className="label">Total Withdrawals</span>
                                    <span className="value">
                                        -{formatCurrency(statement.totalWithdrawals, statement.currency)}
                                    </span>
                                </div>

                                {userRole === 'driver' && (
                                    <>
                                        <div className="summary-item positive">
                                            <span className="label">Total Earnings</span>
                                            <span className="value">
                                                +{formatCurrency(statement.totalEarnings, statement.currency)}
                                            </span>
                                        </div>

                                        <div className="summary-item negative">
                                            <span className="label">Total Deductions</span>
                                            <span className="value">
                                                -{formatCurrency(statement.totalDeductions, statement.currency)}
                                            </span>
                                        </div>
                                    </>
                                )}

                                <div className="summary-item total">
                                    <span className="label">Closing Balance</span>
                                    <span className="value">
                                        {formatCurrency(statement.closingBalance, statement.currency)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="statement-transactions">
                            <h4>Transaction Details ({statement.transactions.length} transactions)</h4>
                            <div className="transactions-list">
                                {statement.transactions.map((transaction, index) => (
                                    <div key={index} className="transaction-row">
                                        <div className="transaction-date">
                                            {new Date(transaction.createdAt).toLocaleDateString()}
                                        </div>
                                        <div className="transaction-type">
                                            {transaction.type.replace(/_/g, ' ')}
                                        </div>
                                        <div className="transaction-description">
                                            {transaction.description}
                                        </div>
                                        <div className={`transaction-amount ${transaction.amount >= 0 ? 'positive' : 'negative'}`}>
                                            {transaction.amount >= 0 ? '+' : ''}
                                            {formatCurrency(Math.abs(transaction.amount), transaction.currency)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BalanceStatement;
