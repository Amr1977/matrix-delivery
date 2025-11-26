const express = require('express');
const authService = require('../services/authService');
const emailService = require('../services/emailService');
const { verifyToken, requireRole } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const logger = require('../logger');

const router = express.Router();

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

    const axios = require('axios');
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

// Routes

// Register
router.post('/register', authRateLimit, async (req, res) => {
  const startTime = Date.now();
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.auth(`Registration attempt`, {
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    category: 'auth'
  });

  try {
    const { name, email, password, phone, role, vehicle_type, country, city, area, recaptchaToken } = req.body;

    // Verify reCAPTCHA token only in production
    if (process.env.NODE_ENV === 'production' && !(await verifyRecaptcha(recaptchaToken))) {
      logger.security(`reCAPTCHA verification failed`, {
        ip: clientIP,
        category: 'security'
      });
      return res.status(400).json({ error: 'CAPTCHA verification failed' });
    }

    // Basic validation
    if (!name || !email || !password || !phone || !role || !country || !city || !area) {
      return res.status(400).json({ error: 'All fields required: name, email, password, phone, role, country, city, and area' });
    }

    if (role === 'driver' && !vehicle_type) {
      return res.status(400).json({ error: 'Vehicle type is required for drivers' });
    }

    // Use auth service
    const result = await authService.registerUser({
      name, email, password, phone, role, vehicle_type, country, city, area
    });

    const duration = Date.now() - startTime;
    logger.performance(`Registration completed`, {
      userId: result.user.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    res.status(201).json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Registration error: ${error.message}`, {
      stack: error.stack,
      ip: clientIP,
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', authRateLimit, async (req, res) => {
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

    res.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Login error: ${error.message}`, {
      stack: error.stack,
      ip: clientIP,
      duration: `${duration}ms`,
      category: 'error'
    });
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
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
});

// Switch active role and issue new token
router.post('/switch-role', verifyToken, async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    const { token, roles } = await authService.switchRole(req.user.userId, role);
    res.json({ token, role, roles });
  } catch (error) {
    logger.error(`Switch role error: ${error.message}`, { userId: req.user.userId, category: 'error' });
    res.status(400).json({ error: error.message || 'Failed to switch role' });
  }
});

// Verify user by email (for testing purposes)
router.post('/verify-user', requireRole('admin'), async (req, res) => {
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
      role: user.role,
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
});

// Forgot password - send reset email
router.post('/forgot-password', authRateLimit, async (req, res) => {
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
});

// Reset password with token
router.post('/reset-password', authRateLimit, async (req, res) => {
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
});

module.exports = router;
