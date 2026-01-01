const authService = require('../services/authService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');
const pool = require('../config/db');
const axios = require('axios');

// reCAPTCHA verification helper
const verifyRecaptcha = async (token) => {
    try {
        if (!token) {
            console.warn('No reCAPTCHA token provided');
            return false;
        }

        if (!process.env.RECAPTCHA_SECRET_KEY) {
            console.error('RECAPTCHA_SECRET_KEY not configured');
            return false;
        }

        const response = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY.trim(),
                    response: token
                },
                timeout: 10000,
                headers: {
                    'User-Agent': 'Matrix-Delivery-Server/1.0'
                }
            }
        );

        const result = response.data;
        if (result['error-codes'] && result['error-codes'].length > 0) {
            console.warn('reCAPTCHA verification failed with error codes:', result['error-codes']);
            return false;
        }

        return result.success;
    } catch (error) {
        console.error('reCAPTCHA verification error:', error.message);
        return false;
    }
};

// Helper function to notify all admins about new user registration
const notifyAdminsOfNewUser = async (userId, userName, userRole) => {
    try {
        // Query all admin users
        const adminResult = await pool.query(
            "SELECT id FROM users WHERE primary_role = 'admin' OR (granted_roles IS NOT NULL AND 'admin' = ANY(granted_roles))"
        );

        if (adminResult.rows.length === 0) {
            logger.warn('No admin users found to notify about new registration', {
                category: 'notification'
            });
            return;
        }

        // Create notification for each admin
        const notificationPromises = adminResult.rows.map(admin => {
            return pool.query(
                `INSERT INTO notifications (user_id, order_id, type, title, message)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
                [
                    admin.id,
                    null, // No order associated with user registration
                    'new_user_registration',
                    'New User Registered',
                    `${userName} has registered as a ${userRole}. View profile: /profile/${userId}`
                ]
            );
        });

        await Promise.all(notificationPromises);

        logger.info(`Notified ${adminResult.rows.length} admin(s) about new user registration`, {
            userId,
            userName,
            userRole,
            adminCount: adminResult.rows.length,
            category: 'notification'
        });
    } catch (error) {
        logger.error(`Failed to notify admins about new user registration: ${error.message}`, {
            userId,
            userName,
            error: error.stack,
            category: 'notification'
        });
        // Don't throw - notification failure shouldn't block registration
    }
};

const register = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth(`Registration attempt`, {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        category: 'auth'
    });

    try {
        const { name, email, password, phone, primary_role, vehicle_type, country, city, area, recaptchaToken } = req.body;

        // Verify reCAPTCHA token only in production
        if (process.env.NODE_ENV === 'production' && !(await verifyRecaptcha(recaptchaToken))) {
            logger.security(`reCAPTCHA verification failed`, {
                ip: clientIP,
                category: 'security'
            });
            return res.status(400).json({ error: 'CAPTCHA verification failed' });
        }

        // Basic validation
        if (!name || !email || !password || !phone || !primary_role || !country || !city || !area) {
            return res.status(400).json({ error: 'All fields required: name, email, password, phone, primary_role, country, city, and area' });
        }

        if (primary_role === 'driver' && !vehicle_type) {
            return res.status(400).json({ error: 'Vehicle type is required for drivers' });
        }

        // Use auth service
        const result = await authService.registerUser({
            name, email, password, phone, primary_role, vehicle_type, country, city, area
        });

        // Send verification email (don't block registration if email fails)
        try {
            const { verificationToken } = await authService.createEmailVerificationToken(email);
            await emailService.sendEmailVerification(email, name, verificationToken);
            logger.info(`Verification email sent to new user`, {
                userId: result.user.id,
                email: email,
                category: 'auth'
            });
        } catch (emailError) {
            logger.warn(`Failed to send verification email to new user: ${emailError.message}`, {
                userId: result.user.id,
                email: email,
                category: 'auth'
            });
            // Don't fail registration if email sending fails
        }

        // Notify admins about new user registration (async, non-blocking)
        notifyAdminsOfNewUser(result.user.id, result.user.name, result.user.primary_role)
            .catch(err => {
                logger.error(`Admin notification failed: ${err.message}`, {
                    userId: result.user.id,
                    category: 'notification'
                });
            });

        const duration = Date.now() - startTime;
        logger.performance(`Registration completed`, {
            userId: result.user.id,
            duration: `${duration}ms`,
            category: 'performance'
        });

        // Set httpOnly cookie for security
        const token = result.token;
        const IS_PRODUCTION = process.env.NODE_ENV === 'production';

        res.clearCookie('token', {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: IS_PRODUCTION ? 'none' : 'lax',
            path: '/'
        });

        res.cookie('token', token, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: IS_PRODUCTION ? 'none' : 'lax', // 'none' for cross-site in production
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/'
        });

        // Remove token from response body for security
        const response = { ...result };
        delete response.token;

        // Add message field for consistency
        response.message = 'User registered successfully';

        res.status(201).json(response);
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Registration error: ${error.message}`, {
            stack: error.stack,
            ip: clientIP,
            duration: `${duration}ms`,
            category: 'error'
        });

        // Handle known validation errors
        if (error.message === 'Email already registered') {
            return res.status(409).json({ error: error.message });
        }
        if (error.message === 'Invalid email format' ||
            error.message === 'Password must be at least 8 characters' ||
            error.message === 'Invalid primary_role' ||
            error.message === 'Vehicle type is required for drivers') {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: error.message || 'Registration failed' });
    }
};

const login = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth(`Login attempt`, {
        ip: clientIP,
        category: 'auth'
    });

    try {
        const { email, password, recaptchaToken } = req.body;

        // Verify reCAPTCHA token only in production
        if (process.env.NODE_ENV === 'production' && !(await verifyRecaptcha(recaptchaToken))) {
            logger.security(`Login reCAPTCHA verification failed`, {
                ip: clientIP,
                category: 'security'
            });
            return res.status(400).json({ error: 'CAPTCHA verification failed' });
        }

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Use auth service
        const result = await authService.loginUser(email, password);

        const duration = Date.now() - startTime;
        logger.performance(`Login completed`, {
            userId: result.user.id,
            duration: `${duration}ms`,
            category: 'performance'
        });

        // Set httpOnly cookie for security
        const token = result.token;
        const IS_PRODUCTION = process.env.NODE_ENV === 'production';

        const cookieOptions = {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: IS_PRODUCTION ? 'none' : 'lax', // 'none' for cross-site in production
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/'
        };

        // Clear any existing cookie first to prevent stale token issues
        res.clearCookie('token', {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: IS_PRODUCTION ? 'none' : 'lax',
            path: '/'
        });

        res.cookie('token', token, cookieOptions);

        // Remove token from response body for security
        const response = { ...result };
        delete response.token;

        // Add message field
        response.message = 'Login successful';

        res.json(response);
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Login error: ${error.message}`, {
            stack: error.stack,
            ip: clientIP,
            duration: `${duration}ms`,
            category: 'error'
        });

        if (error.message === 'Invalid email or password' || error.message === 'Invalid credentials') {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        if (error.message.includes('suspended')) {
            return res.status(403).json({ error: error.message });
        }
        if (error.message === 'Email and password required' || error.message === 'Invalid email format') {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: error.message || 'Login failed' });
    }
};

const logout = async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    // Get token to blacklist (from cookie or header)
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (token) {
        await authService.blacklistToken(token);
    }

    logger.auth('User logged out', {
        ip: clientIP,
        userId: req.user?.userId,
        tokenRevoked: !!token,
        category: 'auth'
    });

    const IS_PRODUCTION = process.env.NODE_ENV === 'production';
    res.clearCookie('token', {
        httpOnly: true,
        secure: IS_PRODUCTION,
        sameSite: IS_PRODUCTION ? 'none' : 'lax', // Match cookie settings
        path: '/'
    });

    res.json({ message: 'Logged out successfully' });
};

const refresh = async (req, res) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth('Token refresh attempt', {
        ip: clientIP,
        category: 'auth'
    });

    try {
        // Get token from cookie or Authorization header
        const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        // Verify the current token
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

        // Generate a new token with the same user data
        const newToken = jwt.sign(
            {
                userId: decoded.userId,
                email: decoded.email,
                primary_role: decoded.primary_role
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        const IS_PRODUCTION = process.env.NODE_ENV === 'production';

        // Set new token in cookie
        res.cookie('token', newToken, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: IS_PRODUCTION ? 'none' : 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            path: '/'
        });

        logger.info('Token refreshed successfully', {
            userId: decoded.userId,
            category: 'auth'
        });

        res.json({
            token: newToken,
            message: 'Token refreshed successfully'
        });
    } catch (error) {
        logger.error(`Token refresh error: ${error.message}`, {
            ip: clientIP,
            category: 'error'
        });

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }

        res.status(500).json({ error: 'Token refresh failed' });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await authService.getUserProfile(req.user.userId);
        res.json(user);
    } catch (error) {
        logger.error(`Get user profile error: ${error.message}`, {
            userId: req.user.userId,
            category: 'error'
        });
        res.status(500).json({ error: error.message || 'Failed to get user profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const updates = req.body;

        // Filter out fields that shouldn't be updated via this endpoint
        const allowedFields = ['name', 'phone', 'language', 'theme', 'vehicle_type', 'license_number', 'service_area_zone'];
        const filteredUpdates = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                filteredUpdates[field] = updates[field];
            }
        }

        if (Object.keys(filteredUpdates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const user = await authService.updateUserProfile(userId, filteredUpdates);

        logger.info(`User profile updated`, {
            userId,
            fields: Object.keys(filteredUpdates),
            category: 'auth'
        });

        res.json({ success: true, user });
    } catch (error) {
        logger.error(`Update profile error: ${error.message}`, {
            userId: req.user.userId,
            category: 'error'
        });
        res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
};

const switchRole = async (req, res) => {
    try {
        const { new_primary_role } = req.body;
        if (!new_primary_role) {
            return res.status(400).json({ error: 'primary_role is required' });
        }
        const { token, granted_roles, primary_role } = await authService.switchRole(req.user.userId, new_primary_role);
        res.json({ token, primary_role, granted_roles });
    } catch (error) {
        logger.error(`Switch primary_role error: ${error.message}`, { userId: req.user.userId, category: 'error' });
        res.status(400).json({ error: error.message || 'Failed to switch primary_role' });
    }
};

const verifyUser = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await authService.verifyUser(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        logger.info(`User verified via API`, {
            userId: user.id,
            email: user.email,
            primary_role: user.primary_role,
            category: 'auth'
        });

        res.json({
            success: true,
            message: 'User verified successfully',
            user
        });
    } catch (error) {
        logger.error(`Verify user error: ${error.message}`, {
            category: 'error'
        });
        res.status(500).json({ error: error.message || 'Failed to verify user' });
    }
};

const forgotPassword = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth(`Password reset request`, {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        category: 'auth'
    });

    try {
        const { email, recaptchaToken } = req.body;

        // Verify reCAPTCHA token only in production
        if (process.env.NODE_ENV === 'production' && !(await verifyRecaptcha(recaptchaToken))) {
            logger.security(`Forgot password reCAPTCHA verification failed`, {
                ip: clientIP,
                category: 'security'
            });
            return res.status(400).json({ error: 'CAPTCHA verification failed' });
        }

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Create reset token and send email
        const { user, resetToken } = await authService.createPasswordResetToken(email);

        try {
            await emailService.sendPasswordResetEmail(user.email, user.name, resetToken);

            const duration = Date.now() - startTime;
            logger.performance(`Password reset email sent`, {
                userId: user.id,
                duration: `${duration}ms`,
                category: 'performance'
            });

            res.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent.'
            });
        } catch (emailError) {
            logger.error(`Password reset email failed: ${emailError.message}`, {
                userId: user.id,
                category: 'error'
            });
            // Don't expose email sending failures for security
            res.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent.'
            });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Forgot password error: ${error.message}`, {
            error: error.stack,
            ip: clientIP,
            duration: `${duration}ms`,
            category: 'error'
        });

        // Always return success for security (don't reveal if email exists)
        if (error.message === 'User not found') {
            res.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent.'
            });
        } else {
            res.status(500).json({ error: 'Failed to process password reset request' });
        }
    }
};

const resetPassword = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth(`Password reset attempt`, {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        category: 'auth'
    });

    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        // Reset the password
        await authService.resetPassword(token, newPassword);

        const duration = Date.now() - startTime;
        logger.performance(`Password reset completed`, {
            duration: `${duration}ms`,
            category: 'performance'
        });

        res.json({
            success: true,
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Reset password error: ${error.message}`, {
            error: error.stack,
            ip: clientIP,
            duration: `${duration}ms`,
            category: 'error'
        });

        if (error.message.includes('Invalid or expired')) {
            res.status(400).json({ error: 'Invalid or expired reset token' });
        } else {
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }
};

const sendVerification = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth(`Email verification request`, {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        category: 'auth',
        userId: req.user.userId
    });

    try {
        // Create verification token for current user
        const { user, verificationToken } = await authService.createEmailVerificationToken(req.user.email);

        try {
            await emailService.sendEmailVerification(user.email, user.name, verificationToken);

            const duration = Date.now() - startTime;
            logger.performance(`Email verification sent`, {
                userId: user.id,
                duration: `${duration}ms`,
                category: 'performance'
            });

            res.json({
                success: true,
                message: 'Verification email sent successfully. Please check your email.'
            });
        } catch (emailError) {
            logger.error(`Email verification sending failed: ${emailError.message}`, {
                userId: user.id,
                category: 'error'
            });
            res.status(500).json({ error: 'Failed to send verification email' });
        }
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Send verification error: ${error.message}`, {
            error: error.stack,
            ip: clientIP,
            duration: `${duration}ms`,
            category: 'error'
        });

        if (error.message === 'User is already verified') {
            res.status(400).json({ error: 'Email is already verified' });
        } else {
            res.status(500).json({ error: 'Failed to send verification email' });
        }
    }
};

const verifyEmail = async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.ip || req.connection.remoteAddress;

    logger.auth(`Email verification attempt`, {
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        category: 'auth'
    });

    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Verification token is required' });
        }

        // Verify the email
        const result = await authService.verifyEmail(token);

        const duration = Date.now() - startTime;
        logger.performance(`Email verification completed`, {
            userId: result.userId,
            duration: `${duration}ms`,
            category: 'performance'
        });

        res.json({
            success: true,
            message: 'Email verified successfully. You can now access all features.'
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(`Verify email error: ${error.message}`, {
            error: error.stack,
            ip: clientIP,
            duration: `${duration}ms`,
            category: 'error'
        });

        if (error.message.includes('Invalid or expired')) {
            res.status(400).json({ error: 'Invalid or expired verification token' });
        } else {
            res.status(500).json({ error: 'Failed to verify email' });
        }
    }
};

module.exports = {
    register,
    login,
    logout,
    refresh,
    getMe,
    updateProfile,
    switchRole,
    verifyUser,
    forgotPassword,
    resetPassword,
    sendVerification,
    verifyEmail
};
