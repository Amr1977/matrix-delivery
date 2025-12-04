import LogBatcher from '../services/logBatcher';

describe('LogBatcher', () => {
    let batcher;
    let originalFetch;
    let originalNavigator;
    let originalLocalStorage;

    beforeEach(() => {
        // Mock fetch
        originalFetch = global.fetch;
        global.fetch = jest.fn();

        // Mock navigator.sendBeacon
        originalNavigator = global.navigator;
        global.navigator = {
            ...originalNavigator,
            onLine: true,
            sendBeacon: jest.fn()
        };

        // Mock localStorage
        originalLocalStorage = global.localStorage;
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn()
        };

        batcher = new LogBatcher('http://localhost:5000/api');
    });

    afterEach(() => {
        global.fetch = originalFetch;
        global.navigator = originalNavigator;
        global.localStorage = originalLocalStorage;
        jest.clearAllTimers();
    });

    describe('addLog', () => {
        it('should add log to queue', () => {
            batcher.addLog({ level: 'error', message: 'Test error' });

            expect(batcher.queue.length).toBe(1);
            expect(batcher.queue[0].message).toBe('Test error');
        });

        it('should add timestamp if not provided', () => {
            batcher.addLog({ level: 'error', message: 'Test error' });

            expect(batcher.queue[0].timestamp).toBeDefined();
        });

        it('should flush when batch size is reached', async () => {
            global.fetch.mockResolvedValue({ ok: true });
            localStorage.getItem.mockReturnValue('test-token');

            // Add 50 logs to trigger flush
            for (let i = 0; i < 50; i++) {
                batcher.addLog({ level: 'info', message: `Log ${i}` });
            }

            // Wait for flush
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('flush', () => {
        it('should send logs to backend', async () => {
            global.fetch.mockResolvedValue({ ok: true });
            localStorage.getItem.mockReturnValue('test-token');

            batcher.addLog({ level: 'error', message: 'Test error' });
            await batcher.flush();

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/logs/frontend',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer test-token'
                    })
                })
            );
        });

        it('should not send if queue is empty', async () => {
            await batcher.flush();

            expect(global.fetch).not.toHaveBeenCalled();
        });

        it('should not send if already flushing', async () => {
            global.fetch.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 1000)));
            localStorage.getItem.mockReturnValue('test-token');

            batcher.addLog({ level: 'error', message: 'Test 1' });
            batcher.flush(); // First flush
            batcher.addLog({ level: 'error', message: 'Test 2' });
            await batcher.flush(); // Second flush (should be ignored)

            expect(global.fetch).toHaveBeenCalledTimes(1);
        });

        it('should save to localStorage if offline', async () => {
            global.navigator.onLine = false;
            batcher.isOnline = false;

            batcher.addLog({ level: 'error', message: 'Offline log' });
            await batcher.flush();

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'pendingLogs',
                expect.any(String)
            );
        });
    });

    describe('sendLogs', () => {
        it('should retry on failure', async () => {
            global.fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ ok: true });

            localStorage.getItem.mockReturnValue('test-token');

            const logs = [{ level: 'error', message: 'Test' }];
            await batcher.sendLogs(logs);

            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            localStorage.getItem.mockReturnValue('test-token');

            const logs = [{ level: 'error', message: 'Test' }];

            await expect(batcher.sendLogs(logs)).rejects.toThrow('Network error');
            expect(global.fetch).toHaveBeenCalledTimes(3);
        });

        it('should not send without token', async () => {
            localStorage.getItem.mockReturnValue(null);

            const logs = [{ level: 'error', message: 'Test' }];
            await batcher.sendLogs(logs);

            expect(global.fetch).not.toHaveBeenCalled();
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'pendingLogs',
                expect.any(String)
            );
        });
    });

    describe('localStorage persistence', () => {
        it('should save logs to localStorage', () => {
            batcher.addLog({ level: 'error', message: 'Test' });
            batcher.saveToLocalStorage();

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'pendingLogs',
                expect.stringContaining('Test')
            );
        });

        it('should load logs from localStorage', () => {
            const savedLogs = [{ level: 'error', message: 'Saved log' }];
            localStorage.getItem.mockReturnValue(JSON.stringify(savedLogs));

            batcher.loadFromLocalStorage();

            expect(batcher.queue.length).toBe(1);
            expect(batcher.queue[0].message).toBe('Saved log');
        });

        it('should limit localStorage to 500 logs', () => {
            const logs = Array(600).fill({ level: 'info', message: 'Test' });
            batcher.queue = logs;
            batcher.saveToLocalStorage();

            const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
            expect(savedData.length).toBe(500);
        });

        it('should handle invalid localStorage data', () => {
            localStorage.getItem.mockReturnValue('invalid json');

            expect(() => batcher.loadFromLocalStorage()).not.toThrow();
            expect(batcher.queue.length).toBe(0);
        });
    });

    describe('flushSync', () => {
        it('should use sendBeacon for page unload', () => {
            localStorage.getItem.mockReturnValue('test-token');
            batcher.addLog({ level: 'error', message: 'Unload log' });

            batcher.flushSync();

            expect(navigator.sendBeacon).toHaveBeenCalled();
        });

        it('should save to localStorage as fallback', () => {
            batcher.addLog({ level: 'error', message: 'Unload log' });

            batcher.flushSync();

            expect(localStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('online/offline handling', () => {
        it('should flush when coming online', async () => {
            global.fetch.mockResolvedValue({ ok: true });
            localStorage.getItem.mockReturnValue('test-token');

            // Simulate offline
            batcher.isOnline = false;
            batcher.addLog({ level: 'error', message: 'Offline log' });

            // Simulate coming online
            batcher.isOnline = true;
            window.dispatchEvent(new Event('online'));

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(global.fetch).toHaveBeenCalled();
        });

        it('should save to localStorage when going offline', () => {
            batcher.addLog({ level: 'error', message: 'Going offline' });

            window.dispatchEvent(new Event('offline'));

            expect(batcher.isOnline).toBe(false);
        });
    });
});
