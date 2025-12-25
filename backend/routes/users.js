const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const logger = require('../config/logger');

// NOTE: Route paths here are relative to /api/users
// So /api/users/:id/reputation -> /:id/reputation

/**
 * GET /api/users/:id/reputation
 * Get user reputation data
 */
router.get('/:id/reputation', verifyToken, async (req, res, next) => {
    try {
        const userResult = await pool.query(
            'SELECT id, name, primary_role, rating, completed_deliveries, is_verified, created_at FROM users WHERE id = $1',
            [req.params.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get review statistics
        const reviewStatsResult = await pool.query(
            `SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(CASE WHEN rating >= 4 THEN 1 END) as positive_reviews,
        COUNT(CASE WHEN rating <= 2 THEN 1 END) as negative_reviews
       FROM reviews WHERE reviewee_id = $1`,
            [req.params.id]
        );

        const reviewStats = reviewStatsResult.rows[0];

        // Get recent reviews (last 10)
        const recentReviewsResult = await pool.query(
            `SELECT r.rating, r.comment, r.created_at, reviewer.name as reviewer_name
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC LIMIT 10`,
            [req.params.id]
        );

        res.json({
            user: {
                id: user.id,
                name: user.name,
                primary_role: user.primary_role,
                rating: parseFloat(user.rating),
                completedDeliveries: user.completed_deliveries,
                isVerified: user.is_verified,
                joinedAt: user.created_at
            },
            stats: {
                totalReviews: parseInt(reviewStats.total_reviews),
                averageRating: parseFloat(reviewStats.avg_rating) || 0,
                positiveReviews: parseInt(reviewStats.positive_reviews),
                negativeReviews: parseInt(reviewStats.negative_reviews)
            },
            recentReviews: recentReviewsResult.rows.map(review => ({
                rating: review.rating,
                comment: review.comment,
                createdAt: review.created_at,
                reviewerName: review.reviewer_name
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/:id/reviews/received
 * Get all reviews received by a user
 */
router.get('/:id/reviews/received', verifyToken, async (req, res, next) => {
    try {
        const userResult = await pool.query(
            'SELECT id, name, primary_role FROM users WHERE id = $1',
            [req.params.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get all reviews received by this user
        const reviewsResult = await pool.query(
            `SELECT r.*, reviewer.name as reviewer_name, reviewer.primary_role as reviewer_role,
              o.title as order_title, o.order_number
       FROM reviews r
       JOIN users reviewer ON r.reviewer_id = reviewer.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC`,
            [req.params.id]
        );

        res.json({
            user: {
                id: user.id,
                name: user.name,
                primary_role: user.primary_role
            },
            reviews: reviewsResult.rows.map(review => ({
                id: review.id,
                reviewType: review.review_type,
                rating: review.rating,
                comment: review.comment,
                professionalismRating: review.professionalism_rating,
                communicationRating: review.communication_rating,
                timelinessRating: review.timeliness_rating,
                conditionRating: review.condition_rating,
                createdAt: review.created_at,
                reviewerName: review.reviewer_name,
                reviewerRole: review.reviewer_role,
                orderTitle: review.order_title,
                orderNumber: review.order_number
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/:id/reviews/given
 * Get all reviews given by a user
 */
router.get('/:id/reviews/given', verifyToken, async (req, res, next) => {
    try {
        const userResult = await pool.query(
            'SELECT id, name, primary_role FROM users WHERE id = $1',
            [req.params.id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Get all reviews given by this user
        const reviewsResult = await pool.query(
            `SELECT r.*, reviewee.name as reviewee_name, reviewee.primary_role as reviewee_role,
              o.title as order_title, o.order_number
       FROM reviews r
       LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
       LEFT JOIN orders o ON r.order_id = o.id
       WHERE r.reviewer_id = $1
       ORDER BY r.created_at DESC`,
            [req.params.id]
        );

        res.json({
            user: {
                id: user.id,
                name: user.name,
                primary_role: user.primary_role
            },
            reviews: reviewsResult.rows.map(review => ({
                id: review.id,
                reviewType: review.review_type,
                rating: review.rating,
                comment: review.comment,
                professionalismRating: review.professionalism_rating,
                communicationRating: review.communication_rating,
                timelinessRating: review.timeliness_rating,
                conditionRating: review.condition_rating,
                createdAt: review.created_at,
                revieweeName: review.reviewee_name,
                revieweeRole: review.reviewee_role,
                orderTitle: review.order_title,
                orderNumber: review.order_number
            }))
        });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/me/profile
 * Get own profile
 */
router.get('/me/profile', verifyToken, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT id, 
            name,
            email,
            phone,
            primary_role,
            granted_roles,
            vehicle_type,
            rating,
            completed_deliveries,
            is_available,
            is_verified,
            profile_picture_url,
            license_number,
            service_area_zone,
            preferences,
            notification_prefs,
            two_factor_methods,
            language,
            theme,
            gender,
            document_verification_status,
            verified_at
       FROM users WHERE id = $1`,
            [req.user.userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = result.rows[0];
        const pmCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM user_payment_methods WHERE user_id = $1', [req.user.userId]);
        const favCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM user_favorites WHERE user_id = $1', [req.user.userId]);
        res.json({
            ...user,
            paymentMethodsCount: pmCountRes.rows[0].cnt,
            favoritesCount: favCountRes.rows[0].cnt
        });
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/users/me/profile
 * Update own profile
 */
router.put('/me/profile', verifyToken, async (req, res, next) => {
    try {
        const { name, phone, vehicle_type, license_number, service_area_zone, language, theme, gender } = req.body || {};
        const userRes = await pool.query('SELECT id, granted_roles FROM users WHERE id = $1', [req.user.userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const granted_roles = userRes.rows[0].granted_roles || [];
        const isDriver = Array.isArray(granted_roles) ? granted_roles.includes('driver') : false;

        const updates = [];
        const params = [];
        let i = 1;
        if (name) { updates.push(`name = $${i++}`); params.push(name); }
        if (phone) { updates.push(`phone = $${i++}`); params.push(phone); }
        if (language) { updates.push(`language = $${i++}`); params.push(language); }
        if (theme) { updates.push(`theme = $${i++}`); params.push(theme); }
        if (gender && ['male', 'female'].includes(gender.toLowerCase())) {
            updates.push(`gender = $${i++}`);
            params.push(gender.toLowerCase());
        }
        if (isDriver) {
            if (vehicle_type) { updates.push(`vehicle_type = $${i++}`); params.push(vehicle_type); }
            if (license_number) { updates.push(`license_number = $${i++}`); params.push(license_number); }
            if (service_area_zone) { updates.push(`service_area_zone = $${i++}`); params.push(service_area_zone); }
        }
        if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });
        params.push(req.user.userId);
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
        const result = await pool.query(query, params);
        logger.info('User updated profile', { userId: req.user.userId, category: 'user' });
        res.json({ user: result.rows[0] });
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users/me/profile-picture
 * Upload profile picture (base64)
 */
router.post('/me/profile-picture', verifyToken, async (req, res, next) => {
    try {
        const { imageDataUrl } = req.body || {};
        logger.info(`📸 Profile picture upload - User ID: ${req.user.userId}`);
        logger.info(`📸 Image data length: ${imageDataUrl?.length || 0}`);

        if (!imageDataUrl || typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
            logger.error('❌ Invalid image data');
            return res.status(400).json({ error: 'Invalid image data' });
        }

        const result = await pool.query('UPDATE users SET profile_picture_url = $1 WHERE id = $2 RETURNING profile_picture_url', [imageDataUrl, req.user.userId]);
        logger.info(`✅ Profile picture saved to DB: ${result.rows[0]?.profile_picture_url?.substring(0, 50)}...`);

        logger.info('User updated profile picture', { userId: req.user.userId, category: 'user' });
        res.json({ profilePictureUrl: result.rows[0].profile_picture_url });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/me/preferences
 * Get user preferences
 */
router.get('/me/preferences', verifyToken, async (req, res, next) => {
    try {
        const result = await pool.query('SELECT preferences, notification_prefs, language, theme, two_factor_methods FROM users WHERE id = $1', [req.user.userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * PUT /api/users/me/preferences
 * Update user preferences
 */
router.put('/me/preferences', verifyToken, async (req, res, next) => {
    try {
        const { preferences, notification_prefs, language, theme, two_factor_methods } = req.body || {};
        const result = await pool.query(
            'UPDATE users SET preferences = $1, notification_prefs = $2, language = COALESCE($3, language), theme = COALESCE($4, theme), two_factor_methods = COALESCE($5, two_factor_methods) WHERE id = $6 RETURNING preferences, notification_prefs, language, theme, two_factor_methods',
            [preferences || null, notification_prefs || null, language || null, theme || null, two_factor_methods || null, req.user.userId]
        );
        logger.info('User updated preferences', { userId: req.user.userId, category: 'user' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users/me/availability
 * Toggle user availability
 */
router.post('/me/availability', verifyToken, async (req, res, next) => {
    try {
        const { is_available } = req.body || {};
        const result = await pool.query('UPDATE users SET is_available = $1 WHERE id = $2 RETURNING is_available', [!!is_available, req.user.userId]);
        logger.info('User toggled availability', { userId: req.user.userId, isAvailable: !!is_available, category: 'user' });
        res.json({ isAvailable: result.rows[0].is_available });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/me/payment-methods
 * Get user payment methods
 */
router.get('/me/payment-methods', verifyToken, async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, payment_method_type, masked_details, is_default, created_at FROM user_payment_methods WHERE user_id = $1 ORDER BY created_at DESC', [req.user.userId]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users/me/payment-methods
 * Add user payment method
 */
router.post('/me/payment-methods', verifyToken, async (req, res, next) => {
    try {
        const { payment_method_type, masked_details, is_default } = req.body || {};
        if (!payment_method_type || !masked_details) return res.status(400).json({ error: 'Invalid payment method' });
        if (is_default) await pool.query('UPDATE user_payment_methods SET is_default = false WHERE user_id = $1', [req.user.userId]);
        const result = await pool.query(
            `INSERT INTO user_payment_methods (user_id, payment_method_type, masked_details, is_default)
       VALUES ($1, $2, $3, $4) RETURNING id, payment_method_type, masked_details, is_default, created_at`,
            [req.user.userId, payment_method_type, masked_details, !!is_default]
        );
        logger.info('User added payment method', { userId: req.user.userId, category: 'user' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/users/me/payment-methods/:id
 * Remove user payment method
 */
router.delete('/me/payment-methods/:id', verifyToken, async (req, res, next) => {
    try {
        await pool.query('DELETE FROM user_payment_methods WHERE user_id = $1 AND id = $2', [req.user.userId, req.params.id]);
        logger.info('User removed payment method', { userId: req.user.userId, category: 'user' });
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/me/favorites
 * Get user favorites
 */
router.get('/me/favorites', verifyToken, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT uf.favorite_user_id as userId, u.name, u.primary_role, u.rating, u.completed_deliveries, u.is_verified
       FROM user_favorites uf JOIN users u ON uf.favorite_user_id = u.id
       WHERE uf.user_id = $1 ORDER BY uf.created_at DESC`,
            [req.user.userId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
});

/**
 * POST /api/users/me/favorites
 * Add user favorite
 */
router.post('/me/favorites', verifyToken, async (req, res, next) => {
    try {
        const { favorite_user_id } = req.body || {};
        if (!favorite_user_id || favorite_user_id === req.user.userId) return res.status(400).json({ error: 'Invalid favorite user' });
        await pool.query('INSERT INTO user_favorites (user_id, favorite_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [req.user.userId, favorite_user_id]);
        logger.info('User added favorite', { userId: req.user.userId, favoriteUserId: favorite_user_id, category: 'user' });
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

/**
 * DELETE /api/users/me/favorites/:favoriteUserId
 * Remove user favorite
 */
router.delete('/me/favorites/:favoriteUserId', verifyToken, async (req, res, next) => {
    try {
        await pool.query('DELETE FROM user_favorites WHERE user_id = $1 AND favorite_user_id = $2', [req.user.userId, req.params.favoriteUserId]);
        logger.info('User removed favorite', { userId: req.user.userId, favoriteUserId: req.params.favoriteUserId, category: 'user' });
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/users/me/activity
 * Get user recent activity
 */
router.get('/me/activity', verifyToken, async (req, res, next) => {
    try {
        const ordersRes = await pool.query(
            `SELECT id, order_number, title, status, created_at, accepted_at, picked_up_at, delivered_at
       FROM orders WHERE customer_id = $1 OR assigned_driver_user_id = $1
       ORDER BY created_at DESC LIMIT 20`,
            [req.user.userId]
        );
        res.json({ recentOrders: ordersRes.rows });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
