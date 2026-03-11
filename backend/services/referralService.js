/**
 * Referral Service
 * Manages courier referral programs and commission tracking
 */

const crypto = require('crypto');

class ReferralService {
    constructor(pool) {
        this.pool = pool;
    }

    /**
     * Generate unique referral code for a courier
     */
    async generateReferralCode(userId) {
        try {
            // Check if code already exists
            const existing = await this.pool.query(
                'SELECT code FROM referral_links WHERE referrer_id = $1',
                [userId]
            );

            if (existing.rows.length > 0) {
                return existing.rows[0].code;
            }

            // Generate new code: REF_[random]
            const code = `REF_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

            await this.pool.query(
                `INSERT INTO referral_links (referrer_id, code, commission_rate)
                 VALUES ($1, $2, 10.00)`,
                [userId, code]
            );

            return code;
        } catch (error) {
            console.error('Error generating referral code:', error);
            throw error;
        }
    }

    /**
     * Activate referral (when referee completes first delivery)
     */
    async activateReferral(referrerCode, refereeId) {
        try {
            // Find the referrer
            const link = await this.pool.query(
                'SELECT referrer_id FROM referral_links WHERE code = $1',
                [referrerCode]
            );

            if (link.rows.length === 0) {
                throw new Error('Invalid referral code');
            }

            const referrerId = link.rows[0].referrer_id;

            // Create conversion record
            await this.pool.query(
                `INSERT INTO referral_conversions (referrer_id, referee_id, referral_code, status, activation_date)
                 VALUES ($1, $2, $3, 'active', NOW())
                 ON CONFLICT (referrer_id, referee_id) DO NOTHING`,
                [referrerId, refereeId, referrerCode]
            );

            // Initialize payout record if doesn't exist
            await this.pool.query(
                `INSERT INTO referral_payouts (referrer_id, total_earned, pending_amount)
                 VALUES ($1, 0, 0)
                 ON CONFLICT (referrer_id) DO NOTHING`,
                [referrerId]
            );

            console.log(`✅ Referral activated: ${referrerId} → ${refereeId}`);
        } catch (error) {
            console.error('Error activating referral:', error);
            throw error;
        }
    }

    /**
     * Record commission when referee completes a delivery
     */
    async recordCommission(refereeId, transactionId, transactionAmount) {
        try {
            // Find who referred this person
            const referral = await this.pool.query(
                'SELECT referrer_id FROM referral_conversions WHERE referee_id = $1 AND status = \'active\'',
                [refereeId]
            );

            if (referral.rows.length === 0) {
                // No referral, no commission
                return null;
            }

            const referrerId = referral.rows[0].referrer_id;
            const commissionAmount = (transactionAmount * 10) / 100; // 10% commission

            // Record earnings
            await this.pool.query(
                `INSERT INTO referral_earnings 
                 (referrer_id, referee_id, transaction_id, transaction_amount, commission_amount, status)
                 VALUES ($1, $2, $3, $4, $5, 'pending')`,
                [referrerId, refereeId, transactionId, transactionAmount, commissionAmount]
            );

            // Update payout totals
            await this.pool.query(
                `UPDATE referral_payouts 
                 SET total_earned = total_earned + $1,
                     pending_amount = pending_amount + $1
                 WHERE referrer_id = $2`,
                [commissionAmount, referrerId]
            );

            console.log(`💰 Commission recorded: ${referrerId} earned ${commissionAmount} EGP`);
            return commissionAmount;
        } catch (error) {
            console.error('Error recording commission:', error);
            throw error;
        }
    }

    /**
     * Get referral stats for a courier
     */
    async getReferralStats(userId) {
        try {
            // Get link info
            const link = await this.pool.query(
                'SELECT code FROM referral_links WHERE referrer_id = $1',
                [userId]
            );

            // Get conversions
            const conversions = await this.pool.query(
                'SELECT COUNT(*) as total_referrals FROM referral_conversions WHERE referrer_id = $1 AND status = \'active\'',
                [userId]
            );

            // Get earnings
            const earnings = await this.pool.query(
                `SELECT 
                    COALESCE(SUM(commission_amount), 0) as total_earned,
                    COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as pending_amount,
                    COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as paid_amount
                 FROM referral_earnings WHERE referrer_id = $1`,
                [userId]
            );

            // Get payout info
            const payout = await this.pool.query(
                'SELECT * FROM referral_payouts WHERE referrer_id = $1',
                [userId]
            );

            return {
                referral_code: link.rows[0]?.code || null,
                total_referrals: parseInt(conversions.rows[0].total_referrals),
                earnings: {
                    total_earned: parseFloat(earnings.rows[0].total_earned),
                    pending: parseFloat(earnings.rows[0].pending_amount),
                    paid: parseFloat(earnings.rows[0].paid_amount)
                },
                payout_method: payout.rows[0]?.payout_method || 'pending',
                last_payout_date: payout.rows[0]?.last_payout_date || null,
                next_payout_date: payout.rows[0]?.next_payout_date || null
            };
        } catch (error) {
            console.error('Error getting referral stats:', error);
            throw error;
        }
    }

    /**
     * Get referral leaderboard (top earners)
     */
    async getLeaderboard(limit = 10) {
        try {
            const result = await this.pool.query(
                `SELECT 
                    rp.referrer_id,
                    u.full_name,
                    COUNT(DISTINCT rc.referee_id) as referrals,
                    COALESCE(SUM(re.commission_amount), 0) as total_earned
                 FROM referral_payouts rp
                 LEFT JOIN referral_conversions rc ON rp.referrer_id = rc.referrer_id
                 LEFT JOIN referral_earnings re ON rp.referrer_id = re.referrer_id
                 LEFT JOIN users u ON rp.referrer_id = u.id
                 GROUP BY rp.referrer_id, u.full_name
                 ORDER BY total_earned DESC
                 LIMIT $1`,
                [limit]
            );

            return result.rows;
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Process weekly/monthly payouts
     */
    async processPayout(userId) {
        try {
            const client = await this.pool.connect();

            try {
                await client.query('BEGIN');

                // Get pending earnings
                const earnings = await client.query(
                    `SELECT COALESCE(SUM(commission_amount), 0) as pending_amount
                     FROM referral_earnings 
                     WHERE referrer_id = $1 AND status = 'pending'`,
                    [userId]
                );

                const pendingAmount = parseFloat(earnings.rows[0].pending_amount);

                if (pendingAmount === 0) {
                    await client.query('ROLLBACK');
                    return { success: false, message: 'No pending earnings' };
                }

                // Mark earnings as paid
                await client.query(
                    `UPDATE referral_earnings 
                     SET status = 'paid', paid_at = NOW()
                     WHERE referrer_id = $1 AND status = 'pending'`,
                    [userId]
                );

                // Update payout record
                const now = new Date();
                const nextPayout = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

                await client.query(
                    `UPDATE referral_payouts 
                     SET total_paid = total_paid + $1,
                         pending_amount = 0,
                         last_payout_date = NOW(),
                         next_payout_date = $2
                     WHERE referrer_id = $3`,
                    [pendingAmount, nextPayout, userId]
                );

                await client.query('COMMIT');

                console.log(`✅ Payout processed: ${userId} received ${pendingAmount} EGP`);
                return { success: true, amount: pendingAmount };
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error processing payout:', error);
            throw error;
        }
    }
}

module.exports = ReferralService;
