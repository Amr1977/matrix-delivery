import { ApiClient } from './client';
import { Review, CreateReviewRequest, ReviewFilters } from './types';

export class ReviewsApi {

    /**
     * Get public reviews
     */
    static async getReviews(filters: ReviewFilters = {}): Promise<Review[]> {
        const queryString = ApiClient.buildQueryString(filters);
        const response = await ApiClient.get<{ reviews: Review[], pagination: any }>(`/reviews${queryString}`);
        // API returns { reviews: [...], pagination: {...} } — extract reviews array
        return (response as any)?.reviews || response as unknown as Review[];
    }

    /**
     * Submit a new review
     */
    static async createReview(data: CreateReviewRequest): Promise<Review> {
        return ApiClient.post<Review>('/reviews', data);
    }

    /**
     * Vote on a review
     */
    static async voteReview(reviewId: string, type: 'up' | 'down'): Promise<void> {
        return ApiClient.post<void>(`/reviews/${reviewId}/vote`, { type });
    }

    /**
     * Flag a review
     */
    static async flagReview(reviewId: string): Promise<void> {
        return ApiClient.post<void>(`/reviews/${reviewId}/flag`);
    }
}
