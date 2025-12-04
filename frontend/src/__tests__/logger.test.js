import logger from '../logger';
import LogBatcher from '../services/logBatcher';

// Mock LogBatcher
jest.mock('../services/logBatcher');

describe('Frontend Logger', () => {
    let originalConsole;
    let originalWindowError;
    let originalWindowRejection;

    beforeEach(() => {
        // Store original console methods
        originalConsole = {
            error: console.error,
            warn: console.warn,
            info: console.info,
            log: console.log
        };

        // Store original window handlers
        originalWindowError = window.onerror;
        originalWindowRejection = window.onunhandledrejection;

        // Clear mock
        LogBatcher.mockClear();
    });

    afterEach(() => {
        // Restore original console methods
        console.error = originalConsole.error;
        console.warn = originalConsole.warn;
        console.info = originalConsole.info;
        console.log = originalConsole.log;

        // Restore window handlers
        window.onerror = originalWindowError;
        window.onunhandledrejection = originalWindowRejection;
    });

    describe('Log Levels', () => {
        it('should log error messages', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.error('Test error', { foo: 'bar' });

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    message: 'Test error',
                    category: 'error'
                })
            );
        });

        it('should log warning messages', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.warn('Test warning', { foo: 'bar' });

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'warn',
                    message: 'Test warning',
                    category: 'warning'
                })
            );
        });

        it('should log info messages', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.info('Test info', { foo: 'bar' });

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    message: 'Test info',
                    category: 'info'
                })
            );
        });

        it('should not send debug logs to backend', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.debug('Test debug', { foo: 'bar' });

            expect(mockAddLog).not.toHaveBeenCalled();
        });
    });

    describe('Specialized Logging Methods', () => {
        it('should log API calls', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.api('GET', '/api/test', 200, 150);

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    category: 'api',
                    method: 'GET',
                    url: '/api/test',
                    statusCode: 200,
                    durationMs: 150
                })
            );
        });

        it('should log API errors', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.api('POST', '/api/test', 500, 200);

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    category: 'api',
                    statusCode: 500
                })
            );
        });

        it('should log user actions', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.user('button_click', { buttonId: 'submit' });

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    category: 'user',
                    action: 'button_click'
                })
            );
        });

        it('should log performance metrics', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.performance('page_load', 1500);

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'info',
                    category: 'performance',
                    action: 'page_load',
                    durationMs: 1500
                })
            );
        });
    });

    describe('Console Override', () => {
        it('should capture console.error calls', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            console.error('Test console error', { data: 'test' });

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    category: 'console'
                })
            );
        });

        it('should capture console.warn calls', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            console.warn('Test console warning');

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'warn',
                    category: 'console'
                })
            );
        });
    });

    describe('Global Error Handlers', () => {
        it('should capture uncaught errors', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            // Trigger window.onerror
            const error = new Error('Uncaught error');
            window.onerror('Uncaught error', 'test.js', 10, 5, error);

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    category: 'uncaught_error',
                    message: 'Uncaught JavaScript error'
                })
            );
        });

        it('should capture unhandled promise rejections', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            // Trigger window.onunhandledrejection
            const event = {
                reason: 'Promise rejection reason',
                promise: Promise.reject('test')
            };
            window.onunhandledrejection(event);

            expect(mockAddLog).toHaveBeenCalledWith(
                expect.objectContaining({
                    level: 'error',
                    category: 'unhandled_rejection',
                    message: 'Unhandled Promise Rejection'
                })
            );
        });
    });

    describe('Log Formatting', () => {
        it('should include timestamp', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.error('Test');

            const call = mockAddLog.mock.calls[0][0];
            expect(call.timestamp).toBeDefined();
            expect(new Date(call.timestamp)).toBeInstanceOf(Date);
        });

        it('should include session ID', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.error('Test');

            const call = mockAddLog.mock.calls[0][0];
            expect(call.sessionId).toBeDefined();
        });

        it('should include current URL', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.error('Test');

            const call = mockAddLog.mock.calls[0][0];
            expect(call.url).toBeDefined();
            expect(call.url).toContain('localhost');
        });

        it('should include user agent', () => {
            const mockAddLog = jest.fn();
            logger.batcher = { addLog: mockAddLog };

            logger.error('Test');

            const call = mockAddLog.mock.calls[0][0];
            expect(call.userAgent).toBeDefined();
        });
    });

    describe('Flush Method', () => {
        it('should call batcher flush', () => {
            const mockFlush = jest.fn();
            logger.batcher = { flush: mockFlush };

            logger.flush();

            expect(mockFlush).toHaveBeenCalled();
        });
    });
});
