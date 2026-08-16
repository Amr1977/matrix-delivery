const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../config/db");
const logger = require("../config/logger");
const { generateId } = require("../utils/generators");
const { sanitizeString } = require("../utils/sanitizers");
const { validateEmail, validatePassword } = require("../utils/validators");

// Environment is already loaded by server.js or jest.setup.js
// No need to call dotenv.config() here

const JWT_SECRET = process.env.JWT_SECRET;
const IS_TEST =
  process.env.NODE_ENV === "test" || process.env.NODE_ENV === "testing";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

let googleClient;
function getGoogleClient() {
  if (!googleClient) {
    googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }
  return googleClient;
}

class AuthService {
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
    const primary_role = user.primary_role;
    const granted_roles =
      user.granted_roles || (primary_role ? [primary_role] : []);

    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        primary_role: primary_role,
        granted_roles: granted_roles, // Standardize on snake_case for token consistency
      },
      JWT_SECRET,
      {
        expiresIn: "30d",
        audience: "matrix-delivery-api",
        issuer: "matrix-delivery",
      },
    );
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error("Invalid or expired token");
    }
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    const result = await pool.query(
      "SELECT * FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()],
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by ID
   */
  async findUserById(id) {
    const result = await pool.query(
      "SELECT id, name, email, primary_role, granted_roles, rating, completed_deliveries, is_verified, country, city, area, created_at, profile_picture_url FROM users WHERE id = $1",
      [id],
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
      primary_role,
      vehicle_type,
      country,
      city,
      area,
    } = userData;

    const hashedPassword = await this.hashPassword(password);
    const userId = generateId();

    const result = await pool.query(
      `INSERT INTO users (
      id, 
      name, 
      email, 
      password_hash, 
      phone, 
      primary_role,
      granted_roles, 
      vehicle_type, 
      country, 
      city, 
      area, 
      rating, 
      completed_deliveries)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, name, email, phone, primary_role, vehicle_type, country, city, area`,
      [
        userId,
        sanitizeString(name, 100),
        email.toLowerCase().trim(),
        hashedPassword,
        sanitizeString(phone, 20),
        primary_role,
        [primary_role],
        vehicle_type,
        sanitizeString(country, 100),
        sanitizeString(city, 100),
        sanitizeString(area, 100),
        0, // Default rating
        0, // Default completed deliveries
      ],
    );

    return result.rows[0];
  }

  /**
   * Update user verification status
   */
  async verifyUser(email) {
    const result = await pool.query(
      "UPDATE users SET is_verified = true WHERE LOWER(email) = LOWER($1) RETURNING id, name, email, primary_role",
      [email.trim()],
    );
    return result.rows[0] || null;
  }

  /**
   * Update user rating
   */
  async updateUserRating(userId, newRating) {
    await pool.query("UPDATE users SET rating = $1 WHERE id = $2", [
      parseFloat(newRating),
      userId,
    ]);
  }

  /**
   * Increment completed deliveries for driver
   */
  async incrementCompletedDeliveries(driverId) {
    await pool.query(
      "UPDATE users SET completed_deliveries = completed_deliveries + 1 WHERE id = $1",
      [driverId],
    );
  }

  /**
   * Authenticate user login
   */
  async authenticateUser(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await this.verifyPassword(
      password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    if (!user.is_available) {
      throw new Error("Account is suspended. Please contact support.");
    }

    return user;
  }

  /**
   * Register new user
   */
  async registerUser(userData) {
    const { email, password, primary_role, vehicle_type } = userData;

    // Validation
    if (!validateEmail(email)) {
      throw new Error("Invalid email format");
    }

    if (!validatePassword(password)) {
      throw new Error("Password must be at least 8 characters");
    }

    if (!["customer", "driver"].includes(primary_role)) {
      throw new Error("Invalid primary_role");
    }

    if (primary_role === "driver" && !vehicle_type) {
      throw new Error("Vehicle type is required for drivers");
    }

    // Check if user already exists
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Create user
    const user = await this.createUser(userData);

    // Initialize user balance
    try {
      await pool.query(
        "INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance) VALUES ($1, 'EGP', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING",
        [user.id],
      );
      logger.info(`Initialized balance for new user ${user.id}`);
    } catch (balanceError) {
      logger.error(
        `Failed to initialize balance for user ${user.id}: ${balanceError.message}`,
      );
      // Throwing here to ensure we don't end up with inconsistent user state
      throw new Error("Failed to initialize user balance");
    }

    const token = this.generateToken(user);

    logger.auth("User registered successfully", {
      userId: user.id,
      email: user.email,
      primary_role: user.primary_role,
      category: "auth",
    });

    return { user, token };
  }

  /**
   * Login user
   */
  async loginUser(email, password) {
    const user = await this.authenticateUser(email, password);
    const token = this.generateToken(user);

    logger.auth("User logged in successfully", {
      userId: user.id,
      email: user.email,
      primary_role: user.primary_role,
      category: "auth",
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        primary_role: user.primary_role,
        granted_roles:
          Array.isArray(user.granted_roles) && user.granted_roles.length
            ? user.granted_roles
            : [user.primary_role].filter(Boolean),
        rating: parseFloat(user.rating),
        completedDeliveries: user.completed_deliveries,
        is_verified: user.is_verified,
        country: user.country,
        city: user.city,
        area: user.area,
      },
      token,
    };
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId, updates) {
    // Build dynamic UPDATE query based on provided fields
    const allowedFields = [
      "name",
      "phone",
      "language",
      "theme",
      "vehicle_type",
      "license_number",
      "service_area_zone",
    ];
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      throw new Error("No valid fields to update");
    }

    // Add userId as the last parameter
    values.push(userId);

    const query = `
      UPDATE users 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, phone, primary_role, granted_roles, language, theme, vehicle_type, license_number, service_area_zone, profile_picture_url, rating, completed_deliveries, is_verified, country, city, area, created_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error("User not found");
    }

    const user = result.rows[0];

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      primary_role: user.primary_role,
      granted_roles:
        user.granted_roles || (user.primary_role ? [user.primary_role] : []),
      language: user.language,
      theme: user.theme,
      vehicle_type: user.vehicle_type,
      license_number: user.license_number,
      service_area_zone: user.service_area_zone,
      profile_picture_url: user.profile_picture_url,
      rating: parseFloat(user.rating),
      completed_deliveries: user.completed_deliveries, // Standardize on snake_case
      completedDeliveries: user.completed_deliveries, // camelCase for frontend compat
      is_verified: user.is_verified,
      country: user.country,
      city: user.city,
      area: user.area,
      created_at: user.created_at,
    };
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId) {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      primary_role: user.primary_role,
      granted_roles: user.granted_roles,
      country: user.country,
      city: user.city,
      area: user.area,
      vehicle_type: user.vehicle_type,
      rating: parseFloat(user.rating || 0),
      completed_deliveries: parseInt(user.completed_deliveries || 0),
      is_verified: user.is_verified,
      profile_picture_url: user.profile_picture_url,
      createdAt: user.created_at,
    };
  }

  async switchRole(userId, primary_role) {
    const result = await pool.query(
      "SELECT id, name, email, primary_role, granted_roles FROM users WHERE id = $1",
      [userId],
    );
    if (result.rows.length === 0) throw new Error("User not found");
    const user = result.rows[0];
    const granted_roles =
      user.granted_roles || (user.primary_role ? [user.primary_role] : []);
    if (!granted_roles.includes(primary_role))
      throw new Error("primary_role not assigned to user");

    // Update primary_role in database for persistence
    await pool.query("UPDATE users SET primary_role = $1 WHERE id = $2", [
      primary_role,
      userId,
    ]);

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
        primary_role: primary_role,
        granted_roles: granted_roles,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    return { token, primary_role: primary_role, granted_roles };
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(email) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    // Clean expired tokens for this user first
    await this.cleanExpiredTokens(user.id);

    const tokenId = generateId();
    const resetToken = generateId(); // Generate secure token
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenId, user.id, resetToken, expiresAt],
    );

    return { user, resetToken };
  }

  /**
   * Find password reset token
   */
  async findPasswordResetToken(token) {
    const result = await pool.query(
      `SELECT prt.*, u.name, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > $2`,
      [token, new Date()],
    );
    return result.rows[0] || null;
  }

  /**
   * Use password reset token (mark as used)
   */
  async usePasswordResetToken(token) {
    const result = await pool.query(
      `UPDATE password_reset_tokens
       SET used = true
       WHERE token = $1 AND used = false AND expires_at > NOW()
       RETURNING user_id`,
      [token],
    );
    return result.rows[0] || null;
  }

  /**
   * Reset user password
   */
  async resetPassword(token, newPassword) {
    const tokenData = await this.findPasswordResetToken(token);
    if (!tokenData) {
      throw new Error("Invalid or expired reset token");
    }

    const hashedPassword = await this.hashPassword(newPassword);

    // Update password and mark token as used in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query("UPDATE users SET password = $1 WHERE id = $2", [
        hashedPassword,
        tokenData.user_id,
      ]);

      await client.query(
        "UPDATE password_reset_tokens SET used = true WHERE token = $1",
        [token],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { success: true };
  }

  /**
   * Clean expired password reset tokens
   */
  async cleanExpiredTokens(userId = null) {
    const query = userId
      ? "DELETE FROM password_reset_tokens WHERE user_id = $1 AND expires_at < NOW()"
      : "DELETE FROM password_reset_tokens WHERE expires_at < NOW()";

    const params = userId ? [userId] : [];
    await pool.query(query, params);
  }

  /**
   * Create email verification token
   */
  async createEmailVerificationToken(email) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.is_verified) {
      throw new Error("User is already verified");
    }

    // Clean expired tokens for this user first
    await this.cleanExpiredEmailVerificationTokens(user.id);

    const tokenId = generateId();
    const verificationToken = generateId(); // Generate secure token
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await pool.query(
      `INSERT INTO email_verification_tokens (id, user_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [tokenId, user.id, verificationToken, expiresAt],
    );

    return { user, verificationToken };
  }

  /**
   * Find email verification token
   */
  async findEmailVerificationToken(token) {
    const result = await pool.query(
      `SELECT ev.*, u.name, u.email
       FROM email_verification_tokens ev
       JOIN users u ON ev.user_id = u.id
       WHERE ev.token = $1 AND ev.used = false AND ev.expires_at > $2`,
      [token, new Date()],
    );
    return result.rows[0] || null;
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    const tokenData = await this.findEmailVerificationToken(token);
    if (!tokenData) {
      throw new Error("Invalid or expired verification token");
    }

    // Update user verification status and mark token as used in a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        "UPDATE users SET is_verified = true, verified_at = NOW() WHERE id = $1",
        [tokenData.user_id],
      );

      await client.query(
        "UPDATE email_verification_tokens SET used = true WHERE token = $1",
        [token],
      );

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return { success: true, userId: tokenData.user_id };
  }

  /**
   * Clean expired email verification tokens
   */
  async cleanExpiredEmailVerificationTokens(userId = null) {
    const query = userId
      ? "DELETE FROM email_verification_tokens WHERE user_id = $1 AND expires_at < NOW()"
      : "DELETE FROM email_verification_tokens WHERE expires_at < NOW()";

    const params = userId ? [userId] : [];
    await pool.query(query, params);
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.is_verified) {
      throw new Error("User is already verified");
    }

    // Create new verification token (this will clean up old ones)
    return await this.createEmailVerificationToken(email);
  }
  /**
   * Authenticate with Google ID token
   * If user exists with that email, log them in.
   * If not, create a new user account.
   */
  async googleAuthenticate(credential) {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error("Google authentication is not configured");
    }

    let payload;
    try {
      const client = getGoogleClient();
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (error) {
      logger.error(`Google token verification failed: ${error.message}`);
      throw new Error("Invalid Google credential");
    }

    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name || email.split("@")[0];
    const picture = payload.picture;

    if (!email) {
      throw new Error("Google account must have an email address");
    }

    // Check if user already exists with this email
    let user = await this.findUserByEmail(email);

    if (user) {
      // Link google_id if not already linked
      if (!user.google_id) {
        await pool.query(
          "UPDATE users SET google_id = $1, profile_picture_url = COALESCE($2, profile_picture_url) WHERE id = $3",
          [googleId, picture, user.id],
        );
      }
    } else {
      // Create new user from Google profile
      const userId = generateId();
      const result = await pool.query(
        `INSERT INTO users (id, name, email, password_hash, phone, primary_role, granted_roles, country, city, area, google_id, profile_picture_url, rating, completed_deliveries, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         RETURNING id, name, email, phone, primary_role, google_id, profile_picture_url, is_verified`,
        [
          userId,
          sanitizeString(name, 100),
          email.toLowerCase().trim(),
          "", // No password for Google users
          "", // Phone will be collected later
          "customer",
          ["customer"],
          "", // Country TBD
          "", // City TBD
          "", // Area TBD
          googleId,
          picture || null,
          0,
          0,
          true, // Email is verified by Google
        ],
      );
      user = result.rows[0];

      // Initialize balance
      try {
        await pool.query(
          "INSERT INTO user_balances (user_id, currency, available_balance, pending_balance, held_balance) VALUES ($1, 'EGP', 0, 0, 0) ON CONFLICT (user_id) DO NOTHING",
          [user.id],
        );
      } catch (balanceError) {
        logger.error(
          `Failed to initialize balance for Google user ${user.id}: ${balanceError.message}`,
        );
      }

      logger.auth("User registered via Google", {
        userId: user.id,
        email: user.email,
        category: "auth",
      });
    }

    const token = this.generateToken(user);

    const userResponse = await this.findUserById(user.id);

    return {
      user: {
        id: userResponse.id,
        name: userResponse.name,
        email: userResponse.email,
        phone: userResponse.phone || "",
        primary_role: userResponse.primary_role,
        granted_roles:
          userResponse.granted_roles ||
          [userResponse.primary_role].filter(Boolean),
        country: userResponse.country || "",
        city: userResponse.city || "",
        area: userResponse.area || "",
        rating: parseFloat(userResponse.rating || 0),
        completedDeliveries: userResponse.completed_deliveries || 0,
        is_verified: userResponse.is_verified,
        profile_picture_url: userResponse.profile_picture_url,
      },
      token,
    };
  }

  /**
   * Blacklist a token until it expires
   */
  async blacklistToken(token) {
    const redis = require("../config/redis");
    if (!redis) return; // Redis not enabled

    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) return;

      const now = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - now;

      if (ttl > 0) {
        const key = `blacklist:token:${token}`; // Consider hashing if token is long
        await redis.set(key, "revoked", "EX", ttl);
        logger.info(`Token blacklisted for user ${decoded.userId}`, { ttl });
      }
    } catch (error) {
      logger.error(`Failed to blacklist token: ${error.message}`);
      // Don't throw, logout should continue
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token) {
    const redis = require("../config/redis");
    if (!redis) return false;

    try {
      const key = `blacklist:token:${token}`;
      const result = await redis.get(key);
      return result === "revoked";
    } catch (error) {
      logger.error(`Failed to check token blacklist: ${error.message}`);
      return false; // Fail open to allow access if Redis is down
    }
  }
}

module.exports = new AuthService();
