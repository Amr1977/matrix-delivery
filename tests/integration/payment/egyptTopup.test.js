/**
 * Egypt Payment Top-Up Integration Tests
 * 
 * Tests the full top-up flow including:
 * - User submits top-up → admin verifies → balance updated
 * - User submits top-up → admin rejects → user notified
 * - Duplicate reference handling
 * 
 * Requirements: All Phase 1 (1.1-1.10, 2.1-2.9, 3.1-3.4, 4.1-4.8, 7.1-7.3)
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../../../backend/config/db');
const app = require('../../../backend/app');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-12345-very-long-secret-key-at-least-64-characters-long-for-security-validation-persistence-check';

describe('Egypt Payment Top-Up Integration Tests', () => {
  let customerId;
  let driverId;
  let adminId;
  let customerToken;
  let driverToken;
  let adminToken;
  let platformWalletId;
  let createdTopupIds = [];

  // Helper to generate JWT token
  const generateToken = (userId, role) => {
    return jwt.sign(
      { userId, role, primary_role: role },
      JWT_SECRET,
      { 
        expiresIn: '1h', 
        audience: 'matrix-delivery-api', 
        issuer: 'matrix-delivery' 
      }
    );
  };

  beforeAll(async () => {
    try {
      // Drop and recreate platform_wallets table to ensure correct schema
      await pool.query(`DROP TABLE IF EXISTS topup_audit_logs CASCADE`);
      await pool.query(`DROP TABLE IF EXISTS topups CASCADE`);
      await pool.query(`DROP TABLE IF EXISTS platform_wallets CASCADE`);

      // Create platform_wallets table
      await pool.query(`
        CREATE TABLE platform_wallets (
          id SERIAL PRIMARY KEY,
          payment_method VARCHAR(50) NOT NULL,
          phone_number VARCHAR(20),
          instapay_alias VARCHAR(100),
          holder_name VARCHAR(100) NOT NULL,
          is_active BOOLEAN DEFAULT true,
          daily_limit DECIMAL(20,2) DEFAULT 50000,
          monthly_limit DECIMAL(20,2) DEFAULT 500000,
          daily_used DECIMAL(20,2) DEFAULT 0,
          monthly_used DECIMAL(20,2) DEFAULT 0,
          last_reset_daily TIMESTAMPTZ DEFAULT NOW(),
          last_reset_monthly TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create topups table
      await pool.query(`
        CREATE TABLE topups (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          amount DECIMAL(20,2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          transaction_reference VARCHAR(100) NOT NULL,
          platform_wallet_id INTEGER REFERENCES platform_wallets(id),
          status VARCHAR(20) DEFAULT 'pending',
          rejection_reason TEXT,
          verified_by VARCHAR(255),
          verified_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          CONSTRAINT unique_reference_per_method UNIQUE (transaction_reference, payment_method)
        )
      `);

      // Create topup_audit_logs table
      await pool.query(`
        CREATE TABLE topup_audit_logs (
          id SERIAL PRIMARY KEY,
          topup_id INTEGER NOT NULL REFERENCES topups(id),
          admin_id VARCHAR(255) NOT NULL,
          action VARCHAR(20) NOT NULL,
          details JSONB,
          ip_address INET,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Create test customer
      const customerResult = await pool.query(`
        INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [
        'test-topup-customer-' + Date.now(),
        'Test Topup Customer',
        'topup-customer-' + Date.now() + '@test.com',
        'hashedpassword123',
        '+201234567890',
        'customer'
      ]);
      customerId = customerResult.rows[0].id;

      // Create test driver
      const driverResult = await pool.query(`
        INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [
        'test-topup-driver-' + Date.now(),
        'Test Topup Driver',
        'topup-driver-' + Date.now() + '@test.com',
        'hashedpassword123',
        '+201234567891',
        'driver'
      ]);
      driverId = driverResult.rows[0].id;

      // Create test admin
      const adminResult = await pool.query(`
        INSERT INTO users (id, name, email, password_hash, phone, primary_role, is_verified)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [
        'test-topup-admin-' + Date.now(),
        'Test Topup Admin',
        'topup-admin-' + Date.now() + '@test.com',
        'hashedpassword123',
        '+201234567892',
        'admin'
      ]);
      adminId = adminResult.rows[0].id;

      // Create user balances for customer and driver
      await pool.query(`
        INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance)
        VALUES ($1, 'EGP', 0, 0, 0)
        ON CONFLICT (user_id) DO UPDATE SET available_balance = 0
      `, [customerId]);

      await pool.query(`
        INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance)
        VALUES ($1, 'EGP', 0, 0, 0)
        ON CONFLICT (user_id) DO UPDATE SET available_balance = 0
      `, [driverId]);

      // Create test platform wallet
      const walletResult = await pool.query(`
        INSERT INTO platform_wallets (payment_method, phone_number, holder_name, is_active, daily_limit, monthly_limit)
        VALUES ('vodafone_cash', '01012345678', 'Test Platform Wallet', true, 50000, 500000)
        RETURNING id
      `);
      platformWalletId = walletResult.rows[0].id;

      // Generate tokens
      customerToken = generateToken(customerId, 'customer');
      driverToken = generateToken(driverId, 'driver');
      adminToken = generateToken(adminId, 'admin');

    } catch (error) {
      console.error('Test setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      // Clean up created topups
      if (createdTopupIds.length > 0) {
        await pool.query('DELETE FROM topup_audit_logs WHERE topup_id = ANY($1)', [createdTopupIds]);
        await pool.query('DELETE FROM topups WHERE id = ANY($1)', [createdTopupIds]);
      }

      // Clean up platform wallet
      if (platformWalletId) {
        await pool.query('DELETE FROM platform_wallets WHERE id = $1', [platformWalletId]);
      }

      // Clean up balance transactions
      await pool.query('DELETE FROM balance_transactions WHERE user_id IN ($1, $2)', [customerId, driverId]);

      // Clean up user balances
      await pool.query('DELETE FROM user_balances WHERE user_id IN ($1, $2)', [customerId, driverId]);

      // Clean up users
      await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [customerId, driverId, adminId]);

    } catch (error) {
      console.error('Test cleanup failed:', error);
    }
  });

  beforeEach(async () => {
    // Reset customer balance before each test
    await pool.query(`
      UPDATE user_balances SET available_balance = 0 WHERE user_id = $1
    `, [customerId]);
  });

  describe('14.1 Full Top-Up Flow: User submits → Admin verifies → Balance updated', () => {
    it('should complete full top-up verification flow for customer', async () => {
      const topupAmount = 100;
      const transactionRef = 'TXN-VERIFY-' + Date.now();

      // Step 1: Customer submits top-up request
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.topup.status).toBe('pending');
      expect(submitResponse.body.topup.amount).toBe(topupAmount);
      
      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // Step 2: Verify initial balance is 0
      const initialBalanceResult = await pool.query(
        'SELECT available_balance FROM user_balances WHERE user_id = $1',
        [customerId]
      );
      expect(parseFloat(initialBalanceResult.rows[0].available_balance)).toBe(0);

      // Step 3: Admin verifies the top-up
      const verifyResponse = await request(app)
        .post(`/api/admin/topups/${topupId}/verify`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.topup.status).toBe('verified');
      expect(verifyResponse.body.newBalance).toBe(topupAmount);

      // Step 4: Verify balance was updated
      const finalBalanceResult = await pool.query(
        'SELECT available_balance FROM user_balances WHERE user_id = $1',
        [customerId]
      );
      expect(parseFloat(finalBalanceResult.rows[0].available_balance)).toBe(topupAmount);

      // Step 5: Verify audit log was created
      const auditResult = await pool.query(
        'SELECT * FROM topup_audit_logs WHERE topup_id = $1',
        [topupId]
      );
      expect(auditResult.rows.length).toBeGreaterThan(0);
      expect(auditResult.rows[0].action).toBe('verify');
      expect(auditResult.rows[0].admin_id).toBe(adminId);
    });

    it('should complete full top-up verification flow for driver', async () => {
      const topupAmount = 250;
      const transactionRef = 'TXN-DRIVER-VERIFY-' + Date.now();

      // Reset driver balance
      await pool.query('UPDATE user_balances SET available_balance = 0 WHERE user_id = $1', [driverId]);

      // Step 1: Driver submits top-up request
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${driverToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(submitResponse.status).toBe(201);
      expect(submitResponse.body.success).toBe(true);
      expect(submitResponse.body.topup.status).toBe('pending');
      
      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // Step 2: Admin verifies the top-up
      const verifyResponse = await request(app)
        .post(`/api/admin/topups/${topupId}/verify`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.success).toBe(true);
      expect(verifyResponse.body.topup.status).toBe('verified');

      // Step 3: Verify driver balance was updated
      const finalBalanceResult = await pool.query(
        'SELECT available_balance FROM user_balances WHERE user_id = $1',
        [driverId]
      );
      expect(parseFloat(finalBalanceResult.rows[0].available_balance)).toBe(topupAmount);
    });

    it('should show pending topup in admin panel before verification', async () => {
      const topupAmount = 50;
      const transactionRef = 'TXN-PENDING-CHECK-' + Date.now();

      // Submit top-up
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // Admin fetches pending topups
      const pendingResponse = await request(app)
        .get('/api/admin/topups/pending')
        .set('Cookie', [`token=${adminToken}`]);

      expect(pendingResponse.status).toBe(200);
      expect(pendingResponse.body.success).toBe(true);
      expect(pendingResponse.body.pendingCount).toBeGreaterThan(0);
      
      const pendingTopup = pendingResponse.body.topups.find(t => t.id === topupId);
      expect(pendingTopup).toBeDefined();
      expect(pendingTopup.status).toBe('pending');
      expect(pendingTopup.amount).toBe(topupAmount);

      // Clean up - verify to remove from pending
      await request(app)
        .post(`/api/admin/topups/${topupId}/verify`)
        .set('Cookie', [`token=${adminToken}`]);
    });
  });

  describe('14.2 Rejection Flow: User submits → Admin rejects → User notified', () => {
    it('should complete full rejection flow with reason stored', async () => {
      const topupAmount = 75;
      const transactionRef = 'TXN-REJECT-' + Date.now();
      const rejectionReason = 'Transaction reference not found in payment provider records';

      // Step 1: Customer submits top-up request
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(submitResponse.status).toBe(201);
      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // Step 2: Admin rejects the top-up with reason
      const rejectResponse = await request(app)
        .post(`/api/admin/topups/${topupId}/reject`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ reason: rejectionReason });

      expect(rejectResponse.status).toBe(200);
      expect(rejectResponse.body.success).toBe(true);
      expect(rejectResponse.body.topup.status).toBe('rejected');
      expect(rejectResponse.body.topup.rejectionReason).toBe(rejectionReason);

      // Step 3: Verify rejection reason is stored in database
      const topupResult = await pool.query(
        'SELECT status, rejection_reason, verified_by FROM topups WHERE id = $1',
        [topupId]
      );
      expect(topupResult.rows[0].status).toBe('rejected');
      expect(topupResult.rows[0].rejection_reason).toBe(rejectionReason);
      expect(topupResult.rows[0].verified_by).toBe(adminId);

      // Step 4: Verify balance was NOT updated
      const balanceResult = await pool.query(
        'SELECT available_balance FROM user_balances WHERE user_id = $1',
        [customerId]
      );
      expect(parseFloat(balanceResult.rows[0].available_balance)).toBe(0);

      // Step 5: Verify audit log was created
      const auditResult = await pool.query(
        'SELECT * FROM topup_audit_logs WHERE topup_id = $1',
        [topupId]
      );
      expect(auditResult.rows.length).toBeGreaterThan(0);
      expect(auditResult.rows[0].action).toBe('reject');
    });

    it('should require rejection reason', async () => {
      const topupAmount = 50;
      const transactionRef = 'TXN-REJECT-NO-REASON-' + Date.now();

      // Submit top-up
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // Try to reject without reason
      const rejectResponse = await request(app)
        .post(`/api/admin/topups/${topupId}/reject`)
        .set('Cookie', [`token=${adminToken}`])
        .send({});

      expect(rejectResponse.status).toBe(400);
      // Validation error response may have error field instead of success field
      expect(rejectResponse.body.error || rejectResponse.body.errors).toBeDefined();

      // Verify topup is still pending
      const topupResult = await pool.query(
        'SELECT status FROM topups WHERE id = $1',
        [topupId]
      );
      expect(topupResult.rows[0].status).toBe('pending');

      // Clean up
      await request(app)
        .post(`/api/admin/topups/${topupId}/reject`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ reason: 'Test cleanup' });
    });

    it('should show rejected topup in user history', async () => {
      const topupAmount = 60;
      const transactionRef = 'TXN-REJECT-HISTORY-' + Date.now();
      const rejectionReason = 'Invalid transaction reference';

      // Submit and reject
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      await request(app)
        .post(`/api/admin/topups/${topupId}/reject`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ reason: rejectionReason });

      // Check user's topup history
      const historyResponse = await request(app)
        .get('/api/topups?status=rejected')
        .set('Cookie', [`token=${customerToken}`]);

      expect(historyResponse.status).toBe(200);
      const rejectedTopup = historyResponse.body.topups.find(t => t.id === topupId);
      expect(rejectedTopup).toBeDefined();
      expect(rejectedTopup.status).toBe('rejected');
      expect(rejectedTopup.rejectionReason).toBe(rejectionReason);
    });
  });

  describe('14.3 Duplicate Reference Handling', () => {
    it('should reject duplicate transaction reference for same payment method', async () => {
      const topupAmount = 100;
      const transactionRef = 'TXN-DUPLICATE-' + Date.now();

      // First submission - should succeed
      const firstResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(firstResponse.status).toBe(201);
      expect(firstResponse.body.success).toBe(true);
      createdTopupIds.push(firstResponse.body.topup.id);

      // Second submission with same reference - should fail
      const secondResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.success).toBe(false);
      expect(secondResponse.body.code).toBe('DUPLICATE_REFERENCE');
      expect(secondResponse.body.error).toContain('already submitted');
    });

    it('should return existing request status when duplicate detected', async () => {
      const topupAmount = 150;
      const transactionRef = 'TXN-DUP-STATUS-' + Date.now();

      // First submission
      const firstResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      createdTopupIds.push(firstResponse.body.topup.id);

      // Second submission - should return existing status
      const secondResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(secondResponse.status).toBe(409);
      expect(secondResponse.body.existingStatus).toBe('pending');
    });

    it('should allow same reference for different payment methods', async () => {
      const topupAmount = 100;
      const transactionRef = 'TXN-MULTI-METHOD-' + Date.now();

      // Create InstaPay wallet for this test
      const instapayWalletResult = await pool.query(`
        INSERT INTO platform_wallets (payment_method, instapay_alias, holder_name, is_active, daily_limit, monthly_limit)
        VALUES ('instapay', 'test-ipa@bank', 'Test InstaPay Wallet', true, 50000, 500000)
        RETURNING id
      `);
      const instapayWalletId = instapayWalletResult.rows[0].id;
      let firstTopupId = null;
      let secondTopupId = null;

      try {
        // First submission with vodafone_cash
        const firstResponse = await request(app)
          .post('/api/topups')
          .set('Cookie', [`token=${customerToken}`])
          .send({
            amount: topupAmount,
            paymentMethod: 'vodafone_cash',
            transactionReference: transactionRef,
            platformWalletId: platformWalletId
          });

        expect(firstResponse.status).toBe(201);
        firstTopupId = firstResponse.body.topup.id;
        createdTopupIds.push(firstTopupId);

        // Second submission with instapay (same reference, different method) - should succeed
        const secondResponse = await request(app)
          .post('/api/topups')
          .set('Cookie', [`token=${customerToken}`])
          .send({
            amount: topupAmount,
            paymentMethod: 'instapay',
            transactionReference: transactionRef,
            platformWalletId: instapayWalletId
          });

        expect(secondResponse.status).toBe(201);
        expect(secondResponse.body.success).toBe(true);
        secondTopupId = secondResponse.body.topup.id;
        createdTopupIds.push(secondTopupId);

      } finally {
        // Clean up topups referencing the InstaPay wallet first
        if (secondTopupId) {
          await pool.query('DELETE FROM topup_audit_logs WHERE topup_id = $1', [secondTopupId]);
          await pool.query('DELETE FROM topups WHERE id = $1', [secondTopupId]);
          // Remove from createdTopupIds since we already deleted it
          const idx = createdTopupIds.indexOf(secondTopupId);
          if (idx > -1) createdTopupIds.splice(idx, 1);
        }
        // Clean up InstaPay wallet
        await pool.query('DELETE FROM platform_wallets WHERE id = $1', [instapayWalletId]);
      }
    });

    it('should reject duplicate from different users', async () => {
      const topupAmount = 200;
      const transactionRef = 'TXN-DUP-USERS-' + Date.now();

      // Customer submits first
      const customerResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(customerResponse.status).toBe(201);
      createdTopupIds.push(customerResponse.body.topup.id);

      // Driver tries same reference - should fail
      const driverResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${driverToken}`])
        .send({
          amount: topupAmount,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      expect(driverResponse.status).toBe(409);
      expect(driverResponse.body.code).toBe('DUPLICATE_REFERENCE');
    });
  });

  describe('Additional Integration Scenarios', () => {
    it('should validate amount boundaries', async () => {
      // Test minimum amount (below 10 EGP)
      const belowMinResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: 5,
          paymentMethod: 'vodafone_cash',
          transactionReference: 'TXN-MIN-' + Date.now(),
          platformWalletId: platformWalletId
        });

      expect(belowMinResponse.status).toBe(400);

      // Test maximum amount (above 10000 EGP)
      const aboveMaxResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: 15000,
          paymentMethod: 'vodafone_cash',
          transactionReference: 'TXN-MAX-' + Date.now(),
          platformWalletId: platformWalletId
        });

      expect(aboveMaxResponse.status).toBe(400);
    });

    it('should not allow verifying already verified topup', async () => {
      const transactionRef = 'TXN-DOUBLE-VERIFY-' + Date.now();

      // Submit and verify
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: 100,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // First verify - should succeed
      await request(app)
        .post(`/api/admin/topups/${topupId}/verify`)
        .set('Cookie', [`token=${adminToken}`]);

      // Second verify - should fail
      const secondVerifyResponse = await request(app)
        .post(`/api/admin/topups/${topupId}/verify`)
        .set('Cookie', [`token=${adminToken}`]);

      expect(secondVerifyResponse.status).toBe(400);
      expect(secondVerifyResponse.body.error).toContain('already verified');
    });

    it('should require authentication for topup endpoints', async () => {
      // Without token
      const noAuthResponse = await request(app)
        .post('/api/topups')
        .send({
          amount: 100,
          paymentMethod: 'vodafone_cash',
          transactionReference: 'TXN-NO-AUTH-' + Date.now(),
          platformWalletId: platformWalletId
        });

      expect(noAuthResponse.status).toBe(401);
    });

    it('should require admin role for verification endpoints', async () => {
      const transactionRef = 'TXN-NON-ADMIN-' + Date.now();

      // Submit as customer
      const submitResponse = await request(app)
        .post('/api/topups')
        .set('Cookie', [`token=${customerToken}`])
        .send({
          amount: 100,
          paymentMethod: 'vodafone_cash',
          transactionReference: transactionRef,
          platformWalletId: platformWalletId
        });

      const topupId = submitResponse.body.topup.id;
      createdTopupIds.push(topupId);

      // Try to verify as customer (non-admin)
      const verifyResponse = await request(app)
        .post(`/api/admin/topups/${topupId}/verify`)
        .set('Cookie', [`token=${customerToken}`]);

      expect(verifyResponse.status).toBe(403);

      // Clean up
      await request(app)
        .post(`/api/admin/topups/${topupId}/reject`)
        .set('Cookie', [`token=${adminToken}`])
        .send({ reason: 'Test cleanup' });
    });
  });
});
