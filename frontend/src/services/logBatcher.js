/**
 * Log Batcher Service
 * Batches frontend logs and sends them to backend efficiently
 */
class LogBatcher {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.queue = [];
        this.maxBatchSize = 50;
        this.flushInterval = 10000; // 10 seconds
        this.retryAttempts = 3;
        this.retryDelay = 2000;
        this.isOnline = navigator.onLine;
        this.isFlushing = false;

        // Start periodic flush
        this.startPeriodicFlush();

        // Handle online/offline events
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.loadFromLocalStorage();
            this.flush();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });

        // Flush on page unload
        window.addEventListener('beforeunload', () => {
            this.flushSync();
        });

        // Load any pending logs from localStorage
        this.loadFromLocalStorage();
    }

    /**
     * Add a log to the batch queue
     * @param {Object} logData - Log entry data
     */
    addLog(logData) {
        this.queue.push({
            ...logData,
            timestamp: logData.timestamp || new Date().toISOString()
        });

        // Flush if batch is full
        if (this.queue.length >= this.maxBatchSize) {
            this.flush();
        }
    }

    /**
     * Start periodic flush timer
     */
    startPeriodicFlush() {
        setInterval(() => {
            if (this.queue.length > 0) {
                this.flush();
            }
        }, this.flushInterval);
    }

    /**
     * Flush logs to backend
     */
    async flush() {
        if (this.isFlushing || this.queue.length === 0) {
            return;
        }

        if (!this.isOnline) {
            this.saveToLocalStorage();
            return;
        }

        this.isFlushing = true;
        const logsToSend = [...this.queue];
        this.queue = [];

        try {
            await this.sendLogs(logsToSend);
        } catch (error) {
            // If send fails, put logs back in queue
            this.queue = [...logsToSend, ...this.queue];
            this.saveToLocalStorage();
            console.error('Failed to send logs to backend:', error);
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Synchronous flush for page unload
     */
    flushSync() {
        if (this.queue.length === 0) {
            return;
        }

        // Save to localStorage as fallback
        this.saveToLocalStorage();

        // Try to send with sendBeacon (best effort)
        const token = localStorage.getItem('token');
        if (token && this.isOnline) {
            const blob = new Blob([JSON.stringify(this.queue)], {
                type: 'application/json'
            });

            try {
                navigator.sendBeacon(
                    `${this.apiUrl}/logs/frontend?token=${token}`,
                    blob
                );
            } catch (error) {
                console.error('Failed to send logs via sendBeacon:', error);
            }
        }
    }

    /**
     * Send logs to backend (DISABLED)
     * @param {Array} logs - Array of log entries
     * @param {number} attempt - Current retry attempt
     */
    async sendLogs(logs, attempt = 1) {
        // Feature disabled as backend endpoint has been removed
        // Just clear the queue to prevent memory leaks
        this.clearLocalStorage();
        return;
    }

    /**
     * Save pending logs to localStorage
     */
    saveToLocalStorage() {
        try {
            const existing = this.loadFromLocalStorageRaw();
            const combined = [...existing, ...this.queue];

            // Keep only last 500 logs to avoid localStorage overflow
            const toSave = combined.slice(-500);

            localStorage.setItem('pendingLogs', JSON.stringify(toSave));
        } catch (error) {
            console.error('Failed to save logs to localStorage:', error);
        }
    }

    /**
     * Load pending logs from localStorage
     */
    loadFromLocalStorage() {
        const logs = this.loadFromLocalStorageRaw();
        if (logs.length > 0) {
            this.queue = [...logs, ...this.queue];
            this.clearLocalStorage();

            // Try to flush loaded logs
            if (this.isOnline) {
                this.flush();
            }
        }
    }

    /**
     * Load raw logs from localStorage
     * @returns {Array} Array of log entries
     */
    loadFromLocalStorageRaw() {
        try {
            const stored = localStorage.getItem('pendingLogs');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Failed to load logs from localStorage:', error);
            return [];
        }
    }

    /**
     * Clear logs from localStorage
     */
    clearLocalStorage() {
        try {
            localStorage.removeItem('pendingLogs');
        } catch (error) {
            console.error('Failed to clear logs from localStorage:', error);
        }
    }
}

export default LogBatcher;
