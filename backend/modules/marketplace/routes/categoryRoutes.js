const express = require('express');
const router = express.Router();

const {
  verifyToken,
  requireAdmin
} = require('../../../middleware/auth');

const categoryController = require('../controllers/categoryController');

const isAdmin = requireAdmin;

/**
 * Milestone 3: Category Module routes
 *
 * Base path (mounted in app.js):
 *   /api/marketplace/categories
 *
 * Endpoints:
 *   POST   /               - Create category (admin)
 *   GET    /               - List all active categories
 *   GET    /by-parent      - List categories by parent_id
 *   GET    /:id            - Get category by id
 *   PUT    /:id            - Update category (admin)
 *   DELETE /:id            - Delete category (admin)
 */

router.post(
  '/',
  verifyToken,
  isAdmin,
  categoryController.createCategory
);

router.get(
  '/',
  categoryController.getCategories
);

router.get(
  '/by-parent',
  categoryController.getCategoriesByParent
);

router.get(
  '/:id',
  categoryController.getCategoryById
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  categoryController.updateCategory
);

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  categoryController.deleteCategory
);

module.exports = router;

