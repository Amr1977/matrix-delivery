const pool = require('../../../config/db');

class CategoryRepository {
  async createCategory({ name, parentId, description }) {
    const query = `
      INSERT INTO categories (name, parent_id, description, status)
      VALUES ($1, $2, $3, true)
      RETURNING *
    `;

    const values = [
      name,
      parentId != null ? parentId : null,
      description || null
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getCategoryById(id) {
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async updateCategory(id, fields) {
    const allowedFields = ['name', 'description', 'status', 'parent_id'];
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
      return this.getCategoryById(id);
    }

    values.push(id);
    const query = `
      UPDATE categories
      SET ${updates.join(', ')}
      WHERE id = $${index}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }

  async deleteCategory(id) {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] || null;
  }

  async getCategoriesByParent(parentId) {
    const result = await pool.query(
      'SELECT * FROM categories WHERE parent_id IS NOT DISTINCT FROM $1 AND status = true ORDER BY name ASC',
      [parentId != null ? parentId : null]
    );
    return result.rows;
  }

  async getAllActiveCategories() {
    const result = await pool.query(
      'SELECT * FROM categories WHERE status = true ORDER BY parent_id NULLS FIRST, name ASC'
    );
    return result.rows;
  }
}

module.exports = new CategoryRepository();

