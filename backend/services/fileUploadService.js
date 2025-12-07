const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const logger = require('../config/logger');

class FileUploadService {
    constructor() {
        // Create uploads directory if it doesn't exist
        this.uploadsDir = path.join(__dirname, '..', 'uploads');
        this.ensureDirectoryExists(this.uploadsDir);

        // Create subdirectories for different media types
        this.imageDir = path.join(this.uploadsDir, 'images');
        this.videoDir = path.join(this.uploadsDir, 'videos');
        this.voiceDir = path.join(this.uploadsDir, 'voice');
        this.thumbnailDir = path.join(this.uploadsDir, 'thumbnails');

        this.ensureDirectoryExists(this.imageDir);
        this.ensureDirectoryExists(this.videoDir);
        this.ensureDirectoryExists(this.voiceDir);
        this.ensureDirectoryExists(this.thumbnailDir);

        // File size limits (in bytes)
        this.limits = {
            image: 10 * 1024 * 1024,  // 10MB
            video: 50 * 1024 * 1024,  // 50MB
            voice: 5 * 1024 * 1024    // 5MB
        };

        // Allowed file types
        this.allowedTypes = {
            image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            video: ['video/mp4', 'video/webm', 'video/quicktime'],
            voice: ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg']
        };
    }

    /**
     * Ensure directory exists, create if not
     */
    ensureDirectoryExists(dirPath) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            logger.info(`Created directory: ${dirPath}`, { category: 'file-upload' });
        }
    }

    /**
     * Generate unique filename
     */
    generateFilename(orderId, originalName) {
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const ext = path.extname(originalName);
        return `${orderId}_${timestamp}_${randomId}${ext}`;
    }

    /**
     * Validate file type and size
     */
    validateFile(file, mediaType) {
        // Check if file exists
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file type
        if (!this.allowedTypes[mediaType].includes(file.mimetype)) {
            throw new Error(`Invalid file type. Allowed types: ${this.allowedTypes[mediaType].join(', ')}`);
        }

        // Check file size
        if (file.size > this.limits[mediaType]) {
            const limitMB = this.limits[mediaType] / (1024 * 1024);
            throw new Error(`File size exceeds ${limitMB}MB limit`);
        }

        return true;
    }

    /**
     * Configure multer storage for different media types
     */
    getMulterStorage(mediaType) {
        const targetDir = mediaType === 'image' ? this.imageDir :
            mediaType === 'video' ? this.videoDir :
                this.voiceDir;

        return multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, targetDir);
            },
            filename: (req, file, cb) => {
                const orderId = req.body.orderId || 'unknown';
                const filename = this.generateFilename(orderId, file.originalname);
                cb(null, filename);
            }
        });
    }

    /**
     * Create multer upload middleware
     */
    createUploadMiddleware(mediaType) {
        return multer({
            storage: this.getMulterStorage(mediaType),
            limits: {
                fileSize: this.limits[mediaType]
            },
            fileFilter: (req, file, cb) => {
                try {
                    if (!this.allowedTypes[mediaType].includes(file.mimetype)) {
                        cb(new Error(`Invalid file type. Allowed types: ${this.allowedTypes[mediaType].join(', ')}`), false);
                    } else {
                        cb(null, true);
                    }
                } catch (error) {
                    cb(error, false);
                }
            }
        }).single('file');
    }

    /**
     * Generate thumbnail for image
     */
    async generateImageThumbnail(imagePath) {
        try {
            const filename = path.basename(imagePath);
            const thumbnailPath = path.join(this.thumbnailDir, `thumb_${filename}`);

            await sharp(imagePath)
                .resize(300, 300, {
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);

            logger.info('Image thumbnail generated', {
                imagePath,
                thumbnailPath,
                category: 'file-upload'
            });

            return thumbnailPath;
        } catch (error) {
            logger.error('Failed to generate image thumbnail', {
                error: error.message,
                imagePath,
                category: 'file-upload'
            });
            return null;
        }
    }

    /**
     * Generate thumbnail for video
     */
    async generateVideoThumbnail(videoPath) {
        return new Promise((resolve, reject) => {
            try {
                const filename = path.basename(videoPath, path.extname(videoPath));
                const thumbnailPath = path.join(this.thumbnailDir, `thumb_${filename}.jpg`);

                ffmpeg(videoPath)
                    .screenshots({
                        timestamps: ['00:00:01'],
                        filename: `thumb_${filename}.jpg`,
                        folder: this.thumbnailDir,
                        size: '300x300'
                    })
                    .on('end', () => {
                        logger.info('Video thumbnail generated', {
                            videoPath,
                            thumbnailPath,
                            category: 'file-upload'
                        });
                        resolve(thumbnailPath);
                    })
                    .on('error', (error) => {
                        logger.error('Failed to generate video thumbnail', {
                            error: error.message,
                            videoPath,
                            category: 'file-upload'
                        });
                        resolve(null);
                    });
            } catch (error) {
                logger.error('Video thumbnail generation error', {
                    error: error.message,
                    videoPath,
                    category: 'file-upload'
                });
                resolve(null);
            }
        });
    }

    /**
     * Get video duration
     */
    async getVideoDuration(videoPath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    logger.error('Failed to get video duration', {
                        error: err.message,
                        videoPath,
                        category: 'file-upload'
                    });
                    resolve(null);
                } else {
                    const duration = Math.floor(metadata.format.duration);
                    resolve(duration);
                }
            });
        });
    }

    /**
     * Upload image file
     */
    async uploadImage(file, orderId) {
        this.validateFile(file, 'image');

        const thumbnailPath = await this.generateImageThumbnail(file.path);

        return {
            mediaUrl: `/uploads/images/${file.filename}`,
            mediaType: 'image',
            mediaSize: file.size,
            thumbnailUrl: thumbnailPath ? `/uploads/thumbnails/${path.basename(thumbnailPath)}` : null
        };
    }

    /**
     * Upload video file
     */
    async uploadVideo(file, orderId) {
        this.validateFile(file, 'video');

        const thumbnailPath = await this.generateVideoThumbnail(file.path);
        const duration = await this.getVideoDuration(file.path);

        return {
            mediaUrl: `/uploads/videos/${file.filename}`,
            mediaType: 'video',
            mediaSize: file.size,
            mediaDuration: duration,
            thumbnailUrl: thumbnailPath ? `/uploads/thumbnails/${path.basename(thumbnailPath)}` : null
        };
    }

    /**
     * Upload voice recording
     */
    async uploadVoice(file, orderId) {
        this.validateFile(file, 'voice');

        // For voice, we could get duration using ffprobe if needed
        let duration = null;
        try {
            duration = await this.getVideoDuration(file.path);
        } catch (error) {
            logger.warn('Could not get voice duration', {
                error: error.message,
                category: 'file-upload'
            });
        }

        return {
            mediaUrl: `/uploads/voice/${file.filename}`,
            mediaType: 'voice',
            mediaSize: file.size,
            mediaDuration: duration
        };
    }

    /**
     * Delete uploaded file
     */
    async deleteFile(filePath) {
        try {
            const fullPath = path.join(__dirname, '..', filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                logger.info('File deleted', { filePath, category: 'file-upload' });
                return true;
            }
            return false;
        } catch (error) {
            logger.error('Failed to delete file', {
                error: error.message,
                filePath,
                category: 'file-upload'
            });
            return false;
        }
    }

    /**
     * Delete message media files (including thumbnail)
     */
    async deleteMessageMedia(mediaUrl, thumbnailUrl) {
        const promises = [];

        if (mediaUrl) {
            promises.push(this.deleteFile(mediaUrl));
        }

        if (thumbnailUrl) {
            promises.push(this.deleteFile(thumbnailUrl));
        }

        await Promise.all(promises);
    }
}

module.exports = new FileUploadService();
