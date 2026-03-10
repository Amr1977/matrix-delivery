const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const IS_TEST = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'testing';

// Ensure logs directory exists (no-op in tests if not used)
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  try { fs.mkdirSync(logsDir, { recursive: true }); } catch (_) { /* ignore */ }
}

// Levels and colors
const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const colors = { error: 'bold red', warn: 'bold yellow', info: 'bold green', http: 'bold magenta', debug: 'cyan' };
winston.addColors(colors);

const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Transports
const transports = [
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    )
  })
];

if (!IS_TEST) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logsDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      format: baseFormat,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      format: baseFormat,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'security-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'warn',
      format: baseFormat,
      maxSize: '20m',
      maxFiles: '14d'
    }),
    new DailyRotateFile({
      filename: path.join(logsDir, 'performance-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'info',
      format: baseFormat,
      maxSize: '20m',
      maxFiles: '14d'
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: baseFormat,
  transports,
  exitOnError: false,
});

// Helper methods
logger.auth = (message, meta = {}) => logger.info(`AUTH: ${message}`, { ...meta, category: 'authentication' });
logger.order = (message, meta = {}) => logger.info(`ORDER: ${message}`, { ...meta, category: 'order' });
logger.payment = (message, meta = {}) => logger.info(`PAYMENT: ${message}`, { ...meta, category: 'payment' });
logger.location = (message, meta = {}) => logger.info(`LOCATION: ${message}`, { ...meta, category: 'location' });
logger.review = (message, meta = {}) => logger.info(`REVIEW: ${message}`, { ...meta, category: 'review' });
logger.admin = (message, meta = {}) => logger.info(`ADMIN: ${message}`, { ...meta, category: 'admin' });
logger.security = (message, meta = {}) => logger.warn(`SECURITY: ${message}`, { ...meta, category: 'security' });
logger.performance = (message, meta = {}) => logger.info(`PERF: ${message}`, { ...meta, category: 'performance' });
logger.messaging = (message, meta = {}) => logger.info(`MESSAGING: ${message}`, { ...meta, category: 'messaging' });

// Middlewares
logger.requestLogger = (req, res, next) => {
  const start = Date.now();
  logger.http(`REQUEST: ${req.method} ${req.originalUrl}`, {
    method: req.method, url: req.originalUrl, ip: req.ip, userAgent: req.get('User-Agent'), category: 'http'
  });
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `RESPONSE: ${req.method} ${req.originalUrl} ${res.statusCode}`, {
      method: req.method, url: req.originalUrl, statusCode: res.statusCode, duration: `${duration}ms`, ip: req.ip, userAgent: req.get('User-Agent'), category: 'http'
    });
  });
  next();
};

logger.errorLogger = (err, req, res, next) => {
  logger.error(`ERROR: ${err.message}`, {
    stack: err.stack, method: req.method, url: req.originalUrl, ip: req.ip, userAgent: req.get('User-Agent'), category: 'error'
  });
  next(err);
};

module.exports = logger;
