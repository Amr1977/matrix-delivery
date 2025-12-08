/**
 * Crypto Payments Integration Tests
 * Tests for end-to-end crypto payment flows
 */

import request from 'supertest';
import { Pool } from 'pg';
import app from '../../server';
import { generateToken } from '../../utils/auth';
import { ethers } from 'ethers';

describe('Crypto Payments Integration', () => {
    let pool: Pool;
    let driverToken: string;
    let customerToken: string;
    let testDriverId: string;
    let testCustomerId: string;
    const testWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

    beforeAll(async () => {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL_TEST
        });

        // Create test driver
        const driverResult = await pool.query(
            `INSERT INTO users (id, email, password_hash, primary_role) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
            ['test-driver-integration', 'driver-int@test.com', 'hash', 'driver']
        );
        testDriverId = driverResult.rows[0].id;

        // Create test customer
        const customerResult = await pool.query(
            `INSERT INTO users (id, email, password_hash, primary_role) 
       VALUES ($1, $2, $3, $4) RETURNING id`,
            ['test-customer-integration', 'customer-int@test.com', 'hash', 'customer']
        );
        testCustomerId = customerResult.rows[0].id;

        driverToken = generateToken({ userId: testDriverId, role: 'driver' });
        customerToken = generateToken({ userId: testCustomerId, role: 'customer' });
    });

    afterAll(async () => {
        await pool.query('DELETE FROM crypto_transactions WHERE user_id IN ($1, $2)', [testDriverId, testCustomerId]);
        await pool.query('DELETE FROM user_wallets WHERE user_id IN ($1, $2)', [testDriverId, testCustomerId]);
        await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testDriverId, testCustomerId]);
        await pool.end();
    });

    describe('Wallet Connection Flow', () => {
        it('should complete full wallet connection flow', async () => {
            // Step 1: Connect wallet to backend
            const connectResponse = await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress: testWalletAddress })
                .expect(200);

            expect(connectResponse.body.success).toBe(true);
            expect(connectResponse.body.walletAddress).toBe(testWalletAddress.toLowerCase());

            // Step 2: Verify wallet is stored in database
            const walletResult = await pool.query(
                'SELECT * FROM user_wallets WHERE user_id = $1',
                [testDriverId]
            );

            expect(walletResult.rows.length).toBe(1);
            expect(walletResult.rows[0].wallet_address).toBe(testWalletAddress.toLowerCase());

            // Step 3: Fetch earnings (should be empty initially)
            const earningsResponse = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(200);

            expect(earningsResponse.body.totalEarnings).toBe('0');
            expect(earningsResponse.body.walletAddress).toBe(testWalletAddress.toLowerCase());
            expect(earningsResponse.body.transactions).toHaveLength(0);
        });

        it('should prevent duplicate wallet connections', async () => {
            // First connection
            await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress: testWalletAddress })
                .expect(200);

            // Duplicate connection
            const response = await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress: testWalletAddress })
                .expect(400);

            expect(response.body.error).toContain('already connected');
        });
    });

    describe('Payment Processing Flow', () => {
        let testOrderId: string;

        beforeEach(async () => {
            // Create test order
            const orderResult = await pool.query(
                `INSERT INTO orders (id, customer_id, status, crypto_payment, crypto_token, crypto_amount, total_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                [
                    `order-int-${Date.now()}`,
                    testCustomerId,
                    'pending_bids',
                    true,
                    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
                    '50',
                    50
                ]
            );
            testOrderId = orderResult.rows[0].id;
        });

        afterEach(async () => {
            await pool.query('DELETE FROM orders WHERE id = $1', [testOrderId]);
        });

        it('should retrieve order blockchain status', async () => {
            const response = await request(app)
                .get(`/api/crypto/order/${testOrderId}/status`)
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.orderDetails).toBeDefined();
        });

        it('should check customer wallet balance', async () => {
            const response = await request(app)
                .get(`/api/crypto/balance/${testWalletAddress}/USDC`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.balance).toBeDefined();
            expect(response.body.token).toBe('USDC');
        });
    });

    describe('Earnings Flow', () => {
        beforeEach(async () => {
            // Connect wallet
            await pool.query(
                `INSERT INTO user_wallets (user_id, wallet_address) 
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                [testDriverId, testWalletAddress]
            );

            // Add test transaction
            await pool.query(
                `INSERT INTO crypto_transactions 
         (id, user_id, transaction_type, token_symbol, amount, status, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [`tx-int-${Date.now()}`, testDriverId, 'payout', 'USDC', '75.50', 'confirmed']
            );
        });

        afterEach(async () => {
            await pool.query('DELETE FROM crypto_transactions WHERE user_id = $1', [testDriverId]);
            await pool.query('DELETE FROM user_wallets WHERE user_id = $1', [testDriverId]);
        });

        it('should fetch driver earnings with transactions', async () => {
            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(parseFloat(response.body.totalEarnings)).toBeGreaterThan(0);
            expect(response.body.transactions).toBeInstanceOf(Array);
            expect(response.body.transactions.length).toBeGreaterThan(0);

            const transaction = response.body.transactions[0];
            expect(transaction).toHaveProperty('amount');
            expect(transaction).toHaveProperty('token_symbol');
            expect(transaction).toHaveProperty('transaction_type');
            expect(transaction.token_symbol).toBe('USDC');
        });

        it('should calculate total earnings correctly', async () => {
            // Add another transaction
            await pool.query(
                `INSERT INTO crypto_transactions 
         (id, user_id, transaction_type, token_symbol, amount, status, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
                [`tx-int-2-${Date.now()}`, testDriverId, 'payout', 'USDC', '24.50', 'confirmed']
            );

            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${driverToken}`)
                .expect(200);

            const totalEarnings = parseFloat(response.body.totalEarnings);
            expect(totalEarnings).toBe(100.00); // 75.50 + 24.50
        });
    });

    describe('Network Information', () => {
        it('should return Polygon network info', async () => {
            const response = await request(app)
                .get('/api/crypto/network/info')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.network).toBeDefined();
            expect(response.body.network.chainId).toBe(137); // Polygon Mainnet
            expect(response.body.network.name).toContain('Polygon');
        });
    });

    describe('Token Information', () => {
        it('should return supported tokens including USDC', async () => {
            const response = await request(app)
                .get('/api/crypto/tokens')
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.tokens).toBeInstanceOf(Array);

            const usdc = response.body.tokens.find((t: any) => t.symbol === 'USDC');
            expect(usdc).toBeDefined();
            expect(usdc.address).toBe('0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
            expect(usdc.decimals).toBe(6);
            expect(usdc.network).toBe('Polygon');
        });
    });

    describe('Authorization and Security', () => {
        it('should require authentication for wallet connection', async () => {
            await request(app)
                .post('/api/crypto/wallet/connect')
                .send({ walletAddress: testWalletAddress })
                .expect(401);
        });

        it('should require driver role for earnings', async () => {
            await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${customerToken}`)
                .expect(403);
        });

        it('should validate wallet address format', async () => {
            await request(app)
                .post('/api/crypto/wallet/connect')
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ walletAddress: 'invalid-address' })
                .expect(400);
        });
    });

    describe('Error Handling', () => {
        it('should handle missing wallet gracefully', async () => {
            // Create new driver without wallet
            const newDriverResult = await pool.query(
                `INSERT INTO users (id, email, password_hash, primary_role) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
                ['test-driver-no-wallet', 'driver-no-wallet@test.com', 'hash', 'driver']
            );
            const newDriverId = newDriverResult.rows[0].id;
            const newDriverToken = generateToken({ userId: newDriverId, role: 'driver' });

            const response = await request(app)
                .get('/api/crypto/driver/earnings')
                .set('Authorization', `Bearer ${newDriverToken}`)
                .expect(200);

            expect(response.body.totalEarnings).toBe('0');
            expect(response.body.transactions).toHaveLength(0);

            // Cleanup
            await pool.query('DELETE FROM users WHERE id = $1', [newDriverId]);
        });

        it('should handle invalid token symbol', async () => {
            await request(app)
                .get(`/api/crypto/balance/${testWalletAddress}/INVALID`)
                .expect(400);
        });
    });
});
