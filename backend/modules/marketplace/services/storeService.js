const storeRepository = require('../repositories/storeRepository');
const vendorRepository = require('../repositories/vendorRepository');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

class StoreService {
  async createStore(currentUser, payload) {
    if (!currentUser || !currentUser.userId) {
      throw createError(401, 'Authentication required');
    }

    const {
      vendor_id,
      name,
      description,
      address,
      phone,
      email
    } = payload || {};

    if (!vendor_id || !name) {
      throw createError(400, 'vendor_id and name are required');
    }

    const vendor = await vendorRepository.findById(vendor_id);
    if (!vendor) {
      throw createError(404, 'Vendor not found');
    }

    const effectiveRole = currentUser.primary_role || currentUser.role;
    const isAdmin = effectiveRole === 'admin';
    const isOwner = vendor.owner_user_id === currentUser.userId;

    if (!isAdmin && !isOwner) {
      throw createError(403, 'Only vendor owner or admin can create stores');
    }

    const store = await storeRepository.createStore({
      vendorId: vendor_id,
      name: name.trim(),
      description,
      address,
      phone,
      email
    });

    return store;
  }

  async getStoreById(storeId) {
    const store = await storeRepository.getStoreById(storeId);
    if (!store) {
      throw createError(404, 'Store not found');
    }
    return store;
  }

  async updateStore(currentUser, storeId, fields) {
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
      throw createError(403, 'Only vendor owner or admin can update stores');
    }

    const allowedUpdates = {
      name: fields.name,
      description: fields.description,
      address: fields.address,
      phone: fields.phone,
      email: fields.email,
      status: fields.status
    };

    const updated = await storeRepository.updateStore(storeId, allowedUpdates);
    return updated;
  }

  async deactivateStore(currentUser, storeId) {
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
      throw createError(403, 'Only vendor owner or admin can deactivate stores');
    }

    const updated = await storeRepository.deactivateStore(storeId);
    return updated;
  }

  async getStoresByVendor(vendorId) {
    return storeRepository.getStoresByVendor(vendorId);
  }
}

module.exports = new StoreService();

