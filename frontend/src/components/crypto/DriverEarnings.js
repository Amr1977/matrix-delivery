import React, { useState, useEffect } from 'react';
import api from '../../api';
import WalletConnect from './WalletConnect';
import './DriverEarnings.css';

/**
 * DriverEarnings Component
 * Shows driver's crypto earnings and transaction history
 */
const DriverEarnings = () => {
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState(null);
    const [earnings, setEarnings] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (walletConnected && walletAddress) {
            connectWalletToAccount();
            fetchEarnings();
        }
    }, [walletConnected, walletAddress]);

    const handleWalletConnected = (walletInfo) => {
        setWalletConnected(true);
        setWalletAddress(walletInfo.address);
    };

    const handleWalletDisconnected = () => {
        setWalletConnected(false);
        setWalletAddress(null);
        setEarnings(null);
        setTransactions([]);
    };

    const connectWalletToAccount = async () => {
        try {
            await api.post('/crypto/wallet/connect', {
                walletAddress
            });
        } catch (error) {
            console.error('Failed to connect wallet to account:', error);
            setError(error.response?.data?.error || 'Failed to connect wallet');
        }
    };

    const fetchEarnings = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await api.get('/crypto/driver/earnings');
            setEarnings(response.data);
            setTransactions(response.data.transactions || []);
        } catch (error) {
            console.error('Failed to fetch earnings:', error);
            setError(error.response?.data?.error || 'Failed to load earnings');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    return (
        <div className="driver-earnings">
            <h1 className="earnings-title">💰 My Crypto Earnings</h1>

            {/* Wallet Connection */}
            <div className="wallet-section">
                <WalletConnect
                    onConnected={handleWalletConnected}
                    onDisconnected={handleWalletDisconnected}
                />
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            {walletConnected && (
                <>
                    {/* Earnings Summary */}
                    {loading ? (
                        <div className="loading">
                            <div className="spinner-large"></div>
                            <div>Loading earnings...</div>
                        </div>
                    ) : earnings ? (
                        <>
                            <div className="earnings-summary">
                                <div className="summary-card total">
                                    <div className="card-icon">💎</div>
                                    <div className="card-content">
                                        <div className="card-label">Total Earnings</div>
                                        <div className="card-value">
                                            {parseFloat(earnings.totalEarnings || 0).toFixed(2)} USDC
                                        </div>
                                        <div className="card-subtext">
                                            ≈ ${parseFloat(earnings.totalEarnings || 0).toFixed(2)} USD
                                        </div>
                                    </div>
                                </div>

                                <div className="summary-card">
                                    <div className="card-icon">📦</div>
                                    <div className="card-content">
                                        <div className="card-label">Completed Orders</div>
                                        <div className="card-value">
                                            {transactions.length}
                                        </div>
                                    </div>
                                </div>

                                <div className="summary-card">
                                    <div className="card-icon">🏦</div>
                                    <div className="card-content">
                                        <div className="card-label">Wallet Address</div>
                                        <div className="card-value wallet-addr">
                                            {formatAddress(earnings.walletAddress)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Transaction History */}
                            <div className="transactions-section">
                                <h2 className="section-title">Transaction History</h2>

                                {transactions.length === 0 ? (
                                    <div className="no-transactions">
                                        <div className="empty-icon">📭</div>
                                        <div className="empty-text">No transactions yet</div>
                                        <div className="empty-subtext">
                                            Complete deliveries to start earning crypto!
                                        </div>
                                    </div>
                                ) : (
                                    <div className="transactions-list">
                                        {transactions.map((tx) => (
                                            <div key={tx.id} className="transaction-item">
                                                <div className="tx-icon">
                                                    {tx.transaction_type === 'payout' ? '💸' : '🔄'}
                                                </div>
                                                <div className="tx-details">
                                                    <div className="tx-type">
                                                        {tx.transaction_type === 'payout' ? 'Payout' : 'Transaction'}
                                                    </div>
                                                    <div className="tx-date">
                                                        {formatDate(tx.confirmed_at || tx.created_at)}
                                                    </div>
                                                </div>
                                                <div className="tx-amount">
                                                    <div className="amount-value">
                                                        +{parseFloat(tx.amount).toFixed(2)} {tx.token_symbol}
                                                    </div>
                                                    <div className="amount-usd">
                                                        ≈ ${parseFloat(tx.amount).toFixed(2)}
                                                    </div>
                                                </div>
                                                <div className="tx-actions">
                                                    {tx.tx_hash && (
                                                        <a
                                                            href={`https://polygonscan.com/tx/${tx.tx_hash}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="view-tx"
                                                        >
                                                            View →
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Withdraw Info */}
                            <div className="withdraw-info">
                                <div className="info-icon">ℹ️</div>
                                <div className="info-content">
                                    <div className="info-title">How to withdraw your earnings</div>
                                    <div className="info-text">
                                        Your earnings are automatically sent to your connected wallet.
                                        You can withdraw them to an exchange (Coinbase, Binance) or keep them in your wallet.
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : null}
                </>
            )}

            {!walletConnected && (
                <div className="connect-prompt">
                    <div className="prompt-icon">🦊</div>
                    <div className="prompt-title">Connect Your Wallet</div>
                    <div className="prompt-text">
                        Connect your MetaMask wallet to view your crypto earnings and transaction history
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriverEarnings;
