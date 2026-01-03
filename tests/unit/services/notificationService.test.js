const { Pool } = require('pg');
const { NotificationService, initializeNotificationService, getNotificationService, createNotification } = require('../../../backend/services/notificationService.ts');

// Mock Socket.IO
const mockIo = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn()
};

// Mock logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock pool
const mockPool = {
    query: jest.fn()
};

describe('NotificationService', () => {
    let notificationService;

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();

        // Create a new instance for each test
        notificationService = new NotificationService(mockPool, mockIo, mockLogger);
    });

    describe('createNotification', () => {
        it('should create a notification and emit via WebSocket', async () => {
            const mockNotification = {
                id: 1,
                user_id: 'user-123',
                order_id: 'order-456',
                type: 'new_bid',
                title: 'New Bid Received',
                message: 'Driver placed a bid on your order',
                is_read: false,
                created_at: new Date()
            };

            mockPool.query.mockResolvedValue({
                rows: [mockNotification]
            });

            const result = await notificationService.createNotification({
                userId: 'user-123',
                orderId: 'order-456',
                type: 'new_bid',
                title: 'New Bid Received',
                message: 'Driver placed a bid on your order'
            });

            // Verify database insert
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notifications'),
                ['user-123', 'order-456', 'new_bid', 'New Bid Received', 'Driver placed a bid on your order']
            );

            // Verify WebSocket emission
            expect(mockIo.to).toHaveBeenCalledWith('user_user-123');
            expect(mockIo.emit).toHaveBeenCalledWith('notification', {
                id: 1,
                orderId: 'order-456',
                type: 'new_bid',
                title: 'New Bid Received',
                message: 'Driver placed a bid on your order',
                isRead: false,
                createdAt: mockNotification.created_at
            });

            // Verify logging
            expect(mockLogger.info).toHaveBeenCalledWith(
                'Real-time notification sent',
                expect.objectContaining({
                    userId: 'user-123',
                    title: 'New Bid Received',
                    category: 'notification'
                })
            );

            // Verify return value
            expect(result).toEqual(mockNotification);
        });

        it('should create notification without WebSocket when io is null', async () => {
            const serviceWithoutIo = new NotificationService(mockPool, null, mockLogger);

            const mockNotification = {
                id: 2,
                user_id: 'user-789',
                order_id: null,
                type: 'account_verified',
                title: 'Account Verified',
                message: 'Your account has been verified',
                is_read: false,
                created_at: new Date()
            };

            mockPool.query.mockResolvedValue({
                rows: [mockNotification]
            });

            const result = await serviceWithoutIo.createNotification({
                userId: 'user-789',
                orderId: null,
                type: 'account_verified',
                title: 'Account Verified',
                message: 'Your account has been verified'
            });

            // Verify database insert
            expect(mockPool.query).toHaveBeenCalled();

            // Verify NO WebSocket emission
            expect(mockIo.to).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();

            // Verify return value
            expect(result).toEqual(mockNotification);
        });

        it('should handle database errors gracefully', async () => {
            const dbError = new Error('Database connection failed');
            mockPool.query.mockRejectedValue(dbError);

            const result = await notificationService.createNotification({
                userId: 'user-123',
                orderId: 'order-456',
                type: 'new_bid',
                title: 'New Bid',
                message: 'Test message'
            });

            // Verify error logging
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error creating notification:',
                dbError
            );

            // Verify null return on error
            expect(result).toBeNull();
        });

        it('should handle null orderId correctly', async () => {
            const mockNotification = {
                id: 3,
                user_id: 'user-123',
                order_id: null,
                type: 'system_message',
                title: 'System Message',
                message: 'System notification',
                is_read: false,
                created_at: new Date()
            };

            mockPool.query.mockResolvedValue({
                rows: [mockNotification]
            });

            const result = await notificationService.createNotification({
                userId: 'user-123',
                orderId: null,
                type: 'system_message',
                title: 'System Message',
                message: 'System notification'
            });

            // Verify database insert with null orderId
            expect(mockPool.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO notifications'),
                ['user-123', null, 'system_message', 'System Message', 'System notification']
            );

            expect(result).toEqual(mockNotification);
        });
    });

    describe('create (legacy method)', () => {
        it('should work with legacy function signature', async () => {
            const mockNotification = {
                id: 4,
                user_id: 'user-123',
                order_id: 'order-456',
                type: 'test',
                title: 'Test',
                message: 'Test message',
                is_read: false,
                created_at: new Date()
            };

            mockPool.query.mockResolvedValue({
                rows: [mockNotification]
            });

            const result = await notificationService.create(
                'user-123',
                'order-456',
                'test',
                'Test',
                'Test message'
            );

            expect(result).toEqual(mockNotification);
        });
    });

    describe('Singleton pattern', () => {
        it('should initialize singleton instance', () => {
            const instance = initializeNotificationService(mockPool, mockIo, mockLogger);

            expect(instance).toBeInstanceOf(NotificationService);
        });

        it('should return same instance from getNotificationService', () => {
            const instance1 = initializeNotificationService(mockPool, mockIo, mockLogger);
            const instance2 = getNotificationService();

            expect(instance1).toBe(instance2);
        });

        it('should throw error if getNotificationService called before initialization', () => {
            jest.resetModules();
            const { getNotificationService: freshGet } = require('../../../backend/services/notificationService.ts');

            expect(() => freshGet()).toThrow('NotificationService has not been initialized');
        });

        it('should work with createNotification helper function', async () => {
            initializeNotificationService(mockPool, mockIo, mockLogger);

            const mockNotification = {
                id: 5,
                user_id: 'user-123',
                order_id: 'order-456',
                type: 'test',
                title: 'Test',
                message: 'Test message',
                is_read: false,
                created_at: new Date()
            };

            mockPool.query.mockResolvedValue({
                rows: [mockNotification]
            });

            const result = await createNotification(
                'user-123',
                'order-456',
                'test',
                'Test',
                'Test message'
            );

            expect(result).toEqual(mockNotification);
        });
    });

    describe('Integration scenarios', () => {
        it('should handle multiple notifications for same user', async () => {
            const notifications = [
                { id: 1, user_id: 'user-123', type: 'bid1' },
                { id: 2, user_id: 'user-123', type: 'bid2' },
                { id: 3, user_id: 'user-123', type: 'bid3' }
            ];

            for (let i = 0; i < notifications.length; i++) {
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                        ...notifications[i],
                        order_id: 'order-456',
                        title: `Notification ${i + 1}`,
                        message: `Message ${i + 1}`,
                        is_read: false,
                        created_at: new Date()
                    }]
                });

                await notificationService.createNotification({
                    userId: 'user-123',
                    orderId: 'order-456',
                    type: notifications[i].type,
                    title: `Notification ${i + 1}`,
                    message: `Message ${i + 1}`
                });
            }

            // Verify all notifications were created
            expect(mockPool.query).toHaveBeenCalledTimes(3);

            // Verify all were emitted to the same user room
            expect(mockIo.to).toHaveBeenCalledTimes(3);
            expect(mockIo.to).toHaveBeenCalledWith('user_user-123');
        });

        it('should handle different notification types', async () => {
            const types = [
                'new_bid',
                'bid_accepted',
                'order_picked_up',
                'order_in_transit',
                'order_delivered',
                'account_verified',
                'account_suspended'
            ];

            for (const type of types) {
                mockPool.query.mockResolvedValueOnce({
                    rows: [{
                        id: 1,
                        user_id: 'user-123',
                        order_id: type.includes('order') || type.includes('bid') ? 'order-456' : null,
                        type,
                        title: `Title for ${type}`,
                        message: `Message for ${type}`,
                        is_read: false,
                        created_at: new Date()
                    }]
                });

                await notificationService.createNotification({
                    userId: 'user-123',
                    orderId: type.includes('order') || type.includes('bid') ? 'order-456' : null,
                    type,
                    title: `Title for ${type}`,
                    message: `Message for ${type}`
                });
            }

            expect(mockPool.query).toHaveBeenCalledTimes(types.length);
        });
    });
});
