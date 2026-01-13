/**
 * AdminWalletsPanel Component
 * Main panel for managing platform wallets
 * 
 * Requirements: 3.1-3.7, 4.1-4.9, 5.1-5.6, 6.1-6.6
 */

import React, { useState, useEffect } from 'react';
import { Plus, RefreshCw, AlertTriangle, Wallet, CreditCard } from 'lucide-react';
import { PlatformWallet, WalletFormData, WalletUpdateData } from '../../services/api/types';
import { platformWalletsApi } from '../../services/api';
import { WalletCard } from './WalletCard';
import { WalletForm } from './WalletForm';

interface AdminWalletsPanelProps {
    className?: string;
}

export const AdminWalletsPanel: React.FC<AdminWalletsPanelProps> = ({ className = '' }) => {
    // State
    const [wallets, setWallets] = useState<PlatformWallet[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string>('');
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingWallet, setEditingWallet] = useState<PlatformWallet | null>(null);
    const [formLoading, setFormLoading] = useState(false);
    
    // Success/error messages
    const [successMessage, setSuccessMessage] = useState<string>('');
    const [showConfirmDeactivate, setShowConfirmDeactivate] = useState<PlatformWallet | null>(null);

    // Fetch wallets on mount
    useEffect(() => {
        fetchWallets();
    }, []);

    // Auto-clear success messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    // Fetch wallets function
    const fetchWallets = async (isRefresh = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }
            setError('');
            
            const response = await platformWalletsApi.getAll();
            setWallets(response.wallets);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch wallets');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Handle refresh
    const handleRefresh = () => {
        fetchWallets(true);
    };

    // Handle add wallet
    const handleAddWallet = async (formData: WalletFormData) => {
        setFormLoading(true);
        try {
            await platformWalletsApi.create(formData);
            await fetchWallets();
            setShowAddModal(false);
            setSuccessMessage('Wallet created successfully');
        } catch (err: any) {
            throw new Error(err.message || 'Failed to create wallet');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle edit wallet
    const handleEditWallet = async (formData: WalletFormData) => {
        if (!editingWallet) return;

        setFormLoading(true);
        try {
            // Exclude paymentMethod from update data since it's not allowed by backend
            const { paymentMethod, ...updateData } = formData;
            await platformWalletsApi.update(editingWallet.id, updateData);
            await fetchWallets();
            setEditingWallet(null);
            setSuccessMessage('Wallet updated successfully');
        } catch (err: any) {
            throw new Error(err.message || 'Failed to update wallet');
        } finally {
            setFormLoading(false);
        }
    };

    // Handle toggle active status
    const handleToggleActive = async (wallet: PlatformWallet) => {
        if (wallet.isActive) {
            // Show confirmation for deactivation
            setShowConfirmDeactivate(wallet);
        } else {
            // Activate immediately
            await performToggleActive(wallet);
        }
    };

    // Perform the actual toggle
    const performToggleActive = async (wallet: PlatformWallet) => {
        try {
            const updateData: WalletUpdateData = {
                isActive: !wallet.isActive
            };

            await platformWalletsApi.update(wallet.id, updateData);
            await fetchWallets();

            const action = wallet.isActive ? 'deactivated' : 'activated';
            setSuccessMessage(`Wallet ${action} successfully`);

            if (!wallet.isActive) {
                // Show warning after activation
                setTimeout(() => {
                    setSuccessMessage('⚠️ Wallet activated - monitor usage carefully');
                }, 100);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to update wallet status');
        } finally {
            setShowConfirmDeactivate(null);
        }
    };

    // Group wallets by type
    const smartWallets = wallets.filter(w => 
        ['vodafone_cash', 'orange_money', 'etisalat_cash', 'we_pay'].includes(w.paymentMethod)
    );
    const instapayWallets = wallets.filter(w => w.paymentMethod === 'instapay');

    // Render loading state
    if (loading) {
        return (
            <div className={`admin-wallets-panel ${className}`} data-testid="admin-wallets-panel">
                <div className="loading-state" data-testid="loading-state">
                    <RefreshCw className="loading-spinner" size={24} />
                    <span>Loading wallets...</span>
                </div>
            </div>
        );
    }

    return (
        <div className={`admin-wallets-panel ${className}`} data-testid="admin-wallets-panel">
            {/* Header */}
            <div className="panel-header" data-testid="panel-header">
                <div className="header-left">
                    <h2 className="panel-title">Platform Wallets</h2>
                    <span className="wallet-count" data-testid="wallet-count">
                        {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="header-actions">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="refresh-button"
                        data-testid="refresh-button"
                        title="Refresh wallets"
                    >
                        <RefreshCw className={refreshing ? 'spinning' : ''} size={16} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="add-button"
                        data-testid="add-wallet-button"
                    >
                        <Plus size={16} />
                        Add Wallet
                    </button>
                </div>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="success-message" data-testid="success-message">
                    {successMessage}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="error-message" data-testid="error-message">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="dismiss-error">×</button>
                </div>
            )}

            {/* Wallet Groups */}
            <div className="wallet-groups" data-testid="wallet-groups">
                {/* Smart Wallets Section */}
                <div className="wallet-group" data-testid="smart-wallets-group">
                    <div className="group-header">
                        <Wallet size={20} />
                        <h3>Smart Wallets</h3>
                        <span className="group-count">({smartWallets.length})</span>
                    </div>
                    <div className="wallet-grid">
                        {smartWallets.length > 0 ? (
                            smartWallets.map(wallet => (
                                <WalletCard
                                    key={wallet.id}
                                    wallet={wallet}
                                    onEdit={() => setEditingWallet(wallet)}
                                    onToggleActive={() => handleToggleActive(wallet)}
                                />
                            ))
                        ) : (
                            <div className="empty-state" data-testid="smart-wallets-empty">
                                <Wallet size={48} />
                                <p>No smart wallets configured</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="empty-action-button"
                                >
                                    Add Smart Wallet
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* InstaPay Section */}
                <div className="wallet-group" data-testid="instapay-wallets-group">
                    <div className="group-header">
                        <CreditCard size={20} />
                        <h3>InstaPay Accounts</h3>
                        <span className="group-count">({instapayWallets.length})</span>
                    </div>
                    <div className="wallet-grid">
                        {instapayWallets.length > 0 ? (
                            instapayWallets.map(wallet => (
                                <WalletCard
                                    key={wallet.id}
                                    wallet={wallet}
                                    onEdit={() => setEditingWallet(wallet)}
                                    onToggleActive={() => handleToggleActive(wallet)}
                                />
                            ))
                        ) : (
                            <div className="empty-state" data-testid="instapay-wallets-empty">
                                <CreditCard size={48} />
                                <p>No InstaPay accounts configured</p>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="empty-action-button"
                                >
                                    Add InstaPay Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Wallet Modal */}
            {showAddModal && (
                <WalletForm
                    onSubmit={handleAddWallet}
                    onCancel={() => setShowAddModal(false)}
                    loading={formLoading}
                />
            )}

            {/* Edit Wallet Modal */}
            {editingWallet && (
                <WalletForm
                    wallet={editingWallet}
                    onSubmit={handleEditWallet}
                    onCancel={() => setEditingWallet(null)}
                    loading={formLoading}
                />
            )}

            {/* Deactivate Confirmation Modal */}
            {showConfirmDeactivate && (
                <div className="confirm-overlay" data-testid="confirm-deactivate-overlay">
                    <div className="confirm-modal" data-testid="confirm-deactivate-modal">
                        <div className="confirm-header">
                            <AlertTriangle size={24} className="warning-icon" />
                            <h3>Deactivate Wallet</h3>
                        </div>
                        <div className="confirm-content">
                            <p>
                                Are you sure you want to deactivate this wallet?
                            </p>
                            <div className="wallet-info">
                                <strong>{showConfirmDeactivate.paymentMethod.replace('_', ' ').toUpperCase()}</strong>
                                <br />
                                {showConfirmDeactivate.phoneNumber || showConfirmDeactivate.instapayAlias}
                            </div>
                            <p className="warning-text">
                                ⚠️ This will prevent new transactions from using this wallet.
                            </p>
                        </div>
                        <div className="confirm-actions">
                            <button
                                onClick={() => setShowConfirmDeactivate(null)}
                                className="cancel-button"
                                data-testid="confirm-cancel-button"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => performToggleActive(showConfirmDeactivate)}
                                className="deactivate-button"
                                data-testid="confirm-deactivate-button"
                            >
                                Deactivate Wallet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .admin-wallets-panel {
                    padding: 1.5rem;
                    background: var(--matrix-bg);
                    min-height: 100%;
                }

                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--matrix-border);
                }

                .header-left {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                .panel-title {
                    color: var(--matrix-bright-green);
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin: 0;
                }

                .wallet-count {
                    color: var(--matrix-secondary);
                    font-size: 0.875rem;
                    background: var(--matrix-dark-green);
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                }

                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                }

                .refresh-button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--matrix-border);
                    border-radius: 0.5rem;
                    background: transparent;
                    color: var(--matrix-secondary);
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                }

                .refresh-button:hover:not(:disabled) {
                    background: var(--matrix-dark-green);
                    color: var(--matrix-bright-green);
                    border-color: var(--matrix-green);
                }

                .refresh-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .add-button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.5rem;
                    background: var(--matrix-green);
                    color: var(--matrix-black);
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                }

                .add-button:hover {
                    background: var(--matrix-bright-green);
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 4rem 2rem;
                    color: var(--matrix-secondary);
                    gap: 1rem;
                }

                .loading-spinner {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .spinning {
                    animation: spin 1s linear infinite;
                }

                .success-message {
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid #22C55E;
                    color: #22C55E;
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                }

                .error-message {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid #EF4444;
                    color: #EF4444;
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                    margin-bottom: 1rem;
                    font-size: 0.875rem;
                }

                .dismiss-error {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 1.25rem;
                    padding: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .wallet-groups {
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                .wallet-group {
                    background: var(--matrix-surface);
                    border: 1px solid var(--matrix-border);
                    border-radius: 0.75rem;
                    padding: 1.5rem;
                }

                .group-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    color: var(--matrix-bright-green);
                }

                .group-header h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0;
                }

                .group-count {
                    color: var(--matrix-secondary);
                    font-size: 0.875rem;
                }

                .wallet-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
                    gap: 1rem;
                }

                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2rem;
                    color: var(--matrix-secondary);
                    text-align: center;
                    grid-column: 1 / -1;
                }

                .empty-state svg {
                    opacity: 0.5;
                    margin-bottom: 1rem;
                }

                .empty-state p {
                    margin: 0 0 1.5rem 0;
                    font-size: 1rem;
                }

                .empty-action-button {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--matrix-green);
                    border-radius: 0.5rem;
                    background: transparent;
                    color: var(--matrix-green);
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                }

                .empty-action-button:hover {
                    background: var(--matrix-green);
                    color: var(--matrix-black);
                }

                /* Confirmation Modal */
                .confirm-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .confirm-modal {
                    background: var(--matrix-surface);
                    border: 2px solid var(--matrix-border);
                    border-radius: 0.75rem;
                    width: 100%;
                    max-width: 400px;
                }

                .confirm-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--matrix-border);
                }

                .warning-icon {
                    color: #F59E0B;
                }

                .confirm-header h3 {
                    color: var(--matrix-bright-green);
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin: 0;
                }

                .confirm-content {
                    padding: 1.5rem;
                }

                .confirm-content p {
                    color: var(--matrix-secondary);
                    margin: 0 0 1rem 0;
                    line-height: 1.5;
                }

                .wallet-info {
                    background: var(--matrix-dark-green);
                    padding: 0.75rem;
                    border-radius: 0.5rem;
                    margin: 1rem 0;
                    color: var(--matrix-bright-green);
                    font-size: 0.875rem;
                }

                .warning-text {
                    color: #F59E0B !important;
                    font-size: 0.875rem !important;
                }

                .confirm-actions {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: flex-end;
                    padding: 1.5rem;
                    border-top: 1px solid var(--matrix-border);
                }

                .cancel-button {
                    padding: 0.5rem 1rem;
                    border: 1px solid var(--matrix-border);
                    border-radius: 0.5rem;
                    background: transparent;
                    color: var(--matrix-secondary);
                    cursor: pointer;
                    font-size: 0.875rem;
                    transition: all 0.2s ease;
                }

                .cancel-button:hover {
                    background: var(--matrix-dark-green);
                    color: var(--matrix-bright-green);
                    border-color: var(--matrix-green);
                }

                .deactivate-button {
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 0.5rem;
                    background: #EF4444;
                    color: white;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }

                .deactivate-button:hover {
                    background: #DC2626;
                }

                /* Responsive */
                @media (max-width: 1024px) {
                    .wallet-grid {
                        grid-template-columns: 1fr;
                    }
                }

                @media (max-width: 768px) {
                    .admin-wallets-panel {
                        padding: 1rem;
                    }

                    .panel-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }

                    .header-left {
                        justify-content: center;
                    }

                    .header-actions {
                        justify-content: center;
                    }

                    .wallet-grid {
                        grid-template-columns: 1fr;
                    }

                    .confirm-modal {
                        margin: 0;
                        border-radius: 0;
                        max-height: 100vh;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminWalletsPanel;