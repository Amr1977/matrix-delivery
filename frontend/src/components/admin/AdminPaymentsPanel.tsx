/**
 * AdminPaymentsPanel Component
 * Admin panel for verifying and managing top-up requests
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.8
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw,
    Check,
    X,
    Filter,
    Clock,
    DollarSign,
    User,
    Phone,
    CreditCard,
    AlertCircle,
    Search
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Input } from '../design-system/Input';
import { topupApi } from '../../services/api/topup';
import type { AdminTopup, PaymentMethodType } from '../../types/topup';

interface AdminPaymentsPanelProps {
    onPendingCountChange?: (count: number) => void;
}

interface ConfirmDialogState {
    isOpen: boolean;
    type: 'verify' | 'reject';
    topup: AdminTopup | null;
}

// Payment method display names
const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
    vodafone_cash: 'Vodafone Cash',
    orange_money: 'Orange Money',
    etisalat_cash: 'Etisalat Cash',
    we_pay: 'WE Pay',
    instapay: 'InstaPay'
};

export const AdminPaymentsPanel: React.FC<AdminPaymentsPanelProps> = ({
    onPendingCountChange
}) => {
    const [topups, setTopups] = useState<AdminTopup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Filters
    const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethodType | ''>('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        isOpen: false,
        type: 'verify',
        topup: null
    });
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Fetch pending topups
    const fetchPendingTopups = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const filters: Record<string, any> = {};
            if (paymentMethodFilter) filters.paymentMethod = paymentMethodFilter;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;

            const response = await topupApi.getPendingTopups(filters);
            
            setTopups(response.topups);
            setPendingCount(response.pendingCount);
            setLastUpdate(new Date());

            // Notify parent of pending count change
            if (onPendingCountChange) {
                onPendingCountChange(response.pendingCount);
            }
        } catch (err: any) {
            setError(err.error || 'Failed to fetch pending topups');
        } finally {
            setLoading(false);
        }
    }, [paymentMethodFilter, startDate, endDate, onPendingCountChange]);

    // Initial fetch and auto-refresh
    useEffect(() => {
        fetchPendingTopups();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchPendingTopups, 30000);
        return () => clearInterval(interval);
    }, [fetchPendingTopups]);

    // Handle verify action
    const handleVerify = async () => {
        if (!confirmDialog.topup) return;

        const topupId = confirmDialog.topup.id;

        try {
            setActionLoading(true);
            setActionError(null);

            await topupApi.verifyTopup(topupId);

            // Close dialog
            setConfirmDialog({ isOpen: false, type: 'verify', topup: null });

            // Optimistic update
            setTopups(current => current.filter(t => t.id !== topupId));
            setPendingCount(prev => Math.max(0, prev - 1));
            
            // Refresh list in background
            fetchPendingTopups();
        } catch (err: any) {
            setActionError(err.error || 'Failed to verify topup');
        } finally {
            setActionLoading(false);
        }
    };

    // Handle reject action
    const handleReject = async () => {
        if (!confirmDialog.topup || !rejectReason.trim()) return;

        const topupId = confirmDialog.topup.id;

        try {
            setActionLoading(true);
            setActionError(null);

            await topupApi.rejectTopup(topupId, rejectReason.trim());

            // Close dialog
            setConfirmDialog({ isOpen: false, type: 'reject', topup: null });
            setRejectReason('');

            // Optimistic update
            setTopups(current => current.filter(t => t.id !== topupId));
            setPendingCount(prev => Math.max(0, prev - 1));
            
            // Refresh list in background
            fetchPendingTopups();
        } catch (err: any) {
            setActionError(err.error || 'Failed to reject topup');
        } finally {
            setActionLoading(false);
        }
    };

    // Open verify confirmation
    const openVerifyDialog = (topup: AdminTopup) => {
        setConfirmDialog({ isOpen: true, type: 'verify', topup });
        setActionError(null);
    };

    // Open reject dialog
    const openRejectDialog = (topup: AdminTopup) => {
        setConfirmDialog({ isOpen: true, type: 'reject', topup });
        setRejectReason('');
        setActionError(null);
    };

    // Close dialog
    const closeDialog = () => {
        setConfirmDialog({ isOpen: false, type: 'verify', topup: null });
        setRejectReason('');
        setActionError(null);
    };

    // Format date for display
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format amount
    const formatAmount = (amount: number) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 2
        }).format(amount);
    };

    // Clear filters
    const clearFilters = () => {
        setPaymentMethodFilter('');
        setStartDate('');
        setEndDate('');
    };

    return (
        <div className="space-y-6" data-testid="admin-payments-panel">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white" data-testid="panel-title">
                        Payment Verification
                    </h2>
                    <p className="text-matrix-secondary text-sm" data-testid="last-update">
                        {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        data-testid="toggle-filters-button"
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={fetchPendingTopups}
                        disabled={loading}
                        data-testid="refresh-button"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {/* Pending Count Badge */}
            <div className="flex items-center gap-4">
                <div 
                    className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500 rounded-lg px-4 py-2"
                    data-testid="pending-count-badge"
                >
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="text-yellow-500 font-semibold" data-testid="pending-count-value">
                        {pendingCount} Pending
                    </span>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div data-testid="filters-panel">
                <Card>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="text-white text-sm font-semibold block mb-2">
                                Payment Method
                            </label>
                            <select
                                value={paymentMethodFilter}
                                onChange={(e) => setPaymentMethodFilter(e.target.value as PaymentMethodType | '')}
                                className="w-full bg-matrix-bg border border-matrix-border rounded-lg px-4 py-3 text-white focus:border-matrix-green focus:outline-none"
                                data-testid="payment-method-filter"
                            >
                                <option value="">All Methods</option>
                                <option value="vodafone_cash">Vodafone Cash</option>
                                <option value="orange_money">Orange Money</option>
                                <option value="etisalat_cash">Etisalat Cash</option>
                                <option value="we_pay">WE Pay</option>
                                <option value="instapay">InstaPay</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-white text-sm font-semibold block mb-2">
                                Start Date
                            </label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-matrix-bg border border-matrix-border rounded-lg px-4 py-3 text-white focus:border-matrix-green focus:outline-none"
                                data-testid="start-date-filter"
                            />
                        </div>
                        <div>
                            <label className="text-white text-sm font-semibold block mb-2">
                                End Date
                            </label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-matrix-bg border border-matrix-border rounded-lg px-4 py-3 text-white focus:border-matrix-green focus:outline-none"
                                data-testid="end-date-filter"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={fetchPendingTopups}
                                data-testid="apply-filters-button"
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Apply
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                data-testid="clear-filters-button"
                            >
                                Clear
                            </Button>
                        </div>
                    </div>
                </Card>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div 
                    className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2"
                    data-testid="error-message"
                >
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Loading State */}
            {loading && topups.length === 0 && (
                <div className="flex items-center justify-center h-64" data-testid="loading-spinner">
                    <RefreshCw className="w-8 h-8 text-matrix-green animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && topups.length === 0 && (
                <Card>
                    <div className="text-center py-12" data-testid="empty-state">
                        <Check className="w-16 h-16 text-matrix-green mx-auto mb-4" />
                        <h3 className="text-white text-xl font-semibold mb-2">All Caught Up!</h3>
                        <p className="text-matrix-secondary">No pending top-up requests to verify.</p>
                    </div>
                </Card>
            )}

            {/* Topups Table */}
            {topups.length > 0 && (
                <Card>
                    <div className="overflow-x-auto" data-testid="topups-table">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-matrix-secondary text-sm border-b border-matrix-border">
                                    <th className="pb-3">ID</th>
                                    <th className="pb-3">User</th>
                                    <th className="pb-3">Method</th>
                                    <th className="pb-3">Reference</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Time</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-white">
                                {topups.map((topup) => (
                                    <tr 
                                        key={topup.id} 
                                        className="border-b border-matrix-border hover:bg-matrix-elevated transition-colors"
                                        data-testid={`topup-row-${topup.id}`}
                                    >
                                        <td className="py-4 font-mono text-matrix-green" data-testid={`topup-id-${topup.id}`}>
                                            #{topup.id}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium" data-testid={`topup-user-name-${topup.id}`}>
                                                    {topup.userName || 'Unknown'}
                                                </span>
                                                <span className="text-matrix-secondary text-sm" data-testid={`topup-user-email-${topup.id}`}>
                                                    {topup.userEmail || topup.userId}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <span data-testid={`topup-method-${topup.id}`}>
                                            <Badge variant="info">
                                                {PAYMENT_METHOD_LABELS[topup.paymentMethod] || topup.paymentMethod}
                                            </Badge>
                                            </span>
                                        </td>
                                        <td className="py-4 font-mono text-sm" data-testid={`topup-reference-${topup.id}`}>
                                            {topup.transactionReference}
                                        </td>
                                        <td className="py-4 font-semibold text-matrix-green" data-testid={`topup-amount-${topup.id}`}>
                                            {formatAmount(topup.amount)}
                                        </td>
                                        <td className="py-4 text-matrix-secondary text-sm" data-testid={`topup-time-${topup.id}`}>
                                            {formatDate(topup.createdAt)}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openVerifyDialog(topup)}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                                                    title="Verify"
                                                    data-testid={`verify-button-${topup.id}`}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openRejectDialog(topup)}
                                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    title="Reject"
                                                    data-testid={`reject-button-${topup.id}`}
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Confirm Dialog */}
            {confirmDialog.isOpen && confirmDialog.topup && (
                <div 
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    data-testid="confirm-dialog-overlay"
                    onClick={closeDialog}
                >
                    <div 
                        className="bg-matrix-surface border border-matrix-border rounded-lg p-6 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                        data-testid="confirm-dialog"
                    >
                        <h3 className="text-white text-xl font-semibold mb-4" data-testid="dialog-title">
                            {confirmDialog.type === 'verify' ? 'Verify Top-Up' : 'Reject Top-Up'}
                        </h3>

                        {/* Topup Details */}
                        <div className="bg-matrix-bg rounded-lg p-4 mb-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">User:</span>
                                <span className="text-white" data-testid="dialog-user">
                                    {confirmDialog.topup.userName || confirmDialog.topup.userId}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">Amount:</span>
                                <span className="text-matrix-green font-semibold" data-testid="dialog-amount">
                                    {formatAmount(confirmDialog.topup.amount)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">Reference:</span>
                                <span className="text-white font-mono text-sm" data-testid="dialog-reference">
                                    {confirmDialog.topup.transactionReference}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">Method:</span>
                                <span className="text-white" data-testid="dialog-method">
                                    {PAYMENT_METHOD_LABELS[confirmDialog.topup.paymentMethod]}
                                </span>
                            </div>
                        </div>

                        {/* Reject Reason Input */}
                        {confirmDialog.type === 'reject' && (
                            <div className="mb-4">
                                <label className="text-white text-sm font-semibold block mb-2">
                                    Rejection Reason *
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter reason for rejection..."
                                    className="w-full bg-matrix-bg border border-matrix-border rounded-lg px-4 py-3 text-white placeholder-matrix-muted focus:border-matrix-green focus:outline-none resize-none"
                                    rows={3}
                                    data-testid="reject-reason-input"
                                />
                            </div>
                        )}

                        {/* Action Error */}
                        {actionError && (
                            <div 
                                className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm"
                                data-testid="action-error"
                            >
                                {actionError}
                            </div>
                        )}

                        {/* Confirmation Message */}
                        <p className="text-matrix-secondary mb-4" data-testid="dialog-message">
                            {confirmDialog.type === 'verify'
                                ? 'Are you sure you want to verify this top-up? The user\'s balance will be credited.'
                                : 'Are you sure you want to reject this top-up? The user will be notified.'}
                        </p>

                        {/* Dialog Actions */}
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={closeDialog}
                                disabled={actionLoading}
                                data-testid="dialog-cancel-button"
                            >
                                Cancel
                            </Button>
                            {confirmDialog.type === 'verify' ? (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleVerify}
                                    disabled={actionLoading}
                                    data-testid="dialog-verify-button"
                                >
                                    {actionLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Verify
                                </Button>
                            ) : (
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading || !rejectReason.trim()}
                                    className="inline-flex items-center justify-center font-semibold rounded-lg px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    data-testid="dialog-reject-button"
                                >
                                    {actionLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <X className="w-4 h-4 mr-2" />
                                    )}
                                    Reject
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPaymentsPanel;
