const vendorService = require('../../../backend/modules/marketplace/services/vendorService');
const vendorRepository = require('../../../backend/modules/marketplace/repositories/vendorRepository');
const { generateId } = require('../../../backend/utils/generators');
const logger = require('../../../backend/config/logger');

jest.mock('../../../backend/modules/marketplace/repositories/vendorRepository');
jest.mock('../../../backend/utils/generators');
jest.mock('../../../backend/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('VendorService - Unit Tests', () => {
  const baseUser = {
    userId: 'user-123',
    email: 'user@example.com',
    primary_role: 'vendor'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerVendor', () => {
    it('throws 401 when user is not authenticated', async () => {
      await expect(vendorService.registerVendor(null, {})).rejects.toMatchObject({
        statusCode: 401
      });
    });

    it('throws 403 when role is not vendor or admin', async () => {
      const currentUser = { ...baseUser, primary_role: 'customer' };

      await expect(
        vendorService.registerVendor(currentUser, {
          business_name: 'Test Vendor',
          city: 'Cairo',
          country: 'Egypt'
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('returns existing vendor if owner already has one', async () => {
      const existingVendor = { id: 'vendor-existing', name: 'Existing Vendor' };
      vendorRepository.findByOwnerUserId.mockResolvedValue(existingVendor);

      const result = await vendorService.registerVendor(baseUser, {
        business_name: 'New Vendor',
        city: 'Cairo',
        country: 'Egypt'
      });

      expect(result).toBe(existingVendor);
      expect(logger.info).toHaveBeenCalledWith(
        'Vendor registration attempted for user with existing vendor',
        expect.objectContaining({
          userId: baseUser.userId,
          vendorId: existingVendor.id
        })
      );
      expect(vendorRepository.createVendor).not.toHaveBeenCalled();
    });

    it('throws 400 if required fields are missing', async () => {
      vendorRepository.findByOwnerUserId.mockResolvedValue(null);

      await expect(
        vendorService.registerVendor(baseUser, {
          business_name: '',
          city: 'Cairo',
          country: 'Egypt'
        })
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        vendorService.registerVendor(baseUser, {
          business_name: 'Test Vendor',
          city: '',
          country: 'Egypt'
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates a new vendor with mapped fields when valid', async () => {
      vendorRepository.findByOwnerUserId.mockResolvedValue(null);
      generateId.mockReturnValue('vendor-123');
      const createdVendor = { id: 'vendor-123', name: 'Test Vendor' };
      vendorRepository.createVendor.mockResolvedValue(createdVendor);

      const payload = {
        business_name: '  Test Vendor  ',
        description: 'Desc',
        contact_phone: '+20123456789',
        address: '123 Street',
        city: 'Cairo',
        country: 'Egypt',
        latitude: 30.1,
        longitude: 31.2,
        logo_url: 'https://example.com/logo.png'
      };

      const result = await vendorService.registerVendor(baseUser, payload);

      expect(generateId).toHaveBeenCalled();
      expect(vendorRepository.createVendor).toHaveBeenCalledWith({
        id: 'vendor-123',
        ownerUserId: baseUser.userId,
        name: 'Test Vendor',
        description: 'Desc',
        phone: '+20123456789',
        address: '123 Street',
        city: 'Cairo',
        country: 'Egypt',
        latitude: 30.1,
        longitude: 31.2,
        logoUrl: 'https://example.com/logo.png'
      });
      expect(result).toBe(createdVendor);
      expect(logger.info).toHaveBeenCalledWith(
        'Vendor registered',
        expect.objectContaining({
          vendorId: createdVendor.id,
          ownerUserId: baseUser.userId
        })
      );
    });
  });

  describe('approveVendor', () => {
    const adminUser = { userId: 'admin-1', primary_role: 'admin' };

    it('throws 403 when non-admin tries to approve', async () => {
      const nonAdmin = { userId: 'user-2', primary_role: 'vendor' };
      await expect(
        vendorService.approveVendor(nonAdmin, 'vendor-1')
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 when vendor does not exist', async () => {
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        vendorService.approveVendor(adminUser, 'missing-vendor')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('sets vendor as active when admin approves', async () => {
      vendorRepository.findById.mockResolvedValue({ id: 'vendor-1' });
      const updatedVendor = { id: 'vendor-1', is_active: true };
      vendorRepository.setActiveStatus.mockResolvedValue(updatedVendor);

      const result = await vendorService.approveVendor(adminUser, 'vendor-1');

      expect(vendorRepository.setActiveStatus).toHaveBeenCalledWith('vendor-1', true);
      expect(result).toBe(updatedVendor);
      expect(logger.info).toHaveBeenCalledWith(
        'Vendor approved',
        expect.objectContaining({
          vendorId: 'vendor-1',
          adminId: adminUser.userId
        })
      );
    });
  });

  describe('rejectVendor', () => {
    const adminUser = { userId: 'admin-1', primary_role: 'admin' };

    it('throws 404 when vendor does not exist', async () => {
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        vendorService.rejectVendor(adminUser, 'missing-vendor')
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('sets vendor as inactive when admin rejects', async () => {
      vendorRepository.findById.mockResolvedValue({ id: 'vendor-1' });
      const updatedVendor = { id: 'vendor-1', is_active: false };
      vendorRepository.setActiveStatus.mockResolvedValue(updatedVendor);

      const result = await vendorService.rejectVendor(adminUser, 'vendor-1');

      expect(vendorRepository.setActiveStatus).toHaveBeenCalledWith('vendor-1', false);
      expect(result).toBe(updatedVendor);
      expect(logger.info).toHaveBeenCalledWith(
        'Vendor rejected/deactivated',
        expect.objectContaining({
          vendorId: 'vendor-1',
          adminId: adminUser.userId
        })
      );
    });
  });

  describe('updateVendorProfile', () => {
    const vendorId = 'vendor-1';
    const ownerUser = { userId: 'owner-1', primary_role: 'vendor' };
    const adminUser = { userId: 'admin-1', primary_role: 'admin' };

    it('throws 401 when user is not authenticated', async () => {
      await expect(
        vendorService.updateVendorProfile(null, vendorId, {})
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 404 when vendor does not exist', async () => {
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        vendorService.updateVendorProfile(ownerUser, vendorId, {})
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when non-owner non-admin tries to update', async () => {
      vendorRepository.findById.mockResolvedValue({
        id: vendorId,
        owner_user_id: 'someone-else'
      });
      const stranger = { userId: 'stranger-1', primary_role: 'vendor' };

      await expect(
        vendorService.updateVendorProfile(stranger, vendorId, {})
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('allows owner to update and maps fields correctly', async () => {
      vendorRepository.findById.mockResolvedValue({
        id: vendorId,
        owner_user_id: ownerUser.userId
      });
      const updatedVendor = { id: vendorId, name: 'Updated Name' };
      vendorRepository.updateVendor.mockResolvedValue(updatedVendor);

      const fields = {
        business_name: 'Updated Name',
        description: 'New Desc',
        contact_phone: '+200000000',
        address: 'New Address',
        city: 'Giza',
        country: 'Egypt',
        latitude: 30.0,
        longitude: 31.0,
        logo_url: 'https://example.com/new-logo.png'
      };

      const result = await vendorService.updateVendorProfile(ownerUser, vendorId, fields);

      expect(vendorRepository.updateVendor).toHaveBeenCalledWith(vendorId, {
        name: 'Updated Name',
        description: 'New Desc',
        phone: '+200000000',
        address: 'New Address',
        city: 'Giza',
        country: 'Egypt',
        latitude: 30.0,
        longitude: 31.0,
        logo_url: 'https://example.com/new-logo.png'
      });
      expect(result).toBe(updatedVendor);
    });

    it('allows admin to update even if not owner', async () => {
      vendorRepository.findById.mockResolvedValue({
        id: vendorId,
        owner_user_id: 'different-owner'
      });
      const updatedVendor = { id: vendorId, name: 'Admin Updated' };
      vendorRepository.updateVendor.mockResolvedValue(updatedVendor);

      const result = await vendorService.updateVendorProfile(adminUser, vendorId, {
        name: 'Admin Updated'
      });

      expect(vendorRepository.updateVendor).toHaveBeenCalledWith(
        vendorId,
        expect.objectContaining({ name: 'Admin Updated' })
      );
      expect(result).toBe(updatedVendor);
    });
  });

  describe('getVendorById', () => {
    it('returns vendor when found', async () => {
      const vendor = { id: 'vendor-1' };
      vendorRepository.findById.mockResolvedValue(vendor);

      const result = await vendorService.getVendorById('vendor-1');
      expect(result).toBe(vendor);
    });

    it('throws 404 when vendor not found', async () => {
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        vendorService.getVendorById('missing')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('listVendors', () => {
    it('lists only active vendors for non-admin, ignoring includeInactive flag', async () => {
      const nonAdmin = { userId: 'user-1', primary_role: 'vendor' };
      const vendors = [{ id: 'v1' }];
      vendorRepository.listVendors.mockResolvedValue(vendors);

      const result = await vendorService.listVendors(nonAdmin, {
        q: 'test',
        includeInactive: true
      });

      expect(vendorRepository.listVendors).toHaveBeenCalledWith({
        search: 'test',
        includeInactive: false
      });
      expect(result).toBe(vendors);
    });

    it('allows admin to include inactive vendors', async () => {
      const adminUser = { userId: 'admin-1', primary_role: 'admin' };
      const vendors = [{ id: 'v1' }, { id: 'v2' }];
      vendorRepository.listVendors.mockResolvedValue(vendors);

      const result = await vendorService.listVendors(adminUser, {
        q: '',
        includeInactive: true
      });

      expect(vendorRepository.listVendors).toHaveBeenCalledWith({
        search: '',
        includeInactive: true
      });
      expect(result).toBe(vendors);
    });
  });
});

