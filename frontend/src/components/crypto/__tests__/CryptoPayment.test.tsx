/**
 * CryptoPayment Component Tests
 * Tests for USDC payment processing functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CryptoPayment from '../CryptoPayment';
import { ethers } from 'ethers';
import api from '../../../api';

// Mock dependencies
jest.mock('ethers');
jest.mock('../../../api');

const mockApi = api as jest.Mocked<typeof api>;

describe('CryptoPayment', () => {
    const mockProps = {
        orderId: 'order-123',
        amount: 10,
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        onSuccess: jest.fn(),
        onError: jest.fn()
    };

    const mockTokens = [
        {
            symbol: 'USDC',
            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            decimals: 6,
            network: 'Polygon'
        }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.REACT_APP_ESCROW_CONTRACT_ADDRESS = '0xD75CD1480698576bD7c7A813207Af20a78775142';

        mockApi.get.mockImplementation((url: string) => {
            if (url === '/crypto/tokens') {
                return Promise.resolve({ data: { tokens: mockTokens } });
            }
            if (url.includes('/crypto/balance/')) {
                return Promise.resolve({ data: { balance: '100.50', token: 'USDC' } });
            }
            return Promise.reject(new Error('Unknown endpoint'));
        });
    });

    describe('Initial Render', () => {
        it('should render payment form with amount', async () => {
            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Pay with Cryptocurrency/i)).toBeInTheDocument();
                expect(screen.getByText(/10/)).toBeInTheDocument();
            });
        });

        it('should display USDC token information', async () => {
            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(screen.getByText(/USDC/i)).toBeInTheDocument();
                expect(screen.getByText(/Polygon/i)).toBeInTheDocument();
            });
        });

        it('should fetch and display supported tokens', async () => {
            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalledWith('/crypto/tokens');
                expect(screen.getByText('USDC')).toBeInTheDocument();
            });
        });
    });

    describe('Balance Checking', () => {
        it('should check wallet balance on mount', async () => {
            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalledWith(
                    `/crypto/balance/${mockProps.walletAddress}/USDC`
                );
            });
        });

        it('should display wallet balance', async () => {
            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(screen.getByText(/100.50 USDC/i)).toBeInTheDocument();
            });
        });

        it('should show warning for insufficient balance', async () => {
            mockApi.get.mockImplementation((url: string) => {
                if (url === '/crypto/tokens') {
                    return Promise.resolve({ data: { tokens: mockTokens } });
                }
                if (url.includes('/crypto/balance/')) {
                    return Promise.resolve({ data: { balance: '5.00', token: 'USDC' } });
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(screen.getByText(/Insufficient balance/i)).toBeInTheDocument();
            });
        });

        it('should disable pay button when insufficient balance', async () => {
            mockApi.get.mockImplementation((url: string) => {
                if (url === '/crypto/tokens') {
                    return Promise.resolve({ data: { tokens: mockTokens } });
                }
                if (url.includes('/crypto/balance/')) {
                    return Promise.resolve({ data: { balance: '5.00', token: 'USDC' } });
                }
                return Promise.reject(new Error('Unknown endpoint'));
            });

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Insufficient Balance/i });
                expect(payButton).toBeDisabled();
            });
        });
    });

    describe('Payment Processing', () => {
        const mockEthereum = {
            request: jest.fn()
        };

        beforeEach(() => {
            (window as any).ethereum = mockEthereum;
        });

        afterEach(() => {
            delete (window as any).ethereum;
        });

        it('should require MetaMask installation', async () => {
            delete (window as any).ethereum;

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            expect(mockProps.onError).toHaveBeenCalledWith('Please install MetaMask');
        });

        it('should require wallet connection', async () => {
            render(<CryptoPayment {...{ ...mockProps, walletAddress: null }} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button');
                fireEvent.click(payButton);
            });

            expect(mockProps.onError).toHaveBeenCalledWith('Please connect your wallet first');
        });

        it('should initiate USDC transfer on submit', async () => {
            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockTokenContract = {
                allowance: jest.fn().mockResolvedValue(0n),
                approve: jest.fn().mockResolvedValue({
                    hash: '0xapprove123',
                    wait: jest.fn().mockResolvedValue({ hash: '0xapprove123' })
                })
            };

            const mockEscrowContract = {
                createOrder: jest.fn().mockResolvedValue({
                    hash: '0xtx123',
                    wait: jest.fn().mockResolvedValue({
                        hash: '0xtx123',
                        blockNumber: 12345
                    })
                })
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (ethers.Contract as jest.Mock)
                .mockReturnValueOnce(mockTokenContract)
                .mockReturnValueOnce(mockEscrowContract);
            (ethers.parseUnits as jest.Mock).mockReturnValue(10000000n);

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                expect(mockTokenContract.approve).toHaveBeenCalled();
                expect(mockEscrowContract.createOrder).toHaveBeenCalledWith(
                    mockProps.orderId,
                    mockTokens[0].address,
                    10000000n
                );
            });
        });

        it('should show loading state during transaction', async () => {
            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockTokenContract = {
                allowance: jest.fn().mockResolvedValue(0n),
                approve: jest.fn().mockResolvedValue({
                    hash: '0xapprove123',
                    wait: jest.fn().mockImplementation(() => new Promise(() => { })) // Never resolves
                })
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (ethers.Contract as jest.Mock).mockReturnValue(mockTokenContract);
            (ethers.parseUnits as jest.Mock).mockReturnValue(10000000n);

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                expect(screen.getByText(/Processing/i)).toBeInTheDocument();
            });
        });

        it('should call onSuccess with transaction hash', async () => {
            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockTokenContract = {
                allowance: jest.fn().mockResolvedValue(ethers.parseUnits('100', 6)),
                approve: jest.fn()
            };

            const mockEscrowContract = {
                createOrder: jest.fn().mockResolvedValue({
                    hash: '0xtx123',
                    wait: jest.fn().mockResolvedValue({
                        hash: '0xtx123',
                        blockNumber: 12345
                    })
                })
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (ethers.Contract as jest.Mock)
                .mockReturnValueOnce(mockTokenContract)
                .mockReturnValueOnce(mockEscrowContract);
            (ethers.parseUnits as jest.Mock).mockReturnValue(10000000n);

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                expect(mockProps.onSuccess).toHaveBeenCalledWith({
                    txHash: '0xtx123',
                    token: 'USDC',
                    amount: 10,
                    blockNumber: 12345
                });
            });
        });

        it('should call onError on transaction failure', async () => {
            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (ethers.Contract as jest.Mock).mockImplementation(() => {
                throw new Error('Transaction failed');
            });

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                expect(mockProps.onError).toHaveBeenCalledWith('Transaction failed');
            });
        });

        it('should handle user rejection', async () => {
            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            const rejectionError = new Error('User rejected');
            (rejectionError as any).code = 'ACTION_REJECTED';

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (ethers.Contract as jest.Mock).mockImplementation(() => {
                throw rejectionError;
            });

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                expect(mockProps.onError).toHaveBeenCalledWith('Transaction rejected by user');
            });
        });

        it('should display PolygonScan link during processing', async () => {
            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockTokenContract = {
                allowance: jest.fn().mockResolvedValue(ethers.parseUnits('100', 6))
            };

            const mockEscrowContract = {
                createOrder: jest.fn().mockResolvedValue({
                    hash: '0xtx123',
                    wait: jest.fn().mockImplementation(() => new Promise(() => { }))
                })
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (ethers.Contract as jest.Mock)
                .mockReturnValueOnce(mockTokenContract)
                .mockReturnValueOnce(mockEscrowContract);
            (ethers.parseUnits as jest.Mock).mockReturnValue(10000000n);

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                const link = screen.getByText(/View on PolygonScan/i);
                expect(link).toHaveAttribute('href', 'https://polygonscan.com/tx/0xtx123');
            });
        });
    });

    describe('Token Selection', () => {
        it('should allow token selection', async () => {
            const multipleTokens = [
                ...mockTokens,
                {
                    symbol: 'USDT',
                    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                    decimals: 6,
                    network: 'Polygon'
                }
            ];

            mockApi.get.mockImplementation((url: string) => {
                if (url === '/crypto/tokens') {
                    return Promise.resolve({ data: { tokens: multipleTokens } });
                }
                return Promise.resolve({ data: { balance: '100.50' } });
            });

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(screen.getByText('USDC')).toBeInTheDocument();
                expect(screen.getByText('USDT')).toBeInTheDocument();
            });
        });

        it('should update balance when token changes', async () => {
            const multipleTokens = [
                ...mockTokens,
                {
                    symbol: 'USDT',
                    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
                    decimals: 6,
                    network: 'Polygon'
                }
            ];

            mockApi.get.mockImplementation((url: string) => {
                if (url === '/crypto/tokens') {
                    return Promise.resolve({ data: { tokens: multipleTokens } });
                }
                if (url.includes('/USDT')) {
                    return Promise.resolve({ data: { balance: '50.25', token: 'USDT' } });
                }
                return Promise.resolve({ data: { balance: '100.50', token: 'USDC' } });
            });

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const usdtButton = screen.getByRole('button', { name: /USDT/i });
                fireEvent.click(usdtButton);
            });

            await waitFor(() => {
                expect(mockApi.get).toHaveBeenCalledWith(
                    expect.stringContaining('/USDT')
                );
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors when fetching tokens', async () => {
            mockApi.get.mockRejectedValue(new Error('API Error'));

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                expect(mockProps.onError).toHaveBeenCalledWith('Failed to load payment options');
            });
        });

        it('should handle missing escrow contract address', async () => {
            delete process.env.REACT_APP_ESCROW_CONTRACT_ADDRESS;

            const mockSigner = {
                getAddress: jest.fn().mockResolvedValue(mockProps.walletAddress)
            };

            const mockProvider = {
                getSigner: jest.fn().mockResolvedValue(mockSigner)
            };

            (ethers.BrowserProvider as jest.Mock).mockReturnValue(mockProvider);
            (window as any).ethereum = {};

            render(<CryptoPayment {...mockProps} />);

            await waitFor(() => {
                const payButton = screen.getByRole('button', { name: /Pay 10 USDC/i });
                fireEvent.click(payButton);
            });

            await waitFor(() => {
                expect(mockProps.onError).toHaveBeenCalledWith('Escrow contract address not configured');
            });
        });
    });
});
