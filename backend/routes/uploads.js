const express = require('express');
const path = require('path');
const fileUploadService = require('../services/fileUploadService');
const messagingService = require('../services/messagingService');
const { verifyToken } = require('../middleware/auth');
const { apiRateLimit } = require('../middleware/rateLimit');
const logger = require('../config/logger');

const router = express.Router();

// Middleware to allow cross-origin access to uploaded files
// This overrides the global Cross-Origin-Resource-Policy: same-origin header
// NOTE: We only set Cross-Origin-Resource-Policy here. Access-Control-Allow-Origin
// is handled by the main CORS middleware in express.js to ensure proper credential support.
router.use((req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// Serve static files from uploads directory
router.use('/images', express.static(path.join(__dirname, '..', 'uploads', 'images')));
router.use('/videos', express.static(path.join(__dirname, '..', 'uploads', 'videos')));
router.use('/voice', express.static(path.join(__dirname, '..', 'uploads', 'voice')));
router.use('/thumbnails', express.static(path.join(__dirname, '..', 'uploads', 'thumbnails')));

/**
 * Upload image
 */
router.post('/image', verifyToken, apiRateLimit, (req, res) => {
    const uploadMiddleware = fileUploadService.createUploadMiddleware('image');

    uploadMiddleware(req, res, async (err) => {
        if (err) {
            logger.error('Image upload error', {
                error: err.message,
                userId: req.user.userId,
                category: 'file-upload'
            });

            return res.status(400).json({
                error: err.message || 'Failed to upload image'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No file provided'
            });
        }

        try {
            const result = await fileUploadService.uploadImage(req.file, req.body.orderId);

            logger.info('Image uploaded successfully', {
                userId: req.user.userId,
                orderId: req.body.orderId,
                filename: req.file.filename,
                size: req.file.size,
                category: 'file-upload'
            });

            res.status(201).json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Image processing error', {
                error: error.message,
                userId: req.user.userId,
                category: 'file-upload'
            });

            res.status(500).json({
                error: 'Failed to process image'
            });
        }
    });
});

/**
 * Upload video
 */
router.post('/video', verifyToken, apiRateLimit, (req, res) => {
    const uploadMiddleware = fileUploadService.createUploadMiddleware('video');

    uploadMiddleware(req, res, async (err) => {
        if (err) {
            logger.error('Video upload error', {
                error: err.message,
                userId: req.user.userId,
                category: 'file-upload'
            });

            return res.status(400).json({
                error: err.message || 'Failed to upload video'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No file provided'
            });
        }

        try {
            const result = await fileUploadService.uploadVideo(req.file, req.body.orderId);

            logger.info('Video uploaded successfully', {
                userId: req.user.userId,
                orderId: req.body.orderId,
                filename: req.file.filename,
                size: req.file.size,
                duration: result.mediaDuration,
                category: 'file-upload'
            });

            res.status(201).json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Video processing error', {
                error: error.message,
                userId: req.user.userId,
                category: 'file-upload'
            });

            res.status(500).json({
                error: 'Failed to process video'
            });
        }
    });
});

/**
 * Upload voice recording
 */
router.post('/voice', verifyToken, apiRateLimit, (req, res) => {
    const uploadMiddleware = fileUploadService.createUploadMiddleware('voice');

    uploadMiddleware(req, res, async (err) => {
        if (err) {
            logger.error('Voice upload error', {
                error: err.message,
                userId: req.user.userId,
                category: 'file-upload'
            });

            return res.status(400).json({
                error: err.message || 'Failed to upload voice recording'
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: 'No file provided'
            });
        }

        try {
            const result = await fileUploadService.uploadVoice(req.file, req.body.orderId);

            logger.info('Voice recording uploaded successfully', {
                userId: req.user.userId,
                orderId: req.body.orderId,
                filename: req.file.filename,
                size: req.file.size,
                duration: result.mediaDuration,
                category: 'file-upload'
            });

            res.status(201).json({
                success: true,
                ...result
            });
        } catch (error) {
            logger.error('Voice processing error', {
                error: error.message,
                userId: req.user.userId,
                category: 'file-upload'
            });

            res.status(500).json({
                error: 'Failed to process voice recording'
            });
        }
    });
});

/**
 * Delete uploaded media
 */
router.delete('/:messageId', verifyToken, async (req, res) => {
    try {
        const { messageId } = req.params;

        // Get message to verify ownership and get media URLs
        const message = await messagingService.getMessage(messageId);

        if (!message) {
            return res.status(404).json({
                error: 'Message not found'
            });
        }

        if (message.senderId !== req.user.userId) {
            return res.status(403).json({
                error: 'You can only delete your own messages'
            });
        }

        // Delete media files
        if (message.mediaUrl) {
            await fileUploadService.deleteMessageMedia(message.mediaUrl, message.thumbnailUrl);
        }

        logger.info('Media deleted', {
            messageId,
            userId: req.user.userId,
            category: 'file-upload'
        });

        res.json({
            success: true,
            message: 'Media deleted successfully'
        });

    } catch (error) {
        logger.error('Media deletion error', {
            error: error.message,
            messageId: req.params.messageId,
            userId: req.user.userId,
            category: 'file-upload'
        });

        res.status(500).json({
            error: 'Failed to delete media'
        });
    }
});

module.exports = router;
