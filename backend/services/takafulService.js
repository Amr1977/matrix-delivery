/**
 * Takaful Service - Cooperative Insurance Fund Management
 * Handles contributions, fund tracking, claims, and gold-indexed loans
 */

const logger = require('../config/logger');

class TakafulService {
    constructor(pool) {
        this.pool = pool;
        this.TAKAFUL_RATE = 0.05; // 5%
        this.PLATFORM_RATE = 0.10; // 10%
        this.MAX_LOAN_AMOUNT = 5000; // 5000 EGP fixed limit
    }

    // ============================================
    // Contribution Management
    // ============================================

    /**
     * Record a Takaful contribution from a completed order
     * @param {string} courierId - Courier user ID
     * @param {string} orderId - Order ID
     * @param {number} deliveryFee - The delivery fee for the order
     * @returns {Promise<Object>} Contribution record
     */
    async recordContribution(courierId, orderId, deliveryFee) {
        const contribution = deliveryFee * this.TAKAFUL_RATE;

        const result = await this.pool.query(
            `INSERT INTO takaful_contributions 
       (courier_id, order_id, amount, delivery_fee, contribution_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [courierId, orderId, contribution, deliveryFee, this.TAKAFUL_RATE]
        );

        logger.info('Takaful contribution recorded', {
            courierId,
            orderId,
            deliveryFee,
            contribution
        });

        return result.rows[0];
    }

    /**
     * Get courier's total contributions
     * @param {string} courierId - Courier user ID
     * @returns {Promise<Object>} Contribution summary
     */
    async getCourierContributions(courierId) {
        const result = await this.pool.query(
            `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(amount), 0) as total_contributed,
        COALESCE(SUM(delivery_fee), 0) as total_delivery_fees,
        MIN(created_at) as first_contribution,
        MAX(created_at) as last_contribution
       FROM takaful_contributions
       WHERE courier_id = $1`,
            [courierId]
        );

        return {
            ...result.rows[0],
            total_contributed: parseFloat(result.rows[0].total_contributed) || 0,
            total_orders: parseInt(result.rows[0].total_orders) || 0
        };
    }

    // ============================================
    // Fund Management
    // ============================================

    /**
     * Get current Takaful fund balance
     * @returns {Promise<Object>} Fund status
     */
    async getFundBalance() {
        const result = await this.pool.query(
            `SELECT balance, total_contributions, total_payouts, currency, updated_at
       FROM takaful_fund LIMIT 1`
        );

        if (result.rows.length === 0) {
            return { balance: 0, total_contributions: 0, total_payouts: 0 };
        }

        return {
            balance: parseFloat(result.rows[0].balance) || 0,
            totalContributions: parseFloat(result.rows[0].total_contributions) || 0,
            totalPayouts: parseFloat(result.rows[0].total_payouts) || 0,
            currency: result.rows[0].currency,
            updatedAt: result.rows[0].updated_at
        };
    }

    /**
     * Deduct from Takaful fund (for claims, emergency bonuses, etc.)
     * @param {number} amount - Amount to deduct
     * @param {string} reason - Reason for deduction
     * @param {string} [claimId] - Optional claim ID
     * @returns {Promise<Object>} Updated fund balance
     */
    async deductFromFund(amount, reason, claimId = null) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Check fund balance
            const fundResult = await client.query(
                'SELECT balance FROM takaful_fund FOR UPDATE'
            );
            const currentBalance = parseFloat(fundResult.rows[0]?.balance) || 0;

            if (currentBalance < amount) {
                throw new Error(`Insufficient Takaful fund. Available: ${currentBalance}, Required: ${amount}`);
            }

            // Deduct from fund
            await client.query(
                `UPDATE takaful_fund SET 
          balance = balance - $1,
          total_payouts = total_payouts + $1,
          updated_at = NOW()`,
                [amount]
            );

            await client.query('COMMIT');

            logger.info('Takaful fund deduction', { amount, reason, claimId, newBalance: currentBalance - amount });

            return {
                previousBalance: currentBalance,
                deducted: amount,
                newBalance: currentBalance - amount
            };
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Failed to deduct from Takaful fund', { amount, reason, error: error.message });
            throw error;
        } finally {
            client.release();
        }
    }

    // ============================================
    // Claims Management
    // ============================================

    /**
     * Submit a new claim
     * @param {Object} claimData - Claim details
     * @returns {Promise<Object>} Created claim
     */
    async submitClaim(claimData) {
        const {
            courierId,
            claimType,
            amount,
            description,
            evidenceUrls = [],
            eventDate,
            beneficiaryName
        } = claimData;

        const result = await this.pool.query(
            `INSERT INTO takaful_claims 
       (courier_id, claim_type, amount, description, evidence_urls, event_date, beneficiary_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [courierId, claimType, amount, description, evidenceUrls, eventDate, beneficiaryName]
        );

        logger.info('Takaful claim submitted', { claimId: result.rows[0].id, courierId, claimType, amount });

        return result.rows[0];
    }

    /**
     * Approve and pay a claim
     * @param {number} claimId - Claim ID
     * @param {string} approvedBy - Admin user ID
     * @returns {Promise<Object>} Updated claim and fund status
     */
    async approveClaim(claimId, approvedBy) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Get claim
            const claimResult = await client.query(
                'SELECT * FROM takaful_claims WHERE id = $1 FOR UPDATE',
                [claimId]
            );

            if (claimResult.rows.length === 0) {
                throw new Error('Claim not found');
            }

            const claim = claimResult.rows[0];
            if (claim.status !== 'pending') {
                throw new Error(`Claim already ${claim.status}`);
            }

            // Deduct from fund
            const fundDeduction = await this.deductFromFund(claim.amount, `Claim #${claimId}: ${claim.claim_type}`, claimId);

            // Update claim status
            await client.query(
                `UPDATE takaful_claims SET 
          status = 'paid',
          reviewed_by = $1,
          reviewed_at = NOW(),
          paid_at = NOW()
         WHERE id = $2`,
                [approvedBy, claimId]
            );

            await client.query('COMMIT');

            return {
                claim: { ...claim, status: 'paid' },
                fundBalance: fundDeduction.newBalance
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Reject a claim
     * @param {number} claimId - Claim ID
     * @param {string} rejectedBy - Admin user ID
     * @param {string} reason - Rejection reason
     * @returns {Promise<Object>} Updated claim
     */
    async rejectClaim(claimId, rejectedBy, reason) {
        const result = await this.pool.query(
            `UPDATE takaful_claims SET 
        status = 'rejected',
        reviewed_by = $1,
        reviewed_at = NOW(),
        rejection_reason = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING *`,
            [rejectedBy, reason, claimId]
        );

        if (result.rows.length === 0) {
            throw new Error('Claim not found or already processed');
        }

        return result.rows[0];
    }

    // ============================================
    // Gold-Indexed Loans
    // ============================================

    /**
     * Get current gold price
     * @returns {Promise<number>} Gold price per gram in EGP
     */
    async getCurrentGoldPrice() {
        const result = await this.pool.query(
            `SELECT price_per_gram FROM gold_prices 
       ORDER BY recorded_at DESC LIMIT 1`
        );

        if (result.rows.length === 0) {
            throw new Error('Gold price not available. Please set current gold price.');
        }

        return parseFloat(result.rows[0].price_per_gram);
    }

    /**
     * Set daily gold price
     * @param {number} pricePerGram - Price per gram in EGP
     * @param {string} source - Price source (api, manual, market)
     * @returns {Promise<Object>} Price record
     */
    async setGoldPrice(pricePerGram, source = 'manual') {
        const result = await this.pool.query(
            `INSERT INTO gold_prices (price_per_gram, source)
       VALUES ($1, $2)
       ON CONFLICT (recorded_at) DO UPDATE SET price_per_gram = $1, source = $2
       RETURNING *`,
            [pricePerGram, source]
        );

        return result.rows[0];
    }

    /**
     * Request a gold-indexed loan
     * @param {Object} loanData - Loan request details
     * @returns {Promise<Object>} Loan record
     */
    async requestLoan(loanData) {
        const { courierId, amountEgp, purpose, loanType } = loanData;

        // Check max loan limit
        if (amountEgp > this.MAX_LOAN_AMOUNT) {
            throw new Error(`Maximum loan amount is ${this.MAX_LOAN_AMOUNT} EGP`);
        }

        // Check for existing active loans
        const existingLoan = await this.pool.query(
            `SELECT id FROM takaful_loans WHERE courier_id = $1 AND status = 'active'`,
            [courierId]
        );

        if (existingLoan.rows.length > 0) {
            throw new Error('You already have an active loan. Please repay before requesting a new one.');
        }

        // Get current gold price
        const goldPrice = await this.getCurrentGoldPrice();
        const goldGrams = amountEgp / goldPrice;

        const result = await this.pool.query(
            `INSERT INTO takaful_loans 
       (courier_id, principal_egp, principal_gold_grams, gold_price_at_loan, 
        remaining_gold_grams, purpose, loan_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
            [courierId, amountEgp, goldGrams, goldPrice, goldGrams, purpose, loanType]
        );

        logger.info('Takaful loan requested', {
            loanId: result.rows[0].id,
            courierId,
            amountEgp,
            goldGrams,
            goldPrice
        });

        return result.rows[0];
    }

    /**
     * Get courier's Takaful summary (contributions, claims, loans)
     * @param {string} courierId - Courier user ID
     * @returns {Promise<Object>} Complete Takaful summary
     */
    async getCourierSummary(courierId) {
        const [contributions, claims, loans, fundBalance] = await Promise.all([
            this.getCourierContributions(courierId),
            this.pool.query(
                `SELECT * FROM takaful_claims WHERE courier_id = $1 ORDER BY created_at DESC LIMIT 10`,
                [courierId]
            ),
            this.pool.query(
                `SELECT * FROM takaful_loans WHERE courier_id = $1 ORDER BY created_at DESC`,
                [courierId]
            ),
            this.getFundBalance()
        ]);

        const activeLoan = loans.rows.find(l => l.status === 'active');

        return {
            contributions,
            recentClaims: claims.rows,
            loans: loans.rows,
            activeLoan: activeLoan ? {
                id: activeLoan.id,
                remainingGoldGrams: parseFloat(activeLoan.remaining_gold_grams),
                principalEgp: parseFloat(activeLoan.principal_egp)
            } : null,
            fundBalance: fundBalance.balance,
            availableLoanLimit: activeLoan ? 0 : this.MAX_LOAN_AMOUNT
        };
    }
}

module.exports = { TakafulService };
