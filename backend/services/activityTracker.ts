import { Pool } from 'pg';

/**
 * Activity Tracker Service
 * Tracks user activity with in-memory cache and periodic database commits
 * Reduces database load by batching updates
 */
class ActivityTracker {
    private static instance: ActivityTracker;
    private pool: Pool | null = null;
    private activityCache: Map<string, Date> = new Map();
    private commitInterval: NodeJS.Timeout | null = null;
    private readonly COMMIT_INTERVAL_MS = 7 * 60 * 1000; // 7 minutes

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): ActivityTracker {
        if (!ActivityTracker.instance) {
            ActivityTracker.instance = new ActivityTracker();
        }
        return ActivityTracker.instance;
    }

    /**
     * Initialize with database pool
     */
    public initialize(pool: Pool): void {
        this.pool = pool;
        console.log('✅ ActivityTracker initialized');
    }

    /**
     * Record user activity in memory cache
     * @param userId - User ID to record activity for
     */
    public recordActivity(userId: string): void {
        if (!userId) {
            console.warn('⚠️ ActivityTracker: Cannot record activity for undefined userId');
            return;
        }

        const isFirstActivity = !this.activityCache.has(userId);
        this.activityCache.set(userId, new Date());

        // Log only in debug mode to avoid spam
        if (process.env.LOG_LEVEL === 'debug') {
            console.log(`📊 Activity recorded for user ${userId} (cache size: ${this.activityCache.size})`);
        }

        // Immediate commit on first activity for faster online status
        if (isFirstActivity) {
            console.log(`⚡ First activity for user ${userId}, triggering immediate commit`);
            this.commitToDatabase().catch(err =>
                console.error('Immediate commit error:', err)
            );
        }
    }

    /**
     * Commit cached activities to database
     * Batch updates all users in a single transaction
     */
    public async commitToDatabase(): Promise<void> {
        if (!this.pool) {
            console.error('❌ ActivityTracker: Database pool not initialized');
            return;
        }

        if (this.activityCache.size === 0) {
            return; // Nothing to commit
        }

        const client = await this.pool.connect();

        try {
            await client.query('BEGIN');

            // Batch update all users
            const updates = Array.from(this.activityCache.entries());

            for (const [userId, timestamp] of updates) {
                await client.query(
                    'UPDATE users SET last_active = $1 WHERE id = $2',
                    [timestamp, userId]
                );
            }

            await client.query('COMMIT');

            console.log(`✅ ActivityTracker: Committed ${updates.length} user activities to database`);

            // Clear cache after successful commit
            this.activityCache.clear();

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ ActivityTracker: Failed to commit activities:', error);
            // Don't clear cache on error - will retry on next commit
        } finally {
            client.release();
        }
    }

    /**
     * Start periodic commits to database
     */
    public startPeriodicCommit(): void {
        if (this.commitInterval) {
            console.warn('⚠️ ActivityTracker: Periodic commit already running');
            return;
        }

        // Commit immediately on start
        this.commitToDatabase().catch(err =>
            console.error('ActivityTracker initial commit error:', err)
        );

        // Then commit every 7 minutes
        this.commitInterval = setInterval(() => {
            this.commitToDatabase().catch(err =>
                console.error('ActivityTracker periodic commit error:', err)
            );
        }, this.COMMIT_INTERVAL_MS);

        console.log(`✅ ActivityTracker: Started periodic commits (every ${this.COMMIT_INTERVAL_MS / 1000}s)`);
    }

    /**
     * Stop periodic commits (for graceful shutdown)
     */
    public stopPeriodicCommit(): void {
        if (this.commitInterval) {
            clearInterval(this.commitInterval);
            this.commitInterval = null;
            console.log('✅ ActivityTracker: Stopped periodic commits');
        }
    }

    /**
     * Get current cache size (for monitoring)
     */
    public getCacheSize(): number {
        return this.activityCache.size;
    }

    /**
     * Force immediate commit (for testing or shutdown)
     */
    public async flush(): Promise<void> {
        await this.commitToDatabase();
    }
}

// Export singleton instance
export const activityTracker = ActivityTracker.getInstance();
