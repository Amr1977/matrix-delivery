CREATE TABLE IF NOT EXISTS platform_reviews (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    content TEXT,
    upvotes INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    flag_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_platform_reviews_user_id ON platform_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_upvotes ON platform_reviews(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_platform_reviews_is_approved ON platform_reviews(is_approved);
