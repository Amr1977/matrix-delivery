import express, { Request, Response } from 'express';
import { activityTracker } from '../services/activityTracker';

const router = express.Router();

// Extend Express Request type to include user from JWT
interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        primary_role?: string;
        granted_roles?: string[];
    };
}

/**
 * POST /api/heartbeat
 * Record user activity heartbeat
 * Requires authentication
 */
router.post('/', (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Record activity in memory cache (fast, no DB wait)
        activityTracker.recordActivity(userId);

        // Return success immediately
        res.json({ success: true });

    } catch (error) {
        console.error('Heartbeat error:', error);
        res.status(500).json({ error: 'Failed to record heartbeat' });
    }
});

/**
 * GET /api/heartbeat/stats
 * Get activity tracker statistics (for monitoring)
 * Requires admin authentication
 */
router.get('/stats', (req: AuthRequest, res: Response) => {
    try {
        const cacheSize = activityTracker.getCacheSize();

        res.json({
            cacheSize,
            status: 'active'
        });

    } catch (error) {
        console.error('Heartbeat stats error:', error);
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

export default router;
