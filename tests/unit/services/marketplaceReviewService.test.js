const reviewService = require('../../../backend/modules/marketplace/services/marketplaceReviewService');
const reviewRepository = require('../../../backend/modules/marketplace/repositories/marketplaceReviewRepository');

jest.mock('../../../backend/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

jest.mock(
  '../../../backend/modules/marketplace/repositories/marketplaceReviewRepository',
);

describe('MarketplaceReviewService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    reviewService.validateOrderOwnership = jest.fn().mockResolvedValue({
      valid: true,
      vendorId: 'vendor-1',
    });
    reviewRepository.findByOrderId.mockResolvedValue(null);
    reviewRepository.createReview.mockResolvedValue({
      id: 1,
      order_id: 100,
      vendor_id: 'vendor-1',
      reviewer_user_id: 'user-1',
      rating: 5,
      title: 'Great!',
      content: 'Best marketplace order ever',
    });
    reviewRepository.findById.mockResolvedValue(null);
    reviewRepository.updateReview.mockResolvedValue(null);
    reviewRepository.deleteReview.mockResolvedValue(true);
    reviewRepository.flagReview.mockResolvedValue(true);
    reviewRepository.findByVendor.mockResolvedValue({
      reviews: [],
      pagination: {},
    });
    reviewRepository.findByReviewer.mockResolvedValue({
      reviews: [],
      pagination: {},
    });
  });

  describe('createReview', () => {
    it('should create a review for a valid order', async () => {
      const result = await reviewService.createReview('user-1', {
        orderId: 100,
        rating: 5,
        title: 'Great!',
        content: 'Best marketplace order ever',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(reviewRepository.createReview).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 100,
          reviewerUserId: 'user-1',
          rating: 5,
        }),
      );
    });

    it('should throw 400 if orderId or rating missing', async () => {
      await expect(
        reviewService.createReview('user-1', { rating: 5 }),
      ).rejects.toThrow('Order ID and rating are required');
    });

    it('should throw 400 if rating outside 1-5 range', async () => {
      await expect(
        reviewService.createReview('user-1', { orderId: 100, rating: 6 }),
      ).rejects.toThrow('Rating must be between 1 and 5');
    });

    it('should throw 403 if user is not the order owner', async () => {
      reviewService.validateOrderOwnership = jest
        .fn()
        .mockResolvedValue({ valid: false });

      await expect(
        reviewService.createReview('user-2', { orderId: 100, rating: 5 }),
      ).rejects.toThrow('You can only review orders you have received');
    });

    it('should throw 409 if review already exists for order', async () => {
      reviewRepository.findByOrderId.mockResolvedValue({ id: 1 });

      await expect(
        reviewService.createReview('user-1', { orderId: 100, rating: 5 }),
      ).rejects.toThrow('You have already reviewed this order');
    });
  });

  describe('getVendorReviews', () => {
    it('should delegate to repository with pagination options', async () => {
      const mockResult = {
        reviews: [{ id: 1, rating: 5 }],
        pagination: {
          page: 1,
          limit: 20,
          totalCount: 1,
          totalPages: 1,
          hasMore: false,
        },
      };
      reviewRepository.findByVendor.mockResolvedValue(mockResult);

      const result = await reviewService.getVendorReviews('vendor-1', {
        page: 1,
      });

      expect(result).toEqual(mockResult);
      expect(reviewRepository.findByVendor).toHaveBeenCalledWith('vendor-1', {
        page: 1,
      });
    });
  });

  describe('getUserReviews', () => {
    it('should delegate to repository', async () => {
      reviewRepository.findByReviewer.mockResolvedValue({
        reviews: [],
        pagination: {},
      });

      const result = await reviewService.getUserReviews('user-1', {});

      expect(result).toEqual({ reviews: [], pagination: {} });
      expect(reviewRepository.findByReviewer).toHaveBeenCalledWith(
        'user-1',
        {},
      );
    });
  });

  describe('getReviewById', () => {
    it('should return review when found', async () => {
      const mockReview = { id: 1, rating: 5, title: 'Great!' };
      reviewRepository.findById.mockResolvedValue(mockReview);

      const result = await reviewService.getReviewById(1);

      expect(result).toEqual(mockReview);
    });

    it('should throw 404 when review not found', async () => {
      reviewRepository.findById.mockResolvedValue(null);

      await expect(reviewService.getReviewById(999)).rejects.toThrow(
        'Review not found',
      );
    });
  });

  describe('updateReview', () => {
    it('should throw 404 if review does not exist', async () => {
      await expect(
        reviewService.updateReview(999, 'user-1', { title: 'Updated' }),
      ).rejects.toThrow('Review not found');
    });

    it('should throw 403 if user is not the reviewer', async () => {
      reviewRepository.findById.mockResolvedValue({
        id: 1,
        reviewer_user_id: 'user-2',
      });

      await expect(
        reviewService.updateReview(1, 'user-1', { title: 'Updated' }),
      ).rejects.toThrow('You can only edit your own reviews');
    });

    it('should throw 409 if update fails (outside edit window)', async () => {
      reviewRepository.findById.mockResolvedValue({
        id: 1,
        reviewer_user_id: 'user-1',
      });
      reviewRepository.updateReview.mockResolvedValue(null);

      await expect(
        reviewService.updateReview(1, 'user-1', { title: 'Updated' }),
      ).rejects.toThrow('Review could not be updated');
    });
  });

  describe('deleteReview', () => {
    it('should throw 404 if review does not exist', async () => {
      await expect(reviewService.deleteReview(999, 'user-1')).rejects.toThrow(
        'Review not found',
      );
    });

    it('should throw 403 if user is not the reviewer', async () => {
      reviewRepository.findById.mockResolvedValue({
        id: 1,
        reviewer_user_id: 'user-2',
      });

      await expect(reviewService.deleteReview(1, 'user-1')).rejects.toThrow(
        'You can only delete your own reviews',
      );
    });

    it('should throw 409 if deletion fails (outside 7-day window)', async () => {
      reviewRepository.findById.mockResolvedValue({
        id: 1,
        reviewer_user_id: 'user-1',
      });
      reviewRepository.deleteReview.mockResolvedValue(false);

      await expect(reviewService.deleteReview(1, 'user-1')).rejects.toThrow(
        'Review could not be deleted',
      );
    });

    it('should return success when deleted', async () => {
      reviewRepository.findById.mockResolvedValue({
        id: 1,
        reviewer_user_id: 'user-1',
      });
      reviewRepository.deleteReview.mockResolvedValue(true);

      const result = await reviewService.deleteReview(1, 'user-1');

      expect(result).toEqual({ success: true });
    });
  });

  describe('flagReview', () => {
    it('should throw 400 if reason is missing', async () => {
      await expect(
        reviewService.flagReview(1, 'user-1', undefined),
      ).rejects.toThrow('Flag reason is required');
    });

    it('should delegate to repository', async () => {
      reviewRepository.flagReview.mockResolvedValue(true);

      const result = await reviewService.flagReview(1, 'user-1', 'spam');

      expect(result).toEqual({ success: true });
      expect(reviewRepository.flagReview).toHaveBeenCalledWith(
        1,
        'user-1',
        'spam',
      );
    });
  });
});
