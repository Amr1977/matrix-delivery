/**
 * Mock for balance API service
 */

export const balanceApi = {
    getBalance: jest.fn(),
    deposit: jest.fn(),
    withdraw: jest.fn(),
    getTransactions: jest.fn(),
    generateStatement: jest.fn()
};
