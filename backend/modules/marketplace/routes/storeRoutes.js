const express = require('express');
const router = express.Router();

const {
  verifyToken,
  requireRole
} = require('../../../middleware/auth');

const storeController = require('../controllers/storeController');
const itemController = require('../controllers/itemController');
const fileUploadService = require('../../../services/fileUploadService');

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
 *   PATCH  /:id/branding        - Update store logo/cover (vendor owner/admin)
 *   POST   /:id/gallery         - Add gallery image (vendor owner/admin)
 *   GET    /:id/gallery         - Get gallery images (vendor owner/admin)
 *   DELETE /:id/gallery/:imageId - Delete gallery image (vendor owner/admin)
 *   PATCH  /:id/gallery/reorder - Reorder gallery images (vendor owner/admin)
 *   PATCH  /:id/gallery/:imageId/primary - Set primary gallery image (vendor owner/admin)
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

// ============ BRANDING ROUTES ============

router.patch(
  '/:id/branding',
  verifyToken,
  isVendorOrAdmin,
  storeController.updateStoreBranding
);

// ============ GALLERY ROUTES ============

router.post(
  '/:id/gallery',
  verifyToken,
  isVendorOrAdmin,
  fileUploadService.createUploadMiddleware('file'),
  storeController.addGalleryImage
);

router.get(
  '/:id/gallery',
  verifyToken,
  isVendorOrAdmin,
  storeController.getGalleryImages
);

router.delete(
  '/:id/gallery/:imageId',
  verifyToken,
  isVendorOrAdmin,
  storeController.deleteGalleryImage
);

router.patch(
  '/:id/gallery/reorder',
  verifyToken,
  isVendorOrAdmin,
  storeController.reorderGalleryImages
);

router.patch(
  '/:id/gallery/:imageId/primary',
  verifyToken,
  isVendorOrAdmin,
  storeController.setGalleryPrimary
);

module.exports = router;

