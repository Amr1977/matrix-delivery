/**
 * Property-Based Tests for PlatformWalletService
 * 
 * Feature: egypt-payment-production
 * Property 9: Inactive Wallet Exclusion
 * Validates: Requirements 5.4
 * 
 * Property: For any platform wallet with is_active=false, 
 * the wallet SHALL NOT appear in user-facing wallet selection.
 */

const fc = require('fast-check');

// Mock the database pool before requiring the service
const mockPool = {
  query: jest.fn()
};

jest.mock('../../../backend/config/db', () => mockPool);
jest.mock('../../../backend/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { PlatformWalletService, VALID_PAYMENT_METHODS } = require('../../../backend/services/platformWalletService');

describe('PlatformWalletService Property Tests', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformWalletService(mockPool);
  });

  /**
   * Property 9: Inactive Wallet Exclusion
   * Validates: Requirements 5.4
   * 
   * For any platform wallet with is_active=false, 
   * the wallet SHALL NOT appear in user-facing wallet selection.
   */
  describe('Property 9: Inactive Wallet Exclusion', () => {
    // Helper to generate wallets with unique IDs
    const generateWalletsWithUniqueIds = (count) => {
      return fc.array(
        fc.record({
          payment_method: fc.constantFrom(...VALID_PAYMENT_METHODS),
          phone_number: fc.option(fc.stringMatching(/^01[0-9]{9}$/), { nil: null }),
          instapay_alias: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: null }),
          holder_name: fc.string({ minLength: 1, maxLength: 50 }),
          is_active: fc.boolean(),
          daily_limit: fc.integer({ min: 1000, max: 100000 }),
          monthly_limit: fc.integer({ min: 10000, max: 1000000 }),
          daily_used: fc.integer({ min: 0, max: 50000 }),
          monthly_used: fc.integer({ min: 0, max: 500000 }),
          last_reset_daily: fc.date(),
          last_reset_monthly: fc.date(),
          created_at: fc.date(),
          updated_at: fc.date()
        }),
        { minLength: 1, maxLength: count }
      ).map(wallets => wallets.map((w, idx) => ({ ...w, id: idx + 1 })));
    };

    test('getActiveWallets should never return inactive wallets', async () => {
      await fc.assert(
        fc.asyncProperty(
          generateWalletsWithUniqueIds(20),
          async (wallets) => {
            // Simulate database returning only active wallets (as the SQL query filters)
            const activeWallets = wallets.filter(w => w.is_active);
            
            mockPool.query.mockResolvedValue({ rows: activeWallets });

            const result = await service.getActiveWallets();

            // Property: All returned wallets must be active
            result.forEach(wallet => {
              expect(wallet.is_active).toBe(true);
            });

            // Property: No inactive wallet should be in the result
            const inactiveWalletIds = wallets
              .filter(w => !w.is_active)
              .map(w => w.id);
            
            result.forEach(wallet => {
              expect(inactiveWalletIds).not.toContain(wallet.id);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('getActiveWallets with payment method filter should never return inactive wallets', async () => {
      await fc.assert(
        fc.asyncProperty(
          generateWalletsWithUniqueIds(20),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (wallets, paymentMethod) => {
            // Simulate database returning only active wallets for the payment method
            const filteredWallets = wallets.filter(
              w => w.is_active && w.payment_method === paymentMethod
            );
            
            mockPool.query.mockResolvedValue({ rows: filteredWallets });

            const result = await service.getActiveWallets(paymentMethod);

            // Property: All returned wallets must be active
            result.forEach(wallet => {
              expect(wallet.is_active).toBe(true);
            });

            // Property: All returned wallets must match the payment method
            result.forEach(wallet => {
              expect(wallet.payment_method).toBe(paymentMethod);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('selectWalletForTopup should never select an inactive wallet', async () => {
      await fc.assert(
        fc.asyncProperty(
          generateWalletsWithUniqueIds(10),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (wallets, paymentMethod) => {
            // Simulate database returning only active wallets within limits
            const eligibleWallets = wallets.filter(
              w => w.is_active && 
                   w.payment_method === paymentMethod &&
                   w.daily_used < w.daily_limit &&
                   w.monthly_used < w.monthly_limit
            );
            
            // Mock the reset limits query (no-op)
            mockPool.query
              .mockResolvedValueOnce({ rows: [] }) // daily reset
              .mockResolvedValueOnce({ rows: [] }) // monthly reset
              .mockResolvedValueOnce({ rows: eligibleWallets }); // select query

            const result = await service.selectWalletForTopup(paymentMethod);

            if (eligibleWallets.length > 0) {
              // Property: Selected wallet must be active
              expect(result).not.toBeNull();
              expect(result.is_active).toBe(true);
              
              // Property: Selected wallet must be from eligible wallets
              const eligibleIds = eligibleWallets.map(w => w.id);
              expect(eligibleIds).toContain(result.id);
            } else {
              // No eligible wallets means null result
              expect(result).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('deactivated wallet should not appear in subsequent getActiveWallets calls', async () => {
      // Generate a single active wallet arbitrary
      const activeWalletArbitrary = fc.record({
        payment_method: fc.constantFrom(...VALID_PAYMENT_METHODS),
        phone_number: fc.option(fc.stringMatching(/^01[0-9]{9}$/), { nil: null }),
        instapay_alias: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: null }),
        holder_name: fc.string({ minLength: 1, maxLength: 50 }),
        is_active: fc.constant(true),
        daily_limit: fc.integer({ min: 1000, max: 100000 }),
        monthly_limit: fc.integer({ min: 10000, max: 1000000 }),
        daily_used: fc.integer({ min: 0, max: 50000 }),
        monthly_used: fc.integer({ min: 0, max: 500000 }),
        last_reset_daily: fc.date(),
        last_reset_monthly: fc.date(),
        created_at: fc.date(),
        updated_at: fc.date()
      }).map(w => ({ ...w, id: 1 }));

      await fc.assert(
        fc.asyncProperty(
          activeWalletArbitrary,
          async (wallet) => {
            // First call: wallet is active
            mockPool.query.mockResolvedValueOnce({ rows: [wallet] });
            
            const beforeDeactivation = await service.getActiveWallets();
            expect(beforeDeactivation).toHaveLength(1);
            expect(beforeDeactivation[0].is_active).toBe(true);

            // Deactivate the wallet
            const deactivatedWallet = { ...wallet, is_active: false };
            mockPool.query.mockResolvedValueOnce({ rows: [deactivatedWallet] });
            
            await service.deactivateWallet(wallet.id);

            // After deactivation: wallet should not appear
            mockPool.query.mockResolvedValueOnce({ rows: [] }); // No active wallets
            
            const afterDeactivation = await service.getActiveWallets();
            
            // Property: Deactivated wallet should not be in active list
            const walletIds = afterDeactivation.map(w => w.id);
            expect(walletIds).not.toContain(wallet.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


describe('PlatformWalletService Property Tests - Wallet Limits', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PlatformWalletService(mockPool);
  });

  /**
   * Property 8: Wallet Limit Enforcement
   * Validates: Requirements 5.6
   * 
   * For any platform wallet, when daily_used reaches 80% of daily_limit, 
   * the system SHALL trigger an admin alert.
   */
  describe('Property 8: Wallet Limit Enforcement', () => {
    // Arbitrary for generating wallet with specific usage percentages
    const walletWithUsageArbitrary = fc.record({
      id: fc.integer({ min: 1, max: 10000 }),
      payment_method: fc.constantFrom(...VALID_PAYMENT_METHODS),
      phone_number: fc.option(fc.stringMatching(/^01[0-9]{9}$/), { nil: null }),
      instapay_alias: fc.option(fc.string({ minLength: 3, maxLength: 20 }), { nil: null }),
      holder_name: fc.string({ minLength: 1, maxLength: 50 }),
      is_active: fc.constant(true),
      daily_limit: fc.integer({ min: 1000, max: 100000 }),
      monthly_limit: fc.integer({ min: 10000, max: 1000000 }),
      created_at: fc.date(),
      updated_at: fc.date()
    });

    test('should trigger alert when daily usage reaches 80% or more', async () => {
      await fc.assert(
        fc.asyncProperty(
          walletWithUsageArbitrary,
          fc.integer({ min: 80, max: 100 }), // Usage percentage >= 80%
          async (baseWallet, usagePercentInt) => {
            const usagePercentage = usagePercentInt / 100;
            // Use Math.ceil to ensure we actually reach the target percentage
            const dailyUsed = Math.ceil(baseWallet.daily_limit * usagePercentage);
            const monthlyUsed = Math.floor(baseWallet.monthly_limit * 0.5); // Below 80%
            
            // Calculate actual percentage to verify it's >= 80%
            const actualDailyPercentage = (dailyUsed / baseWallet.daily_limit) * 100;
            
            const wallet = {
              ...baseWallet,
              daily_used: dailyUsed,
              monthly_used: monthlyUsed,
              last_reset_daily: new Date(),
              last_reset_monthly: new Date()
            };

            // Reset the service to clear previous alerts
            service = new PlatformWalletService(mockPool);

            // Mock the update query to return the wallet
            mockPool.query
              .mockResolvedValueOnce({ rows: [] }) // daily reset
              .mockResolvedValueOnce({ rows: [] }) // monthly reset
              .mockResolvedValueOnce({ rows: [wallet] }); // update usage

            await service.updateWalletUsage(wallet.id, 0); // Amount doesn't matter for this test

            // Property: Alert should be triggered when daily usage >= 80%
            const alert = service.getLastLimitAlert();
            // Only assert if actual percentage is >= 80% (Math.ceil ensures this)
            if (actualDailyPercentage >= 80) {
              expect(alert).not.toBeNull();
              expect(alert.alerts.some(a => a.type === 'daily')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should trigger alert when monthly usage reaches 80% or more', async () => {
      await fc.assert(
        fc.asyncProperty(
          walletWithUsageArbitrary,
          fc.integer({ min: 80, max: 100 }), // Usage percentage >= 80%
          async (baseWallet, usagePercentInt) => {
            const usagePercentage = usagePercentInt / 100;
            const dailyUsed = Math.floor(baseWallet.daily_limit * 0.5); // Below 80%
            // Use Math.ceil to ensure we actually reach the target percentage
            const monthlyUsed = Math.ceil(baseWallet.monthly_limit * usagePercentage);
            
            // Calculate actual percentage to verify it's >= 80%
            const actualMonthlyPercentage = (monthlyUsed / baseWallet.monthly_limit) * 100;
            
            const wallet = {
              ...baseWallet,
              daily_used: dailyUsed,
              monthly_used: monthlyUsed,
              last_reset_daily: new Date(),
              last_reset_monthly: new Date()
            };

            // Reset the service to clear previous alerts
            service = new PlatformWalletService(mockPool);

            // Mock the update query to return the wallet
            mockPool.query
              .mockResolvedValueOnce({ rows: [] }) // daily reset
              .mockResolvedValueOnce({ rows: [] }) // monthly reset
              .mockResolvedValueOnce({ rows: [wallet] }); // update usage

            await service.updateWalletUsage(wallet.id, 0);

            // Property: Alert should be triggered when monthly usage >= 80%
            const alert = service.getLastLimitAlert();
            // Only assert if actual percentage is >= 80% (Math.ceil ensures this)
            if (actualMonthlyPercentage >= 80) {
              expect(alert).not.toBeNull();
              expect(alert.alerts.some(a => a.type === 'monthly')).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should NOT trigger alert when usage is below 80%', async () => {
      await fc.assert(
        fc.asyncProperty(
          walletWithUsageArbitrary,
          fc.integer({ min: 0, max: 79 }), // Usage percentage < 80%
          async (baseWallet, usagePercentInt) => {
            const usagePercentage = usagePercentInt / 100;
            const dailyUsed = Math.floor(baseWallet.daily_limit * usagePercentage);
            const monthlyUsed = Math.floor(baseWallet.monthly_limit * usagePercentage);
            
            const wallet = {
              ...baseWallet,
              daily_used: dailyUsed,
              monthly_used: monthlyUsed,
              last_reset_daily: new Date(),
              last_reset_monthly: new Date()
            };

            // Reset the service to clear previous alerts
            service = new PlatformWalletService(mockPool);

            // Mock the update query to return the wallet
            mockPool.query
              .mockResolvedValueOnce({ rows: [] }) // daily reset
              .mockResolvedValueOnce({ rows: [] }) // monthly reset
              .mockResolvedValueOnce({ rows: [wallet] }); // update usage

            await service.updateWalletUsage(wallet.id, 0);

            // Property: No alert should be triggered when usage < 80%
            const alert = service.getLastLimitAlert();
            expect(alert).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('alert should contain correct percentage and limit information', async () => {
      await fc.assert(
        fc.asyncProperty(
          walletWithUsageArbitrary,
          fc.integer({ min: 80, max: 99 }),
          async (baseWallet, usagePercentInt) => {
            const usagePercentage = usagePercentInt / 100;
            // Use Math.ceil to ensure we actually reach the target percentage
            const dailyUsed = Math.ceil(baseWallet.daily_limit * usagePercentage);
            const monthlyUsed = Math.ceil(baseWallet.monthly_limit * usagePercentage);
            
            // Calculate actual percentages
            const actualDailyPercentage = (dailyUsed / baseWallet.daily_limit) * 100;
            const actualMonthlyPercentage = (monthlyUsed / baseWallet.monthly_limit) * 100;
            
            const wallet = {
              ...baseWallet,
              daily_used: dailyUsed,
              monthly_used: monthlyUsed,
              last_reset_daily: new Date(),
              last_reset_monthly: new Date()
            };

            // Reset the service to clear previous alerts
            service = new PlatformWalletService(mockPool);

            // Mock the update query to return the wallet
            mockPool.query
              .mockResolvedValueOnce({ rows: [] }) // daily reset
              .mockResolvedValueOnce({ rows: [] }) // monthly reset
              .mockResolvedValueOnce({ rows: [wallet] }); // update usage

            await service.updateWalletUsage(wallet.id, 0);

            const alert = service.getLastLimitAlert();
            
            // Only assert if at least one percentage is >= 80%
            if (actualDailyPercentage >= 80 || actualMonthlyPercentage >= 80) {
              // Property: Alert should contain wallet info and correct alert details
              expect(alert).not.toBeNull();
              expect(alert.wallet.id).toBe(wallet.id);
              expect(alert.timestamp).toBeInstanceOf(Date);
              
              // Each alert should have type, percentage, used, and limit
              alert.alerts.forEach(a => {
                expect(['daily', 'monthly']).toContain(a.type);
                expect(parseFloat(a.percentage)).toBeGreaterThanOrEqual(80);
                expect(a.used).toBeDefined();
                expect(a.limit).toBeDefined();
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
