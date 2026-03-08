const storeService = require('../../../backend/modules/marketplace/services/storeService');
const storeRepository = require('../../../backend/modules/marketplace/repositories/storeRepository');
const vendorRepository = require('../../../backend/modules/marketplace/repositories/vendorRepository');

jest.mock('../../../backend/modules/marketplace/repositories/storeRepository');
jest.mock('../../../backend/modules/marketplace/repositories/vendorRepository');

describe('StoreService - Unit Tests', () => {
  const vendor = {
    id: 1,
    owner_user_id: 'owner-1'
  };

  const ownerUser = {
    userId: 'owner-1',
    primary_role: 'vendor'
  };

  const adminUser = {
    userId: 'admin-1',
    primary_role: 'admin'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStore', () => {
    it('throws 401 when user is not authenticated', async () => {
      await expect(
        storeService.createStore(null, { vendor_id: 1, name: 'Test Store' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 400 when required fields are missing', async () => {
      await expect(
        storeService.createStore(ownerUser, { vendor_id: 1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 404 when vendor does not exist', async () => {
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        storeService.createStore(ownerUser, { vendor_id: 999, name: 'Test' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when user is not owner or admin', async () => {
      vendorRepository.findById.mockResolvedValue(vendor);
      const otherUser = { userId: 'other-1', primary_role: 'vendor' };

      await expect(
        storeService.createStore(otherUser, { vendor_id: vendor.id, name: 'Test' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('allows vendor owner to create a store', async () => {
      vendorRepository.findById.mockResolvedValue(vendor);
      const createdStore = { id: 10, name: 'My Store' };
      storeRepository.createStore.mockResolvedValue(createdStore);

      const result = await storeService.createStore(ownerUser, {
        vendor_id: vendor.id,
        name: '  My Store  ',
        description: 'Desc',
        address: '123 Street',
        phone: '+20123456789',
        email: 'store@example.com'
      });

      expect(storeRepository.createStore).toHaveBeenCalledWith({
        vendorId: vendor.id,
        name: 'My Store',
        description: 'Desc',
        address: '123 Street',
        phone: '+20123456789',
        email: 'store@example.com'
      });
      expect(result).toBe(createdStore);
    });

    it('allows admin to create a store for any vendor', async () => {
      vendorRepository.findById.mockResolvedValue(vendor);
      const createdStore = { id: 11, name: 'Admin Store' };
      storeRepository.createStore.mockResolvedValue(createdStore);

      const result = await storeService.createStore(adminUser, {
        vendor_id: vendor.id,
        name: 'Admin Store'
      });

      expect(storeRepository.createStore).toHaveBeenCalledWith(
        expect.objectContaining({ vendorId: vendor.id, name: 'Admin Store' })
      );
      expect(result).toBe(createdStore);
    });
  });

  describe('getStoreById', () => {
    it('returns store when found', async () => {
      const store = { id: 5, name: 'Store' };
      storeRepository.getStoreById.mockResolvedValue(store);

      const result = await storeService.getStoreById(5);
      expect(result).toBe(store);
    });

    it('throws 404 when store not found', async () => {
      storeRepository.getStoreById.mockResolvedValue(null);

      await expect(
        storeService.getStoreById(999)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateStore', () => {
    const store = { id: 5, vendor_id: 1 };

    it('throws 401 when user is not authenticated', async () => {
      await expect(
        storeService.updateStore(null, store.id, {})
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 404 when store does not exist', async () => {
      storeRepository.getStoreById.mockResolvedValue(null);

      await expect(
        storeService.updateStore(ownerUser, store.id, {})
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 when vendor for store does not exist', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        storeService.updateStore(ownerUser, store.id, {})
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when user is not owner or admin', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      const otherUser = { userId: 'other-1', primary_role: 'vendor' };

      await expect(
        storeService.updateStore(otherUser, store.id, {})
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('allows owner to update store fields', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      const updatedStore = { ...store, name: 'Updated Store' };
      storeRepository.updateStore.mockResolvedValue(updatedStore);

      const fields = {
        name: 'Updated Store',
        description: 'New Desc',
        address: 'New Address',
        phone: '+200000000',
        email: 'new@example.com',
        status: true
      };

      const result = await storeService.updateStore(ownerUser, store.id, fields);

      expect(storeRepository.updateStore).toHaveBeenCalledWith(store.id, fields);
      expect(result).toBe(updatedStore);
    });

    it('allows admin to update store', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      const updatedStore = { ...store, name: 'Admin Updated' };
      storeRepository.updateStore.mockResolvedValue(updatedStore);

      const result = await storeService.updateStore(adminUser, store.id, {
        name: 'Admin Updated'
      });

      expect(storeRepository.updateStore).toHaveBeenCalledWith(
        store.id,
        expect.objectContaining({ name: 'Admin Updated' })
      );
      expect(result).toBe(updatedStore);
    });
  });

  describe('deactivateStore', () => {
    const store = { id: 5, vendor_id: 1 };

    it('throws 401 when user is not authenticated', async () => {
      await expect(
        storeService.deactivateStore(null, store.id)
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 404 when store does not exist', async () => {
      storeRepository.getStoreById.mockResolvedValue(null);

      await expect(
        storeService.deactivateStore(ownerUser, store.id)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 404 when vendor does not exist', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(null);

      await expect(
        storeService.deactivateStore(ownerUser, store.id)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when user is not owner or admin', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      const otherUser = { userId: 'other-1', primary_role: 'vendor' };

      await expect(
        storeService.deactivateStore(otherUser, store.id)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('allows owner to deactivate store', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      const updatedStore = { ...store, status: false };
      storeRepository.deactivateStore.mockResolvedValue(updatedStore);

      const result = await storeService.deactivateStore(ownerUser, store.id);

      expect(storeRepository.deactivateStore).toHaveBeenCalledWith(store.id);
      expect(result).toBe(updatedStore);
    });
  });

  describe('getStoresByVendor', () => {
    it('returns stores for vendor', async () => {
      const stores = [{ id: 1 }, { id: 2 }];
      storeRepository.getStoresByVendor.mockResolvedValue(stores);

      const result = await storeService.getStoresByVendor(1);
      expect(result).toBe(stores);
    });
  });
});

