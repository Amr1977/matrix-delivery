const request = require('supertest');
const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

let server;
let testUser;
let testToken;

describe('Authentication API Tests', () => {
  beforeAll(async () => {
    // Start the server for testing
    const app = require('../server');
    server = app.listen(5001); // Use a different port for tests
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up test data
    await pool.query('DELETE FROM email_verification_tokens');
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query('DELETE FROM crypto_transactions');
    await pool.query('DELETE FROM orders');
    await pool.query('DELETE FROM user_wallets');
    await pool.query('DELETE FROM users');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        phone: '+1234567890',
        role: 'customer',
        country: 'Test Country',
        city: 'Test City',
        area: 'Test Area'
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      // Token is now in cookie, not body
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();

      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.role).toBe(userData.role);
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        name: 'Test User',
        email: 'test@example.com'
        // Missing password, phone, primary_role, etc.
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toContain('All fields required');
    });

    it('should return 409 for duplicate email', async () => {
      // First registration
      const userData = {
        name: 'Test User',
        email: 'duplicate@example.com',
        password: 'password123',
        phone: '+1234567890',
        role: 'customer',
        country: 'Test Country',
        city: 'Test City',
        area: 'Test Area'
      };

      await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          'test-user-id',
          'Test User',
          'login@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0
        ]
      );
      testUser = result.rows[0];
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'password123'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('user');

      // Token is in cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find(c => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      testToken = tokenCookie.split(';')[0].split('=')[1];

      expect(response.body.user.email).toBe(loginData.email);
    });

    it('should return 401 for invalid credentials', async () => {
      const invalidData = {
        email: 'login@example.com',
        password: 'wrongpassword'
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          'forgot-user-id',
          'Forgot User',
          'forgot@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0
        ]
      );
      testUser = result.rows[0];
    });

    it('should send password reset email for existing user', async () => {
      const forgotData = {
        email: 'forgot@example.com',
        recaptchaToken: 'test-token' // Would be validated in production
      };

      const response = await request(server)
        .post('/api/auth/forgot-password')
        .send(forgotData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');

      // Check that reset token was created
      const tokenResult = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE user_id = $1',
        [testUser.id]
      );
      expect(tokenResult.rows.length).toBe(1);
      expect(tokenResult.rows[0].used).toBe(false);
    });

    it('should return success for non-existing user (security)', async () => {
      const forgotData = {
        email: 'nonexistent@example.com',
        recaptchaToken: 'test-token'
      };

      const response = await request(server)
        .post('/api/auth/forgot-password')
        .send(forgotData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return 400 for missing email', async () => {
      const forgotData = {
        recaptchaToken: 'test-token'
        // Missing email
      };

      const response = await request(server)
        .post('/api/auth/forgot-password')
        .send(forgotData)
        .expect(400);

      expect(response.body.error).toContain('Email is required');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken;

    beforeEach(async () => {
      // Create a test user
      const hashedPassword = await bcrypt.hash('oldpassword', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          'reset-user-id',
          'Reset User',
          'reset@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0
        ]
      );
      testUser = result.rows[0];

      // Create a reset token
      const tokenId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      resetToken = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await pool.query(
        `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [tokenId, testUser.id, resetToken, expiresAt]
      );
    });

    it('should reset password successfully with valid token', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'newpassword123'
      };

      const response = await request(server)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password has been reset successfully');

      // Check that password was updated
      const userResult = await pool.query('SELECT password FROM users WHERE id = $1', [testUser.id]);
      const isNewPasswordValid = await bcrypt.compare('newpassword123', userResult.rows[0].password);
      expect(isNewPasswordValid).toBe(true);

      // Check that token was marked as used
      const tokenResult = await pool.query(
        'SELECT used FROM password_reset_tokens WHERE token = $1',
        [resetToken]
      );
      expect(tokenResult.rows[0].used).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'newpassword123'
      };

      const response = await request(server)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired reset token');
    });

    it('should return 400 for short password', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'short'
      };

      const response = await request(server)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.error).toContain('must be at least 8 characters');
    });

    it('should return 400 for expired token', async () => {
      // Update token to be expired
      await pool.query(
        'UPDATE password_reset_tokens SET expires_at = $1 WHERE token = $2',
        [new Date(Date.now() - 1000), resetToken] // Expired 1 second ago
      );

      const resetData = {
        token: resetToken,
        newPassword: 'newpassword123'
      };

      const response = await request(server)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired reset token');
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      // Create a test user and get token
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          'profile-user-id',
          'Profile User',
          'profile@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0
        ]
      );
      testUser = result.rows[0];
      testToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, name: testUser.name, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    it('should return user profile with valid token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body.email).toBe(testUser.email);
      expect(response.body.name).toBe(testUser.name);
    });

    it('should return 401 without token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error).toContain('No token provided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid or expired token');
    });
  });

  describe('POST /api/auth/switch-role', () => {
    beforeEach(async () => {
      // Create a test user with multiple roles
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, roles, country, city, area, rating, completed_deliveries)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          'switch-user-id',
          'Switch User',
          'switch@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          ['customer', 'driver'], // Multiple roles
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0
        ]
      );
      testUser = result.rows[0];
      testToken = jwt.sign(
        {
          userId: testUser.id,
          email: testUser.email,
          name: testUser.name,
          role: testUser.role,
          roles: testUser.roles
        },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    it('should switch role successfully', async () => {
      const switchData = {
        role: 'driver'
      };

      const response = await request(server)
        .post('/api/auth/switch-role')
        .set('Authorization', `Bearer ${testToken}`)
        .send(switchData)
        .expect(200);

      // Token is returned in body for switch-role as it returns new token
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('role');
      expect(response.body.role).toBe('driver');
    });

    it('should return 400 for invalid role', async () => {
      const switchData = {
        role: 'admin' // User doesn't have admin role
      };

      const response = await request(server)
        .post('/api/auth/switch-role')
        .set('Authorization', `Bearer ${testToken}`)
        .send(switchData)
        .expect(400);

      expect(response.body.error).toContain('Role not assigned');
    });
  });

  describe('POST /api/auth/send-verification', () => {
    beforeEach(async () => {
      // Create an unverified test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          'unverified-user-id',
          'Unverified User',
          'unverified@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0,
          false // Not verified
        ]
      );
      testUser = result.rows[0];
      testToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, name: testUser.name, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '30d' }
      );
    });

    it('should send verification email for unverified user', async () => {
      const response = await request(server)
        .post('/api/auth/send-verification')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Verification email sent successfully');

      // Check that verification token was created
      const tokenResult = await pool.query(
        'SELECT * FROM email_verification_tokens WHERE user_id = $1',
        [testUser.id]
      );
      expect(tokenResult.rows.length).toBe(1);
      expect(tokenResult.rows[0].used).toBe(false);
    });

    it('should return 400 for already verified user', async () => {
      // Mark user as verified
      await pool.query('UPDATE users SET is_verified = true WHERE id = $1', [testUser.id]);

      const response = await request(server)
        .post('/api/auth/send-verification')
        .set('Authorization', `Bearer ${testToken}`)
        .expect(400);

      expect(response.body.error).toContain('Email is already verified');
    });

    it('should return 401 without token', async () => {
      const response = await request(server)
        .post('/api/auth/send-verification')
        .expect(401);

      expect(response.body.error).toContain('No token provided');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let verificationToken;

    beforeEach(async () => {
      // Create an unverified test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password, phone, primary_role, country, city, area, rating, completed_deliveries, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          'verify-user-id',
          'Verify User',
          'verify@example.com',
          hashedPassword,
          '+1234567890',
          'customer',
          'Test Country',
          'Test City',
          'Test Area',
          5.0,
          0,
          false // Not verified
        ]
      );
      testUser = result.rows[0];

      // Create a verification token
      const tokenId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      verificationToken = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await pool.query(
        `INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [tokenId, testUser.id, verificationToken, expiresAt]
      );
    });

    it('should verify email successfully with valid token', async () => {
      const verifyData = {
        token: verificationToken
      };

      const response = await request(server)
        .post('/api/auth/verify-email')
        .send(verifyData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Email verified successfully');

      // Check that user was marked as verified
      const userResult = await pool.query('SELECT is_verified, verified_at FROM users WHERE id = $1', [testUser.id]);
      expect(userResult.rows[0].is_verified).toBe(true);
      expect(userResult.rows[0].verified_at).not.toBeNull();

      // Check that token was marked as used
      const tokenResult = await pool.query(
        'SELECT used FROM email_verification_tokens WHERE token = $1',
        [verificationToken]
      );
      expect(tokenResult.rows[0].used).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      const verifyData = {
        token: 'invalid-token'
      };

      const response = await request(server)
        .post('/api/auth/verify-email')
        .send(verifyData)
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired verification token');
    });

    it('should return 400 for expired token', async () => {
      // Update token to be expired
      await pool.query(
        'UPDATE email_verification_tokens SET expires_at = $1 WHERE token = $2',
        [new Date(Date.now() - 1000), verificationToken] // Expired 1 second ago
      );

      const verifyData = {
        token: verificationToken
      };

      const response = await request(server)
        .post('/api/auth/verify-email')
        .send(verifyData)
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired verification token');
    });

    it('should return 400 for missing token', async () => {
      const verifyData = {
        // Missing token
      };

      const response = await request(server)
        .post('/api/auth/verify-email')
        .send(verifyData)
        .expect(400);

      expect(response.body.error).toContain('Verification token is required');
    });
  });
});

