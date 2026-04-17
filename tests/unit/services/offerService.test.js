const offerService = require("../../../backend/services/offerService");
const offerRepository = require("../../../backend/services/offerRepository");
const pool = require("../../../backend/config/db");
const logger = require("../../../backend/config/logger");

// Mock dependencies
jest.mock("../../../backend/services/offerRepository");
jest.mock("../../../backend/config/db");
jest.mock("../../../backend/config/logger", () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe("OfferService - Unit Tests", () => {
  const mockVendorId = "vendor-123";
  const mockItemId = 1;
  const mockOfferId = 1;

  const mockOfferData = {
    item_id: mockItemId,
    title: "Test Offer",
    description: "Test description",
    discount_type: "percentage",
    discount_value: 20,
    start_date: new Date("2027-01-01"),
    end_date: new Date("2027-01-31"),
  };

  const mockOffer = {
    id: mockOfferId,
    ...mockOfferData,
    status: true,
    created_at: new Date(),
    updated_at: new Date(),
    item_name: "Test Item",
    original_price: 50.0,
    store_name: "Test Store",
  };

  const mockUser = {
    userId: mockVendorId,
    primary_role: "vendor",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createOffer", () => {
    it("should create a percentage discount offer successfully", async () => {
      const offerPayload = {
        item_id: mockItemId,
        title: "Percentage Offer",
        description: "20% off",
        discount_type: "percentage",
        discount_value: 20,
        start_date: "2027-01-01",
        end_date: "2027-01-31",
      };

      // Mock item ownership check
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      // Mock no conflicting offers
      offerRepository.getActiveOffersByItem.mockResolvedValue([]);

      // Mock offer creation
      offerRepository.createOffer.mockResolvedValue(mockOffer);

      const result = await offerService.createOffer(mockVendorId, offerPayload);

      expect(result).toEqual(mockOffer);
      expect(offerRepository.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          item_id: mockItemId,
          discount_type: "percentage",
          discount_value: 20,
          status: true,
        }),
      );
      expect(logger.info).toHaveBeenCalled();
    });

    it("should create a fixed discount offer successfully", async () => {
      const offerPayload = {
        item_id: mockItemId,
        title: "Fixed Offer",
        description: "$10 off",
        discount_type: "fixed",
        discount_value: 10.0,
        start_date: "2027-01-01",
        end_date: "2027-01-31",
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      offerRepository.getActiveOffersByItem.mockResolvedValue([]);
      offerRepository.createOffer.mockResolvedValue(mockOffer);

      const result = await offerService.createOffer(mockVendorId, offerPayload);

      expect(result).toEqual(mockOffer);
      expect(offerRepository.createOffer).toHaveBeenCalledWith(
        expect.objectContaining({
          discount_type: "fixed",
          discount_value: 10.0,
        }),
      );
    });

    it("should throw error for missing required fields", async () => {
      const invalidPayload = {
        title: "Test Offer",
        // Missing item_id, discount_type, discount_value
      };

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow("Missing required fields");
    });

    it("should throw error for invalid discount type", async () => {
      const invalidPayload = {
        ...mockOfferData,
        discount_type: "invalid",
      };

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow("Invalid discount_type");
    });

    it("should throw error for zero or negative discount value", async () => {
      const invalidPayload = {
        ...mockOfferData,
        discount_value: 0,
      };

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow("Discount value must be greater than 0");
    });

    it("should throw error for percentage discount over 100%", async () => {
      const invalidPayload = {
        ...mockOfferData,
        discount_value: 150,
      };

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow("Percentage discount cannot exceed 100%");
    });

    it("should throw error for fixed discount exceeding item price", async () => {
      const invalidPayload = {
        ...mockOfferData,
        discount_type: "fixed",
        discount_value: 60.0,
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow(
        "Fixed discount cannot be greater than or equal to item price",
      );
    });

    it("should throw error for invalid date range", async () => {
      const invalidPayload = {
        ...mockOfferData,
        start_date: "2024-01-31", // Start after end
        end_date: "2024-01-01",
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow("Start date must be before end date");
    });

    it("should throw error for past end date", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const invalidPayload = {
        ...mockOfferData,
        start_date: "2024-01-01",
        end_date: pastDate.toISOString().split("T")[0],
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      await expect(
        offerService.createOffer(mockVendorId, invalidPayload),
      ).rejects.toThrow("End date must be in the future");
    });

    it("should throw error when item not found", async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        offerService.createOffer(mockVendorId, mockOfferData),
      ).rejects.toThrow("Item not found");
    });

    it("should throw error when vendor does not own the item", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: "different-vendor-id" }],
      });

      await expect(
        offerService.createOffer(mockVendorId, mockOfferData),
      ).rejects.toThrow("Access denied: Item does not belong to your store");
    });

    it("should throw error for conflicting offer dates", async () => {
      const conflictingOffer = {
        id: 2,
        start_date: "2027-01-01",
        end_date: "2027-01-31",
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      offerRepository.getActiveOffersByItem.mockResolvedValue([
        conflictingOffer,
      ]);

      await expect(
        offerService.createOffer(mockVendorId, mockOfferData),
      ).rejects.toThrow(
        "Item already has an active offer during the specified date range",
      );
    });
  });

  describe("getOfferById", () => {
    it("should return offer for vendor owner", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);

      const result = await offerService.getOfferById(mockOfferId, mockVendorId);

      expect(result).toEqual(mockOffer);
      expect(offerRepository.getOfferById).toHaveBeenCalledWith(mockOfferId);
    });

    it("should return offer for admin without vendor restriction", async () => {
      offerRepository.getOfferById.mockResolvedValue(mockOffer);

      const result = await offerService.getOfferById(mockOfferId, null); // Admin

      expect(result).toEqual(mockOffer);
    });

    it("should throw error when offer not found", async () => {
      offerRepository.getOfferById.mockResolvedValue(null);

      await expect(
        offerService.getOfferById(mockOfferId, mockVendorId),
      ).rejects.toThrow("Offer not found");
    });

    it("should throw error when vendor does not own the offer", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: "different-vendor" }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);

      await expect(
        offerService.getOfferById(mockOfferId, mockVendorId),
      ).rejects.toThrow("Access denied: Offer does not belong to your store");
    });
  });

  describe("updateOffer", () => {
    it("should update offer successfully", async () => {
      const updateData = { title: "Updated Title", discount_value: 25 };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId, price: 50.0 }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);
      offerRepository.updateOffer.mockResolvedValue({
        ...mockOffer,
        ...updateData,
      });

      const result = await offerService.updateOffer(
        mockOfferId,
        mockVendorId,
        updateData,
      );

      expect(result.title).toBe("Updated Title");
      expect(result.discount_value).toBe(25);
      expect(offerRepository.updateOffer).toHaveBeenCalledWith(
        mockOfferId,
        updateData,
      );
    });

    it("should validate updated discount value", async () => {
      const invalidUpdate = { discount_value: 0 };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);

      await expect(
        offerService.updateOffer(mockOfferId, mockVendorId, invalidUpdate),
      ).rejects.toThrow("Discount value must be greater than 0");
    });

    it("should validate updated date range", async () => {
      const invalidUpdate = {
        start_date: "2024-01-31",
        end_date: "2024-01-01",
      };

      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);

      await expect(
        offerService.updateOffer(mockOfferId, mockVendorId, invalidUpdate),
      ).rejects.toThrow("Start date must be before end date");
    });
  });

  describe("deactivateOffer", () => {
    it("should deactivate offer successfully", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);
      offerRepository.updateOffer.mockResolvedValue({
        ...mockOffer,
        status: false,
      });

      const result = await offerService.deactivateOffer(
        mockOfferId,
        mockVendorId,
      );

      expect(result.status).toBe(false);
      expect(offerRepository.updateOffer).toHaveBeenCalledWith(mockOfferId, {
        status: false,
      });
    });
  });

  describe("deleteOffer", () => {
    it("should delete offer successfully", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId }],
      });

      offerRepository.getOfferById.mockResolvedValue(mockOffer);
      offerRepository.deleteOffer.mockResolvedValue(mockOffer);

      const result = await offerService.deleteOffer(mockOfferId, mockVendorId);

      expect(result).toEqual(mockOffer);
      expect(offerRepository.deleteOffer).toHaveBeenCalledWith(mockOfferId);
    });
  });

  describe("getActiveOffersByItem", () => {
    it("should return active offers for an item", async () => {
      const activeOffers = [mockOffer];
      offerRepository.getActiveOffersByItem.mockResolvedValue(activeOffers);

      const result = await offerService.getActiveOffersByItem(mockItemId);

      expect(result).toEqual(activeOffers);
      expect(offerRepository.getActiveOffersByItem).toHaveBeenCalledWith(
        mockItemId,
      );
    });
  });

  describe("getOffersByItem", () => {
    it("should return offers for vendor-owned item", async () => {
      const offers = [mockOffer];
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: mockVendorId }],
      });

      offerRepository.getOffersByItem.mockResolvedValue(offers);

      const result = await offerService.getOffersByItem(
        mockItemId,
        mockVendorId,
      );

      expect(result).toEqual(offers);
      expect(offerRepository.getOffersByItem).toHaveBeenCalledWith(
        mockItemId,
        50,
        0,
      );
    });

    it("should throw error for non-owned item", async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ vendor_id: "different-vendor" }],
      });

      await expect(
        offerService.getOffersByItem(mockItemId, mockVendorId),
      ).rejects.toThrow("Access denied: Item does not belong to your store");
    });
  });

  describe("calculateDiscountedPrice", () => {
    it("should calculate percentage discount correctly", () => {
      const offer = {
        ...mockOffer,
        discount_type: "percentage",
        discount_value: 20,
      };
      const originalPrice = 100;

      const result = offerService.calculateDiscountedPrice(
        originalPrice,
        offer,
      );

      expect(result).toBe(80); // 100 - (100 * 0.20)
    });

    it("should calculate fixed discount correctly", () => {
      const offer = {
        ...mockOffer,
        discount_type: "fixed",
        discount_value: 15,
      };
      const originalPrice = 100;

      const result = offerService.calculateDiscountedPrice(
        originalPrice,
        offer,
      );

      expect(result).toBe(85); // 100 - 15
    });

    it("should return original price for inactive offer", () => {
      const inactiveOffer = { ...mockOffer, status: false };
      const originalPrice = 100;

      const result = offerService.calculateDiscountedPrice(
        originalPrice,
        inactiveOffer,
      );

      expect(result).toBe(100);
    });

    it("should return original price when no offer provided", () => {
      const originalPrice = 100;

      const result = offerService.calculateDiscountedPrice(originalPrice, null);

      expect(result).toBe(100);
    });

    it("should not allow negative prices", () => {
      const offer = {
        ...mockOffer,
        discount_type: "fixed",
        discount_value: 150,
      };
      const originalPrice = 100;

      const result = offerService.calculateDiscountedPrice(
        originalPrice,
        offer,
      );

      expect(result).toBe(0); // Minimum price is 0
    });
  });

  describe("expireOffers", () => {
    it("should expire offers that have passed their end date", async () => {
      const expiredOffers = [mockOffer];
      offerRepository.expireOffers.mockResolvedValue(expiredOffers);

      const result = await offerService.expireOffers();

      expect(result).toEqual(expiredOffers);
      expect(offerRepository.expireOffers).toHaveBeenCalled();
    });
  });

  describe("getExpiringOffers", () => {
    it("should return offers expiring within specified hours", async () => {
      const expiringOffers = [mockOffer];
      offerRepository.getExpiringOffers.mockResolvedValue(expiringOffers);

      const result = await offerService.getExpiringOffers(24);

      expect(result).toEqual(expiringOffers);
      expect(offerRepository.getExpiringOffers).toHaveBeenCalledWith(24);
    });
  });
});
