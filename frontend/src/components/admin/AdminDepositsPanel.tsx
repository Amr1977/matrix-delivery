/**
 * AdminDepositsPanel Component
 * Admin panel for verifying and managing deposit requests
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    RefreshCw,
    Check,
    X,
    DollarSign,
    User,
    Phone,
    AlertCircle
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';

interface Deposit {
    id: number;
    requestNumber: string;
    userId: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}

interface AdminDepositsPanelProps {
    onPendingCountChange?: (count: number) => void;
}

interface ConfirmDialogState {
    isOpen: boolean;
    type: 'approve' | 'reject';
    deposit: Deposit | null;
}

export const AdminDepositsPanel: React.FC<AdminDepositsPanelProps> = ({
    onPendingCountChange
}) => {
    const [deposits, setDeposits] = useState<Deposit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
        isOpen: false,
        type: 'approve',
        deposit: null
    });
    const [rejectReason, setRejectReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    // Fetch pending deposits
    const fetchPendingDeposits = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/deposits/pending', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch pending deposits');
            }

            const data = await response.json();
            setDeposits(data.data || []);
            setPendingCount(data.count || 0);
            setLastUpdate(new Date());

            // Notify parent of pending count change
            if (onPendingCountChange) {
                onPendingCountChange(data.count || 0);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch pending deposits');
        } finally {
            setLoading(false);
        }
    }, [onPendingCountChange]);

    // Load deposits on mount
    useEffect(() => {
        fetchPendingDeposits();
        // Refresh every 30 seconds
        const interval = setInterval(fetchPendingDeposits, 30000);
        return () => clearInterval(interval);
    }, [fetchPendingDeposits]);

    // Handle approve
    const handleApprove = useCallback(async (deposit: Deposit) => {
        try {
            setActionLoading(true);
            setActionError(null);

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/deposits/${deposit.id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reference: `DEP-${Date.now()}`
                })
            });

            if (!response.ok) {
                throw new Error('Failed to approve deposit');
            }

            // Refresh list
            await fetchPendingDeposits();
            setConfirmDialog({ isOpen: false, type: 'approve', deposit: null });
        } catch (err: any) {
            setActionError(err.message || 'Failed to approve deposit');
        } finally {
            setActionLoading(false);
        }
    }, [fetchPendingDeposits]);

    // Handle reject
    const handleReject = useCallback(async (deposit: Deposit) => {
        try {
            setActionLoading(true);
            setActionError(null);

            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/deposits/${deposit.id}/reject`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: rejectReason || 'No reason provided'
                })
            });

            if (!response.ok) {
                throw new Error('Failed to reject deposit');
            }

            // Refresh list
            await fetchPendingDeposits();
            setConfirmDialog({ isOpen: false, type: 'reject', deposit: null });
            setRejectReason('');
        } catch (err: any) {
            setActionError(err.message || 'Failed to reject deposit');
        } finally {
            setActionLoading(false);
        }
    }, [rejectReason, fetchPendingDeposits]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-green-500" />
                    <h2 className="text-2xl font-bold text-white">Pending Deposits</h2>
                    <Badge
                        variant={pendingCount > 0 ? 'warning' : 'default'}
                        className="ml-2"
                    >
                        {pendingCount} pending
                    </Badge>
                </div>
                <Button
                    onClick={() => fetchPendingDeposits()}
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Error Message */}
            {error && (
                <Card className="border-red-500 bg-red-900/20">
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertCircle className="w-5 h-5" />
                        <span>{error}</span>
                    </div>
                </Card>
            )}

            {/* Loading State */}
            {loading && (
                <Card className="text-center py-8">
                    <div className="inline-block">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                    </div>
                    <p className="text-gray-400 mt-2">Loading deposits...</p>
                </Card>
            )}

            {/* Empty State */}
            {!loading && deposits.length === 0 && (
                <Card className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                    <p className="text-gray-400">No pending deposits</p>
                </Card>
            )}

            {/* Deposits List */}
            {!loading && deposits.length > 0 && (
                <div className="space-y-4">
                    {deposits.map((deposit) => (
                        <Card key={deposit.id} className="p-4">
                            <div className="space-y-4">
                                {/* Deposit Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-400">Request #</p>
                                        <p className="text-white font-mono">{deposit.requestNumber}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">User ID</p>
                                        <p className="text-white font-mono text-sm">{deposit.userId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Amount</p>
                                        <p className="text-green-400 text-lg font-bold">
                                            {deposit.amount} {deposit.currency}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Time</p>
                                        <p className="text-white">
                                            {new Date(deposit.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <Badge variant="warning" className="mb-3">
                                        {deposit.status.toUpperCase()}
                                    </Badge>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-3 border-t border-gray-700">
                                    <Button
                                        onClick={() => setConfirmDialog({
                                            isOpen: true,
                                            type: 'approve',
                                            deposit
                                        })}
                                        disabled={actionLoading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        onClick={() => setConfirmDialog({
                                            isOpen: true,
                                            type: 'reject',
                                            deposit
                                        })}
                                        disabled={actionLoading}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                                    >
                                        <X className="w-4 h-4" />
                                        Reject
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Confirm Dialog */}
            {confirmDialog.isOpen && confirmDialog.deposit && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="p-6 w-full max-w-md">
                        <h3 className="text-xl font-bold text-white mb-4">
                            {confirmDialog.type === 'approve' ? 'Approve Deposit?' : 'Reject Deposit?'}
                        </h3>

                        <div className="bg-gray-900 p-4 rounded mb-4 space-y-2">
                            <p className="text-sm text-gray-400">
                                Amount: <span className="text-green-400 font-bold">
                                    {confirmDialog.deposit.amount} {confirmDialog.deposit.currency}
                                </span>
                            </p>
                            <p className="text-sm text-gray-400">
                                User: <span className="text-white font-mono">
                                    {confirmDialog.deposit.userId}
                                </span>
                            </p>
                        </div>

                        {confirmDialog.type === 'reject' && (
                            <input
                                type="text"
                                placeholder="Rejection reason (optional)"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full bg-gray-900 text-white border border-gray-700 rounded px-3 py-2 mb-4"
                            />
                        )}

                        {actionError && (
                            <div className="text-red-400 text-sm mb-4">{actionError}</div>
                        )}

                        <div className="flex gap-3">
                            <Button
                                onClick={() => setConfirmDialog({ isOpen: false, type: 'approve', deposit: null })}
                                disabled={actionLoading}
                                className="flex-1 bg-gray-700 hover:bg-gray-600"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={() => {
                                    if (confirmDialog.type === 'approve') {
                                        handleApprove(confirmDialog.deposit!);
                                    } else {
                                        handleReject(confirmDialog.deposit!);
                                    }
                                }}
                                disabled={actionLoading}
                                className={`flex-1 ${
                                    confirmDialog.type === 'approve'
                                        ? 'bg-green-600 hover:bg-green-700'
                                        : 'bg-red-600 hover:bg-red-700'
                                }`}
                            >
                                {actionLoading ? 'Processing...' : 'Confirm'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
                <p className="text-xs text-gray-500 text-right">
                    Last updated: {lastUpdate.toLocaleTimeString()}
                </p>
            )}
        </div>
    );
};
