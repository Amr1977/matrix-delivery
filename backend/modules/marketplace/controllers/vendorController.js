const vendorService = require('../services/vendorService');

const handleControllerError = (error, res, next) => {
  if (error && error.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  return next(error);
};

exports.registerVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.registerVendor(req.user, req.body);
    res.status(201).json(vendor);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.getVendorById = async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.json(vendor);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.updateVendorProfile = async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendorProfile(req.user, req.params.id, req.body);
    res.json(vendor);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.approveVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.approveVendor(req.user, req.params.id);
    res.json(vendor);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.rejectVendor = async (req, res, next) => {
  try {
    const vendor = await vendorService.rejectVendor(req.user, req.params.id);
    res.json(vendor);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

exports.listVendors = async (req, res, next) => {
  try {
    const vendors = await vendorService.listVendors(req.user || null, req.query || {});
    res.json(vendors);
  } catch (error) {
    handleControllerError(error, res, next);
  }
};

