const pool = require('../../../config/db');

class StoreRepository {
  async createStore({
    vendorId,
    name,
    description,
    address,
    phone,
    email,
    latitude,
    longitude
  }) {
    const query = `
      INSERT INTO stores (
        vendor_id,
        name,
        description,
        address,
        phone,
        email,
        latitude,
        longitude,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const values = [
      vendorId,
      name,
      description || null,
      address || null,
      phone || null,
      email || null,
      latitude != null ? latitude : null,
      longitude != null ? longitude : null,
      true
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getStoreById(id) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async updateStore(id, fields) {
    const allowedFields = [
      'name',
      'description',
      'address',
      'phone',
      'email',
      'latitude',
      'longitude',
      'status'
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
      return this.getStoreById(id);
    }

    values.push(id);
    const query = `
      UPDATE stores
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async deactivateStore(id) {
    const result = await pool.query(
      'UPDATE stores SET status = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  async getStoresByVendor(vendorId) {
    const result = await pool.query(
      'SELECT * FROM stores WHERE vendor_id = $1 AND status = true ORDER BY created_at DESC',
      [vendorId]
    );
    return result.rows;
  }

  async getActiveStores() {
    const result = await pool.query(
      'SELECT * FROM stores WHERE status = true ORDER BY created_at DESC'
    );
    return result.rows;
  }
}

module.exports = new StoreRepository();

