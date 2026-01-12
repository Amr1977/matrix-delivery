/**
 * Property-Based Tests for TopupService
 * 
 * Feature: egypt-payment-production
 * Tests Properties 1-5 and 11 from the design document
 */

const fc = require('fast-check');

// Mock the database pool before requiring the service
const mockPool = {
  query: jest.fn(),
  connect: jest.fn()
};

const mockClient = {
  query: jest.fn(),
  release: jest.fn()
};

jest.mock('../../../backend/config/db', () => mockPool);
jest.mock('../../../backend/config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { 
  TopupService, 
  VALID_PAYMENT_METHODS, 
  MIN_TOPUP_AMOUNT, 
  MAX_TOPUP_AMOUNT 
} = require('../../../backend/services/topupService');

describe('TopupService Property Tests', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect.mockResolvedValue(mockClient);
    service = new TopupService(mockPool);
  });

  /**
   * Property 1: Amount Validation
   * Validates: Requirements 1.6, 1.7, 2.5, 2.6
   * 
   * For any top-up request with amount < 10 EGP or amount > 10000 EGP, 
   * the system SHALL reject the request with a validation error.
   */
  describe('Property 1: Amount Validation', () => {
    test('should reject amounts below minimum (< 10 EGP)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: -10000, max: MIN_TOPUP_AMOUNT - 0.01, noNaN: true }),
          async (amount) => {
            const validation = service.validateAmount(amount);
            
            // Property: Amounts below minimum should be invalid
            expect(validation.valid).toBe(false);
            expect(validation.error).toContain('Minimum');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject amounts above maximum (> 10000 EGP)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: MAX_TOPUP_AMOUNT + 0.01, max: 1000000, noNaN: true }),
          async (amount) => {
            const validation = service.validateAmount(amount);
            
            // Property: Amounts above maximum should be invalid
            expect(validation.valid).toBe(false);
            expect(validation.error).toContain('Maximum');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should accept valid amounts (10-10000 EGP)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          async (amount) => {
            const validation = service.validateAmount(amount);
            
            // Property: Valid amounts should be accepted
            expect(validation.valid).toBe(true);
            expect(validation.error).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should reject non-numeric amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string(),
            fc.constant(null),
            fc.constant(undefined),
            fc.constant(NaN)
          ),
          async (amount) => {
            const validation = service.validateAmount(amount);
            
            // Property: Non-numeric amounts should be invalid
            expect(validation.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('createTopup should reject invalid amounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.double({ min: -10000, max: MIN_TOPUP_AMOUNT - 0.01, noNaN: true }),
            fc.double({ min: MAX_TOPUP_AMOUNT + 0.01, max: 1000000, noNaN: true })
          ),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          fc.string({ minLength: 5, maxLength: 50 }),
          async (amount, paymentMethod, reference) => {
            // Mock no duplicate found
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            await expect(service.createTopup({
              userId: 'user-123',
              amount,
              paymentMethod,
              transactionReference: reference,
              platformWalletId: 1
            })).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 2: Duplicate Reference Detection
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   * 
   * For any transaction reference that already exists for the same payment method, 
   * submitting a new top-up request with that reference SHALL be rejected.
   */
  describe('Property 2: Duplicate Reference Detection', () => {
    // Generate non-whitespace reference strings
    const validReferenceArb = fc.string({ minLength: 5, maxLength: 50 })
      .filter(s => s.trim().length >= 5);

    test('should detect and reject duplicate references for same payment method', async () => {
      await fc.assert(
        fc.asyncProperty(
          validReferenceArb,
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          async (reference, paymentMethod, amount) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            // Mock existing topup found
            const existingTopup = {
              id: 1,
              user_id: 'user-456',
              amount: 100,
              payment_method: paymentMethod,
              transaction_reference: reference,
              status: 'pending'
            };
            mockPool.query.mockResolvedValueOnce({ rows: [existingTopup] });

            // Property: Duplicate reference should be rejected
            try {
              await service.createTopup({
                userId: 'user-123',
                amount,
                paymentMethod,
                transactionReference: reference,
                platformWalletId: 1
              });
              // Should not reach here
              expect(true).toBe(false);
            } catch (error) {
              expect(error.message).toContain('already submitted');
              expect(error.code).toBe('DUPLICATE_REFERENCE');
              expect(error.existingTopup).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should allow same reference for different payment methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          validReferenceArb,
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          async (reference, amount) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            // Pick two different payment methods
            const method2 = VALID_PAYMENT_METHODS[1];

            // Mock no duplicate found for method2
            mockPool.query
              .mockResolvedValueOnce({ rows: [] }) // checkDuplicate returns nothing
              .mockResolvedValueOnce({ 
                rows: [{
                  id: 1,
                  user_id: 'user-123',
                  amount,
                  payment_method: method2,
                  transaction_reference: reference,
                  status: 'pending',
                  created_at: new Date(),
                  updated_at: new Date()
                }] 
              }); // insert returns the new topup

            // Property: Same reference with different payment method should be allowed
            const result = await service.createTopup({
              userId: 'user-123',
              amount,
              paymentMethod: method2,
              transactionReference: reference,
              platformWalletId: 1
            });

            expect(result).toBeDefined();
            expect(result.transaction_reference).toBe(reference);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('checkDuplicate should return existing topup when found', async () => {
      await fc.assert(
        fc.asyncProperty(
          validReferenceArb,
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (reference, paymentMethod) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            const existingTopup = {
              id: 1,
              user_id: 'user-456',
              amount: 100,
              payment_method: paymentMethod,
              transaction_reference: reference,
              status: 'verified'
            };
            mockPool.query.mockResolvedValueOnce({ rows: [existingTopup] });

            const result = await service.checkDuplicate(reference, paymentMethod);

            // Property: Should return the existing topup
            expect(result).not.toBeNull();
            expect(result.transaction_reference).toBe(reference);
            expect(result.payment_method).toBe(paymentMethod);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('checkDuplicate should return null when no duplicate exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          validReferenceArb,
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (reference, paymentMethod) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            const result = await service.checkDuplicate(reference, paymentMethod);

            // Property: Should return null when no duplicate
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 3: Pending Record Creation
   * Validates: Requirements 1.5, 2.4
   * 
   * For any valid top-up submission (valid amount, unique reference), 
   * the system SHALL create a record with status='pending'.
   */
  describe('Property 3: Pending Record Creation', () => {
    // Generate non-whitespace strings
    const validUserIdArb = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length >= 1);
    const validReferenceArb = fc.string({ minLength: 5, maxLength: 50 })
      .filter(s => s.trim().length >= 5);

    test('valid topup should create record with pending status', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUserIdArb,
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          validReferenceArb,
          fc.integer({ min: 1, max: 100 }),
          async (userId, amount, paymentMethod, reference, walletId) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            // Mock no duplicate found
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            // Mock successful insert
            const createdTopup = {
              id: 1,
              user_id: userId,
              amount,
              payment_method: paymentMethod,
              transaction_reference: reference,
              platform_wallet_id: walletId,
              status: 'pending',
              rejection_reason: null,
              verified_by: null,
              verified_at: null,
              created_at: new Date(),
              updated_at: new Date()
            };
            mockPool.query.mockResolvedValueOnce({ rows: [createdTopup] });

            const result = await service.createTopup({
              userId,
              amount,
              paymentMethod,
              transactionReference: reference,
              platformWalletId: walletId
            });

            // Property: Created record should have pending status
            expect(result.status).toBe('pending');
            
            // Property: All submitted details should be preserved
            expect(result.user_id).toBe(userId);
            expect(result.amount).toBe(amount);
            expect(result.payment_method).toBe(paymentMethod);
            expect(result.transaction_reference).toBe(reference);
            expect(result.platform_wallet_id).toBe(walletId);
            
            // Property: Verification fields should be null
            expect(result.verified_by).toBeNull();
            expect(result.verified_at).toBeNull();
            expect(result.rejection_reason).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('created topup should have timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (amount, paymentMethod) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            const now = new Date();
            
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            mockPool.query.mockResolvedValueOnce({ 
              rows: [{
                id: 1,
                user_id: 'user-123',
                amount,
                payment_method: paymentMethod,
                transaction_reference: 'REF123456',
                status: 'pending',
                created_at: now,
                updated_at: now
              }] 
            });

            const result = await service.createTopup({
              userId: 'user-123',
              amount,
              paymentMethod,
              transactionReference: 'REF123456',
              platformWalletId: 1
            });

            // Property: Timestamps should be set
            expect(result.created_at).toBeDefined();
            expect(result.updated_at).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 4: Verification Credits Balance
   * Validates: Requirements 4.3
   * 
   * For any pending top-up that is verified by an admin, 
   * the user's available_balance SHALL increase by exactly the top-up amount.
   */
  describe('Property 4: Verification Credits Balance', () => {
    test('verifying topup should credit exact amount to user balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (topupId, amount, paymentMethod) => {
            const userId = 'user-123';
            const adminId = 'admin-456';
            const initialBalance = 500;
            
            // Setup mock balance service
            const mockBalanceService = {
              deposit: jest.fn().mockResolvedValue({
                availableBalance: initialBalance + amount
              })
            };
            service.setBalanceService(mockBalanceService);

            // Mock client for transaction
            mockClient.query
              .mockResolvedValueOnce({}) // BEGIN
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: paymentMethod,
                  transaction_reference: 'REF123',
                  status: 'pending'
                }] 
              }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: paymentMethod,
                  transaction_reference: 'REF123',
                  status: 'verified',
                  verified_by: adminId,
                  verified_at: new Date()
                }] 
              }) // UPDATE
              .mockResolvedValueOnce({}) // INSERT audit log
              .mockResolvedValueOnce({}); // COMMIT

            const result = await service.verifyTopup(topupId, adminId);

            // Property: Balance service should be called with exact amount
            expect(mockBalanceService.deposit).toHaveBeenCalledWith(
              expect.objectContaining({
                userId,
                amount
              })
            );

            // Property: New balance should be initial + amount
            expect(result.newBalance).toBe(initialBalance + amount);
            
            // Property: Topup status should be verified
            expect(result.topup.status).toBe('verified');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 5: Rejection Requires Reason
   * Validates: Requirements 4.4
   * 
   * For any top-up rejection action, the system SHALL require a non-empty rejection reason string.
   */
  describe('Property 5: Rejection Requires Reason', () => {
    test('should reject rejection without reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant(null),
            fc.constant(undefined)
          ),
          async (topupId, emptyReason) => {
            // Property: Empty reason should throw error
            await expect(
              service.rejectTopup(topupId, 'admin-123', emptyReason)
            ).rejects.toThrow('Rejection reason is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should accept rejection with valid reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (topupId, reason) => {
            const adminId = 'admin-456';
            
            // Mock client for transaction
            mockClient.query
              .mockResolvedValueOnce({}) // BEGIN
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: 'user-123',
                  amount: 100,
                  payment_method: 'vodafone_cash',
                  transaction_reference: 'REF123',
                  status: 'pending'
                }] 
              }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: 'user-123',
                  amount: 100,
                  payment_method: 'vodafone_cash',
                  transaction_reference: 'REF123',
                  status: 'rejected',
                  rejection_reason: reason.trim(),
                  verified_by: adminId,
                  verified_at: new Date()
                }] 
              }) // UPDATE
              .mockResolvedValueOnce({}) // INSERT audit log
              .mockResolvedValueOnce({}); // COMMIT

            const result = await service.rejectTopup(topupId, adminId, reason);

            // Property: Rejection should succeed with valid reason
            expect(result.status).toBe('rejected');
            expect(result.rejection_reason).toBe(reason.trim());
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 11: Audit Logging
   * Validates: Requirements 4.7
   * 
   * For any admin verification or rejection action, 
   * the system SHALL create an audit log entry with admin_id, action, and timestamp.
   */
  describe('Property 11: Audit Logging', () => {
    test('verification should create audit log with correct data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.option(fc.ipV4(), { nil: null }),
          async (topupId, adminId, ipAddress) => {
            const mockBalanceService = {
              deposit: jest.fn().mockResolvedValue({ availableBalance: 600 })
            };
            service.setBalanceService(mockBalanceService);

            let auditLogInserted = false;
            let auditLogData = null;

            mockClient.query.mockImplementation((query, params) => {
              if (query.includes('BEGIN')) return Promise.resolve({});
              if (query.includes('SELECT') && query.includes('FOR UPDATE')) {
                return Promise.resolve({ 
                  rows: [{
                    id: topupId,
                    user_id: 'user-123',
                    amount: 100,
                    payment_method: 'vodafone_cash',
                    transaction_reference: 'REF123',
                    status: 'pending'
                  }] 
                });
              }
              if (query.includes('UPDATE topups')) {
                return Promise.resolve({ 
                  rows: [{
                    id: topupId,
                    user_id: 'user-123',
                    amount: 100,
                    payment_method: 'vodafone_cash',
                    transaction_reference: 'REF123',
                    status: 'verified',
                    verified_by: adminId,
                    verified_at: new Date()
                  }] 
                });
              }
              if (query.includes('INSERT INTO topup_audit_logs')) {
                auditLogInserted = true;
                auditLogData = {
                  topup_id: params[0],
                  admin_id: params[1],
                  action: params[2],
                  details: params[3],
                  ip_address: params[4]
                };
                return Promise.resolve({});
              }
              if (query.includes('COMMIT')) return Promise.resolve({});
              return Promise.resolve({ rows: [] });
            });

            await service.verifyTopup(topupId, adminId, ipAddress);

            // Property: Audit log should be created
            expect(auditLogInserted).toBe(true);
            
            // Property: Audit log should contain correct data
            expect(auditLogData.topup_id).toBe(topupId);
            expect(auditLogData.admin_id).toBe(adminId);
            expect(auditLogData.action).toBe('verify');
            expect(auditLogData.ip_address).toBe(ipAddress);
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rejection should create audit log with reason in details', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (topupId, adminId, reason) => {
            let auditLogData = null;

            mockClient.query.mockImplementation((query, params) => {
              if (query.includes('BEGIN')) return Promise.resolve({});
              if (query.includes('SELECT') && query.includes('FOR UPDATE')) {
                return Promise.resolve({ 
                  rows: [{
                    id: topupId,
                    user_id: 'user-123',
                    amount: 100,
                    payment_method: 'vodafone_cash',
                    transaction_reference: 'REF123',
                    status: 'pending'
                  }] 
                });
              }
              if (query.includes('UPDATE topups')) {
                return Promise.resolve({ 
                  rows: [{
                    id: topupId,
                    user_id: 'user-123',
                    amount: 100,
                    payment_method: 'vodafone_cash',
                    transaction_reference: 'REF123',
                    status: 'rejected',
                    rejection_reason: reason.trim(),
                    verified_by: adminId,
                    verified_at: new Date()
                  }] 
                });
              }
              if (query.includes('INSERT INTO topup_audit_logs')) {
                auditLogData = {
                  topup_id: params[0],
                  admin_id: params[1],
                  action: params[2],
                  details: JSON.parse(params[3]),
                  ip_address: params[4]
                };
                return Promise.resolve({});
              }
              if (query.includes('COMMIT')) return Promise.resolve({});
              return Promise.resolve({ rows: [] });
            });

            await service.rejectTopup(topupId, adminId, reason);

            // Property: Audit log should contain rejection action
            expect(auditLogData.action).toBe('reject');
            
            // Property: Audit log details should contain reason
            expect(auditLogData.details.reason).toBe(reason.trim());
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 6: Admin Notification on Creation
   * Validates: Requirements 1.9, 2.8
   * 
   * For any successfully created top-up request, 
   * the system SHALL dispatch a notification to administrators.
   */
  describe('Property 6: Admin Notification on Creation', () => {
    // Generate non-whitespace strings
    const validUserIdArb = fc.string({ minLength: 1, maxLength: 50 })
      .filter(s => s.trim().length >= 1);
    const validReferenceArb = fc.string({ minLength: 5, maxLength: 50 })
      .filter(s => s.trim().length >= 5);

    test('creating topup should notify all active admins', async () => {
      await fc.assert(
        fc.asyncProperty(
          validUserIdArb,
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          validReferenceArb,
          fc.integer({ min: 1, max: 10 }), // Number of admins
          async (userId, amount, paymentMethod, reference, adminCount) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            // Generate admin IDs
            const admins = Array.from({ length: adminCount }, (_, i) => ({ id: `admin-${i + 1}` }));
            
            // Track notifications sent
            const notificationsSent = [];
            const mockNotificationService = {
              createNotification: jest.fn().mockImplementation((params) => {
                notificationsSent.push(params);
                return Promise.resolve({ id: notificationsSent.length });
              })
            };
            
            service.setNotificationService(mockNotificationService);

            // Mock no duplicate found
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            // Mock successful insert
            const createdTopup = {
              id: 1,
              user_id: userId,
              amount,
              payment_method: paymentMethod,
              transaction_reference: reference,
              platform_wallet_id: 1,
              status: 'pending',
              created_at: new Date(),
              updated_at: new Date()
            };
            mockPool.query.mockResolvedValueOnce({ rows: [createdTopup] });
            
            // Mock admin query
            mockPool.query.mockResolvedValueOnce({ rows: admins });

            await service.createTopup({
              userId,
              amount,
              paymentMethod,
              transactionReference: reference,
              platformWalletId: 1
            });

            // Wait for async notification to complete
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: Notification service should be called for each admin
            expect(mockNotificationService.createNotification).toHaveBeenCalledTimes(adminCount);
            
            // Property: Each notification should be sent to an admin
            const notifiedAdminIds = notificationsSent.map(n => n.userId);
            admins.forEach(admin => {
              expect(notifiedAdminIds).toContain(admin.id);
            });
            
            // Property: Notification should contain topup info
            notificationsSent.forEach(notification => {
              expect(notification.type).toBe('topup_pending');
              expect(notification.title).toContain('Top-Up');
              expect(notification.message).toContain(paymentMethod);
              expect(notification.message).toContain(String(amount));
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    test('notification should include payment method and amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (amount, paymentMethod) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            let capturedNotification = null;
            const mockNotificationService = {
              createNotification: jest.fn().mockImplementation((params) => {
                capturedNotification = params;
                return Promise.resolve({ id: 1 });
              })
            };
            
            service.setNotificationService(mockNotificationService);

            // Mock no duplicate found
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            // Mock successful insert
            mockPool.query.mockResolvedValueOnce({ 
              rows: [{
                id: 1,
                user_id: 'user-123',
                amount,
                payment_method: paymentMethod,
                transaction_reference: 'REF123456',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date()
              }] 
            });
            
            // Mock single admin
            mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'admin-1' }] });

            await service.createTopup({
              userId: 'user-123',
              amount,
              paymentMethod,
              transactionReference: 'REF123456',
              platformWalletId: 1
            });

            // Wait for async notification
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: Notification message should contain amount and payment method
            expect(capturedNotification).not.toBeNull();
            expect(capturedNotification.message).toContain(paymentMethod);
            expect(capturedNotification.message).toContain(String(amount));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should handle no admins gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          async (amount, paymentMethod) => {
            // Reset mocks for each iteration
            mockPool.query.mockReset();
            
            const mockNotificationService = {
              createNotification: jest.fn().mockResolvedValue({ id: 1 })
            };
            
            service.setNotificationService(mockNotificationService);

            // Mock no duplicate found
            mockPool.query.mockResolvedValueOnce({ rows: [] });
            
            // Mock successful insert
            mockPool.query.mockResolvedValueOnce({ 
              rows: [{
                id: 1,
                user_id: 'user-123',
                amount,
                payment_method: paymentMethod,
                transaction_reference: 'REF123456',
                status: 'pending',
                created_at: new Date(),
                updated_at: new Date()
              }] 
            });
            
            // Mock no admins
            mockPool.query.mockResolvedValueOnce({ rows: [] });

            // Should not throw even with no admins
            const result = await service.createTopup({
              userId: 'user-123',
              amount,
              paymentMethod,
              transactionReference: 'REF123456',
              platformWalletId: 1
            });

            // Wait for async notification
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: Topup should still be created
            expect(result).toBeDefined();
            expect(result.status).toBe('pending');
            
            // Property: No notifications should be sent
            expect(mockNotificationService.createNotification).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 7: User Notification on Status Change
   * Validates: Requirements 4.5, 7.2, 7.3
   * 
   * For any top-up status change (pending → verified OR pending → rejected), 
   * the system SHALL dispatch a notification to the user.
   */
  describe('Property 7: User Notification on Status Change', () => {
    test('verification should notify user with new balance', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          fc.double({ min: 0, max: 100000, noNaN: true }), // Initial balance
          async (topupId, amount, paymentMethod, initialBalance) => {
            const userId = 'user-123';
            const adminId = 'admin-456';
            const newBalance = initialBalance + amount;
            
            // Track notification sent
            let capturedNotification = null;
            const mockNotificationService = {
              createNotification: jest.fn().mockImplementation((params) => {
                capturedNotification = params;
                return Promise.resolve({ id: 1 });
              })
            };
            
            const mockBalanceService = {
              deposit: jest.fn().mockResolvedValue({
                availableBalance: newBalance
              })
            };
            
            service.setNotificationService(mockNotificationService);
            service.setBalanceService(mockBalanceService);

            // Mock client for transaction
            mockClient.query
              .mockResolvedValueOnce({}) // BEGIN
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: paymentMethod,
                  transaction_reference: 'REF123',
                  status: 'pending'
                }] 
              }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: paymentMethod,
                  transaction_reference: 'REF123',
                  status: 'verified',
                  verified_by: adminId,
                  verified_at: new Date()
                }] 
              }) // UPDATE
              .mockResolvedValueOnce({}) // INSERT audit log
              .mockResolvedValueOnce({}); // COMMIT

            await service.verifyTopup(topupId, adminId);

            // Wait for async notification
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: User should be notified
            expect(mockNotificationService.createNotification).toHaveBeenCalled();
            expect(capturedNotification).not.toBeNull();
            
            // Property: Notification should be sent to the correct user
            expect(capturedNotification.userId).toBe(userId);
            
            // Property: Notification should indicate success
            expect(capturedNotification.type).toBe('topup_verified');
            expect(capturedNotification.title).toContain('Successful');
            
            // Property: Notification should include new balance
            expect(capturedNotification.message).toContain(String(newBalance));
          }
        ),
        { numRuns: 100 }
      );
    });

    test('rejection should notify user with reason', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }),
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom(...VALID_PAYMENT_METHODS),
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          async (topupId, amount, paymentMethod, reason) => {
            const userId = 'user-123';
            const adminId = 'admin-456';
            
            // Track notification sent
            let capturedNotification = null;
            const mockNotificationService = {
              createNotification: jest.fn().mockImplementation((params) => {
                capturedNotification = params;
                return Promise.resolve({ id: 1 });
              })
            };
            
            service.setNotificationService(mockNotificationService);

            // Mock client for transaction
            mockClient.query
              .mockResolvedValueOnce({}) // BEGIN
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: paymentMethod,
                  transaction_reference: 'REF123',
                  status: 'pending'
                }] 
              }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: paymentMethod,
                  transaction_reference: 'REF123',
                  status: 'rejected',
                  rejection_reason: reason.trim(),
                  verified_by: adminId,
                  verified_at: new Date()
                }] 
              }) // UPDATE
              .mockResolvedValueOnce({}) // INSERT audit log
              .mockResolvedValueOnce({}); // COMMIT

            await service.rejectTopup(topupId, adminId, reason);

            // Wait for async notification
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: User should be notified
            expect(mockNotificationService.createNotification).toHaveBeenCalled();
            expect(capturedNotification).not.toBeNull();
            
            // Property: Notification should be sent to the correct user
            expect(capturedNotification.userId).toBe(userId);
            
            // Property: Notification should indicate rejection
            expect(capturedNotification.type).toBe('topup_rejected');
            expect(capturedNotification.title).toContain('Rejected');
            
            // Property: Notification should include rejection reason
            expect(capturedNotification.message).toContain(reason.trim());
          }
        ),
        { numRuns: 100 }
      );
    });

    test('notification should include amount in message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.double({ min: MIN_TOPUP_AMOUNT, max: MAX_TOPUP_AMOUNT, noNaN: true }),
          fc.constantFrom('verified', 'rejected'),
          async (amount, status) => {
            const topupId = 1;
            const userId = 'user-123';
            const adminId = 'admin-456';
            
            // Track notification sent
            let capturedNotification = null;
            const mockNotificationService = {
              createNotification: jest.fn().mockImplementation((params) => {
                capturedNotification = params;
                return Promise.resolve({ id: 1 });
              })
            };
            
            const mockBalanceService = {
              deposit: jest.fn().mockResolvedValue({
                availableBalance: 1000
              })
            };
            
            service.setNotificationService(mockNotificationService);
            service.setBalanceService(mockBalanceService);

            // Mock client for transaction
            mockClient.query
              .mockResolvedValueOnce({}) // BEGIN
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: 'vodafone_cash',
                  transaction_reference: 'REF123',
                  status: 'pending'
                }] 
              }) // SELECT FOR UPDATE
              .mockResolvedValueOnce({ 
                rows: [{
                  id: topupId,
                  user_id: userId,
                  amount,
                  payment_method: 'vodafone_cash',
                  transaction_reference: 'REF123',
                  status,
                  rejection_reason: status === 'rejected' ? 'Test reason' : null,
                  verified_by: adminId,
                  verified_at: new Date()
                }] 
              }) // UPDATE
              .mockResolvedValueOnce({}) // INSERT audit log
              .mockResolvedValueOnce({}); // COMMIT

            if (status === 'verified') {
              await service.verifyTopup(topupId, adminId);
            } else {
              await service.rejectTopup(topupId, adminId, 'Test reason');
            }

            // Wait for async notification
            await new Promise(resolve => setTimeout(resolve, 50));

            // Property: Notification message should include amount
            expect(capturedNotification).not.toBeNull();
            expect(capturedNotification.message).toContain(String(amount));
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});