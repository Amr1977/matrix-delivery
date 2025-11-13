import React, { useState } from 'react';
import { useI18n } from '../../i18n/i18nContext';

const ReviewModal = ({ isOpen, onClose, onSubmit, orderId, reviewType, loading }) => {
  const { t } = useI18n();
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    professionalismRating: 0,
    communicationRating: 0,
    timelinessRating: 0,
    conditionRating: 0
  });

  const handleSubmit = async () => {
    if (reviewForm.rating === 0) {
      return;
    }

    await onSubmit({
      reviewType,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
      professionalismRating: reviewForm.professionalismRating || null,
      communicationRating: reviewForm.communicationRating || null,
      timelinessRating: reviewForm.timelinessRating || null,
      conditionRating: reviewForm.conditionRating || null
    });
  };

  const renderStars = (rating, onRate = null) => {
    return (
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() => onRate && onRate(star)}
            style={{
              fontSize: '1.5rem',
              cursor: onRate ? 'pointer' : 'default',
              color: star <= rating ? '#FCD34D' : '#D1D5DB'
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
      <div className="modal-content" style={{ background: 'white', borderRadius: '0.5rem', maxWidth: '42rem', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{t('reviews.submitReview')}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{t('reviews.overallRating')} *</label>
            <div style={{ marginBottom: '1rem' }}>
              {renderStars(reviewForm.rating, (rating) => setReviewForm({ ...reviewForm, rating: rating }))}
            </div>
          </div>

          {reviewType === 'customer_to_driver' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{t('reviews.professionalism')}</label>
                {renderStars(reviewForm.professionalismRating, (rating) => setReviewForm({ ...reviewForm, professionalismRating: rating }))}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{t('reviews.communication')}</label>
                {renderStars(reviewForm.communicationRating, (rating) => setReviewForm({ ...reviewForm, communicationRating: rating }))}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{t('reviews.timeliness')}</label>
                {renderStars(reviewForm.timelinessRating, (rating) => setReviewForm({ ...reviewForm, timelinessRating: rating }))}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.25rem' }}>{t('reviews.packageCondition')}</label>
                {renderStars(reviewForm.conditionRating, (rating) => setReviewForm({ ...reviewForm, conditionRating: rating }))}
              </div>
            </>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: '600', fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem' }}>{t('reviews.commentOptional')}</label>
            <textarea
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              placeholder={t('reviews.shareExperience')}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #D1D5DB', borderRadius: '0.375rem', minHeight: '100px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '0.75rem', background: '#F3F4F6', color: '#374151', borderRadius: '0.375rem', border: 'none', cursor: 'pointer', fontWeight: '600' }}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || reviewForm.rating === 0}
              style={{ flex: 1, padding: '0.75rem', background: '#4F46E5', color: 'white', borderRadius: '0.375rem', border: 'none', cursor: reviewForm.rating === 0 || loading ? 'not-allowed' : 'pointer', fontWeight: '600', opacity: reviewForm.rating === 0 || loading ? 0.5 : 1 }}
            >
              {loading ? t('reviews.submitting') : t('reviews.submitReview')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewModal;
