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

    const duration = Date.now() - startTime;
    logger.performance(`Registration completed`, {
      userId: result.user.id,
      duration: `${duration}ms`,
      category: 'performance'
    });

    // Set httpOnly cookie for security
    const token = result.token;
    const IS_PRODUCTION = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    // Remove token from response body for security
    const response = { ...result };
    delete response.token;

    res.status(201).json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Registration error: ${error.message}`, {
      stack: error.stack,
      ip: clientIP,
      duration: `${duration}ms`,
      category: 'error'
    });
    if (error.message === 'Email already registered') {
      return res.status(409).json({ error: error.message });
    }

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

    // Set httpOnly cookie for security
    const token = result.token;
    const IS_PRODUCTION = process.env.NODE_ENV === 'production';

    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    });

    // Remove token from response body for security
    const response = { ...result };
    delete response.token;

    res.json(response);
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`Login error: ${error.message}`, {
      stack: error.stack,
      ip: clientIP,
      duration: `${duration}ms`,
      category: 'error'
    });

    if (error.message === 'Invalid email or password') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (error.message.includes('suspended')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;

  logger.auth('User logged out', {
    ip: clientIP,
    userId: req.user?.userId,
    category: 'auth'
  });

  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  res.json({ message: 'Logged out successfully' });
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

// Send email verification
router.post('/send-verification', verifyToken, async (req, res) => {
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
});

// Verify email with token
router.post('/verify-email', async (req, res) => {
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
});

module.exports = router;
