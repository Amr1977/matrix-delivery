# Apache WebSocket Proxy Fix for Socket.IO

## Issue Summary

**Date Discovered**: 2026-01-01  
**Severity**: High  
**Environment**: Production (matrix-api.oldantique50.com)

## Symptoms

- Socket.IO connects via HTTP polling but immediately disconnects
- Browser shows: `NS_ERROR_WEBSOCKET_CONNECTION_REFUSED`
- Backend logs show: `"reason": "transport close"` after successful connection
- Firefox console errors: `400 Bad Request` on WebSocket upgrade attempts

## Root Cause

Apache's `ProxyPass` directives are processed **before** `RewriteRule` when both match the same path. This caused:

1. ✅ Initial HTTP polling request to `/socket.io/?transport=polling` → handled by ProxyPass
2. ❌ WebSocket upgrade request to `/socket.io/?transport=websocket` → also caught by ProxyPass instead of the WebSocket-specific RewriteRule

The WebSocket `RewriteRule` never had a chance to execute because `ProxyPass /socket.io/` intercepted the request first.

## Fix Applied

Updated `/etc/apache2/sites-available/matrix-api.oldantique50.com-le-ssl.conf`:

```apache
# WebSocket support for Socket.IO
RewriteEngine On

# 1. Handle WebSocket Upgrade for Socket.IO
<IfModule mod_proxy_wstunnel.c>
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteCond %{HTTP:Connection} upgrade [NC]
    RewriteRule ^/socket\.io/(.*) ws://127.0.0.1:5000/socket.io/$1 [P,L,QSA]
</IfModule>

# 2. Skip ProxyPass for WebSocket requests (let RewriteRule handle them)
# This MUST come before the general ProxyPass rules
RewriteCond %{HTTP:Upgrade} =websocket [NC]
RewriteRule .* - [S=2]

# 3. Handle HTTP Polling for Socket.IO
ProxyPass /socket.io/ http://127.0.0.1:5000/socket.io/ keepalive=On timeout=600
ProxyPassReverse /socket.io/ http://127.0.0.1:5000/socket.io/

# 4. Handle everything else
ProxyPass / http://127.0.0.1:5000/ keepalive=On
ProxyPassReverse / http://127.0.0.1:5000/
```

### Key Changes

| Change | Purpose |
|--------|---------|
| `[QSA]` flag | Preserves query strings (EIO, transport, sid) |
| `socket\.io` escaped | Proper regex matching |
| Skip rule `[S=2]` | Tells Apache to skip ProxyPass for WebSocket requests |

## Required Apache Modules

Ensure these modules are enabled:
```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_wstunnel
sudo a2enmod rewrite
```

Verify with:
```bash
apache2ctl -M | grep proxy
```

## Deployment

```bash
# Test config
sudo apache2ctl configtest

# Reload Apache
sudo systemctl reload apache2
```

## Verification

After fix, backend logs should show:
```
Socket.IO client connected
{
  "transport": "websocket",  # Was "polling" before
  ...
}
```

And no more `"reason": "transport close"` disconnections.

## Files Modified

- [matrix-api.oldantique50.com-le-ssl.conf](file:///d:/matrix-delivery/config/matrix-api.oldantique50.com-le-ssl.conf) - Apache virtual host config

## Related Documentation

- [Apache mod_proxy_wstunnel](https://httpd.apache.org/docs/2.4/mod/mod_proxy_wstunnel.html)
- [Socket.IO behind reverse proxy](https://socket.io/docs/v4/reverse-proxy/)
