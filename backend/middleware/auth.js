const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

// Environment is already loaded by server.js or jest.setup.js
// No need to call dotenv.config() here

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware to verify JWT token and attach user to request
 */
const verifyToken = (req, res, next) => {
  // Check for token in cookies first (preferred method)
  let token = req.cookies?.token;

  // Fall back to Authorization header
  if (!token) {
    token = req.headers['authorization']?.split(' ')[1];
  }

  const clientIP = req.ip || req.connection.remoteAddress;

  if (!token) {
    logger.security('Access attempt without token', {
      ip: clientIP,
      path: req.path,
      method: req.method,
      category: 'security'
    });
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      audience: 'matrix-delivery-api',
      issuer: 'matrix-delivery'
    });
    req.user = decoded;

    logger.auth('Token verified successfully', {
      userId: decoded.userId,
      role: decoded.role,
      ip: clientIP,
      category: 'auth'
    });

    next();
  } catch (error) {
    logger.security('Invalid token provided', {
      error: error.message,
      ip: clientIP,
      path: req.path,
      category: 'security'
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.primary_role || req.user.role; // Support both for transition
    const userRoles = Array.isArray(req.user.granted_roles) ? req.user.granted_roles : (Array.isArray(req.user.roles) ? req.user.roles : []);
    const hasRequired = roles.includes(userRole) || roles.some(r => userRoles.includes(r));
    if (!hasRequired) {
      logger.security('Insufficient permissions', {
        userId: req.user.userId,
        userRole,
        userRoles,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        category: 'security'
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to check if user owns the resource or is admin
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admins can access any resource
    const userRole = req.user.primary_role || req.user.role;
    const userRoles = req.user.granted_roles || req.user.roles || [];
    const isAdmin = userRole === 'admin' || (Array.isArray(userRoles) && userRoles.includes('admin'));
    if (isAdmin) {
      return next();
    }

    // Check if user owns the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];

    if (req.user.userId !== resourceUserId) {
      logger.security('Resource access denied', {
        userId: req.user.userId,
        resourceUserId,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        category: 'security'
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

/**
 * Middleware to verify user owns the balance they're accessing
 * Used for balance API endpoints
 */
const verifyBalanceOwnership = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admins can access any balance
  const userRole = req.user.primary_role || req.user.role;
  const userRoles = req.user.granted_roles || req.user.roles || [];
  const isAdmin = userRole === 'admin' || (Array.isArray(userRoles) && userRoles.includes('admin'));

  if (isAdmin) {
    return next();
  }

  // Get userId from params or body
  const requestedUserId = parseInt(req.params.userId) || parseInt(req.body.userId);
  const authenticatedUserId = req.user.userId || req.user.id;

  if (requestedUserId !== authenticatedUserId) {
    logger.security('Balance access denied', {
      userId: authenticatedUserId,
      requestedUserId,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      category: 'security'
    });
    return res.status(403).json({ error: 'Access denied: You can only access your own balance' });
  }

  next();
};

/**
 * Middleware to require admin role
 * Simplified version for admin-only endpoints
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const userRole = req.user.primary_role || req.user.role;
  const userRoles = req.user.granted_roles || req.user.roles || [];
  const isAdmin = userRole === 'admin' || (Array.isArray(userRoles) && userRoles.includes('admin'));

  if (!isAdmin) {
    logger.security('Admin access denied', {
      userId: req.user.userId,
      userRole,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      category: 'security'
    });
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

/**
 * Middleware to verify admin access (alternative implementation)
 * Checks if user has admin role (primary_role or granted_roles)
 */
const verifyAdmin = async (req, res, next) => {
  const pool = require('../config/db');

  try {
    // Check for token in cookies first (preferred method)
    let token = req.cookies?.token;

    // Fall back to Authorization header
    if (!token) {
      token = req.headers['authorization']?.split(' ')[1];
    }

    if (!token) {
      logger.security('Admin access attempt without token', {
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        category: 'security'
      });
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if user is admin
    const userResult = await pool.query(
      'SELECT id, email, name, primary_role, granted_roles FROM users WHERE id = $1',
      [decoded.userId]
    );

    const row = userResult.rows[0];
    const hasAdmin = row && (row.primary_role === 'admin' || (Array.isArray(row.granted_roles) && row.granted_roles.includes('admin')));

    if (userResult.rows.length === 0 || !hasAdmin) {
      logger.security('Non-admin user attempted admin access', {
        userId: decoded.userId,
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        category: 'security'
      });
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = decoded;
    req.admin = { id: row.id, email: row.email, name: row.name };

    logger.auth('Admin access granted', {
      adminId: row.id,
      email: row.email,
      path: req.path,
      category: 'auth'
    });

    next();
  } catch (error) {
    logger.security('Admin verification error', {
      error: error.message,
      ip: req.ip || req.connection.remoteAddress,
      category: 'security'
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Vendor authorization middleware
 * Checks if user is admin or owns the vendor resource
 */
const authorizeVendorManage = async (req, res, next) => {
  const pool = require('../config/db'); // Require locally to avoid circular dependency issues if any
  try {
    const role = req.user?.role;
    const roles = req.user?.roles || [];
    if (role === 'admin' || (Array.isArray(roles) && roles.includes('admin'))) {
      return next();
    }
    const result = await pool.query('SELECT owner_user_id FROM vendors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Vendor not found' });
    const owner = result.rows[0].owner_user_id;
    if (owner && owner === req.user?.userId) return next();
    return res.status(403).json({ error: 'Forbidden' });
  } catch (error) {
    return res.status(500).json({ error: 'Authorization failed' });
  }
};

module.exports = {
  verifyToken,
  requireRole,
  requireOwnershipOrAdmin,
  verifyBalanceOwnership,
  requireAdmin,
  verifyAdmin,
  authorizeVendorManage
};
