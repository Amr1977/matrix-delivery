const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const logger = require('../logger');

// Load environment-specific .env file
const envFile = process.env.ENV_FILE || '.env';
require('dotenv').config({ path: envFile });

const JWT_SECRET = process.env.JWT_SECRET;
const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// PostgreSQL Connection Pool
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: IS_TEST ? (process.env.DB_NAME_TEST || 'matrix_delivery_test') : (process.env.DB_NAME || 'matrix_delivery'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class AuthService {
  /**
   * Generate a unique ID
   */
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Sanitize string input
   */
  sanitizeString(str, maxLength = 1000) {
    if (typeof str !== 'string') return '';
    return str.trim().substring(0, maxLength).replace(/[<>\"'&]/g, '');
  }

  /**
   * Validate email format
   */
  validateEmail(email) {
    const sanitized = this.sanitizeString(email, 255);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized);
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const sanitized = this.sanitizeString(password, 255);
    return sanitized && sanitized.length >= 8;
  }

  /**
   * Hash password
   */
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }

  /**
   * Verify password
   */
  async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT token
   */
  generateToken(user) {
    const roles = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : [user.role].filter(Boolean);
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email.trim()]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id) {
    const result = await pool.query(
      'SELECT id, name, email, role, roles, rating, completed_deliveries, is_verified, country, city, area, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create new user
   */
  async createUser(userData) {
    const {
      name,
      email,
      password,
      phone,
      role,
      vehicle_type,
      country,
      city,
      area
    } = userData;

    const hashedPassword = await this.hashPassword(password);
    const userId = this.generateId();

    const result = await pool.query(
      `INSERT INTO users (id, name, email, password, phone, role, vehicle_type, country, city, area, rating, completed_deliveries)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, email, phone, role, vehicle_type, country, city, area`,
      [
        userId,
        this.sanitizeString(name, 100),
        email.toLowerCase().trim(),
        hashedPassword,
        this.sanitizeString(phone, 20),
        role,
        role === 'driver' ? vehicle_type : null,
        this.sanitizeString(country, 100),
        this.sanitizeString(city, 100),
        this.sanitizeString(area, 100),
        5, // Default rating
        0  // Default completed deliveries
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user verification status
   */
  async verifyUser(email) {
    const result = await pool.query(
      'UPDATE users SET is_verified = true WHERE LOWER(email) = LOWER($1) RETURNING id, name, email, role',
      [email.trim()]
    );
    return result.rows[0] || null;
  }

  /**
   * Update user rating
   */
  async updateUserRating(userId, newRating) {
    await pool.query(
      'UPDATE users SET rating = $1 WHERE id = $2',
      [parseFloat(newRating), userId]
    );
  }

  /**
   * Increment completed deliveries for driver
   */
  async incrementCompletedDeliveries(driverId) {
    await pool.query(
      'UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1',
      [driverId]
    );
  }

  /**
   * Authenticate user login
   */
  async authenticateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_available) {
      throw new Error('Account is suspended. Please contact support.');
    }

    return user;
  }

  /**
   * Register new user
   */
  async registerUser(userData) {
    const { email, password, role, vehicle_type } = userData;

    // Validation
    if (!this.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!this.validatePassword(password)) {
      throw new Error('Password must be at least 8 characters');
    }

    if (!['customer', 'driver'].includes(role)) {
      throw new Error('Invalid role');
    }

    if (role === 'driver' && !vehicle_type) {
      throw new Error('Vehicle type is required for drivers');
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await this.createUser(userData);
    const token = this.generateToken(user);

    logger.auth('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      category: 'auth'
    });

    return { user, token };
  }

  /**
   * Login user
   */
  async loginUser(email, password) {
    const user = await this.authenticateUser(email, password);
    const token = this.generateToken(user);

    logger.auth('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
      category: 'auth'
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        roles: Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean),
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        country: user.country,
        city: user.city,
        area: user.area
      },
      token
    };
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      roles: Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean),
      rating: parseFloat(user.rating),
      completedDeliveries: user.completed_deliveries,
      isVerified: user.is_verified,
      country: user.country,
      city: user.city,
      area: user.area,
      joinedAt: user.created_at
    };
  }

  async switchRole(userId, role) {
    const result = await pool.query('SELECT id, name, email, role, roles FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) throw new Error('User not found');
    const user = result.rows[0];
    const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role].filter(Boolean);
    if (!roles.includes(role)) throw new Error('Role not assigned to user');
    const token = jwt.sign({ userId: user.id, email: user.email, name: user.name, role, roles }, JWT_SECRET, { expiresIn: '30d' });
    return { token, role, roles };
  }
}

module.exports = new AuthService();
