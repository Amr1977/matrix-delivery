import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw,
    Check,
    X,
    Clock,
    AlertCircle,
    Wallet,
    Banknote
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import { Input } from '../design-system/Input';
import { balanceApi } from '../../services/api/balance';
import type { AdminWithdrawalRequest, AdminWithdrawalListResponse } from '../../types/balance';

interface AdminWithdrawalsPanelProps {
    onPendingCountChange?: (count: number) => void;
}

interface ConfirmDialogState {
    isOpen: boolean;
    type: 'approve' | 'reject';
    request: AdminWithdrawalRequest | null;
}

export const AdminWithdrawalsPanel: React.FC<AdminWithdrawalsPanelProps> = ({
    onPendingCountChange
}) => {
    const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        isOpen: false,
        type: 'approve',
        request: null
    });
    const [reference, setReference] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const fetchPendingWithdrawals = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const response: AdminWithdrawalListResponse = await balanceApi.getPendingWithdrawals({
                limit: 50,
                offset: 0
            });

            setWithdrawals(response.requests);
            setPendingCount(response.total);
            setLastUpdate(new Date());

            if (onPendingCountChange) {
                onPendingCountChange(response.total);
            }
        } catch (err: any) {
            const message = err?.response?.data?.error || err?.message || 'Failed to fetch pending withdrawals';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [onPendingCountChange]);

    useEffect(() => {
        fetchPendingWithdrawals();
        const interval = setInterval(fetchPendingWithdrawals, 30000);
        return () => clearInterval(interval);
    }, [fetchPendingWithdrawals]);

    const openApproveDialog = (request: AdminWithdrawalRequest) => {
        setConfirmDialog({
            isOpen: true,
            type: 'approve',
            request
        });
        setReference('');
        setRejectReason('');
        setActionError(null);
    };

    const openRejectDialog = (request: AdminWithdrawalRequest) => {
        setConfirmDialog({
            isOpen: true,
            type: 'reject',
            request
        });
        setReference('');
        setRejectReason('');
        setActionError(null);
    };

    const closeDialog = () => {
        setConfirmDialog({
            isOpen: false,
            type: 'approve',
            request: null
        });
        setReference('');
        setRejectReason('');
        setActionError(null);
    };

    const formatDate = (value: string | undefined) => {
        if (!value) {
            return '';
        }
        const date = new Date(value);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAmount = (amount: number, currency: string) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2
        }).format(amount);
    };

    const getDestinationLabel = (request: AdminWithdrawalRequest) => {
        const details: any = request.destinationDetails || {};

        if (details.walletNumber) {
            return `${request.destinationType} ${details.walletNumber}`;
        }

        if (details.instapayAlias) {
            return `InstaPay ${details.instapayAlias}`;
        }

        if (details.bankAccount || details.accountNumber) {
            const name = details.bankName || details.bank || '';
            const account = details.bankAccount || details.accountNumber;
            return `${name} ${account}`.trim();
        }

        if (details.destination && typeof details.destination === 'string') {
            return details.destination;
        }

        return request.destinationType;
    };

    const handleApprove = async () => {
        if (!confirmDialog.request || !reference.trim()) {
            return;
        }
        try {
            setActionLoading(true);
            setActionError(null);
            await balanceApi.approveWithdrawal(confirmDialog.request.id, reference.trim());
            closeDialog();
            await fetchPendingWithdrawals();
        } catch (err: any) {
            const message = err?.response?.data?.error || err?.message || 'Failed to approve withdrawal';
            setActionError(message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!confirmDialog.request || !rejectReason.trim()) {
            return;
        }
        try {
            setActionLoading(true);
            setActionError(null);
            await balanceApi.rejectWithdrawal(confirmDialog.request.id, rejectReason.trim());
            closeDialog();
            await fetchPendingWithdrawals();
        } catch (err: any) {
            const message = err?.response?.data?.error || err?.message || 'Failed to reject withdrawal';
            setActionError(message);
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6" data-testid="admin-withdrawals-panel">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white" data-testid="withdrawals-panel-title">
                        Withdrawal Requests
                    </h2>
                    <p className="text-matrix-secondary text-sm" data-testid="withdrawals-last-update">
                        {lastUpdate && `Last updated: ${lastUpdate.toLocaleTimeString()}`}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={fetchPendingWithdrawals}
                        disabled={loading}
                        data-testid="withdrawals-refresh-button"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div
                    className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500 rounded-lg px-4 py-2"
                    data-testid="withdrawals-pending-count-badge"
                >
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span
                        className="text-yellow-500 font-semibold"
                        data-testid="withdrawals-pending-count-value"
                    >
                        {pendingCount} Pending
                    </span>
                </div>
            </div>

            {error && (
                <div
                    className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2"
                    data-testid="withdrawals-error-message"
                >
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {loading && withdrawals.length === 0 && (
                <div className="flex items-center justify-center h-64" data-testid="withdrawals-loading-spinner">
                    <RefreshCw className="w-8 h-8 text-matrix-green animate-spin" />
                </div>
            )}

            {!loading && withdrawals.length === 0 && !error && (
                <Card>
                    <div className="text-center py-12" data-testid="withdrawals-empty-state">
                        <Check className="w-16 h-16 text-matrix-green mx-auto mb-4" />
                        <h3 className="text-white text-xl font-semibold mb-2">No Pending Withdrawals</h3>
                        <p className="text-matrix-secondary">
                            All withdrawal requests have been processed.
                        </p>
                    </div>
                </Card>
            )}

            {withdrawals.length > 0 && (
                <Card>
                    <div className="overflow-x-auto" data-testid="withdrawals-table">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-matrix-secondary text-sm border-b border-matrix-border">
                                    <th className="pb-3">ID</th>
                                    <th className="pb-3">User</th>
                                    <th className="pb-3">Destination</th>
                                    <th className="pb-3">Amount</th>
                                    <th className="pb-3">Requested At</th>
                                    <th className="pb-3">Verified At</th>
                                    <th className="pb-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="text-white">
                                {withdrawals.map((request) => (
                                    <tr
                                        key={request.id}
                                        className="border-b border-matrix-border hover:bg-matrix-elevated transition-colors"
                                        data-testid={`withdrawal-row-${request.id}`}
                                    >
                                        <td
                                            className="py-4 font-mono text-matrix-green"
                                            data-testid={`withdrawal-id-${request.id}`}
                                        >
                                            #{request.requestNumber || request.id}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col">
                                                <span
                                                    className="font-medium"
                                                    data-testid={`withdrawal-user-name-${request.id}`}
                                                >
                                                    {request.userName || 'Unknown'}
                                                </span>
                                                <span
                                                    className="text-matrix-secondary text-sm"
                                                    data-testid={`withdrawal-user-email-${request.id}`}
                                                >
                                                    {request.userEmail || request.userId}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4">
                                            <div className="flex flex-col gap-1">
                                                <span data-testid={`withdrawal-method-${request.id}`}>
                                                    <Badge variant="info">
                                                        {request.withdrawalMethod}
                                                    </Badge>
                                                </span>
                                                <span
                                                    className="text-matrix-secondary text-xs"
                                                    data-testid={`withdrawal-destination-${request.id}`}
                                                >
                                                    {getDestinationLabel(request)}
                                                </span>
                                            </div>
                                        </td>
                                        <td
                                            className="py-4 font-semibold text-matrix-green"
                                            data-testid={`withdrawal-amount-${request.id}`}
                                        >
                                            {formatAmount(request.amount, request.currency)}
                                        </td>
                                        <td
                                            className="py-4 text-matrix-secondary text-sm"
                                            data-testid={`withdrawal-created-${request.id}`}
                                        >
                                            {formatDate(request.createdAt)}
                                        </td>
                                        <td
                                            className="py-4 text-matrix-secondary text-sm"
                                            data-testid={`withdrawal-verified-${request.id}`}
                                        >
                                            {formatDate(request.verifiedAt)}
                                        </td>
                                        <td className="py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => openApproveDialog(request)}
                                                    className="p-2 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 transition-colors"
                                                    title="Approve"
                                                    data-testid={`approve-button-${request.id}`}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openRejectDialog(request)}
                                                    className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                                                    title="Reject"
                                                    data-testid={`reject-button-${request.id}`}
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

            {confirmDialog.isOpen && confirmDialog.request && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    data-testid="withdrawals-confirm-dialog-overlay"
                    onClick={closeDialog}
                >
                    <div
                        className="bg-matrix-surface border border-matrix-border rounded-lg p-6 max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                        data-testid="withdrawals-confirm-dialog"
                    >
                        <h3
                            className="text-white text-xl font-semibold mb-4"
                            data-testid="withdrawals-dialog-title"
                        >
                            {confirmDialog.type === 'approve'
                                ? 'Approve Withdrawal'
                                : 'Reject Withdrawal'}
                        </h3>

                        <div className="bg-matrix-bg rounded-lg p-4 mb-4 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">User</span>
                                <span
                                    className="text-white"
                                    data-testid="withdrawals-dialog-user"
                                >
                                    {confirmDialog.request.userName || confirmDialog.request.userId}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">Amount</span>
                                <span
                                    className="text-matrix-green font-semibold"
                                    data-testid="withdrawals-dialog-amount"
                                >
                                    {formatAmount(
                                        confirmDialog.request.amount,
                                        confirmDialog.request.currency
                                    )}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-matrix-secondary">Destination</span>
                                <span
                                    className="text-white text-sm"
                                    data-testid="withdrawals-dialog-destination"
                                >
                                    {getDestinationLabel(confirmDialog.request)}
                                </span>
                            </div>
                        </div>

                        {confirmDialog.type === 'approve' && (
                            <div className="mb-4">
                                <label className="text-white text-sm font-semibold block mb-2">
                                    Transaction Reference
                                </label>
                                <Input
                                    value={reference}
                                    onChange={(e) => setReference(e.target.value)}
                                    placeholder="Enter bank or wallet reference"
                                    data-testid="withdrawals-reference-input"
                                />
                            </div>
                        )}

                        {confirmDialog.type === 'reject' && (
                            <div className="mb-4">
                                <label className="text-white text-sm font-semibold block mb-2">
                                    Rejection Reason
                                </label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Enter reason for rejection"
                                    className="w-full bg-matrix-bg border border-matrix-border rounded-lg px-4 py-3 text-white placeholder-matrix-muted focus:border-matrix-green focus:outline-none resize-none"
                                    rows={3}
                                    data-testid="withdrawals-reject-reason-input"
                                />
                            </div>
                        )}

                        {actionError && (
                            <div
                                className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded-lg mb-4 text-sm"
                                data-testid="withdrawals-action-error"
                            >
                                {actionError}
                            </div>
                        )}

                        <p
                            className="text-matrix-secondary mb-4"
                            data-testid="withdrawals-dialog-message"
                        >
                            {confirmDialog.type === 'approve'
                                ? 'Confirm that you have manually transferred the funds to the user. This will mark the withdrawal as completed.'
                                : 'Rejecting this withdrawal will release the held balance back to the user.'}
                        </p>

                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={closeDialog}
                                disabled={actionLoading}
                                data-testid="withdrawals-dialog-cancel-button"
                            >
                                Cancel
                            </Button>
                            {confirmDialog.type === 'approve' ? (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={handleApprove}
                                    disabled={actionLoading || !reference.trim()}
                                    data-testid="withdrawals-dialog-approve-button"
                                >
                                    {actionLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <Banknote className="w-4 h-4 mr-2" />
                                    )}
                                    Mark as Transferred
                                </Button>
                            ) : (
                                <button
                                    onClick={handleReject}
                                    disabled={actionLoading || !rejectReason.trim()}
                                    className="inline-flex items-center justify-center font-semibold rounded-lg px-4 py-2 text-sm bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    data-testid="withdrawals-dialog-reject-button"
                                >
                                    {actionLoading ? (
                                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                                    ) : (
                                        <X className="w-4 h-4 mr-2" />
                                    )}
                                    Reject Withdrawal
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminWithdrawalsPanel;
