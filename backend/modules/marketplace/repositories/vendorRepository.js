const pool = require('../../../config/db');
const logger = require('../../../config/logger');

/**
 * Repository for vendor persistence.
 * Encapsulates all direct database access for the vendors domain.
 */
class VendorRepository {
  async createVendor({
    id,
    ownerUserId,
    name,
    description,
    phone,
    address,
    city,
    country,
    latitude,
    longitude,
    logoUrl
  }) {
    const query = `
      INSERT INTO vendors (
        id,
        owner_user_id,
        name,
        description,
        phone,
        address,
        city,
        country,
        latitude,
        longitude,
        logo_url,
        is_active
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13
      )
      RETURNING *
    `;

    const values = [
      id,
      ownerUserId || null,
      name,
      description || null,
      phone || null,
      address || null,
      city || null,
      country || null,
      latitude != null ? latitude : null,
      longitude != null ? longitude : null,
      logoUrl || null,
      false // start as inactive until approved
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async findById(id) {
    const result = await pool.query(
      'SELECT * FROM vendors WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByOwnerUserId(ownerUserId) {
    const result = await pool.query(
      'SELECT * FROM vendors WHERE owner_user_id = $1',
      [ownerUserId]
    );
    return result.rows[0] || null;
  }

  async listVendors({ search, includeInactive }) {
    const conditions = [];
    const values = [];

    if (!includeInactive) {
      conditions.push('is_active = true');
    }

    if (search) {
      values.push(`%${search.toLowerCase()}%`);
      conditions.push('LOWER(name) LIKE $' + values.length);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `
      SELECT *
      FROM vendors
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  async updateVendor(id, fields) {
    const allowedFields = [
      'name',
      'description',
      'phone',
      'address',
      'city',
      'country',
      'latitude',
      'longitude',
      'logo_url'
    ];

    const updates = [];
    const values = [];
    let index = 1;

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(fields, key) && fields[key] !== undefined) {
        updates.push(`${key} = $${index}`);
        values.push(fields[key]);
        index += 1;
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const query = `
      UPDATE vendors
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async setActiveStatus(id, isActive) {
    const result = await pool.query(
      'UPDATE vendors SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, id]
    );
    return result.rows[0] || null;
  }
}

module.exports = new VendorRepository();

