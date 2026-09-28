-- Create marketplace reviews table for vendor/store ratings
-- Migration 023

-- Add review_count column to vendors if not present
CREATE OR REPLACE FUNCTION ensure_vendor_review_count_column() RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'vendors'
          AND column_name = 'review_count'
    ) THEN
        ALTER TABLE vendors ADD COLUMN review_count INTEGER DEFAULT 0;
    END IF;
END;
$$ LANGUAGE plpgsql;

SELECT ensure_vendor_review_count_column();

CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    vendor_id VARCHAR(255) NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    store_id INTEGER REFERENCES stores(id) ON DELETE SET NULL,
    reviewer_user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Review content
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    content TEXT,

    -- Sub-ratings for granular feedback
    food_quality INTEGER CHECK (food_quality >= 1 AND food_quality <= 5),
    service_rating INTEGER CHECK (service_rating >= 1 AND service_rating <= 5),
    delivery_speed INTEGER CHECK (delivery_speed >= 1 AND delivery_speed <= 5),

    -- Media / moderation
    images JSONB,
    is_approved BOOLEAN DEFAULT TRUE,
    flag_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate reviews per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_reviews_order_id
    ON marketplace_reviews(order_id);

-- Index for vendor review listing
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_vendor_id
    ON marketplace_reviews(vendor_id);

-- Index for reviewer queries
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewer
    ON marketplace_reviews(reviewer_user_id);

-- Index for moderation
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_approved
    ON marketplace_reviews(is_approved);

-- Index for trending/featured
CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_featured
    ON marketplace_reviews(is_featured, created_at DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_marketplace_review_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_marketplace_review_updated_at ON marketplace_reviews;
CREATE TRIGGER trigger_update_marketplace_review_updated_at
    BEFORE UPDATE ON marketplace_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_marketplace_review_updated_at();

-- Trigger to update vendor rating aggregate on review changes
CREATE OR REPLACE FUNCTION update_vendor_rating_on_review() RETURNS TRIGGER AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    review_count INTEGER;
BEGIN
    SELECT AVG(rating), COUNT(*)
    INTO avg_rating, review_count
    FROM marketplace_reviews
    WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id)
      AND is_approved = true;

    UPDATE vendors
    SET rating = COALESCE(avg_rating, 0),
        review_count = COALESCE(review_count, 0),
        updated_at = NOW()
    WHERE id = NEW.vendor_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_rating_on_review ON marketplace_reviews;
CREATE TRIGGER trigger_update_vendor_rating_on_review
    AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
    FOR EACH ROW EXECUTE FUNCTION update_vendor_rating_on_review();
