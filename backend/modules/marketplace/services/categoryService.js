const categoryRepository = require('../repositories/categoryRepository');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

class CategoryService {
  ensureAdmin(currentUser) {
    if (!currentUser || !currentUser.userId) {
      throw createError(401, 'Authentication required');
    }
    const effectiveRole = currentUser.primary_role || currentUser.role;
    if (effectiveRole !== 'admin') {
      throw createError(403, 'Admin privileges required');
    }
  }

  async createCategory(currentUser, payload) {
    this.ensureAdmin(currentUser);

    const { name, parent_id, description } = payload || {};

    if (!name) {
      throw createError(400, 'name is required');
    }

    if (parent_id != null) {
      const parent = await categoryRepository.getCategoryById(parent_id);
      if (!parent) {
        throw createError(400, 'parent category does not exist');
      }
    }

    const category = await categoryRepository.createCategory({
      name: name.trim(),
      parentId: parent_id != null ? parent_id : null,
      description
    });

    return category;
  }

  async updateCategory(currentUser, id, fields) {
    this.ensureAdmin(currentUser);

    const existing = await categoryRepository.getCategoryById(id);
    if (!existing) {
      throw createError(404, 'Category not found');
    }

    if (fields.parent_id != null) {
      if (fields.parent_id === id) {
        throw createError(400, 'Category cannot be its own parent');
      }
      const parent = await categoryRepository.getCategoryById(fields.parent_id);
      if (!parent) {
        throw createError(400, 'parent category does not exist');
      }
    }

    const updates = {
      name: fields.name,
      description: fields.description,
      status: fields.status,
      parent_id: fields.parent_id
    };

    const updated = await categoryRepository.updateCategory(id, updates);
    return updated;
  }

  async deleteCategory(currentUser, id) {
    this.ensureAdmin(currentUser);

    const existing = await categoryRepository.getCategoryById(id);
    if (!existing) {
      throw createError(404, 'Category not found');
    }

    await categoryRepository.deleteCategory(id);
    return { success: true };
  }

  async getCategoryById(id) {
    const category = await categoryRepository.getCategoryById(id);
    if (!category) {
      throw createError(404, 'Category not found');
    }
    return category;
  }

  async getCategories() {
    return categoryRepository.getAllActiveCategories();
  }

  async getCategoriesByParent(parentId) {
    return categoryRepository.getCategoriesByParent(parentId != null ? parentId : null);
  }
}

module.exports = new CategoryService();

