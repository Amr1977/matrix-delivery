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
      `SELECT s.*, 
        (SELECT json_agg(gi ORDER BY gi.display_order) FROM (
          SELECT id, image_url, cloudinary_public_id, display_order, is_primary, created_at
          FROM store_gallery
          WHERE store_id = s.id
        ) gi) as gallery
      FROM stores s WHERE s.id = $1`,
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
      'status',
      'logo_url',
      'logo_public_id',
      'cover_image_url',
      'cover_public_id'
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

  async updateStoreBranding(id, branding) {
    const allowedFields = [
      'logo_url',
      'logo_public_id',
      'cover_image_url',
      'cover_public_id'
    ];

    const updates = [];
    const values = [];
    let index = 1;

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(branding, key) && branding[key] !== undefined) {
        updates.push(`${key} = $${index}`);
        values.push(branding[key]);
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

  // Gallery methods
  async addGalleryImage(storeId, imageData) {
    const { image_url, cloudinary_public_id, display_order, is_primary } = imageData;
    
    // If this is marked primary, unset any existing primary
    if (is_primary) {
      await pool.query(
        'UPDATE store_gallery SET is_primary = false WHERE store_id = $1 AND is_primary = true',
        [storeId]
      );
    }

    const result = await pool.query(
      `INSERT INTO store_gallery (store_id, image_url, cloudinary_public_id, display_order, is_primary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [storeId, image_url, cloudinary_public_id, display_order || 0, is_primary || false]
    );
    return result.rows[0];
  }

  async getGalleryImages(storeId) {
    const result = await pool.query(
      `SELECT id, image_url, cloudinary_public_id, display_order, is_primary, created_at
       FROM store_gallery
       WHERE store_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [storeId]
    );
    return result.rows;
  }

  async deleteGalleryImage(storeId, imageId) {
    const result = await pool.query(
      `DELETE FROM store_gallery WHERE id = $1 AND store_id = $2 RETURNING *`,
      [imageId, storeId]
    );
    return result.rows[0] || null;
  }

  async reorderGalleryImages(storeId, imageOrders) {
    // imageOrders: array of { id, display_order }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const { id, display_order } of imageOrders) {
        await client.query(
          `UPDATE store_gallery SET display_order = $1 WHERE id = $2 AND store_id = $3`,
          [display_order, id, storeId]
        );
      }
      
      await client.query('COMMIT');
      return this.getGalleryImages(storeId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async setGalleryPrimary(storeId, imageId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Unset current primary
      await client.query(
        `UPDATE store_gallery SET is_primary = false WHERE store_id = $1 AND is_primary = true`,
        [storeId]
      );
      
      // Set new primary
      const result = await client.query(
        `UPDATE store_gallery SET is_primary = true WHERE id = $1 AND store_id = $2 RETURNING *`,
        [imageId, storeId]
      );
      
      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new StoreRepository();

