const nodemailer = require('nodemailer');
const logger = require('../config/logger');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
  }

  /**
   * Initialize email transporter
   */
  initialize() {
    if (this.isInitialized) return;

    try {
      // For development, we'll use a simple console logger
      // In production, you'd want to use a real SMTP service like SendGrid, Mailgun, etc.
      if (process.env.NODE_ENV === 'production') {
        // Production email configuration
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT || 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // Development configuration - logs to console
        this.transporter = nodemailer.createTransporter({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: process.env.ETHEREAL_USER || 'test@example.com',
            pass: process.env.ETHEREAL_PASS || 'testpass',
          },
        });
      }

      this.isInitialized = true;
      logger.info('Email service initialized successfully', { category: 'email' });
    } catch (error) {
      logger.error(`Email service initialization failed: ${error.message}`, {
        category: 'email',
        error: error.message
      });
      // Don't throw - email service should fail gracefully
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, name, resetToken) {
    if (!this.isInitialized) {
      this.initialize();
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@matrix-delivery.com',
      to: email,
      subject: 'Reset Your Matrix Delivery Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Reset Your Password</h2>
          <p>Hello ${name},</p>
          <p>You have requested to reset your password for your Matrix Delivery account.</p>
          <p>Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p><strong>This link will expire in 15 minutes for security reasons.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This email was sent by Matrix Delivery. Please do not reply to this email.</p>
        </div>
      `,
      text: `
        Hello ${name},

        You have requested to reset your password for your Matrix Delivery account.

        Please visit this link to reset your password: ${resetUrl}

        This link will expire in 15 minutes for security reasons.

        If you didn't request this password reset, please ignore this email.

        This email was sent by Matrix Delivery.
      `
    };

    try {
      if (process.env.NODE_ENV === 'production') {
        await this.transporter.sendMail(mailOptions);
      } else {
        // In development, just log the email
        logger.info('Password reset email would be sent', {
          category: 'email',
          to: email,
          resetUrl: resetUrl
        });
      }

      return { success: true };
    } catch (error) {
      logger.error(`Failed to send password reset email: ${error.message}`, {
        category: 'email',
        error: error.message,
        to: email
      });
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send welcome email (for future use)
   */
  async sendWelcomeEmail(email, name) {
    if (!this.isInitialized) {
      this.initialize();
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@matrix-delivery.com',
      to: email,
      subject: 'Welcome to Matrix Delivery!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Matrix Delivery!</h2>
          <p>Hello ${name},</p>
          <p>Thank you for joining Matrix Delivery. Your account has been created successfully.</p>
          <p>You can now log in and start using our delivery services.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This email was sent by Matrix Delivery. Please do not reply to this email.</p>
        </div>
      `,
      text: `
        Hello ${name},

        Thank you for joining Matrix Delivery. Your account has been created successfully.

        You can now log in and start using our delivery services.

        This email was sent by Matrix Delivery.
      `
    };

    try {
      if (process.env.NODE_ENV === 'production') {
        await this.transporter.sendMail(mailOptions);
      } else {
        logger.info('Welcome email would be sent', {
          category: 'email',
          to: email
        });
      }

      return { success: true };
    } catch (error) {
      logger.error(`Failed to send welcome email: ${error.message}`, {
        category: 'email',
        error: error.message,
        to: email
      });
      throw new Error('Failed to send welcome email');
    }
  }

  /**
   * Send email verification (for future use)
   */
  async sendEmailVerification(email, name, verificationToken) {
    if (!this.isInitialized) {
      this.initialize();
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@matrix-delivery.com',
      to: email,
      subject: 'Verify Your Matrix Delivery Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Hello ${name},</p>
          <p>Please verify your email address to complete your Matrix Delivery account setup.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p><strong>This link will expire in 24 hours.</strong></p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This email was sent by Matrix Delivery. Please do not reply to this email.</p>
        </div>
      `,
      text: `
        Hello ${name},

        Please verify your email address to complete your Matrix Delivery account setup.

        Visit this link to verify your email: ${verificationUrl}

        This link will expire in 24 hours.

        This email was sent by Matrix Delivery.
      `
    };

    try {
      if (process.env.NODE_ENV === 'production') {
        await this.transporter.sendMail(mailOptions);
      } else {
        logger.info('Email verification would be sent', {
          category: 'email',
          to: email,
          verificationUrl: verificationUrl
        });
      }

      return { success: true };
    } catch (error) {
      logger.error(`Failed to send email verification: ${error.message}`, {
        category: 'email',
        error: error.message,
        to: email
      });
      throw new Error('Failed to send email verification');
    }
  }
  /**
   * Close the email transporter (useful for testing)
   */
  close() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
    }
  }
}

module.exports = new EmailService();

