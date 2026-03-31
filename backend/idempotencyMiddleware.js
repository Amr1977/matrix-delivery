/**
 * @module idempotencyMiddleware
 * @description Server-side idempotency middleware using Redis
 *
 * WARNING: This middleware should only be mounted on mutation routes
 * (POST, PUT, PATCH, DELETE). Never mount globally or on GET routes.
 */

const { config } = require("./config.js");

function createIdempotencyMiddleware(redisClient) {
  async function idempotencyMw(req, res, next) {
    const idempotencyKey = req.headers["idempotency-key"];

    if (!idempotencyKey) {
      return res.status(400).json({
        error: "Idempotency-Key header is required",
      });
    }

    const key = `mdp:idempotency:${idempotencyKey}`;

    try {
      const existing = await redisClient.get(key);

      if (existing) {
        const record = JSON.parse(existing);
        return res.status(record.status).json(record.body);
      }

      const originalJson = res.json.bind(res);

      res.json = function (body) {
        const record = {
          status: res.statusCode,
          body: body,
          createdAt: Date.now(),
        };

        redisClient
          .set(key, JSON.stringify(record), "EX", 86400)
          .catch((err) => {
            console.warn("[Idempotency] Failed to store record:", err.message);
          });

        return originalJson(body);
      };

      return next();
    } catch (error) {
      console.error("[Idempotency] Redis error:", error.message);
      return next();
    }
  }

  return idempotencyMw;
}

module.exports = { createIdempotencyMiddleware };
