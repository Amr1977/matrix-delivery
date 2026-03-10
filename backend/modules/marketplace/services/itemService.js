const itemRepository = require('../repositories/itemRepository');
const storeRepository = require('../repositories/storeRepository');
const vendorRepository = require('../repositories/vendorRepository');
const categoryRepository = require('../repositories/categoryRepository');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

class ItemService {
  async ensureStoreOwnership(currentUser, storeId) {
    if (!currentUser || !currentUser.userId) {
      throw createError(401, 'Authentication required');
    }

    const store = await storeRepository.getStoreById(storeId);
    if (!store) {
      throw createError(404, 'Store not found');
    }

    const vendor = await vendorRepository.findById(store.vendor_id);
    if (!vendor) {
      throw createError(404, 'Vendor not found for this store');
    }

    const effectiveRole = currentUser.primary_role || currentUser.role;
    const isAdmin = effectiveRole === 'admin';
    const isOwner = vendor.owner_user_id === currentUser.userId;

    if (!isAdmin && !isOwner) {
      throw createError(403, 'Only vendor owner or admin can manage items for this store');
    }

    return { store, vendor, isAdmin, isOwner };
  }

  async createItem(currentUser, payload) {
    const {
      store_id,
      category_id,
      name,
      description,
      price,
      inventory_quantity,
      image_url
    } = payload || {};

    if (!store_id || !category_id || !name || price == null) {
      throw createError(400, 'store_id, category_id, name, and price are required');
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      throw createError(400, 'price must be a non-negative number');
    }

    await this.ensureStoreOwnership(currentUser, store_id);

    const category = await categoryRepository.getCategoryById(category_id);
    if (!category || category.status === false) {
      throw createError(400, 'category does not exist or is inactive');
    }

    const item = await itemRepository.createItem({
      storeId: store_id,
      categoryId: category_id,
      name: name.trim(),
      description,
      price: numericPrice,
      inventoryQuantity: inventory_quantity != null ? inventory_quantity : 0,
      imageUrl: image_url
    });

    return item;
  }

  async getItemById(id) {
    const item = await itemRepository.getItemById(id);
    if (!item || item.status === false) {
      throw createError(404, 'Item not found');
    }
    return item;
  }

  async updateItem(currentUser, id, fields) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    const updates = { ...fields };

    if (updates.price != null) {
      const numericPrice = Number(updates.price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        throw createError(400, 'price must be a non-negative number');
      }
      updates.price = numericPrice;
    }

    if (updates.category_id != null) {
      const category = await categoryRepository.getCategoryById(updates.category_id);
      if (!category || category.status === false) {
        throw createError(400, 'category does not exist or is inactive');
      }
    }

    const updated = await itemRepository.updateItem(id, updates);
    return updated;
  }

  async deleteItem(currentUser, id) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);
    const deleted = await itemRepository.softDeleteItem(id);
    return deleted;
  }

  async getItemsByStore(storeId) {
    return itemRepository.getItemsByStore(storeId);
  }

  async updateInventory(currentUser, id, payload) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    const { inventory_quantity } = payload || {};
    if (inventory_quantity == null) {
      throw createError(400, 'inventory_quantity is required');
    }

    const numericQty = Number(inventory_quantity);
    if (!Number.isInteger(numericQty) || numericQty < 0) {
      throw createError(400, 'inventory_quantity must be a non-negative integer');
    }

    const updated = await itemRepository.updateInventory(id, numericQty);
    return updated;
  }

  async uploadItemImage(currentUser, id, payload) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    const { image_url } = payload || {};
    if (!image_url) {
      throw createError(400, 'image_url is required');
    }

    const updated = await itemRepository.updateItem(id, { image_url });
    return updated;
  }
}

module.exports = new ItemService();

