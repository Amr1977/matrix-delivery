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
    
    // Include images array for gallery rendering
    const images = await itemRepository.getItemImages(id);
    return { ...item, images };
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

  // ============ ITEM IMAGE UPLOAD ============

  async uploadItemImage(currentUser, id, file) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    // Upload to Cloudinary
    const fileUploadService = require('../../../services/fileUploadService');
    const folder = `matrix-delivery/items/${id}`;
    
    const uploadResult = await fileUploadService.uploadToCloudinary(file.buffer, {
      folder,
      transformations: { quality: 'auto', format: 'auto' }
    });

    // Mark as primary if no other primary exists
    const existingImages = await itemRepository.getItemImages(id);
    const hasPrimary = existingImages.some(img => img.is_primary);
    const isPrimary = !hasPrimary; // First image becomes primary if none exist

    const imageData = {
      image_url: uploadResult.image_url,
      cloudinary_public_id: uploadResult.cloudinary_public_id,
      display_order: existingImages.length,
      is_primary: isPrimary
    };

    const image = await itemRepository.addItemImage(id, imageData);
    
    // Sync primary image URL to items.image_url if this is the new primary
    if (isPrimary) {
      await itemRepository.syncPrimaryImageToItem(id);
    }

    return { image, hasPrimaryBefore: !isPrimary };
  }

  // ============ ITEM IMAGE DELETE/REORDER ============

  async deleteItemImage(currentUser, id, imageId) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    // Get the image to find its public_id for Cloudinary deletion
    const gallery = await itemRepository.getItemImages(id);
    const image = gallery.find(img => img.id === imageId);
    if (!image) {
      throw createError(404, 'Item image not found');
    }

    // Delete from Cloudinary first
    const fileUploadService = require('../../../services/fileUploadService');
    await fileUploadService.deleteFromCloudinary(image.cloudinary_public_id);

    // Then delete from database
    const deleted = await itemRepository.deleteItemImage(id, imageId);
    
    // Sync primary image URL if the deleted image was primary
    if (image.is_primary) {
      await itemRepository.syncPrimaryImageToItem(id);
    }

    return { deleted, wasPrimary: image.is_primary };
  }

  async reorderItemImages(currentUser, id, imageOrders) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    // Validate all image IDs belong to this item
    const gallery = await itemRepository.getItemImages(id);
    const validIds = new Set(gallery.map(g => g.id));
    for (const { id: imgId } of imageOrders) {
      if (!validIds.has(imgId)) {
        throw createError(400, `Invalid image ID: ${imgId}`);
      }
    }

    const reordered = await itemRepository.reorderItemImages(id, imageOrders);
    
    // After reordering, sync primary image URL
    await itemRepository.syncPrimaryImageToItem(id);
    
    return reordered;
  }

  async setItemImagePrimary(currentUser, id, imageId) {
    const existing = await itemRepository.getItemById(id);
    if (!existing) {
      throw createError(404, 'Item not found');
    }

    await this.ensureStoreOwnership(currentUser, existing.store_id);

    const image = await itemRepository.setItemImagePrimary(id, imageId);
    if (!image) {
      throw createError(404, 'Item image not found');
    }
    
    // Sync primary image URL to items.image_url
    await itemRepository.syncPrimaryImageToItem(id);
    
    return { image, wasSetAsPrimary: true };
  }
}

module.exports = new ItemService();

