const { logAdminAction } = require('../../../../services/adminService');
const pool = require('../../../../config/db');

// Mock the database pool
jest.mock('../../../../config/db');

describe('Admin Service - Unit Tests', () => {
    let mockQuery;

    beforeEach(() => {
        jest.clearAllMocks();
        mockQuery = jest.fn();
        pool.query = mockQuery;
    });

    describe('logAdminAction', () => {
        it('should log admin action successfully', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

            await logAdminAction('admin-123', 'USER_SUSPEND', 'user', 'user-456', {
                reason: 'Violation',
                ip: '127.0.0.1'
            });

            expect(mockQuery).toHaveBeenCalledTimes(1);
            expect(mockQuery).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO admin_logs'),
                expect.arrayContaining([
                    'admin-123',
                    'USER_SUSPEND',
                    'user',
                    'user-456',
                    expect.stringContaining('Violation'),
                    '127.0.0.1'
                ])
            );
        });

        it('should use "unknown" as default IP if not provided', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

            await logAdminAction('admin-123', 'VIEW_STATS', 'dashboard', null, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['unknown'])
            );
        });

        it('should stringify details object', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

            const details = { key: 'value', nested: { data: 123 } };
            await logAdminAction('admin-123', 'TEST', 'test', 'test-id', details);

            const callArgs = mockQuery.mock.calls[0][1];
            const detailsArg = callArgs[4];

            expect(typeof detailsArg).toBe('string');
            expect(JSON.parse(detailsArg)).toEqual(details);
        });

        it('should handle database errors gracefully', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            mockQuery.mockRejectedValue(new Error('Database error'));

            // Should not throw
            await expect(
                logAdminAction('admin-123', 'TEST', 'test', 'test-id', {})
            ).resolves.not.toThrow();

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Log admin action error:',
                expect.any(Error)
            );

            consoleErrorSpy.mockRestore();
        });

        it('should handle null targetId', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

            await logAdminAction('admin-123', 'VIEW_DASHBOARD', 'dashboard', null, {});

            expect(mockQuery).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining([null])
            );
        });

        it('should include all required fields in query', async () => {
            mockQuery.mockResolvedValue({ rows: [], rowCount: 1 });

            await logAdminAction('admin-123', 'DELETE_USER', 'user', 'user-789', {
                userName: 'Test User',
                ip: '192.168.1.1'
            });

            const [query, params] = mockQuery.mock.calls[0];

            expect(query).toContain('admin_id');
            expect(query).toContain('action');
            expect(query).toContain('target_type');
            expect(query).toContain('target_id');
            expect(query).toContain('details');
            expect(query).toContain('ip_address');
            expect(query).toContain('created_at');

            expect(params).toHaveLength(6);
        });
    });
});
