const pool = require('../../../config/db');

class ItemRepository {
  async createItem({
    storeId,
    categoryId,
    name,
    description,
    price,
    inventoryQuantity,
    imageUrl
  }) {
    const query = `
      INSERT INTO items (
        store_id,
        category_id,
        name,
        description,
        price,
        status,
        inventory_quantity,
        image_url
      )
      VALUES ($1, $2, $3, $4, $5, true, $6, $7)
      RETURNING *
    `;

    const values = [
      storeId,
      categoryId,
      name,
      description || null,
      price,
      inventoryQuantity != null ? inventoryQuantity : 0,
      imageUrl || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getItemById(id) {
    const result = await pool.query(
      'SELECT * FROM items WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async updateItem(id, fields) {
    const allowedFields = [
      'name',
      'description',
      'price',
      'status',
      'category_id',
      'inventory_quantity',
      'image_url'
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
      return this.getItemById(id);
    }

    values.push(id);
    const query = `
      UPDATE items
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async softDeleteItem(id) {
    const result = await pool.query(
      'UPDATE items SET status = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  async getItemsByStore(storeId) {
    const result = await pool.query(
      'SELECT * FROM items WHERE store_id = $1 AND status = true ORDER BY created_at DESC',
      [storeId]
    );
    return result.rows;
  }

  async updateInventory(id, quantity) {
    const result = await pool.query(
      'UPDATE items SET inventory_quantity = $1 WHERE id = $2 RETURNING *',
      [quantity, id]
    );
    return result.rows[0] || null;
  }

  // ============ ITEM IMAGE METHODS ============

  async getItemImages(itemId) {
    const result = await pool.query(
      `SELECT id, image_url, cloudinary_public_id, display_order, is_primary, created_at
       FROM item_images
       WHERE item_id = $1
       ORDER BY display_order ASC, created_at ASC`,
      [itemId]
    );
    return result.rows;
  }

  async addItemImage(itemId, imageData) {
    const { image_url, cloudinary_public_id, display_order, is_primary } = imageData;
    
    // If this is marked primary, unset any existing primary
    if (is_primary) {
      await pool.query(
        `UPDATE item_images SET is_primary = false WHERE item_id = $1 AND is_primary = true`,
        [itemId]
      );
    }

    const result = await pool.query(
      `INSERT INTO item_images (item_id, image_url, cloudinary_public_id, display_order, is_primary)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [itemId, image_url, cloudinary_public_id, display_order || 0, is_primary || false]
    );
    return result.rows[0];
  }

  async deleteItemImage(itemId, imageId) {
    const result = await pool.query(
      `DELETE FROM item_images WHERE id = $1 AND item_id = $2 RETURNING *`,
      [imageId, itemId]
    );
    return result.rows[0] || null;
  }

  async reorderItemImages(itemId, imageOrders) {
    // imageOrders: array of { id, display_order }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const { id, display_order } of imageOrders) {
        await client.query(
          `UPDATE item_images SET display_order = $1 WHERE id = $2 AND item_id = $3`,
          [display_order, id, itemId]
        );
      }
      
      await client.query('COMMIT');
      return this.getItemImages(itemId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async setItemImagePrimary(itemId, imageId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Unset current primary
      await client.query(
        `UPDATE item_images SET is_primary = false WHERE item_id = $1 AND is_primary = true`,
        [itemId]
      );
      
      // Set new primary
      const result = await client.query(
        `UPDATE item_images SET is_primary = true WHERE id = $1 AND item_id = $2 RETURNING *`,
        [imageId, itemId]
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

  // Sync primary image to items.image_url
  async syncPrimaryImageToItem(itemId) {
    // Get the primary image
    const primaryImage = await pool.query(
      `SELECT image_url, cloudinary_public_id FROM item_images WHERE item_id = $1 AND is_primary = true`,
      [itemId]
    );
    
    if (primaryImage.rows.length === 0) {
      // No primary image - set image_url to null
      return await pool.query(
        `UPDATE items SET image_url = NULL WHERE id = $1 RETURNING *`,
        [itemId]
      );
    }
    
    // Update items.image_url to match the primary image's URL
    return await pool.query(
      `UPDATE items SET image_url = $1 WHERE id = $2 RETURNING *`,
      [primaryImage.rows[0].image_url, itemId]
    );
  }
}

module.exports = new ItemRepository();

