const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const Database = require('better-sqlite3');
const logger = require('../config/logger');

// Ensure maps directory exists
const mapsDir = path.join(__dirname, '../maps');
if (!fs.existsSync(mapsDir)) {
    fs.mkdirSync(mapsDir, { recursive: true });
}

// Initialize SQLite database for tile cache
const dbPath = path.join(mapsDir, 'tiles.db');
const db = new Database(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS tiles (
    z INTEGER,
    x INTEGER,
    y INTEGER,
    data BLOB,
    created_at INTEGER,
    PRIMARY KEY (z, x, y)
  )
`);

const getTileParams = db.prepare('SELECT data FROM tiles WHERE z = ? AND x = ? AND y = ?');
const insertTileParams = db.prepare('INSERT OR REPLACE INTO tiles (z, x, y, data, created_at) VALUES (?, ?, ?, ?, ?)');

/**
 * @route GET /api/maps/tiles/:z/:x/:y.png
 * @desc Get map tile (proxy with caching)
 * @access Public
 */
router.get('/tiles/:z/:x/:y.png', async (req, res) => {
    const { z, x, y } = req.params;

    try {
        // 1. Check local cache
        const row = getTileParams.get(z, x, y);
        if (row) {
            // Serve from cache
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day in browser
            return res.send(row.data);
        }

        // 2. Fetch from OpenStreetMap (or other provider)
        // User-Agent is required by OSM tile usage policy
        const osmUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

        const response = await axios.get(osmUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Matrix-Delivery-App/1.0 (contact@matrixdelivery.com)'
            },
            timeout: 5000 // 5 second timeout
        });

        const tileData = Buffer.from(response.data);

        // 3. Save to cache (async, don't block response too much)
        try {
            insertTileParams.run(z, x, y, tileData, Date.now());
        } catch (saveError) {
            logger.error('Failed to cache tile:', saveError.message);
        }

        // 4. Serve requested tile
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=604800'); // Cache for 1 week
        res.send(tileData);

    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).send('Tile not found');
        }
        logger.error(`Tile fetch error [${z}/${x}/${y}]:`, error.message);
        // Serve a transparent pixel or placeholder if needed, or just 500
        res.status(500).send('Error fetching tile');
    }
});

module.exports = router;
