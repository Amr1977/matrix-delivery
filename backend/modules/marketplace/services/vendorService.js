const vendorRepository = require('../repositories/vendorRepository');
const { generateId } = require('../../../utils/generators');
const logger = require('../../../config/logger');

const createError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

class VendorService {
  async registerVendor(currentUser, payload) {
    if (!currentUser || !currentUser.userId) {
      throw createError(401, 'Authentication required');
    }

    const { primary_role: primaryRole, role } = currentUser;
    const effectiveRole = primaryRole || role;

    if (!['vendor', 'admin'].includes(effectiveRole)) {
      throw createError(403, 'Only vendors or admins can register vendors');
    }

    const existingForOwner = await vendorRepository.findByOwnerUserId(currentUser.userId);
    if (existingForOwner) {
      logger.info('Vendor registration attempted for user with existing vendor', {
        userId: currentUser.userId,
        vendorId: existingForOwner.id
      });
      return existingForOwner;
    }

    const {
      business_name,
      name,
      description,
      contact_phone,
      phone,
      address,
      city,
      country,
      latitude,
      longitude,
      logo_url
    } = payload || {};

    const finalName = (business_name || name || '').trim();
    if (!finalName || !city || !country) {
      throw createError(400, 'business_name (or name), city, and country are required');
    }

    const id = generateId();

    const vendor = await vendorRepository.createVendor({
      id,
      ownerUserId: currentUser.userId,
      name: finalName,
      description: description || null,
      phone: contact_phone || phone || null,
      address: address || null,
      city: city || null,
      country: country || null,
      latitude: latitude != null ? latitude : null,
      longitude: longitude != null ? longitude : null,
      logoUrl: logo_url || null
    });

    logger.info('Vendor registered', {
      vendorId: vendor.id,
      ownerUserId: currentUser.userId
    });

    return vendor;
  }

  async approveVendor(currentUser, vendorId) {
    this.ensureAdmin(currentUser);

    const existing = await vendorRepository.findById(vendorId);
    if (!existing) {
      throw createError(404, 'Vendor not found');
    }

    const updated = await vendorRepository.setActiveStatus(vendorId, true);

    logger.info('Vendor approved', {
      vendorId,
      adminId: currentUser.userId
    });

    return updated;
  }

  async rejectVendor(currentUser, vendorId) {
    this.ensureAdmin(currentUser);

    const existing = await vendorRepository.findById(vendorId);
    if (!existing) {
      throw createError(404, 'Vendor not found');
    }

    const updated = await vendorRepository.setActiveStatus(vendorId, false);

    logger.info('Vendor rejected/deactivated', {
      vendorId,
      adminId: currentUser.userId
    });

    return updated;
  }

  async updateVendorProfile(currentUser, vendorId, fields) {
    if (!currentUser || !currentUser.userId) {
      throw createError(401, 'Authentication required');
    }

    const existing = await vendorRepository.findById(vendorId);
    if (!existing) {
      throw createError(404, 'Vendor not found');
    }

    const isOwner = existing.owner_user_id === currentUser.userId;
    const effectiveRole = currentUser.primary_role || currentUser.role;
    const isAdmin = effectiveRole === 'admin';

    if (!isOwner && !isAdmin) {
      throw createError(403, 'Only owner or admin can update vendor profile');
    }

    const allowedUpdates = {
      name: fields.business_name || fields.name,
      description: fields.description,
      phone: fields.contact_phone || fields.phone,
      address: fields.address,
      city: fields.city,
      country: fields.country,
      latitude: fields.latitude,
      longitude: fields.longitude,
      logo_url: fields.logo_url
    };

    const updated = await vendorRepository.updateVendor(vendorId, allowedUpdates);

    logger.info('Vendor profile updated', {
      vendorId,
      userId: currentUser.userId
    });

    return updated;
  }

  async getVendorById(vendorId) {
    const existing = await vendorRepository.findById(vendorId);
    if (!existing) {
      throw createError(404, 'Vendor not found');
    }
    return existing;
  }

  async listVendors(currentUser, params) {
    const { q, includeInactive } = params || {};

    const effectiveRole = currentUser && (currentUser.primary_role || currentUser.role);
    const isAdmin = effectiveRole === 'admin';

    const vendors = await vendorRepository.listVendors({
      search: q || '',
      includeInactive: !!(includeInactive && isAdmin)
    });

    return vendors;
  }

  ensureAdmin(currentUser) {
    if (!currentUser || !currentUser.userId) {
      throw createError(401, 'Authentication required');
    }
    const effectiveRole = currentUser.primary_role || currentUser.role;
    if (effectiveRole !== 'admin') {
      throw createError(403, 'Admin privileges required');
    }
  }
}

module.exports = new VendorService();

