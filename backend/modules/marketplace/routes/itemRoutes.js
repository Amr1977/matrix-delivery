const express = require('express');
const router = express.Router();

const {
  verifyToken,
  requireRole
} = require('../../../middleware/auth');

const itemController = require('../controllers/itemController');

const isVendorOrAdmin = requireRole('vendor', 'admin');

/**
 * Milestone 4: Item Catalog routes
 *
 * Base path (mounted in app.js):
 *   /api/marketplace/items
 *
 * Endpoints:
 *   POST   /                       - Create item (vendor owner/admin)
 *   GET    /:id                    - Get item by id
 *   PUT    /:id                    - Update item (vendor owner/admin)
 *   DELETE /:id                    - Soft delete item (vendor owner/admin)
 *   PATCH  /:id/inventory          - Update inventory (vendor owner/admin)
 *   POST   /:id/images             - Attach/update image URL (vendor owner/admin)
 */

router.post(
  '/',
  verifyToken,
  isVendorOrAdmin,
  itemController.createItem
);

router.get(
  '/:id',
  itemController.getItemById
);

router.put(
  '/:id',
  verifyToken,
  isVendorOrAdmin,
  itemController.updateItem
);

router.delete(
  '/:id',
  verifyToken,
  isVendorOrAdmin,
  itemController.deleteItem
);

router.patch(
  '/:id/inventory',
  verifyToken,
  isVendorOrAdmin,
  itemController.updateInventory
);

router.post(
  '/:id/images',
  verifyToken,
  isVendorOrAdmin,
  itemController.uploadItemImage
);

module.exports = router;

