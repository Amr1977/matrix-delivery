const request = require('supertest');
const app = require('../../../backend/server');
const messagingService = require('../../../backend/services/messagingService');
const path = require('path');
const fs = require('fs');

describe('File Upload API', () => {
    let token;
    let orderId;
    let userId;
    let recipientId = 'test-recipient-456';

    beforeAll(async () => {
        // Mock authentication
        userId = 'test-user-123';
        orderId = 'test-order-123';

        // Generate test token
        const jwt = require('jsonwebtoken');
        token = jwt.sign(
            { userId, primary_role: 'customer' },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h', audience: 'matrix-delivery-api', issuer: 'matrix-delivery' }
        );

        // Spy on messagingService methods to bypass DB
        jest.spyOn(messagingService, 'canUsersMessage').mockResolvedValue(true);
        jest.spyOn(messagingService, 'sendMessage').mockImplementation(async (orderId, senderId, recipientId, content, messageType, mediaData) => {
            return {
                id: 'new-msg-123',
                order_id: orderId,
                sender_id: senderId,
                recipient_id: recipientId,
                content: content,
                message_type: messageType,
                media_url: mediaData?.mediaUrl || null,
                media_type: mediaData?.mediaType || null,
                media_size: mediaData?.mediaSize || null,
                thumbnail_url: mediaData?.thumbnailUrl || null
            };
        });
        jest.spyOn(messagingService, 'getOrderMessages').mockResolvedValue({
            messages: [{
                id: 'msg-1',
                order_id: 'test-order-123',
                sender_id: 'test-user-123',
                recipient_id: 'test-recipient-456',
                content: 'test content',
                message_type: 'image',
                media_url: '/uploads/images/test_123.jpg',
                media_type: 'image',
                media_size: 50000,
                created_at: new Date(),
                sender_name: 'Test User',
                recipient_name: 'Test Recipient'
            }],
            totalCount: 1,
            totalPages: 1,
            currentPage: 1
        });
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('POST /api/uploads/image', () => {
        it('should upload an image successfully', async () => {
            const testImagePath = path.join(__dirname, 'fixtures', 'test-image.jpg');

            if (!fs.existsSync(path.dirname(testImagePath))) {
                fs.mkdirSync(path.dirname(testImagePath), { recursive: true });
            }

            const testImageBuffer = Buffer.from([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
                0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
                0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43
            ]);
            fs.writeFileSync(testImagePath, testImageBuffer);

            const response = await request(app)
                .post('/api/uploads/image')
                .set('Cookie', [`token=${token}`])
                .field('orderId', orderId)
                .attach('file', testImagePath);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.mediaUrl).toBeDefined();
            expect(response.body.mediaType).toBe('image');
        });

        it('should reject oversized images', async () => {
            const response = await request(app)
                .post('/api/uploads/image')
                .set('Cookie', [`token=${token}`])
                .field('orderId', orderId)
                .attach('file', Buffer.alloc(11 * 1024 * 1024), 'large.jpg');

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('File too large');
        });

        it('should reject invalid file types', async () => {
            const response = await request(app)
                .post('/api/uploads/image')
                .set('Cookie', [`token=${token}`])
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
            const testVideoBuffer = Buffer.from('fake video content');

            const response = await request(app)
                .post('/api/uploads/video')
                .set('Cookie', [`token=${token}`])
                .field('orderId', orderId)
                .attach('file', testVideoBuffer, 'test.mp4');

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.mediaType).toBe('video');
        });

        it('should reject oversized videos', async () => {
            const response = await request(app)
                .post('/api/uploads/video')
                .set('Cookie', [`token=${token}`])
                .field('orderId', orderId)
                .attach('file', Buffer.alloc(51 * 1024 * 1024), 'large.mp4');

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/uploads/voice', () => {
        it('should upload a voice recording successfully', async () => {
            const testAudioBuffer = Buffer.from('fake audio content');

            const response = await request(app)
                .post('/api/uploads/voice')
                .set('Cookie', [`token=${token}`])
                .field('orderId', orderId)
                .attach('file', testAudioBuffer, { filename: 'voice.webm', contentType: 'audio/webm' });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.mediaType).toBe('voice');
        });

        it('should reject oversized voice recordings', async () => {
            const response = await request(app)
                .post('/api/uploads/voice')
                .set('Cookie', [`token=${token}`])
                .field('orderId', orderId)
                .attach('file', Buffer.alloc(6 * 1024 * 1024), 'large.webm');

            expect(response.status).toBe(400);
        });
    });

    describe('Media Messages API', () => {
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
                    .set('Cookie', [`token=${token}`])
                    .send({
                        orderId,
                        recipientId,
                        content: 'Check out this image!',
                        messageType: 'image',
                        mediaData
                    });

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
                // Database returns snake_case fields
                expect(response.body.message.media_url).toBe(mediaData.mediaUrl);
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
                    .set('Cookie', [`token=${token}`])
                    .send({
                        orderId,
                        recipientId,
                        content: '',
                        messageType: 'voice',
                        mediaData
                    });

                expect(response.status).toBe(201);
                expect(response.body.success).toBe(true);
                expect(response.body.message.media_url).toBe(mediaData.mediaUrl);
            });

            it('should reject message without content or media', async () => {
                const response = await request(app)
                    .post('/api/messages')
                    .set('Cookie', [`token=${token}`])
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
                    .set('Cookie', [`token=${token}`]);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
                expect(response.body.messages).toBeDefined();

                // Check that media fields are included (snake_case from DB)
                if (response.body.messages.length > 0) {
                    const message = response.body.messages[0];
                    expect(message).toHaveProperty('media_url');
                    expect(message).toHaveProperty('media_type');
                    expect(message).toHaveProperty('media_size');
                }
            });
        });
    });
});
