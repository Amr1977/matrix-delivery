/**
 * WalletCard Component
 * Displays individual platform wallet information with controls
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.6, 5.1, 6.1, 7.5
 */

import React from 'react';
import { Edit, Power, AlertTriangle, Phone, Building2 } from 'lucide-react';
import { PlatformWallet } from '../../services/api/types';
import UsageProgressBar from './UsageProgressBar';

export interface WalletCardProps {
    wallet: PlatformWallet;
    onEdit: (wallet: PlatformWallet) => void;
    onToggleActive: (wallet: PlatformWallet) => void;
}

// Payment method display configuration
const PAYMENT_METHOD_CONFIG: Record<string, { label: string; icon: string; type: 'smart_wallet' | 'instapay' }> = {
    vodafone_cash: { label: 'Vodafone Cash', icon: '📱', type: 'smart_wallet' },
    orange_money: { label: 'Orange Money', icon: '🍊', type: 'smart_wallet' },
    etisalat_cash: { label: 'Etisalat Cash', icon: '📞', type: 'smart_wallet' },
    we_pay: { label: 'WE Pay', icon: '💳', type: 'smart_wallet' },
    instapay: { label: 'InstaPay', icon: '🏦', type: 'instapay' }
};

export const WalletCard: React.FC<WalletCardProps> = ({
    wallet,
    onEdit,
    onToggleActive
}) => {
    const config = PAYMENT_METHOD_CONFIG[wallet.paymentMethod];
    const dailyPercentage = wallet.dailyLimit > 0 ? (wallet.dailyUsed / wallet.dailyLimit) * 100 : 0;
    const monthlyPercentage = wallet.monthlyLimit > 0 ? (wallet.monthlyUsed / wallet.monthlyLimit) * 100 : 0;
    
    // Check if wallet needs warning (80%+ usage)
    const hasWarning = dailyPercentage >= 80 || monthlyPercentage >= 80;

    // Format date for display
    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format currency (currently unused but kept for future use)
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-EG', {
            style: 'currency',
            currency: 'EGP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    return (
        <div 
            className={`wallet-card ${wallet.isActive ? 'active' : 'inactive'}`}
            data-testid={`wallet-card-${wallet.id}`}
        >
            {/* Card Header - Payment Method and Controls */}
            <div className="card-header" data-testid="wallet-header">
                <div className="payment-method-section">
                    <div className="payment-method-info">
                        <span className="payment-icon">{config?.icon || '💳'}</span>
                        <div className="payment-text">
                            <h3 className="payment-name">{config?.label || wallet.paymentMethod}</h3>
                            <p className="holder-name">{wallet.holderName}</p>
                        </div>
                    </div>
                    <div className="status-indicators">
                        {!wallet.isActive && (
                            <span className="status-badge inactive" data-testid="inactive-badge">
                                Inactive
                            </span>
                        )}
                        {hasWarning && wallet.isActive && (
                            <div className="warning-indicator" title="High usage warning">
                                <AlertTriangle 
                                    size={16} 
                                    className="warning-icon" 
                                    data-testid="warning-icon"
                                />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="action-buttons" data-testid="wallet-controls">
                    <button
                        onClick={() => onEdit(wallet)}
                        className="action-btn edit-btn"
                        data-testid={`edit-button-${wallet.id}`}
                        title="Edit wallet"
                    >
                        <Edit size={14} />
                        <span>Edit</span>
                    </button>
                    <button
                        onClick={() => onToggleActive(wallet)}
                        className={`action-btn power-btn ${wallet.isActive ? 'active' : 'inactive'}`}
                        data-testid={`toggle-button-${wallet.id}`}
                        title={wallet.isActive ? 'Deactivate wallet' : 'Activate wallet'}
                    >
                        <Power size={14} />
                        <span>{wallet.isActive ? 'Disable' : 'Enable'}</span>
                    </button>
                </div>
            </div>

            {/* Account Details */}
            <div className="account-details" data-testid="wallet-details">
                {config?.type === 'smart_wallet' ? (
                    <div className="detail-item" data-testid="phone-number">
                        <Phone size={16} className="detail-icon" />
                        <span className="detail-text">{wallet.phoneNumber || 'N/A'}</span>
                    </div>
                ) : (
                    <div className="detail-item" data-testid="instapay-alias">
                        <Building2 size={16} className="detail-icon" />
                        <span className="detail-text">{wallet.instapayAlias || 'N/A'}</span>
                    </div>
                )}
            </div>

            {/* Usage Statistics */}
            <div className="usage-statistics" data-testid="usage-section">
                <h4 className="section-title">Usage Statistics</h4>
                
                <div className="progress-bars">
                    <UsageProgressBar
                        used={wallet.dailyUsed}
                        limit={wallet.dailyLimit}
                        label="Daily Usage"
                        showPercentage={true}
                    />
                    
                    <UsageProgressBar
                        used={wallet.monthlyUsed}
                        limit={wallet.monthlyLimit}
                        label="Monthly Usage"
                        showPercentage={true}
                    />
                </div>

                <div className="reset-timestamps" data-testid="reset-info">
                    <div className="timestamp-item">
                        <span className="timestamp-label">Daily Reset:</span>
                        <span className="timestamp-value" data-testid="daily-reset">
                            {formatDate(wallet.lastResetDaily)}
                        </span>
                    </div>
                    <div className="timestamp-item">
                        <span className="timestamp-label">Monthly Reset:</span>
                        <span className="timestamp-value" data-testid="monthly-reset">
                            {formatDate(wallet.lastResetMonthly)}
                        </span>
                    </div>
                </div>
            </div>

            <style>{`
                /* Card Container */
                .wallet-card {
                    display: flex;
                    flex-direction: column;
                    background: var(--matrix-surface);
                    border: 2px solid var(--matrix-border);
                    border-radius: 12px;
                    padding: 20px;
                    transition: all 0.2s ease;
                    min-height: 300px;
                    width: 100%;
                    box-sizing: border-box;
                }

                .wallet-card:hover {
                    border-color: var(--matrix-green);
                }

                .wallet-card.inactive {
                    opacity: 0.7;
                    border-color: var(--matrix-muted);
                }

                /* Header Section */
                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                    gap: 16px;
                }

                .payment-method-section {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex: 1;
                    min-width: 0;
                }

                .payment-method-info {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                }

                .payment-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                    line-height: 1;
                }

                .payment-text {
                    flex: 1;
                    min-width: 0;
                }

                .payment-name {
                    font-size: 18px;
                    font-weight: 600;
                    color: var(--matrix-bright-green);
                    margin: 0 0 4px 0;
                    line-height: 1.2;
                }

                .holder-name {
                    font-size: 14px;
                    color: var(--matrix-secondary);
                    margin: 0;
                    line-height: 1.3;
                }

                .status-indicators {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 4px;
                }

                .status-badge {
                    font-size: 12px;
                    font-weight: 600;
                    padding: 4px 8px;
                    border-radius: 12px;
                    line-height: 1;
                }

                .status-badge.inactive {
                    background: #374151;
                    color: #D1D5DB;
                    border: 1px solid #4B5563;
                }

                .warning-indicator {
                    display: flex;
                    align-items: center;
                    cursor: help;
                    position: relative;
                }

                .warning-icon {
                    color: #F59E0B;
                }

                .warning-indicator:hover::after {
                    content: attr(title);
                    position: absolute;
                    bottom: calc(100% + 8px);
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--matrix-black);
                    color: var(--matrix-bright-green);
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    white-space: nowrap;
                    z-index: 10;
                    border: 1px solid var(--matrix-border);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                }

                /* Action Buttons */
                .action-buttons {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .action-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    padding: 8px 12px;
                    border: 1px solid var(--matrix-border);
                    border-radius: 6px;
                    background: transparent;
                    color: var(--matrix-secondary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 12px;
                    font-weight: 500;
                    min-width: 70px;
                }

                .action-btn:hover {
                    background: var(--matrix-surface);
                    color: var(--matrix-bright-green);
                    border-color: var(--matrix-green);
                }

                .edit-btn:hover {
                    background: var(--matrix-surface);
                    color: #3B82F6;
                    border-color: #3B82F6;
                }

                .power-btn.active:hover {
                    background: var(--matrix-surface);
                    color: #EF4444;
                    border-color: #EF4444;
                }

                .power-btn.inactive:hover {
                    background: var(--matrix-surface);
                    color: #22C55E;
                    border-color: #22C55E;
                }

                /* Account Details */
                .account-details {
                    margin-bottom: 20px;
                }

                .detail-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 0;
                }

                .detail-icon {
                    color: var(--matrix-secondary);
                    flex-shrink: 0;
                }

                .detail-text {
                    color: var(--matrix-secondary);
                    font-size: 14px;
                }

                /* Usage Statistics */
                .usage-statistics {
                    border-top: 1px solid var(--matrix-border);
                    padding-top: 16px;
                    flex: 1;
                }

                .section-title {
                    color: var(--matrix-bright-green);
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0 0 16px 0;
                }

                .progress-bars {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    margin-bottom: 16px;
                }

                .reset-timestamps {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                }

                .timestamp-item {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex: 1;
                }

                .timestamp-label {
                    font-size: 12px;
                    font-weight: 500;
                    color: var(--matrix-muted);
                }

                .timestamp-value {
                    font-size: 12px;
                    color: var(--matrix-secondary);
                }

                /* Responsive Design */
                @media (max-width: 768px) {
                    .wallet-card {
                        padding: 16px;
                    }

                    .card-header {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 12px;
                    }

                    .payment-method-section {
                        gap: 12px;
                    }

                    .status-indicators {
                        justify-content: flex-start;
                    }

                    .action-buttons {
                        align-self: flex-end;
                        flex-direction: row;
                    }

                    .action-btn {
                        min-width: 60px;
                        padding: 6px 10px;
                        font-size: 11px;
                    }

                    .reset-timestamps {
                        flex-direction: column;
                        gap: 12px;
                    }
                }

                @media (max-width: 480px) {
                    .payment-method-info {
                        gap: 8px;
                    }

                    .payment-icon {
                        font-size: 20px;
                    }

                    .payment-name {
                        font-size: 16px;
                    }

                    .action-btn {
                        min-width: 55px;
                        padding: 6px 8px;
                        gap: 4px;
                    }

                    .action-btn span {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default WalletCard;