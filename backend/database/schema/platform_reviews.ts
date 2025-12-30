import { TableSchema } from '../types';

/**
 * Reviews table schema
 * Stores mutual ratings between customers and drivers
 */
export const platformReviewsSchema: TableSchema = {
    name: 'platform_reviews',

    createStatement: `
    CREATE TABLE IF NOT EXISTS platform_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        content TEXT,
        professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5),
        communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
        timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5),
        package_condition_rating INTEGER CHECK (package_condition_rating >= 1 AND package_condition_rating <= 5),
        upvotes INTEGER DEFAULT 0,
        flag_count INTEGER DEFAULT 0,
        is_approved BOOLEAN DEFAULT TRUE,
        is_featured BOOLEAN DEFAULT FALSE,
        github_issue_link VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `,

    indexes: [
        'CREATE INDEX IF NOT EXISTS idx_platform_reviews_user_id ON platform_reviews(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_platform_reviews_created_at ON platform_reviews(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_platform_reviews_upvotes ON platform_reviews(upvotes DESC)',
        'CREATE INDEX IF NOT EXISTS idx_platform_reviews_is_approved ON platform_reviews(is_approved)',
        'CREATE INDEX IF NOT EXISTS idx_platform_reviews_flag_count ON platform_reviews(flag_count)'
    ],

    alterStatements: [
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS upvotes INTEGER DEFAULT 0',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS professionalism_rating INTEGER CHECK (professionalism_rating >= 1 AND professionalism_rating <= 5)',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5)',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS timeliness_rating INTEGER CHECK (timeliness_rating >= 1 AND timeliness_rating <= 5)',
        'ALTER TABLE platform_reviews ADD COLUMN IF NOT EXISTS package_condition_rating INTEGER CHECK (package_condition_rating >= 1 AND package_condition_rating <= 5)'
    ]
};

export const platformReviewVotesSchema: TableSchema = {
    name: 'platform_review_votes',
    createStatement: `
    CREATE TABLE IF NOT EXISTS platform_review_votes (
        review_id UUID NOT NULL REFERENCES platform_reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (review_id, user_id)
    )
    `,
    indexes: []
};

export const platformReviewFlagsSchema: TableSchema = {
    name: 'platform_review_flags',
    createStatement: `
    CREATE TABLE IF NOT EXISTS platform_review_flags (
        review_id UUID NOT NULL REFERENCES platform_reviews(id) ON DELETE CASCADE,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (review_id, user_id)
    )
    `,
    indexes: []
};
