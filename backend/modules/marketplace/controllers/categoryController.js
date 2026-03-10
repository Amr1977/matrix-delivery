const categoryService = require('../services/categoryService');

const handleControllerError = (error, res, next) => {
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
};

exports.createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.user, req.body);
    res.status(201).json(category);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(
      req.user,
      req.params.id,
      req.body
    );
    res.json(category);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await categoryService.deleteCategory(req.user, req.params.id);
    res.json(result);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res.json(category);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getCategories();
    res.json(categories);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getCategoriesByParent = async (req, res, next) => {
  try {
    const parentId = req.query.parent_id != null
      ? parseInt(req.query.parent_id, 10)
      : null;
    const categories = await categoryService.getCategoriesByParent(
      Number.isNaN(parentId) ? null : parentId
    );
    res.json(categories);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

