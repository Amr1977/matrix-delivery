/**
 * useBalance Hook
 * React hook for balance operations
 */

import { useState, useCallback, useEffect } from 'react';
import balanceApi from '../services/api/balance';
import type {
    UserBalance,
    BalanceTransaction,
    TransactionFilters,
    BalanceStatement,
    TransactionHistoryResponse,
    WithdrawalInitiationResponse
} from '../types/balance';

interface UseBalanceReturn {
    balance: UserBalance | null;
    transactions: BalanceTransaction[];
    statement: BalanceStatement | null;
    loading: boolean;
    error: string | null;

    // Actions
    fetchBalance: (userId: number) => Promise<void>;
    deposit: (userId: number, amount: number, description: string) => Promise<void>;
    withdraw: (
        userId: number,
        amount: number,
        destination: string,
        description: string,
        metadata?: Record<string, any>
    ) => Promise<WithdrawalInitiationResponse>;
    verifyWithdrawal: (
        userId: number,
        withdrawalRequestId: number,
        code: string
    ) => Promise<void>;
    cancelWithdrawal: (
        userId: number,
        withdrawalRequestId: number,
        reason?: string
    ) => Promise<void>;
    fetchTransactions: (userId: number, filters?: TransactionFilters) => Promise<void>;
    generateStatement: (userId: number, startDate: string, endDate: string) => Promise<void>;
    refreshBalance: () => Promise<void>;
    clearError: () => void;
}

export const useBalance = (): UseBalanceReturn => {
    const [balance, setBalance] = useState<UserBalance | null>(null);
    const [transactions, setTransactions] = useState<BalanceTransaction[]>([]);
    const [statement, setStatement] = useState<BalanceStatement | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);

    /**
     * Fetch user balance
     */
    const fetchBalance = useCallback(async (userId: number) => {
        setLoading(true);
        setError(null);
        setCurrentUserId(userId);

        try {
            const balanceData = await balanceApi.getBalance(userId);
            setBalance(balanceData);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch balance';
            setError(errorMessage);
            console.error('Error fetching balance:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Deposit funds
     */
    const deposit = useCallback(async (
        userId: number,
        amount: number,
        description: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            await balanceApi.deposit({ userId, amount, description });
            // Refresh balance after successful deposit
            await fetchBalance(userId);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to deposit funds';
            setError(errorMessage);
            console.error('Error depositing funds:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [fetchBalance]);

    /**
     * Withdraw funds
     */
    const withdraw = useCallback(async (
        userId: number,
        amount: number,
        destination: string,
        description: string,
        metadata?: Record<string, any>
    ) => {
        setLoading(true);
        setError(null);

        try {
            const result = await balanceApi.withdraw({ userId, amount, destination, description, metadata });
            if (result.balance) {
                setBalance(result.balance);
            }
            return result;
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to withdraw funds';
            setError(errorMessage);
            console.error('Error withdrawing funds:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Verify withdrawal with PIN code
     */
    const verifyWithdrawal = useCallback(async (
        userId: number,
        withdrawalRequestId: number,
        code: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            const result = await balanceApi.verifyWithdrawal(userId, withdrawalRequestId, code);
            if (result.balance) {
                setBalance(result.balance);
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to verify withdrawal';
            setError(errorMessage);
            console.error('Error verifying withdrawal:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    const cancelWithdrawal = useCallback(async (
        userId: number,
        withdrawalRequestId: number,
        reason?: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            const updatedBalance = await balanceApi.cancelWithdrawal(userId, withdrawalRequestId, reason);
            setBalance(updatedBalance);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to cancel withdrawal';
            setError(errorMessage);
            console.error('Error cancelling withdrawal:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Fetch transaction history
     */
    const fetchTransactions = useCallback(async (
        userId: number,
        filters?: TransactionFilters
    ) => {
        setLoading(true);
        setError(null);

        try {
            const response: TransactionHistoryResponse = await balanceApi.getTransactions(userId, filters);
            setTransactions(response.transactions);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch transactions';
            setError(errorMessage);
            console.error('Error fetching transactions:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Generate balance statement
     */
    const generateStatement = useCallback(async (
        userId: number,
        startDate: string,
        endDate: string
    ) => {
        setLoading(true);
        setError(null);

        try {
            const statementData = await balanceApi.getStatement({ userId, startDate, endDate });
            setStatement(statementData);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to generate statement';
            setError(errorMessage);
            console.error('Error generating statement:', err);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Refresh current user's balance
     */
    const refreshBalance = useCallback(async () => {
        if (currentUserId) {
            await fetchBalance(currentUserId);
        }
    }, [currentUserId, fetchBalance]);

    /**
     * Clear error state
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        balance,
        transactions,
        statement,
        loading,
        error,
        fetchBalance,
        deposit,
        withdraw,
        verifyWithdrawal,
        cancelWithdrawal,
        fetchTransactions,
        generateStatement,
        refreshBalance,
        clearError
    };
};

export default useBalance;
