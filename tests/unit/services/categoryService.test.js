const categoryService = require('../../../backend/modules/marketplace/services/categoryService');
const categoryRepository = require('../../../backend/modules/marketplace/repositories/categoryRepository');

jest.mock('../../../backend/modules/marketplace/repositories/categoryRepository');

describe('CategoryService - Unit Tests', () => {
  const adminUser = { userId: 'admin-1', primary_role: 'admin' };
  const nonAdminUser = { userId: 'user-1', primary_role: 'customer' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('throws 401 when user is not authenticated', async () => {
      await expect(
        categoryService.createCategory(null, { name: 'Food' })
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 403 when user is not admin', async () => {
      await expect(
        categoryService.createCategory(nonAdminUser, { name: 'Food' })
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 400 when name is missing', async () => {
      await expect(
        categoryService.createCategory(adminUser, {})
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when parent does not exist', async () => {
      categoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(
        categoryService.createCategory(adminUser, { name: 'Food', parent_id: 999 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('creates category when valid', async () => {
      categoryRepository.getCategoryById.mockResolvedValue({ id: 1, name: 'Root' });
      const created = { id: 2, name: 'Child' };
      categoryRepository.createCategory.mockResolvedValue(created);

      const result = await categoryService.createCategory(adminUser, {
        name: '  Child  ',
        parent_id: 1,
        description: 'Desc'
      });

      expect(categoryRepository.createCategory).toHaveBeenCalledWith({
        name: 'Child',
        parentId: 1,
        description: 'Desc'
      });
      expect(result).toBe(created);
    });
  });

  describe('updateCategory', () => {
    it('throws 401 when user is not authenticated', async () => {
      await expect(
        categoryService.updateCategory(null, 1, {})
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 403 when user is not admin', async () => {
      await expect(
        categoryService.updateCategory(nonAdminUser, 1, {})
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 when category does not exist', async () => {
      categoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(
        categoryService.updateCategory(adminUser, 1, {})
      ).rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 400 when parent_id equals id', async () => {
      categoryRepository.getCategoryById.mockResolvedValue({ id: 1, name: 'Cat' });

      await expect(
        categoryService.updateCategory(adminUser, 1, { parent_id: 1 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws 400 when new parent does not exist', async () => {
      categoryRepository.getCategoryById
        .mockResolvedValueOnce({ id: 1, name: 'Cat' }) // existing category
        .mockResolvedValueOnce(null); // new parent

      await expect(
        categoryService.updateCategory(adminUser, 1, { parent_id: 999 })
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('updates category when valid', async () => {
      categoryRepository.getCategoryById
        .mockResolvedValueOnce({ id: 1, name: 'Cat' }) // existing category
        .mockResolvedValueOnce({ id: 2, name: 'Parent' }); // new parent

      const updated = { id: 1, name: 'Updated' };
      categoryRepository.updateCategory.mockResolvedValue(updated);

      const fields = {
        name: 'Updated',
        description: 'Desc',
        status: true,
        parent_id: 2
      };

      const result = await categoryService.updateCategory(adminUser, 1, fields);

      expect(categoryRepository.updateCategory).toHaveBeenCalledWith(1, fields);
      expect(result).toBe(updated);
    });
  });

  describe('deleteCategory', () => {
    it('throws 401 when user is not authenticated', async () => {
      await expect(
        categoryService.deleteCategory(null, 1)
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('throws 403 when user is not admin', async () => {
      await expect(
        categoryService.deleteCategory(nonAdminUser, 1)
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('throws 404 when category does not exist', async () => {
      categoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(
        categoryService.deleteCategory(adminUser, 1)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getCategoryById', () => {
    it('returns category when found', async () => {
      const cat = { id: 1, name: 'Food' };
      categoryRepository.getCategoryById.mockResolvedValue(cat);

      const result = await categoryService.getCategoryById(1);
      expect(result).toBe(cat);
    });

    it('throws 404 when not found', async () => {
      categoryRepository.getCategoryById.mockResolvedValue(null);

      await expect(
        categoryService.getCategoryById(999)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('getCategories', () => {
    it('returns all active categories', async () => {
      const cats = [{ id: 1 }, { id: 2 }];
      categoryRepository.getAllActiveCategories.mockResolvedValue(cats);

      const result = await categoryService.getCategories();
      expect(result).toBe(cats);
    });
  });

  describe('getCategoriesByParent', () => {
    it('returns categories by parent', async () => {
      const cats = [{ id: 2 }];
      categoryRepository.getCategoriesByParent.mockResolvedValue(cats);

      const result = await categoryService.getCategoriesByParent(1);
      expect(result).toBe(cats);
    });
  });
});

