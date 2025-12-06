import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import api from '../../api';
import './CryptoPayment.css';

const ESCROW_ABI = [
    "function createOrder(string orderId, address token, uint256 amount) external"
];

const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)"
];

/**
 * CryptoPayment Component
 * Handles cryptocurrency payment flow for orders
 */
const CryptoPayment = ({ orderId, amount, walletAddress, onSuccess, onError }) => {
    const [tokens, setTokens] = useState([]);
    const [selectedToken, setSelectedToken] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState('select'); // select, approve, deposit, complete
    const [balance, setBalance] = useState(null);
    const [txHash, setTxHash] = useState(null);

    useEffect(() => {
        fetchTokens();
    }, []);

    useEffect(() => {
        if (selectedToken && walletAddress) {
            checkBalance();
        }
    }, [selectedToken, walletAddress]);

    const fetchTokens = async () => {
        try {
            const response = await api.get('/crypto/tokens');
            setTokens(response.data.tokens);
            if (response.data.tokens.length > 0) {
                setSelectedToken(response.data.tokens[0]); // Default to USDC
            }
        } catch (error) {
            console.error('Failed to fetch tokens:', error);
            if (onError) onError('Failed to load payment options');
        }
    };

    const checkBalance = async () => {
        try {
            const response = await api.get(`/crypto/balance/${walletAddress}/${selectedToken.symbol}`);
            setBalance(response.data.balance);
        } catch (error) {
            console.error('Failed to check balance:', error);
        }
    };

    const handlePayment = async () => {
        if (!window.ethereum) {
            if (onError) onError('Please install MetaMask');
            return;
        }

        if (!walletAddress) {
            if (onError) onError('Please connect your wallet first');
            return;
        }

        setProcessing(true);
        setStep('approve');

        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Get contract addresses from environment
            const escrowAddress = process.env.REACT_APP_ESCROW_CONTRACT_ADDRESS;

            if (!escrowAddress) {
                throw new Error('Escrow contract address not configured');
            }

            // Step 1: Approve token spending
            const tokenContract = new ethers.Contract(
                selectedToken.address,
                ERC20_ABI,
                signer
            );

            const amountInWei = ethers.parseUnits(amount.toString(), selectedToken.decimals);

            // Check current allowance
            const currentAllowance = await tokenContract.allowance(walletAddress, escrowAddress);

            if (currentAllowance < amountInWei) {
                console.log('Requesting token approval...');
                const approveTx = await tokenContract.approve(escrowAddress, amountInWei);
                console.log('Approval transaction sent:', approveTx.hash);
                await approveTx.wait();
                console.log('Approval confirmed');
            }

            // Step 2: Create order in escrow
            setStep('deposit');
            const escrowContract = new ethers.Contract(
                escrowAddress,
                ESCROW_ABI,
                signer
            );

            console.log('Creating order in escrow...');
            const createTx = await escrowContract.createOrder(
                orderId,
                selectedToken.address,
                amountInWei
            );

            console.log('Order creation transaction sent:', createTx.hash);
            setTxHash(createTx.hash);

            const receipt = await createTx.wait();
            console.log('Order creation confirmed:', receipt);

            // Step 3: Complete
            setStep('complete');

            if (onSuccess) {
                onSuccess({
                    txHash: receipt.hash,
                    token: selectedToken.symbol,
                    amount,
                    blockNumber: receipt.blockNumber
                });
            }

        } catch (error) {
            console.error('Payment failed:', error);

            let errorMessage = 'Payment failed';
            if (error.code === 'ACTION_REJECTED') {
                errorMessage = 'Transaction rejected by user';
            } else if (error.message) {
                errorMessage = error.message;
            }

            if (onError) {
                onError(errorMessage);
            }

            setStep('select');
        } finally {
            setProcessing(false);
        }
    };

    const hasInsufficientBalance = balance && parseFloat(balance) < parseFloat(amount);

    return (
        <div className="crypto-payment">
            <h2 className="payment-title">Pay with Cryptocurrency</h2>

            {/* Token Selection */}
            <div className="token-selection">
                <label className="section-label">Select Token</label>
                <div className="token-grid">
                    {tokens.map(token => (
                        <button
                            key={token.symbol}
                            onClick={() => setSelectedToken(token)}
                            disabled={processing}
                            className={`token-option ${selectedToken?.symbol === token.symbol ? 'selected' : ''}`}
                        >
                            <div className="token-info">
                                <div className="token-symbol">{token.symbol}</div>
                                <div className="token-network">{token.network}</div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Amount Display */}
            <div className="amount-display">
                <div className="amount-label">Amount to Pay</div>
                <div className="amount-value">
                    {amount} {selectedToken?.symbol}
                </div>
                <div className="amount-usd">
                    ≈ ${amount} USD
                </div>
            </div>

            {/* Balance Check */}
            {balance && (
                <div className={`balance-info ${hasInsufficientBalance ? 'insufficient' : ''}`}>
                    <div className="balance-label">Your Balance:</div>
                    <div className="balance-value">
                        {parseFloat(balance).toFixed(2)} {selectedToken?.symbol}
                    </div>
                    {hasInsufficientBalance && (
                        <div className="balance-warning">
                            ⚠️ Insufficient balance
                        </div>
                    )}
                </div>
            )}

            {/* Payment Steps */}
            {processing && (
                <div className="payment-steps">
                    <div className="step-indicator">
                        {step === 'approve' && '1/2 Approving token spending...'}
                        {step === 'deposit' && '2/2 Depositing to escrow...'}
                        {step === 'complete' && '✅ Payment complete!'}
                    </div>
                    <div className="progress-bar">
                        <div
                            className="progress-fill"
                            style={{
                                width: step === 'approve' ? '50%' : step === 'deposit' ? '75%' : '100%'
                            }}
                        />
                    </div>
                    {txHash && (
                        <div className="tx-hash">
                            <a
                                href={`https://polygonscan.com/tx/${txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View on PolygonScan →
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Pay Button */}
            <button
                onClick={handlePayment}
                disabled={processing || !selectedToken || !walletAddress || hasInsufficientBalance}
                className="btn-pay"
            >
                {processing ? (
                    <>
                        <span className="spinner"></span>
                        Processing...
                    </>
                ) : hasInsufficientBalance ? (
                    'Insufficient Balance'
                ) : (
                    `Pay ${amount} ${selectedToken?.symbol || ''}`
                )}
            </button>

            {/* Network Info */}
            <div className="network-info">
                <div className="info-icon">ℹ️</div>
                <div className="info-text">
                    Make sure you're connected to <strong>Polygon Network</strong>
                </div>
            </div>

            {/* Security Notice */}
            <div className="security-notice">
                <div className="notice-icon">🔒</div>
                <div className="notice-text">
                    Your funds are held in a secure smart contract escrow until delivery is complete
                </div>
            </div>
        </div>
    );
};

export default CryptoPayment;
