// Frontend Logger Utility
// Provides structured logging for React frontend with different log levels

import LogBatcher from './services/logBatcher';

class FrontendLogger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Set default log level based on environment
    // Capture all levels as per user request
    this.currentLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

    // Initialize log batcher
    const apiUrl = process.env.REACT_APP_API_URL;
    this.batcher = new LogBatcher(apiUrl);

    // Store original console methods
    this.originalConsole = {
      error: console.error,
      warn: console.warn,
      info: console.info,
      log: console.log,
      debug: console.debug
    };

    // Override console methods to capture all logs
    this.overrideConsole();

    // Setup global error handlers
    this.setupGlobalErrorHandlers();

    // Bind methods to preserve context
    this.error = this.error.bind(this);
    this.warn = this.warn.bind(this);
    this.info = this.info.bind(this);
    this.debug = this.debug.bind(this);
    this.api = this.api.bind(this);
    this.user = this.user.bind(this);
    this.performance = this.performance.bind(this);
  }

  shouldLog(level) {
    return this.levels[level] <= this.levels[this.currentLevel];
  }

  setUserId(id) {
    this.userId = id;
  }

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const sessionId = this.getSessionId();

    return {
      timestamp,
      level,
      message,
      userId: this.userId || null,
      sessionId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...data
    };
  }

  getSessionId() {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }

  log(level, message, data = {}) {
    if (!this.shouldLog(level)) return;

    const logData = this.formatMessage(level, message, data);

    // Console logging with appropriate method (using original methods)
    const consoleMethod = level === 'debug' ? 'log' : level;
    this.originalConsole[consoleMethod](`[${level.toUpperCase()}] ${message}`, logData);

    // Send to backend via batcher (only error, warn, and info by default)
    if (level === 'error' || level === 'warn' || level === 'info') {
      this.batcher.addLog(logData);
    }
  }

  error(message, data = {}) {
    this.log('error', message, { ...data, category: data.category || 'error' });
  }

  warn(message, data = {}) {
    this.log('warn', message, { ...data, category: data.category || 'warning' });
  }

  info(message, data = {}) {
    this.log('info', message, { ...data, category: data.category || 'info' });
  }

  debug(message, data = {}) {
    this.log('debug', message, { ...data, category: data.category || 'debug' });
  }

  // Specialized logging methods
  api(method, url, status, duration, data = {}) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, `API ${method} ${url}`, {
      ...data,
      category: 'api',
      method,
      url,
      statusCode: status,
      durationMs: duration
    });
  }

  user(action, data = {}) {
    this.info(`User action: ${action}`, {
      ...data,
      category: 'user',
      action
    });
  }

  performance(action, duration, data = {}) {
    this.info(`Performance: ${action}`, {
      ...data,
      category: 'performance',
      action,
      durationMs: duration
    });
  }

  // Error boundary logging
  logError(error, errorInfo, componentStack) {
    this.error('React Error Boundary caught an error', {
      error: error.message,
      stackTrace: error.stack,
      componentStack,
      category: 'react_error',
      metadata: { errorInfo }
    });
  }

  // Navigation logging
  logNavigation(from, to) {
    this.info('Navigation', {
      from,
      to,
      category: 'navigation'
    });
  }

  /**
   * Override console methods to capture all console output
   */
  overrideConsole() {
    const self = this;

    console.error = function (...args) {
      self.originalConsole.error.apply(console, args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      self.error(message, {
        category: 'console',
        args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg)
      });
    };

    console.warn = function (...args) {
      self.originalConsole.warn.apply(console, args);
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      self.warn(message, {
        category: 'console',
        args: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg)
      });
    };

    // Don't override info and debug to avoid excessive logging
    // but keep them available for explicit logger.info() calls
  }

  /**
   * Setup global error handlers
   */
  setupGlobalErrorHandlers() {
    // Catch uncaught JavaScript errors
    window.onerror = (message, source, lineno, colno, error) => {
      this.error('Uncaught JavaScript error', {
        message: String(message),
        source,
        lineno,
        colno,
        stackTrace: error?.stack,
        category: 'uncaught_error'
      });
      return false; // Let default handler run
    };

    // Catch unhandled promise rejections
    window.onunhandledrejection = (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: String(event.reason),
        promise: event.promise,
        stackTrace: event.reason?.stack,
        category: 'unhandled_rejection'
      });
    };
  }

  /**
   * Manually flush logs (useful before navigation)
   */
  flush() {
    this.batcher.flush();
  }
}

// Create singleton instance
const logger = new FrontendLogger();

export default logger;

