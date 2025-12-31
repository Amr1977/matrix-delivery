const request = require('supertest');
const app = require('../../../server');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Mock pool for testing
jest.mock('pg', () => {
    const mPool = {
        query: jest.fn(),
        end: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

describe('File Upload API', () => {
    let token;
    let orderId;
    let userId;

    beforeAll(async () => {
        // Mock authentication
        userId = 'test-user-123';
        orderId = 'test-order-123';

        // Generate test token (you'll need to use your actual JWT_SECRET)
        const jwt = require('jsonwebtoken');
        token = jwt.sign(
            { userId, primary_role: 'customer' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );
    });

    describe('POST /api/uploads/image', () => {
        it('should upload an image successfully', async () => {
            const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

            // Create test image if it doesn't exist
            if (!fs.existsSync(path.dirname(testImagePath))) {
                fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
            }

            // Create a small test image (1x1 pixel)
            const testImageBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
                0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
            ]);
            fs.writeFileSync(testImagePath, testImageBuffer);

            const response = await request(app)
                .post('/api/uploads/image')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', testImagePath);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.mediaUrl).toBeDefined();
            expect(response.body.mediaType).toBe('image');
            expect(response.body.thumbnailUrl).toBeDefined();
        });

        it('should reject oversized images', async () => {
            const response = await request(app)
                .post('/api/uploads/image')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', Buffer.alloc(11 * 1024 * 1024), 'large.jpg'); // 11MB

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('exceeds');
        });

        it('should reject invalid file types', async () => {
            const response = await request(app)
                .post('/api/uploads/image')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', Buffer.from('test'), 'test.txt');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid file type');
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .post('/api/uploads/image')
                .field('orderId', orderId)
                .attach('file', Buffer.from('test'), 'test.jpg');

            expect(response.status).toBe(401);
        });
    });

    describe('POST /api/uploads/video', () => {
        it('should upload a video successfully', async () => {
            // Mock video file
            const testVideoBuffer = Buffer.from('fake video content');

            const response = await request(app)
                .post('/api/uploads/video')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', testVideoBuffer, 'test.mp4');

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.mediaType).toBe('video');
        });

        it('should reject oversized videos', async () => {
            const response = await request(app)
                .post('/api/uploads/video')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', Buffer.alloc(51 * 1024 * 1024), 'large.mp4'); // 51MB

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/uploads/voice', () => {
        it('should upload a voice recording successfully', async () => {
            const testAudioBuffer = Buffer.from('fake audio content');

            const response = await request(app)
                .post('/api/uploads/voice')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', testAudioBuffer, 'voice.webm');

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.mediaType).toBe('voice');
        });

        it('should reject oversized voice recordings', async () => {
            const response = await request(app)
                .post('/api/uploads/voice')
                .set('Authorization', `Bearer ${token}`)
                .field('orderId', orderId)
                .attach('file', Buffer.alloc(6 * 1024 * 1024), 'large.webm'); // 6MB

            expect(response.status).toBe(400);
        });
    });

    afterAll(() => {
        // Cleanup test files
        const fixturesDir = path.join(__dirname, 'fixtures');
        if (fs.existsSync(fixturesDir)) {
            fs.rmSync(fixturesDir, { recursive: true, force: true });
        }
    });
});

describe('Media Messages API', () => {
    let token;
    let orderId;
    let userId;
    let recipientId;

    beforeAll(() => {
        userId = 'test-user-123';
        recipientId = 'test-recipient-456';
        orderId = 'test-order-123';

        const jwt = require('jsonwebtoken');
        token = jwt.sign(
            { userId, primary_role: 'customer' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );
    });

    describe('POST /api/messages with media', () => {
        it('should send a media message successfully', async () => {
            const mediaData = {
                mediaUrl: '/uploads/images/test_123.jpg',
                mediaType: 'image',
                mediaSize: 50000,
                thumbnailUrl: '/uploads/thumbnails/thumb_test_123.jpg'
            };

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    orderId,
                    recipientId,
                    content: 'Check out this image!',
                    messageType: 'image',
                    mediaData
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message.mediaUrl).toBe(mediaData.mediaUrl);
        });

        it('should send a media message without text content', async () => {
            const mediaData = {
                mediaUrl: '/uploads/voice/voice_123.webm',
                mediaType: 'voice',
                mediaSize: 30000,
                mediaDuration: 15
            };

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    orderId,
                    recipientId,
                    content: '',
                    messageType: 'voice',
                    mediaData
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should reject message without content or media', async () => {
            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    orderId,
                    recipientId,
                    content: '',
                    messageType: 'text'
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('cannot be empty');
        });
    });

    describe('GET /api/messages/order/:orderId', () => {
        it('should retrieve messages with media fields', async () => {
            const response = await request(app)
                .get(`/api/messages/order/${orderId}`)
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.messages).toBeDefined();

            // Check that media fields are included
            if (response.body.messages.length > 0) {
                const message = response.body.messages[0];
                expect(message).toHaveProperty('mediaUrl');
                expect(message).toHaveProperty('mediaType');
                expect(message).toHaveProperty('mediaSize');
            }
        });
    });
});
