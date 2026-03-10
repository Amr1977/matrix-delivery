const express = require('express');
const router = express.Router();

const {
  verifyToken,
  requireRole
} = require('../../../middleware/auth');

const storeController = require('../controllers/storeController');
const itemController = require('../controllers/itemController');

const isVendorOrAdmin = requireRole('vendor', 'admin');

/**
 * Milestone 2: Store Module routes
 *
 * Base path (mounted in app.js):
 *   /api/marketplace/stores
 *
 * Endpoints:
 *   POST   /                    - Create store (vendor owner/admin)
 *   GET    /:id                 - Get store by id
 *   PUT    /:id                 - Update store (vendor owner/admin)
 *   DELETE /:id                 - Deactivate store (vendor owner/admin)
 *   GET    /vendor/:vendorId    - List stores for a vendor
 *   GET    /:id/items           - List items for a store
 */

router.post(
  '/',
  verifyToken,
  isVendorOrAdmin,
  storeController.createStore
);

router.get(
  '/:id',
  storeController.getStoreById
);

router.put(
  '/:id',
  verifyToken,
  isVendorOrAdmin,
  storeController.updateStore
);

router.delete(
  '/:id',
  verifyToken,
  isVendorOrAdmin,
  storeController.deleteStore
);

router.get(
  '/vendor/:vendorId',
  storeController.getStoresByVendor
);

router.get(
  '/:id/items',
  itemController.getItemsByStore
);

module.exports = router;

