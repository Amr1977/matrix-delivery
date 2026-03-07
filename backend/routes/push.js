const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getPushService } = require('../services/pushNotificationService');

/**
 * POST /api/push/register
 * Register FCM token for authenticated user
 * 
 * Security: CSRF protected via app.use('/api', csrfMiddleware) in app.js
 * The frontend api.js already handles CSRF token automatically
 */
router.post('/register', requireAuth, async (req, res) => {
    try {
        const { token, deviceInfo } = req.body;
        const userId = req.user.userId;
        const role = req.user.primary_role || req.user.role;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'token is required' });
        }

        const pushService = getPushService();
        await pushService.registerToken(userId, role, token, deviceInfo);

        res.json({ ok: true });
    } catch (error) {
        console.error('Token registration error:', error);
        res.status(500).json({ error: 'Failed to register token' });
    }
});

/**
 * POST /api/push/unregister
 * Deactivate FCM token (on logout)
 */
router.post('/unregister', requireAuth, async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'token is required' });
        }

        const pushService = getPushService();
        await pushService.deactivateToken(token);

        res.json({ ok: true });
    } catch (error) {
        console.error('Token unregistration error:', error);
        res.status(500).json({ error: 'Failed to unregister token' });
    }
});

module.exports = router;