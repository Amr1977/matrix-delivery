const axios = require('axios');
const logger = require('../config/logger');

/**
 * Verify a reCAPTCHA v2 token with Google's siteverify API.
 * 
 * @param {string} token - The reCAPTCHA token from the frontend.
 * @returns {Promise<boolean>} - True if verification succeeds or is disabled, false otherwise.
 */
const verifyRecaptcha = async (token) => {
    // If reCAPTCHA is disabled, always return true
    if (process.env.RECAPTCHA_ENABLED !== 'true') {
        return true;
    }

    // If enabled but no token provided, return false
    if (!token) {
        logger.security('reCAPTCHA token missing but verification is enabled', {
            category: 'security'
        });
        return false;
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!secretKey) {
        logger.error('RECAPTCHA_SECRET_KEY not configured - please set RECAPTCHA_SECRET_KEY in .env file');
        return false;
    }

    try {
        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: secretKey,
                    response: token
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Matrix-Delivery-Server/1.0'
                }
            }
        );

        if (response.data && response.data.success) {
            return true;
        }

        if (response.data && response.data['error-codes']) {
            logger.security('reCAPTCHA verification failed', {
                errorCodes: response.data['error-codes'],
                category: 'security'
            });
        }
        
        return false;

    } catch (error) {
        // Log the generic error message first as expected by tests
        logger.error('reCAPTCHA v2 verification error:', error.message);

        // Then log specific error details
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.message.includes('Timeout')) {
            logger.error('Google reCAPTCHA API request timed out');
        } else if (error.response && error.response.status) {
            logger.error('Google API responded with status:', error.response.status);
        }
        
        return false;
    }
};

module.exports = {
    verifyRecaptcha
};
