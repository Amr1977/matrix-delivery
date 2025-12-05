import { useState, useCallback } from 'react';
import api from '../api';

const useMediaUpload = () => {
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [preview, setPreview] = useState(null);

    // File size limits (in bytes)
    const limits = {
        image: 10 * 1024 * 1024,  // 10MB
        video: 50 * 1024 * 1024,  // 50MB
        voice: 5 * 1024 * 1024    // 5MB
    };

    // Allowed file types
    const allowedTypes = {
        image: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        video: ['video/mp4', 'video/webm', 'video/quicktime'],
        voice: ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg']
    };

    /**
     * Validate file
     */
    const validateFile = useCallback((file, mediaType) => {
        // Check file type
        if (!allowedTypes[mediaType].includes(file.type)) {
            throw new Error(`Invalid file type. Allowed types: ${allowedTypes[mediaType].join(', ')}`);
        }

        // Check file size
        if (file.size > limits[mediaType]) {
            const limitMB = limits[mediaType] / (1024 * 1024);
            throw new Error(`File size exceeds ${limitMB}MB limit`);
        }

        return true;
    }, []);

    /**
     * Generate preview for file
     */
    const generatePreview = useCallback((file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                resolve(e.target.result);
            };

            reader.onerror = (error) => {
                reject(error);
            };

            reader.readAsDataURL(file);
        });
    }, []);

    /**
     * Upload image
     */
    const uploadImage = useCallback(async (orderId, file) => {
        try {
            setError('');
            setUploading(true);
            setUploadProgress(0);

            validateFile(file, 'image');

            // Generate preview
            const previewUrl = await generatePreview(file);
            setPreview(previewUrl);

            const result = await api.uploadImage(orderId, file, (progress) => {
                setUploadProgress(progress);
            });

            setUploading(false);
            return result;

        } catch (err) {
            setError(err.message || 'Failed to upload image');
            setUploading(false);
            throw err;
        }
    }, [validateFile, generatePreview]);

    /**
     * Upload video
     */
    const uploadVideo = useCallback(async (orderId, file) => {
        try {
            setError('');
            setUploading(true);
            setUploadProgress(0);

            validateFile(file, 'video');

            // Generate preview
            const previewUrl = await generatePreview(file);
            setPreview(previewUrl);

            const result = await api.uploadVideo(orderId, file, (progress) => {
                setUploadProgress(progress);
            });

            setUploading(false);
            return result;

        } catch (err) {
            setError(err.message || 'Failed to upload video');
            setUploading(false);
            throw err;
        }
    }, [validateFile, generatePreview]);

    /**
     * Upload voice recording
     */
    const uploadVoice = useCallback(async (orderId, blob) => {
        try {
            setError('');
            setUploading(true);
            setUploadProgress(0);

            const result = await api.uploadVoice(orderId, blob, (progress) => {
                setUploadProgress(progress);
            });

            setUploading(false);
            return result;

        } catch (err) {
            setError(err.message || 'Failed to upload voice recording');
            setUploading(false);
            throw err;
        }
    }, []);

    /**
     * Clear preview
     */
    const clearPreview = useCallback(() => {
        setPreview(null);
        setUploadProgress(0);
        setError('');
    }, []);

    /**
     * Cancel upload
     */
    const cancelUpload = useCallback(() => {
        setUploading(false);
        setUploadProgress(0);
        setPreview(null);
        setError('');
    }, []);

    return {
        uploading,
        uploadProgress,
        error,
        preview,
        uploadImage,
        uploadVideo,
        uploadVoice,
        clearPreview,
        cancelUpload,
        validateFile
    };
};

export default useMediaUpload;
