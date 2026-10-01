const itemService = require('../services/itemService');

const handleControllerError = (error, res, next) => {
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
};

exports.createItem = async (req, res, next) => {
  try {
    const item = await itemService.createItem(req.user, req.body);
    res.status(201).json(item);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getItemById = async (req, res, next) => {
  try {
    const item = await itemService.getItemById(req.params.id);
    res.json(item);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const item = await itemService.updateItem(req.user, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const item = await itemService.deleteItem(req.user, req.params.id);
    res.json(item);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getItemsByStore = async (req, res, next) => {
  try {
    const items = await itemService.getItemsByStore(req.params.storeId || req.params.id);
    res.json(items);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.updateInventory = async (req, res, next) => {
  try {
    const item = await itemService.updateInventory(req.user, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.uploadItemImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = await itemService.uploadItemImage(req.user, req.params.id, req.file);
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

// ============ ITEM IMAGE MANAGEMENT ============

exports.deleteItemImage = async (req, res, next) => {
  try {
    const result = await itemService.deleteItemImage(req.user, req.params.id, req.params.imageId);
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.reorderItemImages = async (req, res, next) => {
  try {
    const { imageOrders } = req.body;
    if (!Array.isArray(imageOrders)) {
      return res.status(400).json({ error: 'imageOrders must be an array' });
    }
    const images = await itemService.reorderItemImages(req.params.id, imageOrders);
    res.json(images);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.setItemImagePrimary = async (req, res, next) => {
  try {
    const result = await itemService.setItemImagePrimary(req.user, req.params.id, req.params.imageId);
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

