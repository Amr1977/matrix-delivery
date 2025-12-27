# Production-ready Tileserver Stack (tileserver-gl + Node proxy + Traefik TLS + Static React)

**Overview — what this repo provides**

This document contains a ready-to-run, production-oriented Docker Compose stack that serves map tiles from a local `tileserver-gl`, exposes tiles via a Node.js on-demand disk-caching proxy, and routes & TLS-terminates using Traefik (automatic Let's Encrypt). It also includes an example static React app (MapLibre + Matrix style) served by Nginx so you can test end-to-end locally or in production.

Files included below (you can copy each into your project folder):

```
production-tileserver-stack/
├─ docker-compose.yml
├─ traefik/traefik.yml
├─ traefik/dynamic.yml
├─ tile-proxy/Dockerfile
├─ tile-proxy/server.js
├─ tileserver/data/ (place mbtiles & pbf here)
├─ react-app/Dockerfile
├─ react-app/src/Map.jsx
├─ react-app/package.json
├─ nginx/default.conf
├─ .env.example
├─ README.md (this file)
```

---

## Quick notes / assumptions
- Host machine: Linux (Debian/Ubuntu/CentOS), Docker & Docker Compose already installed.
- You already downloaded or will generate `*.mbtiles` for the countries you need (Egypt/GCC) into `tileserver/data/` (instructions below).
- We use Traefik v2 for automatic TLS (Let's Encrypt). If you prefer Nginx + Certbot, I can provide an alternate compose.
- This stack **does not** pre-seed tiles from `tile.openstreetmap.org` — the tileserver renders from MBTiles you provide (recommended) or serves vector tiles included.

---

## .env.example

```env
# domain names
DOMAIN=maps.yourdomain.com
REACT_DOMAIN=app.yourdomain.com
# traefik email for Let's Encrypt
LETSENCRYPT_EMAIL=you@example.com
# tile proxy configuration
TILE_STYLE=basic
TILESERVER_PORT=8080
# docker compose network
TZ=Africa/Cairo
```

Copy to `.env` and edit values.

---

## docker-compose.yml

```yaml
version: '3.8'
services:
  traefik:
    image: traefik:v2.10
    command:
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.leresolver.acme.email=${LETSENCRYPT_EMAIL}
      - --certificatesresolvers.leresolver.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.leresolver.acme.tlschallenge=true
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
      - ./letsencrypt:/letsencrypt
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - TZ=${TZ}
    networks:
      - web
    deploy: {}

  tileserver:
    image: maptiler/tileserver-gl:latest
    container_name: tileserver-gl
    volumes:
      - ./tileserver/data:/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tileserver.rule=Host(`tiles.${DOMAIN}`)"
      - "traefik.http.routers.tileserver.entrypoints=websecure"
      - "traefik.http.routers.tileserver.tls=true"
      - "traefik.http.routers.tileserver.tls.certresolver=leresolver"
    networks:
      - web
    restart: unless-stopped

  tile-proxy:
    build: ./tile-proxy
    container_name: tile-proxy
    env_file: .env
    depends_on:
      - tileserver
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.tileproxy.rule=Host(`maps.${DOMAIN}`)"
      - "traefik.http.routers.tileproxy.entrypoints=websecure"
      - "traefik.http.routers.tileproxy.tls=true"
      - "traefik.http.routers.tileproxy.tls.certresolver=leresolver"
    volumes:
      - ./tile-cache:/tile-cache
    networks:
      - web
    restart: unless-stopped

  react-app:
    build: ./react-app
    container_name: react-app
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.react.rule=Host(`app.${DOMAIN}`)"
      - "traefik.http.routers.react.entrypoints=websecure"
      - "traefik.http.routers.react.tls=true"
      - "traefik.http.routers.react.tls.certresolver=leresolver"
    networks:
      - web
    restart: unless-stopped

networks:
  web:
    external: false
```

Notes:
- `tileserver` reads MBTiles from `./tileserver/data`.
- `tile-proxy` caches requested raster tiles on disk into `./tile-cache`.
- `react-app` is provided as a static example; adapt to serve your real FE or host separately.

---

## Traefik configuration files

### `traefik/traefik.yml`

```yaml
log:
  level: INFO
entryPoints:
  web:
    address: :80
  websecure:
    address: :443
providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
certificatesResolvers:
  leresolver:
    acme:
      email: "${LETSENCRYPT_EMAIL}"
      storage: /letsencrypt/acme.json
      tlsChallenge: {}
```

### `traefik/dynamic.yml`

```yaml
http:
  middlewares:
    secure-headers:
      headers:
        sslRedirect: true
        stsSeconds: 63072000
        frameDeny: true
        contentTypeNosniff: true
```

---

## Tile proxy (Node) — build & server

### `tile-proxy/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### `tile-proxy/package.json`

```json
{
  "name": "tile-proxy",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": {
    "axios": "^1.4.0",
    "express": "^4.18.2",
    "express-rate-limit": "^6.7.0",
    "morgan": "^1.10.0"
  }
}
```

### `tile-proxy/server.js`

```js
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const app = express();
const CACHE_DIR = process.env.CACHE_DIR || '/tile-cache';
const TILESERVER_INTERNAL = process.env.TILESERVER_INTERNAL || 'http://tileserver:80';
const TILE_STYLE = process.env.TILE_STYLE || process.env.TILE_STYLE || 'basic';

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// Logging
app.use(morgan('combined'));

// Basic rate limiting
const limiter = rateLimit({ windowMs: 60 * 1000, max: 300 });
app.use(limiter);

// health
app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/tiles/:z/:x/:y.png', async (req, res) => {
  const { z, x, y } = req.params;
  const style = TILE_STYLE;
  const tileDir = path.join(CACHE_DIR, style, z, x);
  const tileFile = path.join(tileDir, `${y}.png`);

  if (fs.existsSync(tileFile)) {
    res.set('X-Cache', 'HIT');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(tileFile);
  }

  fs.mkdirSync(tileDir, { recursive: true });

  // TileServer GL endpoint for raster tile
  const tileUrl = `${TILESERVER_INTERNAL}/styles/${style}/tile/${z}/${x}/${y}.png`;

  try {
    const resp = await axios.get(tileUrl, { responseType: 'arraybuffer', timeout: 15000 });
    fs.writeFileSync(tileFile, resp.data);
    res.set('Content-Type', 'image/png');
    res.set('X-Cache', 'MISS');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(resp.data);
  } catch (err) {
    console.error('tile fetch error', tileUrl, err.message);
    return res.status(204).send();
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Tile proxy listening on ${port}`));
```

Notes:
- `TILESERVER_INTERNAL` should point to the tileserver service inside Docker network (`http://tileserver:80`).
- This proxy caches raster PNG tiles with `immutable` cache-control headers.
- Adjust rate-limit values appropriate for your load.

---

## Tileserver data directory

Place your MBTiles (e.g. `egypt.mbtiles`) into `./tileserver/data/`. TileServer-GL will auto-detect them. If you use vector MBTiles styles, make sure styles are available in the `data` folder as recommended by TileServer-GL docs.

### Example: Download Geofabrik PBFs (on your host)

```bash
mkdir -p tileserver/data
cd tileserver/data
# Egypt
wget https://download.geofabrik.de/africa/egypt-latest.osm.pbf -O egypt.osm.pbf
# GCC states (optional)
wget https://download.geofabrik.de/asia/gcc-states-latest.osm.pbf -O gcc-states.osm.pbf
```

Then generate MBTiles using OpenMapTiles toolchain (see OpenMapTiles docs). That step is CPU/RAM heavy; you can perform it on a separate build server and copy the resulting `*.mbtiles` into `tileserver/data`.

---

## React static example (MapLibre) — minimal

This example uses MapLibre GL JS to load a style from the tileserver (vector approach). If you'd prefer Leaflet + raster tiles, use the tile-proxy raster endpoint in a `TileLayer`.

### `react-app/package.json`

```json
{
  "name": "map-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "serve -s build -l 80",
    "build": "react-scripts build"
  },
  "dependencies": {
    "maplibre-gl": "^2.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "serve": "^14.2.0"
  }
}
```

### `react-app/Dockerfile`

```dockerfile
FROM node:20-alpine as build
WORKDIR /usr/src/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /usr/src/app/build /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### `react-app/src/Map.jsx`

```jsx
import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function Map() {
  const mapContainer = useRef(null);

  useEffect(() => {
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://tiles.${process.env.REACT_APP_DOMAIN || 'localhost'}/styles/basic/style.json`,
      center: [31.2357, 30.0444],
      zoom: 10
    });

    return () => map.remove();
  }, []);

  return <div ref={mapContainer} style={{ height: '100vh', width: '100%' }} />;
}
```

`NOTE:` If your style JSON references vector tile endpoints from `tileserver`, MapLibre will fetch tiles directly from the domain returned in the style — you may need to adjust URLs or proxy style JSON through your backend.

---

## Nginx conf for static app (optional)

`nginx/default.conf`

```nginx
server {
  listen 80;
  server_name app.${DOMAIN};
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

---

## How to run (deployment steps)

1. Copy files into a folder on your server.
2. Edit `.env` with your domain names and email.
3. Place MBTiles into `tileserver/data/` or plan to generate and copy them.
4. `docker compose up -d --build`
5. Wait for Traefik to obtain TLS certs (check `docker logs traefik`).
6. Visit `https://maps.YOURDOMAIN.com/tiles/{z}/{x}/{y}.png` to confirm tile proxy (it will route through Traefik to the tile-proxy service).

If you want the tiles exposed at `https://api.yourdomain.com/tiles/...`, change the traefik labels accordingly in `docker-compose.yml`.

---

## Important operational tips
- **Back up** `./tileserver/data` and `./tile-cache` regularly.
- **Monitor** disk usage — tile caches grow quickly; set a TTL or implement a periodic cache eviction (e.g., `find /tile-cache -type f -mtime +90 -delete`).
- **Scale** by placing Cloudflare (or a CDN) in front of `maps.*` so global clients get fast delivery.
- **Logging & metrics**: Add Prometheus exporters or a log aggregation pipeline for production observability.

---

## Matrix-themed styling (how to create)
1. Install Maputnik locally or use the online editor.
2. Load your style JSON from `http(s)://tileserver/styles/` or create a new style and point sources to your vector MBTiles endpoints.
3. Set background to `#000000`, primary accents to `#00ff66` and adjust road/label colors for high contrast.
4. Save the JSON into `tileserver/data/styles/matrix.json` and restart tileserver.

---

## Next steps I can do for you (pick any)
- Provide an alternate Docker Compose using **Nginx + Certbot** instead of Traefik.
- Provide a **cache-eviction script** and scheduled cron example.
- Produce a `generate-vtiles.sh` script using `openmaptiles-tools` for building MBTiles from PBF (I can tune it to your VPS specs).
- Produce a Maputnik-ready style JSON (Matrix dark green) prefilled for OpenMapTiles.

---

**That's the stack.**

If you want, tell me which next-step you want me to produce first and I will create the file for you (e.g., `generate-vtiles.sh`, eviction script, or Matrix style JSON).

