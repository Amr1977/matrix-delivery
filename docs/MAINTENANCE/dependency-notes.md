# Maintenance: Dependency Notes

Updated: 2026-03-10

## express-rate-limit (v7.x) — CommonJS import + IP keying

- Do NOT destructure a non-existent `ipKeyGenerator` from the library.
- Use the default export and implement a local IP resolver.
- Keep `app.set('trust proxy', 1)` enabled so `req.ip` is correct behind proxies.
- Version pinned in backend/package.json: `express-rate-limit: 7.5.1`.

Correct CommonJS import:

```js
// backend/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');
```

Local IP resolver used by our default keyGenerator:

```js
function ipKeyGenerator(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  if (req.headers?.['x-real-ip']) return String(req.headers['x-real-ip']).trim();
  if (req.headers?.['cf-connecting-ip']) return String(req.headers['cf-connecting-ip']).trim();
  return req.ip || req.connection?.remoteAddress || 'unknown';
}
```

Testing guidance:
- In tests, set `NODE_ENV=test` to bypass limiter.
- To inspect `keyGenerator`, mock `express-rate-limit` and capture the options passed in, then call `options.keyGenerator(req)`.
