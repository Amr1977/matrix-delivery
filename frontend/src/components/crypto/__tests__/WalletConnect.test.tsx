/**
 * WalletConnect Component Tests
 * Tests for MetaMask wallet connection functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import WalletConnect from '../WalletConnect';
import { ethers } from 'ethers';

// Mock ethers
jest.mock('ethers');

// Mock window.ethereum
const mockEthereum = {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
};

describe('WalletConnect', () => {
    let onConnected: jest.Mock;
    let onDisconnected: jest.Mock;

    beforeEach(() => {
        onConnected = jest.fn();
        onDisconnected = jest.fn();
        (window as any).ethereum = mockEthereum;
        jest.clearAllMocks();
    });

    afterEach(() => {
        delete (window as any).ethereum;
    });

    describe('Initial Render', () => {
        it('should render connect button when not connected', () => {
            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
        });

        it('should show install link if MetaMask not found', () => {
            delete (window as any).ethereum;

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            expect(screen.getByText(/Install MetaMask/i)).toBeInTheDocument();
        });
    });

    describe('Wallet Connection', () => {
        it('should detect MetaMask installation', () => {
            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            expect(screen.queryByText(/Install MetaMask/i)).not.toBeInTheDocument();
            expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
        });

        it('should connect to MetaMask on button click', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
            const mockBalance = '3.5';

            mockEthereum.request.mockResolvedValueOnce([mockAddress]);

            // Mock ethers provider
            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther(mockBalance)),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            const connectButton = screen.getByText(/Connect Wallet/i);
            fireEvent.click(connectButton);

            await waitFor(() => {
                expect(mockEthereum.request).toHaveBeenCalledWith({
                    method: 'eth_requestAccounts'
                });
            });
        });

        it('should display wallet address after connection', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            mockEthereum.request.mockResolvedValueOnce([mockAddress]);

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther('3.5')),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(screen.getByText(/0x742d...0bEb/i)).toBeInTheDocument();
            });
        });

        it('should display wallet balance', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
            const mockBalance = '3.7908';

            mockEthereum.request.mockResolvedValueOnce([mockAddress]);

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther(mockBalance)),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(screen.getByText(/3.7908 MATIC/i)).toBeInTheDocument();
            });
        });

        it('should call onConnected callback with wallet info', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
            const mockBalance = '3.5';

            mockEthereum.request.mockResolvedValueOnce([mockAddress]);

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther(mockBalance)),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(onConnected).toHaveBeenCalledWith({
                    address: mockAddress,
                    balance: mockBalance,
                    network: 'matic',
                    chainId: 137
                });
            });
        });
    });

    describe('Network Switching', () => {
        it('should switch to Polygon network', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            mockEthereum.request
                .mockResolvedValueOnce([mockAddress]) // eth_requestAccounts
                .mockResolvedValueOnce(undefined); // wallet_switchEthereumChain

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther('3.5')),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(mockEthereum.request).toHaveBeenCalledWith({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0x89' }]
                });
            });
        });

        it('should handle network switch errors', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            mockEthereum.request
                .mockResolvedValueOnce([mockAddress])
                .mockRejectedValueOnce({ code: 4902 }); // Chain not added

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(mockEthereum.request).toHaveBeenCalledWith({
                    method: 'wallet_addEthereumChain',
                    params: expect.arrayContaining([
                        expect.objectContaining({
                            chainId: '0x89',
                            chainName: 'Polygon Mainnet'
                        })
                    ])
                });
            });
        });
    });

    describe('Wallet Disconnection', () => {
        it('should disconnect wallet', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            mockEthereum.request.mockResolvedValueOnce([mockAddress]);

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther('3.5')),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            // Connect first
            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(screen.getByText(/Disconnect/i)).toBeInTheDocument();
            });

            // Disconnect
            fireEvent.click(screen.getByText(/Disconnect/i));

            await waitFor(() => {
                expect(onDisconnected).toHaveBeenCalled();
                expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
            });
        });

        it('should call onDisconnected callback', async () => {
            const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            mockEthereum.request.mockResolvedValueOnce([mockAddress]);

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther('3.5')),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(screen.getByText(/Disconnect/i)).toBeInTheDocument();
            });

            fireEvent.click(screen.getByText(/Disconnect/i));

            expect(onDisconnected).toHaveBeenCalled();
        });
    });

    describe('Account Changes', () => {
        it('should handle account changes', async () => {
            const mockAddress1 = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
            const mockAddress2 = '0x123d35Cc6634C0532925a3b844Bc9e7595f0ABC';

            mockEthereum.request.mockResolvedValueOnce([mockAddress1]);

            const mockProvider = {
                getBalance: jest.fn().mockResolvedValue(ethers.parseEther('3.5')),
                getNetwork: jest.fn().mockResolvedValue({
                    name: 'matic',
                    chainId: 137n
                })
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(mockEthereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
            });
        });

        it('should reload on chain change', async () => {
            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            await waitFor(() => {
                expect(mockEthereum.on).toHaveBeenCalledWith('chainChanged', expect.any(Function));
            });
        });
    });

    describe('Error Handling', () => {
        it('should show error message on connection failure', async () => {
            mockEthereum.request.mockRejectedValueOnce(new Error('User rejected'));

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(screen.getByText(/User rejected/i)).toBeInTheDocument();
            });
        });

        it('should handle user rejection gracefully', async () => {
            mockEthereum.request.mockRejectedValueOnce({ code: 4001 });

            render(<WalletConnect onConnected={onConnected} onDisconnected={onDisconnected} />);

            fireEvent.click(screen.getByText(/Connect Wallet/i));

            await waitFor(() => {
                expect(screen.getByText(/Connect Wallet/i)).toBeInTheDocument();
            });
        });
    });
});
