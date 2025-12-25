const express = require('express');
const { verifyToken, requireRole } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const authController = require('../controllers/authController');

const router = express.Router();

// Register
router.post('/register', authRateLimit, authController.register);

// Login
router.post('/login', authRateLimit, authController.login);

// Logout
router.post('/logout', authController.logout);

// Refresh token
router.post('/refresh', authController.refresh);

// Get current user
// Added middleware logging in controller or omitted if not needed. 
// Original code had some inline console.log middleware for /me.
// Keeping it simple as controller handles logic.
router.get('/me', verifyToken, authController.getMe);

// Update user profile
router.put('/profile', verifyToken, authController.updateProfile);

// Switch active primary_role and issue new token
router.post('/switch-primary_role', verifyToken, authController.switchRole);

// Verify user by email (for testing purposes) - Admin only
router.post('/verify-user', requireRole('admin'), authController.verifyUser);

// Forgot password - send reset email
router.post('/forgot-password', authRateLimit, authController.forgotPassword);

// Reset password with token
router.post('/reset-password', authRateLimit, authController.resetPassword);

// Send email verification
router.post('/send-verification', verifyToken, authController.sendVerification);

// Verify email with token
router.post('/verify-email', authController.verifyEmail);

module.exports = router;
