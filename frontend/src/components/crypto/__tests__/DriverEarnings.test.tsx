/**
 * DriverEarnings Component Tests
 * Tests for driver crypto earnings dashboard
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DriverEarnings from '../DriverEarnings';
import api from '../../../api';

// Mock dependencies
jest.mock('../../../api');
jest.mock('../WalletConnect', () => {
    return function MockWalletConnect({ onConnected, onDisconnected }: any) {
        return (
            <div data-testid="wallet-connect">
                <button onClick={() => onConnected({
                    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                    balance: '3.5',
                    network: 'matic',
                    chainId: 137
                })}>
                    Connect Wallet
                </button>
                <button onClick={onDisconnected}>Disconnect</button>
            </div>
        );
    };
});

const mockApi = api as jest.Mocked<typeof api>;

describe('DriverEarnings', () => {
    const mockEarningsData = {
        totalEarnings: '150.50',
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        transactions: [
            {
                id: 'tx-1',
                transaction_type: 'payout',
                token_symbol: 'USDC',
                amount: '50.00',
                tx_hash: '0xabc123',
                confirmed_at: '2024-01-15T10:00:00Z',
                created_at: '2024-01-15T10:00:00Z'
            },
            {
                id: 'tx-2',
                transaction_type: 'payout',
                token_symbol: 'USDC',
                amount: '100.50',
                tx_hash: '0xdef456',
                confirmed_at: '2024-01-16T12:00:00Z',
                created_at: '2024-01-16T12:00:00Z'
            }
        ]
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockApi.post.mockResolvedValue({ data: { success: true } });
        mockApi.get.mockResolvedValue({ data: mockEarningsData });
    });

    describe('Initial Render', () => {
        it('should render wallet connection section', () => {
            render(<DriverEarnings />);

            expect(screen.getByText(/My Crypto Earnings/i)).toBeInTheDocument();
            expect(screen.getByTestId('wallet-connect')).toBeInTheDocument();
        });

        it('should show connect prompt when wallet not connected', () => {
            render(<DriverEarnings />);

            expect(screen.getByText(/Connect Your Wallet/i)).toBeInTheDocument();
            expect(screen.getByText(/Connect your MetaMask wallet/i)).toBeInTheDocument();
        });
    });

    describe('Wallet Connection', () => {
        it('should connect wallet to backend account', async () => {
            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(mockApi.post).toHaveBeenCalledWith('/crypto/wallet/connect', {
                    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
                });
            });
        });

        it('should fetch earnings after wallet connection', async () => {
            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalledWith('/crypto/driver/earnings');
            });
        });

        it('should handle wallet connection errors', async () => {
            mockApi.post.mockRejectedValue({
                response: { data: { error: 'Wallet already connected' } }
            });

            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(screen.getByText(/Wallet already connected/i)).toBeInTheDocument();
            });
        });
    });

    describe('Earnings Display', () => {
        beforeEach(async () => {
            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalled();
            });
        });

        it('should display total earnings', async () => {
            await waitFor(() => {
                expect(screen.getByText(/150.50 USDC/i)).toBeInTheDocument();
            });
        });

        it('should display completed orders count', async () => {
            await waitFor(() => {
                expect(screen.getByText('2')).toBeInTheDocument(); // 2 transactions
            });
        });

        it('should display wallet address', async () => {
            await waitFor(() => {
                expect(screen.getByText(/0x742d...0bEb/i)).toBeInTheDocument();
            });
        });

        it('should display transaction history', async () => {
            await waitFor(() => {
                expect(screen.getByText(/Transaction History/i)).toBeInTheDocument();
                expect(screen.getByText(/50.00 USDC/i)).toBeInTheDocument();
                expect(screen.getByText(/100.50 USDC/i)).toBeInTheDocument();
            });
        });

        it('should format USDC amounts correctly', async () => {
            await waitFor(() => {
                const amounts = screen.getAllByText(/USDC/i);
                expect(amounts.length).toBeGreaterThan(0);
            });
        });

        it('should link to PolygonScan for transactions', async () => {
            await waitFor(() => {
                const links = screen.getAllByText(/View →/i);
                expect(links[0]).toHaveAttribute('href', 'https://polygonscan.com/tx/0xabc123');
                expect(links[1]).toHaveAttribute('href', 'https://polygonscan.com/tx/0xdef456');
            });
        });
    });

    describe('Empty State', () => {
        it('should show empty state when no transactions', async () => {
            mockApi.get.mockResolvedValue({
                data: {
                    totalEarnings: '0',
                    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
                    transactions: []
                }
            });

            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(screen.getByText(/No transactions yet/i)).toBeInTheDocument();
                expect(screen.getByText(/Complete deliveries to start earning crypto/i)).toBeInTheDocument();
            });
        });
    });

    describe('Loading State', () => {
        it('should show loading state while fetching', async () => {
            mockApi.get.mockImplementation(() => new Promise(() => { })); // Never resolves

            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(screen.getByText(/Loading earnings/i)).toBeInTheDocument();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            mockApi.get.mockRejectedValue({
                response: { data: { error: 'Failed to fetch earnings' } }
            });

            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to fetch earnings/i)).toBeInTheDocument();
            });
        });

        it('should handle network errors', async () => {
            mockApi.get.mockRejectedValue(new Error('Network error'));

            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(screen.getByText(/Failed to load earnings/i)).toBeInTheDocument();
            });
        });
    });

    describe('Wallet Disconnection', () => {
        it('should clear earnings on disconnect', async () => {
            render(<DriverEarnings />);

            // Connect
            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(screen.getByText(/150.50 USDC/i)).toBeInTheDocument();
            });

            // Disconnect
            const disconnectButton = screen.getByText('Disconnect');
            fireEvent.click(disconnectButton);

            await waitFor(() => {
                expect(screen.queryByText(/150.50 USDC/i)).not.toBeInTheDocument();
                expect(screen.getByText(/Connect Your Wallet/i)).toBeInTheDocument();
            });
        });
    });

    describe('Transaction Details', () => {
        beforeEach(async () => {
            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalled();
            });
        });

        it('should display transaction type icons', async () => {
            await waitFor(() => {
                const payoutIcons = screen.getAllByText('💸');
                expect(payoutIcons.length).toBe(2);
            });
        });

        it('should format transaction dates', async () => {
            await waitFor(() => {
                // Check that dates are formatted (not raw ISO strings)
                expect(screen.queryByText('2024-01-15T10:00:00Z')).not.toBeInTheDocument();
            });
        });

        it('should display USD equivalent', async () => {
            await waitFor(() => {
                const usdAmounts = screen.getAllByText(/≈ \$/i);
                expect(usdAmounts.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Withdrawal Information', () => {
        beforeEach(async () => {
            render(<DriverEarnings />);

            const connectButton = screen.getByText('Connect Wallet');
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalled();
            });
        });

        it('should display withdrawal instructions', async () => {
            await waitFor(() => {
                expect(screen.getByText(/How to withdraw your earnings/i)).toBeInTheDocument();
                expect(screen.getByText(/automatically sent to your connected wallet/i)).toBeInTheDocument();
            });
        });
    });

    describe('Responsive Behavior', () => {
        it('should render properly on mobile', () => {
            // Set mobile viewport
            global.innerWidth = 375;
            global.innerHeight = 667;

            render(<DriverEarnings />);

            expect(screen.getByText(/My Crypto Earnings/i)).toBeInTheDocument();
        });
    });
});
