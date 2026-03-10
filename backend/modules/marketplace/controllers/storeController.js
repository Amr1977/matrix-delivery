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

