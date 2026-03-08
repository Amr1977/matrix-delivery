const itemService = require('../../../backend/modules/marketplace/services/itemService');
const itemRepository = require('../../../backend/modules/marketplace/repositories/itemRepository');
const storeRepository = require('../../../backend/modules/marketplace/repositories/storeRepository');
const vendorRepository = require('../../../backend/modules/marketplace/repositories/vendorRepository');
const categoryRepository = require('../../../backend/modules/marketplace/repositories/categoryRepository');

jest.mock('../../../backend/modules/marketplace/repositories/itemRepository');
jest.mock('../../../backend/modules/marketplace/repositories/storeRepository');
jest.mock('../../../backend/modules/marketplace/repositories/vendorRepository');
jest.mock('../../../backend/modules/marketplace/repositories/categoryRepository');

describe('ItemService - Unit Tests', () => {
  const vendor = { id: 1, owner_user_id: 'owner-1' };
  const store = { id: 10, vendor_id: vendor.id };
  const ownerUser = { userId: 'owner-1', primary_role: 'vendor' };
  const adminUser = { userId: 'admin-1', primary_role: 'admin' };
  const nonOwnerUser = { userId: 'user-2', primary_role: 'vendor' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createItem', () => {
    it('throws 400 when required fields are missing', async () => {
      await expect(
        itemService.createItem(ownerUser, { store_id: 10 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when price is invalid', async () => {
      await expect(
        itemService.createItem(ownerUser, {
          store_id: 10,
          category_id: 1,
          name: 'Item',
          price: -1
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 403 when user is not owner or admin', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);

      await expect(
        itemService.createItem(nonOwnerUser, {
          store_id: store.id,
          category_id: 1,
          name: 'Item',
          price: 10
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 400 when category does not exist or inactive', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      categoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(
        itemService.createItem(ownerUser, {
          store_id: store.id,
          category_id: 1,
          name: 'Item',
          price: 10
        })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates item when valid', async () => {
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      categoryRepository.getCategoryById.mockResolvedValue({ id: 1, status: true });
      const created = { id: 100, name: 'Item' };
      itemRepository.createItem.mockResolvedValue(created);

      const result = await itemService.createItem(ownerUser, {
        store_id: store.id,
        category_id: 1,
        name: '  Item  ',
        description: 'Desc',
        price: '15.5',
        inventory_quantity: 5,
        image_url: 'https://example.com/item.png'
      });

      expect(itemRepository.createItem).toHaveBeenCalledWith({
        storeId: store.id,
        categoryId: 1,
        name: 'Item',
        description: 'Desc',
        price: 15.5,
        inventoryQuantity: 5,
        imageUrl: 'https://example.com/item.png'
      });
      expect(result).toBe(created);
    });
  });

  describe('getItemById', () => {
    it('returns item when active', async () => {
      const item = { id: 1, status: true };
      itemRepository.getItemById.mockResolvedValue(item);

      const result = await itemService.getItemById(1);
      expect(result).toBe(item);
    });

    it('throws 404 when not found or inactive', async () => {
      itemRepository.getItemById.mockResolvedValue(null);

      await expect(
        itemService.getItemById(1)
      ).rejects.toMatchObject({ statusCode: 404 });

      itemRepository.getItemById.mockResolvedValue({ id: 1, status: false });

      await expect(
        itemService.getItemById(1)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('updateItem', () => {
    const item = { id: 1, store_id: store.id, status: true };

    it('throws 404 when item does not exist', async () => {
      itemRepository.getItemById.mockResolvedValue(null);

      await expect(
        itemService.updateItem(ownerUser, 1, {})
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when user is not owner or admin', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);

      await expect(
        itemService.updateItem(nonOwnerUser, 1, {})
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 400 when price is invalid', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);

      await expect(
        itemService.updateItem(ownerUser, 1, { price: -10 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when new category invalid', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      categoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(
        itemService.updateItem(ownerUser, 1, { category_id: 99 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('updates item when valid', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      categoryRepository.getCategoryById.mockResolvedValue({ id: 2, status: true });
      const updated = { id: 1, name: 'Updated' };
      itemRepository.updateItem.mockResolvedValue(updated);

      const fields = {
        name: 'Updated',
        price: 20,
        category_id: 2
      };

      const result = await itemService.updateItem(ownerUser, 1, fields);

      expect(itemRepository.updateItem).toHaveBeenCalledWith(
        1,
        expect.objectContaining(fields)
      );
      expect(result).toBe(updated);
    });
  });

  describe('deleteItem', () => {
    const item = { id: 1, store_id: store.id, status: true };

    it('throws 404 when item does not exist', async () => {
      itemRepository.getItemById.mockResolvedValue(null);

      await expect(
        itemService.deleteItem(ownerUser, 1)
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 when user is not owner or admin', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);

      await expect(
        itemService.deleteItem(nonOwnerUser, 1)
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('updateInventory', () => {
    const item = { id: 1, store_id: store.id, status: true };

    it('throws 404 when item does not exist', async () => {
      itemRepository.getItemById.mockResolvedValue(null);

      await expect(
        itemService.updateInventory(ownerUser, 1, { inventory_quantity: 5 })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when quantity is missing or invalid', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);

      await expect(
        itemService.updateInventory(ownerUser, 1, {})
      ).rejects.toMatchObject({ statusCode: 400 });

      await expect(
        itemService.updateInventory(ownerUser, 1, { inventory_quantity: -1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('updates inventory when valid', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);
      const updated = { id: 1, inventory_quantity: 10 };
      itemRepository.updateInventory.mockResolvedValue(updated);

      const result = await itemService.updateInventory(ownerUser, 1, {
        inventory_quantity: 10
      });

      expect(itemRepository.updateInventory).toHaveBeenCalledWith(1, 10);
      expect(result).toBe(updated);
    });
  });

  describe('uploadItemImage', () => {
    const item = { id: 1, store_id: store.id, status: true };

    it('throws 404 when item does not exist', async () => {
      itemRepository.getItemById.mockResolvedValue(null);

      await expect(
        itemService.uploadItemImage(ownerUser, 1, { image_url: 'x' })
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when image_url missing', async () => {
      itemRepository.getItemById.mockResolvedValue(item);
      storeRepository.getStoreById.mockResolvedValue(store);
      vendorRepository.findById.mockResolvedValue(vendor);

      await expect(
        itemService.uploadItemImage(ownerUser, 1, {})
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  });
});

