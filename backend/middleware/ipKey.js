// Shared IP extraction for rate limiting keys
function ipKeyFromRequest(req) {
  try {
    const headers = req && req.headers ? req.headers : {};
    const xff = headers['x-forwarded-for'] || headers['X-Forwarded-For'];
    if (xff) {
      const first = Array.isArray(xff) ? xff[0] : String(xff).split(',')[0];
      if (first && first.trim()) return first.trim();
    }
    const xRealIp = headers['x-real-ip'] || headers['X-Real-IP'];
    if (xRealIp && String(xRealIp).trim()) return String(xRealIp).trim();
    const cfIp = headers['cf-connecting-ip'] || headers['CF-Connecting-IP'];
    if (cfIp && String(cfIp).trim()) return String(cfIp).trim();
    if (req.ip) return req.ip;
    if (req.connection && req.connection.remoteAddress) return req.connection.remoteAddress;
    if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
    if (req.connection && req.connection.socket && req.connection.socket.remoteAddress) return req.connection.socket.remoteAddress;
  } catch (e) {
    // ignore
  }
  return 'unknown';
}

module.exports = { ipKeyFromRequest };
