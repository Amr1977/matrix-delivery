const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level - using bright, high-contrast colors
const colors = {
  error: 'bold red',      // Bright red for errors
  warn: 'bold yellow',    // Bright yellow for warnings
  info: 'bold green',     // Bright green for info
  http: 'bold magenta',   // Bright magenta for HTTP requests
  debug: 'cyan',          // Cyan instead of blue for better visibility
};

// Add colors to winston
winston.addColors(colors);

// Define the format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.colorize({ all: true })
);

// Define which transports the logger must use
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    )
  }),

  // Error log file
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d'
  }),

  // Combined log file
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d'
  }),

  // Security log file
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'warn',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d'
  }),

  // Performance log file
  new DailyRotateFile({
    filename: path.join(__dirname, 'logs', 'performance-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: '20m',
    maxFiles: '14d'
  })
];

// Create the logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom logging methods for different types of events
logger.auth = (message, meta = {}) => {
  logger.info(`AUTH: ${message}`, { ...meta, category: 'authentication' });
};

logger.order = (message, meta = {}) => {
  logger.info(`ORDER: ${message}`, { ...meta, category: 'order' });
};

logger.payment = (message, meta = {}) => {
  logger.info(`PAYMENT: ${message}`, { ...meta, category: 'payment' });
};

logger.location = (message, meta = {}) => {
  logger.info(`LOCATION: ${message}`, { ...meta, category: 'location' });
};

logger.review = (message, meta = {}) => {
  logger.info(`REVIEW: ${message}`, { ...meta, category: 'review' });
};

logger.admin = (message, meta = {}) => {
  logger.info(`ADMIN: ${message}`, { ...meta, category: 'admin' });
};

logger.security = (message, meta = {}) => {
  logger.warn(`SECURITY: ${message}`, { ...meta, category: 'security' });
};

logger.performance = (message, meta = {}) => {
  logger.info(`PERF: ${message}`, { ...meta, category: 'performance' });
};

// Request logging middleware
logger.requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.http(`REQUEST: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    category: 'http'
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const level = statusCode >= 400 ? 'warn' : 'http';

    logger.log(level, `RESPONSE: ${req.method} ${req.originalUrl} ${statusCode}`, {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      category: 'http'
    });
  });

  next();
};

// Error logging middleware
logger.errorLogger = (err, req, res, next) => {
  logger.error(`ERROR: ${err.message}`, {
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    category: 'error'
  });
  next(err);
};

module.exports = logger;
