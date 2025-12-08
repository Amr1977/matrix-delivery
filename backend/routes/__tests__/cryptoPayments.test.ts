const request = require('supertest');
const app = require('../../server'); // Adjust path as needed, likely ../../server
const { generateToken } = require('../../utils/auth');
// Pool is imported from config/db now, but the test uses it as type or value.
// If it uses it as a value to query, we should import the singleton 'pool' from config/db
// and NOT instantiate 'new Pool'.
const pool = require('../../config/db');

jest.mock('../../services/blockchainService');

describe('Crypto Payments API', () => {

    let authToken: string;
    let driverToken: string;
    let adminToken: string;
    let testUserId: string;
    let testDriverId: string;

    beforeAll(async () => {
        // Pool is imported from config/db, no need to instantiate new.

        // Create test users
        const userResult = await pool.query(
            `INSERT INTO users (id, email, password, role) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
            ['test-user-1', 'customer@test.com', 'hash', 'customer']
        );
        testUserId = userResult.rows[0].id;

        const driverResult = await pool.query(
            `INSERT INTO users (id, email, password, role) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
            ['test-driver-1', 'driver@test.com', 'hash', 'driver']
        );
        testDriverId = driverResult.rows[0].id;

        // Generate auth tokens
        authToken = generateToken({ userId: testUserId, role: 'customer' });
        driverToken = generateToken({ userId: testDriverId, role: 'driver' });
        adminToken = generateToken({ userId: 'admin-1', role: 'admin' });
    });


    afterAll(async () => {
        // Cleanup test data
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUserId, testDriverId]);
        await pool.end();
    });

    describe('POST /api/crypto/wallet/connect', () => {
        it('should link wallet address to user account', async () => {
            const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            const response = await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.walletAddress).toBe(walletAddress.toLowerCase());
        });

        it('should validate wallet address format', async () => {
            const invalidAddress = 'invalid-address';

            await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress: invalidAddress })
                .expect(400);
        });

        it('should prevent duplicate wallet connections', async () => {
            const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            // First connection
            await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress })
                .expect(200);

            // Duplicate connection attempt
            const response = await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress })
                .expect(400);

            expect(response.body.error).toContain('already connected');
        });

        it('should require authentication', async () => {
            await request(app)
                .post('/api/crypto/wallet/connect')
                .send({ walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' })
                .expect(401);
        });
    });

    describe('GET /api/crypto/driver/earnings', () => {
        beforeEach(async () => {
            // Setup test wallet and transactions
            await pool.query(
                `INSERT INTO user_wallets (user_id, wallet_address) 
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [testDriverId, '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb']
            );

            await pool.query(
                `INSERT INTO crypto_transactions 
         (id, user_id, transaction_type, token_symbol, amount, status, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                ['tx-1', testDriverId, 'payout', 'USDC', '50.00', 'confirmed']
            );
        });

        afterEach(async () => {
            await pool.query('DELETE FROM crypto_transactions WHERE user_id = $1', [testDriverId]);
            await pool.query('DELETE FROM user_wallets WHERE user_id = $1', [testDriverId]);
        });

        it('should return driver earnings summary', async () => {
            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.totalEarnings).toBeDefined();
            expect(response.body.walletAddress).toBeDefined();
        });

        it('should return transaction history', async () => {
            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(200);

            expect(response.body.transactions).toBeInstanceOf(Array);
            expect(response.body.transactions.length).toBeGreaterThan(0);
            expect(response.body.transactions[0]).toHaveProperty('amount');
            expect(response.body.transactions[0]).toHaveProperty('token_symbol');
        });

        it('should require driver role', async () => {
            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(403);

            expect(response.body.error).toContain('driver');
        });

        it('should return 401 for unauthenticated requests', async () => {
            await request(app)
                .get('/api/crypto/driver/earnings')
                .expect(401);
        });

        it('should return empty earnings for driver without wallet', async () => {
            // Remove wallet
            await pool.query('DELETE FROM user_wallets WHERE user_id = $1', [testDriverId]);

            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(200);

            expect(response.body.totalEarnings).toBe('0');
            expect(response.body.transactions).toHaveLength(0);
        });
    });

    describe('GET /api/crypto/tokens', () => {
        it('should return list of supported tokens', async () => {
            const response = await request(app)
                .get('/api/crypto/tokens')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.tokens).toBeInstanceOf(Array);
            expect(response.body.tokens.length).toBeGreaterThan(0);

            const usdc = response.body.tokens.find((t: any) => t.symbol === 'USDC');
            expect(usdc).toBeDefined();
            expect(usdc).toHaveProperty('address');
            expect(usdc).toHaveProperty('decimals');
            expect(usdc).toHaveProperty('network');
        });
    });

    describe('GET /api/crypto/balance/:address/:token', () => {
        it('should return wallet balance for valid address', async () => {
            const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            const response = await request(app)
                .get(`/api/crypto/balance/${address}/USDC`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.balance).toBeDefined();
            expect(response.body.token).toBe('USDC');
        });

        it('should validate address format', async () => {
            await request(app)
                .get('/api/crypto/balance/invalid-address/USDC')
                .expect(400);
        });

        it('should handle unsupported tokens', async () => {
            const address = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

            await request(app)
                .get(`/api/crypto/balance/${address}/INVALID`)
                .expect(400);
        });
    });

    describe('GET /api/crypto/network/info', () => {
        it('should return blockchain network information', async () => {
            const response = await request(app)
                .get('/api/crypto/network/info')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.network).toBeDefined();
            expect(response.body.network).toHaveProperty('chainId');
            expect(response.body.network).toHaveProperty('name');
        });
    });

    describe('POST /api/crypto/order/:orderId/complete', () => {
        let testOrderId: string;

        beforeEach(async () => {
            // Create test order
            const orderResult = await pool.query(
                `INSERT INTO orders (id, customer_id, driver_id, status, crypto_payment, crypto_token, crypto_amount)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                ['order-1', testUserId, testDriverId, 'delivered', true, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', '50']
            );
            testOrderId = orderResult.rows[0].id;
        });

        afterEach(async () => {
            await pool.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
        });

        it('should complete order and release funds (admin only)', async () => {
            const response = await request(app)
                .post(`/api/crypto/order/${testOrderId}/complete`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.txHash).toBeDefined();
        });

        it('should reject non-admin requests', async () => {
            await request(app)
                .post(`/api/crypto/order/${testOrderId}/complete`)
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(403);
        });
    });
});
