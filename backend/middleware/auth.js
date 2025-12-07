const jwt = require('jsonwebtoken');
const logger = require('../logger');

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
    const decoded = jwt.verify(token, JWT_SECRET);
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

    const userRole = req.user.role;
    const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [];
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
    if (req.user.role === 'admin') {
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

module.exports = {
  verifyToken,
  requireRole,
  requireOwnershipOrAdmin
};
