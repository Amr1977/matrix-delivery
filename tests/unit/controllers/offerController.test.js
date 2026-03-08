const offerController = require('../../../backend/controllers/offerController');
const offerService = require('../../../backend/services/offerService');

// Mock offerService
jest.mock('../../../backend/services/offerService');

describe('OfferController - Unit Tests', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request object
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: {
        userId: 'vendor-123',
        primary_role: 'vendor',
        granted_roles: []
      }
    };

    // Mock response object
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('createOffer', () => {
    it('should create offer successfully and return 201', async () => {
      const offerData = {
        item_id: 1,
        title: 'Test Offer',
        description: 'Test description',
        discount_type: 'percentage',
        discount_value: 20,
        start_date: '2024-01-01',
        end_date: '2024-01-31'
      };

      const createdOffer = { id: 1, ...offerData, status: true };

      mockReq.body = offerData;
      offerService.createOffer.mockResolvedValue(createdOffer);

      await offerController.createOffer(mockReq, mockRes);

      expect(offerService.createOffer).toHaveBeenCalledWith('vendor-123', offerData);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Offer created successfully',
        data: createdOffer
      });
    });

    it('should handle service errors and return 400', async () => {
      const offerData = { item_id: 1, title: 'Test Offer' };
      const error = new Error('Validation failed');

      mockReq.body = offerData;
      offerService.createOffer.mockRejectedValue(error);

      await offerController.createOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed'
      });
    });
  });

  describe('getOffer', () => {
    it('should return offer for vendor and return 200', async () => {
      const offer = { id: 1, title: 'Test Offer', status: true };
      mockReq.params.id = '1';

      offerService.getOfferById.mockResolvedValue(offer);

      await offerController.getOffer(mockReq, mockRes);

      expect(offerService.getOfferById).toHaveBeenCalledWith('1', 'vendor-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: offer
      });
    });

    it('should return offer for admin without vendor restriction', async () => {
      const offer = { id: 1, title: 'Test Offer' };
      mockReq.params.id = '1';
      mockReq.user.primary_role = 'admin';

      offerService.getOfferById.mockResolvedValue(offer);

      await offerController.getOffer(mockReq, mockRes);

      expect(offerService.getOfferById).toHaveBeenCalledWith('1', null);
    });

    it('should return 404 for not found offer', async () => {
      const error = new Error('Offer not found');
      mockReq.params.id = '999';

      offerService.getOfferById.mockRejectedValue(error);

      await offerController.getOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Offer not found'
      });
    });

    it('should return 403 for unauthorized access', async () => {
      const error = new Error('Access denied: Offer does not belong to your store');
      mockReq.params.id = '1';

      offerService.getOfferById.mockRejectedValue(error);

      await offerController.getOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied: Offer does not belong to your store'
      });
    });
  });

  describe('updateOffer', () => {
    it('should update offer successfully and return 200', async () => {
      const updateData = { title: 'Updated Title', discount_value: 25 };
      const updatedOffer = { id: 1, title: 'Updated Title', discount_value: 25 };

      mockReq.params.id = '1';
      mockReq.body = updateData;
      offerService.updateOffer.mockResolvedValue(updatedOffer);

      await offerController.updateOffer(mockReq, mockRes);

      expect(offerService.updateOffer).toHaveBeenCalledWith('1', 'vendor-123', updateData);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Offer updated successfully',
        data: updatedOffer
      });
    });

    it('should handle validation errors and return 400', async () => {
      const updateData = { discount_value: 0 };
      const error = new Error('Discount value must be greater than 0');

      mockReq.params.id = '1';
      mockReq.body = updateData;
      offerService.updateOffer.mockRejectedValue(error);

      await offerController.updateOffer(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Discount value must be greater than 0'
      });
    });
  });

  describe('deleteOffer', () => {
    it('should delete offer successfully and return 200', async () => {
      const deletedOffer = { id: 1, title: 'Deleted Offer' };

      mockReq.params.id = '1';
      offerService.deleteOffer.mockResolvedValue(deletedOffer);

      await offerController.deleteOffer(mockReq, mockRes);

      expect(offerService.deleteOffer).toHaveBeenCalledWith('1', 'vendor-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Offer deleted successfully',
        data: deletedOffer
      });
    });
  });

  describe('deactivateOffer', () => {
    it('should deactivate offer successfully and return 200', async () => {
      const deactivatedOffer = { id: 1, status: false };

      mockReq.params.id = '1';
      offerService.deactivateOffer.mockResolvedValue(deactivatedOffer);

      await offerController.deactivateOffer(mockReq, mockRes);

      expect(offerService.deactivateOffer).toHaveBeenCalledWith('1', 'vendor-123');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Offer deactivated successfully',
        data: deactivatedOffer
      });
    });
  });

  describe('getOffersByItem', () => {
    it('should return offers for an item and return 200', async () => {
      const offers = [
        { id: 1, title: 'Offer 1', status: true },
        { id: 2, title: 'Offer 2', status: false }
      ];

      mockReq.params.itemId = '1';
      offerService.getActiveOffersByItem.mockResolvedValue(offers);

      await offerController.getOffersByItem(mockReq, mockRes);

      expect(offerService.getActiveOffersByItem).toHaveBeenCalledWith('1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: offers,
        pagination: {
          limit: 50,
          offset: 0,
          count: 2
        }
      });
    });

    it('should use pagination parameters', async () => {
      mockReq.params.itemId = '1';
      mockReq.query.limit = '10';
      mockReq.query.offset = '20';

      offerService.getActiveOffersByItem.mockResolvedValue([]);

      await offerController.getOffersByItem(mockReq, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: [],
        pagination: {
          limit: 10,
          offset: 20,
          count: 0
        }
      });
    });
  });

  describe('getVendorOffers', () => {
    it('should return vendor offers and return 200', async () => {
      const offers = [{ id: 1, title: 'Vendor Offer' }];

      mockReq.query = {};
      offerService.getOffersByVendor.mockResolvedValue(offers);

      await offerController.getVendorOffers(mockReq, mockRes);

      expect(offerService.getOffersByVendor).toHaveBeenCalledWith('vendor-123', 50, 0, {});
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: offers,
        pagination: {
          limit: 50,
          offset: 0,
          count: 1
        }
      });
    });

    it('should apply filters correctly', async () => {
      const offers = [{ id: 1, title: 'Active Offer', status: true }];

      mockReq.query = { status: 'true', discount_type: 'percentage' };
      offerService.getOffersByVendor.mockResolvedValue(offers);

      await offerController.getVendorOffers(mockReq, mockRes);

      expect(offerService.getOffersByVendor).toHaveBeenCalledWith('vendor-123', 50, 0, {
        status: true,
        discount_type: 'percentage'
      });
    });

    it('should return admin offers without vendor restriction', async () => {
      mockReq.user.primary_role = 'admin';
      const offers = [{ id: 1, title: 'All Offers' }];

      offerService.getAllOffers.mockResolvedValue(offers);

      await offerController.getVendorOffers(mockReq, mockRes);

      expect(offerService.getAllOffers).toHaveBeenCalledWith(50, 0, {});
    });

    it('should return 403 for non-vendor users', async () => {
      mockReq.user.primary_role = 'customer';

      await offerController.getVendorOffers(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied: Only vendors can view their offers'
      });
    });
  });

  describe('calculateDiscountedPrice', () => {
    it('should calculate discounted price and return 200', async () => {
      const priceCalculation = {
        original_price: 100,
        discounted_price: 80,
        discount_amount: 20,
        discount_percentage: 20
      };

      mockReq.query = { item_id: '1' };
      offerService.getActiveOffersByItem.mockResolvedValue([]);
      offerService.calculateDiscountedPrice.mockReturnValue(100);

      // Mock the pool query for item lookup
      const pool = require('../../../backend/config/db');
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ price: 100 }]
      });

      await offerController.calculateDiscountedPrice(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          original_price: 100,
          discounted_price: 100
        })
      });
    });

    it('should return 400 when item_id is missing', async () => {
      mockReq.query = {};

      await offerController.calculateDiscountedPrice(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'item_id is required'
      });
    });

    it('should return 404 when item is not found', async () => {
      mockReq.query = { item_id: '999' };

      const pool = require('../../../backend/config/db');
      pool.query = jest.fn().mockResolvedValue({ rows: [] });

      await offerController.calculateDiscountedPrice(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Item not found'
      });
    });

    it('should calculate price with specific offer when offer_id provided', async () => {
      const specificOffer = { id: 1, discount_type: 'percentage', discount_value: 20 };

      mockReq.query = { item_id: '1', offer_id: '1' };

      const pool = require('../../../backend/config/db');
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ price: 100 }]
      });

      offerService.getOfferById.mockResolvedValue(specificOffer);
      offerService.calculateDiscountedPrice.mockReturnValue(80);

      await offerController.calculateDiscountedPrice(mockReq, mockRes);

      expect(offerService.getOfferById).toHaveBeenCalledWith('1');
      expect(offerService.calculateDiscountedPrice).toHaveBeenCalledWith(100, specificOffer);
    });

    it('should calculate best price when multiple offers exist', async () => {
      const offers = [
        { id: 1, discount_type: 'percentage', discount_value: 10 },
        { id: 2, discount_type: 'fixed', discount_value: 15 }
      ];

      mockReq.query = { item_id: '1' };

      const pool = require('../../../backend/config/db');
      pool.query = jest.fn().mockResolvedValue({
        rows: [{ price: 100 }]
      });

      offerService.getActiveOffersByItem.mockResolvedValue(offers);
      offerService.calculateDiscountedPrice
        .mockReturnValueOnce(90) // First offer: 100 * 0.9 = 90
        .mockReturnValueOnce(85); // Second offer: 100 - 15 = 85 (better)

      await offerController.calculateDiscountedPrice(mockReq, mockRes);

      expect(offerService.getActiveOffersByItem).toHaveBeenCalledWith('1');
      expect(offerService.calculateDiscountedPrice).toHaveBeenCalledTimes(2);
    });
  });
});
