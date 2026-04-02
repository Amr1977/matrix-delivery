/**
 * Idempotency Middleware
 * Prevents duplicate processing of the same request across server failovers
 * Uses client-provided timestamp to avoid clock skew issues
 */

const logger = require("../config/logger");

const idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 24 * 60 * 60 * 1000;

function cleanupExpiredKeys() {
  const now = Date.now();
  for (const [key, value] of idempotencyStore.entries()) {
    if (now > value.expiresAt) {
      idempotencyStore.delete(key);
    }
  }
}

setInterval(cleanupExpiredKeys, 60 * 60 * 1000);

function generateKey(req) {
  const userId = req.user?.userId || req.body?.userId || "unknown";
  const endpoint = req.path;
  const bodyHash = req.body ? JSON.stringify(req.body) : "";
  const clientTimestamp =
    req.headers["idempotency-key"]?.split(":").pop() ||
    Math.floor(Date.now() / 60000);

  return `${userId}:${endpoint}:${bodyHash.substring(0, 50)}:${clientTimestamp}`;
}

function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers["idempotency-key"];

  if (!idempotencyKey) {
    return res
      .status(400)
      .json({ error: "Idempotency-Key header is required for this endpoint" });
  }

  const key = generateKey(req);

  if (idempotencyStore.has(key)) {
    const cached = idempotencyStore.get(key);
    logger.info(`Idempotent request detected: ${key}`);

    if (cached.response) {
      return res.status(cached.statusCode).json(cached.response);
    }

    return res.status(cached.statusCode).json(cached);
  }

  const originalSend = res.send;
  res.send = function (data) {
    const statusCode = res.statusCode;

    if (statusCode >= 200 && statusCode < 300 && key) {
      idempotencyStore.set(key, {
        response: typeof data === "string" ? JSON.parse(data) : data,
        statusCode,
        expiresAt: Date.now() + IDEMPOTENCY_TTL,
      });
      logger.info(`Cached idempotent response for: ${key}`);
    }

    return originalSend.call(this, data);
  };

  next();
}

module.exports = {
  idempotencyMiddleware,
  generateKey,
};
