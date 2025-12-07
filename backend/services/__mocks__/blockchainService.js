/**
 * Mock Blockchain Service for Unit Tests
 * Provides fake blockchain responses without real network calls
 */

const mockGetNetworkInfo = jest.fn().mockResolvedValue({
    chainId: 80001,
    name: 'Mumbai Testnet',
    rpcUrl: 'https://rpc-mumbai.maticvigil.com',
    blockNumber: 12345678
});

const mockGetBalance = jest.fn().mockResolvedValue('100.500000');

const mockGetSupportedTokens = jest.fn().mockReturnValue([
    {
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
        decimals: 6,
        network: 'Polygon Mumbai'
    },
    {
        symbol: 'USDT',
        name: 'Tether USD',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 6,
        network: 'Polygon Mumbai'
    }
]);

const mockGetToken = jest.fn().mockImplementation((symbol) => {
    const tokens = mockGetSupportedTokens();
    return tokens.find(t => t.symbol === symbol) || null;
});

const mockGetTokenContract = jest.fn().mockReturnValue({
    balanceOf: jest.fn().mockResolvedValue('100500000'), // 100.5 USDC
    transfer: jest.fn().mockResolvedValue({ hash: '0xmocktransferhash' })
});

const mockGetOrderDetails = jest.fn().mockResolvedValue({
    orderId: 'test-order-1',
    customer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    driver: '0x0000000000000000000000000000000000000000',
    amount: '50.000000',
    token: '0x0FA8781a83E46826621b3BC094Ea2A0212e71B23',
    status: 'pending',
    createdAt: Date.now()
});

const mockCompleteOrder = jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xmocktxhash1234567890abcdef',
    blockNumber: 12345679,
    driverAmount: '42.50',
    platformFee: '7.50',
    gasUsed: '150000'
});

const mockRefundOrder = jest.fn().mockResolvedValue({
    success: true,
    txHash: '0xmockrefundtxhash',
    blockNumber: 12345680,
    amount: '50.00'
});

const mockGetDriverEarnings = jest.fn().mockResolvedValue({
    totalEarnings: '150.50',
    transactions: []
});

const mockVerifyTransaction = jest.fn().mockResolvedValue({
    success: true,
    confirmed: true,
    blockNumber: 12345681,
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    to: '0xD75CD1480698576bD7c7A813207Af20a78775142',
    value: '50000000' // 50 USDC (6 decimals)
});

module.exports = {
    getNetworkInfo: mockGetNetworkInfo,
    getBalance: mockGetBalance,
    getSupportedTokens: mockGetSupportedTokens,
    getToken: mockGetToken,
    getTokenContract: mockGetTokenContract,
    getOrderDetails: mockGetOrderDetails,
    completeOrder: mockCompleteOrder,
    refundOrder: mockRefundOrder,
    getDriverEarnings: mockGetDriverEarnings,
    verifyTransaction: mockVerifyTransaction,

    // Reset all mocks (useful in beforeEach)
    resetMocks: () => {
        mockGetNetworkInfo.mockClear();
        mockGetBalance.mockClear();
        mockGetSupportedTokens.mockClear();
        mockGetToken.mockClear();
        mockGetTokenContract.mockClear();
        mockGetOrderDetails.mockClear();
        mockCompleteOrder.mockClear();
        mockRefundOrder.mockClear();
        mockGetDriverEarnings.mockClear();
        mockVerifyTransaction.mockClear();
    }
};
