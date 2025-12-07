const logger = require('../config/logger');

/**
 * Middleware to validate request body against a schema
 */
const validateBody = (schema) => {
  return (req, res, next) => {
    console.log('🔍 BACKEND - VALIDATION MIDDLEWARE - INCOMING REQUEST BODY FOR:', req.path);
    console.log('🔍 BACKEND - REQUEST BODY RAW:', JSON.stringify(req.body, null, 2));
    console.log('🔍 BACKEND - REQUEST HEADERS:', JSON.stringify({
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer [HIDDEN]' : 'None'
    }, null, 2));

    if (req.path === '/api/orders') {
      console.log('📦 BACKEND - ORDER CREATION REQUEST DETECTED');
      console.log('📦 BACKEND - ORDER REQUEST ANALYSIS:', {
        hasBody: !!req.body,
        hasOrderData: !!req.body.orderData,
        hasPickupAddress: !!req.body.pickupAddress,
        hasDropoffAddress: !!req.body.dropoffAddress,
        showManualEntry: req.body.showManualEntry,
        title: req.body.orderData?.title,
        price: req.body.orderData?.price,
        pickupCountry: req.body.pickupAddress?.country,
        pickupCity: req.body.pickupAddress?.city,
        dropoffCountry: req.body.dropoffAddress?.country,
        dropoffCity: req.body.dropoffAddress?.city
      });
    }

    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      console.log('🚨 BACKEND - VALIDATION FAILED FOR:', req.path);
      console.log('🚨 BACKEND - VALIDATION ERRORS:', JSON.stringify(errors, null, 2));

      logger.warn('Request validation failed', {
        errors,
        body: req.body,
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        category: 'validation'
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    console.log('✅ BACKEND - VALIDATION PASSED FOR:', req.path);
    next();
  };
};

/**
 * Middleware to validate request parameters
 */
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.params, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Parameter validation failed', {
        errors,
        params: req.params,
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        category: 'validation'
      });

      return res.status(400).json({
        error: 'Parameter validation failed',
        details: errors
      });
    }

    next();
  };
};

/**
 * Middleware to validate request query parameters
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.query, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Query validation failed', {
        errors,
        query: req.query,
        ip: req.ip || req.connection.remoteAddress,
        path: req.path,
        category: 'validation'
      });

      return res.status(400).json({
        error: 'Query validation failed',
        details: errors
      });
    }

    next();
  };
};

/**
 * Middleware to sanitize string inputs
 */
const sanitizeInput = (fields = []) => {
  return (req, res, next) => {
    if (req.body && fields.length > 0) {
      fields.forEach(field => {
        if (req.body[field] && typeof req.body[field] === 'string') {
          // Basic sanitization - remove potentially harmful characters
          req.body[field] = req.body[field]
            .trim()
            .replace(/[<>\"'&]/g, '')
            .substring(0, 1000); // Limit length
        }
      });
    }

    next();
  };
};

/**
 * Middleware to check file upload limits
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxFiles = 1
  } = options;

  return (req, res, next) => {
    if (!req.files && !req.file) {
      return next();
    }

    const files = req.files || (req.file ? [req.file] : []);

    if (files.length > maxFiles) {
      logger.warn('Too many files uploaded', {
        count: files.length,
        maxFiles,
        ip: req.ip || req.connection.remoteAddress,
        category: 'validation'
      });
      return res.status(400).json({
        error: `Too many files. Maximum ${maxFiles} files allowed.`
      });
    }

    for (const file of files) {
      if (file.size > maxSize) {
        logger.warn('File too large', {
          size: file.size,
          maxSize,
          filename: file.originalname,
          ip: req.ip || req.connection.remoteAddress,
          category: 'validation'
        });
        return res.status(400).json({
          error: `File too large. Maximum size is ${maxSize / (1024 * 1024)}MB.`
        });
      }

      if (!allowedTypes.includes(file.mimetype)) {
        logger.warn('Invalid file type', {
          type: file.mimetype,
          allowedTypes,
          filename: file.originalname,
          ip: req.ip || req.connection.remoteAddress,
          category: 'validation'
        });
        return res.status(400).json({
          error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        });
      }
    }

    next();
  };
};

module.exports = {
  validateBody,
  validateParams,
  validateQuery,
  sanitizeInput,
  validateFileUpload
};
