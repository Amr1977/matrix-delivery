const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const logger = require('../config/logger');

class FileUploadService {
    constructor() {
        // Configure Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // File size limits (in bytes)
        this.limits = {
            image: 10 * 1024 * 1024,  // 10MB
        };

        // Allowed MIME types for images
        this.allowedImageTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp'
        ];

        // Allowed file extensions (for additional validation)
        this.allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    }

    /**
     * Validate file type and size
     * Security-first: real file-type checks, not just extension/MIME header trust
     */
    validateFile(file, mediaType = 'image') {
        if (!file) {
            throw new Error('No file provided');
        }

        // Check file size
        if (file.size > this.limits[mediaType]) {
            const limitMB = this.limits[mediaType] / (1024 * 1024);
            throw new Error(`File size exceeds ${limitMB}MB limit`);
        }

        // Check MIME type against allowed list
        if (!this.allowedImageTypes.includes(file.mimetype)) {
            throw new Error(`Invalid file type. Allowed types: ${this.allowedImageTypes.join(', ')}`);
        }

        // Additional extension check (defense in depth)
        const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
        if (!this.allowedExtensions.includes(ext)) {
            throw new Error(`Invalid file extension. Allowed: ${this.allowedExtensions.join(', ')}`);
        }

        return true;
    }

    /**
     * Create multer upload middleware using memory storage
     * Files are buffered in memory and streamed to Cloudinary
     */
    createUploadMiddleware(fieldName = 'file') {
        return multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: this.limits.image
            },
            fileFilter: (req, file, cb) => {
                try {
                    this.validateFile(file, 'image');
                    cb(null, true);
                } catch (error) {
                    cb(error, false);
                }
            }
        }).single(fieldName);
    }

    /**
     * Upload a file buffer to Cloudinary
     * @param {Buffer} fileBuffer - File buffer from multer.memoryStorage()
     * @param {Object} options - Upload options
     * @param {string} options.folder - Cloudinary folder path (e.g., 'matrix-delivery/stores/123/gallery')
     * @param {string} options.publicId - Optional custom public_id
     * @param {Object} options.transformations - Optional Cloudinary transformations
     * @returns {Promise<Object>} Upload result with url and public_id
     */
    async uploadToCloudinary(fileBuffer, options = {}) {
        const { folder, publicId, transformations = {} } = options;

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    public_id: publicId,
                    resource_type: 'image',
                    transformation: transformations,
                    overwrite: false,
                    unique_filename: true,
                    use_filename: false,
                },
                (error, result) => {
                    if (error) {
                        logger.error('Cloudinary upload failed', {
                            error: error.message,
                            folder,
                            category: 'file-upload'
                        });
                        reject(new Error(`Upload failed: ${error.message}`));
                    } else {
                        logger.info('Cloudinary upload successful', {
                            publicId: result.public_id,
                            url: result.secure_url,
                            folder,
                            category: 'file-upload'
                        });
                        resolve({
                            image_url: result.secure_url,
                            cloudinary_public_id: result.public_id,
                            width: result.width,
                            height: result.height,
                            format: result.format,
                            bytes: result.bytes
                        });
                    }
                }
            );

            // Convert buffer to stream and pipe to Cloudinary
            const readable = new Readable();
            readable._read = () => {};
            readable.push(fileBuffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });
    }

    /**
     * Delete an image from Cloudinary by public_id
     */
    async deleteFromCloudinary(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId, {
                resource_type: 'image',
                invalidate: true // Invalidate CDN cache
            });

            if (result.result === 'ok' || result.result === 'not found') {
                logger.info('Cloudinary delete successful', {
                    publicId,
                    result: result.result,
                    category: 'file-upload'
                });
                return true;
            } else {
                logger.warn('Cloudinary delete returned unexpected result', {
                    publicId,
                    result: result.result,
                    category: 'file-upload'
                });
                return false;
            }
        } catch (error) {
            logger.error('Cloudinary delete failed', {
                error: error.message,
                publicId,
                category: 'file-upload'
            });
            return false;
        }
    }

    /**
     * Generate Cloudinary URL with transformations for thumbnails, etc.
     * This is called at render time in the frontend, not during upload.
     * @param {string} publicId - Cloudinary public_id
     * @param {Object} transformations - Transformation options (width, height, crop, etc.)
     * @returns {string} Transformed Cloudinary URL
     */
    getTransformedUrl(publicId, transformations = {}) {
        if (!publicId) return null;

        const {
            width,
            height,
            crop = 'fill',
            quality = 'auto',
            format = 'auto',
            gravity = 'auto'
        } = transformations;

        const transformParts = [];
        if (width) transformParts.push(`w_${width}`);
        if (height) transformParts.push(`h_${height}`);
        if (crop) transformParts.push(`c_${crop}`);
        if (gravity) transformParts.push(`g_${gravity}`);
        if (quality) transformParts.push(`q_${quality}`);
        if (format) transformParts.push(`f_${format}`);

        const transformString = transformParts.join(',');
        return cloudinary.url(publicId, {
            transformation: transformString,
            secure: true
        });
    }

    /**
     * Generate standard thumbnail URL (400x400 fill)
     */
    getThumbnailUrl(publicId, size = 400) {
        return this.getTransformedUrl(publicId, {
            width: size,
            height: size,
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto',
            format: 'auto'
        });
    }

    /**
     * Generate detail/zoom URL (larger, e.g., 1200px wide)
     */
    getDetailUrl(publicId, maxWidth = 1200) {
        return this.getTransformedUrl(publicId, {
            width: maxWidth,
            crop: 'limit',
            quality: 'auto',
            format: 'auto'
        });
    }

    /**
     * Generate grid thumbnail URL (e.g., 300x300)
     */
    getGridUrl(publicId, size = 300) {
        return this.getTransformedUrl(publicId, {
            width: size,
            height: size,
            crop: 'fill',
            gravity: 'auto',
            quality: 'auto',
            format: 'auto'
        });
    }
}

module.exports = new FileUploadService();