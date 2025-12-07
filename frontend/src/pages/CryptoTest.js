import React, { useState } from 'react';
import WalletConnect from '../components/crypto/WalletConnect';
import CryptoPayment from '../components/crypto/CryptoPayment';
import DriverEarnings from '../components/crypto/DriverEarnings';
import './CryptoTest.css';

/**
 * CryptoTest Page
 * Dedicated page for testing crypto payment components
 */
const CryptoTest = () => {
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState(null);
    const [walletInfo, setWalletInfo] = useState(null);

    const handleWalletConnected = (info) => {
        console.log('✅ Wallet connected:', info);
        setWalletConnected(true);
        setWalletAddress(info.address);
        setWalletInfo(info);

        // Show success notification
        alert(`✅ Wallet Connected!\n\nAddress: ${info.address}\nBalance: ${info.balance} MATIC\nNetwork: ${info.network}\nChain ID: ${info.chainId}`);
    };

    const handleWalletDisconnected = () => {
        console.log('❌ Wallet disconnected');
        setWalletConnected(false);
        setWalletAddress(null);
        setWalletInfo(null);
    };

    const handlePaymentSuccess = (data) => {
        console.log('✅ Payment successful:', data);
        alert(`✅ Payment Successful!\n\nTx Hash: ${data.txHash}\nToken: ${data.token}\nAmount: ${data.amount}`);
    };

    const handlePaymentError = (error) => {
        console.error('❌ Payment error:', error);
        alert(`❌ Payment Failed\n\n${error}`);
    };

    return (
        <div className="crypto-test-page">
            <div className="test-header">
                <h1>🧪 Crypto Payment System Test</h1>
                <p className="test-subtitle">
                    Test wallet connection, payments, and earnings dashboard
                </p>
            </div>

            {/* Section 1: Wallet Connection */}
            <div className="test-section">
                <div className="section-header">
                    <h2>1️⃣ Wallet Connection</h2>
                    <div className="status-badge">
                        {walletConnected ? (
                            <span className="status-connected">✅ Connected</span>
                        ) : (
                            <span className="status-disconnected">⭕ Not Connected</span>
                        )}
                    </div>
                </div>

                <div className="section-content">
                    <WalletConnect
                        onConnected={handleWalletConnected}
                        onDisconnected={handleWalletDisconnected}
                    />

                    {walletInfo && (
                        <div className="wallet-details">
                            <h3>Wallet Details:</h3>
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <span className="detail-label">Address:</span>
                                    <span className="detail-value">{walletInfo.address}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Balance:</span>
                                    <span className="detail-value">{walletInfo.balance} MATIC</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Network:</span>
                                    <span className="detail-value">{walletInfo.network}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Chain ID:</span>
                                    <span className="detail-value">{walletInfo.chainId}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Section 2: Test Payment */}
            {walletConnected && (
                <div className="test-section">
                    <div className="section-header">
                        <h2>2️⃣ Test Payment</h2>
                        <div className="info-badge">
                            ℹ️ This will use real USDC on Polygon Mainnet
                        </div>
                    </div>

                    <div className="section-content">
                        <div className="warning-box">
                            <strong>⚠️ Warning:</strong> This is a real payment on Polygon Mainnet.
                            Make sure you have USDC in your wallet before testing.
                        </div>

                        <CryptoPayment
                            orderId="test-order-123"
                            amount={10}
                            walletAddress={walletAddress}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                        />
                    </div>
                </div>
            )}

            {/* Section 3: Driver Earnings */}
            {walletConnected && (
                <div className="test-section">
                    <div className="section-header">
                        <h2>3️⃣ Driver Earnings Dashboard</h2>
                    </div>

                    <div className="section-content">
                        <DriverEarnings />
                    </div>
                </div>
            )}

            {/* Instructions */}
            {!walletConnected && (
                <div className="instructions-box">
                    <h3>📋 Testing Instructions:</h3>
                    <ol>
                        <li>Make sure MetaMask is installed and unlocked</li>
                        <li>Switch to Polygon Mainnet (Chain ID: 137)</li>
                        <li>Click "Connect Wallet" above</li>
                        <li>Approve the connection in MetaMask</li>
                        <li>Test the payment and earnings features</li>
                    </ol>

                    <div className="help-links">
                        <h4>Need Help?</h4>
                        <ul>
                            <li>
                                <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer">
                                    Install MetaMask
                                </a>
                            </li>
                            <li>
                                <a href="https://polygonscan.com/address/0xD75CD1480698576bD7c7A813207Af20a78775142" target="_blank" rel="noopener noreferrer">
                                    View Smart Contract on PolygonScan
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CryptoTest;
