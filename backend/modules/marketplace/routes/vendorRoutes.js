const express = require('express');
const router = express.Router();

const {
  verifyToken,
  requireAdmin,
  requireRole
} = require('../../../middleware/auth');

const vendorController = require('../controllers/vendorController');
const storeController = require('../controllers/storeController');

const isAdmin = requireAdmin;
const isVendor = requireRole('vendor', 'admin');

/**
 * Milestone 1: Vendor Module routes
 *
 * Base path (mounted in app.js):
 *   /api/marketplace/vendors
 *
 * Endpoints:
 *   POST   /register               - Vendor registration (vendor/admin)
 *   GET    /:id                    - Get vendor by id
 *   PUT    /:id                    - Update vendor (owner/admin)
 *   POST   /:id/approve            - Approve vendor (admin)
 *   POST   /:id/reject             - Reject vendor (admin)
 *   GET    /                       - List vendors (admin listing, public active list)
 */

// Register vendor (vendor or admin)
router.post(
  '/register',
  verifyToken,
  isVendor,
  vendorController.registerVendor
);

// Get vendor by ID (public)
router.get(
  '/:id',
  vendorController.getVendorById
);

// Update vendor profile (owner or admin, enforced in service)
router.put(
  '/:id',
  verifyToken,
  vendorController.updateVendorProfile
);

// Approve vendor (admin only)
router.post(
  '/:id/approve',
  verifyToken,
  isAdmin,
  vendorController.approveVendor
);

// Reject vendor (admin only)
router.post(
  '/:id/reject',
  verifyToken,
  isAdmin,
  vendorController.rejectVendor
);

// List vendors
router.get(
  '/',
  verifyToken,
  vendorController.listVendors
);

// List stores for a given vendor (marketplace)
router.get(
  '/:id/stores',
  storeController.getStoresByVendor
);

module.exports = router;

