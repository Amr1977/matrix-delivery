/**
 * @fileoverview Load calculation utilities for the Matrix Delivery Platform.
 * Provides atomic request tracking and load factor computation.
 * @module loadCalculator
 */

import os from "os";

let activeRequestCount = 0;

/**
 * Creates a request tracker with Express middleware and load accessor.
 * Uses module-level integer counter for atomic request tracking.
 * @returns {Object} { middleware: Function, getCurrentLoad: Function }
 */
export function createRequestTracker() {
  /**
   * Express middleware that tracks active request count.
   * Increments on every incoming request, decrements on response finish or close.
   * @param {import('express').Request} req - Express request object
   * @param {import('express').Response} res - Express response object
   * @param {import('express').NextFunction} next - Express next function
   */
  const middleware = (req, res, next) => {
    activeRequestCount++;
    let decremented = false;

    const decrement = () => {
      if (!decremented) {
        decremented = true;
        activeRequestCount--;
      }
    };

    res.on("finish", decrement);
    res.on("close", decrement);

    next();
  };

  /**
   * Returns the current active request count.
   * @returns {number} Current number of in-flight requests
   */
  const getCurrentLoad = () => activeRequestCount;

  return { middleware, getCurrentLoad };
}

/**
 * Returns the 1-minute CPU load average from the operating system.
 * Used only as a fallback metric when request-based load is unavailable.
 * @returns {number} 1-minute load average
 * @deprecated This function is provided as a fallback metric only.
 * Request-based load tracking via createRequestTracker is preferred.
 */
export function getCpuLoad() {
  return os.loadavg()[0];
}

/**
 * Computes the load factor as a ratio of current load to maximum capacity.
 * @param {number} currentLoad - Current number of active requests
 * @param {number} maxCapacity - Maximum concurrent requests the server can handle
 * @returns {number} Load factor clamped to [0, 1]
 * @throws {TypeError} If maxCapacity is 0 or negative
 */
export function computeLoadFactor(currentLoad, maxCapacity) {
  if (maxCapacity <= 0) {
    throw new TypeError("maxCapacity must be a positive number");
  }
  return Math.min(Math.max(currentLoad / maxCapacity, 0), 1);
}
