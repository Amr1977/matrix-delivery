/**
 * Reviews Routes (JS Version)
 */
const express = require('express');
const { check, validationResult } = require('express-validator');
const pool = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/auth');
const logger = require('../config/logger');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const db = pool;

// Rate limiter specifically for creating reviews
const createReviewLimiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 1, // Limit each IP/user to 1 review per day
    message: { error: 'You can only submit one review per day.' }
});

// Vote rate limiter
const voteLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit votes per hour
    message: { error: 'Too many votes, please try again later.' }
});

/**
 * @route   GET /api/reviews
 * @desc    Get all reviews with pagination and sorting
 * @access  Public
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sort = req.query.sort === 'recent' ? 'created_at DESC' : 'upvotes DESC, created_at ASC';
        const offset = (page - 1) * limit;

        const reviewsQuery = `
            SELECT r.*, u.name as reviewer_name, u.profile_picture_url, u.is_verified
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.is_approved = TRUE
            ORDER BY ${sort}
            LIMIT $1 OFFSET $2
        `;

        const countQuery = 'SELECT COUNT(*) FROM reviews WHERE is_approved = TRUE';

        const [reviewsResult, countResult] = await Promise.all([
            db.query(reviewsQuery, [limit, offset]),
            db.query(countQuery)
        ]);

        res.json({
            reviews: reviewsResult.rows,
            pagination: {
                current: page,
                limit: limit,
                total: parseInt(countResult.rows[0].count),
                pages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
            }
        });
    } catch (err) {
        logger.error(`Error fetching reviews: ${err.message}`);
        res.status(500).json({ error: 'Server error fetching reviews' });
    }
});

/**
 * @route   POST /api/reviews
 * @desc    Submit a new review
 * @access  Private
 */
router.post(
    '/',
    [
        verifyToken,
        createReviewLimiter,
        check('rating', 'Rating is required and must be 1-5').isInt({ min: 1, max: 5 }),
        check('content', 'Content is required').not().isEmpty(),
        check('professionalism_rating', 'Professionalism rating 1-5').optional().isInt({ min: 1, max: 5 }),
        check('communication_rating', 'Communication rating 1-5').optional().isInt({ min: 1, max: 5 }),
        check('timeliness_rating', 'Timeliness rating 1-5').optional().isInt({ min: 1, max: 5 }),
        check('package_condition_rating', 'Package condition rating 1-5').optional().isInt({ min: 1, max: 5 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { rating, content, professionalism_rating, communication_rating, timeliness_rating, package_condition_rating } = req.body;
            const userId = req.user.userId;

            // Check if user already reviewed today (double check in DB for precision)
            // For now, rely on rate limiter and maybe unique constraint if needed later.

            const result = await db.query(
                `INSERT INTO reviews 
                (user_id, rating, content, professionalism_rating, communication_rating, timeliness_rating, package_condition_rating)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *`,
                [userId, rating, content, professionalism_rating, communication_rating, timeliness_rating, package_condition_rating]
            );

            logger.info(`New review submitted by user ${userId}`);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            logger.error(`Error submitting review: ${err.message}`);
            res.status(500).json({ error: 'Server error submitting review' });
        }
    }
);

/**
 * @route   POST /api/reviews/:id/vote
 * @desc    Upvote a review
 * @access  Private
 */
router.post('/:id/vote', [verifyToken, voteLimiter], async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.user.userId;

        // Check availability
        const checkVote = await db.query('SELECT * FROM review_votes WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
        if (checkVote.rows.length > 0) {
            return res.status(400).json({ error: 'You have already voted on this review' });
        }

        // Add vote
        await db.query('INSERT INTO review_votes (review_id, user_id) VALUES ($1, $2)', [reviewId, userId]);

        // Update review count
        const result = await db.query(
            'UPDATE reviews SET upvotes = upvotes + 1 WHERE id = $1 RETURNING upvotes',
            [reviewId]
        );

        res.json({ upvotes: result.rows[0].upvotes });
    } catch (err) {
        logger.error(`Error voting on review: ${err.message}`);
        res.status(500).json({ error: 'Server error voting' });
    }
});

/**
 * @route   POST /api/reviews/:id/flag
 * @desc    Flag a review
 * @access  Private
 */
router.post('/:id/flag', [verifyToken, voteLimiter], async (req, res) => {
    try {
        const reviewId = req.params.id;
        const userId = req.user.userId;
        const { reason } = req.body;

        // Check if user already flagged
        const checkFlag = await db.query('SELECT * FROM review_flags WHERE review_id = $1 AND user_id = $2', [reviewId, userId]);
        if (checkFlag.rows.length > 0) {
            return res.status(400).json({ error: 'You have already reported this review' });
        }

        // Add flag tracker
        await db.query('INSERT INTO review_flags (review_id, user_id, reason) VALUES ($1, $2, $3)', [reviewId, userId, reason || 'Inappropriate content']);

        // Increment flag count and check for auto-hide
        const result = await db.query(
            'UPDATE reviews SET flag_count = flag_count + 1 WHERE id = $1 RETURNING flag_count, is_approved',
            [reviewId]
        );

        const newFlagCount = result.rows[0].flag_count;

        // Auto-hide if > 2 flags
        if (newFlagCount > 2) {
            await db.query('UPDATE reviews SET is_approved = FALSE WHERE id = $1', [reviewId]);
            logger.info(`Review ${reviewId} auto-hidden due to excessive flags (${newFlagCount})`);
        }

        res.json({ message: 'Review reported', flag_count: newFlagCount });
    } catch (err) {
        logger.error(`Error flagging review: ${err.message}`);
        res.status(500).json({ error: 'Server error flagging review' });
    }
});

/**
 * @route   PATCH /api/reviews/:id/admin
 * @desc    Admin updates (link github, feature, approve)
 * @access  Private (Admin)
 */
router.patch('/:id/admin', [verifyToken, requireRole('admin')], async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { github_issue_link, is_featured, is_approved } = req.body;

        let updateFields = [];
        let values = [];
        let index = 1;

        if (github_issue_link !== undefined) {
            updateFields.push(`github_issue_link = $${index++}`);
            values.push(github_issue_link);
        }
        if (is_featured !== undefined) {
            updateFields.push(`is_featured = $${index++}`);
            values.push(is_featured);
        }
        if (is_approved !== undefined) {
            updateFields.push(`is_approved = $${index++}`);
            values.push(is_approved);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        values.push(reviewId);
        const query = `UPDATE reviews SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${index} RETURNING *`;

        const result = await db.query(query, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        logger.error(`Error updating review: ${err.message}`);
        res.status(500).json({ error: 'Server error updating review' });
    }
});

// To match `require().default` in app.js, we add it explicitly.
// Or we can just export router and let CommonJS handle it.
// app.js has: const reviewsRouter = require('./routes/reviews').default;
// So we must attach default property.
module.exports = router;
module.exports.default = router;
