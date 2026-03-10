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
}

module.exports = new ItemRepository();

