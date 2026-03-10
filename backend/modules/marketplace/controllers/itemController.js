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
    const item = await itemService.uploadItemImage(req.user, req.params.id, req.body);
    res.json(item);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

