const offerRepository = require('../../../backend/services/offerRepository');
const pool = require('../../../backend/config/db');
const logger = require('../../../backend/config/logger');

// Mock dependencies
jest.mock('../../../backend/config/db');
jest.mock('../../../backend/config/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}));

describe('OfferRepository - Unit Tests', () => {
  const mockOfferData = {
    item_id: 1,
    title: 'Test Offer',
    description: 'Test description',
    discount_type: 'percentage',
    discount_value: 20,
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-01-31'),
    status: true
  };

  const mockOffer = {
    id: 1,
    ...mockOfferData,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
    item_name: 'Test Item',
    original_price: 50.00,
    store_name: 'Test Store'
  };

  const mockQueryResult = {
    rows: [mockOffer]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOffer', () => {
    it('should create offer and return result', async () => {
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.createOffer(mockOfferData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO offers'),
        expect.arrayContaining([
          mockOfferData.item_id,
          mockOfferData.title,
          mockOfferData.description,
          mockOfferData.discount_type,
          mockOfferData.discount_value,
          mockOfferData.start_date,
          mockOfferData.end_date,
          mockOfferData.status
        ])
      );
      expect(result).toEqual(mockOffer);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      pool.query.mockRejectedValue(dbError);

      await expect(offerRepository.createOffer(mockOfferData))
        .rejects.toThrow('Database connection failed');

      expect(logger.error).toHaveBeenCalledWith('Error creating offer:', dbError);
    });
  });

  describe('getOfferById', () => {
    it('should retrieve offer by ID with joined data', async () => {
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getOfferById(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT o.*, i.name as item_name'),
        [1]
      );
      expect(result).toEqual(mockOffer);
    });

    it('should return null when offer not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await offerRepository.getOfferById(999);

      expect(result).toBeNull();
    });
  });

  describe('updateOffer', () => {
    it('should update offer fields and return result', async () => {
      const updateData = { title: 'Updated Title', discount_value: 25 };
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.updateOffer(1, updateData);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE offers SET'),
        expect.arrayContaining([1])
      );
      expect(result).toEqual(mockOffer);
    });

    it('should throw error when no valid fields to update', async () => {
      await expect(offerRepository.updateOffer(1, {}))
        .rejects.toThrow('No valid fields to update');
    });

    it('should return null when offer not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await offerRepository.updateOffer(1, { title: 'New Title' });

      expect(result).toBeNull();
    });
  });

  describe('deleteOffer', () => {
    it('should delete offer and return result', async () => {
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.deleteOffer(1);

      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM offers WHERE id = $1 RETURNING *',
        [1]
      );
      expect(result).toEqual(mockOffer);
    });
  });

  describe('getActiveOffersByItem', () => {
    it('should retrieve active offers for an item', async () => {
      const now = new Date();
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getActiveOffersByItem(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE o.item_id = $1 AND o.status = true'),
        [1, now]
      );
      expect(result).toEqual([mockOffer]);
    });

    it('should return empty array when no active offers', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await offerRepository.getActiveOffersByItem(1);

      expect(result).toEqual([]);
    });
  });

  describe('getOffersByItem', () => {
    it('should retrieve offers for an item with pagination', async () => {
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getOffersByItem(1, 10, 20);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        [1, 10, 20]
      );
      expect(result).toEqual([mockOffer]);
    });

    it('should use default pagination values', async () => {
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getOffersByItem(1);

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [1, 50, 0]
      );
    });
  });

  describe('getAllOffers', () => {
    it('should retrieve all offers with filters and pagination', async () => {
      const filters = { status: true, discount_type: 'percentage' };
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getAllOffers(20, 10, filters);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        [true, 'percentage', 20, 10]
      );
      expect(result).toEqual([mockOffer]);
    });

    it('should handle empty filters', async () => {
      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getAllOffers(50, 0, {});

      expect(pool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('WHERE'),
        [50, 0]
      );
    });

    it('should filter by status only', async () => {
      const filters = { status: false };
      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.getAllOffers(50, 0, filters);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('o.status = $1'),
        [false, 50, 0]
      );
    });

    it('should filter by item_id only', async () => {
      const filters = { item_id: 5 };
      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.getAllOffers(50, 0, filters);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('o.item_id = $1'),
        [5, 50, 0]
      );
    });

    it('should filter by discount_type only', async () => {
      const filters = { discount_type: 'fixed' };
      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.getAllOffers(50, 0, filters);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('o.discount_type = $1'),
        ['fixed', 50, 0]
      );
    });

    it('should combine multiple filters', async () => {
      const filters = { status: true, discount_type: 'percentage', item_id: 3 };
      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.getAllOffers(30, 15, filters);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('o.status = $1 AND o.discount_type = $2 AND o.item_id = $3'),
        [true, 'percentage', 3, 30, 15]
      );
    });
  });

  describe('expireOffers', () => {
    it('should expire offers past their end date', async () => {
      const now = new Date();
      const expiredOffers = [mockOffer, { ...mockOffer, id: 2 }];
      pool.query.mockResolvedValue({ rows: expiredOffers });

      const result = await offerRepository.expireOffers();

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE offers SET status = false'),
        [now]
      );
      expect(result).toEqual(expiredOffers);
    });

    it('should return empty array when no offers to expire', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await offerRepository.expireOffers();

      expect(result).toEqual([]);
    });
  });

  describe('getExpiringOffers', () => {
    it('should retrieve offers expiring within specified hours', async () => {
      const hoursAhead = 24;
      const now = new Date();
      const futureTime = new Date(now.getTime() + (hoursAhead * 60 * 60 * 1000));

      pool.query.mockResolvedValue(mockQueryResult);

      const result = await offerRepository.getExpiringOffers(hoursAhead);

      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE o.status = true AND o.end_date > $1 AND o.end_date <= $2'),
        [now, futureTime]
      );
      expect(result).toEqual([mockOffer]);
    });

    it('should use default 24 hours when no parameter provided', async () => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + (24 * 60 * 60 * 1000));

      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.getExpiringOffers();

      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        [now, futureTime]
      );
    });

    it('should return empty array when no expiring offers', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      const result = await offerRepository.getExpiringOffers(48);

      expect(result).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should log and re-throw database errors for all methods', async () => {
      const dbError = new Error('Connection timeout');

      // Test getOfferById error handling
      pool.query.mockRejectedValueOnce(dbError);
      await expect(offerRepository.getOfferById(1))
        .rejects.toThrow('Connection timeout');
      expect(logger.error).toHaveBeenCalledWith('Error getting offer by ID:', dbError);

      // Reset mocks
      jest.clearAllMocks();
      pool.query.mockRejectedValue(dbError);

      // Test updateOffer error handling
      await expect(offerRepository.updateOffer(1, { title: 'Test' }))
        .rejects.toThrow('Connection timeout');
      expect(logger.error).toHaveBeenCalledWith('Error updating offer:', dbError);
    });

    it('should handle query execution errors gracefully', async () => {
      const queryError = new Error('Invalid SQL syntax');
      pool.query.mockRejectedValue(queryError);

      await expect(offerRepository.createOffer(mockOfferData))
        .rejects.toThrow('Invalid SQL syntax');

      expect(logger.error).toHaveBeenCalledWith('Error creating offer:', queryError);
    });
  });

  describe('SQL Injection Protection', () => {
    it('should use parameterized queries to prevent SQL injection', async () => {
      const maliciousData = {
        ...mockOfferData,
        title: "'; DROP TABLE offers; --"
      };

      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.createOffer(maliciousData);

      // Verify that the malicious string is passed as a parameter, not concatenated
      expect(pool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([maliciousData.title])
      );

      // The SQL string should contain placeholders like $1, $2, etc.
      const sqlCall = pool.query.mock.calls[0][0];
      expect(sqlCall).toMatch(/\$1/);
      expect(sqlCall).toMatch(/\$2/);
    });
  });

  describe('Data transformation', () => {
    it('should properly transform date objects for database queries', async () => {
      const dateFields = {
        start_date: new Date('2024-01-01T00:00:00Z'),
        end_date: new Date('2024-01-31T23:59:59Z')
      };

      pool.query.mockResolvedValue(mockQueryResult);

      await offerRepository.createOffer({ ...mockOfferData, ...dateFields });

      const callArgs = pool.query.mock.calls[0][1];
      expect(callArgs[5]).toEqual(dateFields.start_date);
      expect(callArgs[6]).toEqual(dateFields.end_date);
    });
  });
});
