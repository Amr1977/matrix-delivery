const pool = require('../../../config/db');
const logger = require('../../../config/logger');
const { getDistance } = require('geolib');
const storeRepository = require('../repositories/storeRepository');
const vendorRepository = require('../repositories/vendorRepository');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

class StoreService {
  normalizeCoordinate(value, fieldName) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw createError(400, `${fieldName} must be a valid number`);
    }

    return num;
  }

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
      email,
      latitude,
      longitude
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

    const normalizedLatitude = this.normalizeCoordinate(latitude, 'latitude');
    const normalizedLongitude = this.normalizeCoordinate(longitude, 'longitude');

    if (normalizedLatitude !== null && (normalizedLatitude < -90 || normalizedLatitude > 90)) {
      throw createError(400, 'latitude must be between -90 and 90');
    }

    if (normalizedLongitude !== null && (normalizedLongitude < -180 || normalizedLongitude > 180)) {
      throw createError(400, 'longitude must be between -180 and 180');
    }

    const store = await storeRepository.createStore({
      vendorId: vendor_id,
      name: name.trim(),
      description,
      address,
      phone,
      email,
      latitude: normalizedLatitude,
      longitude: normalizedLongitude
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

    const normalizedLatitude = fields.latitude !== undefined ? this.normalizeCoordinate(fields.latitude, 'latitude') : undefined;
    const normalizedLongitude = fields.longitude !== undefined ? this.normalizeCoordinate(fields.longitude, 'longitude') : undefined;

    if (normalizedLatitude !== undefined && (normalizedLatitude < -90 || normalizedLatitude > 90)) {
      throw createError(400, 'latitude must be between -90 and 90');
    }

    if (normalizedLongitude !== undefined && (normalizedLongitude < -180 || normalizedLongitude > 180)) {
      throw createError(400, 'longitude must be between -180 and 180');
    }

    const allowedUpdates = {
      name: fields.name,
      description: fields.description,
      address: fields.address,
      phone: fields.phone,
      email: fields.email,
      latitude: normalizedLatitude,
      longitude: normalizedLongitude,
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

  async searchNearbyStores(lat, lng, radiusKm = 5, limit = 20, offset = 0) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const safeRadiusKm = Number(radiusKm);
    const safeLimit = Number(limit);
    const requestedOffset = Number(offset);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw createError(400, 'lat and lng are required');
    }

    if (latitude < -90 || latitude > 90) {
      throw createError(400, 'lat must be between -90 and 90');
    }

    if (longitude < -180 || longitude > 180) {
      throw createError(400, 'lng must be between -180 and 180');
    }

    if (!Number.isFinite(safeRadiusKm) || safeRadiusKm <= 0) {
      throw createError(400, 'radiusKm must be greater than 0');
    }

    const radiusM = safeRadiusKm * 1000;
    const safeQueryLimit = Number.isFinite(safeLimit) && safeLimit > 0
      ? Math.max(1, Math.floor(safeLimit))
      : 20;
    const safeOffset = Number.isFinite(requestedOffset) && requestedOffset >= 0
      ? Math.floor(requestedOffset)
      : 0;

    try {
      const result = await pool.query(
        `SELECT s.*, ST_Distance(
          ST_MakePoint(s.longitude, s.latitude)::geography,
          ST_MakePoint($2, $1)::geography
        ) AS distance_m
        FROM stores s
        WHERE s.status = true
          AND s.latitude IS NOT NULL
          AND s.longitude IS NOT NULL
          AND ST_DWithin(
            ST_MakePoint(s.longitude, s.latitude)::geography,
            ST_MakePoint($2, $1)::geography,
            $3
          )
        ORDER BY distance_m ASC, s.created_at DESC
        LIMIT $4 OFFSET $5`,
        [latitude, longitude, radiusM, safeQueryLimit, safeOffset]
      );

      return result.rows;
    } catch (error) {
      logger.warn('PostGIS not available for nearby stores; falling back to geolib', {
        category: 'marketplace_geo',
        error: error.message
      });

      const stores = await storeRepository.getActiveStores();
      const matches = stores
        .filter((store) =>
          store.latitude !== null &&
          store.latitude !== undefined &&
          store.latitude !== '' &&
          store.longitude !== null &&
          store.longitude !== undefined &&
          store.longitude !== '' &&
          Number.isFinite(Number(store.latitude)) &&
          Number.isFinite(Number(store.longitude))
        )
        .map((store) => ({
          ...store,
          distance_m: getDistance(
            { latitude, longitude },
            { latitude: Number(store.latitude), longitude: Number(store.longitude) }
          )
        }))
        .filter((store) => store.distance_m <= radiusM)
        .sort((a, b) => a.distance_m - b.distance_m)
        .slice(safeOffset, safeOffset + safeQueryLimit);

      return matches;
    }
  }

  // ============ BRANDING METHODS ============

  async updateStoreBranding(currentUser, storeId, branding) {
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
      throw createError(403, 'Only vendor owner or admin can update store branding');
    }

    const allowedBranding = {
      logo_url: branding.logo_url,
      logo_public_id: branding.logo_public_id,
      cover_image_url: branding.cover_image_url,
      cover_public_id: branding.cover_public_id
    };

    const updated = await storeRepository.updateStoreBranding(storeId, allowedBranding);
    return updated;
  }

  // ============ GALLERY METHODS ============

  async addGalleryImage(currentUser, storeId, file) {
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
      throw createError(403, 'Only vendor owner or admin can add gallery images');
    }

    // Upload to Cloudinary
    const fileUploadService = require('../../../services/fileUploadService');
    const folder = `matrix-delivery/stores/${storeId}/gallery`;
    
    const uploadResult = await fileUploadService.uploadToCloudinary(file.buffer, {
      folder,
      transformations: { quality: 'auto', format: 'auto' }
    });

    // Get next display order
    const gallery = await storeRepository.getGalleryImages(storeId);
    const nextOrder = gallery.length > 0 
      ? Math.max(...gallery.map(g => g.display_order)) + 1 
      : 0;

    const imageData = {
      image_url: uploadResult.image_url,
      cloudinary_public_id: uploadResult.cloudinary_public_id,
      display_order: nextOrder,
      is_primary: gallery.length === 0 // First image is primary
    };

    const image = await storeRepository.addGalleryImage(storeId, imageData);
    return image;
  }

  async getGalleryImages(currentUser, storeId) {
    const store = await storeRepository.getStoreById(storeId);
    if (!store) {
      throw createError(404, 'Store not found');
    }
    return storeRepository.getGalleryImages(storeId);
  }

  async deleteGalleryImage(currentUser, storeId, imageId) {
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
      throw createError(403, 'Only vendor owner or admin can delete gallery images');
    }

    // Get the image to find its public_id for Cloudinary deletion
    const gallery = await storeRepository.getGalleryImages(storeId);
    const image = gallery.find(img => img.id === imageId);
    if (!image) {
      throw createError(404, 'Gallery image not found');
    }

    // Delete from Cloudinary first
    const fileUploadService = require('../../../services/fileUploadService');
    await fileUploadService.deleteFromCloudinary(image.cloudinary_public_id);

    // Then delete from database
    const deleted = await storeRepository.deleteGalleryImage(storeId, imageId);
    return deleted;
  }

  async reorderGalleryImages(currentUser, storeId, imageOrders) {
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
      throw createError(403, 'Only vendor owner or admin can reorder gallery images');
    }

    // Validate all image IDs belong to this store
    const gallery = await storeRepository.getGalleryImages(storeId);
    const validIds = new Set(gallery.map(g => g.id));
    for (const { id } of imageOrders) {
      if (!validIds.has(id)) {
        throw createError(400, `Invalid image ID: ${id}`);
      }
    }

    const reordered = await storeRepository.reorderGalleryImages(storeId, imageOrders);
    return reordered;
  }

  async setGalleryPrimary(currentUser, storeId, imageId) {
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
      throw createError(403, 'Only vendor owner or admin can set primary gallery image');
    }

    const image = await storeRepository.setGalleryPrimary(storeId, imageId);
    if (!image) {
      throw createError(404, 'Gallery image not found');
    }
    return image;
  }
}

module.exports = new StoreService();
