import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './WalletConnect.css';

/**
 * WalletConnect Component
 * Handles MetaMask wallet connection and network switching
 */
const WalletConnect = ({ onConnected, onDisconnected }) => {
    const [account, setAccount] = useState(null);
    const [balance, setBalance] = useState(null);
    const [network, setNetwork] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        checkConnection();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', () => window.location.reload());

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, []);

    const checkConnection = async () => {
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    await handleAccountsChanged(accounts);
                }
            } catch (error) {
                console.error('Error checking connection:', error);
            }
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            setError('Please install MetaMask to use crypto payments');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }

        setConnecting(true);
        setError(null);

        try {
            // Request account access
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            await handleAccountsChanged(accounts);

            // Switch to Polygon network
            await switchToPolygon();

        } catch (error) {
            console.error('Error connecting wallet:', error);
            setError(error.message || 'Failed to connect wallet');
        } finally {
            setConnecting(false);
        }
    };

    const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
            // User disconnected
            setAccount(null);
            setBalance(null);
            setNetwork(null);
            if (onDisconnected) onDisconnected();
            return;
        }

        const account = accounts[0];
        setAccount(account);

        try {
            // Get balance
            const provider = new ethers.BrowserProvider(window.ethereum);
            const balance = await provider.getBalance(account);
            setBalance(ethers.formatEther(balance));

            // Get network
            const network = await provider.getNetwork();
            setNetwork({
                name: network.name,
                chainId: Number(network.chainId)
            });

            // Notify parent component
            if (onConnected) {
                onConnected({
                    address: account,
                    balance: ethers.formatEther(balance),
                    network: network.name,
                    chainId: Number(network.chainId)
                });
            }
        } catch (error) {
            console.error('Error getting wallet info:', error);
            setError('Failed to get wallet information');
        }
    };

    const switchToPolygon = async () => {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x89' }], // Polygon Mainnet (137)
            });
        } catch (switchError) {
            // Chain not added, add it
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x89',
                            chainName: 'Polygon Mainnet',
                            nativeCurrency: {
                                name: 'MATIC',
                                symbol: 'MATIC',
                                decimals: 18
                            },
                            rpcUrls: ['https://polygon-rpc.com/'],
                            blockExplorerUrls: ['https://polygonscan.com/']
                        }]
                    });
                } catch (addError) {
                    console.error('Error adding Polygon network:', addError);
                    setError('Failed to add Polygon network');
                }
            } else {
                console.error('Error switching to Polygon:', switchError);
            }
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setBalance(null);
        setNetwork(null);
        if (onDisconnected) onDisconnected();
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    if (account) {
        return (
            <div className="wallet-connected">
                <div className="wallet-info">
                    <div className="wallet-icon">🦊</div>
                    <div className="wallet-details">
                        <div className="wallet-label">Connected Wallet</div>
                        <div className="wallet-address">{formatAddress(account)}</div>
                        {balance && (
                            <div className="wallet-balance">
                                {parseFloat(balance).toFixed(4)} MATIC
                            </div>
                        )}
                        {network && network.chainId !== 137 && (
                            <div className="wallet-warning">
                                ⚠️ Please switch to Polygon network
                            </div>
                        )}
                    </div>
                </div>
                <button
                    onClick={disconnectWallet}
                    className="btn-disconnect"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="wallet-connect">
            {error && (
                <div className="wallet-error">
                    ⚠️ {error}
                </div>
            )}
            <button
                onClick={connectWallet}
                disabled={connecting}
                className="btn-connect-wallet"
            >
                {connecting ? (
                    <>
                        <span className="spinner"></span>
                        Connecting...
                    </>
                ) : (
                    <>
                        🦊 Connect Wallet
                    </>
                )}
            </button>
            <div className="wallet-help">
                Don't have a wallet?{' '}
                <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Install MetaMask
                </a>
            </div>
        </div>
    );
};

export default WalletConnect;
