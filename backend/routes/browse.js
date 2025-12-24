const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/auth');

// PostGIS support flag
let HAS_POSTGIS = false;
(async () => {
    try {
        await pool.query('SELECT PostGIS_Version()');
        HAS_POSTGIS = true;
        console.log('PostGIS detected in browse routes');
    } catch (err) {
        // PostGIS not available
    }
})();

/**
 * GET /api/browse/vendors
 * Browse vendors with filtering and pagination
 */
router.get('/vendors', verifyToken, async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        const city = (req.query.city || '').trim();
        const sort = (req.query.sort || 'recent').trim();
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const offset = (page - 1) * limit;

        const orderBy = sort === 'rating' ? 'rating DESC NULLS LAST, created_at DESC' : 'created_at DESC';

        const whereClauses = ['is_active = true'];
        const values = [];

        if (q) {
            values.push(`%${q}%`);
            whereClauses.push(`LOWER(name) LIKE LOWER($${values.length})`);
        }
        if (city) {
            values.push(city);
            whereClauses.push(`LOWER(city) = LOWER($${values.length})`);
        }

        values.push(limit);
        values.push(offset);

        const sql = `SELECT * FROM vendors WHERE ${whereClauses.join(' AND ')} ORDER BY ${orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`;
        const result = await pool.query(sql, values);
        res.json({ page, limit, count: result.rows.length, items: result.rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/browse/items
 * Browse items with filtering and pagination
 */
router.get('/items', verifyToken, async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        const category = (req.query.category || '').trim();
        const vendorId = (req.query.vendor_id || '').trim();
        const city = (req.query.city || '').trim();
        const sort = (req.query.sort || 'recent').trim();
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const offset = (page - 1) * limit;
        const minPrice = req.query.min_price !== undefined ? parseFloat(req.query.min_price) : undefined;
        const maxPrice = req.query.max_price !== undefined ? parseFloat(req.query.max_price) : undefined;

        let orderBy = 'vi.created_at DESC';
        if (sort === 'price_asc') orderBy = 'vi.price ASC, vi.created_at DESC';
        else if (sort === 'price_desc') orderBy = 'vi.price DESC, vi.created_at DESC';

        const whereClauses = ['vi.is_active = true', 'v.is_active = true'];
        const values = [];

        if (q) {
            values.push(`%${q}%`);
            whereClauses.push(`LOWER(vi.item_name) LIKE LOWER($${values.length})`);
        }
        if (category) {
            values.push(category);
            whereClauses.push(`LOWER(vi.category) = LOWER($${values.length})`);
        }
        if (vendorId) {
            values.push(vendorId);
            whereClauses.push(`vi.vendor_id = $${values.length}`);
        }
        if (!isNaN(minPrice)) {
            values.push(minPrice);
            whereClauses.push(`vi.price >= $${values.length}`);
        }
        if (!isNaN(maxPrice)) {
            values.push(maxPrice);
            whereClauses.push(`vi.price <= $${values.length}`);
        }
        if (city) {
            values.push(city);
            whereClauses.push(`LOWER(v.city) = LOWER($${values.length})`);
        }

        values.push(limit);
        values.push(offset);

        const sql = `
      SELECT vi.*, v.name AS vendor_name, v.city AS vendor_city
      FROM vendor_items vi
      JOIN vendors v ON v.id = vi.vendor_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${values.length - 1} OFFSET $${values.length}
    `;
        const result = await pool.query(sql, values);
        res.json({ page, limit, count: result.rows.length, items: result.rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/browse/vendors-near
 * Browse vendors near a location (requires PostGIS)
 */
router.get('/vendors-near', verifyToken, async (req, res, next) => {
    try {
        if (!HAS_POSTGIS) return res.status(501).json({ error: 'Geospatial near queries require PostGIS' });
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radiusKm = Math.min(50, Math.max(0.1, parseFloat(req.query.radius_km || '5')));
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const offset = (page - 1) * limit;
        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
        const radiusM = radiusKm * 1000;
        const sql = `
      SELECT v.*, ST_Distance(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography) AS distance_m
      FROM vendors v
      WHERE v.is_active = true AND v.latitude IS NOT NULL AND v.longitude IS NOT NULL
        AND ST_DWithin(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography, $3)
      ORDER BY distance_m ASC, v.created_at DESC
      LIMIT $4 OFFSET $5`;
        const result = await pool.query(sql, [lat, lng, radiusM, limit, offset]);
        res.json({ page, limit, count: result.rows.length, items: result.rows });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /api/browse/items-near
 * Browse items near a location (requires PostGIS)
 */
router.get('/items-near', verifyToken, async (req, res, next) => {
    try {
        if (!HAS_POSTGIS) return res.status(501).json({ error: 'Geospatial near queries require PostGIS' });
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radiusKm = Math.min(50, Math.max(0.1, parseFloat(req.query.radius_km || '5')));
        const q = (req.query.q || '').trim();
        const category = (req.query.category || '').trim();
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20', 10)));
        const offset = (page - 1) * limit;
        if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
        const radiusM = radiusKm * 1000;
        const whereClauses = ['v.is_active = true', 'vi.is_active = true', 'v.latitude IS NOT NULL', 'v.longitude IS NOT NULL'];
        const values = [lat, lng, radiusM];
        if (q) {
            values.push(`%${q}%`);
            whereClauses.push(`LOWER(vi.item_name) LIKE LOWER($${values.length})`);
        }
        if (category) {
            values.push(category);
            whereClauses.push(`LOWER(vi.category) = LOWER($${values.length})`);
        }
        values.push(limit);
        values.push(offset);
        const sql = `
      SELECT vi.*, v.name AS vendor_name, v.city AS vendor_city,
             ST_Distance(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography) AS distance_m
      FROM vendor_items vi
      JOIN vendors v ON v.id = vi.vendor_id
      WHERE ${whereClauses.join(' AND ')}
        AND ST_DWithin(ST_MakePoint(v.longitude, v.latitude)::geography, ST_MakePoint($2, $1)::geography, $3)
      ORDER BY distance_m ASC, vi.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`;
        const result = await pool.query(sql, values);
        res.json({ page, limit, count: result.rows.length, items: result.rows });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
