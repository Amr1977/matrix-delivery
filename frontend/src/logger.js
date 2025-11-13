// Frontend Logger Utility
// Provides structured logging for React frontend with different log levels

class FrontendLogger {
  constructor() {
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };

    // Set default log level based on environment
    this.currentLevel = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';

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

  formatMessage(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const userId = localStorage.getItem('userId') || 'anonymous';
    const sessionId = this.getSessionId();

    return {
      timestamp,
      level,
      message,
      userId,
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

    // Console logging with appropriate method
    const consoleMethod = level === 'debug' ? 'log' : level;
    console[consoleMethod](`[${level.toUpperCase()}] ${message}`, logData);

    // Send important logs to backend (optional)
    if (level === 'error' || level === 'warn') {
      this.sendToBackend(logData);
    }
  }

  error(message, data = {}) {
    this.log('error', message, { ...data, category: 'error' });
  }

  warn(message, data = {}) {
    this.log('warn', message, { ...data, category: 'warning' });
  }

  info(message, data = {}) {
    this.log('info', message, { ...data, category: 'info' });
  }

  debug(message, data = {}) {
    this.log('debug', message, { ...data, category: 'debug' });
  }

  // Specialized logging methods
  api(method, url, status, duration, data = {}) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this.log(level, `API ${method} ${url}`, {
      ...data,
      category: 'api',
      method,
      url,
      status,
      duration: `${duration}ms`
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
      duration: `${duration}ms`
    });
  }

  // Send critical logs to backend for server-side storage
  async sendToBackend(logData) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('/api/logs/frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(logData)
      });
    } catch (error) {
      // Don't log this recursively
      console.error('Failed to send log to backend:', error);
    }
  }

  // Error boundary logging
  logError(error, errorInfo, componentStack) {
    this.error('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack,
      category: 'react_error'
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
}

// Create singleton instance
const logger = new FrontendLogger();

export default logger;
