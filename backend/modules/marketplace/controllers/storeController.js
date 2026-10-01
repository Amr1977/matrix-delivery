const storeService = require('../services/storeService');

const handleControllerError = (error, res, next) => {
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
};

exports.createStore = async (req, res, next) => {
  try {
    const store = await storeService.createStore(req.user, req.body);
    res.status(201).json(store);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getStoreById = async (req, res, next) => {
  try {
    const store = await storeService.getStoreById(req.params.id);
    res.json(store);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.updateStore = async (req, res, next) => {
  try {
    const store = await storeService.updateStore(req.user, req.params.id, req.body);
    res.json(store);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.deleteStore = async (req, res, next) => {
  try {
    const store = await storeService.deactivateStore(req.user, req.params.id);
    res.json(store);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getStoresByVendor = async (req, res, next) => {
  try {
    const stores = await storeService.getStoresByVendor(req.params.vendorId || req.params.id);
    res.json(stores);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

// ============ BRANDING ENDPOINTS ============

exports.updateStoreBranding = async (req, res, next) => {
  try {
    const store = await storeService.updateStoreBranding(req.user, req.params.id, req.body);
    res.json(store);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

// ============ GALLERY ENDPOINTS ============

exports.addGalleryImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const image = await storeService.addGalleryImage(req.user, req.params.id, req.file);
    res.status(201).json(image);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getGalleryImages = async (req, res, next) => {
  try {
    const images = await storeService.getGalleryImages(req.user, req.params.id);
    res.json(images);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.deleteGalleryImage = async (req, res, next) => {
  try {
    const image = await storeService.deleteGalleryImage(req.user, req.params.id, req.params.imageId);
    res.json(image);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.reorderGalleryImages = async (req, res, next) => {
  try {
    const { imageOrders } = req.body;
    if (!Array.isArray(imageOrders)) {
      return res.status(400).json({ error: 'imageOrders must be an array' });
    }
    const images = await storeService.reorderGalleryImages(req.user, req.params.id, imageOrders);
    res.json(images);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.setGalleryPrimary = async (req, res, next) => {
  try {
    const image = await storeService.setGalleryPrimary(req.user, req.params.id, req.params.imageId);
    res.json(image);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

